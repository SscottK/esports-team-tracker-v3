export const DEFAULT_TEAM_COLORS = {
  primary: '#22d3ee',
  secondary: '#38bdf8',
  tertiary: '#f472b6',
};

export const TEAM_COLOR_PRESETS = {
  cyan: {
    label: 'Cyan',
    primary: '#22d3ee',
    secondary: '#38bdf8',
    tertiary: '#f472b6',
  },
  emerald: {
    label: 'Emerald',
    primary: '#34d399',
    secondary: '#2dd4bf',
    tertiary: '#60a5fa',
  },
  violet: {
    label: 'Violet',
    primary: '#a78bfa',
    secondary: '#818cf8',
    tertiary: '#f472b6',
  },
  amber: {
    label: 'Amber',
    primary: '#fbbf24',
    secondary: '#f59e0b',
    tertiary: '#fb7185',
  },
  rose: {
    label: 'Rose',
    primary: '#fb7185',
    secondary: '#f472b6',
    tertiary: '#c084fc',
  },
  cobalt: {
    label: 'Cobalt',
    primary: '#60a5fa',
    secondary: '#38bdf8',
    tertiary: '#22d3ee',
  },
};

export const TEAM_COLOR_PRESET_OPTIONS = Object.entries(TEAM_COLOR_PRESETS).map(
  ([id, preset]) => ({ id, ...preset }),
);

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function normalizeHexColor(value, fallback) {
  if (typeof value === 'string' && HEX_COLOR_RE.test(value)) {
    return value.toLowerCase();
  }
  return fallback;
}

export function resolveTeamColors(team) {
  return {
    primary: normalizeHexColor(team?.primary_color, DEFAULT_TEAM_COLORS.primary),
    secondary: normalizeHexColor(team?.secondary_color, DEFAULT_TEAM_COLORS.secondary),
    tertiary: normalizeHexColor(team?.tertiary_color, DEFAULT_TEAM_COLORS.tertiary),
  };
}

function hexToRgb(hex) {
  const normalized = normalizeHexColor(hex, DEFAULT_TEAM_COLORS.primary);
  const value = normalized.slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

export function hexAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyTeamColorsToRoot(root, colors) {
  const primary = normalizeHexColor(colors.primary, DEFAULT_TEAM_COLORS.primary);
  const secondary = normalizeHexColor(colors.secondary, DEFAULT_TEAM_COLORS.secondary);
  const tertiary = normalizeHexColor(colors.tertiary, DEFAULT_TEAM_COLORS.tertiary);

  root.style.setProperty('--esports-accent', primary);
  root.style.setProperty('--esports-secondary', secondary);
  root.style.setProperty('--esports-tertiary', tertiary);
  root.style.setProperty('--esports-magenta', tertiary);
  root.style.setProperty('--esports-accent-soft', hexAlpha(primary, 0.12));
  root.style.setProperty('--esports-secondary-soft', hexAlpha(secondary, 0.12));
  root.style.setProperty('--esports-tertiary-soft', hexAlpha(tertiary, 0.12));
  root.style.setProperty('--esports-panel-border', hexAlpha(secondary, 0.22));
  root.style.setProperty('--esports-glow', hexAlpha(primary, 0.08));
}

export const TEAM_COLOR_FIELDS = [
  { key: 'primary', label: 'Primary', role: 'Buttons, links, and main accents' },
  { key: 'secondary', label: 'Secondary', role: 'Borders, panels, and supporting accents' },
  { key: 'tertiary', label: 'Tertiary', role: 'Highlights, badges, and gradient accents' },
];
