from django.urls import include, path
from rest_framework.routers import DefaultRouter

from config.inbox_views import RequestInboxView
from games.views import (
    AdminGameViewSet,
    AdminGameSuggestionViewSet,
    AdminLevelGroupViewSet,
    AdminLevelViewSet,
    GameCatalogViewSet,
    GameSuggestionViewSet,
    LevelCatalogViewSet,
)
from orgs.views import (
    JoinOrganizationView,
    MyOrgJoinRequestsView,
    OrgJoinRequestDetailView,
    OrgJoinRequestView,
    OrgLeaveView,
    OrgMembersView,
    OrgMembershipDetailView,
    OrganizationActionView,
    OrganizationViewSet,
)
from performances.views import (
    MemberResultViewSet,
    TeamBenchmarkView,
    TeamCompareView,
    TeamGridView,
    TeamLeaderboardView,
    TeamTimeHistoryView,
    TeamTimesCsvUploadView,
)
from teams.views import (
    OrgOutgoingTeamMigrationRequestDetailView,
    OrgOutgoingTeamMigrationRequestView,
    OrgTeamMigrationRequestDetailView,
    OrgTeamMigrationRequestView,
    OrgTeamsView,
    TeamGameView,
    TeamJoinRequestDetailView,
    TeamJoinRequestView,
    TeamLeaveView,
    TeamMembershipDetailView,
    TeamMembershipView,
    TeamMigrationRequestDetailView,
    TeamMigrationRequestView,
    TeamViewSet,
)

router = DefaultRouter()
router.register(r'catalog/games', GameCatalogViewSet, basename='catalog-games')
router.register(r'catalog/levels', LevelCatalogViewSet, basename='catalog-levels')
router.register(r'admin/games', AdminGameViewSet, basename='admin-games')
router.register(r'admin/game-suggestions', AdminGameSuggestionViewSet, basename='admin-game-suggestions')
router.register(r'admin/level-groups', AdminLevelGroupViewSet, basename='admin-level-groups')
router.register(r'admin/levels', AdminLevelViewSet, basename='admin-levels')
router.register(r'organizations', OrganizationViewSet, basename='organizations')
router.register(r'teams', TeamViewSet, basename='teams')
router.register(r'results', MemberResultViewSet, basename='results')
router.register(r'game-suggestions', GameSuggestionViewSet, basename='game-suggestions')

urlpatterns = [
    path('requests/inbox/', RequestInboxView.as_view(), name='request-inbox'),
    path('organizations/me/', OrganizationActionView.as_view(), name='organization-me'),
    path('organizations/me/join-requests/', MyOrgJoinRequestsView.as_view(), name='organization-my-join-requests'),
    path('organizations/join/', JoinOrganizationView.as_view(), name='organization-join'),
    path('organizations/<int:org_id>/leave/', OrgLeaveView.as_view(), name='organization-leave'),
    path('organizations/<int:org_id>/join-requests/', OrgJoinRequestView.as_view(), name='organization-join-requests'),
    path(
        'organizations/<int:org_id>/join-requests/<int:request_id>/',
        OrgJoinRequestDetailView.as_view(),
        name='organization-join-request-detail',
    ),
    path('organizations/<int:org_id>/members/', OrgMembersView.as_view(), name='organization-members'),
    path(
        'organizations/<int:org_id>/members/<int:membership_id>/',
        OrgMembershipDetailView.as_view(),
        name='organization-member-detail',
    ),
    path('organizations/<int:org_id>/teams/', OrgTeamsView.as_view(), name='organization-teams'),
    path(
        'organizations/<int:org_id>/outgoing-team-migration-requests/',
        OrgOutgoingTeamMigrationRequestView.as_view(),
        name='organization-outgoing-team-migration-requests',
    ),
    path(
        'organizations/<int:org_id>/outgoing-team-migration-requests/<int:request_id>/',
        OrgOutgoingTeamMigrationRequestDetailView.as_view(),
        name='organization-outgoing-team-migration-request-detail',
    ),
    path(
        'organizations/<int:org_id>/team-migration-requests/',
        OrgTeamMigrationRequestView.as_view(),
        name='organization-team-migration-requests',
    ),
    path(
        'organizations/<int:org_id>/team-migration-requests/<int:request_id>/',
        OrgTeamMigrationRequestDetailView.as_view(),
        name='organization-team-migration-request-detail',
    ),
    path('teams/<int:team_id>/leave/', TeamLeaveView.as_view(), name='team-leave'),
    path('teams/<int:team_id>/migration-requests/', TeamMigrationRequestView.as_view(), name='team-migration-requests'),
    path(
        'teams/<int:team_id>/migration-requests/<int:request_id>/',
        TeamMigrationRequestDetailView.as_view(),
        name='team-migration-request-detail',
    ),
    path('teams/<int:team_id>/join-requests/', TeamJoinRequestView.as_view(), name='team-join-requests'),
    path(
        'teams/<int:team_id>/join-requests/<int:request_id>/',
        TeamJoinRequestDetailView.as_view(),
        name='team-join-request-detail',
    ),
    path('teams/<int:team_id>/members/', TeamMembershipView.as_view(), name='team-members'),
    path(
        'teams/<int:team_id>/members/<int:membership_id>/',
        TeamMembershipDetailView.as_view(),
        name='team-member-detail',
    ),
    path('teams/<int:team_id>/games/', TeamGameView.as_view(), name='team-games'),
    path('teams/<int:team_id>/games/<int:game_id>/', TeamGameView.as_view(), name='team-game-delete'),
    path('teams/<int:team_id>/benchmarks/', TeamBenchmarkView.as_view(), name='team-benchmarks'),
    path('teams/<int:team_id>/time-history/', TeamTimeHistoryView.as_view(), name='team-time-history'),
    path('teams/<int:team_id>/times-csv/', TeamTimesCsvUploadView.as_view(), name='team-times-csv'),
    path('teams/<int:team_id>/games/<int:game_id>/grid/', TeamGridView.as_view(), name='team-grid'),
    path('teams/<int:team_id>/games/<int:game_id>/compare/', TeamCompareView.as_view(), name='team-compare'),
    path('teams/<int:team_id>/games/<int:game_id>/leaderboard/', TeamLeaderboardView.as_view(), name='team-leaderboard'),
    path('', include(router.urls)),
]
