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
import { getHostnameFromUrl, hostRequiresVisualVerify } from './site-packs';
import {
  captureTabVisualAnalysis,
  isVisuallyDarkAnalysis,
} from './visual-verify';

const VERIFY_PAINT_DELAY_MS = 200;
const ESCALATION_RETRY_DELAY_MS = 400;

async function paintDelay(ms = VERIFY_PAINT_DELAY_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sample visible tab pixels — true when viewport is visually dark (strict top-band gate).
 */
export async function verifyVisualDarkness(windowId: number): Promise<boolean> {
  await paintDelay();
  const analysis = await captureTabVisualAnalysis(windowId);
  if (!analysis) return false;
  return isVisuallyDarkAnalysis(analysis);
}

/**
 * Escalation ladder for stubborn hosts — continues until visually dark or exhausted.
 */
export async function escalateSoftApplication(
  tabId: number,
  windowId: number,
  url: string,
): Promise<boolean> {
  const steps: Array<() => Promise<void>> = [
    async () => {
      await insertSoftCssForTab(tabId, url, 'html');
      await executeMainWorldSoftFilter(tabId, url, 'html');
    },
    async () => {
      await insertSoftCssForTab(tabId, url, 'body');
      await executeMainWorldSoftFilter(tabId, url, 'body');
    },
    async () => {
      await insertForceStylesheetForTab(tabId, url);
      await executeMainWorldForceStylesheet(tabId, url);
    },
    async () => {
      await insertNuclearForceCssForTab(tabId, url);
      await executeMainWorldNuclearForce(tabId, url);
    },
    async () => {
      await paintDelay(ESCALATION_RETRY_DELAY_MS);
      await executeMainWorldNuclearForce(tabId, url);
    },
  ];

  for (const step of steps) {
    await step();
    if (await verifyVisualDarkness(windowId)) return true;
  }

  return false;
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
