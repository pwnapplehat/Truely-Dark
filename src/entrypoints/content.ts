import { detectFromDom } from '../lib/detect';
import { applyDarkMode, injectPreloadCss, removeDarkMode } from '../lib/engine';
import { sendMessage } from '../lib/messaging';
import { resolveEffectiveSettings } from '../lib/resolver';
import { getHostnameFromUrl, getOriginFromUrl } from '../lib/site-packs';
import type { DetectResult, EffectiveSiteSettings, TruelyDarkMessage } from '../types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  allFrames: true,
  matchAboutBlank: true,
  registration: 'manifest',
  main() {
    // Flash-resistant preload — runs before first paint
    injectPreloadCss();

    let currentSettings: EffectiveSiteSettings | null = null;
    let detectObserver: MutationObserver | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const origin = getOriginFromUrl(window.location.href);
    const hostname = getHostnameFromUrl(window.location.href);

    async function runDetection(): Promise<DetectResult> {
      if (document.readyState === 'loading') {
        await new Promise<void>((resolve) => {
          document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
        });
      }
      return detectFromDom();
    }

    async function reportDetection(result: DetectResult): Promise<void> {
      if (!origin) return;
      try {
        await sendMessage({
          type: 'DETECT_RESULT',
          payload: { origin, result },
        });
      } catch {
        // Background may not be ready yet
      }
    }

    async function refresh(): Promise<void> {
      try {
        const detectResult = await runDetection();
        await reportDetection(detectResult);

        const fullSettings = await sendMessage<import('../types').TruelyDarkSettings>({
          type: 'GET_SETTINGS',
        });

        const effective = resolveEffectiveSettings({
          origin,
          hostname,
          settings: fullSettings,
          detectResult,
        });

        currentSettings = effective;

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
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => refresh(), 300);
    }

    function setupMutationObserver(): void {
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
        debouncedRefresh();
      }
    }

    browser.runtime.onMessage.addListener(onMessage);

    // Initial apply
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        refresh();
        setupMutationObserver();
      });
    } else {
      refresh();
      setupMutationObserver();
    }

    // Re-apply on navigation in SPAs (history API)
    window.addEventListener('pageshow', () => debouncedRefresh());

    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
      if (detectObserver) detectObserver.disconnect();
      browser.runtime.onMessage.removeListener(onMessage);
    });
  },
});
