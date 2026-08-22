import { useCallback, useEffect, useState } from 'react';
import { CollapsibleSection, Section, Slider, Toggle } from '../../components/Controls';
import '../../components/controls.css';
import '../../assets/global.css';
import { PRESETS } from '../../lib/defaults';
import { sendMessage } from '../../lib/messaging';
import type { PresetId, SiteMode, TruelyDarkSettings } from '../../types';
import './options.css';

export function OptionsApp() {
  const [settings, setSettings] = useState<TruelyDarkSettings | null>(null);
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const s = await sendMessage<TruelyDarkSettings>({ type: 'GET_SETTINGS' });
      setSettings(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(async (partial: Partial<TruelyDarkSettings>) => {
    const updated = await sendMessage<TruelyDarkSettings>({
      type: 'UPDATE_SETTINGS',
      payload: partial,
    });
    setSettings(updated);
  }, []);

  const applyPreset = useCallback(async (presetId: PresetId) => {
    const updated = await sendMessage<TruelyDarkSettings>({
      type: 'APPLY_PRESET',
      payload: presetId,
    });
    setSettings(updated);
  }, []);

  const removeSiteOverride = useCallback(
    async (origin: string) => {
      if (!settings) return;
      const overrides = { ...settings.siteOverrides };
      delete overrides[origin];
      await update({ siteOverrides: overrides });
    },
    [settings, update],
  );

  const exportSettings = useCallback(async () => {
    const data = await sendMessage<{ version: number; settings: TruelyDarkSettings; exportedAt: string }>({
      type: 'EXPORT_SETTINGS',
    });
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truely-dark-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus({ type: 'success', text: 'Settings exported successfully.' });
  }, []);

  const importSettings = useCallback(async () => {
    try {
      const parsed = JSON.parse(importText);
      const payload = parsed.settings ?? parsed;
      await sendMessage({ type: 'IMPORT_SETTINGS', payload: { settings: payload } });
      await load();
      setImportText('');
      setStatus({ type: 'success', text: 'Settings imported successfully.' });
    } catch {
      setStatus({ type: 'error', text: 'Invalid settings JSON. Please check the format.' });
    }
  }, [importText, load]);

  if (loading || !settings) {
    return (
      <div className="options">
        <div className="empty-state">Loading settings…</div>
      </div>
    );
  }

  const siteOverrides = Object.entries(settings.siteOverrides).sort(
    ([, a], [, b]) => b.addedAt - a.addedAt,
  );

  return (
    <div className="options">
      <header className="options-header">
        <img src="/icon/48.png" alt="" className="options-logo" width={48} height={48} />
        <div>
          <h1 className="options-title">Truely Dark Settings</h1>
          <p className="options-desc">
            Flash-free dark mode — zero telemetry, no network by default.
          </p>
        </div>
      </header>

      <Section title="Essentials">
        <Toggle
          label="Enable Truely Dark"
          description="Master switch for all sites"
          checked={settings.enabled}
          onChange={(enabled) => update({ enabled })}
        />
        <div className="default-mode-row">
          <span className="field-label">Default site mode</span>
          <div className="btn-row">
            {(['auto', 'soft', 'on', 'off'] as SiteMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`btn ${settings.defaultMode === mode ? 'btn--primary' : ''}`}
                onClick={() => update({ defaultMode: mode })}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <Toggle
          label="Battery saver"
          description="Prefer Soft mode, use cached detection only, skip live re-sampling"
          checked={settings.batterySaver}
          onChange={(batterySaver) => update({ batterySaver })}
        />
      </Section>

      <Section title="Presets">
        <div className="preset-grid">
          {Object.values(PRESETS).map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`preset-card ${settings.preset === preset.id ? 'preset-card--active' : ''}`}
              onClick={() => applyPreset(preset.id)}
            >
              <div className="preset-name">{preset.name}</div>
              <div className="preset-desc">{preset.description}</div>
              <div
                className="preset-swatch"
                style={{ background: preset.backgroundColor }}
              />
            </button>
          ))}
        </div>
      </Section>

      <CollapsibleSection title="Advanced appearance">
        <Slider
          label="Brightness"
          value={settings.brightness}
          min={50}
          max={150}
          unit="%"
          onChange={(brightness) => update({ brightness, preset: 'custom' })}
        />
        <Slider
          label="Contrast"
          value={settings.contrast}
          min={50}
          max={150}
          unit="%"
          onChange={(contrast) => update({ contrast, preset: 'custom' })}
        />
        <Slider
          label="Warmth (sepia)"
          value={settings.sepia}
          min={0}
          max={50}
          unit="%"
          onChange={(sepia) => update({ sepia, preset: 'custom' })}
        />
        <Toggle
          label="Preserve images & media"
          description="Counter-invert photos, videos, and SVGs (not iframes — child frames self-darken)"
          checked={settings.preserveMedia}
          onChange={(preserveMedia) => update({ preserveMedia })}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Schedule">
        <Toggle
          label="Enable schedule"
          description="Automatically enable dark mode during set hours"
          checked={settings.schedule.enabled}
          onChange={(enabled) =>
            update({ schedule: { ...settings.schedule, enabled } })
          }
        />
        <Toggle
          label="Follow system theme"
          description="Use prefers-color-scheme when schedule is enabled"
          checked={settings.schedule.followSystem}
          onChange={(followSystem) =>
            update({ schedule: { ...settings.schedule, followSystem } })
          }
        />
        {!settings.schedule.followSystem && (
          <div className="schedule-row">
            <div className="schedule-field">
              <label htmlFor="schedule-start">Start time</label>
              <input
                id="schedule-start"
                type="time"
                value={settings.schedule.start}
                onChange={(e) =>
                  update({ schedule: { ...settings.schedule, start: e.target.value } })
                }
              />
            </div>
            <div className="schedule-field">
              <label htmlFor="schedule-end">End time</label>
              <input
                id="schedule-end"
                type="time"
                value={settings.schedule.end}
                onChange={(e) =>
                  update({ schedule: { ...settings.schedule, end: e.target.value } })
                }
              />
            </div>
          </div>
        )}
      </CollapsibleSection>

      <Section title="Site overrides">
        {siteOverrides.length === 0 ? (
          <div className="empty-state">
            No site overrides yet. Use the popup or Alt+Shift+S to set per-site modes.
          </div>
        ) : (
          <div className="site-list">
            {siteOverrides.map(([origin, override]) => (
              <div key={origin} className="site-item">
                <div>
                  <div className="site-item-origin">{origin}</div>
                  <span className="site-item-mode">{override.mode}</span>
                </div>
                <button
                  type="button"
                  className="site-item-remove"
                  onClick={() => removeSiteOverride(origin)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <CollapsibleSection title="Keyboard shortcuts">
        <div className="shortcut-list">
          <div className="shortcut-item">
            <span>Toggle globally</span>
            <span className="shortcut-keys">Alt+Shift+D</span>
          </div>
          <div className="shortcut-item">
            <span>Toggle current site</span>
            <span className="shortcut-keys">Alt+Shift+S</span>
          </div>
        </div>
        <p className="hint-text">
          Customize shortcuts in your browser&apos;s extension keyboard shortcuts page.
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Import / Export">
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={exportSettings}>
            Export settings
          </button>
        </div>
        <div className="import-area">
          <textarea
            placeholder="Paste settings JSON here to import…"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            aria-label="Import settings JSON"
          />
          <div className="btn-row import-actions">
            <button
              type="button"
              className="btn"
              onClick={importSettings}
              disabled={!importText.trim()}
            >
              Import settings
            </button>
          </div>
        </div>
        {status && (
          <div className={`status-msg status-msg--${status.type}`}>{status.text}</div>
        )}
      </CollapsibleSection>

      <Section title="Privacy">
        <div className="privacy-note">
          <strong>Zero telemetry.</strong> Truely Dark does not collect, transmit, or store any
          personal data outside your local browser storage. No network requests are made by
          default. Your settings stay on your device. See{' '}
          <a
            href="https://github.com/pwnapplehat/Truely-Dark/blob/main/PRIVACY.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            PRIVACY.md
          </a>{' '}
          for details.
        </div>
      </Section>
    </div>
  );
}
