import { describe, expect, it } from 'vitest';
import {
  findSitePack,
  getHostnameFromUrl,
  getOriginFromUrl,
  hostPrefersForceStylesheet,
  hostRequiresMarketingVisualVerify,
  isExcludedOrigin,
  SITE_PACKS,
} from '../src/lib/site-packs';

describe('findSitePack', () => {
  it('matches chromewebstore.google.com', () => {
    const pack = findSitePack('chromewebstore.google.com');
    expect(pack?.origins).toContain('chromewebstore.google.com');
  });

  it('registers ovhcloud force pack without invert white pre-bg', () => {
    const pack = findSitePack('www.ovhcloud.com');
    expect(pack?.mode).toBe('soft');
    expect(pack?.skipDetect).toBe(true);
    expect(pack?.preferForceStylesheet).toBe(true);
    expect(hostPrefersForceStylesheet('www.ovhcloud.com')).toBe(true);
    expect(hostRequiresMarketingVisualVerify('www.ovhcloud.com')).toBe(true);
    expect(pack?.customCss ?? '').not.toContain('#ffffff');
    expect(pack?.invertOnlyCustomCss ?? '').not.toContain('#ffffff');
  });

  it('matches x.ai with force-first Soft and marketing visual verify', () => {
    const pack = findSitePack('x.ai');
    expect(pack?.preferForceStylesheet).toBe(true);
    expect(hostRequiresMarketingVisualVerify('www.x.ai')).toBe(true);
  });

  it('matches google.com search', () => {
    const pack = findSitePack('www.google.com');
    expect(pack?.origins).toContain('google.com');
  });

  it('matches amazon and linkedin', () => {
    expect(findSitePack('www.amazon.com')?.origins).toContain('amazon.com');
    expect(findSitePack('www.linkedin.com')?.origins).toContain('linkedin.com');
  });

  it('returns undefined for unknown hosts', () => {
    expect(findSitePack('example.com')).toBeUndefined();
  });
});

describe('URL helpers', () => {
  it('extracts origin and hostname', () => {
    expect(getOriginFromUrl('https://www.reddit.com/r/test')).toBe('https://www.reddit.com');
    expect(getHostnameFromUrl('https://www.reddit.com/r/test')).toBe('www.reddit.com');
  });
});

describe('isExcludedOrigin', () => {
  it('excludes when site mode is off', () => {
    expect(isExcludedOrigin('example.com', 'off')).toBe(true);
  });

  it('does not exclude auto sites', () => {
    expect(isExcludedOrigin('github.com', 'auto')).toBe(false);
  });
});

describe('SITE_PACKS coverage', () => {
  it('includes major production targets', () => {
    const allOrigins = SITE_PACKS.flatMap((p) => p.origins);
    expect(allOrigins).toContain('chromewebstore.google.com');
    expect(allOrigins).toContain('ovhcloud.com');
    expect(allOrigins).toContain('x.ai');
    expect(allOrigins).toContain('youtube.com');
    expect(allOrigins).toContain('reddit.com');
    expect(allOrigins).toContain('github.com');
    expect(allOrigins).toContain('medium.com');
  });
});
