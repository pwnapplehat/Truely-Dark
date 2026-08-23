import { describe, expect, it } from 'vitest';
import { detectFromAuthoredSignals, analyzeRegionalLuminances } from '../src/lib/detect';
import { DEFAULT_SETTINGS } from '../src/lib/defaults';
import { findSitePack } from '../src/lib/site-packs';
import { isConfigurableWebPage } from '../src/lib/restricted-hosts';
import { makeDetection, resolveEffectiveSettings } from '../src/lib/resolver';

interface SiteCase {
  hostname: string;
  origin: string;
  name?: string;
  detect?: ReturnType<typeof makeDetection>;
  mode?: 'auto' | 'soft';
  expectActive: boolean;
  expectNative?: boolean;
}

const SITES: SiteCase[] = [
  {
    hostname: 'example.com',
    origin: 'https://example.com',
    detect: makeDetection('light', 'medium'),
    expectActive: true,
  },
  {
    hostname: 'en.wikipedia.org',
    origin: 'https://en.wikipedia.org',
    detect: makeDetection('unknown', 'low'),
    expectActive: true,
  },
  {
    hostname: 'news.ycombinator.com',
    origin: 'https://news.ycombinator.com',
    detect: makeDetection('unknown', 'low'),
    expectActive: true,
  },
  {
    hostname: 'www.reddit.com',
    origin: 'https://www.reddit.com',
    detect: makeDetection('light', 'medium'),
    expectActive: true,
  },
  {
    hostname: 'github.com',
    origin: 'https://github.com',
    detect: makeDetection('light', 'high'),
    expectActive: true,
    name: 'light',
  },
  {
    hostname: 'github.com',
    origin: 'https://github.com',
    detect: makeDetection('dark', 'high'),
    expectActive: false,
    expectNative: true,
    name: 'dark',
  },
  {
    hostname: 'chromewebstore.google.com',
    origin: 'https://chromewebstore.google.com',
    detect: makeDetection('light', 'medium'),
    expectActive: true,
  },
  {
    hostname: 'www.ovhcloud.com',
    origin: 'https://www.ovhcloud.com',
    expectActive: true,
  },
  {
    hostname: 'www.google.com',
    origin: 'https://www.google.com',
    detect: makeDetection('light', 'medium'),
    expectActive: true,
  },
  {
    hostname: 'www.youtube.com',
    origin: 'https://www.youtube.com',
    detect: makeDetection('dark', 'high'),
    expectActive: false,
    expectNative: true,
  },
  {
    hostname: 'docs.google.com',
    origin: 'https://docs.google.com',
    expectActive: true,
  },
  {
    hostname: 'sheets.google.com',
    origin: 'https://sheets.google.com',
    expectActive: true,
  },
  {
    hostname: 'x.ai',
    origin: 'https://x.ai',
    detect: makeDetection('light', 'medium'),
    expectActive: true,
  },
  {
    hostname: 'x.com',
    origin: 'https://x.com',
    detect: makeDetection('light', 'medium'),
    expectActive: true,
  },
  {
    hostname: 'www.linkedin.com',
    origin: 'https://www.linkedin.com',
    detect: makeDetection('light', 'medium'),
    expectActive: true,
  },
  {
    hostname: 'www.amazon.com',
    origin: 'https://www.amazon.com',
    detect: makeDetection('light', 'medium'),
    expectActive: true,
  },
  {
    hostname: 'stackoverflow.com',
    origin: 'https://stackoverflow.com',
    detect: makeDetection('light', 'medium'),
    expectActive: true,
  },
  {
    hostname: 'medium.com',
    origin: 'https://medium.com',
    detect: makeDetection('mixed', 'medium'),
    expectActive: true,
  },
  {
    hostname: 'www.notion.so',
    origin: 'https://www.notion.so',
    detect: makeDetection('unknown', 'low'),
    expectActive: true,
  },
  {
    hostname: 'linear.app',
    origin: 'https://linear.app',
    detect: makeDetection('unknown', 'low'),
    expectActive: true,
  },
];

describe('v1 site coverage — resolver Auto/Soft', () => {
  for (const site of SITES) {
    const label = `${site.hostname}${site.name ? ` ${site.name}` : ''}${site.expectNative ? ' native' : ''}`;
    it(`${label} → active=${site.expectActive}`, () => {
      const result = resolveEffectiveSettings({
        origin: site.origin,
        hostname: site.hostname,
        settings: DEFAULT_SETTINGS,
        detectOutcome: site.detect,
      });
      expect(result.active).toBe(site.expectActive);
      if (site.expectNative) {
        expect(result.nativeDark).toBe(true);
      } else if (site.expectActive) {
        expect(result.nativeDark).toBe(false);
      }
    });
  }
});

describe('v1 site coverage — site packs exist', () => {
  const packedHosts = [
    'chromewebstore.google.com',
    'www.ovhcloud.com',
    'www.google.com',
    'www.youtube.com',
    'docs.google.com',
    'sheets.google.com',
    'github.com',
    'www.reddit.com',
    'x.com',
    'x.ai',
    'www.linkedin.com',
    'www.amazon.com',
    'stackoverflow.com',
    'medium.com',
    'www.notion.so',
    'linear.app',
  ];

  for (const host of packedHosts) {
    it(`findSitePack(${host}) is defined`, () => {
      expect(findSitePack(host)).toBeDefined();
    });
  }
});

describe('v1 detection wiring', () => {
  it('GitHub data-color-mode light/dark/auto', () => {
    expect(detectFromAuthoredSignals({ dataColorMode: 'light' }).result).toBe('light');
    expect(detectFromAuthoredSignals({ dataColorMode: 'dark' }).result).toBe('dark');
    expect(detectFromAuthoredSignals({ dataColorMode: 'auto', prefersDark: false }).result).toBe(
      'light',
    );
  });

  it('mixed regional → Soft path (never native skip)', () => {
    const mixed = analyzeRegionalLuminances([0.9, 0.85, 0.1, 0.12]);
    expect(mixed.result).toBe('mixed');
    const result = resolveEffectiveSettings({
      origin: 'https://www.ovhcloud.com',
      hostname: 'www.ovhcloud.com',
      settings: DEFAULT_SETTINGS,
      detectOutcome: mixed,
    });
    expect(result.active).toBe(true);
    expect(result.nativeDark).toBe(false);
  });

  it('mixed cached outcome applies Soft on Auto', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      detectCache: {
        'https://medium.com': {
          result: 'mixed' as const,
          confidence: 'medium' as const,
          timestamp: Date.now(),
        },
      },
    };
    const result = resolveEffectiveSettings({
      origin: 'https://medium.com',
      hostname: 'medium.com',
      settings,
    });
    expect(result.active).toBe(true);
    expect(result.nativeDark).toBe(false);
  });

  it('chromewebstore is scriptable (not restricted)', () => {
    expect(isConfigurableWebPage('https://chromewebstore.google.com/')).toBe(true);
  });
});
