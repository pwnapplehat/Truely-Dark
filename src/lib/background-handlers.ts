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
import { getHostnameFromUrl, getOriginFromUrl, hostPrefersForceStylesheet } from './site-packs';
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
  applyInvertSupplementForTabIfNeeded,
  applyPreferForceMainWorldForTab,
  escalatePreferForceMainWorldForTab,
} from './force-main-world';
import { gestureActivateSoftForTab } from './gesture-activate';
import {
  insertSoftCssForTab,
  maybeProactiveInsertCss,
  removeSoftCssForTab,
} from './insert-css-fallback';
import { isChromeGalleryHost, isChromeGalleryUrl } from './gallery-access';
import {
  clearGalleryGestureAttempted,
  isGalleryGestureAttempted,
} from './gallery-gesture-state';
import { ensureGalleryTabSettled, settleGalleryTabBlocked } from './gallery-tab-status';
import { isPopupLikelyOpen, isPopupSender, markPopupOpen } from './popup-state';
import {
  clearTabSoftApplied,
  getTabSoftApplied,
  isInjectionResolveInFlight,
  isTabSoftAppliedSettled,
  markTabNavigation,
  settleTabSoftApplied,
  setTabSoftApplied,
} from './tab-injection-state';

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
      galleryHost: false,
      galleryInjectionBlocked: false,
      enableOnRestrictedPages: settings.enableOnRestrictedPages,
      galleryGestureAttempted: false,
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

  const reportedApplied = getTabSoftApplied(tabId);
  const galleryHost = isChromeGalleryHost(hostname);

  if (galleryHost && effective.active && tabId !== undefined) {
    settleGalleryTabBlocked(tabId);
  }

  const resolvedApplied =
    tabId !== undefined && galleryHost && effective.active
      ? getTabSoftApplied(tabId)
      : reportedApplied;
  const injectionPending = effective.active && resolvedApplied === undefined;
  const softApplied = effective.active && resolvedApplied === true;
  const galleryGestureAttempted =
    tabId !== undefined ? isGalleryGestureAttempted(tabId) : false;
  const enableOnRestrictedPages = settings.enableOnRestrictedPages;
  const galleryInjectionBlocked = galleryHost && effective.active && !softApplied;

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
    galleryHost,
    galleryInjectionBlocked,
    enableOnRestrictedPages,
    galleryGestureAttempted,
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
    if (isPopupSender(sender)) {
      markPopupOpen();
    }

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
        if (isPopupSender(sender)) {
          markPopupOpen();
        }
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
        const injectionWindowId = sender.tab?.windowId;
        const injectionUrl = sender.tab?.url ?? '';
        const { contentStrict } = message.payload as { contentStrict: boolean };

        if (injectionTabId !== undefined) {
          const injectionHostname = getHostnameFromUrl(injectionUrl);
          if (contentStrict && !isChromeGalleryHost(injectionHostname)) {
            setTabSoftApplied(injectionTabId, true);
            if (hostPrefersForceStylesheet(injectionHostname) && injectionUrl) {
              void applyPreferForceMainWorldForTab(injectionTabId, injectionUrl);
            }
            return { success: true };
          }

          if (isChromeGalleryHost(injectionHostname)) {
            settleGalleryTabBlocked(injectionTabId);
            return { success: true };
          }

          if (hostPrefersForceStylesheet(injectionHostname) && injectionUrl) {
            void escalatePreferForceMainWorldForTab(injectionTabId, injectionUrl);
          }

          if (
            isInjectionResolveInFlight(injectionTabId) ||
            isTabSoftAppliedSettled(injectionTabId)
          ) {
            return { success: true };
          }

          if (injectionWindowId !== undefined && injectionUrl) {
            await settleTabSoftApplied(
              injectionTabId,
              injectionWindowId,
              injectionUrl,
              contentStrict,
            );
          } else {
            setTabSoftApplied(injectionTabId, false);
          }
        }
        return { success: true };

      case 'GESTURE_ACTIVATE_SOFT':
        markPopupOpen();
        const gestureSettings = await getSettings();
        const [gestureTab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (
          gestureTab?.id !== undefined &&
          gestureTab.url &&
          gestureTab.windowId !== undefined
        ) {
          const applied = await gestureActivateSoftForTab(
            gestureTab.id,
            gestureTab.windowId,
            gestureTab.url,
            { enableOnRestrictedPages: gestureSettings.enableOnRestrictedPages },
          );
          return { success: true, applied };
        }
        return { success: false, applied: false };

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

      case 'APPLY_MAIN_WORLD_FORCE':
        const forceTabId = sender.tab?.id;
        const forceUrl = sender.tab?.url ?? '';
        if (forceTabId && forceUrl) {
          await escalatePreferForceMainWorldForTab(forceTabId, forceUrl);
        }
        return { success: true };

      case 'INSERT_INVERT_SUPPLEMENT':
        const supTabId = sender.tab?.id;
        const supUrl = sender.tab?.url ?? '';
        if (supTabId && supUrl) {
          await applyInvertSupplementForTabIfNeeded(supTabId, supUrl);
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
    clearTabSoftApplied(tabId);
    clearGalleryGestureAttempted(tabId);
    void removeSoftCssForTab(tabId);
  });

  browser.tabs.onUpdated.addListener(
    async (tabId: number, changeInfo: { status?: string; url?: string }, tab: Browser.tabs.Tab) => {
      if (changeInfo.url) {
        markTabNavigation(tabId);
        clearGalleryGestureAttempted(tabId);
        if (tab.url) {
          void ensureGalleryTabSettled(tabId, tab.url);
        }
      }
      if (changeInfo.status === 'loading' && tab.url) {
        await maybeProactiveInsertCss(tabId, tab.url);
      }
      if (
        changeInfo.status === 'complete' &&
        tab.url &&
        tab.windowId !== undefined &&
        !isTabSoftAppliedSettled(tabId)
      ) {
        const settings = await getSettings();
        const info = await buildTabInfo(tab.url, settings, tabId);
        if (info.pageRestricted || !info.active) {
          setTabSoftApplied(tabId, false);
        } else if (isChromeGalleryUrl(tab.url)) {
          settleGalleryTabBlocked(tabId);
        } else if (!isPopupLikelyOpen()) {
          await settleTabSoftApplied(tabId, tab.windowId, tab.url, false);
        }
      }
    },
  );
}
