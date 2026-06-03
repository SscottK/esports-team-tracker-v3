from django.db import migrations, models


def migrate_team_roles(apps, schema_editor):
    TeamMembership = apps.get_model('teams', 'TeamMembership')
    for membership in TeamMembership.objects.all():
        old_role = getattr(membership, 'role', None)
        if old_role == 'coach':
            membership.coach_role = 'head'
            membership.is_competing_member = False
        else:
            membership.coach_role = 'none'
            membership.is_competing_member = True
        membership.save(update_fields=['coach_role', 'is_competing_member'])


class Migration(migrations.Migration):

    dependencies = [
        ('teams', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='teammembership',
            name='coach_role',
            field=models.CharField(
                choices=[('none', 'Not a coach'), ('assistant', 'Assistant Coach'), ('head', 'Head Coach')],
                default='none',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='teammembership',
            name='is_competing_member',
            field=models.BooleanField(
                default=True,
                help_text='Whether this user appears in the times grid as a competing team member.',
            ),
        ),
        migrations.RunPython(migrate_team_roles, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='teammembership',
            name='role',
        ),
    ]
