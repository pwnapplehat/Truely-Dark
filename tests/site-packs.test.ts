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
  it('matches chromewebstore.google.com with force-first Soft', () => {
    const pack = findSitePack('chromewebstore.google.com');
    expect(pack?.origins).toContain('chromewebstore.google.com');
    expect(pack?.preferForceStylesheet).toBe(true);
    expect(pack?.customCss).toContain('--truely-dark-bg');
  });

  it('OVH force pack uses targeted surfaces without universal * paint', () => {
    const pack = findSitePack('www.ovhcloud.com');
    expect(pack?.mode).toBe('soft');
    expect(pack?.preferForceStylesheet).toBe(true);
    expect(hostPrefersForceStylesheet('www.ovhcloud.com')).toBe(true);
    const css = pack?.customCss ?? '';
    expect(css).toContain('data-truely-dark-force');
    expect(css).not.toContain('#ffffff');
    expect(css).not.toMatch(/\*:not\(img\)/);
    expect(css).toContain('ods-header-universe');
    expect(css).toContain('menu-navbar');
    expect(css).toContain('display: none');
    expect(css).toContain('redirection-banners');
  });

  it('apple.com uses preferForce Soft with promo tile surfaces', () => {
    const pack = findSitePack('www.apple.com');
    expect(pack?.preferForceStylesheet).toBe(true);
    expect(pack?.customCss).toContain('promo');
    expect(pack?.customCss).toContain('filter: none');
  });

  it('wikipedia.org has invert-safe counter-invert footer supplement', () => {
    const pack = findSitePack('en.wikipedia.org');
    const css = pack?.invertOnlyCustomCss ?? '';
    expect(css).toContain('navbox');
    expect(css).toContain('hue-rotate(180deg)');
    expect(css).toContain('#footer');
  });

  it('OVH force pack darkens domain-search and partner strips', () => {
    const pack = findSitePack('www.ovhcloud.com');
    const css = pack?.customCss ?? '';
    expect(css).toContain('ods-domain-form__tld');
    expect(css).toContain('odss-section--light-blue');
    expect(css).toContain('ods-footer');
    expect(css).toContain('ods-bottomfooter');
    expect(css).not.toContain('[class*="copyright"]');
    expect(css).not.toContain('footer-column');
    expect(css).toContain('min-height: auto');
    expect(css).toContain('overflow: visible');
    expect(css).toContain('contain: none');
    expect(css).toContain('content-visibility: visible');
  });

  it('apple.com darkens top donation/ribbon strip', () => {
    const pack = findSitePack('www.apple.com');
    expect(pack?.customCss).toMatch(/donation|ribbon|ac-ls/i);
  });

  it('x.ai force pack darkens sticky compare header row', () => {
    const pack = findSitePack('x.ai');
    expect(pack?.customCss).toContain('compare');
    expect(pack?.customCss).toContain('sticky');
    expect(pack?.customCss).toContain('sticky-section-header');
    expect(pack?.customCss).toContain('mix-blend-mode: normal');
    expect(pack?.customCss).toContain('backdrop-filter: none');
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
