from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from orgs.models import OrgJoinCode, OrgJoinRequest, OrgJoinRequestStatus, OrgMembership, Organization
from teams.models import CoachRole, JoinRequestStatus, Team, TeamJoinRequest, TeamMembership

User = get_user_model()


class RequestInboxTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.source_org = Organization.objects.create(name='Source Org')
        self.target_org = Organization.objects.create(name='Target Org')
        OrgJoinCode.objects.create(organization=self.source_org)
        OrgJoinCode.objects.create(organization=self.target_org)

        self.org_leader = User.objects.create_user(username='orgleader', password='pass12345')
        self.coach = User.objects.create_user(username='coach', password='pass12345')
        self.applicant = User.objects.create_user(username='applicant', password='pass12345')
        self.member = User.objects.create_user(username='member', password='pass12345')

        OrgMembership.objects.create(user=self.org_leader, organization=self.source_org, is_admin=True)
        OrgMembership.objects.create(user=self.coach, organization=self.source_org, is_admin=False)
        OrgMembership.objects.create(user=self.member, organization=self.source_org, is_admin=False)

        self.team = Team.objects.create(organization=self.source_org, name='Racers')
        TeamMembership.objects.create(
            user=self.coach,
            team=self.team,
            coach_role=CoachRole.HEAD,
            is_competing_member=True,
        )

    def test_org_leader_sees_pending_org_join(self):
        OrgJoinRequest.objects.create(
            user=self.applicant,
            organization=self.source_org,
            status=OrgJoinRequestStatus.PENDING,
        )

        self.client.force_authenticate(user=self.org_leader)
        response = self.client.get('/api/requests/inbox/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['pending_count'], 1)
        self.assertEqual(response.data['pending'][0]['type'], 'org_join')

    def test_coach_sees_pending_team_join(self):
        TeamJoinRequest.objects.create(
            user=self.member,
            team=self.team,
            status=JoinRequestStatus.PENDING,
        )

        self.client.force_authenticate(user=self.coach)
        response = self.client.get('/api/requests/inbox/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['pending_count'], 1)
        self.assertEqual(response.data['pending'][0]['type'], 'team_join')

    def test_inbox_item_types_are_distinct(self):
        OrgJoinRequest.objects.create(
            user=self.applicant,
            organization=self.source_org,
            status=OrgJoinRequestStatus.PENDING,
        )
        TeamJoinRequest.objects.create(
            user=self.member,
            team=self.team,
            status=JoinRequestStatus.PENDING,
        )
        TeamMembership.objects.create(
            user=self.org_leader,
            team=self.team,
            coach_role=CoachRole.ASSISTANT,
            is_competing_member=False,
        )

        self.client.force_authenticate(user=self.org_leader)
        response = self.client.get('/api/requests/inbox/')

        pending_types = {item['type'] for item in response.data['pending']}
        self.assertIn('org_join', pending_types)
        self.assertIn('team_join', pending_types)
        self.assertEqual(response.data['pending_count'], 2)

    def test_user_sees_sent_org_join_request(self):
        OrgJoinRequest.objects.create(
            user=self.applicant,
            organization=self.source_org,
            status=OrgJoinRequestStatus.PENDING,
        )

        self.client.force_authenticate(user=self.applicant)
        response = self.client.get('/api/requests/inbox/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['sent']), 1)
        self.assertEqual(response.data['sent'][0]['type'], 'org_join')
        self.assertEqual(response.data['sent'][0]['action'], 'cancel')
