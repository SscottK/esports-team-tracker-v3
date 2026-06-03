from django.core.management.base import BaseCommand, CommandError

from games.models import Game, Level
from performances.models import TeamBenchmark
from performances.services.time_utils import parse_time_to_ms
from teams.models import Team, TeamGame

# Tracks in backend/fixtures/sample_mk_times.csv — (Par 1, Par 2, elite)
SAMPLE_TRACK_BENCHMARKS = {
    'Mario Kart Stadium': ('1:44.000', '1:46.500', '1:42.500'),
    'Water Park': ('1:39.000', '1:41.500', '1:37.500'),
    'Sweet Sweet Canyon': ('1:53.000', '1:55.500', '1:51.500'),
    'Thwomp Ruins': ('1:49.000', '1:51.500', '1:47.500'),
    'Mario Circuit': ('1:42.000', '1:44.500', '1:40.500'),
    'Toad Harbor': ('1:57.500', '2:00.000', '1:56.000'),
}

DEFAULT_GAME_SLUG = 'mario-kart-8-deluxe-original'


class Command(BaseCommand):
    help = (
        'Set Par 1 / Par 2 / elite benchmarks on a team for the tracks used in '
        'backend/fixtures/sample_mk_times.csv.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--team-id', type=int, required=True)
        parser.add_argument(
            '--game-slug',
            default=DEFAULT_GAME_SLUG,
            help=f'Catalog game slug (default: {DEFAULT_GAME_SLUG}).',
        )

    def handle(self, *args, **options):
        team_id = options['team_id']
        game_slug = options['game_slug']

        try:
            team = Team.objects.select_related('organization').get(pk=team_id)
        except Team.DoesNotExist as exc:
            raise CommandError(f'Team {team_id} not found.') from exc

        try:
            game = Game.objects.get(slug=game_slug, is_active=True)
        except Game.DoesNotExist as exc:
            raise CommandError(
                f'Game "{game_slug}" not found. Run: python manage.py seed_mario_kart',
            ) from exc

        if not TeamGame.objects.filter(team=team, game=game).exists():
            raise CommandError(
                f'{game.name} is not assigned to {team.name}. '
                'Assign it on the team page first.',
            )

        levels_by_name = {
            level.name: level
            for level in Level.objects.filter(game=game, is_active=True)
        }

        created = 0
        updated = 0
        missing = []

        for track_name, (par1, par2, elite) in SAMPLE_TRACK_BENCHMARKS.items():
            level = levels_by_name.get(track_name)
            if not level:
                missing.append(track_name)
                continue

            _benchmark, was_created = TeamBenchmark.objects.update_or_create(
                team=team,
                level=level,
                defaults={
                    'target_fast': parse_time_to_ms(par1),
                    'target_slow': parse_time_to_ms(par2),
                    'elite': parse_time_to_ms(elite),
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        if missing:
            self.stdout.write(self.style.WARNING(f'Skipped missing catalog tracks: {", ".join(missing)}'))

        self.stdout.write(self.style.SUCCESS(
            f'{team.name}: benchmarks set for {created + updated} tracks '
            f'({created} created, {updated} updated).',
        ))
        self.stdout.write(f'Game: {game.name}')
        self.stdout.write('Open the times grid to see Par 1 / Par 2 columns and color coding.')
