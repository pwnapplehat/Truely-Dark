import type { DetectionOutcome, SiteMode } from '../types';
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

export function lockAutoDecision(outcome: DetectionOutcome): AutoDecision {
  const decision: AutoDecision = isNativeDarkSkip(outcome) ? 'skip-native' : 'apply-soft';
  lock = {
    decision,
    detectOutcome: outcome,
    lockedAt: Date.now(),
    generation,
  };
  return decision;
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

  if (extensionActive && isAutoDecisionLocked()) {
    const locked = getLockedAutoDetectOutcome();
    if (locked && lock?.decision === 'apply-soft') {
      return locked;
    }
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
