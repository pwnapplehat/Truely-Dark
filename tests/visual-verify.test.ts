import { describe, expect, it } from 'vitest';
import {
  analyzeVisualSamples,
  isSoftAppliedFromVisualAnalysis,
  isUsableDarkAnalysis,
  isVisuallyDarkAnalysis,
  resolveSoftAppliedFromSignals,
  VISUAL_APPLIED_AVERAGE_THRESHOLD,
  VISUAL_SAMPLE_FRACTIONS,
  VISUAL_USABLE_TOP_BAND_THRESHOLD,
} from '../src/lib/visual-verify';

describe('visual-verify strict top-band gate', () => {
  it('passes uniform dark viewport', () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 10;
      data[i + 1] = 10;
      data[i + 2] = 10;
      data[i + 3] = 255;
    }
    const analysis = analyzeVisualSamples(data, width, height, VISUAL_SAMPLE_FRACTIONS);
    expect(isVisuallyDarkAnalysis(analysis)).toBe(true);
    expect(isSoftAppliedFromVisualAnalysis(analysis)).toBe(true);
  });

  it('fails when top band is fully light but average is pulled down by dark bottom', () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const isTop = y < 25;
        const v = isTop ? 255 : 10;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 255;
      }
    }
    const analysis = analyzeVisualSamples(data, width, height, VISUAL_SAMPLE_FRACTIONS);
    expect(analysis.topBandMax).toBeGreaterThan(VISUAL_USABLE_TOP_BAND_THRESHOLD);
    expect(isSoftAppliedFromVisualAnalysis(analysis)).toBe(false);
  });

  it('fails when max hotspot exceeds threshold', () => {
    const width = 10;
    const height = 10;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 20;
      data[i + 1] = 20;
      data[i + 2] = 20;
      data[i + 3] = 255;
    }
    const ci = (5 * width + 5) * 4;
    data[ci] = 255;
    data[ci + 1] = 255;
    data[ci + 2] = 255;

    const analysis = analyzeVisualSamples(data, width, height, [[0.5, 0.5]]);
    expect(isSoftAppliedFromVisualAnalysis(analysis)).toBe(false);
  });

  it('passes OVH-like usable-dark: dark page + slightly lighter top side gutters', () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const inTopBand = y < 25;
        const sideGutter = x < 10 || x > 89;
        const v = inTopBand && sideGutter ? 185 : 18;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 255;
      }
    }
    const analysis = analyzeVisualSamples(data, width, height, VISUAL_SAMPLE_FRACTIONS);
    expect(analysis.average).toBeLessThan(VISUAL_APPLIED_AVERAGE_THRESHOLD);
    expect(isUsableDarkAnalysis(analysis)).toBe(true);
    expect(isSoftAppliedFromVisualAnalysis(analysis)).toBe(true);
    expect(resolveSoftAppliedFromSignals(false, analysis, false)).toBe(true);
  });

  it('contentStrict OR visual passes when either signal is true', () => {
    const dark = analyzeVisualSamples(
      new Uint8ClampedArray([10, 10, 10, 255]),
      1,
      1,
      [[0.5, 0.5]],
    );
    expect(resolveSoftAppliedFromSignals(true, dark, false)).toBe(true);
    expect(resolveSoftAppliedFromSignals(false, dark, false)).toBe(true);
    expect(resolveSoftAppliedFromSignals(false, null, true)).toBe(false);
  });
});
