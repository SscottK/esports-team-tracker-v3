from django.conf import settings
from django.db import models


class PasswordResetRequestStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    COMPLETED = 'completed', 'Completed'
    REJECTED = 'rejected', 'Rejected'


class PasswordResetRequest(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='password_reset_requests',
    )
    username = models.CharField(max_length=150)
    contact_email = models.EmailField(blank=True)
    message = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=PasswordResetRequestStatus.choices,
        default=PasswordResetRequestStatus.PENDING,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_password_reset_requests',
    )
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.username} password reset ({self.status})'


class BetaFeedback(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='beta_feedback',
    )
    message = models.TextField()
    page_url = models.CharField(max_length=500, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_beta_feedback',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def is_reviewed(self):
        return self.reviewed_at is not None

    def __str__(self):
        return f'Beta feedback from {self.user.username}'
