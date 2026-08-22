import type {
  DetectResult,
  EffectiveSiteSettings,
  SiteMode,
  TruelyDarkSettings,
} from '../types';
import { DETECT_CACHE_TTL_MS } from '../types';
import { isDetectCacheValid } from './detect';
import { PRESETS } from './defaults';
import { findSitePack } from './site-packs';
import { shouldScheduleEnable } from './schedule';

export interface ResolveContext {
  origin: string;
  hostname: string;
  settings: TruelyDarkSettings;
  detectResult?: DetectResult;
  systemDark?: boolean;
}

/**
 * Get the configured site mode for an origin (override or default).
 */
export function getSiteMode(settings: TruelyDarkSettings, origin: string): SiteMode {
  const override = settings.siteOverrides[origin];
  if (override) return override.mode;
  return settings.defaultMode;
}

/**
 * Resolve whether dark mode should be active for a given site.
 */
export function resolveEffectiveSettings(ctx: ResolveContext): EffectiveSiteSettings {
  const { origin, hostname, settings, detectResult, systemDark = false } = ctx;
  const sitePack = findSitePack(hostname);
  const override = settings.siteOverrides[origin];

  const brightness = override?.brightness ?? settings.brightness;
  const contrast = override?.contrast ?? settings.contrast;
  const sepia = override?.sepia ?? settings.sepia;
  const preserveMedia = override?.preserveMedia ?? settings.preserveMedia;

  const preset = PRESETS[settings.preset === 'custom' ? 'midnight' : settings.preset];
  const backgroundColor = preset.backgroundColor;

  const scheduleActive = shouldScheduleEnable(settings.schedule, systemDark);
  const globalEnabled = settings.enabled && scheduleActive;

  if (!globalEnabled) {
    return {
      active: false,
      mode: 'off',
      brightness,
      contrast,
      sepia,
      preserveMedia,
      backgroundColor,
      sitePack,
    };
  }

  const mode = getSiteMode(settings, origin);

  if (mode === 'off') {
    return {
      active: false,
      mode: 'off',
      brightness,
      contrast,
      sepia,
      preserveMedia,
      backgroundColor,
      sitePack,
    };
  }

  if (sitePack?.mode === 'off') {
    return {
      active: false,
      mode: 'off',
      brightness,
      contrast,
      sepia,
      preserveMedia,
      backgroundColor,
      sitePack,
    };
  }

  if (mode === 'on' || sitePack?.mode === 'on') {
    return {
      active: true,
      mode: 'on',
      brightness,
      contrast,
      sepia,
      preserveMedia,
      backgroundColor,
      sitePack,
    };
  }

  if (mode === 'soft' || sitePack?.mode === 'soft') {
    return {
      active: true,
      mode: 'soft',
      brightness,
      contrast,
      sepia,
      preserveMedia,
      backgroundColor,
      sitePack,
    };
  }

  // Auto mode — use detection
  if (sitePack?.skipDetect) {
    const packMode: SiteMode = sitePack.mode === 'auto' ? 'soft' : sitePack.mode;
    return {
      active: true,
      mode: packMode,
      brightness,
      contrast,
      sepia,
      preserveMedia,
      backgroundColor,
      sitePack,
    };
  }

  const cached = settings.detectCache[origin];
  const cachedResult =
    cached && isDetectCacheValid(cached.timestamp, DETECT_CACHE_TTL_MS)
      ? cached.result
      : undefined;

  const detection = detectResult ?? cachedResult ?? 'unknown';

  if (detection === 'dark') {
    return {
      active: false,
      mode: 'auto',
      brightness,
      contrast,
      sepia,
      preserveMedia,
      backgroundColor,
      sitePack,
    };
  }

  return {
    active: true,
    mode: 'soft',
    brightness,
    contrast,
    sepia,
    preserveMedia,
    backgroundColor,
    sitePack,
  };
}

/**
 * Cycle through site modes: auto → soft → on → off → auto.
 */
export function cycleSiteMode(current: SiteMode): SiteMode {
  const order: SiteMode[] = ['auto', 'soft', 'on', 'off'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length] ?? 'auto';
}
