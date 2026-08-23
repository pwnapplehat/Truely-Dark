import { resolveSoftAppliedForTab } from './soft-escalation';

/** Max wall time before injection status must settle (true or false). */
export const INJECTION_RESOLVE_TIMEOUT_MS = 2000;

const tabSoftApplied = new Map<number, boolean | undefined>();
const tabResolveInFlight = new Map<number, Promise<boolean>>();

export function getTabSoftApplied(tabId: number | undefined): boolean | undefined {
  if (tabId === undefined) return undefined;
  return tabSoftApplied.get(tabId);
}

export function setTabSoftApplied(tabId: number, applied: boolean): void {
  tabSoftApplied.set(tabId, applied);
}

export function clearTabSoftApplied(tabId: number): void {
  tabSoftApplied.delete(tabId);
  tabResolveInFlight.delete(tabId);
}

/** New navigation — pending until first settle completes. */
export function markTabNavigation(tabId: number): void {
  tabSoftApplied.set(tabId, undefined);
  tabResolveInFlight.delete(tabId);
}

export function isInjectionResolveInFlight(tabId: number): boolean {
  return tabResolveInFlight.has(tabId);
}

export function isTabSoftAppliedSettled(tabId: number): boolean {
  return tabSoftApplied.get(tabId) !== undefined;
}

/**
 * Resolve softApplied with deduplication and a hard timeout — never leaves pending forever.
 * When `force` is false, an already-settled tab skips re-resolution (retry spam safe).
 */
export async function settleTabSoftApplied(
  tabId: number,
  windowId: number,
  url: string,
  contentStrict: boolean,
  force = false,
): Promise<boolean> {
  const settled = tabSoftApplied.get(tabId);
  if (!force && settled !== undefined) {
    return settled;
  }

  const existing = tabResolveInFlight.get(tabId);
  if (existing) return existing;

  const running = (async (): Promise<boolean> => {
    let timedOut = false;

    const resolvePromise = resolveSoftAppliedForTab(tabId, windowId, url, contentStrict).then(
      (applied) => {
        if (!timedOut) {
          tabSoftApplied.set(tabId, applied);
          return applied;
        }
        if (applied) {
          tabSoftApplied.set(tabId, true);
          return true;
        }
        return tabSoftApplied.get(tabId) ?? false;
      },
      () => {
        if (!timedOut) {
          tabSoftApplied.set(tabId, false);
        }
        return false;
      },
    );

    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        timedOut = true;
        if (tabSoftApplied.get(tabId) === undefined) {
          tabSoftApplied.set(tabId, false);
        }
        resolve(false);
      }, INJECTION_RESOLVE_TIMEOUT_MS);
    });

    return await Promise.race([resolvePromise, timeoutPromise]);
  })().finally(() => {
    tabResolveInFlight.delete(tabId);
  });

  tabResolveInFlight.set(tabId, running);
  return running;
}
