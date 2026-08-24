import { describe, expect, it } from 'vitest';
import {
  parseLiveDetectResponse,
  resolveAutoNativeDarkForTab,
} from '../src/lib/live-detect-bridge';
import { makeDetection } from '../src/lib/resolver';

describe('parseLiveDetectResponse', () => {
  it('parses structured GET_LIVE_DETECT with autoNativeSkip and skipNativeLocked', () => {
    expect(
      parseLiveDetectResponse({
        outcome: makeDetection('dark', 'high'),
        autoNativeSkip: true,
        skipNativeLocked: true,
      }),
    ).toEqual({
      detectOutcome: makeDetection('dark', 'high'),
      autoNativeSkip: true,
      skipNativeLocked: true,
    });
  });

  it('parses legacy plain DetectionOutcome', () => {
    expect(parseLiveDetectResponse(makeDetection('dark', 'high'))).toEqual({
      detectOutcome: makeDetection('dark', 'high'),
    });
  });
});

describe('resolveAutoNativeDarkForTab', () => {
  it('returns true for Auto when live detect reports autoNativeSkip', () => {
    expect(
      resolveAutoNativeDarkForTab('auto', false, {
        detectOutcome: makeDetection('unknown', 'low'),
        autoNativeSkip: true,
      }),
    ).toBe(true);
  });

  it('returns true for Auto when skip-native lock is exposed', () => {
    expect(
      resolveAutoNativeDarkForTab('auto', false, {
        detectOutcome: makeDetection('dark', 'high'),
        skipNativeLocked: true,
      }),
    ).toBe(true);
  });

  it('returns false for Soft mode even when live skip flags set', () => {
    expect(
      resolveAutoNativeDarkForTab('soft', false, {
        autoNativeSkip: true,
        skipNativeLocked: true,
      }),
    ).toBe(false);
  });
});
