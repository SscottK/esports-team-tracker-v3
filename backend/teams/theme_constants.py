import re

HEX_COLOR_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')

DEFAULT_PRIMARY_COLOR = '#22d3ee'
DEFAULT_SECONDARY_COLOR = '#38bdf8'
DEFAULT_TERTIARY_COLOR = '#f472b6'

PRESET_TEAM_COLORS = {
    'cyan': {
        'primary_color': '#22d3ee',
        'secondary_color': '#38bdf8',
        'tertiary_color': '#f472b6',
    },
    'emerald': {
        'primary_color': '#34d399',
        'secondary_color': '#2dd4bf',
        'tertiary_color': '#60a5fa',
    },
    'violet': {
        'primary_color': '#a78bfa',
        'secondary_color': '#818cf8',
        'tertiary_color': '#f472b6',
    },
    'amber': {
        'primary_color': '#fbbf24',
        'secondary_color': '#f59e0b',
        'tertiary_color': '#fb7185',
    },
    'rose': {
        'primary_color': '#fb7185',
        'secondary_color': '#f472b6',
        'tertiary_color': '#c084fc',
    },
    'cobalt': {
        'primary_color': '#60a5fa',
        'secondary_color': '#38bdf8',
        'tertiary_color': '#22d3ee',
    },
}


def normalize_hex_color(value, fallback):
    if isinstance(value, str) and HEX_COLOR_RE.match(value):
        return value.lower()
    return fallback
