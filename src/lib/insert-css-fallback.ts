import type { EffectiveSiteSettings } from '../types';
import {
  generateDarkCss,
  generateForceStylesheetCss,
  type FilterTarget,
} from './engine';
import { generateNuclearForceCss } from './shadow-force';
import { resolveEffectiveSettings } from './resolver';
import { isConfigurableWebPage } from './restricted-hosts';
import { getSystemDarkPreference } from './schedule';
import {
  findSitePack,
  getHostnameFromUrl,
  getOriginFromUrl,
  hostPrefersForceStylesheet,
  hostUsesInjectCssFallback,
  isExcludedOrigin,
  REDIRECTION_BANNER_KILL_CSS,
  resolveInvertSupplementCss,
} from './site-packs';
import { getSettings } from './storage';

/** Exact CSS last inserted per tab — required for scripting.removeCSS. */
const tabInsertedCss = new Map<number, string>();
const tabForceCss = new Map<number, string>();
const tabNuclearCss = new Map<number, string>();
const tabInvertSupplementCss = new Map<number, string>();

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
  const hostname = getHostnameFromUrl(url);
  if (hostPrefersForceStylesheet(hostname)) {
    await removeInsertedCss(tabId);
    return insertForceStylesheetForTab(tabId, url);
  }

  const effective = await resolveEffectiveForUrl(url);
  if (!effective?.active) {
    await removeInsertedCss(tabId);
    return false;
  }

  const css = generateDarkCss(effective, filterTarget, hostname);
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

async function removeInsertedForceCss(tabId: number): Promise<void> {
  const css = tabForceCss.get(tabId);
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

  tabForceCss.delete(tabId);
}

export async function insertForceStylesheetForTab(tabId: number, url: string): Promise<boolean> {
  await removeInsertedCss(tabId);

  const effective = await resolveEffectiveForUrl(url);
  if (!effective?.active) {
    await removeInsertedForceCss(tabId);
    return false;
  }

  const css = generateForceStylesheetCss(effective);
  const previous = tabForceCss.get(tabId);

  if (previous === css) return true;

  if (previous) {
    try {
      await browser.scripting.removeCSS({
        target: { tabId, allFrames: true },
        css: previous,
        origin: 'USER',
      });
    } catch {
      // Continue
    }
  }

  try {
    await browser.scripting.insertCSS({
      target: { tabId, allFrames: true },
      css,
      origin: 'USER',
    });
    tabForceCss.set(tabId, css);
    return true;
  } catch {
    tabForceCss.delete(tabId);
    return false;
  }
}

export async function insertNuclearForceCssForTab(tabId: number, url: string): Promise<boolean> {
  const effective = await resolveEffectiveForUrl(url);
  if (!effective?.active) {
    await removeInsertedNuclearCss(tabId);
    return false;
  }

  const css = generateNuclearForceCss(effective);
  const previous = tabNuclearCss.get(tabId);

  if (previous === css) return true;

  if (previous) {
    try {
      await browser.scripting.removeCSS({
        target: { tabId, allFrames: true },
        css: previous,
        origin: 'USER',
      });
    } catch {
      // Continue
    }
  }

  try {
    await browser.scripting.insertCSS({
      target: { tabId, allFrames: true },
      css,
      origin: 'USER',
    });
    tabNuclearCss.set(tabId, css);
    return true;
  } catch {
    tabNuclearCss.delete(tabId);
    return false;
  }
}

async function removeInsertedNuclearCss(tabId: number): Promise<void> {
  const css = tabNuclearCss.get(tabId);
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

  tabNuclearCss.delete(tabId);
}

async function removeInsertedInvertSupplementCss(tabId: number): Promise<void> {
  const css = tabInvertSupplementCss.get(tabId);
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

  tabInvertSupplementCss.delete(tabId);
}

/**
 * USER-origin invert supplement for apple.com / wikipedia.org Soft invert surfaces.
 */
export async function insertInvertSupplementForTab(tabId: number, url: string): Promise<boolean> {
  const hostname = getHostnameFromUrl(url);
  if (!hostname || hostPrefersForceStylesheet(hostname)) {
    await removeInsertedInvertSupplementCss(tabId);
    return false;
  }

  const supplementCss = resolveInvertSupplementCss(hostname);
  if (!supplementCss) {
    await removeInsertedInvertSupplementCss(tabId);
    return false;
  }

  const effective = await resolveEffectiveForUrl(url);
  if (!effective?.active) {
    await removeInsertedInvertSupplementCss(tabId);
    return false;
  }

  const css = `${supplementCss}${REDIRECTION_BANNER_KILL_CSS}`;
  const previous = tabInvertSupplementCss.get(tabId);

  if (previous === css) return true;

  if (previous) {
    try {
      await browser.scripting.removeCSS({
        target: { tabId, allFrames: true },
        css: previous,
        origin: 'USER',
      });
    } catch {
      // Continue
    }
  }

  try {
    await browser.scripting.insertCSS({
      target: { tabId, allFrames: true },
      css,
      origin: 'USER',
    });
    tabInvertSupplementCss.set(tabId, css);
    return true;
  } catch {
    tabInvertSupplementCss.delete(tabId);
    return false;
  }
}

export async function removeSoftCssForTab(tabId: number): Promise<void> {
  await removeInsertedCss(tabId);
  await removeInsertedForceCss(tabId);
  await removeInsertedNuclearCss(tabId);
  await removeInsertedInvertSupplementCss(tabId);
}

export async function maybeProactiveInsertCss(tabId: number, url: string): Promise<void> {
  const hostname = getHostnameFromUrl(url);
  if (!hostname || !hostUsesInjectCssFallback(hostname)) return;

  const effective = await resolveEffectiveForUrl(url);
  if (!effective?.active) return;

  await insertSoftCssForTab(tabId, url, 'html');
}
