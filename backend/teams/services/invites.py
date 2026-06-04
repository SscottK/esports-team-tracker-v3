from django.contrib.auth import get_user_model
from django.db import transaction

from orgs.models import OrgMembership
from performances.permissions import user_is_head_coach
from teams.models import CoachRole, JoinRequestStatus, Team, TeamInvite, TeamJoinRequest, TeamMembership

User = get_user_model()


class TeamInviteError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def create_team_invite(inviter, team_id, username):
    if not user_is_head_coach(inviter, team_id):
        raise TeamInviteError('Only head coaches can send team invites.', status_code=403)

    team = Team.objects.select_related('organization').filter(pk=team_id).first()
    if not team:
        raise TeamInviteError('Team not found.', status_code=404)

    invited_user = User.objects.filter(username__iexact=username.strip()).first()
    if not invited_user:
        raise TeamInviteError('User not found.', status_code=404)
    if invited_user.id == inviter.id:
        raise TeamInviteError('You cannot invite yourself.')
    if TeamMembership.objects.filter(user=invited_user, team=team).exists():
        raise TeamInviteError('User is already on this team.')
    if TeamInvite.objects.filter(
        invited_user=invited_user,
        team=team,
        status=JoinRequestStatus.PENDING,
    ).exists():
        raise TeamInviteError('This user already has a pending invite for this team.')
    if TeamJoinRequest.objects.filter(
        user=invited_user,
        team=team,
        status=JoinRequestStatus.PENDING,
    ).exists():
        raise TeamInviteError('This user already has a pending join request for this team.')

    return TeamInvite.objects.create(
        team=team,
        invited_user=invited_user,
        invited_by=inviter,
    )


def cancel_team_invite(inviter, invite_id, team_id):
    if not user_is_head_coach(inviter, team_id):
        raise TeamInviteError('Only head coaches can cancel team invites.', status_code=403)

    invite = TeamInvite.objects.filter(pk=invite_id, team_id=team_id).first()
    if not invite:
        raise TeamInviteError('Invite not found.', status_code=404)
    if invite.status != JoinRequestStatus.PENDING:
        raise TeamInviteError('Only pending invites can be cancelled.')
    invite.status = JoinRequestStatus.CANCELLED
    invite.reviewed_by = inviter
    invite.save(update_fields=['status', 'reviewed_by', 'updated_at'])
    return invite


def _user_org_membership(user, organization_id):
    return OrgMembership.objects.filter(user=user, organization_id=organization_id).first()


def respond_team_invite(user, invite_id, team_id, *, action):
    if action not in ('accept', 'decline'):
        raise TeamInviteError('action must be accept or decline.')

    invite = TeamInvite.objects.filter(
        pk=invite_id,
        team_id=team_id,
    ).select_related('team', 'team__organization', 'invited_user').first()
    if not invite:
        raise TeamInviteError('Invite not found.', status_code=404)
    if invite.invited_user_id != user.id:
        raise TeamInviteError('You can only respond to your own invites.', status_code=403)
    if invite.status != JoinRequestStatus.PENDING:
        raise TeamInviteError('This invite has already been responded to.')

    if action == 'decline':
        invite.status = JoinRequestStatus.REJECTED
        invite.reviewed_by = user
        invite.save(update_fields=['status', 'reviewed_by', 'updated_at'])
        return invite, None

    if TeamMembership.objects.filter(user=user, team=invite.team).exists():
        raise TeamInviteError('You are already on this team.')

    target_org_id = invite.team.organization_id
    user_org_ids = list(
        OrgMembership.objects.filter(user=user).values_list('organization_id', flat=True)
    )
    if user_org_ids and target_org_id not in user_org_ids:
        raise TeamInviteError(
            'Leave your current organization before accepting this invite.',
            status_code=403,
        )

    with transaction.atomic():
        if not _user_org_membership(user, target_org_id):
            OrgMembership.objects.create(
                user=user,
                organization_id=target_org_id,
                is_admin=False,
            )
        membership, _created = TeamMembership.objects.get_or_create(
            user=user,
            team_id=team_id,
            defaults={
                'coach_role': CoachRole.NONE,
                'is_competing_member': True,
            },
        )
        invite.status = JoinRequestStatus.APPROVED
        invite.reviewed_by = user
        invite.save(update_fields=['status', 'reviewed_by', 'updated_at'])

    return invite, membership


def bulk_create_team_invites(inviter, team_id, usernames):
    if not user_is_head_coach(inviter, team_id):
        raise TeamInviteError('Only head coaches can send team invites.', status_code=403)

    sent = []
    skipped = {
        'not_found': [],
        'already_on_team': [],
        'pending_invite': [],
        'pending_join_request': [],
        'self': [],
        'duplicate': [],
        'errors': [],
    }
    seen = set()

    for raw in usernames:
        username = raw.strip()
        if not username:
            continue
        key = username.lower()
        if key in seen:
            skipped['duplicate'].append(username)
            continue
        seen.add(key)

        try:
            invite = create_team_invite(inviter, team_id, username)
            sent.append(invite.invited_user.username)
        except TeamInviteError as exc:
            message = exc.message.lower()
            if 'not found' in message:
                skipped['not_found'].append(username)
            elif 'already on this team' in message:
                skipped['already_on_team'].append(username)
            elif 'pending invite' in message:
                skipped['pending_invite'].append(username)
            elif 'pending join request' in message:
                skipped['pending_join_request'].append(username)
            elif 'invite yourself' in message:
                skipped['self'].append(username)
            else:
                skipped['errors'].append({'username': username, 'detail': exc.message})

    return {'sent': sent, 'skipped': skipped}
