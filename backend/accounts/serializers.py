from django.contrib.auth.models import User
from rest_framework import serializers

from accounts.models import PasswordResetRequest


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff']
        read_only_fields = ['id', 'username', 'is_staff']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )


class CreatePasswordResetRequestSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    contact_email = serializers.EmailField(required=False, allow_blank=True)
    message = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class ReviewPasswordResetRequestSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=('complete', 'reject'))
    admin_notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class AdminPasswordResetRequestSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    account_email = serializers.EmailField(source='user.email', read_only=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True, allow_null=True)
    django_admin_user_url = serializers.SerializerMethodField()

    class Meta:
        model = PasswordResetRequest
        fields = [
            'id',
            'user_id',
            'username',
            'account_email',
            'contact_email',
            'message',
            'status',
            'reviewed_by',
            'reviewed_by_username',
            'admin_notes',
            'django_admin_user_url',
            'created_at',
            'updated_at',
        ]

    def get_django_admin_user_url(self, obj):
        return f'/admin/auth/user/{obj.user_id}/change/'
