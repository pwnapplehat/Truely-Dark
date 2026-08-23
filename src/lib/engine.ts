import type { EffectiveSiteSettings } from '../types';
import { parseColor, rgbByteLuminance } from './color';
import { isExtensionInjectedBackground } from './detect';
import { computedFilterHasStrictInvert } from './filter-verify';
import {
  pierceOpenShadowRoots,
  generateShadowForceCss,
  generateShadowInvertPrepCss,
  SHADOW_FILTER_STYLE_ID,
  SHADOW_FORCE_STYLE_ID,
} from './shadow-force';

export const ROOT_ATTR = 'data-truely-dark-active';
export const FILTER_TARGET_ATTR = 'data-truely-dark-filter-target';
export const FORCE_ATTR = 'data-truely-dark-force';
const STYLE_ID = 'truely-dark-styles';
const PRELOAD_STYLE_ID = 'truely-dark-preload';
const SHADOW_STYLE_ID = 'truely-dark-shadow-styles';
const ADOPTED_SHEETS = new WeakMap<Document, CSSStyleSheet>();

function setAdoptedStylesheet(doc: Document, css: string): void {
  if (!('adoptedStyleSheets' in doc)) return;

  let sheet = ADOPTED_SHEETS.get(doc);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    ADOPTED_SHEETS.set(doc, sheet);
  }
  sheet.replaceSync(css);

  const docWithSheets = doc as Document & { adoptedStyleSheets: CSSStyleSheet[] };
  const without = docWithSheets.adoptedStyleSheets.filter((s) => s !== sheet);
  docWithSheets.adoptedStyleSheets = [...without, sheet];
}

function clearAdoptedStylesheet(doc: Document): void {
  const sheet = ADOPTED_SHEETS.get(doc);
  if (!sheet || !('adoptedStyleSheets' in doc)) return;
  const docWithSheets = doc as Document & { adoptedStyleSheets: CSSStyleSheet[] };
  docWithSheets.adoptedStyleSheets = docWithSheets.adoptedStyleSheets.filter((s) => s !== sheet);
  ADOPTED_SHEETS.delete(doc);
}

export type FilterTarget = 'html' | 'body';

export interface ApplyDarkModeResult {
  filterTarget: FilterTarget;
  applied: boolean;
}

/** FOUC preload only — dark appearance before Soft filter engages. */
export const PRELOAD_CSS = `
  html,
  body {
    background-color: #121212 !important;
    color-scheme: dark;
  }
`;

/**
 * Soft mode applies invert(1) on html. Root background must be LIGHT *before* invert
 * so it reads dark after the filter (invert flips #121212 → #ededed, causing illegible
 * light-on-light text). Preset target colors (Midnight #121212, OLED #000) are achieved
 * post-invert via brightness/contrast/sepia — map them to pre-invert complements here.
 */
export function computePreInvertBackground(targetHex: string): string {
  const rgb = parseColor(targetHex);
  if (!rgb) return '#ffffff';

  const r = Math.round(255 - rgb.r);
  const g = Math.round(255 - rgb.g);
  const b = Math.round(255 - rgb.b);

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Build CSS filter string from settings values.
 */
export function buildFilterString(
  brightness: number,
  contrast: number,
  sepia: number,
): string {
  const b = brightness / 100;
  const c = contrast / 100;
  const s = sepia / 100;
  return `invert(1) hue-rotate(180deg) brightness(${b}) contrast(${c}) sepia(${s})`;
}

/**
 * Direct dark stylesheet when invert filter cannot paint (CWS / layered hosts).
 * Original Truely Dark implementation — not vendored Dark Reader logic.
 */
export function generateForceStylesheetCss(settings: EffectiveSiteSettings): string {
  const bg = settings.backgroundColor;
  const text = '#e8e8e8';
  const link = '#8ab4f8';
  const border = '#3c4043';

  return `
    html[${ROOT_ATTR}],
    html[${ROOT_ATTR}] body {
      background-color: ${bg} !important;
      background-image: none !important;
      color: ${text} !important;
      filter: none !important;
      -webkit-filter: none !important;
    }
    html[${ROOT_ATTR}] main,
    html[${ROOT_ATTR}] [role="main"],
    html[${ROOT_ATTR}] header,
    html[${ROOT_ATTR}] nav,
    html[${ROOT_ATTR}] footer,
    html[${ROOT_ATTR}] section,
    html[${ROOT_ATTR}] article,
    html[${ROOT_ATTR}] aside,
    html[${ROOT_ATTR}] div,
    html[${ROOT_ATTR}] c-wiz {
      background-color: ${bg} !important;
      background-image: none !important;
      color: ${text} !important;
      border-color: ${border} !important;
    }
    html[${ROOT_ATTR}] a,
    html[${ROOT_ATTR}] a:visited {
      color: ${link} !important;
    }
    html[${ROOT_ATTR}] h1,
    html[${ROOT_ATTR}] h2,
    html[${ROOT_ATTR}] h3,
    html[${ROOT_ATTR}] h4,
    html[${ROOT_ATTR}] p,
    html[${ROOT_ATTR}] span,
    html[${ROOT_ATTR}] li {
      color: ${text} !important;
    }
  `;
}

export function applyForceStylesheetMode(
  settings: EffectiveSiteSettings,
  doc: Document = document,
): void {
  const html = doc.documentElement;
  html.setAttribute(ROOT_ATTR, settings.mode);
  html.setAttribute(FORCE_ATTR, 'true');
  html.setAttribute(FILTER_TARGET_ATTR, 'force');

  clearInlineFilter(html);
  if (doc.body) clearInlineFilter(doc.body);

  html.style.setProperty('background-color', settings.backgroundColor, 'important');
  html.style.setProperty('color', '#e8e8e8', 'important');
  if (doc.body) {
    doc.body.style.setProperty('background-color', settings.backgroundColor, 'important');
    doc.body.style.setProperty('color', '#e8e8e8', 'important');
  }

  const css = generateForceStylesheetCss(settings);
  let styleEl = doc.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = doc.createElement('style');
    styleEl.id = STYLE_ID;
  }
  styleEl.textContent = css;
  appendStyleElement(doc, styleEl);

  pierceOpenShadowRoots(doc, generateShadowForceCss(settings), SHADOW_FORCE_STYLE_ID);
}

const CHROME_BACKDROP_RESET = `
  html[${ROOT_ATTR}] header,
  html[${ROOT_ATTR}] nav,
  html[${ROOT_ATTR}] [role="banner"],
  html[${ROOT_ATTR}] .header,
  html[${ROOT_ATTR}] .navbar,
  html[${ROOT_ATTR}] .hero,
  html[${ROOT_ATTR}] .hero-section,
  html[${ROOT_ATTR}] .sticky,
  html[${ROOT_ATTR}] .fixed,
  html[${ROOT_ATTR}] [class*="sticky"],
  html[${ROOT_ATTR}] [class*="fixed-header"],
  html[${ROOT_ATTR}] [style*="position: fixed"],
  html[${ROOT_ATTR}] [style*="position:sticky"] {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
`;

const FIXED_LAYER_RESET = `
  html[${ROOT_ATTR}] body > header,
  html[${ROOT_ATTR}] body > nav,
  html[${ROOT_ATTR}] #header,
  html[${ROOT_ATTR}] .top-bar {
    background-color: transparent !important;
  }
`;

/**
 * Generate the main dark mode CSS.
 * Note: iframes are NOT counter-inverted — child frames run their own content script via all_frames.
 */
export function generateDarkCss(
  settings: EffectiveSiteSettings,
  filterTarget: FilterTarget = 'html',
): string {
  const filter = buildFilterString(
    settings.brightness,
    settings.contrast,
    settings.sepia,
  );

  const preInvertBg = computePreInvertBackground(settings.backgroundColor);

  const mediaSelectors = settings.preserveMedia
    ? 'img, video, canvas, picture, svg, [data-truely-dark-preserve]'
    : '';

  let css = `
    html[${ROOT_ATTR}],
    html[${ROOT_ATTR}] body {
      background-color: ${preInvertBg} !important;
      color-scheme: dark !important;
      color: #000000 !important;
    }
  `;

  if (filterTarget === 'html') {
    css += `
      html[${ROOT_ATTR}] {
        filter: ${filter} !important;
        -webkit-filter: ${filter} !important;
      }
    `;
  } else {
    css += `
      html[${ROOT_ATTR}] {
        filter: none !important;
        -webkit-filter: none !important;
      }
      html[${ROOT_ATTR}] body {
        filter: ${filter} !important;
        -webkit-filter: ${filter} !important;
      }
    `;
  }

  css += CHROME_BACKDROP_RESET;
  css += FIXED_LAYER_RESET;

  css += `
    @-moz-document url-prefix() {
      html[${ROOT_ATTR}],
      html[${ROOT_ATTR}] body {
        background-color: ${preInvertBg} !important;
      }
    }
  `;

  css += `
    html[${ROOT_ATTR}] iframe {
      background-color: ${preInvertBg} !important;
      color-scheme: dark !important;
    }
  `;

  if (mediaSelectors) {
    css += `
      html[${ROOT_ATTR}] ${mediaSelectors} {
        filter: ${filter} !important;
        -webkit-filter: ${filter} !important;
      }
      html[${ROOT_ATTR}] video:fullscreen,
      html[${ROOT_ATTR}] video::-webkit-media-controls-enclosure {
        filter: none !important;
        -webkit-filter: none !important;
      }
    `;
  }

  if (settings.sitePack?.customCss) {
    css += settings.sitePack.customCss;
  }

  if (settings.sitePack?.invertSelectors) {
    for (const selector of settings.sitePack.invertSelectors) {
      css += `
        html[${ROOT_ATTR}] ${selector} {
          filter: ${filter} !important;
          -webkit-filter: ${filter} !important;
        }
      `;
    }
  }

  return css;
}

function appendStyleElement(doc: Document, styleEl: HTMLStyleElement): void {
  const target = doc.head ?? doc.documentElement;
  if (!styleEl.parentElement) {
    target.appendChild(styleEl);
  }
}

function setStyleElementContent(doc: Document, styleEl: HTMLStyleElement, css: string): void {
  try {
    styleEl.textContent = css;
    return;
  } catch {
    // Trusted Types or strict CSP — fall back to constructable stylesheet
  }

  try {
    if ('adoptedStyleSheets' in doc) {
      setAdoptedStylesheet(doc, css);
    }
  } catch {
    // Last resort: inline rules one-by-one
    const sheet = styleEl.sheet;
    if (sheet) {
      while (sheet.cssRules.length > 0) {
        sheet.deleteRule(0);
      }
      const rules = css
        .split('}')
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.includes('{'));
      for (const rule of rules) {
        try {
          sheet.insertRule(`${rule}}`, sheet.cssRules.length);
        } catch {
          // Skip invalid fragments
        }
      }
    }
  }
}

function clearInlineFilter(el: HTMLElement): void {
  el.style.removeProperty('filter');
  el.style.removeProperty('-webkit-filter');
}

function applyInlineFilter(el: HTMLElement, filter: string): void {
  el.style.setProperty('filter', filter, 'important');
  el.style.setProperty('-webkit-filter', filter, 'important');
}

function applyInlineBackground(el: HTMLElement, color: string): void {
  el.style.setProperty('background-color', color, 'important');
}

function clearInlineBackground(el: HTMLElement): void {
  el.style.removeProperty('background-color');
}

/**
 * True when computed filter on the target element includes invert().
 */
export function verifySoftFilterApplied(
  doc: Document,
  filterTarget: FilterTarget = 'html',
): boolean {
  const view = doc.defaultView;
  if (!view) return false;

  const el = filterTarget === 'body' ? doc.body : doc.documentElement;
  if (!el) return false;

  const computed = view.getComputedStyle(el).filter;
  return computedFilterHasStrictInvert(computed);
}

/** Pre-invert root surfaces must be light so invert reads dark — not FOUC #121212. */
export const MIN_PRE_INVERT_ROOT_LUMINANCE = 0.45;

/**
 * Root background is invert-safe (light pre-filter), not extension preload dark.
 */
export function verifyInvertSafeRootBackground(
  doc: Document,
  filterTarget: FilterTarget = 'html',
): boolean {
  const view = doc.defaultView;
  if (!view) return false;

  const html = doc.documentElement;
  const htmlBg = view.getComputedStyle(html).backgroundColor;
  if (!htmlBg || isExtensionInjectedBackground(htmlBg)) return false;

  const htmlRgb = parseColor(htmlBg);
  if (!htmlRgb) return false;
  const htmlLum = rgbByteLuminance(htmlRgb.r, htmlRgb.g, htmlRgb.b);
  if (htmlLum < MIN_PRE_INVERT_ROOT_LUMINANCE) return false;

  if (filterTarget === 'body' && doc.body) {
    const bodyBg = view.getComputedStyle(doc.body).backgroundColor;
    if (bodyBg && !isExtensionInjectedBackground(bodyBg)) {
      const bodyRgb = parseColor(bodyBg);
      if (
        bodyRgb &&
        rgbByteLuminance(bodyRgb.r, bodyRgb.g, bodyRgb.b) < MIN_PRE_INVERT_ROOT_LUMINANCE
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Verified Soft: invert filter present AND invert-safe root background (smoke test).
 * getComputedStyle is pre-filter; a dark root bg means preload/FOUC without invert-safe swap.
 */
export function verifySoftApplication(
  doc: Document,
  filterTarget: FilterTarget = 'html',
): boolean {
  return (
    verifySoftFilterApplied(doc, filterTarget) &&
    verifyInvertSafeRootBackground(doc, filterTarget)
  );
}

function collectOpenShadowHosts(doc: Document): Element[] {
  const hosts: Element[] = [];
  if (!doc.body) return hosts;

  const walk = (el: Element): void => {
    if (el.shadowRoot) {
      hosts.push(el);
      for (const child of el.shadowRoot.children) {
        walk(child as Element);
      }
    }
    for (const child of el.children) {
      walk(child as Element);
    }
  };

  walk(doc.body);
  return hosts;
}

function applyShadowDomFilters(
  doc: Document,
  settings: EffectiveSiteSettings,
  filter: string,
): void {
  if (!settings.preserveMedia) return;

  const hosts = collectOpenShadowHosts(doc);

  for (const host of hosts) {
    const root = host.shadowRoot;
    if (!root) continue;

    let shadowStyle = root.getElementById(SHADOW_STYLE_ID) as HTMLStyleElement | null;
    if (!shadowStyle) {
      shadowStyle = doc.createElement('style');
      shadowStyle.id = SHADOW_STYLE_ID;
      root.appendChild(shadowStyle);
    }

    shadowStyle.textContent = `
      img, video, canvas, picture, svg, [data-truely-dark-preserve] {
        filter: ${filter} !important;
        -webkit-filter: ${filter} !important;
      }
    `;
  }
}

function clearShadowDomFilters(doc: Document): void {
  const hosts = collectOpenShadowHosts(doc);
  for (const host of hosts) {
    const root = host.shadowRoot;
    if (!root) continue;
    root.getElementById(SHADOW_STYLE_ID)?.remove();
  }

  clearAdoptedStylesheet(doc);
}

/** Re-scan open shadow roots after SPA DOM updates (media counter-invert only). */
export function refreshShadowDomMediaFilters(
  settings: EffectiveSiteSettings,
  doc: Document = document,
): void {
  if (!settings.active || !settings.preserveMedia) return;
  const filter = buildFilterString(settings.brightness, settings.contrast, settings.sepia);
  applyShadowDomFilters(doc, settings, filter);
}

function applyFilterTarget(
  doc: Document,
  settings: EffectiveSiteSettings,
  filterTarget: FilterTarget,
  filter: string,
  preInvertBg: string,
): void {
  const html = doc.documentElement;
  html.setAttribute(FILTER_TARGET_ATTR, filterTarget);

  clearInlineFilter(html);
  if (doc.body) clearInlineFilter(doc.body);

  applyInlineBackground(html, preInvertBg);
  if (doc.body) applyInlineBackground(doc.body, preInvertBg);

  if (filterTarget === 'html') {
    applyInlineFilter(html, filter);
  } else if (doc.body) {
    applyInlineFilter(doc.body, filter);
  }

  let styleEl = doc.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = doc.createElement('style');
    styleEl.id = STYLE_ID;
  }
  setStyleElementContent(doc, styleEl, generateDarkCss(settings, filterTarget));
  appendStyleElement(doc, styleEl);

  applyShadowDomFilters(doc, settings, filter);
  pierceOpenShadowRoots(doc, generateShadowInvertPrepCss(), SHADOW_FILTER_STYLE_ID);
}

export function injectPreloadCss(doc: Document = document): void {
  if (doc.getElementById(PRELOAD_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = PRELOAD_STYLE_ID;
  style.textContent = PRELOAD_CSS;
  const target = doc.head ?? doc.documentElement;
  target.insertBefore(style, target.firstChild);
}

function swapPreloadToInvertSafe(doc: Document, preInvertBg: string): void {
  const preloadEl = doc.getElementById(PRELOAD_STYLE_ID);
  if (preloadEl) {
    preloadEl.textContent = `
      html,
      body {
        background-color: ${preInvertBg} !important;
        color-scheme: dark;
      }
    `;
  }
}

function restorePreloadDark(doc: Document): void {
  const preloadEl = doc.getElementById(PRELOAD_STYLE_ID);
  if (preloadEl) {
    preloadEl.textContent = PRELOAD_CSS.trim();
  }
}

/**
 * Apply Soft/On dark mode with html-first filter and body fallback when needed.
 */
export function applyDarkMode(
  settings: EffectiveSiteSettings,
  doc: Document = document,
): ApplyDarkModeResult {
  const html = doc.documentElement;

  if (!settings.active) {
    removeDarkMode(doc);
    return { filterTarget: 'html', applied: false };
  }

  const preInvertBg = computePreInvertBackground(settings.backgroundColor);
  const filter = buildFilterString(
    settings.brightness,
    settings.contrast,
    settings.sepia,
  );

  html.setAttribute(ROOT_ATTR, settings.mode);
  swapPreloadToInvertSafe(doc, preInvertBg);

  applyFilterTarget(doc, settings, 'html', filter, preInvertBg);

  let filterTarget: FilterTarget = 'html';
  let applied = verifySoftApplication(doc, 'html');

  if (!applied && doc.body) {
    applyFilterTarget(doc, settings, 'body', filter, preInvertBg);
    filterTarget = 'body';
    applied = verifySoftApplication(doc, 'body');
  }

  return { filterTarget, applied };
}

export function removeDarkMode(doc: Document = document): void {
  const html = doc.documentElement;
  html.removeAttribute(ROOT_ATTR);
  html.removeAttribute(FILTER_TARGET_ATTR);
  html.removeAttribute(FORCE_ATTR);
  clearInlineBackground(html);
  clearInlineFilter(html);
  html.style.removeProperty('color');

  if (doc.body) {
    clearInlineBackground(doc.body);
    clearInlineFilter(doc.body);
    doc.body.style.removeProperty('color');
  }

  restorePreloadDark(doc);
  clearShadowDomFilters(doc);

  const styleEl = doc.getElementById(STYLE_ID);
  if (styleEl) styleEl.remove();
  doc.getElementById('truely-dark-force-styles')?.remove();
}

export function isDarkModeActive(doc: Document = document): boolean {
  return doc.documentElement.hasAttribute(ROOT_ATTR);
}

export function isSoftFilterActive(doc: Document = document): boolean {
  if (!isDarkModeActive(doc)) return false;
  if (doc.documentElement.getAttribute(FORCE_ATTR) === 'true') return false;
  const target =
    doc.documentElement.getAttribute(FILTER_TARGET_ATTR) === 'body' ? 'body' : 'html';
  return verifySoftApplication(doc, target as FilterTarget);
}

export function isForceStylesheetActive(doc: Document = document): boolean {
  return doc.documentElement.getAttribute(FORCE_ATTR) === 'true';
}
