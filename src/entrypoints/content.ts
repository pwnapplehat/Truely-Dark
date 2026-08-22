import { detectFromDom } from '../lib/detect';
import { applyDarkMode, injectPreloadCss, removeDarkMode } from '../lib/engine';
import { sendMessage } from '../lib/messaging';
import { resolveEffectiveSettings } from '../lib/resolver';
import { getHostnameFromUrl, getOriginFromUrl } from '../lib/site-packs';
import type { DetectionOutcome, TruelyDarkMessage } from '../types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  allFrames: true,
  matchAboutBlank: true,
  registration: 'manifest',
  main() {
    injectPreloadCss();

    let detectObserver: MutationObserver | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let batterySaver = false;

    const origin = getOriginFromUrl(window.location.href);
    const hostname = getHostnameFromUrl(window.location.href);

    async function runDetection(useCacheOnly: boolean): Promise<DetectionOutcome> {
      if (useCacheOnly) {
        return { result: 'unknown', confidence: 'low' };
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

    async function refresh(): Promise<void> {
      try {
        const fullSettings = await sendMessage<import('../types').TruelyDarkSettings>({
          type: 'GET_SETTINGS',
        });

        batterySaver = fullSettings.batterySaver;

        const siteMode =
          fullSettings.siteOverrides[origin]?.mode ?? fullSettings.defaultMode;

        // Zero-cost path for excluded origins
        if (!fullSettings.enabled || siteMode === 'off') {
          removeDarkMode();
          return;
        }

        const useCacheOnly = batterySaver;
        const detectOutcome = await runDetection(useCacheOnly);

        if (!useCacheOnly) {
          await reportDetection(detectOutcome);
        }

        const effective = resolveEffectiveSettings({
          origin,
          hostname,
          settings: fullSettings,
          detectOutcome,
        });

        if (effective.skipProcessing && !effective.active) {
          removeDarkMode();
          return;
        }

        if (effective.active) {
          applyDarkMode(effective);
        } else {
          removeDarkMode();
        }
      } catch {
        // Extension context invalidated or background unavailable
      }
    }

    function debouncedRefresh(): void {
      if (batterySaver) return;
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
            (m.attributeName === 'data-theme' ||
              m.attributeName === 'data-color-mode' ||
              m.attributeName === 'data-mode' ||
              m.attributeName === 'class' ||
              m.attributeName === 'style'),
        );
        if (relevant) debouncedRefresh();
      });

      const target = document.documentElement;
      if (target) {
        detectObserver.observe(target, {
          attributes: true,
          attributeFilter: ['data-theme', 'data-color-mode', 'data-mode', 'class', 'style'],
        });
      }

      if (document.body) {
        detectObserver.observe(document.body, {
          attributes: true,
          attributeFilter: ['data-theme', 'data-color-mode', 'data-mode', 'class', 'style'],
        });
      } else {
        document.addEventListener(
          'DOMContentLoaded',
          () => {
            if (document.body && detectObserver) {
              detectObserver.observe(document.body, {
                attributes: true,
                attributeFilter: ['data-theme', 'data-color-mode', 'data-mode', 'class', 'style'],
              });
            }
          },
          { once: true },
        );
      }
    }

    function onMessage(message: TruelyDarkMessage): void {
      if (message.type === 'SETTINGS_CHANGED') {
        if (batterySaver) {
          refresh();
        } else {
          debouncedRefresh();
        }
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
      if (!batterySaver) debouncedRefresh();
    });

    window.addEventListener('beforeunload', () => {
      if (detectObserver) detectObserver.disconnect();
      browser.runtime.onMessage.removeListener(onMessage);
    });
  },
});
