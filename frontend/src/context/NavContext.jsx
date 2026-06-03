import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import * as orgApi from '../api/orgs';
import * as teamApi from '../api/teams';
import * as requestsApi from '../api/requests';

const NavContext = createContext(null);

export function NavProvider({ children }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshNav = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setTeams([]);
      setPendingCount(0);
      return;
    }

    setLoading(true);
    try {
      const [orgList, teamList, inbox] = await Promise.all([
        orgApi.getMyOrganizations(),
        teamApi.getTeams(),
        requestsApi.getRequestInbox().catch(() => ({ pending_count: 0 })),
      ]);
      setOrganizations(orgList);
      setTeams(teamList);
      setPendingCount(inbox.pending_count || 0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshNav();
  }, [refreshNav]);

  const value = useMemo(
    () => ({
      organizations,
      teams,
      pendingCount,
      navLoading: loading,
      refreshNav,
    }),
    [organizations, teams, pendingCount, loading, refreshNav],
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
