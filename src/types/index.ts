export type SiteMode = 'auto' | 'soft' | 'on' | 'off';

export type PresetId = 'midnight' | 'oled' | 'paper-night' | 'high-contrast' | 'custom';

export type DetectResult = 'dark' | 'light' | 'mixed' | 'unknown';

export type DetectConfidence = 'high' | 'medium' | 'low';

export interface DetectionOutcome {
  result: DetectResult;
  confidence: DetectConfidence;
}

/** Content-script response for popup live Auto status. */
export interface LiveDetectResponse {
  outcome: DetectionOutcome;
  /** True when content has settled on native-dark skip this navigation. */
  contentNativeDark?: boolean;
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
  /** Try optional injection attempts on Chrome Web Store gallery pages. */
  enableOnRestrictedPages: boolean;
  preset: PresetId;
  schedule: ScheduleSettings;
  siteOverrides: Record<string, SiteOverride>;
  detectCache: Record<string, DetectCacheEntry>;
}

export interface SitePack {
  origins: string[];
  /** Match origins exactly only — subdomains like manager.* do not inherit this pack. */
  exactOriginsOnly?: boolean;
  mode: SiteMode;
  invertSelectors?: string[];
  ignoreImages?: boolean;
  /** Override global preserveMedia for this site (e.g. false for canvas-heavy apps). */
  preserveMedia?: boolean;
  customCss?: string;
  skipDetect?: boolean;
  /** Skip all content-script work when mode is off (performance). */
  excludeFromProcessing?: boolean;
  /**
   * Use chrome.scripting.insertCSS from the background when page CSP blocks
   * content-script styles (e.g. Chrome Web Store).
   */
  injectCssFallback?: boolean;
  /** Background captureVisibleTab must confirm darkening before softApplied. */
  requiresVisualVerify?: boolean;
  /** Allow direct dark stylesheet when invert filter path fails visually. */
  forceStylesheetFallback?: boolean;
  /**
   * Marketing / hero-heavy sites: use direct dark stylesheet as primary Soft engine (no invert).
   */
  preferForceStylesheet?: boolean;
  /**
   * CSS for invert Soft only (light pre-bg under filter). Never applied on force path
   * or preferForceStylesheet hosts — prevents #ffffff invert leaks on marketing sites.
   */
  invertOnlyCustomCss?: string;
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
  | 'DETECT_RESULT'
  | 'INJECTION_STATUS'
  | 'INSERT_CSS_FALLBACK'
  | 'REMOVE_INSERT_CSS'
  | 'GESTURE_ACTIVATE_SOFT'
  | 'APPLY_MAIN_WORLD_FORCE'
  | 'INSERT_INVERT_SUPPLEMENT'
  | 'GET_LIVE_DETECT';

export interface TruelyDarkMessage {
  type: MessageType;
  payload?: unknown;
}

export interface TabInfo {
  origin: string;
  hostname: string;
  url: string;
  /** User-configured mode (override or default). */
  effectiveMode: SiteMode;
  /** Mode actually applied by the extension (soft / on / auto / off). */
  resolvedMode: SiteMode;
  active: boolean;
  globalEnabled: boolean;
  nativeDark: boolean;
  /** chrome://, about:, etc. — content scripts cannot run. */
  pageRestricted: boolean;
  /** Whether invert filter is visibly applied (from content script verification). */
  softApplied: boolean;
  /** Content script has not yet reported injection status this navigation. */
  injectionPending: boolean;
  /** chromewebstore.google.com / chrome.google.com gallery — Chromium blocks injection. */
  galleryHost: boolean;
  /** Gallery active but injection failed — show browser-blocked status (not Soft active). */
  galleryInjectionBlocked: boolean;
  /** User enabled optional gallery injection attempts in Options. */
  enableOnRestrictedPages: boolean;
  /** Gallery gesture attempted this navigation (diagnostics only). */
  galleryGestureAttempted: boolean;
}

export const STORAGE_KEY = 'truely_dark_settings_v2';

/** Previous storage key — migrated once with detect cache cleared. */
export const LEGACY_STORAGE_KEY = 'truely_dark_settings_v1';

export const DETECT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Confidence threshold for native-first skip (no Soft applied). */
export const NATIVE_DARK_CONFIDENCE: DetectConfidence = 'high';
