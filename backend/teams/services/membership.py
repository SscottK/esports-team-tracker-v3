from django.db import transaction

from performances.permissions import get_user_team_membership
from teams.models import CoachRole, Team, TeamMembership


class LeaveTeamError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def count_head_coaches(team_id, exclude_membership_id=None):
    queryset = TeamMembership.objects.filter(team_id=team_id, coach_role=CoachRole.HEAD)
    if exclude_membership_id is not None:
        queryset = queryset.exclude(pk=exclude_membership_id)
    return queryset.count()


def ensure_team_has_head_coach(team_id, exclude_membership_id=None):
    if count_head_coaches(team_id, exclude_membership_id=exclude_membership_id) == 0:
        raise LeaveTeamError(
            'Each team must have at least one head coach.',
            status_code=400,
        )


def leave_team(user, team_id, *, successor_membership_id=None, disband=False):
    membership = get_user_team_membership(user, team_id)
    if not membership:
        raise LeaveTeamError('You are not on this team.', status_code=403)

    team = Team.objects.get(pk=team_id)
    other_members = TeamMembership.objects.filter(team_id=team_id).exclude(pk=membership.pk)

    if membership.is_head_coach:
        if disband:
            team.delete()
            return {'disbanded': True, 'team_id': team_id}

        if not other_members.exists():
            raise LeaveTeamError(
                'You are the only member. Disband the team to leave.',
                status_code=400,
            )

        if not successor_membership_id:
            raise LeaveTeamError(
                'Assign a new head coach or disband the team before leaving.',
                status_code=400,
            )

        successor = TeamMembership.objects.filter(
            pk=successor_membership_id,
            team_id=team_id,
        ).first()
        if not successor:
            raise LeaveTeamError('Selected successor is not on this team.', status_code=404)
        if successor.user_id == user.id:
            raise LeaveTeamError('Choose a different member as the new head coach.', status_code=400)

        with transaction.atomic():
            successor.coach_role = CoachRole.HEAD
            successor.save(update_fields=['coach_role'])
            membership.delete()

        return {
            'left': True,
            'new_head_coach': successor.user.username,
            'new_head_coach_membership_id': successor.pk,
        }

    membership.delete()
    return {'left': True}
