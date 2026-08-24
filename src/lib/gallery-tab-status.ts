import { isChromeGalleryUrl } from './gallery-access';
import { attemptGalleryInjection } from './gallery-injection';
import { resolveEffectiveSettings } from './resolver';
import { getSystemDarkPreference } from './schedule';
import { getHostnameFromUrl, getOriginFromUrl } from './site-packs';
import { getSettings } from './storage';
import {
  cancelTabResolveInFlight,
  setTabSoftApplied,
} from './tab-injection-state';

/**
 * Settle gallery tab to blocked after injection attempts failed.
 */
export function settleGalleryTabBlocked(tabId: number): void {
  cancelTabResolveInFlight(tabId);
  setTabSoftApplied(tabId, false);
}

/**
 * Proactively attempt gallery injection on navigation; does not settle blocked
 * until visual verify / gesture path completes.
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

  await attemptGalleryInjection(tabId, url);
}
