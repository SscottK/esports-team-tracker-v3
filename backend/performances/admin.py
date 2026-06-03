from django.contrib import admin

from performances.models import MemberResult, MemberResultHistory, TeamBenchmark


@admin.register(MemberResult)
class MemberResultAdmin(admin.ModelAdmin):
    list_display = ('user', 'team', 'level', 'value', 'submitted_at')
    list_filter = ('team', 'level__game')


@admin.register(MemberResultHistory)
class MemberResultHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'team', 'level', 'value', 'entered_by', 'created_at')
    list_filter = ('team', 'level__game')


@admin.register(TeamBenchmark)
class TeamBenchmarkAdmin(admin.ModelAdmin):
    list_display = ('team', 'level', 'target_fast', 'target_slow', 'elite')
    list_filter = ('team', 'level__game')
