import { isChromeGalleryUrl } from './gallery-access';
import { attemptGalleryInjection } from './gallery-injection';
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
import { setTabSoftApplied, settleTabSoftApplied } from './tab-injection-state';
import { getHostnameFromUrl, hostPrefersForceStylesheet, hostRequiresVisualVerify } from './site-packs';
import { verifyVisualDarkness } from './soft-escalation';

export interface GestureActivateOptions {
  enableOnRestrictedPages: boolean;
}

async function attemptStandardInjection(tabId: number, url: string): Promise<boolean> {
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

  const injectionSucceeded = gallery
    ? await attemptGalleryInjection(tabId, url)
    : await attemptStandardInjection(tabId, url);

  if (gallery) {
    const visuallyDark = await verifyVisualDarkness(windowId);
    if (visuallyDark) {
      setTabSoftApplied(tabId, true);
      return true;
    }

    const applied = await settleTabSoftApplied(tabId, windowId, url, false, true);
    if (applied) return true;

    settleGalleryTabBlocked(tabId);
    return false;
  }

  let applied = await settleTabSoftApplied(tabId, windowId, url, false, true);

  if (
    !applied &&
    (hostRequiresVisualVerify(getHostnameFromUrl(url)) || injectionSucceeded)
  ) {
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
