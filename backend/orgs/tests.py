from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from orgs.models import OrgJoinCode, OrgMembership, Organization
from teams.models import CoachRole, Team, TeamMembership

User = get_user_model()


class OrgLeaveTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Test Org')
        OrgJoinCode.objects.create(organization=self.org)

        self.leader = User.objects.create_user(username='leader', password='pass12345')
        self.other_leader = User.objects.create_user(username='coleader', password='pass12345')
        self.member = User.objects.create_user(username='member', password='pass12345')

        self.leader_membership = OrgMembership.objects.create(
            user=self.leader,
            organization=self.org,
            is_admin=True,
        )
        self.other_leader_membership = OrgMembership.objects.create(
            user=self.other_leader,
            organization=self.org,
            is_admin=True,
        )
        self.member_membership = OrgMembership.objects.create(
            user=self.member,
            organization=self.org,
            is_admin=False,
        )

        self.team = Team.objects.create(organization=self.org, name='Alpha')
        self.member_team_membership = TeamMembership.objects.create(
            user=self.member,
            team=self.team,
            coach_role=CoachRole.NONE,
            is_competing_member=True,
        )

    def test_member_can_leave_org_and_teams(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.post(f'/api/organizations/{self.org.id}/leave/', {}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['left'])
        self.assertFalse(OrgMembership.objects.filter(pk=self.member_membership.pk).exists())
        self.assertFalse(TeamMembership.objects.filter(pk=self.member_team_membership.pk).exists())

    def test_org_leader_must_assign_successor_or_disband(self):
        self.client.force_authenticate(user=self.leader)
        response = self.client.post(f'/api/organizations/{self.org.id}/leave/', {}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertTrue(OrgMembership.objects.filter(pk=self.leader_membership.pk).exists())

    def test_org_leader_can_transfer_and_leave(self):
        self.client.force_authenticate(user=self.leader)
        response = self.client.post(
            f'/api/organizations/{self.org.id}/leave/',
            {'successor_membership_id': self.member_membership.id},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['left'])
        self.assertEqual(response.data['new_org_leader'], 'member')
        self.assertFalse(OrgMembership.objects.filter(user=self.leader, organization=self.org).exists())
        self.member_membership.refresh_from_db()
        self.assertTrue(self.member_membership.is_admin)

    def test_cannot_disband_org_with_teams(self):
        self.client.force_authenticate(user=self.leader)
        response = self.client.post(
            f'/api/organizations/{self.org.id}/leave/',
            {'disband': True},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertTrue(Organization.objects.filter(pk=self.org.id).exists())

    def test_org_leader_can_disband_empty_org(self):
        solo_org = Organization.objects.create(name='Solo Org')
        OrgJoinCode.objects.create(organization=solo_org)
        solo_user = User.objects.create_user(username='solo', password='pass12345')
        OrgMembership.objects.create(user=solo_user, organization=solo_org, is_admin=True)

        self.client.force_authenticate(user=solo_user)
        response = self.client.post(
            f'/api/organizations/{solo_org.id}/leave/',
            {'disband': True},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['disbanded'])
        self.assertFalse(Organization.objects.filter(pk=solo_org.id).exists())

    def test_cannot_demote_last_org_leader_via_patch(self):
        OrgMembership.objects.filter(pk=self.other_leader_membership.pk).update(is_admin=False)
        self.client.force_authenticate(user=self.leader)
        response = self.client.patch(
            f'/api/organizations/{self.org.id}/members/{self.leader_membership.id}/',
            {'is_org_leader': False},
            format='json',
        )
        self.assertEqual(response.status_code, 400)


class MultiOrgMembershipTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='multi', password='pass12345')
        self.client.force_authenticate(user=self.user)

        self.org_one = Organization.objects.create(name='Org One')
        self.org_two = Organization.objects.create(name='Org Two')
        OrgJoinCode.objects.create(organization=self.org_one)
        OrgJoinCode.objects.create(organization=self.org_two, code='JOINORG2')

        OrgMembership.objects.create(user=self.user, organization=self.org_one, is_admin=True)

    def test_list_returns_all_user_organizations(self):
        OrgMembership.objects.create(user=self.user, organization=self.org_two, is_admin=False)
        response = self.client.get('/api/organizations/me/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['organizations']), 2)

    def test_user_can_create_second_organization(self):
        response = self.client.post('/api/organizations/me/', {'name': 'Org Three'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(OrgMembership.objects.filter(user=self.user).count(), 2)

    def test_user_can_request_and_be_approved_into_second_organization(self):
        response = self.client.post('/api/organizations/join/', {'code': 'JOINORG2'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(OrgMembership.objects.filter(user=self.user).count(), 1)

        join_request_id = response.data['id']
        leader = User.objects.create_user(username='orgtwoleader', password='pass12345')
        OrgMembership.objects.filter(organization=self.org_two).delete()
        OrgMembership.objects.create(user=leader, organization=self.org_two, is_admin=True)

        self.client.force_authenticate(user=leader)
        response = self.client.patch(
            f'/api/organizations/{self.org_two.id}/join-requests/{join_request_id}/',
            {'action': 'approve'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(OrgMembership.objects.filter(user=self.user).count(), 2)

    def test_cannot_request_same_organization_twice(self):
        response = self.client.post('/api/organizations/join/', {'code': 'JOINORG2'}, format='json')
        self.assertEqual(response.status_code, 201)
        response = self.client.post('/api/organizations/join/', {'code': 'JOINORG2'}, format='json')
        self.assertEqual(response.status_code, 400)
