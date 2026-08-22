import type {
  DetectConfidence,
  DetectResult,
  DetectionOutcome,
  EffectiveSiteSettings,
  SiteMode,
  TruelyDarkSettings,
} from '../types';
import { DETECT_CACHE_TTL_MS, NATIVE_DARK_CONFIDENCE } from '../types';
import { isDetectCacheValid, shouldSkipForNativeDark } from './detect';
import { PRESETS } from './defaults';
import { findSitePack } from './site-packs';
import { shouldScheduleEnable } from './schedule';

export interface ResolveContext {
  origin: string;
  hostname: string;
  settings: TruelyDarkSettings;
  detectOutcome?: DetectionOutcome;
  systemDark?: boolean;
}

function inactiveSettings(
  partial: Pick<
    EffectiveSiteSettings,
    'brightness' | 'contrast' | 'sepia' | 'preserveMedia' | 'backgroundColor' | 'sitePack'
  > & { mode: SiteMode },
): EffectiveSiteSettings {
  return {
    active: false,
    skipProcessing: true,
    nativeDark: false,
    ...partial,
  };
}

function activeSettings(
  partial: Pick<
    EffectiveSiteSettings,
    'mode' | 'brightness' | 'contrast' | 'sepia' | 'preserveMedia' | 'backgroundColor' | 'sitePack'
  > & { nativeDark?: boolean; skipProcessing?: boolean },
): EffectiveSiteSettings {
  return {
    active: true,
    skipProcessing: partial.skipProcessing ?? false,
    nativeDark: partial.nativeDark ?? false,
    mode: partial.mode,
    brightness: partial.brightness,
    contrast: partial.contrast,
    sepia: partial.sepia,
    preserveMedia: partial.preserveMedia,
    backgroundColor: partial.backgroundColor,
    sitePack: partial.sitePack,
  };
}

/**
 * Get the configured site mode for an origin (override or default).
 */
export function getSiteMode(settings: TruelyDarkSettings, origin: string): SiteMode {
  const override = settings.siteOverrides[origin];
  if (override) return override.mode;
  return settings.defaultMode;
}

function resolvePreserveMedia(
  settings: TruelyDarkSettings,
  sitePack: ReturnType<typeof findSitePack>,
  override: TruelyDarkSettings['siteOverrides'][string] | undefined,
): boolean {
  if (override?.preserveMedia !== undefined) return override.preserveMedia;
  if (sitePack?.preserveMedia !== undefined) return sitePack.preserveMedia;
  return settings.preserveMedia;
}

function getDetectionOutcome(
  ctx: ResolveContext,
): DetectionOutcome {
  const { origin, settings, detectOutcome } = ctx;

  if (detectOutcome) return detectOutcome;

  const cached = settings.detectCache[origin];
  if (cached && isDetectCacheValid(cached.timestamp, DETECT_CACHE_TTL_MS)) {
    return { result: cached.result, confidence: cached.confidence };
  }

  return { result: 'unknown', confidence: 'low' };
}

/**
 * Native-first: skip Soft when already-dark with high confidence.
 */
export function isNativeDarkSkip(outcome: DetectionOutcome): boolean {
  if (outcome.result !== 'dark') return false;
  return outcome.confidence === NATIVE_DARK_CONFIDENCE || shouldSkipForNativeDark(outcome);
}

/**
 * Resolve whether dark mode should be active for a given site.
 */
export function resolveEffectiveSettings(ctx: ResolveContext): EffectiveSiteSettings {
  const { origin, hostname, settings, systemDark = false } = ctx;
  const sitePack = findSitePack(hostname);
  const override = settings.siteOverrides[origin];

  const brightness = override?.brightness ?? settings.brightness;
  const contrast = override?.contrast ?? settings.contrast;
  const sepia = override?.sepia ?? settings.sepia;
  const preserveMedia = resolvePreserveMedia(settings, sitePack, override);

  const preset = PRESETS[settings.preset === 'custom' ? 'midnight' : settings.preset];
  const backgroundColor = preset.backgroundColor;

  const base = { brightness, contrast, sepia, preserveMedia, backgroundColor, sitePack };

  const scheduleActive = shouldScheduleEnable(settings.schedule, systemDark);
  const globalEnabled = settings.enabled && scheduleActive;

  if (!globalEnabled) {
    return inactiveSettings({ ...base, mode: 'off' });
  }

  const mode = getSiteMode(settings, origin);

  // Excluded origins — zero processing cost
  if (mode === 'off' || sitePack?.mode === 'off') {
    return inactiveSettings({ ...base, mode: 'off' });
  }

  if (mode === 'on' || sitePack?.mode === 'on') {
    return activeSettings({ ...base, mode: 'on' });
  }

  if (mode === 'soft' || sitePack?.mode === 'soft') {
    return activeSettings({ ...base, mode: 'soft' });
  }

  // Auto mode — native-first detection
  if (sitePack?.skipDetect) {
    const packMode: SiteMode = sitePack.mode === 'auto' ? 'soft' : sitePack.mode;
    return activeSettings({ ...base, mode: packMode });
  }

  const detection = getDetectionOutcome(ctx);

  if (isNativeDarkSkip(detection)) {
    return {
      ...inactiveSettings({ ...base, mode: 'auto' }),
      skipProcessing: true,
      nativeDark: true,
    };
  }

  // Medium-confidence or unknown → apply Soft (never skip on luminance-only dark)
  const resolvedMode: SiteMode = settings.batterySaver ? 'soft' : 'soft';
  return activeSettings({ ...base, mode: resolvedMode });
}

/**
 * Cycle through site modes: auto → soft → on → off → auto.
 */
export function cycleSiteMode(current: SiteMode): SiteMode {
  const order: SiteMode[] = ['auto', 'soft', 'on', 'off'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length] ?? 'auto';
}

/**
 * Export detection outcome type helpers for tests.
 */
export function makeDetection(
  result: DetectResult,
  confidence: DetectConfidence,
): DetectionOutcome {
  return { result, confidence };
}
