import { getHostnameFromUrl } from './site-packs';

const GALLERY_HOSTNAMES = ['chromewebstore.google.com', 'chrome.google.com'] as const;

/** Chromium flag required for many sideloaded builds on gallery URLs. */
export const CHROME_EXTENSIONS_ON_CHROME_URLS_FLAG =
  'chrome://flags/#extensions-on-chrome-urls';

/**
 * Chrome Web Store / chrome.google.com gallery pages.
 * Sideloaded MV3 may block static content scripts — user-gesture injection required.
 */
export function isChromeGalleryHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return GALLERY_HOSTNAMES.some(
    (host) => normalized === host || normalized.endsWith(`.${host}`),
  );
}

export function isChromeGalleryUrl(url: string): boolean {
  const hostname = getHostnameFromUrl(url);
  return hostname ? isChromeGalleryHost(hostname) : false;
}
