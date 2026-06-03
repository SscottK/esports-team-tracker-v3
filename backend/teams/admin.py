from django.contrib import admin

from teams.models import Team, TeamGame, TeamJoinRequest, TeamMembership, TeamMigrationRequest


class TeamMembershipInline(admin.TabularInline):
    model = TeamMembership
    extra = 0


class TeamGameInline(admin.TabularInline):
    model = TeamGame
    extra = 0


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'created_at')
    list_filter = ('organization',)
    inlines = [TeamMembershipInline, TeamGameInline]


@admin.register(TeamJoinRequest)
class TeamJoinRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'team', 'status', 'created_at', 'reviewed_by')
    list_filter = ('status', 'team__organization')


@admin.register(TeamMigrationRequest)
class TeamMigrationRequestAdmin(admin.ModelAdmin):
    list_display = (
        'team',
        'source_organization',
        'target_organization',
        'status',
        'requested_by',
        'source_reviewed_by',
        'created_at',
    )
    list_filter = ('status',)
