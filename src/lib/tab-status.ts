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
    return 'Applying dark mode…';
  }
  if (tabInfo.active && !tabInfo.softApplied) {
    return 'Soft enabled — filter could not apply on this page';
  }
  if (tabInfo.active && tabInfo.resolvedMode === 'on') {
    return 'Extension dark mode active (On)';
  }
  if (tabInfo.active) {
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
