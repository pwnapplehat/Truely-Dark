import { getHostnameFromUrl } from './site-packs';

export const CHROME_GALLERY_ORIGINS = [
  'https://chromewebstore.google.com/*',
  'https://chrome.google.com/*',
] as const;

const GALLERY_HOSTNAMES = ['chromewebstore.google.com', 'chrome.google.com'] as const;

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

/**
 * Request explicit gallery origins when optional permission is not yet granted.
 * Opening the popup counts as a user gesture for permissions.request + scripting.
 */
export async function ensureGalleryPermissions(url: string): Promise<boolean> {
  if (!isChromeGalleryUrl(url)) return true;

  try {
    const hasAll = await browser.permissions.contains({
      origins: [...CHROME_GALLERY_ORIGINS],
    });
    if (hasAll) return true;

    return await browser.permissions.request({ origins: [...CHROME_GALLERY_ORIGINS] });
  } catch {
    // activeTab may still allow scripting on the active tab
    return true;
  }
}
