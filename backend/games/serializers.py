from rest_framework import serializers

from games.models import Game, Level, LevelGroup, GameSuggestion


class GameLabelsSerializer(serializers.Serializer):
    activity_singular = serializers.CharField()
    activity_plural = serializers.CharField()
    level_group_label = serializers.CharField()


class GameSerializer(serializers.ModelSerializer):
    labels = serializers.SerializerMethodField()

    class Meta:
        model = Game
        fields = [
            'id',
            'name',
            'slug',
            'metric_type',
            'category',
            'labels',
            'is_active',
        ]

    def get_labels(self, obj):
        return obj.labels


class LevelGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = LevelGroup
        fields = ['id', 'game', 'name', 'sort_order']


class LevelSerializer(serializers.ModelSerializer):
    level_group_name = serializers.CharField(source='level_group.name', read_only=True)

    class Meta:
        model = Level
        fields = [
            'id',
            'game',
            'level_group',
            'level_group_name',
            'name',
            'sort_order',
            'is_active',
        ]


class GameSuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameSuggestion
        fields = ['id', 'game_name', 'created_at', 'is_reviewed']
        read_only_fields = ['created_at', 'is_reviewed']

    def validate_game_name(self, value):
        game_name = value.strip()
        if not game_name:
            raise serializers.ValidationError('Game name is required.')
        return game_name

    def create(self, validated_data):
        validated_data['suggested_by'] = self.context['request'].user
        return super().create(validated_data)


class AdminGameSuggestionSerializer(serializers.ModelSerializer):
    suggested_by_username = serializers.CharField(source='suggested_by.username', read_only=True)

    class Meta:
        model = GameSuggestion
        fields = [
            'id',
            'game_name',
            'suggested_by',
            'suggested_by_username',
            'created_at',
            'is_reviewed',
        ]


class TimeValueField(serializers.Field):
    def to_representation(self, value):
        if value is None:
            return None
        from performances.services.time_utils import format_ms_to_time
        return format_ms_to_time(value)

    def to_internal_value(self, data):
        if data in (None, ''):
            return None
        if isinstance(data, int):
            return data
        from performances.services.time_utils import parse_time_to_ms
        try:
            return parse_time_to_ms(str(data))
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
