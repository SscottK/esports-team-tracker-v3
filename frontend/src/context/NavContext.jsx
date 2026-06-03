import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import * as adminApi from '../api/admin';
import * as orgApi from '../api/orgs';
import * as teamApi from '../api/teams';
import * as requestsApi from '../api/requests';

const NavContext = createContext(null);

const EMPTY_ADMIN_COUNTS = {
  beta_feedback: 0,
  password_reset_requests: 0,
  game_suggestions: 0,
  total: 0,
};

export function NavProvider({ children }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [adminPendingCounts, setAdminPendingCounts] = useState(EMPTY_ADMIN_COUNTS);
  const [loading, setLoading] = useState(false);

  const refreshNav = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setTeams([]);
      setPendingCount(0);
      setAdminPendingCounts(EMPTY_ADMIN_COUNTS);
      return;
    }

    setLoading(true);
    try {
      const requests = [
        orgApi.getMyOrganizations(),
        teamApi.getTeams(),
        requestsApi.getRequestInbox().catch(() => ({ pending_count: 0 })),
      ];
      if (user.is_staff) {
        requests.push(adminApi.getAdminPendingCounts().catch(() => EMPTY_ADMIN_COUNTS));
      }

      const results = await Promise.all(requests);
      const orgList = results[0];
      const teamList = results[1];
      const inbox = results[2];

      setOrganizations(orgList);
      setTeams(teamList);
      setPendingCount(inbox.pending_count || 0);

      if (user.is_staff) {
        const adminCounts = results[3];
        setAdminPendingCounts({
          beta_feedback: adminCounts?.beta_feedback || 0,
          password_reset_requests: adminCounts?.password_reset_requests || 0,
          game_suggestions: adminCounts?.game_suggestions || 0,
          total: adminCounts?.total || 0,
        });
      } else {
        setAdminPendingCounts(EMPTY_ADMIN_COUNTS);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshNav();
  }, [refreshNav]);

  const notificationCount = pendingCount + adminPendingCounts.total;

  const value = useMemo(
    () => ({
      organizations,
      teams,
      pendingCount,
      adminPendingCounts,
      adminPendingCount: adminPendingCounts.total,
      notificationCount,
      navLoading: loading,
      refreshNav,
    }),
    [organizations, teams, pendingCount, adminPendingCounts, notificationCount, loading, refreshNav],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const context = useContext(NavContext);
  if (!context) {
    throw new Error('useNav must be used within NavProvider');
  }
  return context;
}
