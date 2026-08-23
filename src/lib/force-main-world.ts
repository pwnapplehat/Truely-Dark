import {
  insertForceStylesheetForTab,
  insertInvertSupplementForTab,
  insertNuclearForceCssForTab,
  resolveEffectiveForUrl,
} from './insert-css-fallback';
import {
  executeMainWorldForceStylesheet,
  executeMainWorldNuclearForce,
} from './main-world-inject';
import { getHostnameFromUrl, hostPrefersForceStylesheet } from './site-packs';

/**
 * Background-driven MAIN-world force apply — do not rely on isolated→MAIN CustomEvent.
 */
export async function applyPreferForceMainWorldForTab(tabId: number, url: string): Promise<boolean> {
  const hostname = getHostnameFromUrl(url);
  if (!hostname || !hostPrefersForceStylesheet(hostname)) return false;

  const effective = await resolveEffectiveForUrl(url);
  if (!effective?.active) return false;

  const forceInserted = await insertForceStylesheetForTab(tabId, url);
  const forceMain = await executeMainWorldForceStylesheet(tabId, url);
  return forceInserted || forceMain;
}

export async function applyInvertSupplementForTabIfNeeded(tabId: number, url: string): Promise<boolean> {
  const effective = await resolveEffectiveForUrl(url);
  if (!effective?.active) return false;
  if (hostPrefersForceStylesheet(getHostnameFromUrl(url))) return false;
  return insertInvertSupplementForTab(tabId, url);
}

export async function escalatePreferForceMainWorldForTab(
  tabId: number,
  url: string,
): Promise<boolean> {
  const applied = await applyPreferForceMainWorldForTab(tabId, url);
  if (applied) return true;

  const nuclearInserted = await insertNuclearForceCssForTab(tabId, url);
  const nuclearMain = await executeMainWorldNuclearForce(tabId, url);
  return nuclearInserted || nuclearMain;
}
