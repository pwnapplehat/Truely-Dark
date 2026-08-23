import { describe, expect, it } from 'vitest';
import { GALLERY_INJECTION_BLOCKED_LABEL } from '../src/lib/gallery-access';
import { settleGalleryTabBlocked } from '../src/lib/gallery-tab-status';
import {
  getTabSoftApplied,
  isInjectionResolveInFlight,
  markTabNavigation,
} from '../src/lib/tab-injection-state';
import { siteStatusLabel } from '../src/lib/tab-status';
import type { TabInfo } from '../src/types';

const galleryTabSettled = (partial: Partial<TabInfo> = {}): TabInfo => ({
  origin: 'https://chromewebstore.google.com',
  hostname: 'chromewebstore.google.com',
  url: 'https://chromewebstore.google.com/',
  effectiveMode: 'auto',
  resolvedMode: 'soft',
  active: true,
  globalEnabled: true,
  nativeDark: false,
  pageRestricted: false,
  softApplied: false,
  injectionPending: false,
  galleryHost: true,
  galleryInjectionBlocked: true,
  enableOnRestrictedPages: true,
  galleryGestureAttempted: false,
  ...partial,
});

describe('settleGalleryTabBlocked', () => {
  it('clears injection pending state immediately', () => {
    markTabNavigation(42);
    expect(getTabSoftApplied(42)).toBeUndefined();

    settleGalleryTabBlocked(42);
    expect(getTabSoftApplied(42)).toBe(false);
    expect(isInjectionResolveInFlight(42)).toBe(false);
  });
});

describe('gallery TabInfo status', () => {
  it('shows blocked label when settled — never Applying…', () => {
    const tab = galleryTabSettled();
    expect(siteStatusLabel(tab)).toBe(GALLERY_INJECTION_BLOCKED_LABEL);
    expect(siteStatusLabel(tab)).not.toContain('Applying');
  });

  it('pending gallery without blocked flag still shows Applying (regression guard)', () => {
    const pending = galleryTabSettled({
      galleryInjectionBlocked: false,
      injectionPending: true,
    });
    expect(siteStatusLabel(pending)).toBe('Applying dark mode…');
  });
});
