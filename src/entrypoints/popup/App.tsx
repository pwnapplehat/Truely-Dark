import { useCallback, useEffect, useState } from 'react';
import { ModeSelector, Slider, Toggle } from '../../components/Controls';
import '../../components/controls.css';
import '../../assets/global.css';
import { sendMessage } from '../../lib/messaging';
import type { SiteMode, TabInfo, TruelyDarkSettings } from '../../types';
import './popup.css';

export function PopupApp() {
  const [settings, setSettings] = useState<TruelyDarkSettings | null>(null);
  const [tabInfo, setTabInfo] = useState<TabInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, tab] = await Promise.all([
        sendMessage<TruelyDarkSettings>({ type: 'GET_SETTINGS' }),
        sendMessage<TabInfo>({ type: 'GET_TAB_INFO' }),
      ]);
      setSettings(s);
      setTabInfo(tab);
    } catch {
      // Failed to load
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
    const tab = await sendMessage<TabInfo>({ type: 'GET_TAB_INFO' });
    setTabInfo(tab);
  }, []);

  const setSiteMode = useCallback(
    async (mode: SiteMode) => {
      if (!tabInfo?.origin) return;
      const updated = await sendMessage<TruelyDarkSettings>({
        type: 'SET_SITE_MODE',
        payload: { origin: tabInfo.origin, mode },
      });
      setSettings(updated);
      const tab = await sendMessage<TabInfo>({ type: 'GET_TAB_INFO' });
      setTabInfo(tab);
    },
    [tabInfo?.origin],
  );

  if (loading || !settings) {
    return <div className="popup popup-loading">Loading…</div>;
  }

  return (
    <div className="popup">
      <header className="popup-header">
        <img src="/icon/32.png" alt="" className="popup-logo" width={28} height={28} />
        <div>
          <div className="popup-title">Truely Dark</div>
          <div className="popup-subtitle">Instantly dark. Never double-dark.</div>
        </div>
      </header>

      <div className="popup-body">
        <Toggle
          label="Dark mode"
          description="Toggle globally"
          checked={settings.enabled}
          onChange={(enabled) => update({ enabled })}
        />

        {tabInfo?.hostname && (
          <>
            <div className="popup-site">{tabInfo.hostname}</div>
            <div className="popup-status">
              <span
                className={`popup-status-dot ${
                  tabInfo.active ? 'popup-status-dot--active' : 'popup-status-dot--inactive'
                }`}
              />
              {tabInfo.active ? 'Dark mode active on this site' : 'Dark mode off on this site'}
            </div>
            <ModeSelector value={tabInfo.effectiveMode} onChange={setSiteMode} />
          </>
        )}

        <div style={{ marginTop: 16 }}>
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
            label="Warmth"
            value={settings.sepia}
            min={0}
            max={50}
            unit="%"
            onChange={(sepia) => update({ sepia, preset: 'custom' })}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <Toggle
            label="Preserve images & media"
            description="Counter-invert photos and videos"
            checked={settings.preserveMedia}
            onChange={(preserveMedia) => update({ preserveMedia })}
          />
        </div>
      </div>

      <footer className="popup-footer">
        <a className="popup-link" href="#" onClick={(e) => { e.preventDefault(); browser.runtime.openOptionsPage(); }}>
          Settings
        </a>
        <span className="popup-version">v1.0.0</span>
      </footer>
    </div>
  );
}
