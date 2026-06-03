from django.db import migrations, models


def merge_standalone_dlc_game(apps, schema_editor):
    Game = apps.get_model('games', 'Game')
    Level = apps.get_model('games', 'Level')
    LevelGroup = apps.get_model('games', 'LevelGroup')
    TeamGame = apps.get_model('teams', 'TeamGame')

    original = Game.objects.filter(slug='mario-kart-8-deluxe-original').first()
    legacy_dlc = Game.objects.filter(slug='mario-kart-8-deluxe-booster-course-pass').first()
    if not original or not legacy_dlc:
        return

    max_group_sort = (
        LevelGroup.objects.filter(game=original)
        .order_by('-sort_order')
        .values_list('sort_order', flat=True)
        .first()
    )
    next_group_sort = (max_group_sort or 0) + 1

    for group in LevelGroup.objects.filter(game=legacy_dlc).order_by('sort_order'):
        group.game = original
        group.sort_order = next_group_sort
        group.save(update_fields=['game', 'sort_order'])
        Level.objects.filter(level_group=group).update(game=original, is_dlc=True)
        next_group_sort += 1

    Level.objects.filter(game=legacy_dlc).update(game=original, is_dlc=True)

    for team_game in TeamGame.objects.filter(game=legacy_dlc):
        TeamGame.objects.get_or_create(team=team_game.team, game=original)
        team_game.delete()

    legacy_dlc.is_active = False
    legacy_dlc.save(update_fields=['is_active'])

    original.name = 'Mario Kart 8 Deluxe'
    original.save(update_fields=['name'])


class Migration(migrations.Migration):

    dependencies = [
        ('teams', '0006_migrate_pending_team_migration_status'),
        ('games', '0002_game_activity_label_plural_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='level',
            name='is_dlc',
            field=models.BooleanField(
                default=False,
                help_text='When true, track is hidden from the grid unless DLC is toggled on.',
            ),
        ),
        migrations.RunPython(merge_standalone_dlc_game, migrations.RunPython.noop),
    ]
