import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INJECTION_RESOLVE_TIMEOUT_MS,
  ensurePreferForceTabSettled,
  getTabSoftApplied,
  isInjectionResolveInFlight,
  isTabSoftAppliedSettled,
  markTabNavigation,
  settleTabSoftApplied,
} from '../src/lib/tab-injection-state';

vi.mock('../src/lib/soft-escalation', () => ({
  resolveSoftAppliedForTab: vi.fn(async () => true),
}));

import { resolveSoftAppliedForTab } from '../src/lib/soft-escalation';

describe('tab-injection-state', () => {
  beforeEach(() => {
    vi.mocked(resolveSoftAppliedForTab).mockReset();
    vi.mocked(resolveSoftAppliedForTab).mockResolvedValue(true);
  });

  it('settles to true or false — never leaves undefined after settle completes', async () => {
    const applied = await settleTabSoftApplied(1, 1, 'https://www.ovhcloud.com/', false);
    expect(applied).toBe(true);
    expect(getTabSoftApplied(1)).toBe(true);
    expect(isInjectionResolveInFlight(1)).toBe(false);
    expect(isTabSoftAppliedSettled(1)).toBe(true);
  });

  it('dedupes concurrent settle calls for the same tab', async () => {
    vi.mocked(resolveSoftAppliedForTab).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(true), 50)),
    );

    const a = settleTabSoftApplied(2, 1, 'https://example.com/', false);
    const b = settleTabSoftApplied(2, 1, 'https://example.com/', false);

    expect(isInjectionResolveInFlight(2)).toBe(true);
    expect(await a).toBe(true);
    expect(await b).toBe(true);
    expect(resolveSoftAppliedForTab).toHaveBeenCalledTimes(1);
  });

  it('skips re-resolution when already settled (retry spam safe)', async () => {
    await settleTabSoftApplied(5, 1, 'https://www.ovhcloud.com/', false);
    expect(resolveSoftAppliedForTab).toHaveBeenCalledTimes(1);

    const second = await settleTabSoftApplied(5, 1, 'https://www.ovhcloud.com/', false);
    expect(second).toBe(true);
    expect(resolveSoftAppliedForTab).toHaveBeenCalledTimes(1);
  });

  it('force=true re-resolves after prior settle', async () => {
    vi.mocked(resolveSoftAppliedForTab)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await settleTabSoftApplied(6, 1, 'https://www.ovhcloud.com/', false);
    const forced = await settleTabSoftApplied(6, 1, 'https://www.ovhcloud.com/', false, true);
    expect(forced).toBe(true);
    expect(resolveSoftAppliedForTab).toHaveBeenCalledTimes(2);
  });

  it('times out to false within INJECTION_RESOLVE_TIMEOUT_MS', async () => {
    vi.mocked(resolveSoftAppliedForTab).mockImplementation(
      () => new Promise(() => {
        /* never resolves */
      }),
    );

    const applied = await settleTabSoftApplied(3, 1, 'https://chromewebstore.google.com/', false);
    expect(applied).toBe(false);
    expect(getTabSoftApplied(3)).toBe(false);
    expect(isTabSoftAppliedSettled(3)).toBe(true);
  }, INJECTION_RESOLVE_TIMEOUT_MS + 500);

  it('upgrades to true when visual verify passes after timeout', async () => {
    vi.mocked(resolveSoftAppliedForTab).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(true), INJECTION_RESOLVE_TIMEOUT_MS + 200);
        }),
    );

    const applied = await settleTabSoftApplied(7, 1, 'https://www.ovhcloud.com/', false);
    expect(applied).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(getTabSoftApplied(7)).toBe(true);
  }, INJECTION_RESOLVE_TIMEOUT_MS + 800);

  it('settles immediately true when contentStrict is true', async () => {
    const applied = await settleTabSoftApplied(8, 1, 'https://www.ovhcloud.com/', true);
    expect(applied).toBe(true);
    expect(getTabSoftApplied(8)).toBe(true);
    expect(resolveSoftAppliedForTab).not.toHaveBeenCalled();
  });

  it('markTabNavigation clears in-flight state', () => {
    markTabNavigation(4);
    expect(getTabSoftApplied(4)).toBeUndefined();
    expect(isInjectionResolveInFlight(4)).toBe(false);
    expect(isTabSoftAppliedSettled(4)).toBe(false);
  });

  it('ensurePreferForceTabSettled settles pending preferForce tabs', async () => {
    markTabNavigation(9);
    const applied = await ensurePreferForceTabSettled(9, 1, 'https://www.ovhcloud.com/');
    expect(applied).toBe(true);
    expect(getTabSoftApplied(9)).toBe(true);
    expect(isTabSoftAppliedSettled(9)).toBe(true);
  });

  it('ensurePreferForceTabSettled skips when already settled', async () => {
    await settleTabSoftApplied(10, 1, 'https://www.ovhcloud.com/', false);
    expect(resolveSoftAppliedForTab).toHaveBeenCalledTimes(1);
    const applied = await ensurePreferForceTabSettled(10, 1, 'https://www.ovhcloud.com/');
    expect(applied).toBe(true);
    expect(resolveSoftAppliedForTab).toHaveBeenCalledTimes(1);
  });
});
