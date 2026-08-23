import { isChromeGalleryHost } from './gallery-access';
import type { TabInfo } from '../types';

/**
 * Human-readable popup status for the active tab.
 */
export function siteStatusLabel(tabInfo: TabInfo): string {
  if (tabInfo.pageRestricted) {
    return 'Browser blocks dark mode on this page';
  }
  if (tabInfo.nativeDark) {
    return 'Natively dark — Truely Dark skipped';
  }
  if (tabInfo.injectionPending) {
    if (tabInfo.galleryHost) {
      return 'Applying dark mode… (Chrome Web Store may need icon click)';
    }
    return 'Applying dark mode…';
  }
  if (tabInfo.active && !tabInfo.softApplied && tabInfo.needsGalleryGesture) {
    return 'Click Truely Dark icon on this tab to darken Chrome Web Store';
  }
  if (tabInfo.active && !tabInfo.softApplied) {
    return 'Soft enabled — filter could not apply on this page';
  }
  if (tabInfo.active && tabInfo.softApplied) {
    if (tabInfo.effectiveMode === 'auto') {
      return 'Extension dark mode active (Auto)';
    }
    if (tabInfo.resolvedMode === 'on' || tabInfo.effectiveMode === 'on') {
      return 'Extension dark mode active (On)';
    }
    return 'Extension dark mode active (Soft)';
  }
  return 'Dark mode off on this site';
}

export function statusDotClass(tabInfo: TabInfo): string {
  if (tabInfo.pageRestricted || tabInfo.nativeDark) {
    return 'popup-status-dot--native';
  }
  if (tabInfo.injectionPending) {
    return 'popup-status-dot--inactive';
  }
  if (tabInfo.active && tabInfo.softApplied) {
    return 'popup-status-dot--active';
  }
  if (tabInfo.active && !tabInfo.softApplied) {
    return 'popup-status-dot--inactive';
  }
  return 'popup-status-dot--inactive';
}

/**
 * True when popup may claim Soft/On is visibly active.
 */
export function isTruthfulActiveStatus(tabInfo: TabInfo): boolean {
  if (!tabInfo.active || tabInfo.pageRestricted || tabInfo.nativeDark) return false;
  if (tabInfo.injectionPending) return false;
  return tabInfo.softApplied;
}
