from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    AdminBetaFeedbackDetailView,
    AdminBetaFeedbackView,
    AdminPasswordResetRequestDetailView,
    AdminPasswordResetRequestView,
    AdminPendingCountsView,
    BetaFeedbackCreateView,
    HealthView,
    MeView,
    PasswordResetRequestCreateView,
    RegisterView,
    UserLookupView,
)

urlpatterns = [
    path('health/', HealthView.as_view(), name='health'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('auth/password-reset-requests/', PasswordResetRequestCreateView.as_view(), name='password-reset-requests'),
    path('feedback/', BetaFeedbackCreateView.as_view(), name='beta-feedback'),
    path('users/lookup/', UserLookupView.as_view(), name='user-lookup'),
    path('admin/beta-feedback/', AdminBetaFeedbackView.as_view(), name='admin-beta-feedback'),
    path(
        'admin/beta-feedback/<int:feedback_id>/',
        AdminBetaFeedbackDetailView.as_view(),
        name='admin-beta-feedback-detail',
    ),
    path('admin/pending-counts/', AdminPendingCountsView.as_view(), name='admin-pending-counts'),
    path('admin/password-reset-requests/', AdminPasswordResetRequestView.as_view(), name='admin-password-reset-requests'),
    path(
        'admin/password-reset-requests/<int:request_id>/',
        AdminPasswordResetRequestDetailView.as_view(),
        name='admin-password-reset-request-detail',
    ),
]
