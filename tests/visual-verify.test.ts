import { describe, expect, it } from 'vitest';
import {
  analyzeVisualSamples,
  isVisuallyDarkAnalysis,
  VISUAL_DARK_LUMINANCE_THRESHOLD,
  VISUAL_MAX_LUMINANCE_THRESHOLD,
  VISUAL_SAMPLE_FRACTIONS,
  VISUAL_TOP_BAND_LUMINANCE_THRESHOLD,
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
  });

  it('fails when top band is light but average is pulled down by dark bottom', () => {
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
    expect(analysis.topBandMax).toBeGreaterThan(VISUAL_TOP_BAND_LUMINANCE_THRESHOLD);
    expect(isVisuallyDarkAnalysis(analysis)).toBe(false);
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
    // one bright pixel at center
    const ci = (5 * width + 5) * 4;
    data[ci] = 255;
    data[ci + 1] = 255;
    data[ci + 2] = 255;

    const analysis = analyzeVisualSamples(data, width, height, [[0.5, 0.5]]);
    expect(analysis.max).toBeGreaterThan(VISUAL_MAX_LUMINANCE_THRESHOLD);
    expect(isVisuallyDarkAnalysis(analysis)).toBe(false);
  });
});
