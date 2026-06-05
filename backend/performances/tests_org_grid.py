from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from games.models import Game, Level
from orgs.models import OrgJoinCode, OrgMembership, Organization
from performances.models import MemberResult, TeamBenchmark
from teams.models import CoachRole, Team, TeamGame, TeamMembership

User = get_user_model()


class OrgGridTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Ridgeview HS')
        OrgJoinCode.objects.create(organization=self.org)

        self.coach = User.objects.create_user(username='coach', password='pass12345')
        self.varsity_player = User.objects.create_user(username='varsity1', password='pass12345')
        self.jv_player = User.objects.create_user(username='jv1', password='pass12345')
        self.member_only = User.objects.create_user(username='player', password='pass12345')

        for user in (self.coach, self.varsity_player, self.jv_player, self.member_only):
            OrgMembership.objects.create(user=user, organization=self.org, is_admin=False)

        self.varsity = Team.objects.create(organization=self.org, name='Varsity')
        self.jv = Team.objects.create(organization=self.org, name='Junior Varsity')

        TeamMembership.objects.create(
            user=self.coach,
            team=self.varsity,
            coach_role=CoachRole.HEAD,
            is_competing_member=False,
        )
        TeamMembership.objects.create(
            user=self.coach,
            team=self.jv,
            coach_role=CoachRole.ASSISTANT,
            is_competing_member=False,
        )
        TeamMembership.objects.create(
            user=self.varsity_player,
            team=self.varsity,
            coach_role=CoachRole.NONE,
            is_competing_member=True,
        )
        TeamMembership.objects.create(
            user=self.jv_player,
            team=self.jv,
            coach_role=CoachRole.NONE,
            is_competing_member=True,
        )
        TeamMembership.objects.create(
            user=self.member_only,
            team=self.varsity,
            coach_role=CoachRole.NONE,
            is_competing_member=True,
        )

        self.game = Game.objects.create(
            name='Mario Kart',
            slug='mario-kart-org-grid',
            metric_type='time',
            category='racing',
        )
        self.level = Level.objects.create(game=self.game, name='Track 1', sort_order=1)
        TeamGame.objects.create(team=self.varsity, game=self.game)
        TeamGame.objects.create(team=self.jv, game=self.game)

        TeamBenchmark.objects.create(
            team=self.varsity,
            level=self.level,
            target_fast=100000,
            target_slow=110000,
        )
        TeamBenchmark.objects.create(
            team=self.jv,
            level=self.level,
            target_fast=120000,
            target_slow=130000,
        )
        MemberResult.objects.create(user=self.varsity_player, team=self.varsity, level=self.level, value=105000)
        MemberResult.objects.create(user=self.jv_player, team=self.jv, level=self.level, value=125000)

    def test_coach_can_load_org_grid(self):
        self.client.force_authenticate(user=self.coach)
        response = self.client.get(
            f'/api/teams/{self.varsity.id}/games/{self.game.id}/grid/',
            {'org_view': 'true'},
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['org_view'])
        self.assertEqual(response.data['organization']['name'], 'Ridgeview HS')
        self.assertEqual(len(response.data['members']), 3)
        usernames = {member['username'] for member in response.data['members']}
        self.assertEqual(usernames, {'jv1', 'player', 'varsity1'})
        self.assertTrue(response.data['viewer']['can_toggle_org_view'])

        varsity_cell = response.data['levels'][0]['results'][f'{self.varsity.id}-{self.varsity_player.id}']
        jv_cell = response.data['levels'][0]['results'][f'{self.jv.id}-{self.jv_player.id}']
        self.assertEqual(varsity_cell['status'], 'medium')
        self.assertEqual(jv_cell['status'], 'medium')

    def test_member_cannot_load_org_grid(self):
        self.client.force_authenticate(user=self.member_only)
        response = self.client.get(
            f'/api/teams/{self.varsity.id}/games/{self.game.id}/grid/',
            {'org_view': 'true'},
        )
        self.assertEqual(response.status_code, 403)

    def test_team_grid_unchanged_without_org_view(self):
        self.client.force_authenticate(user=self.coach)
        response = self.client.get(f'/api/teams/{self.varsity.id}/games/{self.game.id}/grid/')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('org_view', response.data)
        self.assertEqual(len(response.data['members']), 2)
        usernames = {member['username'] for member in response.data['members']}
        self.assertEqual(usernames, {'player', 'varsity1'})
