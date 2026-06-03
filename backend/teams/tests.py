from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from orgs.models import OrgJoinCode, OrgMembership, Organization
from teams.models import CoachRole, Team, TeamJoinRequest, TeamMembership, TeamMigrationRequest, TeamMigrationStatus

User = get_user_model()


class TeamLeaveTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Test Org')
        OrgJoinCode.objects.create(organization=self.org)

        self.leader = User.objects.create_user(username='leader', password='pass12345')
        self.head = User.objects.create_user(username='head', password='pass12345')
        self.member = User.objects.create_user(username='member', password='pass12345')
        self.other = User.objects.create_user(username='other', password='pass12345')

        OrgMembership.objects.create(user=self.leader, organization=self.org, is_admin=True)
        for user in (self.head, self.member, self.other):
            OrgMembership.objects.create(user=user, organization=self.org, is_admin=False)

        self.team = Team.objects.create(organization=self.org, name='Alpha')
        self.head_membership = TeamMembership.objects.create(
            user=self.head,
            team=self.team,
            coach_role=CoachRole.HEAD,
            is_competing_member=False,
        )
        self.member_membership = TeamMembership.objects.create(
            user=self.member,
            team=self.team,
            coach_role=CoachRole.NONE,
            is_competing_member=True,
        )

    def test_member_can_leave_team(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.post(f'/api/teams/{self.team.id}/leave/', {})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['left'])
        self.assertFalse(TeamMembership.objects.filter(pk=self.member_membership.pk).exists())

    def test_head_coach_must_assign_successor_or_disband(self):
        self.client.force_authenticate(user=self.head)
        response = self.client.post(f'/api/teams/{self.team.id}/leave/', {})
        self.assertEqual(response.status_code, 400)
        self.assertTrue(TeamMembership.objects.filter(pk=self.head_membership.pk).exists())

    def test_head_coach_can_transfer_and_leave(self):
        self.client.force_authenticate(user=self.head)
        response = self.client.post(
            f'/api/teams/{self.team.id}/leave/',
            {'successor_membership_id': self.member_membership.id},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['left'])
        self.assertEqual(response.data['new_head_coach'], 'member')
        self.assertFalse(TeamMembership.objects.filter(user=self.head, team=self.team).exists())
        self.member_membership.refresh_from_db()
        self.assertEqual(self.member_membership.coach_role, CoachRole.HEAD)

    def test_solo_head_coach_must_disband(self):
        solo_team = Team.objects.create(organization=self.org, name='Solo')
        solo_head = TeamMembership.objects.create(
            user=self.other,
            team=solo_team,
            coach_role=CoachRole.HEAD,
            is_competing_member=False,
        )
        self.client.force_authenticate(user=self.other)
        response = self.client.post(f'/api/teams/{solo_team.id}/leave/', {})
        self.assertEqual(response.status_code, 400)

        response = self.client.post(f'/api/teams/{solo_team.id}/leave/', {'disband': True}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['disbanded'])
        self.assertFalse(Team.objects.filter(pk=solo_team.id).exists())
        self.assertFalse(TeamMembership.objects.filter(pk=solo_head.pk).exists())

    def test_head_coach_can_disband_team_with_members(self):
        self.client.force_authenticate(user=self.head)
        response = self.client.post(f'/api/teams/{self.team.id}/leave/', {'disband': True}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['disbanded'])
        self.assertFalse(Team.objects.filter(pk=self.team.id).exists())

    def test_cannot_demote_last_head_coach_via_patch(self):
        self.client.force_authenticate(user=self.head)
        response = self.client.patch(
            f'/api/teams/{self.team.id}/members/{self.head_membership.id}/',
            {'coach_role': CoachRole.ASSISTANT},
            format='json',
        )
        self.assertEqual(response.status_code, 400)


class TeamJoinRequestTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Test Org')
        OrgJoinCode.objects.create(organization=self.org)

        self.head = User.objects.create_user(username='head', password='pass12345')
        self.applicant = User.objects.create_user(username='applicant', password='pass12345')

        OrgMembership.objects.create(user=self.head, organization=self.org, is_admin=True)
        OrgMembership.objects.create(user=self.applicant, organization=self.org, is_admin=False)

        self.team = Team.objects.create(organization=self.org, name='Alpha')
        TeamMembership.objects.create(
            user=self.head,
            team=self.team,
            coach_role=CoachRole.HEAD,
            is_competing_member=False,
        )

    def test_org_member_can_request_team_join(self):
        self.client.force_authenticate(user=self.applicant)
        response = self.client.post(f'/api/teams/{self.team.id}/join-requests/', {}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'pending')

    def test_coach_can_approve_join_request(self):
        join_request = TeamJoinRequest.objects.create(user=self.applicant, team=self.team)
        self.client.force_authenticate(user=self.head)
        response = self.client.patch(
            f'/api/teams/{self.team.id}/join-requests/{join_request.id}/',
            {'action': 'approve'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(TeamMembership.objects.filter(user=self.applicant, team=self.team).exists())

    def test_applicant_can_cancel_pending_request(self):
        join_request = TeamJoinRequest.objects.create(user=self.applicant, team=self.team)
        self.client.force_authenticate(user=self.applicant)
        response = self.client.patch(
            f'/api/teams/{self.team.id}/join-requests/{join_request.id}/',
            {'action': 'cancel'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        join_request.refresh_from_db()
        self.assertEqual(join_request.status, 'cancelled')


class TeamMigrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.source_org = Organization.objects.create(name='Source Org')
        self.target_org = Organization.objects.create(name='Target Org')
        self.target_join_code = OrgJoinCode.objects.create(organization=self.target_org)

        self.source_leader = User.objects.create_user(username='source_leader', password='pass12345')
        self.target_leader = User.objects.create_user(username='target_leader', password='pass12345')
        self.head = User.objects.create_user(username='head', password='pass12345')
        self.member = User.objects.create_user(username='member', password='pass12345')

        OrgMembership.objects.create(user=self.source_leader, organization=self.source_org, is_admin=True)
        OrgMembership.objects.create(user=self.head, organization=self.source_org, is_admin=False)
        OrgMembership.objects.create(user=self.member, organization=self.source_org, is_admin=False)
        OrgMembership.objects.create(user=self.target_leader, organization=self.target_org, is_admin=True)

        self.team = Team.objects.create(organization=self.source_org, name='Alpha')
        TeamMembership.objects.create(
            user=self.head,
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

    def test_head_coach_can_request_team_migration(self):
        self.client.force_authenticate(user=self.head)
        response = self.client.post(
            f'/api/teams/{self.team.id}/migration-requests/',
            {'join_code': self.target_join_code.code},
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'pending_source')
        self.assertEqual(response.data['target_organization'], self.target_org.id)

    def test_source_org_leader_can_approve_outgoing_migration(self):
        migration_request = TeamMigrationRequest.objects.create(
            team=self.team,
            source_organization=self.source_org,
            target_organization=self.target_org,
            requested_by=self.head,
        )
        self.client.force_authenticate(user=self.source_leader)
        response = self.client.patch(
            f'/api/organizations/{self.source_org.id}/outgoing-team-migration-requests/{migration_request.id}/',
            {'action': 'approve'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        migration_request.refresh_from_db()
        self.assertEqual(migration_request.status, TeamMigrationStatus.PENDING_TARGET)
        self.team.refresh_from_db()
        self.assertEqual(self.team.organization_id, self.source_org.id)

    def test_target_org_leader_cannot_approve_before_source(self):
        migration_request = TeamMigrationRequest.objects.create(
            team=self.team,
            source_organization=self.source_org,
            target_organization=self.target_org,
            requested_by=self.head,
        )
        self.client.force_authenticate(user=self.target_leader)
        response = self.client.patch(
            f'/api/organizations/{self.target_org.id}/team-migration-requests/{migration_request.id}/',
            {'action': 'approve'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_target_org_leader_can_approve_after_source(self):
        migration_request = TeamMigrationRequest.objects.create(
            team=self.team,
            source_organization=self.source_org,
            target_organization=self.target_org,
            requested_by=self.head,
            status=TeamMigrationStatus.PENDING_TARGET,
            source_reviewed_by=self.source_leader,
        )
        self.client.force_authenticate(user=self.target_leader)
        response = self.client.patch(
            f'/api/organizations/{self.target_org.id}/team-migration-requests/{migration_request.id}/',
            {'action': 'approve'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.team.refresh_from_db()
        self.assertEqual(self.team.organization_id, self.target_org.id)
        self.assertTrue(
            OrgMembership.objects.filter(user=self.head, organization=self.target_org).exists(),
        )
        self.assertTrue(
            OrgMembership.objects.filter(user=self.member, organization=self.target_org).exists(),
        )
        self.assertTrue(
            OrgMembership.objects.filter(user=self.head, organization=self.source_org).exists(),
        )

    def test_head_coach_can_cancel_pending_migration(self):
        migration_request = TeamMigrationRequest.objects.create(
            team=self.team,
            source_organization=self.source_org,
            target_organization=self.target_org,
            requested_by=self.head,
            status=TeamMigrationStatus.PENDING_TARGET,
            source_reviewed_by=self.source_leader,
        )
        self.client.force_authenticate(user=self.head)
        response = self.client.patch(
            f'/api/teams/{self.team.id}/migration-requests/{migration_request.id}/',
            {'action': 'cancel'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        migration_request.refresh_from_db()
        self.assertEqual(migration_request.status, 'cancelled')

    def test_rejects_duplicate_team_name_in_target_org(self):
        Team.objects.create(organization=self.target_org, name='Alpha')
        self.client.force_authenticate(user=self.head)
        response = self.client.post(
            f'/api/teams/{self.team.id}/migration-requests/',
            {'join_code': self.target_join_code.code},
            format='json',
        )
        self.assertEqual(response.status_code, 400)


class TeamColorThemeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Theme Org')
        OrgJoinCode.objects.create(organization=self.org)

        self.head = User.objects.create_user(username='head', password='pass12345')
        self.member = User.objects.create_user(username='member', password='pass12345')

        OrgMembership.objects.create(user=self.head, organization=self.org, is_admin=True)
        OrgMembership.objects.create(user=self.member, organization=self.org, is_admin=False)

        self.team = Team.objects.create(organization=self.org, name='Theme Team')
        TeamMembership.objects.create(
            user=self.head,
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

    def test_head_coach_can_update_color_theme(self):
        self.client.force_authenticate(user=self.head)
        response = self.client.patch(
            f'/api/teams/{self.team.id}/',
            {
                'primary_color': '#34d399',
                'secondary_color': '#2dd4bf',
                'tertiary_color': '#60a5fa',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['primary_color'], '#34d399')
        self.assertEqual(response.data['secondary_color'], '#2dd4bf')
        self.assertEqual(response.data['tertiary_color'], '#60a5fa')
        self.team.refresh_from_db()
        self.assertEqual(self.team.primary_color, '#34d399')

    def test_member_cannot_update_color_theme(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.patch(
            f'/api/teams/{self.team.id}/',
            {
                'primary_color': '#a78bfa',
                'secondary_color': '#818cf8',
                'tertiary_color': '#f472b6',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 403)
