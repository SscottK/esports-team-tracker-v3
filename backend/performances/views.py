from rest_framework.exceptions import PermissionDenied
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth import get_user_model

from games.models import Game
from performances.models import MemberResult, MemberResultHistory, TeamBenchmark
from performances.permissions import (
    get_user_team_membership,
    user_can_submit_times,
    user_has_team_access,
    user_is_team_coach,
)
from performances.serializers import (
    MemberResultHistorySerializer,
    MemberResultSerializer,
    TeamBenchmarkSerializer,
)
from performances.services.grid import build_compare_data, build_leaderboard, build_team_grid
from performances.services.csv_upload import TimesCsvImportError, import_team_times_csv
from games.models import Level
from teams.models import CoachRole, Team, TeamMembership

User = get_user_model()


def _parse_include_coach_competitors(request):
    value = request.query_params.get('include_coach_competitors', 'false').lower()
    return value in ('1', 'true', 'yes')


def _parse_include_dlc(request):
    value = request.query_params.get('include_dlc', 'false').lower()
    return value in ('1', 'true', 'yes')


def _game_has_dlc_tracks(game):
    return Level.objects.filter(game=game, is_active=True, is_dlc=True).exists()


def _grid_viewer_payload(request, team_id, game):
    membership = get_user_team_membership(request.user, team_id)
    return {
        'is_coach': bool(membership and membership.is_coach),
        'is_member': bool(membership),
        'can_add_time': bool(
            membership and (membership.is_competing_member or membership.is_coach)
        ),
        'can_toggle_coach_competitors': bool(
            membership
            and membership.is_coach
            and TeamMembership.objects.filter(
                team_id=team_id,
                is_competing_member=True,
                coach_role__in=(CoachRole.HEAD, CoachRole.ASSISTANT),
            ).exists()
        ),
        'can_toggle_dlc': _game_has_dlc_tracks(game),
    }


class MemberResultViewSet(viewsets.ModelViewSet):
    serializer_class = MemberResultSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        queryset = MemberResult.objects.select_related('user', 'team', 'level', 'level__game')
        team_id = self.request.query_params.get('team')
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        if not self.request.user.is_staff:
            queryset = queryset.filter(team__memberships__user=self.request.user)
        return queryset.distinct()

    def perform_create(self, serializer):
        team = serializer.validated_data['team']
        raw_user_id = self.request.data.get('user_id')
        if raw_user_id not in (None, ''):
            target_user_id = int(raw_user_id)
            if target_user_id != self.request.user.id:
                if not user_is_team_coach(self.request.user, team.id):
                    raise PermissionDenied('Only coaches can submit times for other team members.')
                target_user = User.objects.get(pk=target_user_id)
                target_membership = get_user_team_membership(target_user, team.id)
                if not target_membership or not target_membership.is_competing_member:
                    raise PermissionDenied(
                        'Times can only be submitted for competing team members.',
                    )
                serializer.save(user=target_user, entered_by=self.request.user)
                return

        if not user_can_submit_times(self.request.user, team.id):
            raise PermissionDenied(
                'Only competing team members can submit their own times. '
                'Coaches can enter times for team members or enable competing status in roster settings.',
            )
        serializer.save(user=self.request.user, entered_by=self.request.user)

    def perform_update(self, serializer):
        membership = get_user_team_membership(self.request.user, serializer.instance.team_id)
        is_owner = serializer.instance.user_id == self.request.user.id
        is_coach = membership and membership.coach_role in (CoachRole.HEAD, CoachRole.ASSISTANT)
        if not is_owner and not is_coach:
            raise PermissionDenied('You can only edit your own results.')
        serializer.save()


class TeamTimeHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, team_id):
        if not user_has_team_access(request.user, team_id):
            return Response(status=status.HTTP_403_FORBIDDEN)

        membership = get_user_team_membership(request.user, team_id)
        is_coach = bool(membership and membership.is_coach)

        queryset = MemberResultHistory.objects.filter(team_id=team_id).select_related(
            'user',
            'level',
            'level__level_group',
            'entered_by',
        )

        game_id = request.query_params.get('game_id')
        user_id = request.query_params.get('user_id')
        level_id = request.query_params.get('level_id')

        if game_id:
            queryset = queryset.filter(level__game_id=game_id)
        if level_id:
            queryset = queryset.filter(level_id=level_id)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        elif not is_coach:
            queryset = queryset.filter(user_id=request.user.id)

        return Response(MemberResultHistorySerializer(queryset[:200], many=True).data)


class TeamBenchmarkView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, team_id):
        if not user_has_team_access(request.user, team_id):
            return Response(status=status.HTTP_403_FORBIDDEN)
        benchmarks = TeamBenchmark.objects.filter(team_id=team_id).select_related('level')
        return Response(TeamBenchmarkSerializer(benchmarks, many=True).data)

    def post(self, request, team_id):
        if not user_is_team_coach(request.user, team_id):
            return Response(status=status.HTTP_403_FORBIDDEN)
        payload = {**request.data, 'team': team_id}
        serializer = TeamBenchmarkSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        benchmark, _ = TeamBenchmark.objects.update_or_create(
            team_id=team_id,
            level=serializer.validated_data['level'],
            defaults={
                'target_fast': serializer.validated_data.get('target_fast'),
                'target_slow': serializer.validated_data.get('target_slow'),
                'elite': serializer.validated_data.get('elite'),
            },
        )
        return Response(TeamBenchmarkSerializer(benchmark).data, status=status.HTTP_201_CREATED)


class TeamGridView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, team_id, game_id):
        if not user_has_team_access(request.user, team_id):
            return Response(status=status.HTTP_403_FORBIDDEN)
        team = Team.objects.get(pk=team_id)
        game = Game.objects.get(pk=game_id)
        include_coach_competitors = _parse_include_coach_competitors(request)
        include_dlc = _parse_include_dlc(request)
        try:
            payload = build_team_grid(
                team,
                game,
                include_coach_competitors=include_coach_competitors,
                include_dlc=include_dlc,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        payload['viewer'] = _grid_viewer_payload(request, team_id, game)
        return Response(payload)


class TeamCompareView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, team_id, game_id):
        if not user_has_team_access(request.user, team_id):
            return Response(status=status.HTTP_403_FORBIDDEN)
        team = Team.objects.get(pk=team_id)
        game = Game.objects.get(pk=game_id)
        include_coach_competitors = _parse_include_coach_competitors(request)
        include_dlc = _parse_include_dlc(request)
        try:
            payload = build_compare_data(
                team,
                game,
                include_coach_competitors=include_coach_competitors,
                include_dlc=include_dlc,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        payload['viewer'] = _grid_viewer_payload(request, team_id, game)
        payload['include_coach_competitors'] = include_coach_competitors
        payload['include_dlc'] = include_dlc
        return Response(payload)


class TeamLeaderboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, team_id, game_id):
        if not user_has_team_access(request.user, team_id):
            return Response(status=status.HTTP_403_FORBIDDEN)
        team = Team.objects.get(pk=team_id)
        game = Game.objects.get(pk=game_id)
        include_coach_competitors = _parse_include_coach_competitors(request)
        include_dlc = _parse_include_dlc(request)
        try:
            payload = build_leaderboard(
                team,
                game,
                include_coach_competitors=include_coach_competitors,
                include_dlc=include_dlc,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(payload)


class TeamTimesCsvUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, team_id):
        if not user_is_team_coach(request.user, team_id):
            return Response(
                {'detail': 'Only coaches can bulk-upload times from CSV.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        game_id = request.data.get('game_id')
        csv_file = request.FILES.get('file')
        if not game_id:
            return Response({'detail': 'game_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not csv_file:
            return Response({'detail': 'CSV file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            game = Game.objects.get(pk=game_id)
        except (Game.DoesNotExist, TypeError, ValueError):
            return Response({'detail': 'Selected game not found.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            csv_content = csv_file.read().decode('utf-8')
        except UnicodeDecodeError:
            return Response(
                {'detail': 'Invalid file encoding. Please upload a UTF-8 encoded CSV file.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        team = Team.objects.get(pk=team_id)
        try:
            result = import_team_times_csv(
                team=team,
                game=game,
                csv_content=csv_content,
                entered_by=request.user,
            )
        except TimesCsvImportError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)

        return Response(result, status=status.HTTP_200_OK)
