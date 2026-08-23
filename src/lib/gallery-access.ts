import { getHostnameFromUrl } from './site-packs';

const GALLERY_HOSTNAMES = ['chromewebstore.google.com', 'chrome.google.com'] as const;

/** Popup status when Chromium blocks gallery injection (HTTPS Web Store, not chrome://). */
export const GALLERY_INJECTION_BLOCKED_LABEL =
  'Chrome blocks extensions on the Web Store';

/**
 * Chrome Web Store gallery hosts — Chromium hard-blocks extension injection on these HTTPS pages.
 * The extensions-on-chrome-urls flag applies to chrome:// URLs, not the public gallery.
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
