import {
  insertForceStylesheetForTab,
  insertNuclearForceCssForTab,
  insertSoftCssForTab,
} from './insert-css-fallback';
import {
  executeMainWorldForceStylesheet,
  executeMainWorldNuclearForce,
  executeMainWorldSoftFilter,
} from './main-world-inject';
import { isGalleryInjectionExhausted } from './gallery-gesture-state';
import { isChromeGalleryUrl } from './gallery-access';
import { registerGalleryContentScripts } from './register-content-scripts';
import { getHostnameFromUrl, hostPrefersForceStylesheet } from './site-packs';

/**
 * Exhaust MV3 injection paths for Chrome Web Store gallery tabs.
 * Uses host_permissions + activeTab user gesture (popup open counts).
 * No-ops after a failed gesture ladder until navigation clears exhausted state.
 */
export async function attemptGalleryInjection(tabId: number, url: string): Promise<boolean> {
  if (!isChromeGalleryUrl(url) || isGalleryInjectionExhausted(tabId)) {
    return false;
  }
  try {
    await registerGalleryContentScripts();
  } catch {
    // activeTab scripting may still work without dynamic registration
  }

  const hostname = getHostnameFromUrl(url);
  const preferForce = hostPrefersForceStylesheet(hostname);

  const softInserted = preferForce ? false : await insertSoftCssForTab(tabId, url, 'html');
  const softMain = preferForce ? false : await executeMainWorldSoftFilter(tabId, url, 'html');
  const forceInserted = await insertForceStylesheetForTab(tabId, url);
  const forceMain = await executeMainWorldForceStylesheet(tabId, url);
  const nuclearInserted = preferForce ? false : await insertNuclearForceCssForTab(tabId, url);
  const nuclearMain = preferForce ? false : await executeMainWorldNuclearForce(tabId, url);

  return (
    softInserted ||
    softMain ||
    forceInserted ||
    forceMain ||
    nuclearInserted ||
    nuclearMain
  );
}
