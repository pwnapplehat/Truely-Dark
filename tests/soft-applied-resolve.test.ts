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

  it('trusts verified force application on OVH when contentStrict is true', async () => {
    const applied = await resolveSoftAppliedForTab(
      1,
      1,
      'https://www.ovhcloud.com/en-in/',
      true,
    );
    expect(applied).toBe(true);
    expect(captureTabVisualAnalysis).not.toHaveBeenCalled();
  });

  it('returns true from dark OVH-like capture without contentStrict', async () => {
    vi.mocked(captureTabVisualAnalysis).mockResolvedValue({
      average: 0.2,
      max: 0.25,
      topBandMax: 0.25,
      gutterMax: 0.25,
      footerBandMax: 0.2,
    });

    const applied = await resolveSoftAppliedForTab(
      2,
      1,
      'https://www.ovhcloud.com/en-in/',
      false,
    );
    expect(applied).toBe(true);
  });

  it('trusts dark OVH force average even when marketing gutters fail quality bar', async () => {
    vi.mocked(captureTabVisualAnalysis).mockResolvedValue({
      average: 0.2,
      max: 0.7,
      topBandMax: 0.72,
      gutterMax: 0.72,
      footerBandMax: 0.2,
    });

    const applied = await resolveSoftAppliedForTab(
      4,
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
