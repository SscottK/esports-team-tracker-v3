from django.db import migrations, models

from teams.theme_constants import PRESET_TEAM_COLORS


def populate_team_colors(apps, schema_editor):
    Team = apps.get_model('teams', 'Team')
    for team in Team.objects.all().iterator():
        preset = PRESET_TEAM_COLORS.get(team.color_theme, PRESET_TEAM_COLORS['cyan'])
        team.primary_color = preset['primary_color']
        team.secondary_color = preset['secondary_color']
        team.tertiary_color = preset['tertiary_color']
        team.save(update_fields=['primary_color', 'secondary_color', 'tertiary_color'])


class Migration(migrations.Migration):

    dependencies = [
        ('teams', '0007_team_color_theme'),
    ]

    operations = [
        migrations.AddField(
            model_name='team',
            name='primary_color',
            field=models.CharField(default='#22d3ee', max_length=7),
        ),
        migrations.AddField(
            model_name='team',
            name='secondary_color',
            field=models.CharField(default='#38bdf8', max_length=7),
        ),
        migrations.AddField(
            model_name='team',
            name='tertiary_color',
            field=models.CharField(default='#f472b6', max_length=7),
        ),
        migrations.RunPython(populate_team_colors, migrations.RunPython.noop),
    ]
