from django.contrib import admin
from django.utils.html import format_html

from accounts.models import BetaFeedback, PasswordResetRequest, PasswordResetRequestStatus


@admin.register(BetaFeedback)
class BetaFeedbackAdmin(admin.ModelAdmin):
    list_display = ('user', 'page_url', 'is_reviewed_display', 'created_at', 'reviewed_by')
    list_filter = ('reviewed_at',)
    search_fields = ('user__username', 'message', 'page_url')
    readonly_fields = ('user', 'message', 'page_url', 'created_at', 'reviewed_at', 'reviewed_by')

    @admin.display(boolean=True, description='Reviewed')
    def is_reviewed_display(self, obj):
        return obj.reviewed_at is not None


@admin.register(PasswordResetRequest)
class PasswordResetRequestAdmin(admin.ModelAdmin):
    list_display = (
        'username',
        'user',
        'status',
        'contact_email',
        'created_at',
        'reviewed_by',
    )
    list_filter = ('status',)
    search_fields = ('username', 'user__username', 'contact_email', 'message')
    readonly_fields = (
        'user',
        'username',
        'contact_email',
        'message',
        'created_at',
        'updated_at',
        'django_admin_user_link',
    )
    fields = (
        'status',
        'user',
        'username',
        'contact_email',
        'message',
        'django_admin_user_link',
        'reviewed_by',
        'admin_notes',
        'created_at',
        'updated_at',
    )

    @admin.display(description='Change password in Django admin')
    def django_admin_user_link(self, obj):
        if not obj.user_id:
            return '—'
        return format_html(
            '<a href="/admin/auth/user/{}/change/" target="_blank" rel="noopener">Open user in Django admin</a>',
            obj.user_id,
        )

    def save_model(self, request, obj, form, change):
        if change and 'status' in form.changed_data and obj.status != PasswordResetRequestStatus.PENDING:
            if not obj.reviewed_by_id:
                obj.reviewed_by = request.user
        super().save_model(request, obj, form, change)
