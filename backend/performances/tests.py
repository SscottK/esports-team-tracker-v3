from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from games.models import Game, Level
from orgs.models import OrgJoinCode, OrgMembership, Organization
from performances.models import MemberResult, MemberResultHistory
from teams.models import CoachRole, Team, TeamGame, TeamMembership

User = get_user_model()


class SubmitResultTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Test Org')
        OrgJoinCode.objects.create(organization=self.org)

        self.coach = User.objects.create_user(username='coach', password='pass12345')
        self.member = User.objects.create_user(username='member', password='pass12345')

        OrgMembership.objects.create(user=self.coach, organization=self.org, is_admin=True)
        OrgMembership.objects.create(user=self.member, organization=self.org, is_admin=False)

        self.team = Team.objects.create(organization=self.org, name='Alpha')
        TeamMembership.objects.create(
            user=self.coach,
            team=self.team,
            coach_role=CoachRole.HEAD,
            is_competing_member=False,
        )
        TeamMembership.objects.create(
            user=self.member,
            team=self.team,
            coach_role=CoachRole.NONE,
            is_competing_member=True,
        )

        self.game = Game.objects.create(
            name='Mario Kart',
            slug='mario-kart',
            metric_type='time',
            category='racing',
        )
        self.level = Level.objects.create(game=self.game, name='Track 1', sort_order=1)
        TeamGame.objects.create(team=self.team, game=self.game)

    def test_competing_member_can_submit_own_time(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.post('/api/results/', {
            'team': self.team.id,
            'level': self.level.id,
            'time_input': '1:43.411',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(MemberResult.objects.filter(user=self.member, level=self.level).exists())

    def test_coach_can_submit_time_for_competing_member(self):
        self.client.force_authenticate(user=self.coach)
        response = self.client.post('/api/results/', {
            'team': self.team.id,
            'level': self.level.id,
            'time_input': '1:40.000',
            'user_id': self.member.id,
        }, format='json')
        self.assertEqual(response.status_code, 201)
        result = MemberResult.objects.get(user=self.member, level=self.level)
        self.assertEqual(result.value, 100000)

    def test_resubmitting_same_track_updates_best_time_and_keeps_history(self):
        self.client.force_authenticate(user=self.member)
        payload = {
            'team': self.team.id,
            'level': self.level.id,
            'time_input': '1:43.411',
        }
        self.client.post('/api/results/', payload, format='json')
        response = self.client.post('/api/results/', {
            **payload,
            'time_input': '1:42.000',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(MemberResult.objects.filter(user=self.member, level=self.level).count(), 1)
        self.assertEqual(MemberResultHistory.objects.filter(user=self.member, level=self.level).count(), 2)
        result = MemberResult.objects.get(user=self.member, level=self.level)
        self.assertEqual(result.value, 102000)

    def test_slower_resubmit_keeps_best_time_and_adds_history(self):
        self.client.force_authenticate(user=self.member)
        payload = {
            'team': self.team.id,
            'level': self.level.id,
            'time_input': '1:40.000',
        }
        self.client.post('/api/results/', payload, format='json')
        self.client.post('/api/results/', {
            **payload,
            'time_input': '1:45.000',
        }, format='json')
        result = MemberResult.objects.get(user=self.member, level=self.level)
        self.assertEqual(result.value, 100000)
        self.assertEqual(MemberResultHistory.objects.filter(user=self.member, level=self.level).count(), 2)

    def test_coach_submission_records_entered_by(self):
        self.client.force_authenticate(user=self.coach)
        self.client.post('/api/results/', {
            'team': self.team.id,
            'level': self.level.id,
            'time_input': '1:39.500',
            'user_id': self.member.id,
        }, format='json')
        history = MemberResultHistory.objects.latest('created_at')
        self.assertEqual(history.user_id, self.member.id)
        self.assertEqual(history.entered_by_id, self.coach.id)


class TimesCsvUploadTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Test Org')
        OrgJoinCode.objects.create(organization=self.org)

        self.coach = User.objects.create_user(username='coach', password='pass12345')
        self.member = User.objects.create_user(username='alice', password='pass12345')
        self.other = User.objects.create_user(username='bob', password='pass12345')

        OrgMembership.objects.create(user=self.coach, organization=self.org, is_admin=True)
        OrgMembership.objects.create(user=self.member, organization=self.org, is_admin=False)
        OrgMembership.objects.create(user=self.other, organization=self.org, is_admin=False)

        self.team = Team.objects.create(organization=self.org, name='Alpha')
        TeamMembership.objects.create(
            user=self.coach,
            team=self.team,
            coach_role=CoachRole.HEAD,
            is_competing_member=False,
        )
        TeamMembership.objects.create(
            user=self.member,
            team=self.team,
            coach_role=CoachRole.NONE,
            is_competing_member=True,
        )

        self.game = Game.objects.create(
            name='Mario Kart',
            slug='mario-kart',
            metric_type='time',
            category='racing',
        )
        self.level = Level.objects.create(game=self.game, name='Mario Kart Stadium', sort_order=1)
        TeamGame.objects.create(team=self.team, game=self.game)

    def test_coach_can_upload_csv(self):
        csv_content = (
            ',,alice\n'
            'Mushroom Cup,\n'
            ',Mario Kart Stadium,1:43.411\n'
        )
        self.client.force_authenticate(user=self.coach)
        response = self.client.post(
            f'/api/teams/{self.team.id}/times-csv/',
            {
                'game_id': self.game.id,
                'file': SimpleUploadedFile('times.csv', csv_content.encode('utf-8'), content_type='text/csv'),
            },
            format='multipart',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['imported'], 1)
        result = MemberResult.objects.get(user=self.member, level=self.level)
        self.assertEqual(result.value, 103411)

    def test_member_cannot_upload_csv(self):
        csv_content = ',,alice\n,Mario Kart Stadium,1:43.411\n'
        self.client.force_authenticate(user=self.member)
        response = self.client.post(
            f'/api/teams/{self.team.id}/times-csv/',
            {
                'game_id': self.game.id,
                'file': SimpleUploadedFile('times.csv', csv_content.encode('utf-8'), content_type='text/csv'),
            },
            format='multipart',
        )
        self.assertEqual(response.status_code, 403)

