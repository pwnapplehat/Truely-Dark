import type { DetectionOutcome, EffectiveSiteSettings, LiveDetectResponse, SiteMode } from '../types';
import { isNativeDarkSkip } from './resolver';

export type AutoDecision = 'apply-soft' | 'skip-native';

export interface AutoSessionLock {
  decision: AutoDecision;
  detectOutcome: DetectionOutcome;
  lockedAt: number;
  generation: number;
}

/** Minimum time before Auto re-detects after a settled decision (acceptance: 30s stable). */
export const AUTO_SETTLE_COOLDOWN_MS = 30_000;

/** SPA paint-free detect retries before Auto may apply Soft on preferForce / verify hosts (x.ai). */
export const AUTO_SPA_SETTLE_DELAYS_MS = [300, 800, 1500] as const;

/** Shorter window for explicit theme-attribute mutations (user toggled site theme). */
export const AUTO_THEME_MUTATION_COOLDOWN_MS = 5_000;

let generation = 0;
let lock: AutoSessionLock | null = null;

export function bumpAutoGeneration(): number {
  generation += 1;
  lock = null;
  return generation;
}

export function getAutoGeneration(): number {
  return generation;
}

export function resetAutoSession(): void {
  bumpAutoGeneration();
}

export function getAutoSessionLock(): AutoSessionLock | null {
  return lock;
}

export function isDecisiveAutoDetectOutcome(outcome: DetectionOutcome): boolean {
  if (isNativeDarkSkip(outcome)) return true;
  if (outcome.result === 'unknown') return false;
  return true;
}

export function lockAutoDecision(outcome: DetectionOutcome): AutoDecision | null {
  if (!isDecisiveAutoDetectOutcome(outcome)) return null;

  if (!isNativeDarkSkip(outcome)) {
    // apply-soft is locked only post-injection (lockAutoApplyHysteresis) — never at detect time.
    return null;
  }

  lock = {
    decision: 'skip-native',
    detectOutcome: outcome,
    lockedAt: Date.now(),
    generation,
  };
  return 'skip-native';
}

/**
 * Defer Soft on Auto until SPA paint-free detect settles (x.ai pricing, marketing SPAs).
 * Native skip (dark/high) never defers.
 */
export function shouldDeferAutoSoftApply(
  hostname: string,
  outcome: DetectionOutcome | undefined,
  settlePass: number,
  hostPrefersForce: (host: string) => boolean,
  hostRequiresVerify: (host: string) => boolean,
): boolean {
  if (outcome && isNativeDarkSkip(outcome)) return false;
  if (settlePass >= AUTO_SPA_SETTLE_DELAYS_MS.length) return false;
  if (hostPrefersForce(hostname) || hostRequiresVerify(hostname)) return true;
  return outcome?.result === 'unknown' && outcome?.confidence === 'low';
}

/**
 * Auto may lock apply-soft hysteresis only after SPA settle on preferForce hosts,
 * or immediately on non-preferForce hosts with a decisive non-native outcome.
 */
export function shouldLockAutoApplyHysteresis(
  hostname: string,
  outcome: DetectionOutcome | undefined,
  settlePass: number,
  hostPrefersForce: (host: string) => boolean,
): boolean {
  if (!outcome || isNativeDarkSkip(outcome)) return false;
  if (outcome.result === 'unknown') return false;
  if (hostPrefersForce(hostname)) {
    return settlePass >= AUTO_SPA_SETTLE_DELAYS_MS.length;
  }
  return true;
}

/**
 * After Soft successfully applies on Auto, lock apply-soft to prevent invert oscillation.
 * Only used post-injection — never on inconclusive unknown detect.
 */
export function lockAutoApplyHysteresis(outcome: DetectionOutcome = { result: 'light', confidence: 'medium' }): void {
  lock = {
    decision: 'apply-soft',
    detectOutcome: outcome,
    lockedAt: Date.now(),
    generation,
  };
}

export function getLockedAutoDetectOutcome(): DetectionOutcome | undefined {
  return lock?.detectOutcome;
}

export function isAutoDecisionLocked(): boolean {
  return lock !== null && lock.generation === generation;
}

export function msSinceAutoLock(): number {
  if (!lock || lock.generation !== generation) return Number.POSITIVE_INFINITY;
  return Date.now() - lock.lockedAt;
}

/**
 * Paint-free detection runs once per navigation generation, or when explicitly forced.
 * While extension paint is active with a settled lock, never strip and re-detect.
 */
export function shouldRunPaintFreeAutoDetect(
  siteMode: SiteMode,
  extensionActive: boolean,
  forceRedetect: boolean,
): boolean {
  if (siteMode !== 'auto') return false;
  if (forceRedetect) return true;
  if (!isAutoDecisionLocked()) return true;
  if (extensionActive) return false;
  return msSinceAutoLock() >= AUTO_SETTLE_COOLDOWN_MS;
}

/**
 * Theme-related DOM mutations may re-open detection after a shorter cooldown.
 */
export function shouldRedetectOnThemeMutation(siteMode: SiteMode): boolean {
  if (siteMode !== 'auto') return false;
  if (!isAutoDecisionLocked()) return true;
  return msSinceAutoLock() >= AUTO_THEME_MUTATION_COOLDOWN_MS;
}

/**
 * While Soft/On is actively applied by us, resolver must not enter native-skip.
 */
export function resolveAutoDetectOutcome(
  siteMode: SiteMode,
  extensionActive: boolean,
  freshOutcome: DetectionOutcome | undefined,
): DetectionOutcome | undefined {
  if (siteMode !== 'auto') return freshOutcome;

  if (isAutoDecisionLocked() && lock?.decision === 'skip-native') {
    return getLockedAutoDetectOutcome();
  }

  if (freshOutcome && isNativeDarkSkip(freshOutcome)) {
    lockAutoDecision(freshOutcome);
    return freshOutcome;
  }

  if (extensionActive && isAutoDecisionLocked() && lock?.decision === 'apply-soft') {
    return getLockedAutoDetectOutcome();
  }

  if (isAutoDecisionLocked() && !freshOutcome) {
    return getLockedAutoDetectOutcome();
  }

  if (freshOutcome && isAutoDecisionLocked() && lock?.detectOutcome) {
    const locked = lock.detectOutcome;
    if (
      locked.result === freshOutcome.result &&
      locked.confidence === freshOutcome.confidence
    ) {
      return locked;
    }
  }

  return freshOutcome ?? getLockedAutoDetectOutcome();
}

/**
 * Popup / background live detect — prefer settled Auto lock over poisoned live DOM.
 */
export function queryLiveAutoDetection(
  doc: Document,
  detectPaintFree: (document: Document) => DetectionOutcome,
): DetectionOutcome {
  if (isAutoDecisionLocked()) {
    const locked = getLockedAutoDetectOutcome();
    if (locked) return locked;
  }
  return detectPaintFree(doc);
}

/**
 * Build GET_LIVE_DETECT payload for popup status honesty.
 */
export function computeLiveAutoNativeSkip(
  doc: Document,
  detectPaintFree: (document: Document) => DetectionOutcome,
  lastEffective: EffectiveSiteSettings | null,
): LiveDetectResponse {
  const outcome = queryLiveAutoDetection(doc, detectPaintFree);
  const skipNativeLocked =
    isAutoDecisionLocked() && getAutoSessionLock()?.decision === 'skip-native';
  const autoNativeSkip =
    skipNativeLocked ||
    isNativeDarkSkip(outcome) ||
    lastEffective?.nativeDark === true;

  return {
    outcome,
    autoNativeSkip,
    skipNativeLocked,
  };
}
