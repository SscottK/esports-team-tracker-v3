from django.contrib import admin

from games.models import Game, GameSuggestion, Level, LevelGroup


class LevelInline(admin.TabularInline):
    model = Level
    extra = 0


class LevelGroupInline(admin.TabularInline):
    model = LevelGroup
    extra = 0


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'metric_type', 'category', 'is_active')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [LevelGroupInline, LevelInline]


@admin.register(LevelGroup)
class LevelGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'game', 'sort_order')
    list_filter = ('game',)


@admin.register(Level)
class LevelAdmin(admin.ModelAdmin):
    list_display = ('name', 'game', 'level_group', 'sort_order', 'is_active')
    list_filter = ('game', 'level_group', 'is_active')


@admin.register(GameSuggestion)
class GameSuggestionAdmin(admin.ModelAdmin):
    list_display = ('game_name', 'suggested_by', 'created_at', 'is_reviewed')
    list_filter = ('is_reviewed',)
