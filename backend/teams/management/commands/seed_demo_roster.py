from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from orgs.models import OrgMembership
from teams.models import CoachRole, Team, TeamMembership

User = get_user_model()

DEMO_USERNAMES = ['riley', 'casey', 'morgan', 'quinn', 'sam']
DEFAULT_PASSWORD = 'demo12345'


class Command(BaseCommand):
    help = (
        'Create demo user accounts, add them to a team org, and put them on the roster '
        'as competing members (for CSV upload testing).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--team-id',
            type=int,
            help='Team to add demo members to (use --list-teams to see IDs).',
        )
        parser.add_argument(
            '--list-teams',
            action='store_true',
            help='List teams and exit.',
        )
        parser.add_argument(
            '--password',
            default=DEFAULT_PASSWORD,
            help=f'Password for new demo users (default: {DEFAULT_PASSWORD}).',
        )

    def handle(self, *args, **options):
        if options['list_teams']:
            teams = Team.objects.select_related('organization').order_by('id')
            if not teams.exists():
                raise CommandError('No teams found. Create a team in the app first.')
            self.stdout.write('Teams:')
            for team in teams:
                self.stdout.write(f'  id={team.id}  {team.organization.name} / {team.name}')
            return

        team_id = options['team_id']
        if not team_id:
            raise CommandError('Pass --team-id N (or run with --list-teams to see options).')

        try:
            team = Team.objects.select_related('organization').get(pk=team_id)
        except Team.DoesNotExist as exc:
            raise CommandError(f'Team {team_id} not found.') from exc

        password = options['password']
        created_users = []
        org_added = []
        roster_added = []

        for username in DEMO_USERNAMES:
            user, user_created = User.objects.get_or_create(username=username)
            if user_created:
                user.set_password(password)
                user.save()
                created_users.append(username)

            _, org_membership_created = OrgMembership.objects.get_or_create(
                user=user,
                organization=team.organization,
                defaults={'is_admin': False},
            )
            if org_membership_created:
                org_added.append(username)

            membership, roster_created = TeamMembership.objects.get_or_create(
                user=user,
                team=team,
                defaults={
                    'coach_role': CoachRole.NONE,
                    'is_competing_member': True,
                },
            )
            if not roster_created and not membership.is_competing_member:
                membership.is_competing_member = True
                membership.save(update_fields=['is_competing_member'])
                roster_added.append(username)
            elif roster_created:
                roster_added.append(username)

        self.stdout.write(self.style.SUCCESS(f'Team: {team.name} ({team.organization.name})'))
        self.stdout.write('')
        self.stdout.write('Demo usernames (CSV header must use these exact names):')
        self.stdout.write(f'  {", ".join(DEMO_USERNAMES)}')
        self.stdout.write(f'  Password for new accounts: {password}')
        if created_users:
            self.stdout.write(f'  Created users: {", ".join(created_users)}')
        else:
            self.stdout.write('  All demo users already existed (passwords unchanged).')
        self.stdout.write(f'  Added to org: {len(org_added)} new org membership(s)')
        self.stdout.write(f'  On team roster (competing): {len(roster_added)} membership(s) updated or created')
        self.stdout.write('')
        self.stdout.write('Sample CSV: backend/fixtures/sample_mk_times.csv')
        self.stdout.write('Upload it from the times grid → Upload CSV (coach only).')
        self.stdout.write('')
        self.stdout.write(
            f'Seed matching benchmarks: python manage.py seed_demo_benchmarks --team-id {team_id}',
        )
