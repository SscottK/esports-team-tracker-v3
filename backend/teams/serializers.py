from rest_framework import serializers

from games.models import Game
from games.serializers import GameSerializer
from teams.models import CoachRole, JoinRequestStatus, Team, TeamGame, TeamJoinRequest, TeamMembership, TeamMigrationRequest


class TeamSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = Team
        fields = ['id', 'organization', 'organization_name', 'name', 'color_theme', 'created_at']


class UpdateTeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['color_theme']


class TeamMembershipSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    is_coach = serializers.BooleanField(read_only=True)
    is_head_coach = serializers.BooleanField(read_only=True)

    class Meta:
        model = TeamMembership
        fields = [
            'id',
            'user_id',
            'username',
            'coach_role',
            'is_competing_member',
            'is_coach',
            'is_head_coach',
            'joined_at',
        ]


class UpdateTeamMembershipSerializer(serializers.Serializer):
    coach_role = serializers.ChoiceField(choices=CoachRole.choices, required=False)
    is_competing_member = serializers.BooleanField(required=False)


class LeaveTeamSerializer(serializers.Serializer):
    successor_membership_id = serializers.IntegerField(required=False)
    disband = serializers.BooleanField(default=False)


class AddTeamMemberSerializer(serializers.Serializer):
    username = serializers.CharField()
    coach_role = serializers.ChoiceField(choices=CoachRole.choices, default=CoachRole.NONE)
    is_competing_member = serializers.BooleanField(default=True)

    def validate_coach_role(self, value):
        request = self.context['request']
        team_id = self.context['team_id']
        from performances.permissions import user_is_head_coach
        if value in (CoachRole.HEAD, CoachRole.ASSISTANT) and not user_is_head_coach(request.user, team_id):
            raise serializers.ValidationError('Only head coaches can assign coach roles.')
        return value


class CreateTeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['id', 'name', 'organization', 'color_theme']
        read_only_fields = ['id']
        extra_kwargs = {
            'color_theme': {'required': False},
        }

    def validate(self, attrs):
        user = self.context['request'].user
        from orgs.models import OrgMembership
        membership = OrgMembership.objects.filter(
            user=user,
            organization=attrs['organization'],
        ).first()
        if not membership:
            raise serializers.ValidationError('You must belong to this organization.')
        if not membership.is_admin:
            raise serializers.ValidationError('Only organization leaders can create teams.')
        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        team = Team.objects.create(**validated_data)
        TeamMembership.objects.create(
            user=user,
            team=team,
            coach_role=CoachRole.HEAD,
            is_competing_member=False,
        )
        return team


class TeamGameSerializer(serializers.ModelSerializer):
    game = GameSerializer(read_only=True)
    game_id = serializers.PrimaryKeyRelatedField(
        queryset=Game.objects.filter(is_active=True),
        source='game',
        write_only=True,
    )

    class Meta:
        model = TeamGame
        fields = ['id', 'game', 'game_id', 'added_at']


class OrgTeamSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    is_member = serializers.BooleanField(read_only=True)
    pending_join_request_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = Team
        fields = [
            'id',
            'organization',
            'organization_name',
            'name',
            'created_at',
            'is_member',
            'pending_join_request_id',
        ]


class TeamJoinRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)

    class Meta:
        model = TeamJoinRequest
        fields = [
            'id',
            'user_id',
            'username',
            'team',
            'team_name',
            'status',
            'reviewed_by',
            'created_at',
            'updated_at',
        ]


class ReviewTeamJoinRequestSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=('approve', 'reject', 'cancel'))
    coach_role = serializers.ChoiceField(choices=CoachRole.choices, required=False)
    is_competing_member = serializers.BooleanField(default=True)


class RequestTeamMigrationSerializer(serializers.Serializer):
    join_code = serializers.CharField(max_length=20)


class TeamMigrationRequestSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)
    source_organization_name = serializers.CharField(source='source_organization.name', read_only=True)
    target_organization_name = serializers.CharField(source='target_organization.name', read_only=True)
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True)
    source_reviewed_by_username = serializers.CharField(
        source='source_reviewed_by.username',
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = TeamMigrationRequest
        fields = [
            'id',
            'team',
            'team_name',
            'source_organization',
            'source_organization_name',
            'target_organization',
            'target_organization_name',
            'requested_by',
            'requested_by_username',
            'status',
            'source_reviewed_by',
            'source_reviewed_by_username',
            'reviewed_by',
            'created_at',
            'updated_at',
        ]


class ReviewTeamMigrationSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=('approve', 'reject', 'cancel'))
