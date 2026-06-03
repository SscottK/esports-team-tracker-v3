from django.conf import settings
from django.db import models

from games.models import Game
from orgs.models import Organization


class CoachRole(models.TextChoices):
    NONE = 'none', 'Not a coach'
    ASSISTANT = 'assistant', 'Assistant Coach'
    HEAD = 'head', 'Head Coach'


class Team(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='teams',
    )
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        unique_together = ('organization', 'name')

    def __str__(self):
        return self.name


class TeamMembership(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='team_memberships',
    )
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='memberships')
    coach_role = models.CharField(
        max_length=20,
        choices=CoachRole.choices,
        default=CoachRole.NONE,
    )
    is_competing_member = models.BooleanField(
        default=True,
        help_text='Whether this user appears in the times grid as a competing team member.',
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'team')

    def __str__(self):
        label = self.coach_role if self.is_coach else 'competing member'
        return f'{self.user.username} ({label}) @ {self.team.name}'

    @property
    def is_coach(self):
        return self.coach_role in (CoachRole.HEAD, CoachRole.ASSISTANT)

    @property
    def is_head_coach(self):
        return self.coach_role == CoachRole.HEAD

    @property
    def shows_in_times_grid(self):
        if not self.is_competing_member:
            return False
        if not self.is_coach:
            return True
        return False


class TeamGame(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='team_games')
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='team_games')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('team', 'game')

    def __str__(self):
        return f'{self.team.name} — {self.game.name}'


class JoinRequestStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    CANCELLED = 'cancelled', 'Cancelled'


class TeamMigrationStatus(models.TextChoices):
    PENDING_SOURCE = 'pending_source', 'Pending source org approval'
    PENDING_TARGET = 'pending_target', 'Pending target org approval'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    CANCELLED = 'cancelled', 'Cancelled'


class TeamJoinRequest(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='team_join_requests',
    )
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='join_requests')
    status = models.CharField(
        max_length=20,
        choices=JoinRequestStatus.choices,
        default=JoinRequestStatus.PENDING,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_team_join_requests',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} → {self.team.name} ({self.status})'


class TeamMigrationRequest(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='migration_requests')
    source_organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='outgoing_team_migration_requests',
    )
    target_organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='incoming_team_migration_requests',
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='team_migration_requests',
    )
    status = models.CharField(
        max_length=20,
        choices=TeamMigrationStatus.choices,
        default=TeamMigrationStatus.PENDING_SOURCE,
    )
    source_reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_reviewed_team_migration_requests',
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_team_migration_requests',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.team.name} → {self.target_organization.name} ({self.status})'
