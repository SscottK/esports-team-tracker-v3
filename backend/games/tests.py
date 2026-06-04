from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from io import StringIO
from rest_framework.test import APIClient

from games.models import Game, GameSuggestion

User = get_user_model()


class GameSuggestionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='coach', password='pass12345')
        self.admin = User.objects.create_user(username='admin', password='pass12345', is_staff=True)

    def test_user_can_suggest_game(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/game-suggestions/', {'game_name': 'Splatoon 3'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(GameSuggestion.objects.filter(game_name='Splatoon 3').exists())

    def test_admin_can_promote_suggestion(self):
        suggestion = GameSuggestion.objects.create(
            suggested_by=self.user,
            game_name='Rocket League',
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/admin/game-suggestions/{suggestion.id}/promote/')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Game.objects.filter(name='Rocket League').exists())
        suggestion.refresh_from_db()
        self.assertTrue(suggestion.is_reviewed)

    def test_non_admin_cannot_list_suggestions(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/admin/game-suggestions/')
        self.assertEqual(response.status_code, 403)

    def test_admin_list_pending_and_reviewed_suggestions(self):
        GameSuggestion.objects.create(suggested_by=self.user, game_name='Pending Game')
        GameSuggestion.objects.create(
            suggested_by=self.user,
            game_name='Reviewed Game',
            is_reviewed=True,
        )
        self.client.force_authenticate(user=self.admin)

        pending_response = self.client.get('/api/admin/game-suggestions/')
        self.assertEqual(pending_response.status_code, 200)
        self.assertEqual(len(pending_response.data), 1)
        self.assertEqual(pending_response.data[0]['game_name'], 'Pending Game')

        reviewed_response = self.client.get('/api/admin/game-suggestions/', {'show_reviewed': 'true'})
        self.assertEqual(reviewed_response.status_code, 200)
        self.assertEqual(len(reviewed_response.data), 1)
        self.assertEqual(reviewed_response.data[0]['game_name'], 'Reviewed Game')


class SeedMarioKartDlcTests(TestCase):
    def test_seed_mario_kart_includes_dlc_on_same_game(self):
        out = StringIO()
        call_command('seed_mario_kart', stdout=out)
        game = Game.objects.get(slug='mario-kart-8-deluxe-original')
        self.assertEqual(game.name, 'Mario Kart 8 Deluxe')
        self.assertEqual(game.levels.filter(is_dlc=False).count(), 48)
        self.assertEqual(game.levels.filter(is_dlc=True).count(), 48)
        self.assertFalse(
            Game.objects.filter(slug='mario-kart-8-deluxe-booster-course-pass', is_active=True).exists(),
        )
