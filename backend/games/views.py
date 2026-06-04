from django.utils.text import slugify
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from games.models import Game, GameCategory, Level, LevelGroup, GameSuggestion, MetricType
from games.serializers import (
    AdminGameSuggestionSerializer,
    GameSerializer,
    GameSuggestionSerializer,
    LevelGroupSerializer,
    LevelSerializer,
)
from performances.permissions import IsPlatformAdmin


class AdminGameViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all()
    serializer_class = GameSerializer
    permission_classes = [IsAuthenticated, IsPlatformAdmin]


class AdminLevelGroupViewSet(viewsets.ModelViewSet):
    serializer_class = LevelGroupSerializer
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get_queryset(self):
        queryset = LevelGroup.objects.select_related('game')
        game_id = self.request.query_params.get('game')
        if game_id:
            queryset = queryset.filter(game_id=game_id)
        return queryset


class AdminLevelViewSet(viewsets.ModelViewSet):
    serializer_class = LevelSerializer
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get_queryset(self):
        queryset = Level.objects.select_related('game', 'level_group')
        game_id = self.request.query_params.get('game')
        if game_id:
            queryset = queryset.filter(game_id=game_id)
        return queryset


class GameCatalogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Game.objects.filter(is_active=True)
    serializer_class = GameSerializer
    permission_classes = [IsAuthenticated]


class LevelCatalogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LevelSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Level.objects.filter(is_active=True).select_related('game', 'level_group')
        game_id = self.request.query_params.get('game')
        if game_id:
            queryset = queryset.filter(game_id=game_id)
        return queryset


class GameSuggestionViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = GameSuggestion.objects.all()
    serializer_class = GameSuggestionSerializer
    permission_classes = [IsAuthenticated]


def _unique_game_slug(base_name):
    base_slug = slugify(base_name) or 'game'
    slug = base_slug[:100]
    counter = 2
    while Game.objects.filter(slug=slug).exists():
        suffix = f'-{counter}'
        slug = f'{base_slug[:100 - len(suffix)]}{suffix}'
        counter += 1
    return slug


class AdminGameSuggestionViewSet(
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = AdminGameSuggestionSerializer
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get_queryset(self):
        queryset = GameSuggestion.objects.select_related('suggested_by').order_by('-created_at')
        show_reviewed = self.request.query_params.get('show_reviewed', '').lower() in ('1', 'true', 'yes')
        if show_reviewed:
            queryset = queryset.filter(is_reviewed=True)
        else:
            queryset = queryset.filter(is_reviewed=False)
        return queryset

    @action(detail=True, methods=['post'])
    def promote(self, request, pk=None):
        suggestion = self.get_object()
        game_name = suggestion.game_name.strip()
        if Game.objects.filter(name__iexact=game_name).exists():
            return Response(
                {'detail': f'A game named "{game_name}" is already in the catalog.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        game = Game.objects.create(
            name=game_name,
            slug=_unique_game_slug(game_name),
            metric_type=MetricType.TIME,
            category=GameCategory.GENERAL,
            is_active=True,
        )
        suggestion.is_reviewed = True
        suggestion.save(update_fields=['is_reviewed'])
        return Response(GameSerializer(game).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        suggestion = self.get_object()
        suggestion.is_reviewed = True
        suggestion.save(update_fields=['is_reviewed'])
        return Response(AdminGameSuggestionSerializer(suggestion).data)
