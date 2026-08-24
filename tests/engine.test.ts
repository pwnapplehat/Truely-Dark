// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/lib/defaults';
import {
  applyDarkMode,
  applyAppShellSoftMode,
  applyForceStylesheetMode,
  computePreInvertBackground,
  effectivePrefersForceSoft,
  generateDarkCss,
  generateForceStylesheetCss,
  isDarkModeActive,
  isSoftFilterActive,
  PRELOAD_CSS,
  removeDarkMode,
  verifyAppShellSoftApplication,
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
  it('OVH force pack CSS contains no invert pre-bg #ffffff', () => {
    const pack = findSitePack('www.ovhcloud.com');
    const forceCss = generateForceStylesheetCss({
      ...resolveEffectiveSettings({
        origin: 'https://www.ovhcloud.com',
        hostname: 'www.ovhcloud.com',
        settings: { ...DEFAULT_SETTINGS, defaultMode: 'soft' },
        detectOutcome: { result: 'light', confidence: 'medium' },
      }),
      active: true,
      mode: 'soft',
    });
    const combined = `${pack?.customCss ?? ''}${forceCss}`;
    expect(combined).not.toContain('#ffffff');
    expect(combined).toContain('#0d1117');
  });

  it('generateDarkCss for OVH pack never emits invert filter', () => {
    const ovhPack = findSitePack('www.ovhcloud.com');
    const ovhEffective = resolveEffectiveSettings({
      origin: 'https://www.ovhcloud.com',
      hostname: 'www.ovhcloud.com',
      settings: { ...DEFAULT_SETTINGS, defaultMode: 'soft' },
      detectOutcome: { result: 'light', confidence: 'medium' },
    });
    const css = generateDarkCss({
      ...ovhEffective,
      active: true,
      mode: 'soft',
      sitePack: ovhPack,
    });
    expect(css).not.toMatch(/\binvert\s*\(\s*1/);
    expect(css).toContain('data-truely-dark-force');
  });

  it('applyDarkMode on OVH sets force attr and never html invert', () => {
    document.documentElement.innerHTML = '<head></head><body>Hi</body>';
    const ovhEffective = resolveEffectiveSettings({
      origin: 'https://www.ovhcloud.com',
      hostname: 'www.ovhcloud.com',
      settings: { ...DEFAULT_SETTINGS, defaultMode: 'soft' },
      detectOutcome: { result: 'light', confidence: 'medium' },
    });
    applyDarkMode({ ...ovhEffective, active: true, mode: 'soft' }, document, 'www.ovhcloud.com');
    expect(document.documentElement.getAttribute('data-truely-dark-force')).toBe('true');
    expect(document.documentElement.style.filter).not.toMatch(/invert/);
    const styleEl = document.getElementById('truely-dark-styles');
    expect(styleEl?.textContent ?? '').not.toMatch(/\binvert\s*\(\s*1/);
    removeDarkMode();
  });

  it('generateDarkCss with example.com uses invert path', () => {
    const css = generateDarkCss({
      ...baseSettings,
      active: true,
      mode: 'soft',
    });
    expect(css).toContain('invert(1)');
    expect(css).not.toContain('data-truely-dark-force');
  });
});

describe('effectivePrefersForceSoft', () => {
  it('returns true for OVH hostname even without sitePack on settings object', () => {
    expect(effectivePrefersForceSoft({ backgroundColor: '#121212' } as never, 'www.ovhcloud.com')).toBe(
      true,
    );
    expect(effectivePrefersForceSoft({ backgroundColor: '#121212' } as never, 'example.com')).toBe(
      false,
    );
  });
});

describe('force-first marketing Soft', () => {
  const ovhEffective = resolveEffectiveSettings({
    origin: 'https://www.ovhcloud.com',
    hostname: 'www.ovhcloud.com',
    settings: { ...DEFAULT_SETTINGS, defaultMode: 'soft' },
    detectOutcome: { result: 'light', confidence: 'medium' },
  });

  it('applyDarkMode forces for OVH hostname without sitePack on settings', () => {
    document.documentElement.innerHTML = '<head></head><body>Hi</body>';
    const settings = {
      active: true,
      mode: 'soft' as const,
      brightness: 100,
      contrast: 92,
      sepia: 0,
      preserveMedia: true,
      backgroundColor: '#121212',
      skipProcessing: false,
      nativeDark: false,
    };
    const result = applyDarkMode(settings, document, 'www.ovhcloud.com');
    expect(result.filterTarget).toBe('force');
    expect(document.documentElement.getAttribute('data-truely-dark-force')).toBe('true');
    expect(document.documentElement.style.filter).not.toMatch(/invert/);
    removeDarkMode();
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
    const css = generateForceStylesheetCss(
      {
        ...ovhEffective,
        active: true,
        mode: 'soft',
      },
      'www.ovhcloud.com',
    );
    expect(css).toContain('--truely-dark-bg');
    expect(css).not.toContain('invert(1)');
    expect(css).toContain('[class*="logo"]');
    expect(css).toContain('color-scheme: dark');
    expect(css).toContain('[class*="card"]');
    expect(css).not.toMatch(
      /html\[data-truely-dark-active\]\s+h1,\s*\n\s*html\[data-truely-dark-active\]\s+h2/,
    );
  });

  it('generateForceStylesheetCss omits marketing shell and pack CSS on OVH Manager hosts', () => {
    const css = generateForceStylesheetCss(
      {
        ...ovhEffective,
        active: true,
        mode: 'soft',
      },
      'manager.ca.ovhcloud.com',
    );
    expect(css).not.toContain('ods-header-universe');
    expect(css).not.toContain('menu-navbar');
  });

  it('applyAppShellSoftMode avoids invert and opaque viewport paint on Manager', () => {
    document.documentElement.innerHTML = '<head></head><body><main>Hub</main></body>';
    applyAppShellSoftMode(
      {
        active: true,
        mode: 'soft',
        brightness: 100,
        contrast: 92,
        sepia: 0,
        preserveMedia: true,
        backgroundColor: '#121212',
        skipProcessing: false,
        nativeDark: false,
      },
      document,
    );
    expect(verifyAppShellSoftApplication()).toBe(true);
    expect(document.documentElement.getAttribute('data-truely-dark-app-shell')).toBe('true');
    expect(document.documentElement.getAttribute('data-truely-dark-force')).toBeNull();
    expect(document.documentElement.style.filter).not.toContain('invert');
    removeDarkMode();
  });

  it('applyDarkMode routes Manager to app-shell not invert', () => {
    document.documentElement.innerHTML = '<head></head><body>Hub</body>';
    const result = applyDarkMode(
      {
        active: true,
        mode: 'soft',
        brightness: 100,
        contrast: 92,
        sepia: 0,
        preserveMedia: true,
        backgroundColor: '#121212',
        skipProcessing: false,
        nativeDark: false,
      },
      document,
      'manager.ca.ovhcloud.com',
    );
    expect(result.filterTarget).toBe('app-shell');
    expect(result.applied).toBe(true);
    removeDarkMode();
  });

  it('verifyForceApplication rejects invert filter on force path', () => {
    document.documentElement.innerHTML = '<head></head><body></body>';
    applyForceStylesheetMode({ ...ovhEffective, active: true, mode: 'soft' });
    expect(verifyForceApplication()).toBe(true);
    document.documentElement.style.setProperty('filter', 'invert(1)', 'important');
    expect(verifyForceApplication()).toBe(false);
    removeDarkMode();
  });

  it('verifyForceApplication accepts dark body when html background is transparent', () => {
    document.documentElement.innerHTML = '<head></head><body></body>';
    document.documentElement.setAttribute('data-truely-dark-force', 'true');
    document.documentElement.style.setProperty('background-color', 'transparent', 'important');
    document.body.style.setProperty('background-color', '#0d1117', 'important');
    expect(verifyForceApplication()).toBe(true);
    document.documentElement.removeAttribute('data-truely-dark-force');
  });

  it('verifyForceApplication accepts dark main when html and body are transparent', () => {
    document.documentElement.innerHTML =
      '<head></head><body><main class="dialog-off-canvas-main-canvas"></main></body>';
    document.documentElement.setAttribute('data-truely-dark-force', 'true');
    document.documentElement.style.setProperty('background-color', 'transparent', 'important');
    document.body.style.setProperty('background-color', 'transparent', 'important');
    const main = document.querySelector('main') as HTMLElement;
    main.style.setProperty('background-color', '#0d1117', 'important');
    expect(verifyForceApplication()).toBe(true);
    removeDarkMode();
  });

  it('verifyForceApplication accepts force attrs when child surfaces are not yet painted', () => {
    document.documentElement.innerHTML = '<head></head><body></body>';
    document.documentElement.setAttribute('data-truely-dark-active', 'soft');
    document.documentElement.setAttribute('data-truely-dark-force', 'true');
    document.documentElement.style.setProperty('background-color', 'transparent', 'important');
    document.body.style.setProperty('background-color', 'transparent', 'important');
    expect(verifyForceApplication()).toBe(true);
    removeDarkMode();
  });

  it('applyForceStylesheetMode sets YouTube native dark hint attrs', () => {
    document.documentElement.innerHTML = '<head></head><body><ytd-masthead></ytd-masthead></body>';
    const youtubeEffective = resolveEffectiveSettings({
      origin: 'https://www.youtube.com',
      hostname: 'www.youtube.com',
      settings: DEFAULT_SETTINGS,
      detectOutcome: { result: 'light', confidence: 'medium' },
    });
    applyForceStylesheetMode(
      { ...youtubeEffective, active: true, mode: 'soft', sitePack: findSitePack('www.youtube.com') },
      document,
      'www.youtube.com',
    );
    expect(document.documentElement.getAttribute('dark')).toBe('');
    expect(document.documentElement.getAttribute('data-truely-dark-youtube-hint')).toBe('true');
    expect(document.querySelector('ytd-masthead')?.getAttribute('dark')).toBe('');
    removeDarkMode();
    expect(document.documentElement.getAttribute('dark')).toBeNull();
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
