import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/lib/defaults';
import {
  isNativeDarkSkip,
  makeDetection,
  resolveEffectiveSettings,
} from '../src/lib/resolver';

const baseCtx = {
  origin: 'https://github.com',
  hostname: 'github.com',
  settings: { ...DEFAULT_SETTINGS },
};

describe('resolveEffectiveSettings — Auto mode', () => {
  it('skips Soft when already-dark with high confidence (native-first)', () => {
    const result = resolveEffectiveSettings({
      ...baseCtx,
      detectOutcome: makeDetection('dark', 'high'),
    });

    expect(result.active).toBe(false);
    expect(result.nativeDark).toBe(true);
    expect(result.skipProcessing).toBe(true);
  });

  it('applies Soft when medium-confidence dark (luminance-only, not native skip)', () => {
    const result = resolveEffectiveSettings({
      ...baseCtx,
      detectOutcome: makeDetection('dark', 'medium'),
    });

    expect(result.active).toBe(true);
    expect(result.mode).toBe('soft');
    expect(result.nativeDark).toBe(false);
  });

  it('applies Soft when site is light', () => {
    const result = resolveEffectiveSettings({
      ...baseCtx,
      detectOutcome: makeDetection('light', 'medium'),
    });

    expect(result.active).toBe(true);
    expect(result.mode).toBe('soft');
    expect(result.nativeDark).toBe(false);
  });

  it('defers Soft on Auto when detection is inconclusive unknown', () => {
    const result = resolveEffectiveSettings({
      ...baseCtx,
      detectOutcome: makeDetection('unknown', 'low'),
    });

    expect(result.active).toBe(false);
    expect(result.nativeDark).toBe(false);
    expect(result.mode).toBe('auto');
  });

  it('respects per-site off mode with zero processing', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      siteOverrides: {
        'https://github.com': { mode: 'off' as const, addedAt: Date.now() },
      },
    };

    const result = resolveEffectiveSettings({
      ...baseCtx,
      settings,
      detectOutcome: makeDetection('light', 'high'),
    });

    expect(result.active).toBe(false);
    expect(result.skipProcessing).toBe(true);
  });

  it('forces on when site mode is on regardless of detection', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      siteOverrides: {
        'https://github.com': { mode: 'on' as const, addedAt: Date.now() },
      },
    };

    const result = resolveEffectiveSettings({
      ...baseCtx,
      settings,
      detectOutcome: makeDetection('dark', 'high'),
    });

    expect(result.active).toBe(true);
    expect(result.mode).toBe('on');
  });

  it('uses battery saver soft mode for light sites', () => {
    const settings = { ...DEFAULT_SETTINGS, batterySaver: true };
    const result = resolveEffectiveSettings({
      ...baseCtx,
      settings,
      detectOutcome: makeDetection('light', 'medium'),
    });

    expect(result.active).toBe(true);
    expect(result.mode).toBe('soft');
  });

  it('applies Soft for mixed light+dark pages (never native skip)', () => {
    const result = resolveEffectiveSettings({
      ...baseCtx,
      detectOutcome: makeDetection('mixed', 'medium'),
    });

    expect(result.active).toBe(true);
    expect(result.mode).toBe('soft');
    expect(result.nativeDark).toBe(false);
  });

  it('uses detect cache when battery saver omits live detectOutcome', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      batterySaver: true,
      detectCache: {
        'https://github.com': {
          result: 'dark' as const,
          confidence: 'high' as const,
          timestamp: Date.now(),
        },
      },
    };

    const result = resolveEffectiveSettings({
      origin: 'https://github.com',
      hostname: 'github.com',
      settings,
    });

    expect(result.nativeDark).toBe(true);
    expect(result.active).toBe(false);
  });
});

describe('isNativeDarkSkip', () => {
  it('returns true only for high-confidence dark', () => {
    expect(isNativeDarkSkip(makeDetection('dark', 'high'))).toBe(true);
    expect(isNativeDarkSkip(makeDetection('dark', 'medium'))).toBe(false);
    expect(isNativeDarkSkip(makeDetection('light', 'high'))).toBe(false);
  });
});
