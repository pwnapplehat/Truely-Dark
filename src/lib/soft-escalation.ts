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
import {
  getHostnameFromUrl,
  hostPrefersForceStylesheet,
  hostRequiresMarketingVisualVerify,
  hostRequiresVisualVerify,
} from './site-packs';
import {
  captureTabVisualAnalysis,
  isMarketingVisualQuality,
  isSoftAppliedFromVisualAnalysis,
  resolveSoftAppliedFromSignals,
  VISUAL_APPLIED_AVERAGE_THRESHOLD,
  type VisualSoftAppliedResult,
} from './visual-verify';

const VERIFY_PAINT_DELAY_MS = 200;
const ESCALATION_RETRY_DELAY_MS = 400;

async function paintDelay(ms = VERIFY_PAINT_DELAY_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export interface VisualVerifyOptions {
  skipCapture?: boolean;
  hostname?: string;
}

function isVisualAppliedForHost(
  hostname: string,
  analysis: import('./visual-verify').VisualSampleAnalysis,
): boolean {
  if (hostRequiresMarketingVisualVerify(hostname)) {
    return isMarketingVisualQuality(analysis);
  }
  return isSoftAppliedFromVisualAnalysis(analysis);
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

  const hostname = options.hostname ?? '';

  return {
    applied: isVisualAppliedForHost(hostname, analysis),
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
  const hostname = getHostnameFromUrl(url);
  const verifyOptions: VisualVerifyOptions = { ...options, hostname };

  const forceSteps: Array<() => Promise<void>> = [
    async () => {
      await insertForceStylesheetForTab(tabId, url);
      await executeMainWorldForceStylesheet(tabId, url);
    },
    async () => {
      await paintDelay(ESCALATION_RETRY_DELAY_MS);
      await executeMainWorldForceStylesheet(tabId, url);
    },
  ];

  const invertSteps: Array<() => Promise<void>> = [
    async () => {
      await insertSoftCssForTab(tabId, url, 'html');
      await executeMainWorldSoftFilter(tabId, url, 'html');
    },
    async () => {
      await insertSoftCssForTab(tabId, url, 'body');
      await executeMainWorldSoftFilter(tabId, url, 'body');
    },
    ...forceSteps,
  ];

  const steps = hostPrefersForceStylesheet(hostname) ? forceSteps : invertSteps;

  for (const step of steps) {
    await step();
    const visual = await verifyVisualSoftApplied(windowId, verifyOptions);
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
  const verifyOptions: VisualVerifyOptions = { ...options, hostname };

  if (contentStrict && hostPrefersForceStylesheet(hostname)) {
    return true;
  }

  if (!hostRequiresVisualVerify(hostname)) {
    return contentStrict;
  }

  if (
    contentStrict &&
    !isChromeGalleryHost(hostname) &&
    !hostRequiresMarketingVisualVerify(hostname)
  ) {
    return true;
  }

  if (isChromeGalleryHost(hostname)) {
    const visual = await verifyVisualSoftApplied(windowId, verifyOptions);
    return !visual.inconclusive && visual.applied;
  }

  const visual = await verifyVisualSoftApplied(windowId, verifyOptions);
  if (!visual.inconclusive && visual.applied) return true;

  if (visual.inconclusive) {
    if (hostPrefersForceStylesheet(hostname)) {
      return contentStrict;
    }
    return hostRequiresMarketingVisualVerify(hostname) ? false : contentStrict;
  }

  const escalated = await escalateSoftApplication(tabId, windowId, url, verifyOptions);
  if (escalated) return true;

  if (visual.analysis && hostRequiresMarketingVisualVerify(hostname)) {
    if (
      hostPrefersForceStylesheet(hostname) &&
      visual.analysis.average < VISUAL_APPLIED_AVERAGE_THRESHOLD
    ) {
      return true;
    }
    return false;
  }

  if (visual.analysis) {
    return resolveSoftAppliedFromSignals(false, visual.analysis, false);
  }

  return contentStrict;
}
