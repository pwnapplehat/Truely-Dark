export type SiteMode = 'auto' | 'soft' | 'on' | 'off';

export type PresetId = 'midnight' | 'oled' | 'paper-night' | 'high-contrast' | 'custom';

export type DetectResult = 'dark' | 'light' | 'unknown';

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

export interface TruelyDarkSettings {
  enabled: boolean;
  defaultMode: SiteMode;
  brightness: number;
  contrast: number;
  sepia: number;
  preserveMedia: boolean;
  preset: PresetId;
  schedule: ScheduleSettings;
  siteOverrides: Record<string, SiteOverride>;
  detectCache: Record<string, { result: DetectResult; timestamp: number }>;
}

export interface SitePack {
  origins: string[];
  mode: SiteMode;
  invertSelectors?: string[];
  ignoreImages?: boolean;
  customCss?: string;
  skipDetect?: boolean;
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
}

export const STORAGE_KEY = 'truely_dark_settings_v1';

export const DETECT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
