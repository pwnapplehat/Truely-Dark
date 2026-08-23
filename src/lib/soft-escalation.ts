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
import { isPopupLikelyOpen } from './popup-state';
import { isChromeGalleryHost } from './gallery-access';
import { getHostnameFromUrl, hostRequiresVisualVerify } from './site-packs';
import {
  captureTabVisualAnalysis,
  isSoftAppliedFromVisualAnalysis,
  resolveSoftAppliedFromSignals,
  type VisualSoftAppliedResult,
} from './visual-verify';

const VERIFY_PAINT_DELAY_MS = 200;
const ESCALATION_RETRY_DELAY_MS = 400;

async function paintDelay(ms = VERIFY_PAINT_DELAY_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export interface VisualVerifyOptions {
  skipCapture?: boolean;
}

/**
 * Visual verify for stubborn hosts — inconclusive when popup covers the tab.
 */
export async function verifyVisualSoftApplied(
  windowId: number,
  options: VisualVerifyOptions = {},
): Promise<VisualSoftAppliedResult> {
  if (options.skipCapture || isPopupLikelyOpen()) {
    return { applied: false, inconclusive: true, analysis: null };
  }

  await paintDelay();
  const analysis = await captureTabVisualAnalysis(windowId);
  if (!analysis) {
    return { applied: false, inconclusive: true, analysis: null };
  }

  return {
    applied: isSoftAppliedFromVisualAnalysis(analysis),
    inconclusive: false,
    analysis,
  };
}

/** @deprecated Use verifyVisualSoftApplied */
export async function verifyVisualDarkness(windowId: number): Promise<boolean> {
  const result = await verifyVisualSoftApplied(windowId);
  if (result.inconclusive) return false;
  return result.applied;
}

/**
 * Escalation ladder for stubborn hosts — continues until visually dark or exhausted.
 */
export async function escalateSoftApplication(
  tabId: number,
  windowId: number,
  url: string,
  options: VisualVerifyOptions = {},
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
    const visual = await verifyVisualSoftApplied(windowId, options);
    if (visual.inconclusive) continue;
    if (visual.applied) return true;
  }

  return false;
}

/**
 * Final softApplied truth: contentStrict OR visualDark OR usableDark on verify hosts.
 */
export async function resolveSoftAppliedForTab(
  tabId: number,
  windowId: number,
  url: string,
  contentStrict: boolean,
  options: VisualVerifyOptions = {},
): Promise<boolean> {
  const hostname = getHostnameFromUrl(url);

  if (!hostRequiresVisualVerify(hostname)) {
    return contentStrict;
  }

  if (contentStrict && !isChromeGalleryHost(hostname)) {
    return true;
  }

  if (isChromeGalleryHost(hostname)) {
    const visual = await verifyVisualSoftApplied(windowId, options);
    return !visual.inconclusive && visual.applied;
  }

  if (contentStrict) return true;

  const visual = await verifyVisualSoftApplied(windowId, options);
  if (!visual.inconclusive && visual.applied) return true;

  if (visual.inconclusive) {
    return contentStrict;
  }

  const escalated = await escalateSoftApplication(tabId, windowId, url, options);
  if (escalated) return true;

  if (visual.analysis) {
    return resolveSoftAppliedFromSignals(false, visual.analysis, false);
  }

  return contentStrict;
}
