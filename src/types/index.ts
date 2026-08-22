export type SiteMode = 'auto' | 'soft' | 'on' | 'off';

export type PresetId = 'midnight' | 'oled' | 'paper-night' | 'high-contrast' | 'custom';

export type DetectResult = 'dark' | 'light' | 'unknown';

export type DetectConfidence = 'high' | 'medium' | 'low';

export interface DetectionOutcome {
  result: DetectResult;
  confidence: DetectConfidence;
}

export interface SiteOverride {
  mode: SiteMode;
  brightness?: number;
  contrast?: number;
  sepia?: number;
  preserveMedia?: boolean;
  addedAt: number;
}

export interface ScheduleSettings {
  enabled: boolean;
  start: string;
  end: string;
  followSystem: boolean;
}

export interface DetectCacheEntry {
  result: DetectResult;
  confidence: DetectConfidence;
  timestamp: number;
}

export interface TruelyDarkSettings {
  enabled: boolean;
  defaultMode: SiteMode;
  brightness: number;
  contrast: number;
  sepia: number;
  preserveMedia: boolean;
  batterySaver: boolean;
  preset: PresetId;
  schedule: ScheduleSettings;
  siteOverrides: Record<string, SiteOverride>;
  detectCache: Record<string, DetectCacheEntry>;
}

export interface SitePack {
  origins: string[];
  mode: SiteMode;
  invertSelectors?: string[];
  ignoreImages?: boolean;
  /** Override global preserveMedia for this site (e.g. false for canvas-heavy apps). */
  preserveMedia?: boolean;
  customCss?: string;
  skipDetect?: boolean;
  /** Skip all content-script work when mode is off (performance). */
  excludeFromProcessing?: boolean;
}

export interface EffectiveSiteSettings {
  active: boolean;
  mode: SiteMode;
  brightness: number;
  contrast: number;
  sepia: number;
  preserveMedia: boolean;
  backgroundColor: string;
  sitePack?: SitePack;
  skipProcessing: boolean;
  nativeDark: boolean;
}

export type MessageType =
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'TOGGLE_GLOBAL'
  | 'TOGGLE_SITE'
  | 'GET_EFFECTIVE_SETTINGS'
  | 'SET_SITE_MODE'
  | 'APPLY_PRESET'
  | 'EXPORT_SETTINGS'
  | 'IMPORT_SETTINGS'
  | 'GET_TAB_INFO'
  | 'SETTINGS_CHANGED'
  | 'DETECT_RESULT';

export interface TruelyDarkMessage {
  type: MessageType;
  payload?: unknown;
}

export interface TabInfo {
  origin: string;
  hostname: string;
  url: string;
  effectiveMode: SiteMode;
  active: boolean;
  globalEnabled: boolean;
  nativeDark: boolean;
}

export const STORAGE_KEY = 'truely_dark_settings_v1';

export const DETECT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Confidence threshold for native-first skip (no Soft applied). */
export const NATIVE_DARK_CONFIDENCE: DetectConfidence = 'high';
