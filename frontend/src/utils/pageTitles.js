import { APP_NAME } from '../config/appMeta';

export function getPageTitleForPath(pathname) {
  if (pathname === '/') {
    return 'Home';
  }
  if (pathname === '/signin') {
    return 'Sign in';
  }
  if (pathname === '/signup') {
    return 'Sign up';
  }
  if (pathname === '/forgot-password') {
    return 'Forgot password';
  }
  if (pathname === '/dashboard') {
    return 'Dashboard';
  }
  if (pathname === '/join-organization') {
    return 'Create or join organization';
  }
  if (pathname === '/suggest-game') {
    return 'Suggest a game';
  }
  if (pathname === '/requests') {
    return 'Requests';
  }
  if (pathname === '/feedback') {
    return 'Beta feedback';
  }
  if (pathname === '/add-time') {
    return 'Add time';
  }
  if (pathname === '/admin') {
    return 'Admin panel';
  }
  if (pathname === '/admin/game-suggestions') {
    return 'Game suggestions';
  }
  if (pathname === '/admin/password-reset-requests') {
    return 'Password reset requests';
  }
  if (pathname === '/admin/beta-feedback') {
    return 'Beta feedback';
  }

  const orgLeaderMatch = pathname.match(/^\/organizations\/[^/]+\/leader$/);
  if (orgLeaderMatch) {
    return 'Leader tools';
  }

  const orgMatch = pathname.match(/^\/organizations\/[^/]+$/);
  if (orgMatch) {
    return 'Organization';
  }

  const teamColorsMatch = pathname.match(/^\/teams\/[^/]+\/coach\/colors$/);
  if (teamColorsMatch) {
    return 'Team colors';
  }

  const coachMatch = pathname.match(/^\/teams\/[^/]+\/coach$/);
  if (coachMatch) {
    return 'Coach tools';
  }

  const compareMatch = pathname.match(/^\/teams\/[^/]+\/games\/[^/]+\/compare$/);
  if (compareMatch) {
    return 'Compare times';
  }

  const gridMatch = pathname.match(/^\/teams\/[^/]+\/games\/[^/]+$/);
  if (gridMatch) {
    return 'Times grid';
  }

  const addTimeMatch = pathname.match(/^\/teams\/[^/]+\/add-time$/);
  if (addTimeMatch) {
    return 'Add time';
  }

  const uploadMatch = pathname.match(/^\/teams\/[^/]+\/upload-times$/);
  if (uploadMatch) {
    return 'Upload times';
  }

  const historyMatch = pathname.match(/^\/teams\/[^/]+\/time-history$/);
  if (historyMatch) {
    return 'Time history';
  }

  const benchmarksMatch = pathname.match(/^\/teams\/[^/]+\/benchmarks$/);
  if (benchmarksMatch) {
    return 'Set benchmarks';
  }

  const teamMatch = pathname.match(/^\/teams\/[^/]+$/);
  if (teamMatch) {
    return 'Team';
  }

  return APP_NAME;
}
