from rest_framework import serializers

from games.serializers import TimeValueField
from performances.models import MemberResult, MemberResultHistory, TeamBenchmark
from performances.services.submissions import record_member_time
from performances.services.time_utils import format_ms_to_time


class MemberResultSerializer(serializers.ModelSerializer):
    display_value = serializers.SerializerMethodField()
    level_name = serializers.CharField(source='level.name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    time_input = TimeValueField(source='value', write_only=True)
    value = TimeValueField(read_only=True)

    class Meta:
        model = MemberResult
        fields = [
            'id',
            'user',
            'username',
            'team',
            'level',
            'level_name',
            'value',
            'time_input',
            'display_value',
            'submitted_at',
        ]
        read_only_fields = ['user', 'submitted_at']

    def get_display_value(self, obj):
        return format_ms_to_time(obj.value)

    def validate(self, attrs):
        team = attrs.get('team') or self.instance.team
        level = attrs.get('level') or self.instance.level
        if level.game.metric_type != 'time':
            raise serializers.ValidationError('Only time-based results are supported in this phase.')
        from teams.models import TeamGame
        if not TeamGame.objects.filter(team=team, game=level.game).exists():
            raise serializers.ValidationError('This game is not assigned to the team.')
        return attrs

    def create(self, validated_data):
        user = validated_data.pop('user', self.context['request'].user)
        entered_by = validated_data.pop('entered_by', self.context['request'].user)
        team = validated_data['team']
        level = validated_data['level']
        value = validated_data['value']
        return record_member_time(
            user=user,
            team=team,
            level=level,
            value_ms=value,
            entered_by=entered_by,
        )


class MemberResultHistorySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    level_name = serializers.CharField(source='level.name', read_only=True)
    level_group_name = serializers.CharField(source='level.level_group.name', read_only=True, allow_null=True)
    entered_by_username = serializers.CharField(source='entered_by.username', read_only=True)
    display_value = serializers.SerializerMethodField()

    class Meta:
        model = MemberResultHistory
        fields = [
            'id',
            'user_id',
            'username',
            'team',
            'level',
            'level_name',
            'level_group_name',
            'display_value',
            'entered_by',
            'entered_by_username',
            'created_at',
        ]

    def get_display_value(self, obj):
        return format_ms_to_time(obj.value)


class TeamBenchmarkSerializer(serializers.ModelSerializer):
    target_fast = TimeValueField(required=False, allow_null=True)
    target_slow = TimeValueField(required=False, allow_null=True)
    elite = TimeValueField(required=False, allow_null=True)
    level_name = serializers.CharField(source='level.name', read_only=True)

    class Meta:
        model = TeamBenchmark
        fields = [
            'id',
            'team',
            'level',
            'level_name',
            'target_fast',
            'target_slow',
            'elite',
            'updated_at',
        ]


class GridMemberSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()


class GridCellSerializer(serializers.Serializer):
    value_ms = serializers.IntegerField(allow_null=True)
    display = serializers.CharField(allow_null=True)
    status = serializers.CharField(allow_null=True)


class GridLevelSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    level_group = serializers.CharField(allow_null=True)
    benchmark = serializers.DictField()
    results = serializers.DictField(child=GridCellSerializer())

class TeamGridSerializer(serializers.Serializer):
    game = serializers.DictField()
    members = GridMemberSerializer(many=True)
    levels = GridLevelSerializer(many=True)
