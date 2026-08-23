import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/lib/defaults';
import {
  computePreInvertBackground,
  generateDarkCss,
  PRELOAD_CSS,
  verifySoftFilterApplied,
} from '../src/lib/engine';
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
});

// @vitest-environment happy-dom
describe('verifySoftFilterApplied', () => {
  it('detects invert on html after inline filter', () => {
    document.documentElement.style.setProperty(
      'filter',
      'invert(1) hue-rotate(180deg) brightness(0.98) contrast(0.92)',
      'important',
    );
    expect(verifySoftFilterApplied(document, 'html')).toBe(true);
    document.documentElement.style.removeProperty('filter');
  });
});

describe('PRELOAD_CSS', () => {
  it('uses dark background for FOUC before Soft engages', () => {
    expect(PRELOAD_CSS).toContain('#121212');
  });
});
