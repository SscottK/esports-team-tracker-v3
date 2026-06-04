export function djangoAdminBaseUrl() {
  return (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
}

export function djangoAdminUrl(path = '/admin/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${djangoAdminBaseUrl()}${normalized}`;
}

export const DJANGO_ADMIN_LINKS = [
  {
    label: 'Django admin home',
    description: 'Main admin dashboard and recent actions.',
    path: '/admin/',
  },
  {
    label: 'Users',
    description: 'Accounts, staff flags, and password resets.',
    path: '/admin/auth/user/',
  },
  {
    label: 'Organizations',
    description: 'Org records, join codes, and memberships.',
    path: '/admin/orgs/organization/',
  },
  {
    label: 'Teams',
    description: 'Teams, memberships, invites, and join requests.',
    path: '/admin/teams/team/',
  },
  {
    label: 'Games & tracks',
    description: 'Catalog games, level groups, and activities.',
    path: '/admin/games/game/',
  },
  {
    label: 'Member results',
    description: 'Submitted times and performance records.',
    path: '/admin/performances/memberresult/',
  },
  {
    label: 'Team benchmarks',
    description: 'Par targets and elite times per team/track.',
    path: '/admin/performances/teambenchmark/',
  },
  {
    label: 'Beta feedback',
    description: 'In-app beta feedback submissions.',
    path: '/admin/accounts/betafeedback/',
  },
  {
    label: 'Password reset requests',
    description: 'Manual password reset queue.',
    path: '/admin/accounts/passwordresetrequest/',
  },
  {
    label: 'Game suggestions',
    description: 'User-submitted catalog suggestions.',
    path: '/admin/games/gamesuggestion/',
  },
];
