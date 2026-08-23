import { describe, expect, it } from 'vitest';
import { findSitePack, hostUsesInjectCssFallback } from '../src/lib/site-packs';

describe('insertCSS fallback registration', () => {
  it('registers chromewebstore for background insertCSS fallback', () => {
    const pack = findSitePack('chromewebstore.google.com');
    expect(pack).toBeDefined();
    expect(pack?.injectCssFallback).toBe(true);
    expect(hostUsesInjectCssFallback('chromewebstore.google.com')).toBe(true);
  });

  it('registers chrome.google.com for insertCSS fallback', () => {
    expect(hostUsesInjectCssFallback('chrome.google.com')).toBe(true);
  });

  it('does not register insertCSS fallback for generic sites', () => {
    expect(hostUsesInjectCssFallback('example.com')).toBe(false);
    expect(hostUsesInjectCssFallback('www.ovhcloud.com')).toBe(false);
  });
});
