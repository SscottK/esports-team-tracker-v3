export function requestTypeLabel(type) {
  if (type === 'org_join') return 'Organization join';
  if (type === 'team_join') return 'Team join';
  if (type === 'team_invite') return 'Team invite';
  if (type === 'team_migration') return 'Team move';
  if (type === 'password_reset') return 'Password reset';
  if (type === 'outgoing_team_migration') return 'Team move (outgoing)';
  if (type === 'incoming_team_migration') return 'Team move (incoming)';
  if (typeof type === 'string' && type.includes('_')) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return type;
}

export function requestStatusLabel(status) {
  if (status === 'pending') return 'Pending';
  if (status === 'pending_source') return 'Pending source approval';
  if (status === 'pending_target') return 'Pending target approval';
  if (status === 'approved') return 'Approved';
  if (status === 'completed') return 'Completed';
  if (status === 'rejected') return 'Rejected';
  if (status === 'cancelled') return 'Cancelled';
  if (typeof status === 'string' && status.includes('_')) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return status;
}

export function requestStatusBadgeVariant(status) {
  if (status === 'pending' || status === 'pending_source' || status === 'pending_target') {
    return { bg: 'warning', text: 'dark' };
  }
  if (status === 'approved' || status === 'completed') {
    return { bg: 'success' };
  }
  if (status === 'rejected') return { bg: 'danger' };
  if (status === 'cancelled') return { bg: 'secondary' };
  return { bg: 'secondary' };
}
