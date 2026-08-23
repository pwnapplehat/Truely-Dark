import type { EffectiveSiteSettings } from '../types';
import { ROOT_ATTR } from './engine';
import { hostPrefersForceStylesheet, resolveForceBackgroundColor } from './site-packs';

export const SHADOW_FORCE_STYLE_ID = 'truely-dark-shadow-force';
export const SHADOW_FILTER_STYLE_ID = 'truely-dark-shadow-filter';

/**
 * CSS injected inside each open shadow root for force (direct dark) mode.
 * Shell-only — never paint every descendant opaque.
 */
export function generateShadowForceCss(settings: EffectiveSiteSettings): string {
  const bg = resolveForceBackgroundColor(settings);
  const text = '#e8e8e8';
  const link = '#8ab4f8';

  return `
    :host {
      background-color: ${bg} !important;
      background-image: none !important;
      color: ${text} !important;
      color-scheme: dark !important;
    }
  a, a:visited {
      color: ${link} !important;
    }
    img, svg, video, picture, canvas {
      background-color: transparent !important;
    }
  `;
}

/**
 * Pre-invert surfaces inside shadow roots so parent html invert reads dark.
 */
export function generateShadowInvertPrepCss(): string {
  return `
    :host {
      background-color: #ffffff !important;
      background-image: none !important;
      color: #000000 !important;
    }
  `;
}

/**
 * Pierce open shadow roots from the content-script (isolated) world.
 */
export function pierceOpenShadowRoots(
  doc: Document,
  cssText: string,
  styleId: string = SHADOW_FORCE_STYLE_ID,
): void {
  const visited = new WeakSet<Node>();

  const walk = (node: Node): void => {
    if (!node || visited.has(node)) return;
    visited.add(node);

    if (node instanceof Element && node.shadowRoot) {
      injectStyleIntoShadowRoot(node.shadowRoot, cssText, styleId, doc);
      for (const child of node.shadowRoot.children) {
        walk(child);
      }
      for (const el of node.shadowRoot.querySelectorAll('*')) {
        walk(el);
      }
    }

    if (node instanceof Element) {
      for (const child of node.children) {
        walk(child);
      }
    }
  };

  walk(doc.documentElement);
}

/**
 * Remove pierced style elements from open shadow roots (off-mode cleanup).
 */
export function removePiercedShadowStyles(
  doc: Document,
  styleIds: string[],
): void {
  const visited = new WeakSet<Node>();

  const walk = (node: Node): void => {
    if (!node || visited.has(node)) return;
    visited.add(node);

    if (node instanceof Element && node.shadowRoot) {
      const root = node.shadowRoot;
      for (const id of styleIds) {
        root.getElementById(id)?.remove();
      }
      for (const child of root.children) {
        walk(child);
      }
      for (const el of root.querySelectorAll('*')) {
        walk(el);
      }
    }

    if (node instanceof Element) {
      for (const child of node.children) {
        walk(child);
      }
    }
  };

  walk(doc.documentElement);
}

function injectStyleIntoShadowRoot(
  root: ShadowRoot,
  cssText: string,
  styleId: string,
  doc: Document,
): void {
  let styleEl = root.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = doc.createElement('style');
    styleEl.id = styleId;
    root.appendChild(styleEl);
  }
  styleEl.textContent = cssText;

  try {
    if ('adoptedStyleSheets' in root) {
      const rootWithSheets = root as ShadowRoot & { adoptedStyleSheets: CSSStyleSheet[] };
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(cssText);
      const without = rootWithSheets.adoptedStyleSheets.filter((s) => s !== sheet);
      rootWithSheets.adoptedStyleSheets = [...without, sheet];
    }
  } catch {
    // adoptedStyleSheets may be blocked
  }
}

/**
 * Escalation force CSS — shell surfaces only (no universal * paint).
 */
export function generateNuclearForceCss(
  settings: EffectiveSiteSettings,
  hostname?: string,
): string {
  const bg = resolveForceBackgroundColor(settings);
  const text = '#e8e8e8';
  const link = '#8ab4f8';
  const preferForce =
    settings.sitePack?.preferForceStylesheet === true ||
    (hostname ? hostPrefersForceStylesheet(hostname) : false);

  if (preferForce) {
    return `
      html[${ROOT_ATTR}],
      html[${ROOT_ATTR}] body,
      html[${ROOT_ATTR}] main,
      html[${ROOT_ATTR}] [role="main"],
      html[${ROOT_ATTR}] #root,
      html[${ROOT_ATTR}] #__next {
        background-color: ${bg} !important;
        background-image: none !important;
        color: ${text} !important;
        filter: none !important;
        -webkit-filter: none !important;
        color-scheme: dark !important;
      }
      html[${ROOT_ATTR}] footer,
      html[${ROOT_ATTR}] [role="contentinfo"],
      html[${ROOT_ATTR}] [class*="footer"],
      html[${ROOT_ATTR}] [class*="Footer"] {
        background-color: ${bg} !important;
        background-image: none !important;
        color: ${text} !important;
      }
      html[${ROOT_ATTR}] a,
      html[${ROOT_ATTR}] a:visited {
        color: ${link} !important;
      }
    `;
  }

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
    html[${ROOT_ATTR}] section {
      background-color: ${bg} !important;
      background-image: none !important;
      color: ${text} !important;
    }
    html[${ROOT_ATTR}] a,
    html[${ROOT_ATTR}] a:visited {
      color: ${link} !important;
    }
  `;
}
