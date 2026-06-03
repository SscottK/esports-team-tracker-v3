from django.contrib.auth import get_user_model

from accounts.models import PasswordResetRequest, PasswordResetRequestStatus

User = get_user_model()


class PasswordResetRequestError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def create_password_reset_request(*, username, contact_email='', message=''):
    user = User.objects.filter(username__iexact=username.strip()).first()
    if not user:
        return None
    if PasswordResetRequest.objects.filter(
        user=user,
        status=PasswordResetRequestStatus.PENDING,
    ).exists():
        return None
    return PasswordResetRequest.objects.create(
        user=user,
        username=user.username,
        contact_email=(contact_email or '').strip(),
        message=(message or '').strip(),
    )


def review_password_reset_request(reviewer, request_id, *, action, admin_notes=''):
    if action not in ('complete', 'reject'):
        raise PasswordResetRequestError('action must be complete or reject.')
    if not reviewer.is_staff:
        raise PasswordResetRequestError('Only platform admins can review password reset requests.', status_code=403)

    reset_request = PasswordResetRequest.objects.filter(pk=request_id).select_related('user').first()
    if not reset_request:
        raise PasswordResetRequestError('Password reset request not found.', status_code=404)
    if reset_request.status != PasswordResetRequestStatus.PENDING:
        raise PasswordResetRequestError('This request has already been reviewed.')

    reset_request.status = (
        PasswordResetRequestStatus.COMPLETED
        if action == 'complete'
        else PasswordResetRequestStatus.REJECTED
    )
    reset_request.reviewed_by = reviewer
    reset_request.admin_notes = (admin_notes or '').strip()
    reset_request.save(update_fields=['status', 'reviewed_by', 'admin_notes', 'updated_at'])
    return reset_request
