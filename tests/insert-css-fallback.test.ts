import { describe, expect, it } from 'vitest';
import { findSitePack, hostRequiresVisualVerify } from '../src/lib/site-packs';

describe('insertCSS fallback registration', () => {
  it('registers chromewebstore for background insertCSS fallback', () => {
    const pack = findSitePack('chromewebstore.google.com');
    expect(pack).toBeDefined();
    expect(pack?.injectCssFallback).toBe(true);
    expect(pack?.requiresVisualVerify).toBe(true);
    expect(pack?.forceStylesheetFallback).toBe(true);
    expect(hostRequiresVisualVerify('chromewebstore.google.com')).toBe(true);
  });

  it('registers chrome.google.com for insertCSS fallback', () => {
    expect(hostRequiresVisualVerify('chrome.google.com')).toBe(true);
  });

  it('registers ovhcloud for visual verify and force stylesheet', () => {
    expect(hostRequiresVisualVerify('www.ovhcloud.com')).toBe(true);
    const pack = findSitePack('www.ovhcloud.com');
    expect(pack?.forceStylesheetFallback).toBe(true);
  });

  it('does not register insertCSS fallback for generic sites', () => {
    expect(hostRequiresVisualVerify('example.com')).toBe(false);
  });
});
