// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest';
import {
  detectFromDom,
  isExtensionPaintActive,
  EXTENSION_MARKERS,
} from '../src/lib/detect';
import { DEFAULT_SETTINGS } from '../src/lib/defaults';
import { resolveEffectiveSettings } from '../src/lib/resolver';

describe('detect — extension paint must not trigger native-dark skip', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute(EXTENSION_MARKERS.rootAttr);
    document.documentElement.removeAttribute(EXTENSION_MARKERS.forceAttr);
    document.documentElement.removeAttribute(EXTENSION_MARKERS.appShellAttr);
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-color-mode');
    document.documentElement.removeAttribute('data-mode');
    document.documentElement.removeAttribute('class');
    document.documentElement.style.cssText = '';
    document.body?.remove();
    document.documentElement.innerHTML = '<head></head><body></body>';
    document.getElementById('truely-dark-preload')?.remove();
    document.getElementById('truely-dark-styles')?.remove();
  });

  it('isExtensionPaintActive detects invert filter paint', () => {
    document.documentElement.setAttribute(EXTENSION_MARKERS.rootAttr, 'auto');
    document.documentElement.style.setProperty(
      'filter',
      'invert(1) hue-rotate(180deg) brightness(0.98) contrast(0.92)',
      'important',
    );
    expect(isExtensionPaintActive(document)).toBe(true);
  });

  it('detectFromDom returns unknown when only extension invert darkens page (Gmail oscillation)', () => {
    document.body.style.setProperty('background-color', '#ffffff', 'important');
    document.documentElement.setAttribute(EXTENSION_MARKERS.rootAttr, 'auto');
    document.documentElement.style.setProperty('color-scheme', 'dark', 'important');
    document.documentElement.style.setProperty(
      'filter',
      'invert(1) hue-rotate(180deg) brightness(0.98) contrast(0.92)',
      'important',
    );

    expect(detectFromDom(document)).toEqual({ result: 'unknown', confidence: 'low' });

    const resolved = resolveEffectiveSettings({
      origin: 'https://mail.google.com',
      hostname: 'mail.google.com',
      settings: DEFAULT_SETTINGS,
      detectOutcome: detectFromDom(document),
    });

    expect(resolved.active).toBe(true);
    expect(resolved.nativeDark).toBe(false);
  });

  it('detectFromDom still native-skips Gmail when site-authored dark is present', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.setProperty('background-color', '#202124', 'important');
    document.body.style.setProperty('background-color', '#202124', 'important');

    expect(detectFromDom(document)).toEqual({ result: 'dark', confidence: 'high' });
  });

  it('detectFromDom ignores extension force paint without authored dark', () => {
    document.documentElement.setAttribute(EXTENSION_MARKERS.rootAttr, 'soft');
    document.documentElement.setAttribute(EXTENSION_MARKERS.forceAttr, 'true');
    document.documentElement.style.setProperty('background-color', '#0d1117', 'important');
    document.body.style.setProperty('background-color', '#0d1117', 'important');

    expect(detectFromDom(document)).toEqual({ result: 'unknown', confidence: 'low' });
  });

  it('x.ai native dark still detected paint-free before extension applies', () => {
    document.documentElement.style.setProperty('background-color', '#0a0a0a', 'important');
    document.body.style.setProperty('background-color', '#0a0a0a', 'important');

    expect(detectFromDom(document)).toEqual({ result: 'dark', confidence: 'high' });

    const resolved = resolveEffectiveSettings({
      origin: 'https://x.ai',
      hostname: 'x.ai',
      settings: DEFAULT_SETTINGS,
      detectOutcome: detectFromDom(document),
    });

    expect(resolved.active).toBe(false);
    expect(resolved.nativeDark).toBe(true);
  });
});
