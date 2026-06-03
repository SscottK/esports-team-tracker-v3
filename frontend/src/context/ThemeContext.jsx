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
import {
  DEFAULT_TEAM_COLOR_THEME,
  TEAM_COLOR_THEMES,
  normalizeTeamColorTheme,
} from '../utils/teamThemes';

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

  const teamColorTheme = normalizeTeamColorTheme(activeTeam?.color_theme);

  useEffect(() => {
    if (routeTeamId) {
      setPreferredTeamIdState(routeTeamId);
      localStorage.setItem(PREFERRED_TEAM_KEY, routeTeamId);
    }
  }, [routeTeamId]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.colorMode = colorMode;
    root.dataset.teamTheme = teamColorTheme;
    localStorage.setItem(COLOR_MODE_KEY, colorMode);

    const palette = TEAM_COLOR_THEMES[teamColorTheme];
    root.style.setProperty('--esports-accent', palette.accent);
    root.style.setProperty('--esports-accent-soft', palette.accentSoft);
    root.style.setProperty('--esports-panel-border', palette.panelBorder);
    root.style.setProperty('--esports-magenta', palette.magenta);
    root.style.setProperty('--esports-glow', palette.glow);
  }, [colorMode, teamColorTheme]);

  const toggleColorMode = useCallback(() => {
    setColorMode((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({
      colorMode,
      toggleColorMode,
      teamColorTheme,
      activeTeamId,
      activeTeam,
    }),
    [colorMode, toggleColorMode, teamColorTheme, activeTeamId, activeTeam],
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

export { DEFAULT_TEAM_COLOR_THEME, TEAM_COLOR_THEME_OPTIONS, normalizeTeamColorTheme };
