import { useEffect, useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import {
  DEFAULT_TEAM_COLORS,
  TEAM_COLOR_FIELDS,
  TEAM_COLOR_PRESET_OPTIONS,
  normalizeHexColor,
  resolveTeamColors,
} from '../utils/teamThemes';

function ColorField({ fieldKey, label, role, value, onChange, disabled }) {
  const safeValue = normalizeHexColor(value, DEFAULT_TEAM_COLORS[fieldKey]);

  return (
    <div className="team-color-field">
      <div className="team-color-field-copy">
        <Form.Label className="mb-1">{label}</Form.Label>
        <p className="dashboard-panel-meta mb-0">{role}</p>
      </div>
      <div className="team-color-field-inputs">
        <Form.Control
          type="color"
          value={safeValue}
          onChange={(event) => onChange(fieldKey, event.target.value)}
          disabled={disabled}
          aria-label={`${label} color picker`}
          className="team-color-input-swatch"
        />
        <Form.Control
          type="text"
          value={value}
          onChange={(event) => onChange(fieldKey, event.target.value)}
          disabled={disabled}
          placeholder="#22d3ee"
          spellCheck={false}
          className="team-color-input-hex"
        />
      </div>
    </div>
  );
}

export default function TeamColorEditor({ team, busy, onSave }) {
  const resolvedColors = useMemo(() => resolveTeamColors(team), [team]);
  const [draft, setDraft] = useState(resolvedColors);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setDraft(resolvedColors);
    setLocalError('');
  }, [resolvedColors]);

  const handleFieldChange = (fieldKey, nextValue) => {
    setDraft((current) => ({
      ...current,
      [fieldKey]: nextValue,
    }));
    setLocalError('');
  };

  const handleApplyPreset = (preset) => {
    setDraft({
      primary: preset.primary,
      secondary: preset.secondary,
      tertiary: preset.tertiary,
    });
    setLocalError('');
  };

  const handleSave = async () => {
    const payload = {
      primary_color: normalizeHexColor(draft.primary, ''),
      secondary_color: normalizeHexColor(draft.secondary, ''),
      tertiary_color: normalizeHexColor(draft.tertiary, ''),
    };

    if (!payload.primary_color || !payload.secondary_color || !payload.tertiary_color) {
      setLocalError('Each color must be a valid hex value like #22d3ee.');
      return;
    }

    await onSave(payload);
  };

  const hasChanges = (
    draft.primary !== resolvedColors.primary
    || draft.secondary !== resolvedColors.secondary
    || draft.tertiary !== resolvedColors.tertiary
  );

  const previewPrimary = normalizeHexColor(draft.primary, DEFAULT_TEAM_COLORS.primary);
  const previewSecondary = normalizeHexColor(draft.secondary, DEFAULT_TEAM_COLORS.secondary);
  const previewTertiary = normalizeHexColor(draft.tertiary, DEFAULT_TEAM_COLORS.tertiary);

  return (
    <section className="esports-panel coach-tools-panel mb-4">
      <h3 className="coach-tools-section-title">Team colors</h3>
      <p className="dashboard-panel-meta mb-3">
        Choose primary, secondary, and tertiary colors for your team. They tint the page background,
        cards, buttons, and accents across the app while this team is active.
      </p>

      <div
        className="team-color-preview mb-3"
        style={{
          background: `linear-gradient(135deg, ${previewPrimary}, ${previewSecondary}, ${previewTertiary})`,
        }}
        aria-hidden="true"
      />

      <div className="team-color-fields">
        {TEAM_COLOR_FIELDS.map(({ key, label, role }) => (
          <ColorField
            key={key}
            fieldKey={key}
            label={label}
            role={role}
            value={draft[key]}
            onChange={handleFieldChange}
            disabled={busy}
          />
        ))}
      </div>

      <div className="team-color-presets mt-3">
        <p className="dashboard-panel-meta mb-2">Quick starters</p>
        <div className="team-theme-picker">
          {TEAM_COLOR_PRESET_OPTIONS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="team-theme-option"
              onClick={() => handleApplyPreset(preset)}
              disabled={busy}
            >
              <span className="team-theme-swatches" aria-hidden="true">
                <span className="team-theme-swatch" style={{ backgroundColor: preset.primary }} />
                <span className="team-theme-swatch" style={{ backgroundColor: preset.secondary }} />
                <span className="team-theme-swatch" style={{ backgroundColor: preset.tertiary }} />
              </span>
              <span className="team-theme-label">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {localError && <Alert variant="warning" className="mt-3 mb-0 py-2">{localError}</Alert>}

      <Button
        type="button"
        variant="outline-primary"
        className="mt-3"
        onClick={handleSave}
        disabled={busy || !hasChanges}
      >
        Save team colors
      </Button>
    </section>
  );
}
