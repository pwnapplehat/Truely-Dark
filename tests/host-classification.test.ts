import { describe, expect, it } from 'vitest';
import {
  hostPrefersForceStylesheet,
  hostUsesAppShellSoft,
  hostUsesForceSoftEngine,
  hostUsesInvertSoft,
  hostUsesMarketingForceShell,
  isOvhManagerHost,
  isOvhMarketingHost,
} from '../src/lib/host-classification';
import { findSitePack, hostPrefersForceStylesheet as packPrefersForce } from '../src/lib/site-packs';

describe('host-classification — OVH Manager vs marketing', () => {
  it('identifies OVH Manager control-panel hosts', () => {
    expect(isOvhManagerHost('manager.ca.ovhcloud.com')).toBe(true);
    expect(isOvhManagerHost('manager.eu.ovhcloud.com')).toBe(true);
    expect(isOvhManagerHost('www.ovhcloud.com')).toBe(false);
    expect(isOvhManagerHost('ovhcloud.com')).toBe(false);
  });

  it('does not apply marketing force shell or preferForce to Manager', () => {
    expect(hostPrefersForceStylesheet('manager.ca.ovhcloud.com')).toBe(false);
    expect(hostUsesMarketingForceShell('manager.ca.ovhcloud.com')).toBe(false);
    expect(packPrefersForce('manager.ca.ovhcloud.com')).toBe(false);
  });

  it('keeps marketing force on www.ovhcloud.com only', () => {
    expect(isOvhMarketingHost('www.ovhcloud.com')).toBe(true);
    expect(isOvhMarketingHost('ovhcloud.com')).toBe(true);
    expect(hostUsesMarketingForceShell('www.ovhcloud.com')).toBe(true);
    expect(hostPrefersForceStylesheet('www.ovhcloud.com')).toBe(true);
  });

  it('does not attach marketing OVH site pack to Manager subdomains', () => {
    expect(findSitePack('manager.ca.ovhcloud.com')).toBeUndefined();
    expect(findSitePack('www.ovhcloud.com')?.customCss).toContain('ods-header-universe');
  });

  it('routes Manager to app-shell Soft instead of invert or force', () => {
    expect(hostUsesAppShellSoft('manager.ca.ovhcloud.com')).toBe(true);
    expect(hostPrefersForceStylesheet('manager.ca.ovhcloud.com')).toBe(false);
    expect(hostUsesForceSoftEngine('manager.ca.ovhcloud.com')).toBe(false);
    expect(hostUsesInvertSoft('manager.ca.ovhcloud.com')).toBe(false);
  });

  it('defaults generic SPAs to force Soft, not invert', () => {
    expect(hostUsesForceSoftEngine('mail.google.com')).toBe(true);
    expect(hostUsesForceSoftEngine('dashboard.marsproxies.com')).toBe(true);
    expect(hostUsesInvertSoft('mail.google.com')).toBe(false);
    expect(hostPrefersForceStylesheet('example.com')).toBe(true);
  });
});
