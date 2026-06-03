from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import BetaFeedback, PasswordResetRequest, PasswordResetRequestStatus
from accounts.services.password_reset_requests import (
    PasswordResetRequestError,
    create_password_reset_request,
    review_password_reset_request,
)
from games.models import GameSuggestion
from performances.permissions import IsPlatformAdmin
from .serializers import (
    AdminBetaFeedbackSerializer,
    AdminPasswordResetRequestSerializer,
    CreateBetaFeedbackSerializer,
    CreatePasswordResetRequestSerializer,
    RegisterSerializer,
    ReviewPasswordResetRequestSerializer,
    UserSerializer,
)

User = get_user_model()


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'status': 'ok'})


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class UserLookupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        username = request.query_params.get('username', '').strip()
        if not username:
            return Response({'detail': 'username is required.'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(username__iexact=username).first()
        if not user:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'id': user.id, 'username': user.username})


PASSWORD_RESET_ACK = (
    'If an account matches that username, a platform admin will review your request.'
)


class PasswordResetRequestCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CreatePasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        create_password_reset_request(
            username=serializer.validated_data['username'],
            contact_email=serializer.validated_data.get('contact_email', ''),
            message=serializer.validated_data.get('message', ''),
        )
        return Response({'detail': PASSWORD_RESET_ACK}, status=status.HTTP_201_CREATED)


class AdminPasswordResetRequestView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        show_reviewed = request.query_params.get('show_reviewed', '').lower() in ('1', 'true', 'yes')
        queryset = PasswordResetRequest.objects.select_related('user', 'reviewed_by')
        if not show_reviewed:
            queryset = queryset.filter(status=PasswordResetRequestStatus.PENDING)
        return Response(AdminPasswordResetRequestSerializer(queryset, many=True).data)


class AdminPasswordResetRequestDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, request_id):
        serializer = ReviewPasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            reset_request = review_password_reset_request(
                request.user,
                request_id,
                action=serializer.validated_data['action'],
                admin_notes=serializer.validated_data.get('admin_notes', ''),
            )
        except PasswordResetRequestError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)
        return Response(AdminPasswordResetRequestSerializer(reset_request).data)


class BetaFeedbackCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateBetaFeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        feedback = BetaFeedback.objects.create(
            user=request.user,
            message=serializer.validated_data['message'],
            page_url=serializer.validated_data.get('page_url', ''),
        )
        return Response(AdminBetaFeedbackSerializer(feedback).data, status=status.HTTP_201_CREATED)


class AdminBetaFeedbackView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        show_reviewed = request.query_params.get('show_reviewed', '').lower() in ('1', 'true', 'yes')
        queryset = BetaFeedback.objects.select_related('user', 'reviewed_by')
        if not show_reviewed:
            queryset = queryset.filter(reviewed_at__isnull=True)
        return Response(AdminBetaFeedbackSerializer(queryset, many=True).data)


class AdminBetaFeedbackDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, feedback_id):
        feedback = BetaFeedback.objects.filter(pk=feedback_id).select_related('user', 'reviewed_by').first()
        if not feedback:
            return Response({'detail': 'Feedback not found.'}, status=status.HTTP_404_NOT_FOUND)
        if feedback.reviewed_at:
            return Response({'detail': 'Feedback has already been reviewed.'}, status=status.HTTP_400_BAD_REQUEST)
        feedback.reviewed_by = request.user
        feedback.reviewed_at = timezone.now()
        feedback.save(update_fields=['reviewed_by', 'reviewed_at'])
        return Response(AdminBetaFeedbackSerializer(feedback).data)


class AdminPendingCountsView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        beta_feedback = BetaFeedback.objects.filter(reviewed_at__isnull=True).count()
        password_reset_requests = PasswordResetRequest.objects.filter(
            status=PasswordResetRequestStatus.PENDING,
        ).count()
        game_suggestions = GameSuggestion.objects.filter(is_reviewed=False).count()
        return Response({
            'beta_feedback': beta_feedback,
            'password_reset_requests': password_reset_requests,
            'game_suggestions': game_suggestions,
            'total': beta_feedback + password_reset_requests + game_suggestions,
        })
