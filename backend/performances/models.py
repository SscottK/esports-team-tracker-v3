from django.conf import settings
from django.db import models

from games.models import Game
from teams.models import Team


class MemberResult(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='member_results',
    )
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='member_results')
    level = models.ForeignKey(
        'games.Level',
        on_delete=models.CASCADE,
        related_name='member_results',
    )
    value = models.BigIntegerField(
        help_text='Time stored as milliseconds; other metric types use raw integer units.',
    )
    submitted_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'team', 'level')
        ordering = ['-submitted_at']

    def __str__(self):
        return f'{self.user.username} — {self.level.name}'

    @property
    def game(self):
        return self.level.game


class MemberResultHistory(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='member_result_history',
    )
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='member_result_history')
    level = models.ForeignKey(
        'games.Level',
        on_delete=models.CASCADE,
        related_name='member_result_history',
    )
    value = models.BigIntegerField(
        help_text='Time stored as milliseconds; other metric types use raw integer units.',
    )
    entered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='entered_member_result_history',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} — {self.level.name} @ {self.created_at}'


class TeamBenchmark(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='benchmarks')
    level = models.ForeignKey(
        'games.Level',
        on_delete=models.CASCADE,
        related_name='team_benchmarks',
    )
    target_fast = models.BigIntegerField(
        null=True,
        blank=True,
        help_text='Par 1 / fast target (milliseconds for time games).',
    )
    target_slow = models.BigIntegerField(
        null=True,
        blank=True,
        help_text='Par 2 / slow target (milliseconds for time games).',
    )
    elite = models.BigIntegerField(
        null=True,
        blank=True,
        help_text='World record / elite benchmark (milliseconds for time games).',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('team', 'level')

    def __str__(self):
        return f'Benchmarks for {self.team.name} — {self.level.name}'
