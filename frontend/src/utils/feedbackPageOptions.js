export const FEEDBACK_PAGE_OPTIONS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Requests inbox', path: '/requests' },
  { label: 'Beta feedback', path: '/feedback' },
  { label: 'Create or join organization', path: '/join-organization' },
  { label: 'Suggest a game', path: '/suggest-game' },
  { label: 'Add time menu', path: '/add-time' },
  { label: 'Organization', path: '/organizations/{org}' },
  { label: 'Organization leader tools', path: '/organizations/{org}/leader' },
  { label: 'Team', path: '/teams/{team}' },
  { label: 'Coach tools', path: '/teams/{team}/coach' },
  { label: 'Team colors', path: '/teams/{team}/coach/colors' },
  { label: 'Times grid', path: '/teams/{team}/games/{game}' },
  { label: 'Compare times', path: '/teams/{team}/games/{game}/compare' },
  { label: 'Add time', path: '/teams/{team}/add-time' },
  { label: 'Upload times', path: '/teams/{team}/upload-times' },
  { label: 'Time history', path: '/teams/{team}/time-history' },
  { label: 'Set benchmarks', path: '/teams/{team}/benchmarks' },
  { label: 'Game suggestions (admin)', path: '/admin/game-suggestions' },
  { label: 'Password reset requests (admin)', path: '/admin/password-reset-requests' },
  { label: 'Django admin panel', path: '/admin' },
  { label: 'Beta feedback inbox (admin)', path: '/admin/beta-feedback' },
  { label: 'Home', path: '/' },
  { label: 'Sign in', path: '/signin' },
  { label: 'Sign up', path: '/signup' },
  { label: 'Forgot password', path: '/forgot-password' },
  { label: 'Other / not listed', path: 'other' },
];

const PATH_MATCHERS = [
  { path: '/teams/{team}/games/{game}/compare', pattern: /^\/teams\/[^/]+\/games\/[^/]+\/compare$/ },
  { path: '/teams/{team}/games/{game}', pattern: /^\/teams\/[^/]+\/games\/[^/]+$/ },
  { path: '/teams/{team}/coach/colors', pattern: /^\/teams\/[^/]+\/coach\/colors$/ },
  { path: '/teams/{team}/coach', pattern: /^\/teams\/[^/]+\/coach$/ },
  { path: '/teams/{team}/add-time', pattern: /^\/teams\/[^/]+\/add-time$/ },
  { path: '/teams/{team}/upload-times', pattern: /^\/teams\/[^/]+\/upload-times$/ },
  { path: '/teams/{team}/time-history', pattern: /^\/teams\/[^/]+\/time-history$/ },
  { path: '/teams/{team}/benchmarks', pattern: /^\/teams\/[^/]+\/benchmarks$/ },
  { path: '/teams/{team}', pattern: /^\/teams\/[^/]+$/ },
  { path: '/organizations/{org}/leader', pattern: /^\/organizations\/[^/]+\/leader$/ },
  { path: '/organizations/{org}', pattern: /^\/organizations\/[^/]+$/ },
];

export function resolveFeedbackPagePath(pathname) {
  const exact = FEEDBACK_PAGE_OPTIONS.find((option) => option.path === pathname);
  if (exact) {
    return exact.path;
  }

  const matched = PATH_MATCHERS.find((entry) => entry.pattern.test(pathname));
  return matched?.path || '';
}

export function getFeedbackPageLabel(pathValue) {
  return FEEDBACK_PAGE_OPTIONS.find((option) => option.path === pathValue)?.label || pathValue;
}
