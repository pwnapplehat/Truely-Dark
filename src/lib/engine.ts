import type { EffectiveSiteSettings } from '../types';
import { parseColor } from './detect';

const ROOT_ATTR = 'data-truely-dark-active';
const STYLE_ID = 'truely-dark-styles';
const PRELOAD_STYLE_ID = 'truely-dark-preload';

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
 * Generate the main dark mode CSS.
 * Note: iframes are NOT counter-inverted — child frames run their own content script via all_frames.
 */
export function generateDarkCss(settings: EffectiveSiteSettings): string {
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
    }

    html[${ROOT_ATTR}] {
      filter: ${filter} !important;
    }
  `;

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
      }
      html[${ROOT_ATTR}] video:fullscreen,
      html[${ROOT_ATTR}] video::-webkit-media-controls-enclosure {
        filter: none !important;
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
        }
      `;
    }
  }

  return css;
}

export function injectPreloadCss(doc: Document = document): void {
  if (doc.getElementById(PRELOAD_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = PRELOAD_STYLE_ID;
  style.textContent = PRELOAD_CSS;
  const target = doc.head || doc.documentElement;
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

export function applyDarkMode(
  settings: EffectiveSiteSettings,
  doc: Document = document,
): void {
  const html = doc.documentElement;

  if (!settings.active) {
    removeDarkMode(doc);
    return;
  }

  const preInvertBg = computePreInvertBackground(settings.backgroundColor);

  html.setAttribute(ROOT_ATTR, settings.mode);

  // Swap FOUC preload from dark #121212 to invert-safe light root before filter paints
  swapPreloadToInvertSafe(doc, preInvertBg);

  html.style.backgroundColor = preInvertBg;
  if (doc.body) {
    doc.body.style.backgroundColor = preInvertBg;
  }

  let styleEl = doc.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = doc.createElement('style');
    styleEl.id = STYLE_ID;
    doc.head?.appendChild(styleEl);
  }
  styleEl.textContent = generateDarkCss(settings);
}

export function removeDarkMode(doc: Document = document): void {
  const html = doc.documentElement;
  html.removeAttribute(ROOT_ATTR);
  html.style.backgroundColor = '';
  if (doc.body) {
    doc.body.style.backgroundColor = '';
  }

  restorePreloadDark(doc);

  const styleEl = doc.getElementById(STYLE_ID);
  if (styleEl) styleEl.remove();
}

export function isDarkModeActive(doc: Document = document): boolean {
  return doc.documentElement.hasAttribute(ROOT_ATTR);
}
