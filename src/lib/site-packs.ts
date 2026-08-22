import type { SitePack } from '../types';

const GOOGLE_DOCS_CSS = `
  /* Docs chrome — let filter pass through; canvas renders document body */
  .docs-material,
  #docs-chrome,
  .docs-titlebar,
  .docs-bars,
  .goog-menu,
  .goog-toolbar,
  .kix-appview-editor {
    background-color: transparent !important;
  }
  /* Toolbar text stays readable under invert */
  .docs-material .goog-toolbar-button,
  #docs-toolbar-wrapper {
    color-scheme: dark;
  }
`;

const GOOGLE_SHEETS_CSS = `
  /* Sheets chrome transparency */
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

/**
 * Site-specific rules for top sites that need special handling.
 */
export const SITE_PACKS: SitePack[] = [
  {
    origins: ['github.com', 'www.github.com'],
    mode: 'auto',
    skipDetect: false,
    customCss: `
      .js-navigation-container { background-color: transparent !important; }
      .Header { background-color: transparent !important; }
    `,
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
    origins: ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
    mode: 'auto',
    skipDetect: false,
    customCss: `
      ytd-app { background-color: transparent !important; }
    `,
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
  },
  {
    origins: ['stackoverflow.com', 'www.stackoverflow.com'],
    mode: 'auto',
    skipDetect: false,
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
