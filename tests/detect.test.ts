import { describe, expect, it } from 'vitest';
import {
  analyzeBackdropSamples,
  computeLuminance,
  detectFromSignals,
  detectPageTheme,
  isDetectCacheValid,
  isHighConfidenceDark,
  parseColor,
} from '../src/lib/detect';

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

describe('detectFromSignals', () => {
  it('detects dark from data-theme with high confidence', () => {
    expect(detectFromSignals({ dataTheme: 'dark' })).toEqual({
      result: 'dark',
      confidence: 'high',
    });
    expect(detectFromSignals({ dataTheme: 'night' })).toEqual({
      result: 'dark',
      confidence: 'high',
    });
  });

  it('detects light from data-theme', () => {
    expect(detectFromSignals({ dataTheme: 'light' }).result).toBe('light');
  });

  it('detects dark from color-scheme with high confidence', () => {
    const outcome = detectFromSignals({ colorScheme: 'dark' });
    expect(outcome.result).toBe('dark');
    expect(outcome.confidence).toBe('high');
  });

  it('detects dark from dark background with medium confidence', () => {
    const outcome = detectFromSignals({ bodyBackground: '#121212' });
    expect(outcome.result).toBe('dark');
    expect(outcome.confidence).toBe('medium');
  });

  it('detects light from light background', () => {
    expect(detectFromSignals({ htmlBackground: '#ffffff' }).result).toBe('light');
  });

  it('returns unknown when no signals', () => {
    expect(detectFromSignals({})).toEqual({ result: 'unknown', confidence: 'low' });
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
  it('combines signals and backdrop', () => {
    const darkSamples = Array.from({ length: 20 }, () => ({ r: 20, g: 20, b: 30 }));
    expect(detectPageTheme({}, darkSamples).result).toBe('dark');
  });

  it('prefers signal over backdrop', () => {
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
