import { describe, expect, it } from 'vitest';
import {
  averageLuminanceFromSamples,
  isVisuallyDarkLuminance,
  VISUAL_DARK_LUMINANCE_THRESHOLD,
} from '../src/lib/visual-verify';

describe('visual-verify helpers', () => {
  it('detects dark average luminance from black pixels', () => {
    const width = 10;
    const height = 10;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }

    const avg = averageLuminanceFromSamples(data, width, height);
    expect(avg).toBeLessThan(VISUAL_DARK_LUMINANCE_THRESHOLD);
    expect(isVisuallyDarkLuminance(avg)).toBe(true);
  });

  it('detects light average luminance from white pixels', () => {
    const width = 10;
    const height = 10;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }

    const avg = averageLuminanceFromSamples(data, width, height);
    expect(avg).toBeGreaterThan(VISUAL_DARK_LUMINANCE_THRESHOLD);
    expect(isVisuallyDarkLuminance(avg)).toBe(false);
  });
});
