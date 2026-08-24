import {
  insertForceStylesheetForTab,
  insertInvertSupplementForTab,
  resolveEffectiveForUrl,
} from './insert-css-fallback';
import { executeMainWorldForceStylesheet } from './main-world-inject';
import { getHostnameFromUrl, hostUsesForceSoftEngine, hostUsesInvertSoft } from './site-packs';

/**
 * Background-driven MAIN-world force apply — do not rely on isolated→MAIN CustomEvent.
 */
export async function applyPreferForceMainWorldForTab(tabId: number, url: string): Promise<boolean> {
  const hostname = getHostnameFromUrl(url);
  if (!hostname || !hostUsesForceSoftEngine(hostname)) return false;

  const effective = await resolveEffectiveForUrl(url);
  if (!effective?.active) return false;

  const forceInserted = await insertForceStylesheetForTab(tabId, url);
  const forceMain = await executeMainWorldForceStylesheet(tabId, url);
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
): Promise<boolean> {
  const first = await applyPreferForceMainWorldForTab(tabId, url);
  if (first) return true;

  await executeMainWorldForceStylesheet(tabId, url);
  return applyPreferForceMainWorldForTab(tabId, url);
}
