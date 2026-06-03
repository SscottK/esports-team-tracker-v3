from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer, UserSerializer

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
