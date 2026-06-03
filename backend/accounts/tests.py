from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import PasswordResetRequest, PasswordResetRequestStatus, BetaFeedback

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


class BetaFeedbackTests(TestCase):
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

    def test_authenticated_user_can_submit_feedback(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            '/api/feedback/',
            {'message': 'Love the times grid.', 'page_url': '/teams/1/games/2'},
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(BetaFeedback.objects.count(), 1)
        self.assertEqual(response.data['username'], 'player')

    def test_anonymous_user_cannot_submit_feedback(self):
        response = self.client.post(
            '/api/feedback/',
            {'message': 'Hello'},
            format='json',
        )
        self.assertEqual(response.status_code, 401)

    def test_staff_can_list_feedback(self):
        BetaFeedback.objects.create(
            user=self.user,
            message='Needs dark mode tweaks.',
            page_url='/dashboard',
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/beta-feedback/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['message'], 'Needs dark mode tweaks.')
        self.assertFalse(response.data[0]['is_reviewed'])

    def test_staff_can_mark_feedback_reviewed(self):
        feedback = BetaFeedback.objects.create(
            user=self.user,
            message='Grid is confusing.',
            page_url='Times grid',
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/admin/beta-feedback/{feedback.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_reviewed'])
        feedback.refresh_from_db()
        self.assertEqual(feedback.reviewed_by_id, self.admin.id)

    def test_reviewed_feedback_hidden_from_default_list(self):
        feedback = BetaFeedback.objects.create(
            user=self.user,
            message='Done.',
            page_url='/dashboard',
        )
        feedback.reviewed_by = self.admin
        feedback.reviewed_at = timezone.now()
        feedback.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/beta-feedback/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)
        response = self.client.get('/api/admin/beta-feedback/?show_reviewed=true')
        self.assertEqual(len(response.data), 1)

    def test_staff_pending_counts_include_unreviewed_feedback(self):
        BetaFeedback.objects.create(user=self.user, message='Help', page_url='/dashboard')
        PasswordResetRequest.objects.create(user=self.user, username=self.user.username)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/pending-counts/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['beta_feedback'], 1)
        self.assertEqual(response.data['password_reset_requests'], 1)
        self.assertGreaterEqual(response.data['total'], 2)

    def test_non_staff_cannot_list_feedback(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/admin/beta-feedback/')
        self.assertEqual(response.status_code, 403)
