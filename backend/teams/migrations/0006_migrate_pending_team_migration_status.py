from django.db import migrations


def migrate_pending_status(apps, schema_editor):
    TeamMigrationRequest = apps.get_model('teams', 'TeamMigrationRequest')
    TeamMigrationRequest.objects.filter(status='pending').update(status='pending_source')


class Migration(migrations.Migration):

    dependencies = [
        ('teams', '0005_teammigrationrequest_source_reviewed_by_and_more'),
    ]

    operations = [
        migrations.RunPython(migrate_pending_status, migrations.RunPython.noop),
    ]
