import type { SitePack } from '../types';

/** Neutralize frosted-glass headers that stay light under html invert. */
const MARKETING_CHROME_CSS = `
  html[data-truely-dark-active] header,
  html[data-truely-dark-active] nav,
  html[data-truely-dark-active] [role="banner"],
  html[data-truely-dark-active] .header,
  html[data-truely-dark-active] .navbar,
  html[data-truely-dark-active] .hero,
  html[data-truely-dark-active] .hero-section,
  html[data-truely-dark-active] section {
    background-color: transparent !important;
    isolation: auto !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
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
  html[data-truely-dark-active] body {
    min-height: 100vh;
  }
`;

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
    customCss: CHROME_WEB_STORE_CSS,
  },
  {
    origins: ['chrome.google.com'],
    mode: 'auto',
    skipDetect: false,
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
    origins: ['twitter.com', 'x.com', 'www.twitter.com', 'www.x.com'],
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
    customCss: MARKETING_CHROME_CSS,
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
    customCss: MARKETING_CHROME_CSS,
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
