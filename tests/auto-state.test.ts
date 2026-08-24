// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest';
import {
  bumpAutoGeneration,
  getAutoSessionLock,
  getLockedAutoDetectOutcome,
  isAutoDecisionLocked,
  lockAutoApplyHysteresis,
  lockAutoDecision,
  queryLiveAutoDetection,
  resetAutoSession,
  resolveAutoDetectOutcome,
  shouldRedetectOnThemeMutation,
  shouldRunPaintFreeAutoDetect,
} from '../src/lib/auto-state';
import { detectFromDomPaintFree } from '../src/lib/detect';
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

  it('does not lock apply-soft on inconclusive unknown detect', () => {
    expect(lockAutoDecision(makeDetection('unknown', 'low'))).toBeNull();
    expect(isAutoDecisionLocked()).toBe(false);
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

    const resolved = resolveAutoDetectOutcome(
      'auto',
      true,
      makeDetection('unknown', 'low'),
    );

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

  it('resolveAutoDetectOutcome preserves skip-native lock over extension paint', () => {
    lockAutoDecision(makeDetection('dark', 'high'));

    const resolved = resolveAutoDetectOutcome(
      'auto',
      true,
      makeDetection('unknown', 'low'),
    );

    expect(resolved).toEqual(makeDetection('dark', 'high'));
  });

  it('queryLiveAutoDetection returns locked skip-native for popup status', () => {
    lockAutoDecision(makeDetection('dark', 'high'));
    const outcome = queryLiveAutoDetection(document, detectFromDomPaintFree);
    expect(outcome).toEqual(makeDetection('dark', 'high'));
  });

  it('lockAutoApplyHysteresis prevents oscillation after Soft applies', () => {
    lockAutoApplyHysteresis(makeDetection('light', 'medium'));
    expect(
      resolveAutoDetectOutcome('auto', true, makeDetection('unknown', 'low')),
    ).toEqual(makeDetection('light', 'medium'));
  });
});
