import type { DetectionOutcome, LiveDetectResponse, SiteMode } from '../types';
import { isNativeDarkSkip } from './resolver';

export interface LiveDetectQueryResult {
  detectOutcome?: DetectionOutcome;
  autoNativeSkip?: boolean;
  skipNativeLocked?: boolean;
}

/** Popup GET_TAB_INFO must not hang on content-script round-trips. */
export const LIVE_DETECT_QUERY_TIMEOUT_MS = 800;

/** PreferForce settle cap while popup is open. */
export const POPUP_SETTLE_TIMEOUT_MS = 800;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), ms);
    }),
  ]);
}

/** Main frame only — allFrames content scripts otherwise race on tabs.sendMessage. */
export async function queryTabLiveDetection(tabId: number): Promise<LiveDetectQueryResult> {
  try {
    const response = await withTimeout(
      browser.tabs.sendMessage(
        tabId,
        { type: 'GET_LIVE_DETECT' },
        { frameId: 0 },
      ),
      LIVE_DETECT_QUERY_TIMEOUT_MS,
      undefined,
    );
    return parseLiveDetectResponse(response);
  } catch {
    // Content script may not be ready yet
  }
  return {};
}

/**
 * Parse GET_LIVE_DETECT payload from the main-frame content script.
 */
export function parseLiveDetectResponse(
  response: LiveDetectResponse | DetectionOutcome | undefined,
): LiveDetectQueryResult {
  if (!response || typeof response !== 'object') {
    return {};
  }

  if ('outcome' in response) {
    const { outcome, autoNativeSkip, skipNativeLocked } = response;
    if (outcome?.result && outcome.confidence) {
      return {
        detectOutcome: outcome,
        autoNativeSkip: autoNativeSkip === true,
        skipNativeLocked: skipNativeLocked === true,
      };
    }
    return {};
  }

  const legacy = response as DetectionOutcome;
  if (legacy.result && legacy.confidence) {
    return { detectOutcome: legacy };
  }
  return {};
}

/**
 * Popup status truth: Auto native skip from resolver, live detect, or skip-native lock.
 */
export function resolveAutoNativeDarkForTab(
  siteMode: SiteMode,
  effectiveNativeDark: boolean,
  live: LiveDetectQueryResult,
): boolean {
  if (effectiveNativeDark) return true;
  if (siteMode !== 'auto') return false;
  if (live.autoNativeSkip === true) return true;
  if (live.skipNativeLocked === true) return true;
  if (live.detectOutcome && isNativeDarkSkip(live.detectOutcome)) return true;
  return false;
}
