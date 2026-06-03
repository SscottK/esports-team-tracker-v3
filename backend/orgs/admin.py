from django.contrib import admin

from orgs.models import OrgJoinCode, OrgJoinRequest, OrgMembership, Organization


class OrgMembershipInline(admin.TabularInline):
    model = OrgMembership
    extra = 0


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    inlines = [OrgMembershipInline]


@admin.register(OrgJoinCode)
class OrgJoinCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'organization', 'created_at')


@admin.register(OrgJoinRequest)
class OrgJoinRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'organization', 'status', 'created_at', 'reviewed_by')
    list_filter = ('status',)
