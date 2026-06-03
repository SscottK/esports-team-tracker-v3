from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from orgs.models import OrgJoinRequest, OrgJoinRequestStatus, OrgMembership
from teams.models import (
    CoachRole,
    JoinRequestStatus,
    TeamJoinRequest,
    TeamInvite,
    TeamMembership,
    TeamMigrationRequest,
    TeamMigrationStatus,
)


def _inbox_item(
    *,
    item_type,
    request_id,
    title,
    subtitle,
    created_at,
    status='pending',
    org_id=None,
    team_id=None,
    action='review',
):
    return {
        'type': item_type,
        'id': request_id,
        'title': title,
        'subtitle': subtitle,
        'created_at': created_at,
        'status': status,
        'org_id': org_id,
        'team_id': team_id,
        'action': action,
    }


class RequestInboxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        leader_org_ids = list(
            OrgMembership.objects.filter(user=user, is_admin=True).values_list('organization_id', flat=True)
        )
        coach_team_ids = list(
            TeamMembership.objects.filter(
                user=user,
                coach_role__in=(CoachRole.HEAD, CoachRole.ASSISTANT),
            ).values_list('team_id', flat=True)
        )

        pending = []

        org_join_requests = OrgJoinRequest.objects.filter(
            organization_id__in=leader_org_ids,
            status=OrgJoinRequestStatus.PENDING,
        ).select_related('user', 'organization')
        for join_request in org_join_requests:
            pending.append(_inbox_item(
                item_type='org_join',
                request_id=join_request.id,
                title=join_request.user.username,
                subtitle=f'Request to join {join_request.organization.name}',
                created_at=join_request.created_at,
                org_id=join_request.organization_id,
            ))

        outgoing_migrations = TeamMigrationRequest.objects.filter(
            source_organization_id__in=leader_org_ids,
            status=TeamMigrationStatus.PENDING_SOURCE,
        ).select_related('team', 'target_organization', 'requested_by')
        for migration_request in outgoing_migrations:
            pending.append(_inbox_item(
                item_type='outgoing_team_migration',
                request_id=migration_request.id,
                title=migration_request.team.name,
                subtitle=(
                    f'Move to {migration_request.target_organization.name}'
                    f' · requested by {migration_request.requested_by.username}'
                ),
                created_at=migration_request.created_at,
                org_id=migration_request.source_organization_id,
            ))

        incoming_migrations = TeamMigrationRequest.objects.filter(
            target_organization_id__in=leader_org_ids,
            status=TeamMigrationStatus.PENDING_TARGET,
        ).select_related('team', 'source_organization', 'requested_by')
        for migration_request in incoming_migrations:
            pending.append(_inbox_item(
                item_type='incoming_team_migration',
                request_id=migration_request.id,
                title=migration_request.team.name,
                subtitle=(
                    f'Move from {migration_request.source_organization.name}'
                    f' · requested by {migration_request.requested_by.username}'
                ),
                created_at=migration_request.created_at,
                org_id=migration_request.target_organization_id,
            ))

        team_join_requests = TeamJoinRequest.objects.filter(
            team_id__in=coach_team_ids,
            status=JoinRequestStatus.PENDING,
        ).select_related('user', 'team')
        for join_request in team_join_requests:
            pending.append(_inbox_item(
                item_type='team_join',
                request_id=join_request.id,
                title=join_request.user.username,
                subtitle=f'Request to join {join_request.team.name}',
                created_at=join_request.created_at,
                team_id=join_request.team_id,
            ))

        team_invites = TeamInvite.objects.filter(
            invited_user=user,
            status=JoinRequestStatus.PENDING,
        ).select_related('team', 'team__organization', 'invited_by')
        for invite in team_invites:
            pending.append(_inbox_item(
                item_type='team_invite',
                request_id=invite.id,
                title=invite.team.name,
                subtitle=(
                    f'Invite from {invite.invited_by.username}'
                    f' · {invite.team.organization.name}'
                ),
                created_at=invite.created_at,
                team_id=invite.team_id,
                action='respond',
            ))

        pending.sort(key=lambda item: item['created_at'], reverse=True)

        reviewed = []

        reviewed_org_joins = OrgJoinRequest.objects.filter(
            reviewed_by=user,
            status__in=(OrgJoinRequestStatus.APPROVED, OrgJoinRequestStatus.REJECTED),
        ).select_related('user', 'organization')
        for join_request in reviewed_org_joins:
            reviewed.append(_inbox_item(
                item_type='org_join',
                request_id=join_request.id,
                title=join_request.user.username,
                subtitle=f'{join_request.organization.name}',
                created_at=join_request.updated_at,
                status=join_request.status,
                org_id=join_request.organization_id,
                action='view',
            ))

        source_reviewed_migrations = TeamMigrationRequest.objects.filter(
            source_reviewed_by=user,
        ).exclude(
            status=TeamMigrationStatus.PENDING_SOURCE,
        ).select_related('team', 'target_organization')
        for migration_request in source_reviewed_migrations:
            outcome = 'approved' if migration_request.status != TeamMigrationStatus.REJECTED else 'rejected'
            reviewed.append(_inbox_item(
                item_type='outgoing_team_migration',
                request_id=migration_request.id,
                title=migration_request.team.name,
                subtitle=f'Outgoing move to {migration_request.target_organization.name}',
                created_at=migration_request.updated_at,
                status=outcome,
                org_id=migration_request.source_organization_id,
                action='view',
            ))

        target_reviewed_migrations = TeamMigrationRequest.objects.filter(
            reviewed_by=user,
        ).exclude(
            status=TeamMigrationStatus.PENDING_TARGET,
        ).select_related('team', 'source_organization', 'target_organization')
        for migration_request in target_reviewed_migrations:
            reviewed.append(_inbox_item(
                item_type='incoming_team_migration',
                request_id=migration_request.id,
                title=migration_request.team.name,
                subtitle=f'Incoming move from {migration_request.source_organization.name}',
                created_at=migration_request.updated_at,
                status=migration_request.status,
                org_id=migration_request.target_organization_id,
                action='view',
            ))

        reviewed_team_joins = TeamJoinRequest.objects.filter(
            reviewed_by=user,
            status__in=(JoinRequestStatus.APPROVED, JoinRequestStatus.REJECTED),
        ).select_related('user', 'team')
        for join_request in reviewed_team_joins:
            reviewed.append(_inbox_item(
                item_type='team_join',
                request_id=join_request.id,
                title=join_request.user.username,
                subtitle=join_request.team.name,
                created_at=join_request.updated_at,
                status=join_request.status,
                team_id=join_request.team_id,
                action='view',
            ))

        reviewed_team_invites = TeamInvite.objects.filter(
            invited_user=user,
        ).exclude(
            status=JoinRequestStatus.PENDING,
        ).select_related('team', 'team__organization', 'invited_by')
        for invite in reviewed_team_invites:
            reviewed.append(_inbox_item(
                item_type='team_invite',
                request_id=invite.id,
                title=invite.team.name,
                subtitle=f'Invite from {invite.invited_by.username} · {invite.team.organization.name}',
                created_at=invite.updated_at,
                status=invite.status,
                team_id=invite.team_id,
                action='view',
            ))

        reviewed.sort(key=lambda item: item['created_at'], reverse=True)

        for item in pending + reviewed:
            item['created_at'] = item['created_at'].isoformat()

        return Response({
            'pending_count': len(pending),
            'pending': pending,
            'reviewed': reviewed,
        })
