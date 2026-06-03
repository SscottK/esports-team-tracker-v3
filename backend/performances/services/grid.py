from django.db.models import Q

from performances.models import MemberResult, TeamBenchmark
from performances.services.time_utils import format_ms_to_time
from teams.models import CoachRole, TeamGame, TeamMembership


def get_times_grid_memberships(team, include_coach_competitors=False):
    queryset = TeamMembership.objects.filter(team=team, is_competing_member=True)
    if include_coach_competitors:
        queryset = queryset.filter(
            Q(coach_role=CoachRole.NONE)
            | Q(coach_role__in=(CoachRole.HEAD, CoachRole.ASSISTANT))
        )
    else:
        queryset = queryset.filter(coach_role=CoachRole.NONE)
    return queryset.select_related('user').order_by('user__username')


def get_active_levels(game, include_dlc=False):
    queryset = game.levels.filter(is_active=True).select_related('level_group')
    if not include_dlc:
        queryset = queryset.filter(is_dlc=False)
    return queryset.order_by('level_group__sort_order', 'sort_order', 'name')


def build_team_grid(team, game, include_coach_competitors=False, include_dlc=False):
    if not TeamGame.objects.filter(team=team, game=game).exists():
        raise ValueError('Game is not assigned to this team.')

    memberships = list(get_times_grid_memberships(team, include_coach_competitors))
    members = [
        {'user_id': membership.user_id, 'user__username': membership.user.username}
        for membership in memberships
    ]
    member_ids = [member['user_id'] for member in members]

    levels = list(get_active_levels(game, include_dlc=include_dlc))
    level_ids = [level.id for level in levels]

    benchmarks = {
        benchmark.level_id: benchmark
        for benchmark in TeamBenchmark.objects.filter(team=team, level_id__in=level_ids)
    }
    results = MemberResult.objects.filter(
        team=team,
        level_id__in=level_ids,
        user_id__in=member_ids,
    )
    result_map = {(result.user_id, result.level_id): result for result in results}

    level_payload = []
    for level in levels:
        benchmark = benchmarks.get(level.id)
        target_fast = benchmark.target_fast if benchmark else None
        target_slow = benchmark.target_slow if benchmark else None
        elite = benchmark.elite if benchmark else None
        row_results = {}
        for member in members:
            result = result_map.get((member['user_id'], level.id))
            value_ms = result.value if result else None
            row_results[str(member['user_id'])] = {
                'value_ms': value_ms,
                'display': format_ms_to_time(value_ms) if value_ms is not None else None,
                'status': _classify_time(value_ms, target_fast, target_slow),
            }
        level_payload.append(
            {
                'id': level.id,
                'name': level.name,
                'level_group': level.level_group.name if level.level_group else None,
                'is_dlc': level.is_dlc,
                'benchmark': {
                    'target_fast': format_ms_to_time(target_fast) if target_fast is not None else None,
                    'target_slow': format_ms_to_time(target_slow) if target_slow is not None else None,
                    'elite': format_ms_to_time(elite) if elite is not None else None,
                    'target_fast_ms': target_fast,
                    'target_slow_ms': target_slow,
                    'elite_ms': elite,
                },
                'results': row_results,
            }
        )

    return {
        'game': _game_payload(game),
        'members': [
            {'id': member['user_id'], 'username': member['user__username']}
            for member in members
        ],
        'levels': level_payload,
        'include_coach_competitors': include_coach_competitors,
        'include_dlc': include_dlc,
    }


def _game_payload(game):
    from games.models import Level
    return {
        'id': game.id,
        'name': game.name,
        'metric_type': game.metric_type,
        'category': game.category,
        'labels': game.labels,
        'has_dlc_tracks': Level.objects.filter(game=game, is_active=True, is_dlc=True).exists(),
    }


def _classify_time(value_ms, target_fast, target_slow):
    from performances.services.time_utils import classify_time
    return classify_time(value_ms, target_fast, target_slow)


def build_compare_data(team, game, include_coach_competitors=False, include_dlc=False):
    if not TeamGame.objects.filter(team=team, game=game).exists():
        raise ValueError('Game is not assigned to this team.')

    memberships = list(get_times_grid_memberships(team, include_coach_competitors))
    if not memberships:
        memberships = list(
            TeamMembership.objects.filter(team=team, is_competing_member=True).select_related('user')
        )

    levels = list(get_active_levels(game, include_dlc=include_dlc))
    level_ids = [level.id for level in levels]
    member_ids = [membership.user_id for membership in memberships]

    results = MemberResult.objects.filter(
        team=team,
        level_id__in=level_ids,
        user_id__in=member_ids,
    )
    result_map = {(result.user_id, result.level_id): result for result in results}

    benchmarks = {
        benchmark.level_id: benchmark
        for benchmark in TeamBenchmark.objects.filter(team=team, level_id__in=level_ids)
    }

    times = {}
    for level in levels:
        for membership in memberships:
            result = result_map.get((membership.user_id, level.id))
            times[f'{level.id}-{membership.user_id}'] = (
                format_ms_to_time(result.value) if result else None
            )
        benchmark = benchmarks.get(level.id)
        if benchmark:
            if benchmark.target_fast is not None:
                times[f'{level.id}-target_fast'] = format_ms_to_time(benchmark.target_fast)
            if benchmark.target_slow is not None:
                times[f'{level.id}-target_slow'] = format_ms_to_time(benchmark.target_slow)

    reference_members = [
        {'id': membership.user_id, 'username': membership.user.username}
        for membership in memberships
    ]
    reference_members.extend([
        {'id': 'target_fast', 'username': 'Par 1'},
        {'id': 'target_slow', 'username': 'Par 2'},
    ])

    return {
        'game': _game_payload(game),
        'members': reference_members,
        'levels': [
            {
                'id': level.id,
                'name': level.name,
                'level_group': level.level_group.name if level.level_group else None,
                'is_dlc': level.is_dlc,
            }
            for level in levels
        ],
        'times': times,
    }


def build_leaderboard(team, game, include_coach_competitors=False, include_dlc=False):
    grid = build_team_grid(
        team,
        game,
        include_coach_competitors=include_coach_competitors,
        include_dlc=include_dlc,
    )
    leaderboard = []

    for member in grid['members']:
        completed = 0
        par1_hits = 0
        par2_hits = 0
        for level in grid['levels']:
            cell = level['results'].get(str(member['id']), {})
            if cell.get('value_ms') is None:
                continue
            completed += 1
            status = cell.get('status')
            if status == 'fast':
                par1_hits += 1
                par2_hits += 1
            elif status == 'medium':
                par2_hits += 1

        par1_pct = round((par1_hits / completed) * 100) if completed else 0
        par2_pct = round((par2_hits / completed) * 100) if completed else 0
        total_tracks = len(grid['levels'])
        completion_pct = round((completed / total_tracks) * 100) if total_tracks else 0

        leaderboard.append(
            {
                'member_id': member['id'],
                'username': member['username'],
                'completed': completed,
                'total_tracks': total_tracks,
                'completion_pct': completion_pct,
                'par1_pct': par1_pct,
                'par2_pct': par2_pct,
            }
        )

    leaderboard.sort(key=lambda row: (-row['par1_pct'], -row['par2_pct'], -row['completed']))
    for index, row in enumerate(leaderboard, start=1):
        row['position'] = index

    return {
        'game': grid['game'],
        'leaderboard': leaderboard,
    }
