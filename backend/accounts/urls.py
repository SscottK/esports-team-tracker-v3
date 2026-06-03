from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    AdminPasswordResetRequestDetailView,
    AdminPasswordResetRequestView,
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
    path('users/lookup/', UserLookupView.as_view(), name='user-lookup'),
    path('admin/password-reset-requests/', AdminPasswordResetRequestView.as_view(), name='admin-password-reset-requests'),
    path(
        'admin/password-reset-requests/<int:request_id>/',
        AdminPasswordResetRequestDetailView.as_view(),
        name='admin-password-reset-request-detail',
    ),
]
