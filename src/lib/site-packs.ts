import type { SitePack } from '../types';

/**
 * Site-specific rules for top sites that need special handling.
 * Modes: soft = invert filter, on = force dark, off = skip, auto = detect.
 */
export const SITE_PACKS: SitePack[] = [
  {
    origins: ['github.com', 'www.github.com'],
    mode: 'soft',
    skipDetect: true,
    customCss: `
      .js-navigation-container { background-color: transparent !important; }
      .Header { background-color: transparent !important; }
    `,
  },
  {
    origins: ['docs.google.com'],
    mode: 'off',
    skipDetect: true,
  },
  {
    origins: ['sheets.google.com'],
    mode: 'off',
    skipDetect: true,
  },
  {
    origins: ['drive.google.com'],
    mode: 'auto',
    skipDetect: false,
  },
  {
    origins: ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
    mode: 'soft',
    ignoreImages: false,
    customCss: `
      ytd-app { background-color: transparent !important; }
    `,
  },
  {
    origins: ['twitter.com', 'x.com', 'www.twitter.com', 'www.x.com'],
    mode: 'soft',
    skipDetect: true,
  },
  {
    origins: ['reddit.com', 'www.reddit.com', 'old.reddit.com'],
    mode: 'soft',
    skipDetect: true,
  },
  {
    origins: ['stackoverflow.com', 'www.stackoverflow.com'],
    mode: 'soft',
    skipDetect: true,
  },
  {
    origins: ['notion.so', 'www.notion.so'],
    mode: 'auto',
    skipDetect: false,
  },
  {
    origins: ['linear.app'],
    mode: 'soft',
    skipDetect: true,
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
