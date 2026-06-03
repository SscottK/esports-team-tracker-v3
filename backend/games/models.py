from django.db import models


class MetricType(models.TextChoices):
    TIME = 'time', 'Time'
    SCORE = 'score', 'Score'
    COUNT = 'count', 'Count'
    PERCENTAGE = 'percentage', 'Percentage'


class GameCategory(models.TextChoices):
    RACING = 'racing', 'Racing'
    FPS = 'fps', 'FPS'
    MOBA = 'moba', 'MOBA'
    FIGHTING = 'fighting', 'Fighting'
    GENERAL = 'general', 'General'


CATEGORY_LABEL_DEFAULTS = {
    GameCategory.RACING: {
        'activity_singular': 'Track',
        'activity_plural': 'Tracks',
        'level_group_label': 'Cup',
    },
    GameCategory.FPS: {
        'activity_singular': 'Map',
        'activity_plural': 'Maps',
        'level_group_label': 'Pool',
    },
    GameCategory.MOBA: {
        'activity_singular': 'Match',
        'activity_plural': 'Matches',
        'level_group_label': 'Group',
    },
    GameCategory.FIGHTING: {
        'activity_singular': 'Set',
        'activity_plural': 'Sets',
        'level_group_label': 'Group',
    },
    GameCategory.GENERAL: {
        'activity_singular': 'Activity',
        'activity_plural': 'Activities',
        'level_group_label': 'Group',
    },
}


class Game(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    metric_type = models.CharField(
        max_length=20,
        choices=MetricType.choices,
        default=MetricType.TIME,
    )
    category = models.CharField(
        max_length=20,
        choices=GameCategory.choices,
        default=GameCategory.GENERAL,
    )
    activity_label_singular = models.CharField(max_length=50, blank=True)
    activity_label_plural = models.CharField(max_length=50, blank=True)
    level_group_label = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def labels(self):
        defaults = CATEGORY_LABEL_DEFAULTS.get(self.category, CATEGORY_LABEL_DEFAULTS[GameCategory.GENERAL])
        return {
            'activity_singular': self.activity_label_singular or defaults['activity_singular'],
            'activity_plural': self.activity_label_plural or defaults['activity_plural'],
            'level_group_label': self.level_group_label or defaults['level_group_label'],
        }


class LevelGroup(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='level_groups')
    name = models.CharField(max_length=100)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'name']
        unique_together = ('game', 'name')

    def __str__(self):
        return f'{self.game.name} — {self.name}'


class Level(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='levels')
    level_group = models.ForeignKey(
        LevelGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='levels',
    )
    name = models.CharField(max_length=100)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_dlc = models.BooleanField(
        default=False,
        help_text='When true, track is hidden from the grid unless DLC is toggled on.',
    )

    class Meta:
        ordering = ['sort_order', 'name']
        unique_together = ('game', 'name')

    def __str__(self):
        return self.name


class GameSuggestion(models.Model):
    suggested_by = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='game_suggestions',
    )
    game_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    is_reviewed = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.game_name
