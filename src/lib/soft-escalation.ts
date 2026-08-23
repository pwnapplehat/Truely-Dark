import {
  insertForceStylesheetForTab,
  insertSoftCssForTab,
} from './insert-css-fallback';
import {
  executeMainWorldForceStylesheet,
  executeMainWorldSoftFilter,
} from './main-world-inject';
import { getHostnameFromUrl, hostRequiresVisualVerify } from './site-packs';
import {
  captureTabAverageLuminance,
  isVisuallyDarkLuminance,
} from './visual-verify';

const VERIFY_PAINT_DELAY_MS = 150;

async function paintDelay(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, VERIFY_PAINT_DELAY_MS));
}

/**
 * Sample visible tab pixels — true when viewport is visually dark.
 */
export async function verifyVisualDarkness(windowId: number): Promise<boolean> {
  await paintDelay();
  const luminance = await captureTabAverageLuminance(windowId);
  if (luminance === null) return false;
  return isVisuallyDarkLuminance(luminance);
}

/**
 * Escalation ladder for stubborn hosts: insertCSS → MAIN filter → force stylesheet.
 */
export async function escalateSoftApplication(
  tabId: number,
  windowId: number,
  url: string,
): Promise<boolean> {
  await insertSoftCssForTab(tabId, url, 'html');
  await executeMainWorldSoftFilter(tabId, url, 'html');
  if (await verifyVisualDarkness(windowId)) return true;

  await insertSoftCssForTab(tabId, url, 'body');
  await executeMainWorldSoftFilter(tabId, url, 'body');
  if (await verifyVisualDarkness(windowId)) return true;

  await insertForceStylesheetForTab(tabId, url);
  await executeMainWorldForceStylesheet(tabId, url);
  return await verifyVisualDarkness(windowId);
}

/**
 * Final softApplied truth: stubborn hosts require visual verify; others use content strict check.
 */
export async function resolveSoftAppliedForTab(
  tabId: number,
  windowId: number,
  url: string,
  contentStrict: boolean,
): Promise<boolean> {
  const hostname = getHostnameFromUrl(url);

  if (!hostRequiresVisualVerify(hostname)) {
    return contentStrict;
  }

  if (await verifyVisualDarkness(windowId)) {
    return true;
  }

  return await escalateSoftApplication(tabId, windowId, url);
}
