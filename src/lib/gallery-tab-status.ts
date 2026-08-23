import { isChromeGalleryUrl } from './gallery-access';
import { resolveEffectiveSettings } from './resolver';
import { getSystemDarkPreference } from './schedule';
import { getHostnameFromUrl, getOriginFromUrl } from './site-packs';
import { getSettings } from './storage';
import {
  cancelTabResolveInFlight,
  setTabSoftApplied,
} from './tab-injection-state';

/**
 * Gallery hosts cannot rely on visual verify — settle blocked immediately (no Applying…).
 */
export function settleGalleryTabBlocked(tabId: number): void {
  cancelTabResolveInFlight(tabId);
  setTabSoftApplied(tabId, false);
}

/**
 * When gallery tab is active, settle to blocked without waiting on escalation.
 */
export async function ensureGalleryTabSettled(tabId: number, url: string): Promise<void> {
  if (!isChromeGalleryUrl(url)) return;

  const origin = getOriginFromUrl(url);
  const hostname = getHostnameFromUrl(url);
  const settings = await getSettings();
  const systemDark = await getSystemDarkPreference();
  const effective = resolveEffectiveSettings({
    origin,
    hostname,
    settings,
    systemDark,
  });

  if (!effective.active) {
    setTabSoftApplied(tabId, false);
    return;
  }

  settleGalleryTabBlocked(tabId);
}
