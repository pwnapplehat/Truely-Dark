// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/lib/defaults';
import {
  applyDarkMode,
  applyForceStylesheetMode,
  computePreInvertBackground,
  generateDarkCss,
  generateForceStylesheetCss,
  isDarkModeActive,
  isSoftFilterActive,
  PRELOAD_CSS,
  removeDarkMode,
  verifyForceApplication,
  verifySoftApplication,
  verifySoftFilterApplied,
} from '../src/lib/engine';
import { findSitePack } from '../src/lib/site-packs';
import { resolveEffectiveSettings } from '../src/lib/resolver';

describe('computePreInvertBackground', () => {
  it('maps Midnight #121212 to invert-safe #ededed', () => {
    expect(computePreInvertBackground('#121212')).toBe('#ededed');
  });

  it('maps OLED #000000 to #ffffff', () => {
    expect(computePreInvertBackground('#000000')).toBe('#ffffff');
  });

  it('maps white to black complement', () => {
    expect(computePreInvertBackground('#ffffff')).toBe('#000000');
  });
});

describe('generateDarkCss — invert-safe backgrounds', () => {
  const baseSettings = resolveEffectiveSettings({
    origin: 'https://example.com',
    hostname: 'example.com',
    settings: DEFAULT_SETTINGS,
    detectOutcome: { result: 'light', confidence: 'medium' },
  });

  it('uses pre-invert light background under filter, not dark preset hex', () => {
    const css = generateDarkCss({
      ...baseSettings,
      active: true,
      mode: 'soft',
      backgroundColor: '#121212',
    });

    expect(css).toContain('background-color: #ededed');
    expect(css).not.toMatch(/background-color:\s*#121212/);
    expect(css).toContain('invert(1)');
  });

  it('does not counter-invert iframe elements', () => {
    const css = generateDarkCss({
      ...baseSettings,
      active: true,
      mode: 'soft',
      preserveMedia: true,
    });

    expect(css).not.toMatch(/iframe\s*\{[^}]*filter:\s*invert/);
  });

  it('includes body fallback CSS and backdrop-filter reset', () => {
    const css = generateDarkCss({
      ...baseSettings,
      active: true,
      mode: 'soft',
    });

    expect(css).toContain('-webkit-filter');
    expect(css).toContain('backdrop-filter: none');
    expect(generateDarkCss({ ...baseSettings, active: true, mode: 'soft' }, 'body')).toContain(
      'html[data-truely-dark-active] body',
    );
  });

  it('includes media preserve selectors and fullscreen video reset', () => {
    const css = generateDarkCss({
      ...baseSettings,
      active: true,
      mode: 'soft',
      preserveMedia: true,
    });

    expect(css).toContain('picture');
    expect(css).toContain('svg');
    expect(css).toContain('video:fullscreen');
    expect(css).toContain('filter: none');
  });

  it('sets invert-safe preload background on html and body', () => {
    const css = generateDarkCss({
      ...baseSettings,
      active: true,
      mode: 'soft',
      backgroundColor: '#121212',
    });
    expect(css).toContain('html[data-truely-dark-active] body');
    expect(css).toContain('#ededed');
  });
  it('does not include force-only site pack CSS in invert generateDarkCss', () => {
    const ovhPack = findSitePack('www.ovhcloud.com');
    const css = generateDarkCss({
      ...baseSettings,
      active: true,
      mode: 'soft',
      sitePack: ovhPack,
    });
    expect(css).not.toContain('[class*="homepage-hero"]');
    expect(css).toContain('invert(1)');
  });
});

describe('force-first marketing Soft', () => {
  const ovhEffective = resolveEffectiveSettings({
    origin: 'https://www.ovhcloud.com',
    hostname: 'www.ovhcloud.com',
    settings: { ...DEFAULT_SETTINGS, defaultMode: 'soft' },
    detectOutcome: { result: 'light', confidence: 'medium' },
  });

  it('applyDarkMode uses force path for preferForceStylesheet packs', () => {
    document.documentElement.innerHTML = '<head></head><body style="background:#fff">Hi</body>';
    const result = applyDarkMode({ ...ovhEffective, active: true, mode: 'soft' });
    expect(result.filterTarget).toBe('force');
    expect(document.documentElement.getAttribute('data-truely-dark-force')).toBe('true');
    expect(isSoftFilterActive()).toBe(true);
    removeDarkMode();
  });

  it('generateForceStylesheetCss includes marketing shell without invert pre-bg', () => {
    const css = generateForceStylesheetCss({
      ...ovhEffective,
      active: true,
      mode: 'soft',
    });
    expect(css).toContain('--truely-dark-bg');
    expect(css).not.toContain('invert(1)');
    expect(css).toContain('[class*="logo"]');
  });

  it('verifyForceApplication rejects invert filter on force path', () => {
    document.documentElement.innerHTML = '<head></head><body></body>';
    applyForceStylesheetMode({ ...ovhEffective, active: true, mode: 'soft' });
    expect(verifyForceApplication()).toBe(true);
    document.documentElement.style.setProperty('filter', 'invert(1)', 'important');
    expect(verifyForceApplication()).toBe(false);
    removeDarkMode();
  });
});

describe('applyDarkMode integration', () => {
  const effective = resolveEffectiveSettings({
    origin: 'https://example.com',
    hostname: 'example.com',
    settings: DEFAULT_SETTINGS,
    detectOutcome: { result: 'light', confidence: 'medium' },
  });

  it('activates invert filter on example.com-like page', () => {
    document.documentElement.innerHTML = '<head></head><body style="background:#fff">Hi</body>';
    const result = applyDarkMode({ ...effective, active: true, mode: 'soft' });
    expect(isDarkModeActive()).toBe(true);
    expect(result.applied || isSoftFilterActive()).toBe(true);
    removeDarkMode();
    expect(isDarkModeActive()).toBe(false);
  });

  it('removes all Truely Dark markers on removeDarkMode', () => {
    document.documentElement.innerHTML = '<head></head><body>Hi</body>';
    applyDarkMode({ ...effective, active: true, mode: 'soft' });
    removeDarkMode();
    expect(document.documentElement.hasAttribute('data-truely-dark-active')).toBe(false);
    expect(document.getElementById('truely-dark-styles')).toBeNull();
  });

  it('verifySoftFilterApplied detects inline invert', () => {
    document.documentElement.style.setProperty(
      'filter',
      'invert(1) hue-rotate(180deg) brightness(0.98) contrast(0.92)',
      'important',
    );
    document.documentElement.style.setProperty('background-color', '#ededed', 'important');
    expect(verifySoftFilterApplied(document, 'html')).toBe(true);
    expect(verifySoftApplication(document, 'html')).toBe(true);
    document.documentElement.style.removeProperty('filter');
    document.documentElement.style.removeProperty('background-color');
  });
});

describe('PRELOAD_CSS', () => {
  it('uses dark background for FOUC before Soft engages', () => {
    expect(PRELOAD_CSS).toContain('#121212');
  });
});
