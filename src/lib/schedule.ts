import type { TruelyDarkSettings } from '../types';

/**
 * Parse HH:MM time string to minutes since midnight.
 */
export function parseTimeToMinutes(time: string): number {
  const [hoursPart, minutesPart] = time.split(':');
  const hours = Number(hoursPart ?? 0);
  const minutes = Number(minutesPart ?? 0);
  return hours * 60 + minutes;
}

/**
 * Check if current time falls within a schedule range.
 * Handles overnight ranges (e.g. 20:00 – 07:00).
 */
export function isWithinSchedule(
  start: string,
  end: string,
  now = new Date(),
): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Overnight range
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

/**
 * Check system prefers-color-scheme: dark via matchMedia.
 */
export function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Determine if dark mode should be active based on schedule settings.
 * For background SW, system preference check uses a fallback.
 */
export function shouldScheduleEnable(
  schedule: TruelyDarkSettings['schedule'],
  systemDark = false,
): boolean {
  if (!schedule.enabled) return true;

  if (schedule.followSystem) {
    return systemDark;
  }

  return isWithinSchedule(schedule.start, schedule.end);
}

/**
 * Async version for background script — reads system preference from an active tab.
 */
export async function getSystemDarkPreference(): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  } catch {
    // Service worker has no window
  }

  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id && tab.url && /^https?:/i.test(tab.url)) {
      const results = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.matchMedia('(prefers-color-scheme: dark)').matches,
      });
      const value = results[0]?.result;
      if (typeof value === 'boolean') return value;
    }
  } catch {
    // Tab may not allow scripting
  }

  return false;
}
