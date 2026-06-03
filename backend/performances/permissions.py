from rest_framework.permissions import BasePermission

from orgs.models import OrgMembership
from teams.models import CoachRole, TeamMembership


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)


class IsOrgMember(BasePermission):
    def has_permission(self, request, view):
        org_id = view.kwargs.get('org_id') or request.data.get('organization')
        if not org_id:
            return False
        return OrgMembership.objects.filter(
            user=request.user,
            organization_id=org_id,
        ).exists()


class IsOrgAdmin(BasePermission):
    def has_permission(self, request, view):
        org_id = view.kwargs.get('org_id') or request.data.get('organization')
        if not org_id:
            return False
        return OrgMembership.objects.filter(
            user=request.user,
            organization_id=org_id,
            is_admin=True,
        ).exists()


def user_is_org_member(user, org_id):
    return OrgMembership.objects.filter(user=user, organization_id=org_id).exists()


def user_is_org_leader(user, org_id):
    return OrgMembership.objects.filter(
        user=user,
        organization_id=org_id,
        is_admin=True,
    ).exists()


def get_user_team_membership(user, team_id):
    return TeamMembership.objects.filter(user=user, team_id=team_id).first()


def user_has_team_access(user, team_id):
    return TeamMembership.objects.filter(user=user, team_id=team_id).exists()


def user_is_team_coach(user, team_id):
    return TeamMembership.objects.filter(
        user=user,
        team_id=team_id,
        coach_role__in=(CoachRole.HEAD, CoachRole.ASSISTANT),
    ).exists()


def user_is_head_coach(user, team_id):
    return TeamMembership.objects.filter(
        user=user,
        team_id=team_id,
        coach_role=CoachRole.HEAD,
    ).exists()


def user_can_submit_times(user, team_id):
    membership = get_user_team_membership(user, team_id)
    return bool(membership and membership.is_competing_member)


def get_team_org_id(team_id):
    from teams.models import Team
    return Team.objects.filter(pk=team_id).values_list('organization_id', flat=True).first()
