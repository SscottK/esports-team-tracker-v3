from django.core.management.base import BaseCommand

from games.mk8_catalog import seed_mk8_game


class Command(BaseCommand):
    help = 'Add/update Booster Course Pass tracks on the main Mario Kart 8 Deluxe game.'

    def handle(self, *args, **options):
        game = seed_mk8_game(include_dlc=True)
        dlc_count = game.levels.filter(is_dlc=True).count()
        self.stdout.write(self.style.SUCCESS(
            f'Updated {game.name} with {dlc_count} DLC tracks (same game as the original 48).',
        ))
