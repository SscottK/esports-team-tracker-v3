import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useNav } from './NavContext';
import { applyTeamColorsToRoot, resolveTeamColors } from '../utils/teamThemes';

const COLOR_MODE_KEY = 'estt_color_mode';
const PREFERRED_TEAM_KEY = 'estt_preferred_team_id';

const ThemeContext = createContext(null);

function readColorMode() {
  const stored = localStorage.getItem(COLOR_MODE_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

function resolveRouteTeamId(pathname) {
  const match = pathname.match(/^\/teams\/(\d+)/);
  return match ? match[1] : null;
}

export function ThemeProvider({ children }) {
  const location = useLocation();
  const { teams } = useNav();
  const [colorMode, setColorMode] = useState(readColorMode);
  const [preferredTeamId, setPreferredTeamIdState] = useState(
    () => localStorage.getItem(PREFERRED_TEAM_KEY) || '',
  );

  const routeTeamId = resolveRouteTeamId(location.pathname);

  const activeTeamId = useMemo(() => {
    if (routeTeamId && teams.some((team) => String(team.id) === String(routeTeamId))) {
      return String(routeTeamId);
    }
    if (preferredTeamId && teams.some((team) => String(team.id) === String(preferredTeamId))) {
      return String(preferredTeamId);
    }
    return teams[0]?.id ? String(teams[0].id) : null;
  }, [routeTeamId, preferredTeamId, teams]);

  const activeTeam = useMemo(
    () => teams.find((team) => String(team.id) === String(activeTeamId)) || null,
    [teams, activeTeamId],
  );

  const teamColors = useMemo(() => resolveTeamColors(activeTeam), [activeTeam]);

  useEffect(() => {
    if (routeTeamId) {
      setPreferredTeamIdState(routeTeamId);
      localStorage.setItem(PREFERRED_TEAM_KEY, routeTeamId);
    }
  }, [routeTeamId]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.colorMode = colorMode;
    localStorage.setItem(COLOR_MODE_KEY, colorMode);
    applyTeamColorsToRoot(root, teamColors, colorMode);
  }, [colorMode, teamColors]);

  const toggleColorMode = useCallback(() => {
    setColorMode((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({
      colorMode,
      toggleColorMode,
      teamColors,
      activeTeamId,
      activeTeam,
    }),
    [colorMode, toggleColorMode, teamColors, activeTeamId, activeTeam],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
