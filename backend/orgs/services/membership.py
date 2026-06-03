from django.db import transaction

from orgs.models import OrgMembership, Organization
from teams.models import Team, TeamMembership


class LeaveOrgError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def count_org_leaders(org_id, exclude_membership_id=None):
    queryset = OrgMembership.objects.filter(organization_id=org_id, is_admin=True)
    if exclude_membership_id is not None:
        queryset = queryset.exclude(pk=exclude_membership_id)
    return queryset.count()


def ensure_org_has_leader(org_id, exclude_membership_id=None):
    if count_org_leaders(org_id, exclude_membership_id=exclude_membership_id) == 0:
        raise LeaveOrgError(
            'Each organization must have at least one leader.',
            status_code=400,
        )


def remove_user_from_org(user, org):
    team_ids = Team.objects.filter(organization=org).values_list('id', flat=True)
    TeamMembership.objects.filter(user=user, team_id__in=team_ids).delete()
    OrgMembership.objects.filter(user=user, organization=org).delete()


def leave_org(user, org_id, *, successor_membership_id=None, disband=False):
    membership = OrgMembership.objects.filter(user=user, organization_id=org_id).first()
    if not membership:
        raise LeaveOrgError('You are not in this organization.', status_code=403)

    org = Organization.objects.get(pk=org_id)
    other_members = OrgMembership.objects.filter(organization_id=org_id).exclude(pk=membership.pk)
    team_count = Team.objects.filter(organization=org).count()

    if membership.is_admin:
        if disband:
            if team_count > 0:
                raise LeaveOrgError(
                    'Resolve all teams before disbanding the organization. Head coaches can disband teams from the team page.',
                    status_code=400,
                )
            org.delete()
            return {'disbanded': True, 'organization_id': org_id}

        if not other_members.exists():
            if team_count > 0:
                raise LeaveOrgError(
                    'You are the only org member. Disband all teams first, then disband the organization.',
                    status_code=400,
                )
            raise LeaveOrgError(
                'You are the only org member. Disband the organization to leave.',
                status_code=400,
            )

        if not successor_membership_id:
            raise LeaveOrgError(
                'Assign a new organization leader or disband the organization before leaving.',
                status_code=400,
            )

        successor = OrgMembership.objects.filter(
            pk=successor_membership_id,
            organization_id=org_id,
        ).first()
        if not successor:
            raise LeaveOrgError('Selected successor is not in this organization.', status_code=404)
        if successor.user_id == user.id:
            raise LeaveOrgError('Choose a different member as the new organization leader.', status_code=400)

        with transaction.atomic():
            successor.is_admin = True
            successor.save(update_fields=['is_admin'])
            remove_user_from_org(user, org)

        return {
            'left': True,
            'new_org_leader': successor.user.username,
            'new_org_leader_membership_id': successor.pk,
        }

    remove_user_from_org(user, org)
    return {'left': True}
