from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('teams', '0006_migrate_pending_team_migration_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='team',
            name='color_theme',
            field=models.CharField(
                choices=[
                    ('cyan', 'Cyan'),
                    ('emerald', 'Emerald'),
                    ('violet', 'Violet'),
                    ('amber', 'Amber'),
                    ('rose', 'Rose'),
                    ('cobalt', 'Cobalt'),
                ],
                default='cyan',
                max_length=20,
            ),
        ),
    ]
