import type { EffectiveSiteSettings } from '../types';
import { generateDarkCss, type FilterTarget } from './engine';
import { resolveEffectiveSettings } from './resolver';
import { isConfigurableWebPage } from './restricted-hosts';
import { getSystemDarkPreference } from './schedule';
import {
  findSitePack,
  getHostnameFromUrl,
  getOriginFromUrl,
  hostUsesInjectCssFallback,
} from './site-packs';
import { getSettings } from './storage';

/** Exact CSS last inserted per tab — required for scripting.removeCSS. */
const tabInsertedCss = new Map<number, string>();

export function getInsertedCssForTab(tabId: number): string | undefined {
  return tabInsertedCss.get(tabId);
}

export async function resolveEffectiveForUrl(url: string): Promise<EffectiveSiteSettings | null> {
  if (!isConfigurableWebPage(url)) return null;

  const origin = getOriginFromUrl(url);
  const hostname = getHostnameFromUrl(url);
  if (!origin || !hostname) return null;

  const settings = await getSettings();
  const systemDark = await getSystemDarkPreference();
  return resolveEffectiveSettings({
    origin,
    hostname,
    settings,
    systemDark,
  });
}

async function removeInsertedCss(tabId: number): Promise<void> {
  const css = tabInsertedCss.get(tabId);
  if (!css) return;

  try {
    await browser.scripting.removeCSS({
      target: { tabId, allFrames: true },
      css,
      origin: 'USER',
    });
  } catch {
    // Tab may have navigated away
  }

  tabInsertedCss.delete(tabId);
}

/**
 * Inject Soft CSS via chrome.scripting.insertCSS (USER origin).
 * Used when content-script styles are stripped by CSP on hosts like CWS.
 */
export async function insertSoftCssForTab(
  tabId: number,
  url: string,
  filterTarget: FilterTarget = 'html',
): Promise<boolean> {
  const effective = await resolveEffectiveForUrl(url);
  if (!effective?.active) {
    await removeInsertedCss(tabId);
    return false;
  }

  const css = generateDarkCss(effective, filterTarget);
  const previous = tabInsertedCss.get(tabId);

  if (previous === css) return true;

  if (previous) {
    try {
      await browser.scripting.removeCSS({
        target: { tabId, allFrames: true },
        css: previous,
        origin: 'USER',
      });
    } catch {
      // Continue with fresh insert
    }
  }

  try {
    await browser.scripting.insertCSS({
      target: { tabId, allFrames: true },
      css,
      origin: 'USER',
    });
    tabInsertedCss.set(tabId, css);
    return true;
  } catch {
    tabInsertedCss.delete(tabId);
    return false;
  }
}

export async function removeSoftCssForTab(tabId: number): Promise<void> {
  await removeInsertedCss(tabId);
}

export async function maybeProactiveInsertCss(tabId: number, url: string): Promise<void> {
  const hostname = getHostnameFromUrl(url);
  if (!hostname || !hostUsesInjectCssFallback(hostname)) return;

  const effective = await resolveEffectiveForUrl(url);
  if (!effective?.active) return;

  await insertSoftCssForTab(tabId, url, 'html');
}
