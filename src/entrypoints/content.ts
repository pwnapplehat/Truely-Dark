import { detectFromDom } from '../lib/detect';
import {
  applyDarkMode,
  buildFilterString,
  computePreInvertBackground,
  injectPreloadCss,
  isDarkModeActive,
  isForceStylesheetActive,
  isSoftFilterActive,
  refreshShadowDomMediaFilters,
  removeDarkMode,
} from '../lib/engine';
import {
  pierceOpenShadowRoots,
  generateShadowInvertPrepCss,
  SHADOW_FILTER_STYLE_ID,
} from '../lib/shadow-force';
import { sendMessage } from '../lib/messaging';
import { resolveEffectiveSettings } from '../lib/resolver';
import {
  getHostnameFromUrl,
  getOriginFromUrl,
  hostRequiresVisualVerify,
  hostUsesInjectCssFallback,
  isExcludedOrigin,
} from '../lib/site-packs';
import type { DetectionOutcome, EffectiveSiteSettings, TruelyDarkMessage } from '../types';

const THEME_ATTRS = ['data-theme', 'data-color-mode', 'data-mode', 'data-dark-theme', 'class'];

const THEME_CLASS_PATTERN = /\b(theme|dark|light|color-scheme|color-mode)\b/i;

function isThemeRelatedMutation(mutation: MutationRecord): boolean {
  if (mutation.type !== 'attributes' || !mutation.attributeName) return false;
  const name = mutation.attributeName;
  if (name !== 'class') return THEME_ATTRS.includes(name);
  const target = mutation.target;
  if (!(target instanceof Element)) return false;
  if (target !== document.documentElement && target !== document.body) return false;
  return THEME_CLASS_PATTERN.test(target.className);
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  allFrames: true,
  matchAboutBlank: true,
  registration: 'manifest',
  main() {
    injectPreloadCss();

    let detectObserver: MutationObserver | null = null;
    let styleGuardObserver: MutationObserver | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let batterySaver = false;
    let lastEffectiveSettings: EffectiveSiteSettings | null = null;
    let lastDetectOutcome: DetectionOutcome | undefined;
    let injectionStatusReported = false;

    const origin = getOriginFromUrl(window.location.href);
    const hostname = getHostnameFromUrl(window.location.href);

    async function reportInjectionStatus(contentStrict: boolean): Promise<void> {
      if (hostRequiresVisualVerify(hostname) && injectionStatusReported && !contentStrict) {
        return;
      }
      if (contentStrict) {
        injectionStatusReported = true;
      } else if (!injectionStatusReported) {
        injectionStatusReported = true;
      }
      try {
        await sendMessage({
          type: 'INJECTION_STATUS',
          payload: { contentStrict },
        });
      } catch {
        // Background may not be ready yet
      }
    }

    async function runDetection(useCacheOnly: boolean): Promise<DetectionOutcome | undefined> {
      if (useCacheOnly) {
        return undefined;
      }

      if (document.readyState === 'loading') {
        await new Promise<void>((resolve) => {
          document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
        });
      }
      return detectFromDom();
    }

    async function reportDetection(outcome: DetectionOutcome): Promise<void> {
      if (!origin || outcome.result === 'unknown') return;
      if (
        lastDetectOutcome?.result === outcome.result &&
        lastDetectOutcome?.confidence === outcome.confidence
      ) {
        return;
      }
      lastDetectOutcome = outcome;
      try {
        await sendMessage({
          type: 'DETECT_RESULT',
          payload: {
            origin,
            result: outcome.result,
            confidence: outcome.confidence,
          },
        });
      } catch {
        // Background may not be ready yet
      }
    }

    async function requestInsertCssFallback(filterTarget: 'html' | 'body'): Promise<void> {
      try {
        await sendMessage({
          type: 'INSERT_CSS_FALLBACK',
          payload: { filterTarget },
        });
      } catch {
        // Background may not be ready
      }
    }

    async function requestRemoveInsertCss(): Promise<void> {
      try {
        await sendMessage({ type: 'REMOVE_INSERT_CSS' });
      } catch {
        // Background may not be ready
      }
    }

    async function applyWithVerification(settings: EffectiveSiteSettings): Promise<boolean> {
      if (isForceStylesheetActive()) {
        await reportInjectionStatus(false);
        return false;
      }

      applyDarkMode(settings);
      let contentStrict = isSoftFilterActive();

      if (!contentStrict && hostUsesInjectCssFallback(hostname)) {
        await requestInsertCssFallback('html');
        applyDarkMode(settings);
        contentStrict = isSoftFilterActive();
        if (!contentStrict) {
          await requestInsertCssFallback('body');
          applyDarkMode(settings);
          contentStrict = isSoftFilterActive();
        }
      }

      if (!contentStrict) {
        applyDarkMode(settings);
        refreshShadowDomMediaFilters(settings);
        contentStrict = isSoftFilterActive();
        pierceOpenShadowRoots(document, generateShadowInvertPrepCss(), SHADOW_FILTER_STYLE_ID);
      }

      document.dispatchEvent(
        new CustomEvent('truely-dark-main-apply', {
          detail: {
            filter: buildFilterString(settings.brightness, settings.contrast, settings.sepia),
            bg: computePreInvertBackground(settings.backgroundColor),
            text: '#000000',
            mode: settings.mode,
            shadowFilterCss: generateShadowInvertPrepCss(),
            watchShadows: hostRequiresVisualVerify(hostname),
          },
        }),
      );

      await reportInjectionStatus(contentStrict);

      if (hostRequiresVisualVerify(hostname)) {
        return false;
      }
      return contentStrict;
    }

    function scheduleSoftRetries(settings: EffectiveSiteSettings): void {
      const retry = async (): Promise<void> => {
        if (!lastEffectiveSettings?.active) return;
        if (isForceStylesheetActive()) {
          await reportInjectionStatus(false);
          return;
        }
        await applyWithVerification(settings);
        refreshShadowDomMediaFilters(settings);
      };

      requestAnimationFrame(() => void retry());
      window.setTimeout(() => void retry(), 300);
      window.setTimeout(() => void retry(), 500);
      window.setTimeout(() => void retry(), 2000);
      window.setTimeout(() => void retry(), 5000);
    }

    function setupStyleGuard(settings: EffectiveSiteSettings): void {
      if (styleGuardObserver) styleGuardObserver.disconnect();

      styleGuardObserver = new MutationObserver(() => {
        if (!lastEffectiveSettings?.active) return;
        const styleMissing = !document.getElementById('truely-dark-styles');
        const attrMissing = !isDarkModeActive();
        if (styleMissing || attrMissing) {
          void applyWithVerification(settings);
        }
      });

      const head = document.head ?? document.documentElement;
      styleGuardObserver.observe(head, { childList: true, subtree: true });
      styleGuardObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-truely-dark-active', 'data-truely-dark-filter-target', 'style'],
      });
    }

    async function refresh(): Promise<void> {
      try {
        const fullSettings = await sendMessage<import('../types').TruelyDarkSettings>({
          type: 'GET_SETTINGS',
        });

        batterySaver = fullSettings.batterySaver;

        const siteMode =
          fullSettings.siteOverrides[origin]?.mode ?? fullSettings.defaultMode;

        if (!fullSettings.enabled || siteMode === 'off' || isExcludedOrigin(hostname, siteMode)) {
          lastEffectiveSettings = null;
          removeDarkMode();
          void requestRemoveInsertCss();
          void reportInjectionStatus(false);
          return;
        }

        const useCacheOnly = batterySaver;
        const detectOutcome = await runDetection(useCacheOnly);

        if (detectOutcome) {
          await reportDetection(detectOutcome);
        }

        const effective = resolveEffectiveSettings({
          origin,
          hostname,
          settings: fullSettings,
          detectOutcome,
        });

        lastEffectiveSettings = effective;

        if (effective.skipProcessing && !effective.active) {
          removeDarkMode();
          void requestRemoveInsertCss();
          void reportInjectionStatus(false);
          return;
        }

        if (effective.active) {
          await applyWithVerification(effective);
          setupStyleGuard(effective);
          scheduleSoftRetries(effective);
        } else {
          removeDarkMode();
          void requestRemoveInsertCss();
          void reportInjectionStatus(false);
        }
      } catch {
        // Extension context invalidated or background unavailable
      }
    }

    function debouncedRefresh(): void {
      if (batterySaver) {
        refresh();
        return;
      }
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => refresh(), 300);
    }

    function setupMutationObserver(): void {
      if (batterySaver) return;
      if (detectObserver) detectObserver.disconnect();

      detectObserver = new MutationObserver((mutations) => {
        const relevant = mutations.some(isThemeRelatedMutation);
        if (relevant) debouncedRefresh();
      });

      const target = document.documentElement;
      if (target) {
        detectObserver.observe(target, {
          attributes: true,
          attributeFilter: THEME_ATTRS,
        });
      }

      if (document.body) {
        detectObserver.observe(document.body, {
          attributes: true,
          attributeFilter: THEME_ATTRS,
        });
      } else {
        document.addEventListener(
          'DOMContentLoaded',
          () => {
            if (document.body && detectObserver) {
              detectObserver.observe(document.body, {
                attributes: true,
                attributeFilter: THEME_ATTRS,
              });
            }
          },
          { once: true },
        );
      }
    }

    function onMessage(message: TruelyDarkMessage): void {
      if (message.type === 'SETTINGS_CHANGED') {
        debouncedRefresh();
      }
    }

    browser.runtime.onMessage.addListener(onMessage);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        refresh();
        setupMutationObserver();
      });
    } else {
      refresh();
      setupMutationObserver();
    }

    window.addEventListener('pageshow', () => {
      injectionStatusReported = false;
      debouncedRefresh();
    });
    window.addEventListener('popstate', () => {
      injectionStatusReported = false;
      debouncedRefresh();
    });
    window.addEventListener('hashchange', () => {
      injectionStatusReported = false;
      debouncedRefresh();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') debouncedRefresh();
    });

    window.addEventListener('beforeunload', () => {
      if (detectObserver) detectObserver.disconnect();
      if (styleGuardObserver) styleGuardObserver.disconnect();
      browser.runtime.onMessage.removeListener(onMessage);
    });
  },
});
