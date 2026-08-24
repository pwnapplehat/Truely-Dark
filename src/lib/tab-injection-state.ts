import { resolveSoftAppliedForTab } from './soft-escalation';

/** Max wall time before injection status must settle (true or false). */
export const INJECTION_RESOLVE_TIMEOUT_MS = 2000;

const tabSoftApplied = new Map<number, boolean | undefined>();
const tabResolveInFlight = new Map<number, Promise<boolean>>();

export function getTabSoftApplied(tabId: number | undefined): boolean | undefined {
  if (tabId === undefined) return undefined;
  return tabSoftApplied.get(tabId);
}

/**
 * Never downgrade true → false (popup overlay captures must not clear a good status).
 */
export function setTabSoftApplied(tabId: number, applied: boolean): void {
  const current = tabSoftApplied.get(tabId);
  if (current === true && !applied) {
    return;
  }
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

/** Drop in-flight visual settle (gallery immediate blocked path). */
export function cancelTabResolveInFlight(tabId: number): void {
  tabResolveInFlight.delete(tabId);
}

/**
 * preferForce hosts must never stay injectionPending — background settles even
 * when content INJECTION_STATUS is delayed or lost.
 */
export async function ensurePreferForceTabSettled(
  tabId: number,
  windowId: number,
  url: string,
): Promise<boolean> {
  if (isTabSoftAppliedSettled(tabId)) {
    return getTabSoftApplied(tabId) ?? false;
  }
  return settleTabSoftApplied(tabId, windowId, url, false, true);
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
  if (contentStrict) {
    setTabSoftApplied(tabId, true);
    return true;
  }

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
          setTabSoftApplied(tabId, applied);
          return getTabSoftApplied(tabId) ?? applied;
        }
        if (applied) {
          setTabSoftApplied(tabId, true);
          return true;
        }
        return getTabSoftApplied(tabId) ?? false;
      },
      () => {
        if (!timedOut) {
          setTabSoftApplied(tabId, false);
        }
        return getTabSoftApplied(tabId) ?? false;
      },
    );

    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        timedOut = true;
        if (tabSoftApplied.get(tabId) === undefined) {
          setTabSoftApplied(tabId, contentStrict);
        }
        resolve(getTabSoftApplied(tabId) ?? false);
      }, INJECTION_RESOLVE_TIMEOUT_MS);
    });

    return await Promise.race([resolvePromise, timeoutPromise]);
  })().finally(() => {
    tabResolveInFlight.delete(tabId);
  });

  tabResolveInFlight.set(tabId, running);
  return running;
}
