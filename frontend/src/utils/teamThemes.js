export const DEFAULT_TEAM_COLOR_THEME = 'cyan';

export const TEAM_COLOR_THEMES = {
  cyan: {
    label: 'Cyan',
    accent: '#22d3ee',
    accentSoft: 'rgba(34, 211, 238, 0.12)',
    panelBorder: 'rgba(56, 189, 248, 0.22)',
    magenta: '#f472b6',
    glow: 'rgba(34, 211, 238, 0.08)',
  },
  emerald: {
    label: 'Emerald',
    accent: '#34d399',
    accentSoft: 'rgba(52, 211, 153, 0.12)',
    panelBorder: 'rgba(52, 211, 153, 0.24)',
    magenta: '#60a5fa',
    glow: 'rgba(52, 211, 153, 0.08)',
  },
  violet: {
    label: 'Violet',
    accent: '#a78bfa',
    accentSoft: 'rgba(167, 139, 250, 0.12)',
    panelBorder: 'rgba(167, 139, 250, 0.24)',
    magenta: '#f472b6',
    glow: 'rgba(167, 139, 250, 0.08)',
  },
  amber: {
    label: 'Amber',
    accent: '#fbbf24',
    accentSoft: 'rgba(251, 191, 36, 0.12)',
    panelBorder: 'rgba(251, 191, 36, 0.24)',
    magenta: '#fb7185',
    glow: 'rgba(251, 191, 36, 0.08)',
  },
  rose: {
    label: 'Rose',
    accent: '#fb7185',
    accentSoft: 'rgba(251, 113, 133, 0.12)',
    panelBorder: 'rgba(251, 113, 133, 0.24)',
    magenta: '#c084fc',
    glow: 'rgba(251, 113, 133, 0.08)',
  },
  cobalt: {
    label: 'Cobalt',
    accent: '#60a5fa',
    accentSoft: 'rgba(96, 165, 250, 0.12)',
    panelBorder: 'rgba(96, 165, 250, 0.24)',
    magenta: '#22d3ee',
    glow: 'rgba(96, 165, 250, 0.08)',
  },
};

export const TEAM_COLOR_THEME_OPTIONS = Object.entries(TEAM_COLOR_THEMES).map(
  ([id, theme]) => ({ id, ...theme }),
);

export function normalizeTeamColorTheme(value) {
  return value && TEAM_COLOR_THEMES[value] ? value : DEFAULT_TEAM_COLOR_THEME;
}
