import type { EffectiveSiteSettings, SitePack } from '../types';
export const FORCE_MARKETING_BG = '#0d1117';

/** Shared force-mode surfaces for marketing / hero-heavy sites (no invert). */
export const MARKETING_FORCE_SHELL_CSS = `
  html[data-truely-dark-active],
  html[data-truely-dark-active] body,
  html[data-truely-dark-active] #__next,
  html[data-truely-dark-active] #root,
  html[data-truely-dark-active] main,
  html[data-truely-dark-active] [class*="layout"],
  html[data-truely-dark-active] [class*="Layout"],
  html[data-truely-dark-active] [class*="wrapper"],
  html[data-truely-dark-active] [class*="Wrapper"],
  html[data-truely-dark-active] [class*="page"],
  html[data-truely-dark-active] [class*="Page"] {
    background-color: var(--truely-dark-bg, ${FORCE_MARKETING_BG}) !important;
    background-image: none !important;
    color: #e8eaed !important;
    filter: none !important;
    -webkit-filter: none !important;
    min-height: 100vh;
  }
  html[data-truely-dark-active] header,
  html[data-truely-dark-active] nav,
  html[data-truely-dark-active] [role="banner"],
  html[data-truely-dark-active] section,
  html[data-truely-dark-active] article,
  html[data-truely-dark-active] aside,
  html[data-truely-dark-active] [class*="hero"],
  html[data-truely-dark-active] [class*="Hero"],
  html[data-truely-dark-active] [class*="card"],
  html[data-truely-dark-active] [class*="Card"],
  html[data-truely-dark-active] [class*="topbar"],
  html[data-truely-dark-active] [class*="Topbar"] {
    background-color: #1a1a1a !important;
    background-image: none !important;
    color: #e8eaed !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    isolation: auto !important;
  }
  html[data-truely-dark-active] footer,
  html[data-truely-dark-active] [role="contentinfo"],
  html[data-truely-dark-active] [class*="footer"],
  html[data-truely-dark-active] [class*="Footer"] {
    background-color: var(--truely-dark-bg, ${FORCE_MARKETING_BG}) !important;
    background-image: none !important;
    color: #e8eaed !important;
  }
  html[data-truely-dark-active] h1,
  html[data-truely-dark-active] h2,
  html[data-truely-dark-active] h3,
  html[data-truely-dark-active] h4,
  html[data-truely-dark-active] p,
  html[data-truely-dark-active] span,
  html[data-truely-dark-active] li,
  html[data-truely-dark-active] label {
    color: #e8eaed !important;
  }
  html[data-truely-dark-active] small,
  html[data-truely-dark-active] [class*="subtitle"],
  html[data-truely-dark-active] [class*="description"] {
    color: #bdc1c6 !important;
  }
  html[data-truely-dark-active] a,
  html[data-truely-dark-active] a:visited {
    color: #7baaf7 !important;
  }
  html[data-truely-dark-active] a:hover {
    color: #a8c7fa !important;
  }
  html[data-truely-dark-active] img,
  html[data-truely-dark-active] svg,
  html[data-truely-dark-active] picture,
  html[data-truely-dark-active] video {
    background-color: transparent !important;
  }
`;

/** Nuclear force paint — marketing hosts with stubborn light gutters/footer (OVH). */
export const MARKETING_FORCE_NUCLEAR_CSS = `
  html[data-truely-dark-active][data-truely-dark-force] *:not(img):not(svg):not(video):not(picture):not(canvas):not(source) {
    background-color: var(--truely-dark-bg, ${FORCE_MARKETING_BG}) !important;
    background-image: none !important;
    color: #e8eaed !important;
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    border-color: #3c4043 !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] a,
  html[data-truely-dark-active][data-truely-dark-force] a:visited {
    color: #7baaf7 !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] img,
  html[data-truely-dark-active][data-truely-dark-force] svg,
  html[data-truely-dark-active][data-truely-dark-force] video,
  html[data-truely-dark-active][data-truely-dark-force] picture,
  html[data-truely-dark-active][data-truely-dark-force] canvas {
    background-color: transparent !important;
  }
`;

/** Form surfaces on force marketing hosts — readable newsletter inputs. */
export const FORCE_FORM_SURFACE_CSS = `
  html[data-truely-dark-active][data-truely-dark-force] input:not([type="image"]):not([type="checkbox"]):not([type="radio"]),
  html[data-truely-dark-active][data-truely-dark-force] textarea,
  html[data-truely-dark-active][data-truely-dark-force] select {
    background-color: #1a1a1a !important;
    color: #e8eaed !important;
    border-color: #3c4043 !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] [class*="newsletter"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Newsletter"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="subscribe"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Subscribe"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="keep-in-touch"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="KeepInTouch"] {
    background-color: var(--truely-dark-bg, ${FORCE_MARKETING_BG}) !important;
    color: #e8eaed !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] [class*="newsletter"] *,
  html[data-truely-dark-active][data-truely-dark-force] [class*="subscribe"] *,
  html[data-truely-dark-active][data-truely-dark-force] [class*="keep-in-touch"] * {
    color: #e8eaed !important;
  }
`;

const OVH_FORCE_CSS = `
  html[data-truely-dark-active][data-truely-dark-force] {
    --truely-dark-bg: ${FORCE_MARKETING_BG};
  }
  html[data-truely-dark-active][data-truely-dark-force] [class*="ovh"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Ovh"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="OVH"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="container"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Container"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="column"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Column"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="col-"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="sidebar"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Sidebar"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="gutter"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Gutter"],
  html[data-truely-dark-active][data-truely-dark-force] .header-wrapper,
  html[data-truely-dark-active][data-truely-dark-force] .main-header,
  html[data-truely-dark-active][data-truely-dark-force] .sub-header,
  html[data-truely-dark-active][data-truely-dark-force] [class*="navbar"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Navbar"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="banner"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Banner"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="slider"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="carousel"],
  html[data-truely-dark-active][data-truely-dark-force] section[class*="homepage"],
  html[data-truely-dark-active][data-truely-dark-force] .homepage-hero,
  html[data-truely-dark-active][data-truely-dark-force] [class*="copyright"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Copyright"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="legal"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Legal"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="bottom-bar"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="subfooter"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="sub-footer"],
  html[data-truely-dark-active][data-truely-dark-force] [id*="footer"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="site-footer"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="SiteFooter"] {
    background-color: var(--truely-dark-bg, ${FORCE_MARKETING_BG}) !important;
    background-image: none !important;
    color: #e8eaed !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] [class*="hero"] *,
  html[data-truely-dark-active][data-truely-dark-force] [class*="Hero"] *,
  html[data-truely-dark-active][data-truely-dark-force] h1,
  html[data-truely-dark-active][data-truely-dark-force] h2,
  html[data-truely-dark-active][data-truely-dark-force] h3,
  html[data-truely-dark-active][data-truely-dark-force] h4,
  html[data-truely-dark-active][data-truely-dark-force] p,
  html[data-truely-dark-active][data-truely-dark-force] span,
  html[data-truely-dark-active][data-truely-dark-force] li,
  html[data-truely-dark-active][data-truely-dark-force] label {
    color: #e8eaed !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] [class*="logo"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Logo"] {
    background-color: var(--truely-dark-bg, ${FORCE_MARKETING_BG}) !important;
    background-image: none !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] [class*="logo"] img,
  html[data-truely-dark-active][data-truely-dark-force] [class*="Logo"] img {
    background-color: transparent !important;
  }
`;

/** Invert Soft supplement — light promo tiles / cards that resist html invert. */
const APPLE_INVERT_SURFACE_CSS = `
  html[data-truely-dark-active] [class*="unit"],
  html[data-truely-dark-active] [class*="Unit"],
  html[data-truely-dark-active] [class*="promo"],
  html[data-truely-dark-active] [class*="Promo"],
  html[data-truely-dark-active] section[class*="module"],
  html[data-truely-dark-active] [class*="homepage-section"],
  html[data-truely-dark-active] li[class*="product"] {
    background-color: #1a1a1a !important;
    background-image: none !important;
    filter: none !important;
    -webkit-filter: none !important;
    color: #e8eaed !important;
  }
  html[data-truely-dark-active] [class*="unit"] *,
  html[data-truely-dark-active] [class*="promo"] * {
    color: #e8eaed !important;
  }
`;

/** Invert Soft supplement — lavender navbox + white footer badges. */
const WIKIPEDIA_INVERT_SURFACE_CSS = `
  html[data-truely-dark-active] .navbox,
  html[data-truely-dark-active] .navbox-inner,
  html[data-truely-dark-active] .navbox-title,
  html[data-truely-dark-active] .navbox-list,
  html[data-truely-dark-active] table.navbox,
  html[data-truely-dark-active] .navbox th,
  html[data-truely-dark-active] .navbox td {
    background-color: #1a1a1a !important;
    background-image: none !important;
    filter: none !important;
    -webkit-filter: none !important;
    color: #e8eaed !important;
    border-color: #3c4043 !important;
  }
  html[data-truely-dark-active] #footer,
  html[data-truely-dark-active] .mw-footer,
  html[data-truely-dark-active] .footer-info,
  html[data-truely-dark-active] #footer-info,
  html[data-truely-dark-active] .mw-portlet-footer {
    background-color: ${FORCE_MARKETING_BG} !important;
    background-image: none !important;
    filter: none !important;
    -webkit-filter: none !important;
    color: #e8eaed !important;
  }
  html[data-truely-dark-active] .mw-footer img,
  html[data-truely-dark-active] #footer img,
  html[data-truely-dark-active] .footer-info img {
    background-color: transparent !important;
    filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.95) !important;
    -webkit-filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.95) !important;
  }
`;

const GOOGLE_DOCS_CSS = `
  .docs-material,
  #docs-chrome,
  .docs-titlebar,
  .docs-bars,
  .goog-menu,
  .goog-toolbar,
  .kix-appview-editor {
    background-color: transparent !important;
  }
  .docs-material .goog-toolbar-button,
  #docs-toolbar-wrapper {
    color-scheme: dark;
  }
`;

const GOOGLE_SHEETS_CSS = `
  #docs-chrome,
  .docs-material,
  .docs-bars,
  .grid-container,
  .waffle,
  #sheets-viewport {
    background-color: transparent !important;
  }
  .grid-container {
    color-scheme: dark;
  }
`;

const GOOGLE_SEARCH_CSS = `
  html[data-truely-dark-active] #searchform,
  html[data-truely-dark-active] .RNNXgb,
  html[data-truely-dark-active] header,
  html[data-truely-dark-active] #gb {
    background-color: transparent !important;
  }
`;

const YOUTUBE_CSS = `
  ytd-app,
  #content,
  ytd-page-manager {
    background-color: transparent !important;
  }
`;

const CHROME_WEB_STORE_CSS = `
  html[data-truely-dark-active],
  html[data-truely-dark-active] body {
    min-height: 100vh;
  }
  html[data-truely-dark-active] c-wiz,
  html[data-truely-dark-active] main,
  html[data-truely-dark-active] #root,
  html[data-truely-dark-active] [role="main"],
  html[data-truely-dark-active] header,
  html[data-truely-dark-active] nav {
    background-color: transparent !important;
    background-image: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    isolation: auto !important;
  }
`;

const XAI_FORCE_CSS = `
  html[data-truely-dark-active] {
    --truely-dark-bg: #0a0a0a;
  }
  html[data-truely-dark-active] [class*="pricing"],
  html[data-truely-dark-active] [class*="Pricing"],
  html[data-truely-dark-active] [class*="plan"],
  html[data-truely-dark-active] [class*="Plan"],
  html[data-truely-dark-active] [class*="tier"],
  html[data-truely-dark-active] [class*="Tier"],
  html[data-truely-dark-active] [class*="feature"],
  html[data-truely-dark-active] [class*="Feature"],
  html[data-truely-dark-active] [class*="compare"],
  html[data-truely-dark-active] [class*="Compare"] {
    background-color: #141414 !important;
    background-image: none !important;
    color: #e8eaed !important;
  }
  html[data-truely-dark-active] [class*="logo"],
  html[data-truely-dark-active] [class*="Logo"],
  html[data-truely-dark-active] [class*="navbar"],
  html[data-truely-dark-active] [class*="Navbar"],
  html[data-truely-dark-active] [class*="header"],
  html[data-truely-dark-active] [class*="Header"] {
    background-color: #0a0a0a !important;
    background-image: none !important;
    color: #e8eaed !important;
  }
`;

const OVH_FORCE_PACK_CSS = `${MARKETING_FORCE_NUCLEAR_CSS}${FORCE_FORM_SURFACE_CSS}${OVH_FORCE_CSS}`;

const GITHUB_CSS = `
  .js-navigation-container,
  .Header,
  header.AppHeader {
    background-color: transparent !important;
  }
`;

const REDDIT_CSS = `
  shreddit-app,
  #SHORTCUT_FOCUSABLE_DIV {
    background-color: transparent !important;
  }
`;

const AMAZON_CSS = `
  #navbar,
  #nav-belt,
  #nav-main {
    background-color: transparent !important;
  }
`;

const LINKEDIN_CSS = `
  header,
  .global-nav,
  .scaffold-layout__toolbar {
    background-color: transparent !important;
  }
`;

/**
 * Site-specific rules for top sites that need special handling.
 * Order: more specific hostnames first when overlapping packs matter.
 */
export const SITE_PACKS: SitePack[] = [
  {
    origins: ['chromewebstore.google.com'],
    mode: 'auto',
    skipDetect: false,
    injectCssFallback: true,
    requiresVisualVerify: true,
    forceStylesheetFallback: true,
    customCss: CHROME_WEB_STORE_CSS,
  },
  {
    origins: ['chrome.google.com'],
    mode: 'auto',
    skipDetect: false,
    injectCssFallback: true,
    requiresVisualVerify: true,
    forceStylesheetFallback: true,
    customCss: CHROME_WEB_STORE_CSS,
  },
  {
    origins: ['docs.google.com'],
    mode: 'soft',
    skipDetect: true,
    preserveMedia: false,
    customCss: GOOGLE_DOCS_CSS,
  },
  {
    origins: ['sheets.google.com'],
    mode: 'soft',
    skipDetect: true,
    preserveMedia: false,
    customCss: GOOGLE_SHEETS_CSS,
  },
  {
    origins: ['drive.google.com'],
    mode: 'auto',
    skipDetect: false,
  },
  {
    origins: ['google.com', 'www.google.com'],
    mode: 'auto',
    skipDetect: false,
    customCss: GOOGLE_SEARCH_CSS,
  },
  {
    origins: ['apple.com', 'www.apple.com'],
    mode: 'auto',
    skipDetect: false,
    invertOnlyCustomCss: APPLE_INVERT_SURFACE_CSS,
  },
  {
    origins: ['wikipedia.org'],
    mode: 'auto',
    skipDetect: false,
    invertOnlyCustomCss: WIKIPEDIA_INVERT_SURFACE_CSS,
  },
  {
    origins: ['github.com', 'www.github.com'],
    mode: 'auto',
    skipDetect: false,
    customCss: GITHUB_CSS,
  },
  {
    origins: ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
    mode: 'auto',
    skipDetect: false,
    customCss: YOUTUBE_CSS,
  },
  {
    origins: ['twitter.com', 'www.twitter.com'],
    mode: 'auto',
    skipDetect: false,
  },
  {
    origins: ['x.ai', 'www.x.ai'],
    mode: 'auto',
    skipDetect: false,
    requiresVisualVerify: true,
    preferForceStylesheet: true,
    forceStylesheetFallback: true,
    customCss: XAI_FORCE_CSS,
  },
  {
    origins: ['x.com', 'www.x.com'],
    mode: 'auto',
    skipDetect: false,
  },
  {
    origins: ['reddit.com', 'www.reddit.com', 'old.reddit.com'],
    mode: 'auto',
    skipDetect: false,
    customCss: REDDIT_CSS,
  },
  {
    origins: ['stackoverflow.com', 'www.stackoverflow.com'],
    mode: 'auto',
    skipDetect: false,
  },
  {
    origins: ['ovhcloud.com', 'www.ovhcloud.com'],
    mode: 'soft',
    skipDetect: true,
    requiresVisualVerify: true,
    preferForceStylesheet: true,
    forceStylesheetFallback: true,
    customCss: OVH_FORCE_PACK_CSS,
  },
  {
    origins: ['amazon.com', 'www.amazon.com'],
    mode: 'auto',
    skipDetect: false,
    customCss: AMAZON_CSS,
  },
  {
    origins: ['linkedin.com', 'www.linkedin.com'],
    mode: 'auto',
    skipDetect: false,
    customCss: LINKEDIN_CSS,
  },
  {
    origins: ['medium.com', 'www.medium.com'],
    mode: 'auto',
    skipDetect: false,
    preferForceStylesheet: true,
    requiresVisualVerify: true,
  },
  {
    origins: ['notion.so', 'www.notion.so'],
    mode: 'auto',
    skipDetect: false,
  },
  {
    origins: ['linear.app'],
    mode: 'auto',
    skipDetect: false,
  },
];

export function findSitePack(hostname: string): SitePack | undefined {
  const normalized = hostname.toLowerCase();
  return SITE_PACKS.find((pack) =>
    pack.origins.some((origin) => normalized === origin || normalized.endsWith(`.${origin}`)),
  );
}

export function hostUsesInjectCssFallback(hostname: string): boolean {
  const pack = findSitePack(hostname);
  return pack?.injectCssFallback === true;
}

export function hostRequiresVisualVerify(hostname: string): boolean {
  const pack = findSitePack(hostname);
  return pack?.requiresVisualVerify === true;
}

export function hostUsesForceStylesheetFallback(hostname: string): boolean {
  const pack = findSitePack(hostname);
  return pack?.forceStylesheetFallback === true;
}

export function hostPrefersForceStylesheet(hostname: string): boolean {
  const pack = findSitePack(hostname);
  return pack?.preferForceStylesheet === true;
}

export function hostRequiresMarketingVisualVerify(hostname: string): boolean {
  const pack = findSitePack(hostname);
  return pack?.preferForceStylesheet === true && pack?.requiresVisualVerify === true;
}

/** Force-mode bg for marketing hosts — dark surfaces only, never invert pre-bg white. */
export function resolveForceBackgroundColor(
  settings: Pick<EffectiveSiteSettings, 'backgroundColor' | 'sitePack'>,
): string {
  if (settings.sitePack?.preferForceStylesheet) {
    return FORCE_MARKETING_BG;
  }
  return settings.backgroundColor;
}

export function getOriginFromUrl(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

export function getHostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function isExcludedOrigin(hostname: string, siteMode: string): boolean {
  if (siteMode === 'off') return true;
  const pack = findSitePack(hostname);
  return pack?.mode === 'off' || pack?.excludeFromProcessing === true;
}
