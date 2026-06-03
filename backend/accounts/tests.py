from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import PasswordResetRequest, PasswordResetRequestStatus

User = get_user_model()


class PasswordResetRequestTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='player',
            email='player@example.com',
            password='pass12345',
        )
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='pass12345',
            is_staff=True,
        )

    def test_anyone_can_submit_request_for_existing_user(self):
        response = self.client.post(
            '/api/auth/password-reset-requests/',
            {
                'username': 'player',
                'contact_email': 'player@example.com',
                'message': 'Lost access to my account.',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(PasswordResetRequest.objects.filter(user=self.user).count(), 1)

    def test_unknown_username_returns_same_success_message(self):
        response = self.client.post(
            '/api/auth/password-reset-requests/',
            {'username': 'missing'},
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(PasswordResetRequest.objects.count(), 0)

    def test_duplicate_pending_request_is_silent(self):
        PasswordResetRequest.objects.create(user=self.user, username=self.user.username)
        response = self.client.post(
            '/api/auth/password-reset-requests/',
            {'username': 'player'},
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            PasswordResetRequest.objects.filter(
                user=self.user,
                status=PasswordResetRequestStatus.PENDING,
            ).count(),
            1,
        )

    def test_staff_can_list_pending_requests(self):
        PasswordResetRequest.objects.create(user=self.user, username=self.user.username)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/password-reset-requests/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertIn('django_admin_user_url', response.data[0])

    def test_non_staff_cannot_list_requests(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/admin/password-reset-requests/')
        self.assertEqual(response.status_code, 403)

    def test_staff_can_mark_request_complete(self):
        reset_request = PasswordResetRequest.objects.create(user=self.user, username=self.user.username)
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/admin/password-reset-requests/{reset_request.id}/',
            {'action': 'complete', 'admin_notes': 'Password changed in Django admin.'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        reset_request.refresh_from_db()
        self.assertEqual(reset_request.status, PasswordResetRequestStatus.COMPLETED)
        self.assertEqual(reset_request.reviewed_by_id, self.admin.id)
