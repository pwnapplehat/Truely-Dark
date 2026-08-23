import { useCallback, useEffect, useState } from 'react';
import { CollapsibleSection, ModeSelector, Slider, Toggle } from '../../components/Controls';
import '../../components/controls.css';
import '../../assets/global.css';
import { sendMessage } from '../../lib/messaging';
import { siteStatusLabel, statusDotClass } from '../../lib/tab-status';
import type { SiteMode, TabInfo, TruelyDarkSettings } from '../../types';
import './popup.css';

export { siteStatusLabel, statusDotClass };

export function PopupApp() {
  const [settings, setSettings] = useState<TruelyDarkSettings | null>(null);
  const [tabInfo, setTabInfo] = useState<TabInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadTabInfo = useCallback(async () => {
    const tab = await sendMessage<TabInfo>({ type: 'GET_TAB_INFO' });
    setTabInfo(tab);
    return tab;
  }, []);

  const load = useCallback(async () => {
    try {
      const s = await sendMessage<TruelyDarkSettings>({ type: 'GET_SETTINGS' });
      setSettings(s);
      await loadTabInfo();
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [loadTabInfo]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!tabInfo?.injectionPending) return undefined;

    const interval = window.setInterval(() => {
      loadTabInfo().then((tab) => {
        if (!tab.injectionPending) {
          window.clearInterval(interval);
        }
      });
    }, 400);

    return () => window.clearInterval(interval);
  }, [tabInfo?.injectionPending, loadTabInfo]);

  const update = useCallback(async (partial: Partial<TruelyDarkSettings>) => {
    const updated = await sendMessage<TruelyDarkSettings>({
      type: 'UPDATE_SETTINGS',
      payload: partial,
    });
    setSettings(updated);
    await loadTabInfo();
  }, [loadTabInfo]);

  const setSiteMode = useCallback(
    async (mode: SiteMode) => {
      if (!tabInfo?.origin) return;
      const updated = await sendMessage<TruelyDarkSettings>({
        type: 'SET_SITE_MODE',
        payload: { origin: tabInfo.origin, mode },
      });
      setSettings(updated);
      await loadTabInfo();
    },
    [tabInfo?.origin, loadTabInfo],
  );

  if (loading) {
    return <div className="popup popup-loading">Loading…</div>;
  }

  if (error || !settings) {
    return (
      <div className="popup popup-loading">
        <p>Could not load settings.</p>
        <button type="button" className="popup-retry" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  const isRestrictedPage = tabInfo?.pageRestricted || !tabInfo?.hostname;

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

        {isRestrictedPage ? (
          <div className="popup-empty">
            {tabInfo?.pageRestricted
              ? 'Browser blocks dark mode on this page (chrome://, about:, etc.).'
              : 'Open a regular webpage to configure per-site settings.'}
          </div>
        ) : (
          <>
            <div className="popup-site">{tabInfo.hostname}</div>
            <div className="popup-status">
              <span className={`popup-status-dot ${statusDotClass(tabInfo)}`} />
              {siteStatusLabel(tabInfo)}
            </div>
            <ModeSelector value={tabInfo.effectiveMode} onChange={setSiteMode} />
          </>
        )}

        <CollapsibleSection title="Advanced">
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
          <Toggle
            label="Preserve images & media"
            description="Counter-invert photos and videos"
            checked={settings.preserveMedia}
            onChange={(preserveMedia) => update({ preserveMedia })}
          />
        </CollapsibleSection>
      </div>

      <footer className="popup-footer">
        <button
          type="button"
          className="popup-link"
          onClick={() => browser.runtime.openOptionsPage()}
        >
          All settings
        </button>
        <span className="popup-version">v1.0.0</span>
      </footer>
    </div>
  );
}
