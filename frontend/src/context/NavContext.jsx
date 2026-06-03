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

export function NavProvider({ children }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [adminPendingCount, setAdminPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshNav = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setTeams([]);
      setPendingCount(0);
      setAdminPendingCount(0);
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
        requests.push(adminApi.getAdminPendingCounts().catch(() => ({ total: 0 })));
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
        setAdminPendingCount(adminCounts?.total || 0);
      } else {
        setAdminPendingCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshNav();
  }, [refreshNav]);

  const notificationCount = pendingCount + adminPendingCount;

  const value = useMemo(
    () => ({
      organizations,
      teams,
      pendingCount,
      adminPendingCount,
      notificationCount,
      navLoading: loading,
      refreshNav,
    }),
    [organizations, teams, pendingCount, adminPendingCount, notificationCount, loading, refreshNav],
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
