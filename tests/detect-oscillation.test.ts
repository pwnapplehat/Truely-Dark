// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest';
import {
  detectFromDom,
  detectFromDomPaintFree,
  isExtensionForceSoftInlinePaint,
  isExtensionPaintActive,
  EXTENSION_MARKERS,
} from '../src/lib/detect';
import { applyDarkMode, removeDarkMode, verifyForceApplication } from '../src/lib/engine';
import { DEFAULT_SETTINGS } from '../src/lib/defaults';
import { resolveEffectiveSettings, makeDetection } from '../src/lib/resolver';

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

    expect(resolved.active).toBe(false);
    expect(resolved.nativeDark).toBe(false);

    const settled = resolveEffectiveSettings({
      origin: 'https://mail.google.com',
      hostname: 'mail.google.com',
      settings: DEFAULT_SETTINGS,
      detectOutcome: makeDetection('light', 'medium'),
    });
    expect(settled.active).toBe(true);
    expect(settled.nativeDark).toBe(false);
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
    document.documentElement.style.setProperty('color', '#e8e8e8', 'important');
    document.body.style.setProperty('background-color', '#0d1117', 'important');

    expect(isExtensionForceSoftInlinePaint(document)).toBe(true);
    expect(detectFromDom(document)).toEqual({ result: 'unknown', confidence: 'low' });
  });

  it('paint-free detect strips force Soft #0d1117 leak and native-skips x.ai #__next', () => {
    document.documentElement.innerHTML =
      '<head></head><body><div id="__next" style="background-color:#0a0a0a;min-height:100vh"></div></body>';
    document.documentElement.classList.add('light');
    document.documentElement.setAttribute(EXTENSION_MARKERS.rootAttr, 'soft');
    document.documentElement.setAttribute(EXTENSION_MARKERS.forceAttr, 'true');
    document.documentElement.style.setProperty('background-color', '#0d1117', 'important');
    document.documentElement.style.setProperty('color', '#e8e8e8', 'important');
    document.documentElement.style.setProperty('color-scheme', 'light', 'important');

    const outcome = detectFromDomPaintFree(document);
    expect(outcome).toEqual({ result: 'dark', confidence: 'high' });
    expect(document.documentElement.hasAttribute('data-truely-dark-active')).toBe(false);
    expect(document.documentElement.hasAttribute('data-truely-dark-force')).toBe(false);
    expect(document.documentElement.style.getPropertyValue('background-color')).toBe('');
  });

  it('failed force Soft apply is fully removed by removeDarkMode', () => {
    const effective = resolveEffectiveSettings({
      origin: 'https://x.ai',
      hostname: 'x.ai',
      settings: DEFAULT_SETTINGS,
      detectOutcome: makeDetection('light', 'medium'),
    });

    applyDarkMode(effective, document, 'x.ai');
    expect(document.documentElement.hasAttribute(EXTENSION_MARKERS.forceAttr)).toBe(true);
    expect(verifyForceApplication(document)).toBe(true);

    removeDarkMode(document);
    expect(document.documentElement.hasAttribute(EXTENSION_MARKERS.rootAttr)).toBe(false);
    expect(document.documentElement.hasAttribute(EXTENSION_MARKERS.forceAttr)).toBe(false);
    expect(document.documentElement.style.getPropertyValue('background-color')).toBe('');
    expect(document.documentElement.style.getPropertyValue('color')).toBe('');
    expect(isExtensionPaintActive(document)).toBe(false);
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

  it('x.ai native dark detected through FOUC preload via paint-free detect', () => {
    document.documentElement.innerHTML =
      '<head></head><body><div id="__next" style="background-color:#0a0a0a;min-height:100vh"></div></body>';
    const preload = document.createElement('style');
    preload.id = 'truely-dark-preload';
    preload.textContent = 'html,body{background-color:#121212!important;color-scheme:dark}';
    document.head.appendChild(preload);

    expect(detectFromDom(document)).toEqual({ result: 'dark', confidence: 'high' });
    expect(detectFromDomPaintFree(document)).toEqual({ result: 'dark', confidence: 'high' });

    const resolved = resolveEffectiveSettings({
      origin: 'https://x.ai',
      hostname: 'x.ai',
      settings: DEFAULT_SETTINGS,
      detectOutcome: detectFromDomPaintFree(document),
    });

    expect(resolved.active).toBe(false);
    expect(resolved.nativeDark).toBe(true);
  });
});
