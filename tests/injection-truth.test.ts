// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { parseColor, rgbByteLuminance } from '../src/lib/color';
import { DEFAULT_SETTINGS } from '../src/lib/defaults';
import {
  applyDarkMode,
  computePreInvertBackground,
  isSoftFilterActive,
  MIN_PRE_INVERT_ROOT_LUMINANCE,
  removeDarkMode,
  verifyInvertSafeRootBackground,
  verifySoftApplication,
  verifySoftFilterApplied,
} from '../src/lib/engine';
import { isTruthfulActiveStatus, siteStatusLabel } from '../src/lib/tab-status';
import { resolveEffectiveSettings } from '../src/lib/resolver';
import type { TabInfo } from '../src/types';

const effective = resolveEffectiveSettings({
  origin: 'https://example.com',
  hostname: 'example.com',
  settings: DEFAULT_SETTINGS,
  detectOutcome: { result: 'light', confidence: 'medium' },
});

const baseTab = (partial: Partial<TabInfo>): TabInfo => ({
  origin: 'https://example.com',
  hostname: 'example.com',
  url: 'https://example.com',
  effectiveMode: 'auto',
  resolvedMode: 'soft',
  active: true,
  globalEnabled: true,
  nativeDark: false,
  pageRestricted: false,
  softApplied: false,
  injectionPending: false,
  ...partial,
});

describe('verifySoftApplication truth gate', () => {
  it('fails when invert filter present but root bg is FOUC dark (#121212)', () => {
    document.documentElement.innerHTML = '<head></head><body></body>';
    document.documentElement.style.setProperty(
      'filter',
      'invert(1) hue-rotate(180deg)',
      'important',
    );
    document.documentElement.style.setProperty('background-color', '#121212', 'important');

    expect(verifySoftFilterApplied(document, 'html')).toBe(true);
    expect(verifyInvertSafeRootBackground(document, 'html')).toBe(false);
    expect(verifySoftApplication(document, 'html')).toBe(false);
  });

  it('passes with invert filter and invert-safe light pre-invert background', () => {
    document.documentElement.innerHTML = '<head></head><body></body>';
    const preInvert = computePreInvertBackground('#121212');
    document.documentElement.style.setProperty(
      'filter',
      'invert(1) hue-rotate(180deg)',
      'important',
    );
    document.documentElement.style.setProperty('background-color', preInvert, 'important');

    expect(verifySoftApplication(document, 'html')).toBe(true);
    expect(verifyInvertSafeRootBackground(document, 'html')).toBe(true);
  });
});

describe('example.com contrast fixture', () => {
  it('applyDarkMode yields invert-safe root and verified Soft (readable path)', () => {
    document.documentElement.innerHTML = `
      <head></head>
      <body style="background:#fff;color:#333">
        <div>
          <h1>Example Domain</h1>
          <p>This domain is for use in documentation examples.</p>
          <a href="https://iana.org">Learn more</a>
        </div>
      </body>
    `;

    const result = applyDarkMode({ ...effective, active: true, mode: 'soft' });
    expect(result.applied).toBe(true);
    expect(isSoftFilterActive()).toBe(true);
    expect(verifyInvertSafeRootBackground(document, result.filterTarget)).toBe(true);

    const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
    const rgb = parseColor(htmlBg);
    expect(rgb).not.toBeNull();
    expect(rgbByteLuminance(rgb!.r, rgb!.g, rgb!.b)).toBeGreaterThan(MIN_PRE_INVERT_ROOT_LUMINANCE);

    const bodyColor = getComputedStyle(document.body).color;
    expect(bodyColor).toMatch(/rgb\(0,\s*0,\s*0\)|#000000/i);

    removeDarkMode();
  });
});

describe('popup status never lies about active', () => {
  it('does not claim active when verifySoftApplication would fail', () => {
    const tab = baseTab({ softApplied: false, injectionPending: false, active: true });
    expect(isTruthfulActiveStatus(tab)).toBe(false);
    expect(siteStatusLabel(tab)).toContain('could not apply');
    expect(siteStatusLabel(tab)).not.toContain('active (Soft)');
  });

  it('shows Auto label when effective mode is auto and verified', () => {
    const tab = baseTab({
      effectiveMode: 'auto',
      resolvedMode: 'soft',
      softApplied: true,
    });
    expect(siteStatusLabel(tab)).toBe('Extension dark mode active (Auto)');
    expect(isTruthfulActiveStatus(tab)).toBe(true);
  });

  it('shows Soft label only for explicit soft mode', () => {
    const tab = baseTab({
      effectiveMode: 'soft',
      resolvedMode: 'soft',
      softApplied: true,
    });
    expect(siteStatusLabel(tab)).toBe('Extension dark mode active (Soft)');
  });
});
