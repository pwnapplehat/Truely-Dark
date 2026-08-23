import { detectFromDom } from '../lib/detect';
import {
  applyDarkMode,
  injectPreloadCss,
  isDarkModeActive,
  isSoftFilterActive,
  refreshShadowDomMediaFilters,
  removeDarkMode,
} from '../lib/engine';
import { sendMessage } from '../lib/messaging';
import { resolveEffectiveSettings } from '../lib/resolver';
import { getHostnameFromUrl, getOriginFromUrl, isExcludedOrigin } from '../lib/site-packs';
import type { DetectionOutcome, EffectiveSiteSettings, TruelyDarkMessage } from '../types';

const THEME_ATTRS = ['data-theme', 'data-color-mode', 'data-mode', 'data-dark-theme'];

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

    const origin = getOriginFromUrl(window.location.href);
    const hostname = getHostnameFromUrl(window.location.href);

    async function reportInjectionStatus(applied: boolean): Promise<void> {
      try {
        await sendMessage({
          type: 'INJECTION_STATUS',
          payload: { applied },
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

    function applyWithVerification(settings: EffectiveSiteSettings): boolean {
      applyDarkMode(settings);
      if (isSoftFilterActive()) return true;

      applyDarkMode(settings);
      refreshShadowDomMediaFilters(settings);

      return isSoftFilterActive();
    }

    function scheduleSoftRetries(settings: EffectiveSiteSettings): void {
      const retry = (): void => {
        if (!lastEffectiveSettings?.active) return;
        const applied = applyWithVerification(settings);
        refreshShadowDomMediaFilters(settings);
        void reportInjectionStatus(applied);
      };

      requestAnimationFrame(retry);
      window.setTimeout(retry, 300);
      window.setTimeout(retry, 500);
      window.setTimeout(retry, 2000);
      window.setTimeout(retry, 5000);
    }

    function setupStyleGuard(settings: EffectiveSiteSettings): void {
      if (styleGuardObserver) styleGuardObserver.disconnect();

      styleGuardObserver = new MutationObserver(() => {
        if (!lastEffectiveSettings?.active) return;
        const styleMissing = !document.getElementById('truely-dark-styles');
        const attrMissing = !isDarkModeActive();
        if (styleMissing || attrMissing) {
          const applied = applyWithVerification(settings);
          void reportInjectionStatus(applied);
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
          void reportInjectionStatus(false);
          return;
        }

        if (effective.active) {
          const applied = applyWithVerification(effective);
          void reportInjectionStatus(applied);
          setupStyleGuard(effective);
          scheduleSoftRetries(effective);
        } else {
          removeDarkMode();
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
        const relevant = mutations.some(
          (m) =>
            m.type === 'attributes' &&
            m.attributeName !== null &&
            THEME_ATTRS.includes(m.attributeName),
        );
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

    window.addEventListener('pageshow', () => debouncedRefresh());
    window.addEventListener('popstate', () => debouncedRefresh());
    window.addEventListener('hashchange', () => debouncedRefresh());
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
