import { describe, expect, it, beforeEach } from 'vitest';
import {
  AUTO_SETTLE_COOLDOWN_MS,
  bumpAutoGeneration,
  getAutoSessionLock,
  getLockedAutoDetectOutcome,
  isAutoDecisionLocked,
  lockAutoDecision,
  msSinceAutoLock,
  resetAutoSession,
  resolveAutoDetectOutcome,
  shouldRedetectOnThemeMutation,
  shouldRunPaintFreeAutoDetect,
} from '../src/lib/auto-state';
import { makeDetection } from '../src/lib/resolver';

describe('auto-state — hysteresis and settle lock', () => {
  beforeEach(() => {
    resetAutoSession();
  });

  it('locks apply-soft on light detect outcome', () => {
    const outcome = makeDetection('light', 'medium');
    expect(lockAutoDecision(outcome)).toBe('apply-soft');
    expect(isAutoDecisionLocked()).toBe(true);
    expect(getAutoSessionLock()?.decision).toBe('apply-soft');
  });

  it('locks skip-native on high-confidence dark', () => {
    const outcome = makeDetection('dark', 'high');
    expect(lockAutoDecision(outcome)).toBe('skip-native');
    expect(getAutoSessionLock()?.decision).toBe('skip-native');
  });

  it('does not run paint-free detect while extension active and locked', () => {
    lockAutoDecision(makeDetection('light', 'medium'));
    expect(shouldRunPaintFreeAutoDetect('auto', true, false)).toBe(false);
  });

  it('runs paint-free detect once before extension applies', () => {
    expect(shouldRunPaintFreeAutoDetect('auto', false, false)).toBe(true);
  });

  it('forces paint-free detect when explicitly requested', () => {
    lockAutoDecision(makeDetection('light', 'medium'));
    expect(shouldRunPaintFreeAutoDetect('auto', true, true)).toBe(true);
  });

  it('resolveAutoDetectOutcome preserves apply-soft lock while extension active', () => {
    const locked = makeDetection('light', 'medium');
    lockAutoDecision(locked);

    const poisonedNative = makeDetection('dark', 'high');
    const resolved = resolveAutoDetectOutcome('auto', true, poisonedNative);

    expect(resolved).toEqual(locked);
  });

  it('resolveAutoDetectOutcome returns locked outcome when fresh detect skipped', () => {
    const locked = makeDetection('dark', 'high');
    lockAutoDecision(locked);

    expect(resolveAutoDetectOutcome('auto', false, undefined)).toEqual(locked);
    expect(getLockedAutoDetectOutcome()).toEqual(locked);
  });

  it('resetAutoSession clears lock on navigation', () => {
    lockAutoDecision(makeDetection('light', 'medium'));
    resetAutoSession();
    expect(isAutoDecisionLocked()).toBe(false);
    expect(getLockedAutoDetectOutcome()).toBeUndefined();
  });

  it('bumpAutoGeneration invalidates prior lock', () => {
    lockAutoDecision(makeDetection('light', 'medium'));
    bumpAutoGeneration();
    expect(isAutoDecisionLocked()).toBe(false);
  });

  it('shouldRedetectOnThemeMutation respects shorter cooldown', () => {
    lockAutoDecision(makeDetection('light', 'medium'));
    expect(shouldRedetectOnThemeMutation('auto')).toBe(false);
    expect(msSinceAutoLock()).toBeLessThan(AUTO_SETTLE_COOLDOWN_MS);
  });
});
