import { beforeEach, describe, expect, it, vi } from 'vitest';
import { markPopupOpen } from '../src/lib/popup-state';
import { resolveSoftAppliedForTab } from '../src/lib/soft-escalation';

vi.mock('../src/lib/visual-verify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/visual-verify')>();
  return {
    ...actual,
    captureTabVisualAnalysis: vi.fn(),
  };
});

vi.mock('../src/lib/insert-css-fallback', () => ({
  insertSoftCssForTab: vi.fn(async () => false),
  insertForceStylesheetForTab: vi.fn(async () => false),
  insertNuclearForceCssForTab: vi.fn(async () => false),
}));

vi.mock('../src/lib/main-world-inject', () => ({
  executeMainWorldSoftFilter: vi.fn(async () => false),
  executeMainWorldForceStylesheet: vi.fn(async () => false),
  executeMainWorldNuclearForce: vi.fn(async () => false),
}));

import { captureTabVisualAnalysis } from '../src/lib/visual-verify';

describe('resolveSoftAppliedForTab OVH signals', () => {
  beforeEach(() => {
    vi.mocked(captureTabVisualAnalysis).mockReset();
  });

  it('returns true immediately when contentStrict is true (visual-verify host)', async () => {
    const applied = await resolveSoftAppliedForTab(
      1,
      1,
      'https://www.ovhcloud.com/en-in/',
      true,
    );
    expect(applied).toBe(true);
    expect(captureTabVisualAnalysis).not.toHaveBeenCalled();
  });

  it('returns true from OVH-like capture without contentStrict', async () => {
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

    vi.mocked(captureTabVisualAnalysis).mockResolvedValue({
      average: 0.2,
      max: 0.7,
      topBandMax: 0.72,
    });

    const applied = await resolveSoftAppliedForTab(
      2,
      1,
      'https://www.ovhcloud.com/en-in/',
      false,
    );
    expect(applied).toBe(true);
  });

  it('skips capture when popup is open and returns false without downgrading contentStrict', async () => {
    markPopupOpen();
    const applied = await resolveSoftAppliedForTab(
      3,
      1,
      'https://www.ovhcloud.com/en-in/',
      false,
    );
    expect(applied).toBe(false);
    expect(captureTabVisualAnalysis).not.toHaveBeenCalled();
  });
});
