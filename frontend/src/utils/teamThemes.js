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

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

export function mixHex(baseHex, tintHex, tintWeight) {
  const base = hexToRgb(baseHex);
  const tint = hexToRgb(tintHex);
  const weight = Math.max(0, Math.min(1, tintWeight));
  return rgbToHex({
    r: Math.round(base.r * (1 - weight) + tint.r * weight),
    g: Math.round(base.g * (1 - weight) + tint.g * weight),
    b: Math.round(base.b * (1 - weight) + tint.b * weight),
  });
}

export function hexAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyTeamColorsToRoot(root, colors, colorMode = 'dark') {
  const primary = normalizeHexColor(colors.primary, DEFAULT_TEAM_COLORS.primary);
  const secondary = normalizeHexColor(colors.secondary, DEFAULT_TEAM_COLORS.secondary);
  const tertiary = normalizeHexColor(colors.tertiary, DEFAULT_TEAM_COLORS.tertiary);
  const isLight = colorMode === 'light';

  root.style.setProperty('--esports-accent', primary);
  root.style.setProperty('--esports-secondary', secondary);
  root.style.setProperty('--esports-tertiary', tertiary);
  root.style.setProperty('--esports-magenta', tertiary);
  root.style.setProperty('--esports-accent-soft', hexAlpha(primary, isLight ? 0.14 : 0.12));
  root.style.setProperty('--esports-secondary-soft', hexAlpha(secondary, isLight ? 0.14 : 0.12));
  root.style.setProperty('--esports-tertiary-soft', hexAlpha(tertiary, isLight ? 0.14 : 0.12));
  root.style.setProperty('--esports-panel-border', hexAlpha(secondary, isLight ? 0.28 : 0.24));
  root.style.setProperty('--esports-glow', hexAlpha(primary, isLight ? 0.12 : 0.1));
  root.style.setProperty('--esports-body-glow-secondary', hexAlpha(tertiary, isLight ? 0.08 : 0.07));

  if (isLight) {
    root.style.setProperty('--esports-bg', mixHex('#eef2f7', primary, 0.16));
    root.style.setProperty('--esports-panel', mixHex('#ffffff', secondary, 0.1));
    root.style.setProperty('--esports-input-bg', mixHex('#ffffff', primary, 0.08));
    root.style.setProperty('--esports-surface', hexAlpha(primary, 0.08));
    root.style.setProperty('--esports-surface-strong', hexAlpha(secondary, 0.12));
    root.style.setProperty('--esports-table-sticky', mixHex('#f8fafc', secondary, 0.1));
  } else {
    root.style.setProperty('--esports-bg', mixHex('#070b12', primary, 0.2));
    root.style.setProperty('--esports-panel', mixHex('#111827', secondary, 0.24));
    root.style.setProperty('--esports-input-bg', mixHex('#0b1220', primary, 0.16));
    root.style.setProperty('--esports-surface', hexAlpha(primary, 0.12));
    root.style.setProperty('--esports-surface-strong', hexAlpha(secondary, 0.16));
    root.style.setProperty('--esports-table-sticky', mixHex('#0b1220', secondary, 0.14));
  }
}

export const TEAM_COLOR_FIELDS = [
  { key: 'primary', label: 'Primary', role: 'Buttons, links, page background tint, and main accents' },
  { key: 'secondary', label: 'Secondary', role: 'Card backgrounds, borders, tables, and supporting accents' },
  { key: 'tertiary', label: 'Tertiary', role: 'Highlights, badges, gradients, and secondary glow' },
];
