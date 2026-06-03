from django.contrib.auth import get_user_model
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from orgs.models import OrgMembership
from performances.permissions import (
    get_user_team_membership,
    user_has_team_access,
    user_is_head_coach,
    user_is_org_member,
    user_is_team_coach,
)
from teams.models import (
    CoachRole,
    JoinRequestStatus,
    Team,
    TeamGame,
    TeamJoinRequest,
    TeamInvite,
    TeamMembership,
    TeamMigrationRequest,
    TeamMigrationStatus,
)
from teams.serializers import (
    AddTeamMemberSerializer,
    CreateTeamInviteSerializer,
    CreateTeamSerializer,
    LeaveTeamSerializer,
    RequestTeamMigrationSerializer,
    RespondTeamInviteSerializer,
    ReviewTeamJoinRequestSerializer,
    ReviewTeamMigrationSerializer,
    TeamGameSerializer,
    TeamInviteSerializer,
    TeamJoinRequestSerializer,
    TeamMembershipSerializer,
    TeamMigrationRequestSerializer,
    TeamSerializer,
    UpdateTeamSerializer,
    UpdateTeamMembershipSerializer,
)
from teams.services.invites import (
    TeamInviteError,
    cancel_team_invite,
    create_team_invite,
    respond_team_invite,
)
from teams.services.join_requests import (
    JoinRequestError,
    cancel_team_join_request,
    create_team_join_request,
    review_team_join_request,
)
from teams.services.membership import LeaveTeamError, ensure_team_has_head_coach, leave_team
from teams.services.migration import (
    ACTIVE_MIGRATION_STATUSES,
    TeamMigrationError,
    cancel_team_migration_request,
    create_team_migration_request,
    review_source_team_migration_request,
    review_target_team_migration_request,
)

User = get_user_model()


class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Team.objects.filter(
            memberships__user=self.request.user,
        ).distinct()

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateTeamSerializer
        if self.action in ('update', 'partial_update'):
            return UpdateTeamSerializer
        return TeamSerializer

    def perform_create(self, serializer):
        serializer.save()

    def partial_update(self, request, *args, **kwargs):
        team = self.get_object()
        if not user_is_head_coach(request.user, team.pk):
            return Response(
                {'detail': 'Only head coaches can update team settings.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        extra_fields = set(request.data.keys()) - {
            'primary_color',
            'secondary_color',
            'tertiary_color',
        }
        if extra_fields:
            return Response(
                {'detail': 'Only primary_color, secondary_color, and tertiary_color can be updated.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(team, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        team.refresh_from_db()
        return Response(TeamSerializer(team, context=self.get_serializer_context()).data)


class TeamMembershipView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, team_id):
        if not user_has_team_access(request.user, team_id):
            return Response(status=status.HTTP_403_FORBIDDEN)
        memberships = TeamMembership.objects.filter(team_id=team_id).select_related('user')
        my_membership = get_user_team_membership(request.user, team_id)
        return Response({
            'memberships': TeamMembershipSerializer(memberships, many=True).data,
            'my_membership': TeamMembershipSerializer(my_membership).data if my_membership else None,
        })

    def post(self, request, team_id):
        if not user_is_team_coach(request.user, team_id):
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = AddTeamMemberSerializer(
            data=request.data,
            context={'request': request, 'team_id': team_id},
        )
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data['username']
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        team = Team.objects.get(pk=team_id)
        if not OrgMembership.objects.filter(user=user, organization=team.organization).exists():
            return Response(
                {'detail': 'User must belong to the organization first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        coach_role = serializer.validated_data['coach_role']
        is_competing_member = serializer.validated_data['is_competing_member']
        if coach_role in (CoachRole.HEAD, CoachRole.ASSISTANT) and not user_is_head_coach(
            request.user,
            team_id,
        ):
            return Response(
                {'detail': 'Only head coaches can assign coach roles.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        membership, created = TeamMembership.objects.get_or_create(
            user=user,
            team_id=team_id,
            defaults={
                'coach_role': coach_role,
                'is_competing_member': is_competing_member,
            },
        )
        if not created:
            membership.coach_role = coach_role
            membership.is_competing_member = is_competing_member
            membership.save()
        return Response(TeamMembershipSerializer(membership).data, status=status.HTTP_201_CREATED)


class TeamMembershipDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, team_id, membership_id):
        if not user_is_head_coach(request.user, team_id):
            return Response(status=status.HTTP_403_FORBIDDEN)
        membership = TeamMembership.objects.filter(pk=membership_id, team_id=team_id).first()
        if not membership:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = UpdateTeamMembershipSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if 'coach_role' in serializer.validated_data:
            new_role = serializer.validated_data['coach_role']
            if membership.coach_role == CoachRole.HEAD and new_role != CoachRole.HEAD:
                try:
                    ensure_team_has_head_coach(team_id, exclude_membership_id=membership.pk)
                except LeaveTeamError as exc:
                    return Response({'detail': exc.message}, status=exc.status_code)
            membership.coach_role = new_role
        if 'is_competing_member' in serializer.validated_data:
            membership.is_competing_member = serializer.validated_data['is_competing_member']
        membership.save()
        return Response(TeamMembershipSerializer(membership).data)


class OrgTeamsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, org_id):
        if not user_is_org_member(request.user, org_id):
            return Response(status=status.HTTP_403_FORBIDDEN)

        member_team_ids = set(
            TeamMembership.objects.filter(
                user=request.user,
                team__organization_id=org_id,
            ).values_list('team_id', flat=True)
        )
        pending_requests = {
            join_request.team_id: join_request.id
            for join_request in TeamJoinRequest.objects.filter(
                user=request.user,
                team__organization_id=org_id,
                status=JoinRequestStatus.PENDING,
            )
        }

        teams = Team.objects.filter(organization_id=org_id).select_related('organization')
        payload = []
        for team in teams:
            payload.append({
                'id': team.id,
                'organization': team.organization_id,
                'organization_name': team.organization.name,
                'name': team.name,
                'color_theme': team.color_theme,
                'primary_color': team.primary_color,
                'secondary_color': team.secondary_color,
                'tertiary_color': team.tertiary_color,
                'created_at': team.created_at,
                'is_member': team.id in member_team_ids,
                'pending_join_request_id': pending_requests.get(team.id),
            })
        return Response(payload)


class TeamJoinRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, team_id):
        if not user_is_team_coach(request.user, team_id):
            return Response(status=status.HTTP_403_FORBIDDEN)
        join_requests = TeamJoinRequest.objects.filter(
            team_id=team_id,
            status=JoinRequestStatus.PENDING,
        ).select_related('user')
        return Response(TeamJoinRequestSerializer(join_requests, many=True).data)

    def post(self, request, team_id):
        try:
            join_request = create_team_join_request(request.user, team_id)
        except JoinRequestError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)
        return Response(
            TeamJoinRequestSerializer(join_request).data,
            status=status.HTTP_201_CREATED,
        )


class TeamJoinRequestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, team_id, request_id):
        serializer = ReviewTeamJoinRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data['action']

        if action == 'cancel':
            try:
                join_request = cancel_team_join_request(request.user, request_id, team_id)
            except JoinRequestError as exc:
                return Response({'detail': exc.message}, status=exc.status_code)
            return Response(TeamJoinRequestSerializer(join_request).data)

        try:
            join_request, membership = review_team_join_request(
                request.user,
                request_id,
                team_id,
                action=action,
                coach_role=serializer.validated_data.get('coach_role'),
                is_competing_member=serializer.validated_data.get('is_competing_member', True),
            )
        except JoinRequestError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)

        response = TeamJoinRequestSerializer(join_request).data
        if membership:
            response['membership'] = TeamMembershipSerializer(membership).data
        return Response(response)


class TeamInviteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, team_id):
        if not user_is_head_coach(request.user, team_id):
            return Response(status=status.HTTP_403_FORBIDDEN)
        invites = TeamInvite.objects.filter(
            team_id=team_id,
            status=JoinRequestStatus.PENDING,
        ).select_related('invited_user', 'invited_by', 'team', 'team__organization')
        return Response(TeamInviteSerializer(invites, many=True).data)

    def post(self, request, team_id):
        serializer = CreateTeamInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            invite = create_team_invite(
                request.user,
                team_id,
                serializer.validated_data['username'],
            )
        except TeamInviteError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)
        invite = TeamInvite.objects.select_related(
            'invited_user',
            'invited_by',
            'team',
            'team__organization',
        ).get(pk=invite.pk)
        return Response(
            TeamInviteSerializer(invite).data,
            status=status.HTTP_201_CREATED,
        )


class TeamInviteDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, team_id, invite_id):
        serializer = RespondTeamInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data['action']

        if action == 'cancel':
            try:
                invite = cancel_team_invite(request.user, invite_id, team_id)
            except TeamInviteError as exc:
                return Response({'detail': exc.message}, status=exc.status_code)
            invite = TeamInvite.objects.select_related(
                'invited_user',
                'invited_by',
                'team',
                'team__organization',
            ).get(pk=invite.pk)
            return Response(TeamInviteSerializer(invite).data)

        try:
            invite, membership = respond_team_invite(
                request.user,
                invite_id,
                team_id,
                action=action,
            )
        except TeamInviteError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)

        invite = TeamInvite.objects.select_related(
            'invited_user',
            'invited_by',
            'team',
            'team__organization',
        ).get(pk=invite.pk)
        response = TeamInviteSerializer(invite).data
        if membership:
            response['membership'] = TeamMembershipSerializer(membership).data
        return Response(response)


class TeamMigrationRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, team_id):
        if not user_is_head_coach(request.user, team_id):
            return Response(status=status.HTTP_403_FORBIDDEN)
        migration_requests = TeamMigrationRequest.objects.filter(
            team_id=team_id,
            status__in=ACTIVE_MIGRATION_STATUSES,
        ).select_related('source_organization', 'target_organization', 'requested_by')
        return Response(TeamMigrationRequestSerializer(migration_requests, many=True).data)

    def post(self, request, team_id):
        serializer = RequestTeamMigrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            migration_request = create_team_migration_request(
                request.user,
                team_id,
                serializer.validated_data['join_code'],
            )
        except TeamMigrationError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)
        return Response(
            TeamMigrationRequestSerializer(migration_request).data,
            status=status.HTTP_201_CREATED,
        )


class TeamMigrationRequestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, team_id, request_id):
        serializer = ReviewTeamMigrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data['action'] != 'cancel':
            return Response({'detail': 'Head coaches can only cancel a pending move request.'}, status=400)
        try:
            migration_request = cancel_team_migration_request(request.user, request_id, team_id)
        except TeamMigrationError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)
        return Response(TeamMigrationRequestSerializer(migration_request).data)


class OrgOutgoingTeamMigrationRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, org_id):
        if not OrgMembership.objects.filter(
            user=request.user,
            organization_id=org_id,
            is_admin=True,
        ).exists():
            return Response(status=status.HTTP_403_FORBIDDEN)
        migration_requests = TeamMigrationRequest.objects.filter(
            source_organization_id=org_id,
            status=TeamMigrationStatus.PENDING_SOURCE,
        ).select_related('team', 'source_organization', 'target_organization', 'requested_by')
        return Response(TeamMigrationRequestSerializer(migration_requests, many=True).data)


class OrgOutgoingTeamMigrationRequestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, org_id, request_id):
        serializer = ReviewTeamMigrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data['action']
        if action == 'cancel':
            return Response({'detail': 'Use the team move request endpoint to cancel.'}, status=400)
        try:
            migration_request = review_source_team_migration_request(
                request.user,
                request_id,
                org_id,
                action=action,
            )
        except TeamMigrationError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)
        return Response(TeamMigrationRequestSerializer(migration_request).data)


class OrgTeamMigrationRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, org_id):
        if not OrgMembership.objects.filter(
            user=request.user,
            organization_id=org_id,
            is_admin=True,
        ).exists():
            return Response(status=status.HTTP_403_FORBIDDEN)
        migration_requests = TeamMigrationRequest.objects.filter(
            target_organization_id=org_id,
            status=TeamMigrationStatus.PENDING_TARGET,
        ).select_related('team', 'source_organization', 'target_organization', 'requested_by')
        return Response(TeamMigrationRequestSerializer(migration_requests, many=True).data)


class OrgTeamMigrationRequestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, org_id, request_id):
        serializer = ReviewTeamMigrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data['action']
        if action == 'cancel':
            return Response({'detail': 'Use the team move request endpoint to cancel.'}, status=400)
        try:
            migration_request = review_target_team_migration_request(
                request.user,
                request_id,
                org_id,
                action=action,
            )
        except TeamMigrationError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)
        return Response(TeamMigrationRequestSerializer(migration_request).data)


class TeamLeaveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, team_id):
        if not user_has_team_access(request.user, team_id):
            return Response(status=status.HTTP_403_FORBIDDEN)

        serializer = LeaveTeamSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = leave_team(
                request.user,
                team_id,
                successor_membership_id=serializer.validated_data.get('successor_membership_id'),
                disband=serializer.validated_data.get('disband', False),
            )
        except LeaveTeamError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)

        return Response(result)


class TeamGameView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, team_id):
        if not user_has_team_access(request.user, team_id):
            return Response(status=status.HTTP_403_FORBIDDEN)
        team_games = TeamGame.objects.filter(team_id=team_id).select_related('game')
        return Response(TeamGameSerializer(team_games, many=True).data)

    def post(self, request, team_id):
        if not user_is_team_coach(request.user, team_id):
            return Response(status=status.HTTP_403_FORBIDDEN)
        game_id = request.data.get('game_id')
        if not game_id:
            return Response({'detail': 'game_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        team_game, created = TeamGame.objects.get_or_create(team_id=team_id, game_id=game_id)
        return Response(
            TeamGameSerializer(team_game).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request, team_id, game_id):
        if not user_is_team_coach(request.user, team_id):
            return Response(status=status.HTTP_403_FORBIDDEN)
        TeamGame.objects.filter(team_id=team_id, game_id=game_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
