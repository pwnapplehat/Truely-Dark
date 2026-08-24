import { describe, expect, it } from 'vitest';
import { isConfigurableWebPage, isNonScriptableUrl } from '../src/lib/restricted-hosts';

describe('isNonScriptableUrl', () => {
  it('blocks chrome:// and about: URLs', () => {
    expect(isNonScriptableUrl('chrome://extensions')).toBe(true);
    expect(isNonScriptableUrl('about:blank')).toBe(true);
    expect(isNonScriptableUrl('chrome-extension://abc/popup.html')).toBe(true);
    expect(isNonScriptableUrl('edge://settings')).toBe(true);
  });

  it('allows Chrome Web Store and normal https pages', () => {
    expect(isNonScriptableUrl('https://chromewebstore.google.com/detail/foo')).toBe(false);
    expect(isNonScriptableUrl('https://www.ovhcloud.com/en-in/')).toBe(false);
    expect(isNonScriptableUrl('https://github.com')).toBe(false);
  });
});

describe('isConfigurableWebPage', () => {
  it('returns false for browser-internal pages', () => {
    expect(isConfigurableWebPage('chrome://newtab')).toBe(false);
    expect(isConfigurableWebPage('about:config')).toBe(false);
  });

  it('returns true for https marketing and store pages', () => {
    expect(isConfigurableWebPage('https://chromewebstore.google.com/')).toBe(true);
    expect(isConfigurableWebPage('https://www.ovhcloud.com/en-in/')).toBe(true);
  });
});
