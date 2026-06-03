from django.core.management.base import BaseCommand

from games.mk8_catalog import seed_mk8_game


class Command(BaseCommand):
    help = 'Seed Mario Kart 8 Deluxe catalog (base + Booster Course Pass tracks on one game).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--base-only',
            action='store_true',
            help='Seed only the original 48 tracks (no DLC).',
        )

    def handle(self, *args, **options):
        game = seed_mk8_game(include_dlc=not options['base_only'])
        dlc_count = game.levels.filter(is_dlc=True).count()
        base_count = game.levels.filter(is_dlc=False).count()
        self.stdout.write(self.style.SUCCESS(
            f'Seeded {game.name}: {base_count} base tracks, {dlc_count} DLC tracks.',
        ))
