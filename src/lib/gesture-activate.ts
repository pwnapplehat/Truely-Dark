import { ensureGalleryPermissions, isChromeGalleryUrl } from './gallery-access';
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
import { registerGalleryContentScripts } from './register-content-scripts';
import { settleTabSoftApplied } from './tab-injection-state';
import { getHostnameFromUrl, hostRequiresVisualVerify } from './site-packs';

/**
 * User-gesture activation (popup open / icon click) — required for Chrome Web Store sideload.
 */
export async function gestureActivateSoftForTab(
  tabId: number,
  windowId: number,
  url: string,
): Promise<boolean> {
  if (isChromeGalleryUrl(url)) {
    const granted = await ensureGalleryPermissions(url);
    if (granted) {
      await registerGalleryContentScripts();
    }
  }

  // Aggressive scripting path under user gesture (activeTab + popup click)
  await insertSoftCssForTab(tabId, url, 'html');
  await executeMainWorldSoftFilter(tabId, url, 'html');
  await insertForceStylesheetForTab(tabId, url);
  await executeMainWorldForceStylesheet(tabId, url);
  await insertNuclearForceCssForTab(tabId, url);
  await executeMainWorldNuclearForce(tabId, url);

  const contentStrict = false;
  const applied = await settleTabSoftApplied(tabId, windowId, url, contentStrict, true);

  if (!applied && (isChromeGalleryUrl(url) || hostRequiresVisualVerify(getHostnameFromUrl(url)))) {
    await executeMainWorldNuclearForce(tabId, url);
    return await settleTabSoftApplied(tabId, windowId, url, false, true);
  }

  return applied;
}
