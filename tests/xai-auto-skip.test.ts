// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { shouldDeferAutoSoftApply } from '../src/lib/auto-state';
import { detectFromDomPaintFree } from '../src/lib/detect';
import { DEFAULT_SETTINGS } from '../src/lib/defaults';
import {
  resolveAutoNativeDarkForTab,
  type LiveDetectQueryResult,
} from '../src/lib/live-detect-bridge';
import {
  isNativeDarkSkip,
  makeDetection,
  resolveEffectiveSettings,
} from '../src/lib/resolver';
import { siteStatusLabel } from '../src/lib/tab-status';
import { hostPrefersForceStylesheet, hostRequiresVisualVerify } from '../src/lib/site-packs';
import type { TabInfo } from '../src/types';

describe('x.ai Auto native skip integration', () => {
  it('paint-free detect strips Soft attrs and native-skips x.ai html.light + dark #__next', () => {
    document.documentElement.innerHTML =
      '<head></head><body><div id="__next" style="background-color:#0a0a0a;min-height:100vh"></div></body>';
    document.documentElement.classList.add('light');
    document.documentElement.style.setProperty('color-scheme', 'light', 'important');
    document.documentElement.setAttribute('data-truely-dark-active', 'soft');
    document.documentElement.setAttribute('data-truely-dark-force', 'true');

    const outcome = detectFromDomPaintFree(document);
    expect(outcome).toEqual({ result: 'dark', confidence: 'high' });
    expect(document.documentElement.hasAttribute('data-truely-dark-active')).toBe(false);
    expect(document.documentElement.hasAttribute('data-truely-dark-force')).toBe(false);

    const effective = resolveEffectiveSettings({
      origin: 'https://x.ai',
      hostname: 'x.ai',
      settings: DEFAULT_SETTINGS,
      detectOutcome: outcome,
    });
    expect(effective.active).toBe(false);
    expect(effective.nativeDark).toBe(true);
    expect(siteStatusLabel({
      origin: 'https://x.ai',
      hostname: 'x.ai',
      url: 'https://x.ai/pricing',
      effectiveMode: 'auto',
      resolvedMode: 'auto',
      active: false,
      globalEnabled: true,
      nativeDark: true,
      autoNativeSkip: true,
      pageRestricted: false,
      softApplied: false,
      injectionPending: false,
      galleryHost: false,
      galleryInjectionBlocked: false,
      enableOnRestrictedPages: false,
      galleryGestureAttempted: false,
    })).toBe('Natively dark — Truely Dark skipped');
  });

  it('paint-free detect on x.ai html.light + dark #__next yields dark/high native skip', () => {
    document.documentElement.innerHTML =
      '<head></head><body><div id="__next" style="background-color:#0a0a0a;min-height:100vh"></div></body>';
    document.documentElement.classList.add('light');
    document.documentElement.style.setProperty('color-scheme', 'light', 'important');

    const outcome = detectFromDomPaintFree(document);
    expect(isNativeDarkSkip(outcome)).toBe(true);

    const effective = resolveEffectiveSettings({
      origin: 'https://x.ai',
      hostname: 'x.ai',
      settings: DEFAULT_SETTINGS,
      detectOutcome: outcome,
    });

    expect(effective.active).toBe(false);
    expect(effective.nativeDark).toBe(true);
    expect(effective.mode).toBe('auto');
  });

  it('paint-free detect on x.ai-like DOM yields dark/high native skip', () => {
    document.documentElement.innerHTML =
      '<head></head><body><div id="__next" style="background-color:#0a0a0a;min-height:100vh"></div></body>';
    document.documentElement.style.setProperty('background-color', '#0a0a0a', 'important');
    document.body.style.setProperty('background-color', '#0a0a0a', 'important');

    const outcome = detectFromDomPaintFree(document);
    expect(isNativeDarkSkip(outcome)).toBe(true);

    const effective = resolveEffectiveSettings({
      origin: 'https://x.ai',
      hostname: 'x.ai',
      settings: DEFAULT_SETTINGS,
      detectOutcome: outcome,
    });

    expect(effective.active).toBe(false);
    expect(effective.nativeDark).toBe(true);
    expect(effective.mode).toBe('auto');
  });

  it('defers apply-soft on x.ai until SPA settle passes complete', () => {
    expect(
      shouldDeferAutoSoftApply(
        'x.ai',
        makeDetection('light', 'medium'),
        0,
        hostPrefersForceStylesheet,
        hostRequiresVisualVerify,
      ),
    ).toBe(true);
    expect(
      shouldDeferAutoSoftApply(
        'x.ai',
        makeDetection('dark', 'high'),
        0,
        hostPrefersForceStylesheet,
        hostRequiresVisualVerify,
      ),
    ).toBe(false);
  });

  it('maps TabInfo to native skip string with softApplied false', () => {
    const live: LiveDetectQueryResult = {
      detectOutcome: makeDetection('dark', 'high'),
      autoNativeSkip: true,
      skipNativeLocked: true,
    };
    const effective = resolveEffectiveSettings({
      origin: 'https://x.ai',
      hostname: 'x.ai',
      settings: DEFAULT_SETTINGS,
      detectOutcome: live.detectOutcome,
    });
    const autoNativeSkip = resolveAutoNativeDarkForTab(
      'auto',
      effective.nativeDark,
      live,
    );

    const tabInfo: TabInfo = {
      origin: 'https://x.ai',
      hostname: 'x.ai',
      url: 'https://x.ai/pricing',
      effectiveMode: 'auto',
      resolvedMode: 'auto',
      active: false,
      globalEnabled: true,
      nativeDark: autoNativeSkip,
      autoNativeSkip,
      pageRestricted: false,
      softApplied: false,
      injectionPending: false,
      galleryHost: false,
      galleryInjectionBlocked: false,
      enableOnRestrictedPages: false,
      galleryGestureAttempted: false,
    };

    expect(tabInfo.softApplied).toBe(false);
    expect(siteStatusLabel(tabInfo)).toBe('Natively dark — Truely Dark skipped');
  });
});
