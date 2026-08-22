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
 * Note: iframes are NOT counter-inverted — child frames run their own content script via all_frames.
 */
export function generateDarkCss(settings: EffectiveSiteSettings): string {
  const filter = buildFilterString(
    settings.brightness,
    settings.contrast,
    settings.sepia,
  );

  const bg = settings.backgroundColor;

  // Media preservation excludes iframe — child frames self-darken via all_frames
  const mediaSelectors = settings.preserveMedia
    ? 'img, video, canvas, picture, svg, [data-truely-dark-preserve]'
    : '';

  let css = `
    html[${ROOT_ATTR}],
    html[${ROOT_ATTR}] body {
      background-color: ${bg} !important;
      color-scheme: dark !important;
    }

    html[${ROOT_ATTR}] {
      filter: ${filter} !important;
    }
  `;

  // Firefox: explicit body background (root filter doesn't paint body bg the same way)
  css += `
    @-moz-document url-prefix() {
      html[${ROOT_ATTR}] body {
        background-color: ${bg} !important;
      }
    }
  `;

  // Iframes: darken consistently; child frame content script handles interior
  css += `
    html[${ROOT_ATTR}] iframe {
      background-color: ${bg} !important;
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

/**
 * Preload CSS injected at document_start to prevent white flash.
 */
export const PRELOAD_CSS = `
  html,
  body {
    background-color: #121212 !important;
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

  // Firefox: set inline background as fallback
  html.style.backgroundColor = settings.backgroundColor;
  if (doc.body) {
    doc.body.style.backgroundColor = settings.backgroundColor;
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

  const styleEl = doc.getElementById(STYLE_ID);
  if (styleEl) styleEl.remove();
}

export function isDarkModeActive(doc: Document = document): boolean {
  return doc.documentElement.hasAttribute(ROOT_ATTR);
}
