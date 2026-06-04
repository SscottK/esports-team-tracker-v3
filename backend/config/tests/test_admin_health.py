from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class AdminHealthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            username='staffadmin',
            password='pass12345',
            is_staff=True,
        )
        self.member = User.objects.create_user(username='member', password='pass12345')

    def test_health_migrations_probe_is_public(self):
        response = self.client.get('/api/health/?migrations=1')
        self.assertEqual(response.status_code, 200)
        self.assertIn('unapplied_migrations', response.data)

    def test_admin_health_requires_staff(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.get('/api/health/admin/')
        self.assertEqual(response.status_code, 403)

    def test_admin_health_reports_changelists_for_staff(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get('/api/health/admin/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['changelists']['errors'], [])
        self.assertGreater(len(response.data['changelists']['ok']), 0)
