import { describe, expect, it } from 'vitest';
import {
  analyzeBackdropSamples,
  computeLuminance,
  detectFromAuthoredSignals,
  detectFromSignals,
  detectPageTheme,
  isDetectCacheValid,
  isExtensionInjectedBackground,
  isHighConfidenceDark,
  parseColor,
  purgePoisonedDetectCache,
} from '../src/lib/detect';
import { DEFAULT_SETTINGS } from '../src/lib/defaults';
import { makeDetection, resolveEffectiveSettings } from '../src/lib/resolver';

describe('computeLuminance', () => {
  it('returns 0 for black', () => {
    expect(computeLuminance(0, 0, 0)).toBe(0);
  });

  it('returns 1 for white', () => {
    expect(computeLuminance(1, 1, 1)).toBe(1);
  });

  it('returns mid value for gray', () => {
    const lum = computeLuminance(0.5, 0.5, 0.5);
    expect(lum).toBeGreaterThan(0.2);
    expect(lum).toBeLessThan(0.3);
  });
});

describe('parseColor', () => {
  it('parses hex colors', () => {
    expect(parseColor('#121212')).toEqual({ r: 18, g: 18, b: 18 });
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('parses rgb colors', () => {
    expect(parseColor('rgb(18, 18, 18)')).toEqual({ r: 18, g: 18, b: 18 });
    expect(parseColor('rgba(0, 0, 0, 0.5)')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('returns null for transparent', () => {
    expect(parseColor('transparent')).toBeNull();
    expect(parseColor('rgba(0, 0, 0, 0)')).toBeNull();
  });
});

describe('isExtensionInjectedBackground', () => {
  it('detects preload #121212 as extension-injected', () => {
    expect(isExtensionInjectedBackground('#121212')).toBe(true);
    expect(isExtensionInjectedBackground('rgb(18, 18, 18)')).toBe(true);
  });

  it('does not flag white Wikipedia backgrounds', () => {
    expect(isExtensionInjectedBackground('#ffffff')).toBe(false);
    expect(isExtensionInjectedBackground('rgb(255, 255, 255)')).toBe(false);
  });
});

describe('detectFromAuthoredSignals', () => {
  it('detects dark from data-theme with high confidence', () => {
    expect(detectFromAuthoredSignals({ dataTheme: 'dark' })).toEqual({
      result: 'dark',
      confidence: 'high',
    });
  });

  it('detects GitHub-style data-color-mode=dark', () => {
    expect(detectFromAuthoredSignals({ dataColorMode: 'dark' })).toEqual({
      result: 'dark',
      confidence: 'high',
    });
  });

  it('detects light from data-theme', () => {
    expect(detectFromAuthoredSignals({ dataTheme: 'light' }).result).toBe('light');
  });
});

describe('detectFromSignals — preload poison resistance', () => {
  it('ignores computed color-scheme dark from preload', () => {
    const outcome = detectFromSignals({ colorScheme: 'dark' });
    expect(outcome.result).toBe('unknown');
    expect(outcome.confidence).toBe('low');
  });

  it('ignores preload #121212 html/body backgrounds (Wikipedia/HN false positive)', () => {
    const outcome = detectFromSignals({
      colorScheme: 'dark',
      htmlBackground: '#121212',
      bodyBackground: 'rgb(18, 18, 18)',
    });
    expect(outcome.result).toBe('unknown');
    expect(outcome.confidence).toBe('low');
  });

  it('detects light from non-poisoned white background', () => {
    expect(detectFromSignals({ htmlBackground: '#ffffff' }).result).toBe('light');
  });

  it('returns unknown when no signals', () => {
    expect(detectFromSignals({})).toEqual({ result: 'unknown', confidence: 'low' });
  });
});

describe('Auto mode — poisoned preload signals', () => {
  it('Wikipedia-like light site → Soft active, not native skip', () => {
    const poisoned = detectFromSignals({
      colorScheme: 'dark',
      htmlBackground: '#121212',
      bodyBackground: '#121212',
    });

    const result = resolveEffectiveSettings({
      origin: 'https://en.wikipedia.org',
      hostname: 'en.wikipedia.org',
      settings: DEFAULT_SETTINGS,
      detectOutcome: poisoned,
    });

    expect(result.active).toBe(true);
    expect(result.mode).toBe('soft');
    expect(result.nativeDark).toBe(false);
  });

  it('Hacker News-like light site → Soft active', () => {
    const poisoned = detectFromSignals({
      colorScheme: 'dark',
      htmlBackground: 'rgb(18, 18, 18)',
    });

    const result = resolveEffectiveSettings({
      origin: 'https://news.ycombinator.com',
      hostname: 'news.ycombinator.com',
      settings: DEFAULT_SETTINGS,
      detectOutcome: poisoned,
    });

    expect(result.active).toBe(true);
    expect(result.nativeDark).toBe(false);
  });

  it('GitHub data-color-mode=dark → native skip', () => {
    const outcome = detectFromAuthoredSignals({ dataColorMode: 'dark' });
    const result = resolveEffectiveSettings({
      origin: 'https://github.com',
      hostname: 'github.com',
      settings: DEFAULT_SETTINGS,
      detectOutcome: outcome,
    });

    expect(result.active).toBe(false);
    expect(result.nativeDark).toBe(true);
  });
});

describe('purgePoisonedDetectCache', () => {
  it('removes medium-confidence dark entries', () => {
    const cache = {
      'https://en.wikipedia.org': {
        result: 'dark' as const,
        confidence: 'medium' as const,
        timestamp: Date.now(),
      },
      'https://github.com': {
        result: 'dark' as const,
        confidence: 'high' as const,
        timestamp: Date.now(),
      },
    };

    const cleaned = purgePoisonedDetectCache(cache);
    expect(cleaned['https://en.wikipedia.org']).toBeUndefined();
    expect(cleaned['https://github.com']).toBeDefined();
  });
});

describe('isHighConfidenceDark', () => {
  it('returns true only for dark + high confidence', () => {
    expect(isHighConfidenceDark({ result: 'dark', confidence: 'high' })).toBe(true);
    expect(isHighConfidenceDark({ result: 'dark', confidence: 'medium' })).toBe(false);
    expect(isHighConfidenceDark({ result: 'light', confidence: 'high' })).toBe(false);
  });
});

describe('analyzeBackdropSamples', () => {
  it('returns high luminance for white samples', () => {
    const samples = Array.from({ length: 10 }, () => ({ r: 255, g: 255, b: 255 }));
    const { luminance } = analyzeBackdropSamples(samples);
    expect(luminance).toBeGreaterThan(0.9);
  });

  it('returns low luminance for dark samples', () => {
    const samples = Array.from({ length: 10 }, () => ({ r: 18, g: 18, b: 18 }));
    const { luminance } = analyzeBackdropSamples(samples);
    expect(luminance).toBeLessThan(0.1);
  });

  it('handles empty samples', () => {
    const { luminance, variance } = analyzeBackdropSamples([]);
    expect(luminance).toBe(1);
    expect(variance).toBe(0);
  });
});

describe('detectPageTheme', () => {
  it('does not treat dark backdrop alone as native-dark skip signal', () => {
    const darkSamples = Array.from({ length: 20 }, () => ({ r: 20, g: 20, b: 30 }));
    expect(detectPageTheme({}, darkSamples).result).toBe('unknown');
  });

  it('prefers authored signal over backdrop', () => {
    const lightSamples = Array.from({ length: 20 }, () => ({ r: 255, g: 255, b: 255 }));
    expect(detectPageTheme({ dataTheme: 'dark' }, lightSamples).result).toBe('dark');
  });
});

describe('isDetectCacheValid', () => {
  it('returns true for recent timestamps', () => {
    expect(isDetectCacheValid(Date.now() - 1000, 60000)).toBe(true);
  });

  it('returns false for expired timestamps', () => {
    expect(isDetectCacheValid(Date.now() - 120000, 60000)).toBe(false);
  });
});
