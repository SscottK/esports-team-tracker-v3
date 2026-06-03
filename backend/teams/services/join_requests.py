from django.db import transaction

from orgs.models import OrgMembership
from performances.permissions import user_is_head_coach, user_is_team_coach
from teams.models import CoachRole, JoinRequestStatus, Team, TeamJoinRequest, TeamMembership


class JoinRequestError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def user_can_request_team_join(user, team):
    if TeamMembership.objects.filter(user=user, team=team).exists():
        raise JoinRequestError('You are already on this team.')
    if not OrgMembership.objects.filter(user=user, organization=team.organization).exists():
        raise JoinRequestError('You must belong to this organization first.', status_code=403)
    if TeamJoinRequest.objects.filter(
        user=user,
        team=team,
        status=JoinRequestStatus.PENDING,
    ).exists():
        raise JoinRequestError('You already have a pending request for this team.')


def create_team_join_request(user, team_id):
    team = Team.objects.select_related('organization').filter(pk=team_id).first()
    if not team:
        raise JoinRequestError('Team not found.', status_code=404)

    user_can_request_team_join(user, team)
    return TeamJoinRequest.objects.create(user=user, team=team)


def cancel_team_join_request(user, request_id, team_id):
    join_request = TeamJoinRequest.objects.filter(pk=request_id, team_id=team_id, user=user).first()
    if not join_request:
        raise JoinRequestError('Join request not found.', status_code=404)
    if join_request.status != JoinRequestStatus.PENDING:
        raise JoinRequestError('Only pending requests can be cancelled.')
    join_request.status = JoinRequestStatus.CANCELLED
    join_request.save(update_fields=['status', 'updated_at'])
    return join_request


def review_team_join_request(reviewer, request_id, team_id, *, action, coach_role=None, is_competing_member=True):
    if action not in ('approve', 'reject'):
        raise JoinRequestError('action must be approve or reject.')

    if not user_is_team_coach(reviewer, team_id):
        raise JoinRequestError('Only team coaches can review join requests.', status_code=403)

    join_request = TeamJoinRequest.objects.filter(
        pk=request_id,
        team_id=team_id,
    ).select_related('user', 'team').first()
    if not join_request:
        raise JoinRequestError('Join request not found.', status_code=404)
    if join_request.status != JoinRequestStatus.PENDING:
        raise JoinRequestError('This request has already been reviewed.')

    if action == 'reject':
        join_request.status = JoinRequestStatus.REJECTED
        join_request.reviewed_by = reviewer
        join_request.save(update_fields=['status', 'reviewed_by', 'updated_at'])
        return join_request, None

    coach_role = coach_role or CoachRole.NONE
    if coach_role in (CoachRole.HEAD, CoachRole.ASSISTANT) and not user_is_head_coach(reviewer, team_id):
        raise JoinRequestError('Only head coaches can assign coach roles.', status_code=403)

    if TeamMembership.objects.filter(user=join_request.user, team=join_request.team).exists():
        raise JoinRequestError('User is already on this team.')
    if not OrgMembership.objects.filter(
        user=join_request.user,
        organization=join_request.team.organization,
    ).exists():
        raise JoinRequestError('User must belong to this organization first.', status_code=403)

    with transaction.atomic():
        membership, _created = TeamMembership.objects.get_or_create(
            user=join_request.user,
            team_id=team_id,
            defaults={
                'coach_role': coach_role,
                'is_competing_member': is_competing_member,
            },
        )
        if not _created:
            membership.coach_role = coach_role
            membership.is_competing_member = is_competing_member
            membership.save()

        join_request.status = JoinRequestStatus.APPROVED
        join_request.reviewed_by = reviewer
        join_request.save(update_fields=['status', 'reviewed_by', 'updated_at'])

    return join_request, membership
