import type { EffectiveSiteSettings } from '../types';
import { parseColor, rgbByteLuminance } from './color';
import { isExtensionInjectedBackground } from './detect';
import { computedFilterHasStrictInvert } from './filter-verify';
import { FORCE_MARKETING_BG, MARKETING_FORCE_SHELL_CSS, hostMatchesSitePackOrigin, hostPrefersForceStylesheet, hostRequiresMarketingVisualVerify, hostUsesAppShellSoft, hostUsesForceSoftEngine, hostUsesInvertSoft, hostUsesMarketingForceShell, isYouTubeHostname, REDIRECTION_BANNER_KILL_CSS, resolveForceBackgroundColor, syncYouTubeNativeDarkHint } from './site-packs';
import {
  pierceOpenShadowRoots,
  generateShadowForceCss,
  generateShadowInvertPrepCss,
  removePiercedShadowStyles,
  SHADOW_FILTER_STYLE_ID,
  SHADOW_FORCE_STYLE_ID,
} from './shadow-force';

export const ROOT_ATTR = 'data-truely-dark-active';
export const FILTER_TARGET_ATTR = 'data-truely-dark-filter-target';
export const FORCE_ATTR = 'data-truely-dark-force';
export const APP_SHELL_ATTR = 'data-truely-dark-app-shell';
const STYLE_ID = 'truely-dark-styles';
const PRELOAD_STYLE_ID = 'truely-dark-preload';
const SHADOW_STYLE_ID = 'truely-dark-shadow-styles';
const ADOPTED_SHEETS = new WeakMap<Document, CSSStyleSheet>();

/**
 * Force Soft invariant: paired background + foreground on marketing surfaces.
 * Never paint text color globally without a co-located dark background (contrast death).
 */
export const MARKETING_FORCE_SURFACE_PAIRING_CSS = `
  html[${ROOT_ATTR}][${FORCE_ATTR}] main,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [role="main"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] section,
  html[${ROOT_ATTR}][${FORCE_ATTR}] article,
  html[${ROOT_ATTR}][${FORCE_ATTR}] aside,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="card"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="Card"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="tile"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="Tile"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="panel"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="Panel"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="section"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="Section"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="solution"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="Solution"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="callout"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="Callout"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="wrapper"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="box"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="Box"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="odss-"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="ods-"]:not([class*="ods-header"]):not([class*="ods-footer"]) {
    background-color: var(--truely-dark-bg, ${FORCE_MARKETING_BG}) !important;
    background-image: none !important;
    color: #e8eaed !important;
  }
  html[${ROOT_ATTR}][${FORCE_ATTR}] section h1,
  html[${ROOT_ATTR}][${FORCE_ATTR}] section h2,
  html[${ROOT_ATTR}][${FORCE_ATTR}] section h3,
  html[${ROOT_ATTR}][${FORCE_ATTR}] section h4,
  html[${ROOT_ATTR}][${FORCE_ATTR}] section p,
  html[${ROOT_ATTR}][${FORCE_ATTR}] section span,
  html[${ROOT_ATTR}][${FORCE_ATTR}] section li,
  html[${ROOT_ATTR}][${FORCE_ATTR}] section label,
  html[${ROOT_ATTR}][${FORCE_ATTR}] article h1,
  html[${ROOT_ATTR}][${FORCE_ATTR}] article h2,
  html[${ROOT_ATTR}][${FORCE_ATTR}] article h3,
  html[${ROOT_ATTR}][${FORCE_ATTR}] article p,
  html[${ROOT_ATTR}][${FORCE_ATTR}] article span,
  html[${ROOT_ATTR}][${FORCE_ATTR}] article li,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="card"] h1,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="card"] h2,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="card"] h3,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="card"] p,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="card"] span,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="card"] li,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="tile"] h1,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="tile"] h2,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="tile"] p,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="tile"] span,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="tile"] li {
    color: #e8eaed !important;
  }
  html[${ROOT_ATTR}][${FORCE_ATTR}] section small,
  html[${ROOT_ATTR}][${FORCE_ATTR}] article small,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="card"] small,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="subtitle"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="description"] {
    color: #bdc1c6 !important;
  }
`;

/**
 * Default Soft engine — paired bg+fg on app/dashboard/email surfaces (no html invert).
 * Chrome sidebars with native dark theme stay readable; main panels darken coherently.
 */
export const SPA_FORCE_SURFACE_CSS = `
  html[${ROOT_ATTR}][${FORCE_ATTR}] header,
  html[${ROOT_ATTR}][${FORCE_ATTR}] nav,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [role="banner"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [role="navigation"] {
    background-color: transparent !important;
    background-image: none !important;
  }
  html[${ROOT_ATTR}][${FORCE_ATTR}] main,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [role="main"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [role="region"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [role="grid"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [role="row"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] #root,
  html[${ROOT_ATTR}][${FORCE_ATTR}] #__next,
  html[${ROOT_ATTR}][${FORCE_ATTR}] #app,
  html[${ROOT_ATTR}][${FORCE_ATTR}] section,
  html[${ROOT_ATTR}][${FORCE_ATTR}] article,
  html[${ROOT_ATTR}][${FORCE_ATTR}] form,
  html[${ROOT_ATTR}][${FORCE_ATTR}] fieldset,
  html[${ROOT_ATTR}][${FORCE_ATTR}] table,
  html[${ROOT_ATTR}][${FORCE_ATTR}] thead,
  html[${ROOT_ATTR}][${FORCE_ATTR}] tbody,
  html[${ROOT_ATTR}][${FORCE_ATTR}] tr,
  html[${ROOT_ATTR}][${FORCE_ATTR}] td,
  html[${ROOT_ATTR}][${FORCE_ATTR}] th,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="card"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="Card"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="panel"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="Panel"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="content"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="Content"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="container"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="Container"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="wrapper"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="Wrapper"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="dashboard"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="Dashboard"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="module"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="Module"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="tile"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="Tile"],
  html[${ROOT_ATTR}][${FORCE_ATTR}] c-wiz {
    background-color: var(--truely-dark-bg, #121212) !important;
    background-image: none !important;
    color: #e8eaed !important;
    border-color: #3c4043 !important;
  }
  html[${ROOT_ATTR}][${FORCE_ATTR}] main h1,
  html[${ROOT_ATTR}][${FORCE_ATTR}] main h2,
  html[${ROOT_ATTR}][${FORCE_ATTR}] main h3,
  html[${ROOT_ATTR}][${FORCE_ATTR}] main p,
  html[${ROOT_ATTR}][${FORCE_ATTR}] main span,
  html[${ROOT_ATTR}][${FORCE_ATTR}] main li,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [role="main"] h1,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [role="main"] h2,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [role="main"] p,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [role="main"] span,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [role="main"] li,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="card"] h1,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="card"] h2,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="card"] p,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="card"] span,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="panel"] h1,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="panel"] p,
  html[${ROOT_ATTR}][${FORCE_ATTR}] [class*="panel"] span,
  html[${ROOT_ATTR}][${FORCE_ATTR}] form label,
  html[${ROOT_ATTR}][${FORCE_ATTR}] form span,
  html[${ROOT_ATTR}][${FORCE_ATTR}] td,
  html[${ROOT_ATTR}][${FORCE_ATTR}] th {
    color: #e8eaed !important;
  }
  html[${ROOT_ATTR}][${FORCE_ATTR}] input:not([type="image"]):not([type="checkbox"]):not([type="radio"]),
  html[${ROOT_ATTR}][${FORCE_ATTR}] textarea,
  html[${ROOT_ATTR}][${FORCE_ATTR}] select {
    background-color: #1a1a1a !important;
    color: #e8eaed !important;
    border-color: #3c4043 !important;
  }
  html[${ROOT_ATTR}][${FORCE_ATTR}] img,
  html[${ROOT_ATTR}][${FORCE_ATTR}] svg,
  html[${ROOT_ATTR}][${FORCE_ATTR}] picture,
  html[${ROOT_ATTR}][${FORCE_ATTR}] video {
    background-color: transparent !important;
    filter: none !important;
    -webkit-filter: none !important;
  }
`;

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

export type FilterTarget = 'html' | 'body' | 'force' | 'app-shell';

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
 * Default Soft = force surface darkening. Invert is opt-in only (hostUsesInvertSoft).
 */
export function effectivePrefersForceSoft(
  settings: EffectiveSiteSettings,
  hostname?: string,
): boolean {
  if (hostname && hostUsesAppShellSoft(hostname)) return false;
  if (hostname && hostUsesInvertSoft(hostname)) return false;
  if (settings.sitePack?.preferForceStylesheet === true) return true;
  if (hostname && hostUsesForceSoftEngine(hostname)) return true;
  return false;
}

/** True only for explicit invert-opt-in hosts (empty allowlist by default). */
export function effectiveUsesInvertSoft(
  settings: EffectiveSiteSettings,
  hostname?: string,
): boolean {
  if (hostname && hostUsesAppShellSoft(hostname)) return false;
  if (hostname && hostUsesInvertSoft(hostname)) return true;
  if (settings.sitePack?.invertOnlyCustomCss && !settings.sitePack.preferForceStylesheet) {
    return true;
  }
  return false;
}

export function effectiveUsesAppShellSoft(
  settings: EffectiveSiteSettings,
  hostname?: string,
): boolean {
  return Boolean(hostname && hostUsesAppShellSoft(hostname) && settings.active);
}

/** Remove invert Soft artifacts — required before force path on marketing hosts. */
export function stripInvertSoftArtifacts(doc: Document = document): void {
  const html = doc.documentElement;
  clearInlineFilter(html);
  if (doc.body) clearInlineFilter(doc.body);
  removePiercedShadowStyles(doc, [SHADOW_FILTER_STYLE_ID]);
}

export function generateForceStylesheetCss(
  settings: EffectiveSiteSettings,
  hostname?: string,
): string {
  const resolvedHost =
    hostname ??
    settings.sitePack?.origins?.[0] ??
    '';
  const bg = resolveForceBackgroundColor(settings, resolvedHost);
  const text = '#e8e8e8';
  const link = '#8ab4f8';
  const usesMarketingShell = hostUsesMarketingForceShell(resolvedHost);

  let css = `
    html[${ROOT_ATTR}] {
      --truely-dark-bg: ${bg};
      color-scheme: dark !important;
    }
    html[${ROOT_ATTR}],
    html[${ROOT_ATTR}] body {
      background-color: ${bg} !important;
      background-image: none !important;
      color: ${text} !important;
      filter: none !important;
      -webkit-filter: none !important;
    }
    html[${ROOT_ATTR}] a,
    html[${ROOT_ATTR}] a:visited {
      color: ${link} !important;
    }
  `;

  if (usesMarketingShell) {
    css += MARKETING_FORCE_SHELL_CSS;
    css += MARKETING_FORCE_SURFACE_PAIRING_CSS;
  } else {
    css += SPA_FORCE_SURFACE_CSS;
  }

  if (settings.sitePack?.customCss && hostMatchesSitePackOrigin(resolvedHost, settings.sitePack)) {
    css += settings.sitePack.customCss;
  }

  css += REDIRECTION_BANNER_KILL_CSS;

  return css;
}

export function applyForceStylesheetMode(
  settings: EffectiveSiteSettings,
  doc: Document = document,
  hostname?: string,
): void {
  stripInvertSoftArtifacts(doc);

  const html = doc.documentElement;
  const forceBg = resolveForceBackgroundColor(settings, hostname);

  html.setAttribute(ROOT_ATTR, settings.mode);
  html.setAttribute(FORCE_ATTR, 'true');
  html.setAttribute(FILTER_TARGET_ATTR, 'force');

  clearInlineFilter(html);
  if (doc.body) clearInlineFilter(doc.body);

  html.style.setProperty('background-color', forceBg, 'important');
  html.style.setProperty('color', '#e8e8e8', 'important');
  if (doc.body) {
    doc.body.style.setProperty('background-color', forceBg, 'important');
    doc.body.style.setProperty('color', '#e8e8e8', 'important');
  }

  const css = generateForceStylesheetCss(settings, hostname);
  let styleEl = doc.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = doc.createElement('style');
    styleEl.id = STYLE_ID;
  }
  styleEl.textContent = css;
  appendStyleElement(doc, styleEl);

  pierceOpenShadowRoots(
    doc,
    generateShadowForceCss({ ...settings, backgroundColor: forceBg }, hostname),
    SHADOW_FORCE_STYLE_ID,
  );

  if (hostname && isYouTubeHostname(hostname)) {
    syncYouTubeNativeDarkHint(doc, true);
  }
}

/**
 * App-shell Soft — color-scheme hint only; no invert, no opaque viewport paint.
 * Used for Angular/ODS control panels (OVH Manager) where invert/force destroys layout.
 */
export function applyAppShellSoftMode(
  settings: EffectiveSiteSettings,
  doc: Document = document,
): void {
  stripInvertSoftArtifacts(doc);

  const html = doc.documentElement;
  html.setAttribute(ROOT_ATTR, settings.mode);
  html.setAttribute(APP_SHELL_ATTR, 'true');
  html.removeAttribute(FORCE_ATTR);
  html.setAttribute(FILTER_TARGET_ATTR, 'app-shell');

  clearInlineFilter(html);
  clearInlineBackground(html);
  html.style.removeProperty('color');

  if (doc.body) {
    clearInlineFilter(doc.body);
    clearInlineBackground(doc.body);
    doc.body.style.removeProperty('color');
  }

  doc.getElementById(PRELOAD_STYLE_ID)?.remove();

  const css = `
    html[${ROOT_ATTR}][${APP_SHELL_ATTR}] {
      color-scheme: dark !important;
    }
    html[${ROOT_ATTR}][${APP_SHELL_ATTR}],
    html[${ROOT_ATTR}][${APP_SHELL_ATTR}] body {
      filter: none !important;
      -webkit-filter: none !important;
    }
  `;

  let styleEl = doc.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = doc.createElement('style');
    styleEl.id = STYLE_ID;
  }
  styleEl.textContent = css;
  appendStyleElement(doc, styleEl);
}

export function verifyAppShellSoftApplication(doc: Document = document): boolean {
  const html = doc.documentElement;
  if (html.getAttribute(APP_SHELL_ATTR) !== 'true') return false;
  if (!html.hasAttribute(ROOT_ATTR)) return false;

  const view = doc.defaultView;
  if (!view) return false;

  const htmlFilter = view.getComputedStyle(html).filter;
  if (computedFilterHasStrictInvert(htmlFilter)) return false;

  if (doc.body) {
    const bodyFilter = view.getComputedStyle(doc.body).filter;
    if (computedFilterHasStrictInvert(bodyFilter)) return false;
  }

  return true;
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
  hostname?: string,
): string {
  if (effectivePrefersForceSoft(settings, hostname)) {
    return generateForceStylesheetCss(settings, hostname);
  }

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

  if (settings.sitePack?.invertOnlyCustomCss) {
    css += settings.sitePack.invertOnlyCustomCss;
  }

  css += REDIRECTION_BANNER_KILL_CSS;

  if (settings.sitePack?.customCss && !settings.sitePack.preferForceStylesheet) {
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

/** Force-mode root surfaces must be dark (no invert pre-bg leak). */
export const MIN_FORCE_ROOT_LUMINANCE = 0.45;

function isForceRootBackgroundDark(view: Window, el: Element | null): boolean {
  if (!el) return false;
  const bg = view.getComputedStyle(el).backgroundColor;
  if (!bg) return false;
  const rgb = parseColor(bg);
  if (!rgb) return false;
  return rgbByteLuminance(rgb.r, rgb.g, rgb.b) < MIN_FORCE_ROOT_LUMINANCE;
}

const FORCE_ROOT_SURFACE_SELECTORS = [
  'main',
  '[role="main"]',
  '.dialog-off-canvas-main-canvas',
  '#__next',
  '#root',
] as const;

/** Content surfaces that must darken on marketing force Soft (x.ai pricing cards). */
const MARKETING_FORCE_CONTENT_SELECTORS = [
  'main',
  '[role="main"]',
  '#__next > div',
  '#__next section',
  '[class*="pricing"]',
  '[class*="Pricing"]',
  '[class*="card"]',
  '[class*="Card"]',
  '[class*="tier"]',
  '[class*="Tier"]',
  '[class*="plan"]',
  '[class*="Plan"]',
] as const;

function getComputedBackgroundLuminance(view: Window, el: Element): number | null {
  const bg = view.getComputedStyle(el).backgroundColor;
  if (!bg) return null;
  const rgb = parseColor(bg);
  if (!rgb) return null;
  return rgbByteLuminance(rgb.r, rgb.g, rgb.b);
}

function isForceApplicationBackgroundDark(view: Window, doc: Document): boolean {
  if (isForceRootBackgroundDark(view, doc.documentElement)) return true;
  if (doc.body && isForceRootBackgroundDark(view, doc.body)) return true;
  for (const selector of FORCE_ROOT_SURFACE_SELECTORS) {
    const el = doc.querySelector(selector);
    if (isForceRootBackgroundDark(view, el)) return true;
  }
  return false;
}

/**
 * Verified force stylesheet: force attr set, no invert filter, dark root background.
 */
export function verifyForceApplication(doc: Document = document): boolean {
  const html = doc.documentElement;
  if (html.getAttribute(FORCE_ATTR) !== 'true') return false;

  const view = doc.defaultView;
  if (!view) return false;

  const htmlFilter = view.getComputedStyle(html).filter;
  if (computedFilterHasStrictInvert(htmlFilter)) return false;

  if (doc.body) {
    const bodyFilter = view.getComputedStyle(doc.body).filter;
    if (computedFilterHasStrictInvert(bodyFilter)) return false;
  }

  if (isForceApplicationBackgroundDark(view, doc)) return true;

  // Force-marketing hosts paint on child surfaces (OVH Drupal); attrs mean force path engaged.
  return html.hasAttribute(ROOT_ATTR);
}

/**
 * Marketing force Soft must darken content/card surfaces — html #0d1117 alone is half-applied.
 */
export function verifyMarketingForceApplication(
  doc: Document = document,
  hostname?: string,
): boolean {
  if (!verifyForceApplication(doc)) return false;

  const view = doc.defaultView;
  if (!view) return false;

  const contentLums: number[] = [];
  for (const selector of MARKETING_FORCE_CONTENT_SELECTORS) {
    const nodes = doc.querySelectorAll(selector);
    for (const el of nodes) {
      const lum = getComputedBackgroundLuminance(view, el);
      if (lum !== null) contentLums.push(lum);
      if (contentLums.length >= 8) break;
    }
    if (contentLums.length >= 8) break;
  }

  if (contentLums.length === 0) {
    return isForceApplicationBackgroundDark(view, doc);
  }

  const darkSamples = contentLums.filter((lum) => lum < MIN_FORCE_ROOT_LUMINANCE);
  const lightSamples = contentLums.filter((lum) => lum > 0.7);

  if (lightSamples.length > 0 && darkSamples.length === 0) return false;
  if (darkSamples.length >= Math.ceil(contentLums.length / 2)) return true;

  if (hostname && hostRequiresMarketingVisualVerify(hostname)) {
    return false;
  }

  return darkSamples.length > 0;
}

export function verifyForceApplicationForHost(
  doc: Document = document,
  hostname?: string,
): boolean {
  if (hostname && hostRequiresMarketingVisualVerify(hostname)) {
    return verifyMarketingForceApplication(doc, hostname);
  }
  return verifyForceApplication(doc);
}

/**
 * True when computed filter on the target element includes invert().
 */
export function verifySoftFilterApplied(
  doc: Document,
  filterTarget: FilterTarget = 'html',
): boolean {
  if (filterTarget === 'force') return false;

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
  if (effectivePrefersForceSoft(settings)) return;
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
  hostname?: string,
): void {
  if (effectivePrefersForceSoft(settings, hostname)) {
    applyForceStylesheetMode(settings, doc, hostname);
    return;
  }

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
  setStyleElementContent(doc, styleEl, generateDarkCss(settings, filterTarget, hostname));
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
  hostname?: string,
): ApplyDarkModeResult {
  const html = doc.documentElement;

  if (!settings.active) {
    removeDarkMode(doc);
    return { filterTarget: 'html', applied: false };
  }

  if (effectivePrefersForceSoft(settings, hostname)) {
    stripInvertSoftArtifacts(doc);
    html.setAttribute(ROOT_ATTR, settings.mode);
    restorePreloadDark(doc);
    applyForceStylesheetMode(settings, doc, hostname);
    const applied = verifyForceApplicationForHost(doc, hostname);
    return { filterTarget: 'force', applied };
  }

  if (hostname && hostUsesAppShellSoft(hostname)) {
    applyAppShellSoftMode(settings, doc);
    return { filterTarget: 'app-shell', applied: verifyAppShellSoftApplication(doc) };
  }

  const preInvertBg = computePreInvertBackground(settings.backgroundColor);
  const filter = buildFilterString(
    settings.brightness,
    settings.contrast,
    settings.sepia,
  );

  html.setAttribute(ROOT_ATTR, settings.mode);
  swapPreloadToInvertSafe(doc, preInvertBg);

  applyFilterTarget(doc, settings, 'html', filter, preInvertBg, hostname);

  let filterTarget: FilterTarget = 'html';
  let applied = verifySoftApplication(doc, 'html');

  if (!applied && doc.body) {
    applyFilterTarget(doc, settings, 'body', filter, preInvertBg, hostname);
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
  html.removeAttribute(APP_SHELL_ATTR);
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
  removePiercedShadowStyles(doc, [SHADOW_FORCE_STYLE_ID, SHADOW_FILTER_STYLE_ID]);
  syncYouTubeNativeDarkHint(doc, false);

  const styleEl = doc.getElementById(STYLE_ID);
  if (styleEl) styleEl.remove();
  doc.getElementById(PRELOAD_STYLE_ID)?.remove();
  doc.getElementById('truely-dark-force-styles')?.remove();

  try {
    doc.dispatchEvent(new CustomEvent('truely-dark-main-remove'));
  } catch {
    // CustomEvent may be blocked in some contexts
  }
}

export function isDarkModeActive(doc: Document = document): boolean {
  return doc.documentElement.hasAttribute(ROOT_ATTR);
}

export function isSoftFilterActive(doc: Document = document, hostname?: string): boolean {
  if (!isDarkModeActive(doc)) return false;
  if (doc.documentElement.getAttribute(APP_SHELL_ATTR) === 'true') {
    return verifyAppShellSoftApplication(doc);
  }
  if (doc.documentElement.getAttribute(FORCE_ATTR) === 'true') {
    return verifyForceApplicationForHost(doc, hostname);
  }
  const target =
    doc.documentElement.getAttribute(FILTER_TARGET_ATTR) === 'body' ? 'body' : 'html';
  return verifySoftApplication(doc, target as FilterTarget);
}

export function isForceStylesheetActive(doc: Document = document): boolean {
  return doc.documentElement.getAttribute(FORCE_ATTR) === 'true';
}
