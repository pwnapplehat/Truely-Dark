import { detectFromDom } from '../lib/detect';
import {
  applyDarkMode,
  buildFilterString,
  computePreInvertBackground,
  effectivePrefersForceSoft,
  generateForceStylesheetCss,
  injectPreloadCss,
  isDarkModeActive,
  isSoftFilterActive,
  removeDarkMode,
  stripInvertSoftArtifacts,
} from '../lib/engine';
import { computedFilterHasStrictInvert } from '../lib/filter-verify';
import {
  pierceOpenShadowRoots,
  generateShadowForceCss,
  generateShadowInvertPrepCss,
  SHADOW_FILTER_STYLE_ID,
  SHADOW_FORCE_STYLE_ID,
} from '../lib/shadow-force';
import { sendMessage } from '../lib/messaging';
import { resolveEffectiveSettings } from '../lib/resolver';
import {
  getHostnameFromUrl,
  getOriginFromUrl,
  hostPrefersForceStylesheet,
  hostRequiresVisualVerify,
  hostUsesInjectCssFallback,
  isExcludedOrigin,
  resolveForceBackgroundColor,
  resolveInvertSupplementCss,
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

function getCurrentHostname(): string {
  return getHostnameFromUrl(window.location.href);
}

function getCurrentOrigin(): string {
  return getOriginFromUrl(window.location.href);
}

function isPreferForceHost(): boolean {
  return hostPrefersForceStylesheet(getCurrentHostname());
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
    let preferForceWatchdogTimer: ReturnType<typeof setInterval> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let batterySaver = false;
    let lastEffectiveSettings: EffectiveSiteSettings | null = null;
    let lastDetectOutcome: DetectionOutcome | undefined;
    let injectionStatusReported = false;

    async function reportInjectionStatus(contentStrict: boolean): Promise<void> {
      const hostname = getCurrentHostname();
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
      const origin = getCurrentOrigin();
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
      if (isPreferForceHost()) return;
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

    async function requestApplyMainWorldForce(): Promise<void> {
      try {
        await sendMessage({ type: 'APPLY_MAIN_WORLD_FORCE' });
      } catch {
        // Background may not be ready
      }
    }

    async function requestInvertSupplementIfNeeded(): Promise<void> {
      const hostname = getCurrentHostname();
      if (hostPrefersForceStylesheet(hostname) || !resolveInvertSupplementCss(hostname)) return;
      try {
        await sendMessage({ type: 'INSERT_INVERT_SUPPLEMENT' });
      } catch {
        // Background may not be ready
      }
    }

    function runPreferForceWatchdog(settings: EffectiveSiteSettings): void {
      if (!isPreferForceHost() || !lastEffectiveSettings?.active) return;

      const html = document.documentElement;
      if (!html.hasAttribute('data-truely-dark-active')) return;

      const forceMissing = html.getAttribute('data-truely-dark-force') !== 'true';
      const inlineInvert = computedFilterHasStrictInvert(html.style.filter || html.style.webkitFilter);
      let computedInvert = false;
      const view = document.defaultView;
      if (view) {
        computedInvert = computedFilterHasStrictInvert(view.getComputedStyle(html).filter);
      }

      if (forceMissing || inlineInvert || computedInvert) {
        stripInvertSoftArtifacts(document);
        applyDarkMode(settings, document, getCurrentHostname());
        pierceOpenShadowRoots(
          document,
          generateShadowForceCss(settings),
          SHADOW_FORCE_STYLE_ID,
        );
        void requestApplyMainWorldForce();
      }
    }

    function startPreferForceWatchdog(settings: EffectiveSiteSettings): void {
      if (!isPreferForceHost()) return;
      if (preferForceWatchdogTimer !== null) return;
      preferForceWatchdogTimer = setInterval(() => runPreferForceWatchdog(settings), 400);
      requestAnimationFrame(() => runPreferForceWatchdog(settings));
    }

    function stopPreferForceWatchdog(): void {
      if (preferForceWatchdogTimer !== null) {
        clearInterval(preferForceWatchdogTimer);
        preferForceWatchdogTimer = null;
      }
    }

    async function applyWithVerification(settings: EffectiveSiteSettings): Promise<boolean> {
      const hostname = getCurrentHostname();
      const preferForce =
        effectivePrefersForceSoft(settings, hostname) ||
        settings.sitePack?.preferForceStylesheet === true;

      if (preferForce) {
        stripInvertSoftArtifacts(document);
      }

      applyDarkMode(settings, document, hostname);
      let contentStrict = isSoftFilterActive();

      if (!contentStrict && hostUsesInjectCssFallback(hostname) && !preferForce) {
        await requestInsertCssFallback('html');
        applyDarkMode(settings, document, hostname);
        contentStrict = isSoftFilterActive();
        if (!contentStrict) {
          await requestInsertCssFallback('body');
          applyDarkMode(settings, document, hostname);
          contentStrict = isSoftFilterActive();
        }
      }

      if (!contentStrict && !preferForce) {
        applyDarkMode(settings, document, hostname);
        contentStrict = isSoftFilterActive();
        pierceOpenShadowRoots(document, generateShadowInvertPrepCss(), SHADOW_FILTER_STYLE_ID);
        await requestInvertSupplementIfNeeded();
      }

      if (preferForce && !contentStrict) {
        stripInvertSoftArtifacts(document);
        applyDarkMode(settings, document, hostname);
        pierceOpenShadowRoots(
          document,
          generateShadowForceCss(settings),
          SHADOW_FORCE_STYLE_ID,
        );
        contentStrict = isSoftFilterActive();
      }

      if (preferForce) {
        await requestApplyMainWorldForce();
        startPreferForceWatchdog(settings);
        runPreferForceWatchdog(settings);
      } else {
        stopPreferForceWatchdog();
        await requestInvertSupplementIfNeeded();
      }

      await reportInjectionStatus(contentStrict);

      if (hostRequiresVisualVerify(hostname)) {
        return false;
      }
      return contentStrict;
    }

    function scheduleSoftRetries(settings: EffectiveSiteSettings): void {
      const retry = async (): Promise<void> => {
        if (!lastEffectiveSettings?.active) return;
        await applyWithVerification(settings);
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
        if (isPreferForceHost()) {
          runPreferForceWatchdog(settings);
        }
      });

      const head = document.head ?? document.documentElement;
      styleGuardObserver.observe(head, { childList: true, subtree: true });
      styleGuardObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [
          'data-truely-dark-active',
          'data-truely-dark-force',
          'data-truely-dark-filter-target',
          'style',
        ],
      });
    }

    async function refresh(): Promise<void> {
      try {
        const fullSettings = await sendMessage<import('../types').TruelyDarkSettings>({
          type: 'GET_SETTINGS',
        });

        batterySaver = fullSettings.batterySaver;

        const origin = getCurrentOrigin();
        const hostname = getCurrentHostname();
        const siteMode =
          fullSettings.siteOverrides[origin]?.mode ?? fullSettings.defaultMode;

        if (!fullSettings.enabled || siteMode === 'off' || isExcludedOrigin(hostname, siteMode)) {
          lastEffectiveSettings = null;
          stopPreferForceWatchdog();
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
          stopPreferForceWatchdog();
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
          stopPreferForceWatchdog();
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
      stopPreferForceWatchdog();
      if (detectObserver) detectObserver.disconnect();
      if (styleGuardObserver) styleGuardObserver.disconnect();
      browser.runtime.onMessage.removeListener(onMessage);
    });
  },
});
