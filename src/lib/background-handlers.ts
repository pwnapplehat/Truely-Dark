import type {
  DetectConfidence,
  DetectResult,
  SiteMode,
  TabInfo,
  TruelyDarkMessage,
  TruelyDarkSettings,
} from '../types';
import { DETECT_CACHE_TTL_MS } from '../types';
import { applyPreset, migrateSettings } from './defaults';
import { purgePoisonedDetectCache } from './detect';
import { getHostnameFromUrl, getOriginFromUrl } from './site-packs';
import {
  cycleSiteMode,
  getSiteMode,
  resolveEffectiveSettings,
} from './resolver';
import { isConfigurableWebPage } from './restricted-hosts';
import { getSettings, setSettings, updateSettings } from './storage';
import { broadcastSettingsChanged, onMessage } from './messaging';
import { getSystemDarkPreference } from './schedule';
import { settingsSchema } from './schema';
import {
  insertSoftCssForTab,
  maybeProactiveInsertCss,
  removeSoftCssForTab,
} from './insert-css-fallback';

/** Per-tab Soft filter verification from content scripts. */
const tabSoftApplied = new Map<number, boolean | undefined>();

function markTabNavigation(tabId: number): void {
  tabSoftApplied.set(tabId, undefined);
}

async function purgeStaleDetectCache(): Promise<void> {
  const settings = await getSettings();
  const cleaned = purgePoisonedDetectCache(settings.detectCache);
  if (Object.keys(cleaned).length !== Object.keys(settings.detectCache).length) {
    await updateSettings({ detectCache: cleaned });
  }
}

async function buildTabInfo(
  url: string,
  settings: TruelyDarkSettings,
  tabId?: number,
): Promise<TabInfo> {
  const pageRestricted = !isConfigurableWebPage(url);

  if (pageRestricted) {
    return {
      origin: '',
      hostname: '',
      url,
      effectiveMode: 'off',
      resolvedMode: 'off',
      active: false,
      globalEnabled: settings.enabled,
      nativeDark: false,
      pageRestricted: true,
      softApplied: false,
      injectionPending: false,
    };
  }

  const origin = getOriginFromUrl(url);
  const hostname = getHostnameFromUrl(url);
  const systemDark = await getSystemDarkPreference();
  const effective = resolveEffectiveSettings({
    origin,
    hostname,
    settings,
    systemDark,
  });

  const reportedApplied = tabId !== undefined ? tabSoftApplied.get(tabId) : undefined;
  const injectionPending = effective.active && reportedApplied === undefined;
  const softApplied = effective.active && reportedApplied === true;

  return {
    origin,
    hostname,
    url,
    effectiveMode: getSiteMode(settings, origin),
    resolvedMode: effective.mode,
    active: effective.active,
    globalEnabled: settings.enabled,
    nativeDark: effective.nativeDark,
    pageRestricted: false,
    softApplied,
    injectionPending,
  };
}

async function handleToggleGlobal(): Promise<TruelyDarkSettings> {
  const settings = await getSettings();
  const updated = await updateSettings({ enabled: !settings.enabled });
  await broadcastSettingsChanged();
  return updated;
}

async function handleToggleSite(origin: string): Promise<TruelyDarkSettings> {
  const settings = await getSettings();
  const currentMode = getSiteMode(settings, origin);
  const newMode = cycleSiteMode(currentMode);

  const overrides = { ...settings.siteOverrides };
  overrides[origin] = {
    mode: newMode,
    addedAt: Date.now(),
  };

  const updated = await updateSettings({ siteOverrides: overrides });
  await broadcastSettingsChanged();
  return updated;
}

async function handleSetSiteMode(origin: string, mode: SiteMode): Promise<TruelyDarkSettings> {
  const settings = await getSettings();
  const overrides = { ...settings.siteOverrides };
  overrides[origin] = { mode, addedAt: Date.now() };
  const updated = await updateSettings({ siteOverrides: overrides });
  await broadcastSettingsChanged();
  return updated;
}

async function handleDetectResult(
  origin: string,
  result: DetectResult,
  confidence: DetectConfidence,
): Promise<boolean> {
  const settings = await getSettings();
  const previous = settings.detectCache[origin];
  if (previous?.result === result && previous?.confidence === confidence) {
    return false;
  }

  const detectCache = { ...settings.detectCache };
  detectCache[origin] = { result, confidence, timestamp: Date.now() };

  for (const [key, entry] of Object.entries(detectCache)) {
    if (Date.now() - entry.timestamp > DETECT_CACHE_TTL_MS) {
      delete detectCache[key];
    }
  }

  await updateSettings({ detectCache });
  return true;
}

async function handleImportSettings(data: unknown): Promise<TruelyDarkSettings> {
  const parsed = settingsSchema.parse(data);
  await setSettings(parsed as TruelyDarkSettings);
  await broadcastSettingsChanged();
  return parsed as TruelyDarkSettings;
}

export function registerBackgroundHandlers(): void {
  void purgeStaleDetectCache();

  onMessage(async (message, sender) => {
    switch (message.type) {
      case 'GET_SETTINGS':
        return await getSettings();

      case 'UPDATE_SETTINGS':
        const partial = message.payload as Partial<TruelyDarkSettings>;
        const updated = await updateSettings(partial);
        await broadcastSettingsChanged();
        return updated;

      case 'TOGGLE_GLOBAL':
        return await handleToggleGlobal();

      case 'TOGGLE_SITE':
        const origin =
          (message.payload as { origin?: string })?.origin ??
          (sender.tab?.url ? getOriginFromUrl(sender.tab.url) : '');
        if (!origin) return await getSettings();
        return await handleToggleSite(origin);

      case 'SET_SITE_MODE':
        const { origin: setOrigin, mode } = message.payload as {
          origin: string;
          mode: SiteMode;
        };
        return await handleSetSiteMode(setOrigin, mode);

      case 'APPLY_PRESET':
        const presetId = message.payload as TruelyDarkSettings['preset'];
        const current = await getSettings();
        const withPreset = applyPreset(current, presetId);
        await setSettings(withPreset);
        await broadcastSettingsChanged();
        return withPreset;

      case 'EXPORT_SETTINGS':
        const exportSettings = await getSettings();
        return {
          version: 1,
          settings: exportSettings,
          exportedAt: new Date().toISOString(),
        };

      case 'IMPORT_SETTINGS':
        const importData = message.payload as { settings?: unknown };
        if (importData?.settings) {
          return await handleImportSettings(importData.settings);
        }
        return await handleImportSettings(message.payload);

      case 'GET_TAB_INFO':
        let tabUrl =
          (message.payload as { url?: string })?.url ?? sender.tab?.url ?? '';
        let tabId = sender.tab?.id;
        if (!tabUrl) {
          const [activeTab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
          });
          tabUrl = activeTab?.url ?? '';
          tabId = activeTab?.id;
        }
        const tabSettings = await getSettings();
        return await buildTabInfo(tabUrl, tabSettings, tabId);

      case 'INJECTION_STATUS':
        const injectionTabId = sender.tab?.id;
        const { applied } = message.payload as { applied: boolean };
        if (injectionTabId !== undefined) {
          tabSoftApplied.set(injectionTabId, applied);
          if (!applied) {
            const tabUrl = sender.tab?.url ?? '';
            if (tabUrl) {
              await maybeProactiveInsertCss(injectionTabId, tabUrl);
            }
          }
        }
        return { success: true };

      case 'INSERT_CSS_FALLBACK':
        const fallbackTabId = sender.tab?.id;
        const fallbackUrl = sender.tab?.url ?? '';
        const filterTarget =
          (message.payload as { filterTarget?: 'html' | 'body' })?.filterTarget ?? 'html';
        if (fallbackTabId && fallbackUrl) {
          const inserted = await insertSoftCssForTab(fallbackTabId, fallbackUrl, filterTarget);
          if (!inserted && filterTarget === 'html') {
            await insertSoftCssForTab(fallbackTabId, fallbackUrl, 'body');
          }
        }
        return { success: true };

      case 'REMOVE_INSERT_CSS':
        const removeTabId = sender.tab?.id ?? (message.payload as { tabId?: number })?.tabId;
        if (removeTabId !== undefined) {
          await removeSoftCssForTab(removeTabId);
        }
        return { success: true };

      case 'GET_EFFECTIVE_SETTINGS':
        const effUrl =
          (message.payload as { url?: string })?.url ?? sender.tab?.url ?? '';
        const effOrigin = getOriginFromUrl(effUrl);
        const effHostname = getHostnameFromUrl(effUrl);
        const effSettings = await getSettings();
        const systemDark = await getSystemDarkPreference();
        return resolveEffectiveSettings({
          origin: effOrigin,
          hostname: effHostname,
          settings: effSettings,
          systemDark,
        });

      case 'DETECT_RESULT':
        const { origin: detectOrigin, result, confidence } = message.payload as {
          origin: string;
          result: DetectResult;
          confidence: DetectConfidence;
        };
        const changed = await handleDetectResult(detectOrigin, result, confidence ?? 'medium');
        if (changed) {
          await broadcastSettingsChanged();
        }
        return { success: true };

      default:
        return { error: 'Unknown message type' };
    }
  });

  browser.commands.onCommand.addListener(async (command: string) => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (command === 'toggle-global') {
      await handleToggleGlobal();
    } else if (command === 'toggle-site' && activeTab?.url) {
      const origin = getOriginFromUrl(activeTab.url);
      if (origin) await handleToggleSite(origin);
    }
  });

  // Schedule alarm — re-check every minute when schedule is enabled
  browser.alarms.create('schedule-check', { periodInMinutes: 1 });
  browser.alarms.onAlarm.addListener(async (alarm: Browser.alarms.Alarm) => {
    if (alarm.name === 'schedule-check') {
      const settings = await getSettings();
      if (settings.schedule.enabled) {
        await broadcastSettingsChanged();
      }
    }
  });

  browser.tabs.onRemoved.addListener((tabId: number) => {
    tabSoftApplied.delete(tabId);
    void removeSoftCssForTab(tabId);
  });

  browser.tabs.onUpdated.addListener(
    async (tabId: number, changeInfo: { status?: string }, tab: Browser.tabs.Tab) => {
      if (changeInfo.status === 'loading') {
        markTabNavigation(tabId);
      }
      if (changeInfo.status === 'loading' && tab.url) {
        await maybeProactiveInsertCss(tabId, tab.url);
      }
    },
  );
}
