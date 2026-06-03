export function roleLabel(membership) {
  if (membership.coach_role === 'head') return 'Head coach';
  if (membership.coach_role === 'assistant') return 'Assistant coach';
  if (membership.is_competing_member) return 'Competing member';
  return 'Member';
}

export function migrationStatusLabel(status) {
  if (status === 'pending_source') return 'Awaiting your organization leader’s approval';
  if (status === 'pending_target') return 'Awaiting target organization leader’s approval';
  return status;
}
