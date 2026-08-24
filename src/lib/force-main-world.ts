import {
  insertForceStylesheetForTab,
  insertInvertSupplementForTab,
  resolveEffectiveForUrl,
  resolveEffectiveForContentApply,
} from './insert-css-fallback';
import { executeMainWorldForceStylesheet } from './main-world-inject';
import { getHostnameFromUrl, hostUsesForceSoftEngine, hostUsesInvertSoft } from './site-packs';

/**
 * Background-driven MAIN-world force apply — do not rely on isolated→MAIN CustomEvent.
 */
export async function applyPreferForceMainWorldForTab(
  tabId: number,
  url: string,
  options?: { contentApplying?: boolean },
): Promise<boolean> {
  const hostname = getHostnameFromUrl(url);
  if (!hostname || !hostUsesForceSoftEngine(hostname)) return false;

  const effective = options?.contentApplying
    ? await resolveEffectiveForContentApply(url, tabId)
    : await resolveEffectiveForUrl(url);
  if (!effective?.active) return false;

  const forceInserted = await insertForceStylesheetForTab(tabId, url, options);
  const forceMain = await executeMainWorldForceStylesheet(tabId, url, options);
  return forceInserted || forceMain;
}

export async function applyInvertSupplementForTabIfNeeded(tabId: number, url: string): Promise<boolean> {
  const effective = await resolveEffectiveForUrl(url);
  if (!effective?.active) return false;
  if (hostUsesForceSoftEngine(getHostnameFromUrl(url))) return false;
  return insertInvertSupplementForTab(tabId, url);
}

export async function escalatePreferForceMainWorldForTab(
  tabId: number,
  url: string,
  options?: { contentApplying?: boolean },
): Promise<boolean> {
  const first = await applyPreferForceMainWorldForTab(tabId, url, options);
  if (first) return true;

  await executeMainWorldForceStylesheet(tabId, url, options);
  return applyPreferForceMainWorldForTab(tabId, url, options);
}
