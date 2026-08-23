import { describe, expect, it } from 'vitest';
import { GALLERY_INJECTION_BLOCKED_LABEL } from '../src/lib/gallery-access';
import { isTruthfulActiveStatus, siteStatusLabel, statusDotClass } from '../src/lib/tab-status';
import type { TabInfo } from '../src/types';

const baseTab = (partial: Partial<TabInfo>): TabInfo => ({
  origin: 'https://example.com',
  hostname: 'example.com',
  url: 'https://example.com',
  effectiveMode: 'auto',
  resolvedMode: 'soft',
  active: true,
  globalEnabled: true,
  nativeDark: false,
  pageRestricted: false,
  softApplied: true,
  injectionPending: false,
  galleryHost: false,
  galleryInjectionBlocked: false,
  enableOnRestrictedPages: false,
  galleryGestureAttempted: false,
  ...partial,
});

describe('siteStatusLabel', () => {
  it('shows restricted message for chrome:// only', () => {
    expect(siteStatusLabel(baseTab({ pageRestricted: true, active: false }))).toContain(
      'Browser blocks',
    );
  });

  it('never claims active without softApplied', () => {
    const pending = baseTab({ injectionPending: true });
    expect(siteStatusLabel(pending)).toBe('Applying dark mode…');
    expect(isTruthfulActiveStatus(pending)).toBe(false);

    const failed = baseTab({ softApplied: false, injectionPending: false });
    expect(siteStatusLabel(failed)).toContain('could not apply');
    expect(isTruthfulActiveStatus(failed)).toBe(false);
  });

  it('shows Soft vs On labels', () => {
    expect(
      siteStatusLabel(baseTab({ effectiveMode: 'soft', resolvedMode: 'soft', softApplied: true })),
    ).toContain('(Soft)');
    expect(
      siteStatusLabel(baseTab({ effectiveMode: 'on', resolvedMode: 'on', softApplied: true })),
    ).toContain('(On)');
  });

  it('shows Auto label when effective mode is auto', () => {
    expect(
      siteStatusLabel(
        baseTab({ effectiveMode: 'auto', resolvedMode: 'soft', softApplied: true }),
      ),
    ).toBe('Extension dark mode active (Auto)');
  });

  it('shows native skip', () => {
    expect(
      siteStatusLabel(baseTab({ active: false, nativeDark: true, softApplied: false })),
    ).toContain('Natively dark');
  });

  it('shows Chrome blocks message on gallery when injection failed', () => {
    expect(
      siteStatusLabel(
        baseTab({
          hostname: 'chromewebstore.google.com',
          galleryHost: true,
          galleryInjectionBlocked: true,
          softApplied: false,
        }),
      ),
    ).toBe(GALLERY_INJECTION_BLOCKED_LABEL);
    expect(
      isTruthfulActiveStatus(
        baseTab({
          galleryHost: true,
          galleryInjectionBlocked: true,
          softApplied: false,
        }),
      ),
    ).toBe(false);
  });
});

describe('statusDotClass', () => {
  it('uses active dot only when softApplied', () => {
    expect(statusDotClass(baseTab({ softApplied: true }))).toBe('popup-status-dot--active');
    expect(statusDotClass(baseTab({ softApplied: false }))).toBe('popup-status-dot--inactive');
  });
});
