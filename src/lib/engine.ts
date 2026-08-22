import type { EffectiveSiteSettings } from '../types';

const ROOT_ATTR = 'data-truely-dark-active';
const STYLE_ID = 'truely-dark-styles';
const PRELOAD_STYLE_ID = 'truely-dark-preload';

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
 */
export function generateDarkCss(settings: EffectiveSiteSettings): string {
  const filter = buildFilterString(
    settings.brightness,
    settings.contrast,
    settings.sepia,
  );

  const mediaSelectors = settings.preserveMedia
    ? 'img, video, canvas, picture, svg, iframe, [data-truely-dark-preserve]'
    : '';

  let css = `
    html[${ROOT_ATTR}] {
      background: ${settings.backgroundColor} !important;
      color-scheme: dark !important;
      filter: ${filter} !important;
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

/**
 * Preload CSS injected at document_start to prevent white flash.
 */
export const PRELOAD_CSS = `
  html {
    background: #121212 !important;
    color-scheme: dark;
  }
`;

export function injectPreloadCss(doc: Document = document): void {
  if (doc.getElementById(PRELOAD_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = PRELOAD_STYLE_ID;
  style.textContent = PRELOAD_CSS;
  const target = doc.head || doc.documentElement;
  target.insertBefore(style, target.firstChild);
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

  html.setAttribute(ROOT_ATTR, settings.mode);

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

  const styleEl = doc.getElementById(STYLE_ID);
  if (styleEl) styleEl.remove();
}

export function isDarkModeActive(doc: Document = document): boolean {
  return doc.documentElement.hasAttribute(ROOT_ATTR);
}
