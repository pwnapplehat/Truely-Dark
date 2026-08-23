import { isChromeGalleryUrl } from './gallery-access';
import { markGalleryGestureAttempted } from './gallery-gesture-state';
import { settleGalleryTabBlocked } from './gallery-tab-status';
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
import { setTabSoftApplied, settleTabSoftApplied } from './tab-injection-state';
import { getHostnameFromUrl, hostRequiresVisualVerify } from './site-packs';
import { verifyVisualDarkness } from './soft-escalation';

export interface GestureActivateOptions {
  enableOnRestrictedPages: boolean;
}

/**
 * User-gesture activation (popup open / icon click) — required for Chrome Web Store sideload.
 * Uses activeTab + scripting immediately; does not call permissions.request.
 */
export async function gestureActivateSoftForTab(
  tabId: number,
  windowId: number,
  url: string,
  options: GestureActivateOptions,
): Promise<boolean> {
  markGalleryGestureAttempted(tabId);

  const gallery = isChromeGalleryUrl(url);

  if (gallery && !options.enableOnRestrictedPages) {
    settleGalleryTabBlocked(tabId);
    return false;
  }

  if (gallery) {
    try {
      await registerGalleryContentScripts();
    } catch {
      // activeTab scripting may still work without dynamic registration
    }
  }

  const softInserted = await insertSoftCssForTab(tabId, url, 'html');
  const softMain = await executeMainWorldSoftFilter(tabId, url, 'html');
  const forceInserted = await insertForceStylesheetForTab(tabId, url);
  const forceMain = await executeMainWorldForceStylesheet(tabId, url);
  const nuclearInserted = await insertNuclearForceCssForTab(tabId, url);
  const nuclearMain = await executeMainWorldNuclearForce(tabId, url);

  const injectionSucceeded =
    softInserted ||
    softMain ||
    forceInserted ||
    forceMain ||
    nuclearInserted ||
    nuclearMain;

  if (gallery) {
    const visuallyDark = await verifyVisualDarkness(windowId);
    if (visuallyDark) {
      setTabSoftApplied(tabId, true);
      return true;
    }
    settleGalleryTabBlocked(tabId);
    return false;
  }

  let applied = await settleTabSoftApplied(tabId, windowId, url, false, true);

  if (
    !applied &&
    (hostRequiresVisualVerify(getHostnameFromUrl(url)) || injectionSucceeded)
  ) {
    await executeMainWorldNuclearForce(tabId, url);
    applied = await settleTabSoftApplied(tabId, windowId, url, false, true);
    if (!applied && injectionSucceeded) {
      const visuallyDark = await verifyVisualDarkness(windowId);
      if (visuallyDark) {
        setTabSoftApplied(tabId, true);
        return true;
      }
    }
  }

  return applied;
}
