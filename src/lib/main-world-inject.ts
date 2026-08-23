import {
  buildFilterString,
  computePreInvertBackground,
  generateForceStylesheetCss,
} from './engine';
import {
  generateNuclearForceCss,
  generateShadowForceCss,
  generateShadowInvertPrepCss,
} from './shadow-force';
import { resolveEffectiveForUrl } from './insert-css-fallback';
import { resolveForceBackgroundColor } from './site-packs';

const SCRIPT_TARGET = { allFrames: true } as const;

export interface MainWorldApplyOptions {
  filter?: string;
  bg: string;
  text?: string;
  mode: string;
  force?: boolean;
  lightCss?: string;
  shadowCss?: string;
  shadowFilterCss?: string;
  watchShadows?: boolean;
}

async function executeMainWorldApply(
  tabId: number,
  opts: MainWorldApplyOptions,
): Promise<boolean> {
  try {
    await browser.scripting.executeScript({
      target: { tabId, ...SCRIPT_TARGET },
      world: 'MAIN',
      func: (options: MainWorldApplyOptions) => {
        const api = (window as unknown as { __truelyDarkMain?: { apply: (o: MainWorldApplyOptions) => void } })
          .__truelyDarkMain;
        if (api && typeof api.apply === 'function') {
          api.apply(options);
          return;
        }
        const html = document.documentElement;
        html.setAttribute('data-truely-dark-active', options.mode || 'soft');
        if (options.force) {
          html.setAttribute('data-truely-dark-force', 'true');
          html.style.removeProperty('filter');
        } else if (options.filter) {
          html.style.setProperty('filter', options.filter, 'important');
          html.style.setProperty('-webkit-filter', options.filter, 'important');
        }
        html.style.setProperty('background-color', options.bg, 'important');
        if (options.text) html.style.setProperty('color', options.text, 'important');
        if (document.body) {
          document.body.style.setProperty('background-color', options.bg, 'important');
          if (options.text) document.body.style.setProperty('color', options.text, 'important');
        }
      },
      args: [opts],
    });
    return true;
  } catch {
    return false;
  }
}

export async function dispatchMainWorldApply(
  tabId: number,
  opts: MainWorldApplyOptions,
): Promise<boolean> {
  return executeMainWorldApply(tabId, opts);
}

export async function executeMainWorldSoftFilter(
  tabId: number,
  url: string,
  filterTarget: 'html' | 'body' = 'html',
): Promise<boolean> {
  const effective = await resolveEffectiveForUrl(url);
  if (!effective?.active) return false;

  const filter = buildFilterString(
    effective.brightness,
    effective.contrast,
    effective.sepia,
  );
  const preInvertBg = computePreInvertBackground(effective.backgroundColor);
  const shadowFilterCss = generateShadowInvertPrepCss();

  return dispatchMainWorldApply(tabId, {
    filter: filterTarget === 'html' ? filter : undefined,
    bg: preInvertBg,
    text: '#000000',
    mode: effective.mode,
    force: false,
    shadowFilterCss,
    watchShadows: true,
  });
}

export async function executeMainWorldForceStylesheet(tabId: number, url: string): Promise<boolean> {
  const effective = await resolveEffectiveForUrl(url);
  if (!effective?.active) return false;

  const forceCss = generateForceStylesheetCss(effective);
  const shadowCss = generateShadowForceCss(effective);

  return dispatchMainWorldApply(tabId, {
    bg: resolveForceBackgroundColor(effective),
    text: '#e8e8e8',
    mode: effective.mode,
    force: true,
    lightCss: forceCss,
    shadowCss,
    watchShadows: true,
  });
}

export async function executeMainWorldNuclearForce(tabId: number, url: string): Promise<boolean> {
  const effective = await resolveEffectiveForUrl(url);
  if (!effective?.active) return false;

  const nuclearCss = generateNuclearForceCss(effective);
  const shadowCss = generateShadowForceCss(effective);

  return dispatchMainWorldApply(tabId, {
    bg: resolveForceBackgroundColor(effective),
    text: '#e8e8e8',
    mode: effective.mode,
    force: true,
    lightCss: nuclearCss,
    shadowCss,
    watchShadows: true,
  });
}
