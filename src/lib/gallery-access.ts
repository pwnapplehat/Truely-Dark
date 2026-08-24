import { getHostnameFromUrl } from './site-packs';

const GALLERY_HOSTNAMES = ['chromewebstore.google.com', 'chrome.google.com'] as const;

/**
 * Popup status after all MV3 injection paths were attempted on the Web Store gallery.
 * See GALLERY_CHROME_LIMITATION for the underlying browser constraint when this appears.
 */
export const GALLERY_INJECTION_BLOCKED_LABEL =
  'Web Store: Chrome blocked injection (see Options)';

/**
 * Documented Chromium limitation — cite in Options when gallery injection fails.
 * Flag `extensions-on-chrome-urls` (chrome://flags) only affects chrome:// URLs,
 * not the public HTTPS gallery (chromewebstore.google.com).
 */
export const GALLERY_CHROME_LIMITATION =
  'Chromium blocks extension content scripts, scripting.insertCSS, and scripting.executeScript on the HTTPS Chrome Web Store gallery. The chrome://flags/#extensions-on-chrome-urls flag applies to chrome:// extension pages only — not chromewebstore.google.com. See https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#restricted-sites';

/**
 * Chrome Web Store gallery hosts — exhaust MV3 paths before showing blocked status.
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
