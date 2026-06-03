from django.db import transaction

from orgs.models import OrgJoinCode, OrgJoinRequest, OrgJoinRequestStatus, OrgMembership, Organization


class OrgJoinRequestError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


ALREADY_IN_ORG_MESSAGE = (
    'Leave your current organization before creating or joining another one.'
)


def user_belongs_to_another_org(user, organization_id):
    return OrgMembership.objects.filter(user=user).exclude(organization_id=organization_id).exists()


def create_org_join_request(user, code):
    join_code = OrgJoinCode.objects.select_related('organization').filter(
        code__iexact=code.strip(),
    ).first()
    if not join_code:
        raise OrgJoinRequestError('Invalid join code.', status_code=400)

    organization = join_code.organization
    if OrgMembership.objects.filter(user=user, organization=organization).exists():
        raise OrgJoinRequestError('You are already a member of this organization.')
    if user_belongs_to_another_org(user, organization.id):
        raise OrgJoinRequestError(ALREADY_IN_ORG_MESSAGE)
    if OrgJoinRequest.objects.filter(
        user=user,
        organization=organization,
        status=OrgJoinRequestStatus.PENDING,
    ).exists():
        raise OrgJoinRequestError('You already have a pending request for this organization.')

    return OrgJoinRequest.objects.create(user=user, organization=organization)


def cancel_org_join_request(user, request_id, org_id):
    join_request = OrgJoinRequest.objects.filter(
        pk=request_id,
        organization_id=org_id,
        user=user,
    ).first()
    if not join_request:
        raise OrgJoinRequestError('Join request not found.', status_code=404)
    if join_request.status != OrgJoinRequestStatus.PENDING:
        raise OrgJoinRequestError('Only pending requests can be cancelled.')
    join_request.status = OrgJoinRequestStatus.CANCELLED
    join_request.save(update_fields=['status', 'updated_at'])
    return join_request


def review_org_join_request(reviewer, request_id, org_id, *, action):
    if action not in ('approve', 'reject'):
        raise OrgJoinRequestError('action must be approve or reject.')

    if not OrgMembership.objects.filter(
        user=reviewer,
        organization_id=org_id,
        is_admin=True,
    ).exists():
        raise OrgJoinRequestError('Only organization leaders can review join requests.', status_code=403)

    join_request = OrgJoinRequest.objects.filter(
        pk=request_id,
        organization_id=org_id,
    ).select_related('user', 'organization').first()
    if not join_request:
        raise OrgJoinRequestError('Join request not found.', status_code=404)
    if join_request.status != OrgJoinRequestStatus.PENDING:
        raise OrgJoinRequestError('This request has already been reviewed.')

    if action == 'reject':
        join_request.status = OrgJoinRequestStatus.REJECTED
        join_request.reviewed_by = reviewer
        join_request.save(update_fields=['status', 'reviewed_by', 'updated_at'])
        return join_request, None

    if OrgMembership.objects.filter(
        user=join_request.user,
        organization=join_request.organization,
    ).exists():
        raise OrgJoinRequestError('User is already a member of this organization.')
    if user_belongs_to_another_org(join_request.user, join_request.organization_id):
        raise OrgJoinRequestError(
            'This user must leave their current organization before joining another one.',
        )

    with transaction.atomic():
        membership = OrgMembership.objects.create(
            user=join_request.user,
            organization=join_request.organization,
            is_admin=False,
        )
        join_request.status = OrgJoinRequestStatus.APPROVED
        join_request.reviewed_by = reviewer
        join_request.save(update_fields=['status', 'reviewed_by', 'updated_at'])

    return join_request, membership
