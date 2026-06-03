from django.db import transaction

from orgs.models import OrgJoinCode, OrgMembership
from performances.permissions import user_is_head_coach
from teams.models import Team, TeamMembership, TeamMigrationRequest, TeamMigrationStatus


class TeamMigrationError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


ACTIVE_MIGRATION_STATUSES = (
    TeamMigrationStatus.PENDING_SOURCE,
    TeamMigrationStatus.PENDING_TARGET,
)


def create_team_migration_request(user, team_id, join_code):
    if not user_is_head_coach(user, team_id):
        raise TeamMigrationError('Only head coaches can request a team move.', status_code=403)

    team = Team.objects.select_related('organization').get(pk=team_id)
    org_join_code = OrgJoinCode.objects.select_related('organization').filter(
        code__iexact=join_code.strip(),
    ).first()
    if not org_join_code:
        raise TeamMigrationError('Invalid organization join code.', status_code=400)

    target_organization = org_join_code.organization
    if target_organization.id == team.organization_id:
        raise TeamMigrationError('The team is already in that organization.')

    if TeamMigrationRequest.objects.filter(team=team, status__in=ACTIVE_MIGRATION_STATUSES).exists():
        raise TeamMigrationError('This team already has a pending move request.')

    if Team.objects.filter(organization=target_organization, name=team.name).exists():
        raise TeamMigrationError(
            'The target organization already has a team with this name. Rename the team before moving.',
        )

    return TeamMigrationRequest.objects.create(
        team=team,
        source_organization=team.organization,
        target_organization=target_organization,
        requested_by=user,
    )


def cancel_team_migration_request(user, request_id, team_id):
    migration_request = TeamMigrationRequest.objects.filter(
        pk=request_id,
        team_id=team_id,
        requested_by=user,
    ).first()
    if not migration_request:
        raise TeamMigrationError('Move request not found.', status_code=404)
    if migration_request.status not in ACTIVE_MIGRATION_STATUSES:
        raise TeamMigrationError('Only pending move requests can be cancelled.')
    migration_request.status = TeamMigrationStatus.CANCELLED
    migration_request.save(update_fields=['status', 'updated_at'])
    return migration_request


def _require_org_leader(reviewer, org_id, message):
    if not OrgMembership.objects.filter(
        user=reviewer,
        organization_id=org_id,
        is_admin=True,
    ).exists():
        raise TeamMigrationError(message, status_code=403)


def review_source_team_migration_request(reviewer, request_id, org_id, *, action):
    if action not in ('approve', 'reject'):
        raise TeamMigrationError('action must be approve or reject.')

    _require_org_leader(
        reviewer,
        org_id,
        'Only organization leaders can review outgoing team move requests.',
    )

    migration_request = TeamMigrationRequest.objects.filter(
        pk=request_id,
        source_organization_id=org_id,
    ).select_related('team', 'source_organization', 'target_organization').first()
    if not migration_request:
        raise TeamMigrationError('Move request not found.', status_code=404)
    if migration_request.status != TeamMigrationStatus.PENDING_SOURCE:
        raise TeamMigrationError('This move request is not awaiting source organization approval.')

    if action == 'reject':
        migration_request.status = TeamMigrationStatus.REJECTED
        migration_request.source_reviewed_by = reviewer
        migration_request.save(update_fields=['status', 'source_reviewed_by', 'updated_at'])
        return migration_request

    migration_request.status = TeamMigrationStatus.PENDING_TARGET
    migration_request.source_reviewed_by = reviewer
    migration_request.save(update_fields=['status', 'source_reviewed_by', 'updated_at'])
    return migration_request


def review_target_team_migration_request(reviewer, request_id, org_id, *, action):
    if action not in ('approve', 'reject'):
        raise TeamMigrationError('action must be approve or reject.')

    _require_org_leader(
        reviewer,
        org_id,
        'Only organization leaders can review incoming team move requests.',
    )

    migration_request = TeamMigrationRequest.objects.filter(
        pk=request_id,
        target_organization_id=org_id,
    ).select_related('team', 'source_organization', 'target_organization').first()
    if not migration_request:
        raise TeamMigrationError('Move request not found.', status_code=404)
    if migration_request.status != TeamMigrationStatus.PENDING_TARGET:
        raise TeamMigrationError('This move request is not awaiting target organization approval.')

    if action == 'reject':
        migration_request.status = TeamMigrationStatus.REJECTED
        migration_request.reviewed_by = reviewer
        migration_request.save(update_fields=['status', 'reviewed_by', 'updated_at'])
        return migration_request

    team = migration_request.team
    target_organization = migration_request.target_organization
    if Team.objects.filter(organization=target_organization, name=team.name).exclude(pk=team.pk).exists():
        raise TeamMigrationError(
            'The target organization already has a team with this name. Ask the head coach to rename the team first.',
        )

    with transaction.atomic():
        team.organization = target_organization
        team.save(update_fields=['organization'])

        for membership in TeamMembership.objects.filter(team=team).select_related('user'):
            OrgMembership.objects.get_or_create(
                user=membership.user,
                organization=target_organization,
                defaults={'is_admin': False},
            )

        migration_request.status = TeamMigrationStatus.APPROVED
        migration_request.reviewed_by = reviewer
        migration_request.save(update_fields=['status', 'reviewed_by', 'updated_at'])

    return migration_request
