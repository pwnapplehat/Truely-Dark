import type { DetectConfidence, DetectResult, DetectionOutcome } from '../types';

const DARK_LUMINANCE_THRESHOLD = 0.35;
const COLORFUL_VARIANCE_THRESHOLD = 0.08;

/** Truely Dark preload paints this — must not count as site-native dark. */
export const EXTENSION_PRELOAD_BG = '#121212';

export const EXTENSION_MARKERS = {
  preloadStyleId: 'truely-dark-preload',
  styleId: 'truely-dark-styles',
  rootAttr: 'data-truely-dark-active',
} as const;

export interface AuthoredSignalInput {
  dataTheme?: string;
  dataColorMode?: string;
  metaColorScheme?: string;
  /** Resolve data-color-mode="auto" and dual meta schemes. */
  prefersDark?: boolean;
}

/**
 * Compute relative luminance from an RGB color (0–1 range per channel).
 */
export function computeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number): number =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const rs = toLinear(r);
  const gs = toLinear(g);
  const bs = toLinear(b);
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Parse a CSS color string to RGB values (0–255).
 */
export function parseColor(color: string): { r: number; g: number; b: number } | null {
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
    return null;
  }

  const hexMatch = color.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch?.[1]) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      const [r, g, b] = hex.split('');
      if (!r || !g || !b) return null;
      return {
        r: parseInt(r + r, 16),
        g: parseInt(g + g, 16),
        b: parseInt(b + b, 16),
      };
    }
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  const rgbMatch = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (rgbMatch?.[1] && rgbMatch[2] && rgbMatch[3]) {
    return {
      r: parseFloat(rgbMatch[1]),
      g: parseFloat(rgbMatch[2]),
      b: parseFloat(rgbMatch[3]),
    };
  }

  return null;
}

/**
 * True when a computed background matches Truely Dark FOUC preload (#121212).
 */
export function isExtensionInjectedBackground(color: string | undefined): boolean {
  if (!color) return false;
  const rgb = parseColor(color);
  if (!rgb) return false;
  return rgb.r <= 20 && rgb.g <= 20 && rgb.b <= 20;
}

/**
 * Resolve explicit theme mode tokens (light / dark / auto).
 * GitHub uses data-color-mode as source of truth — never infer dark from
 * presence of data-dark-theme attribute when mode is light or auto+system-light.
 */
export function resolveExplicitThemeMode(
  value: string | undefined,
  prefersDark?: boolean,
): DetectionOutcome | null {
  if (!value) return null;
  const lower = value.toLowerCase().trim();

  if (lower === 'light' || lower === 'day' || lower === 'bright' || lower === 'white') {
    return { result: 'light', confidence: 'high' };
  }
  if (lower === 'dark' || lower === 'night' || lower === 'dim' || lower === 'black') {
    return { result: 'dark', confidence: 'high' };
  }
  if (lower === 'auto') {
    if (prefersDark !== undefined) {
      return { result: prefersDark ? 'dark' : 'light', confidence: 'high' };
    }
    return { result: 'unknown', confidence: 'low' };
  }

  return null;
}

/**
 * Resolve meta color-scheme content.
 */
export function resolveMetaColorScheme(
  value: string | undefined,
  prefersDark?: boolean,
): DetectionOutcome | null {
  if (!value) return null;
  const lower = value.toLowerCase().trim();

  if (lower === 'dark') return { result: 'dark', confidence: 'high' };
  if (lower === 'light') return { result: 'light', confidence: 'high' };

  if (lower.includes('light') && lower.includes('dark')) {
    if (prefersDark !== undefined) {
      return { result: prefersDark ? 'dark' : 'light', confidence: 'high' };
    }
    return { result: 'unknown', confidence: 'low' };
  }

  if (lower.includes('dark')) return { result: 'dark', confidence: 'high' };
  if (lower.includes('light')) return { result: 'light', confidence: 'high' };

  return null;
}

/**
 * Site-authored theme signals only (DOM attributes + meta tags).
 * Both light and dark short-circuit — never fall through to class heuristics.
 */
export function detectFromAuthoredSignals(signals: AuthoredSignalInput): DetectionOutcome {
  const colorMode = resolveExplicitThemeMode(signals.dataColorMode, signals.prefersDark);
  if (colorMode) return colorMode;

  const dataTheme = resolveExplicitThemeMode(signals.dataTheme, signals.prefersDark);
  if (dataTheme) return dataTheme;

  const meta = resolveMetaColorScheme(signals.metaColorScheme, signals.prefersDark);
  if (meta) return meta;

  return { result: 'unknown', confidence: 'low' };
}

/**
 * Determine theme from signal bundle. Ignores computed color-scheme and dark
 * backgrounds that match Truely Dark preload (FOUC poison).
 */
export function detectFromSignals(signals: {
  colorScheme?: string;
  dataTheme?: string;
  dataColorMode?: string;
  bodyBackground?: string;
  htmlBackground?: string;
  metaColorScheme?: string;
  prefersDark?: boolean;
}): DetectionOutcome {
  const authored = detectFromAuthoredSignals({
    dataTheme: signals.dataTheme,
    dataColorMode: signals.dataColorMode,
    metaColorScheme: signals.metaColorScheme,
    prefersDark: signals.prefersDark,
  });
  if (authored.result !== 'unknown') return authored;

  const backgrounds = [signals.bodyBackground, signals.htmlBackground];
  for (const bg of backgrounds) {
    if (!bg || isExtensionInjectedBackground(bg)) continue;
    const rgb = parseColor(bg);
    if (!rgb) continue;
    const lum = computeLuminance(rgb.r / 255, rgb.g / 255, rgb.b / 255);
    if (lum > 0.75) {
      return { result: 'light', confidence: 'medium' };
    }
  }

  return { result: 'unknown', confidence: 'low' };
}

/**
 * Sample backdrop colors from canvas pixel data (for colorful detection).
 */
export function analyzeBackdropSamples(
  samples: Array<{ r: number; g: number; b: number }>,
): { luminance: number; variance: number } {
  if (samples.length === 0) {
    return { luminance: 1, variance: 0 };
  }

  let totalLum = 0;
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];

  for (const { r, g, b } of samples) {
    const lum = computeLuminance(r / 255, g / 255, b / 255);
    totalLum += lum;
    rs.push(r);
    gs.push(g);
    bs.push(b);
  }

  const avgLum = totalLum / samples.length;
  const avgR = rs.reduce((a, v) => a + v, 0) / rs.length;
  const avgG = gs.reduce((a, v) => a + v, 0) / gs.length;
  const avgB = bs.reduce((a, v) => a + v, 0) / bs.length;

  let variance = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    if (!sample) continue;
    const dr = sample.r - avgR;
    const dg = sample.g - avgG;
    const db = sample.b - avgB;
    variance += (dr * dr + dg * dg + db * db) / (255 * 255);
  }
  variance /= samples.length;

  return { luminance: avgLum, variance };
}

/**
 * Full detection combining authored signals and optional backdrop samples.
 */
export function detectPageTheme(
  signals: {
    colorScheme?: string;
    dataTheme?: string;
    dataColorMode?: string;
    bodyBackground?: string;
    htmlBackground?: string;
    metaColorScheme?: string;
    prefersDark?: boolean;
  },
  backdropSamples?: Array<{ r: number; g: number; b: number }>,
): DetectionOutcome {
  const signalOutcome = detectFromSignals(signals);
  if (signalOutcome.result !== 'unknown') return signalOutcome;

  if (backdropSamples && backdropSamples.length > 0) {
    const { luminance, variance } = analyzeBackdropSamples(backdropSamples);
    if (luminance > 0.7) {
      return { result: 'light', confidence: 'medium' };
    }
    if (variance > COLORFUL_VARIANCE_THRESHOLD && luminance < 0.5) {
      return { result: 'unknown', confidence: 'low' };
    }
    if (luminance < DARK_LUMINANCE_THRESHOLD) {
      return { result: 'unknown', confidence: 'low' };
    }
  }

  return { result: 'unknown', confidence: 'low' };
}

function hasExtensionMarkup(doc: Document): boolean {
  const html = doc.documentElement;
  return (
    html.hasAttribute(EXTENSION_MARKERS.rootAttr) ||
    doc.getElementById(EXTENSION_MARKERS.preloadStyleId) !== null ||
    doc.getElementById(EXTENSION_MARKERS.styleId) !== null
  );
}

function collectAuthoredSignals(doc: Document): AuthoredSignalInput {
  const html = doc.documentElement;
  const body = doc.body;
  const prefersDark =
    doc.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches ?? false;

  return {
    dataTheme: html.getAttribute('data-theme') ?? html.getAttribute('theme') ?? undefined,
    dataColorMode:
      html.getAttribute('data-color-mode') ??
      html.getAttribute('data-mode') ??
      body?.getAttribute('data-color-mode') ??
      undefined,
    metaColorScheme:
      doc.querySelector('meta[name="color-scheme"]')?.getAttribute('content') ?? undefined,
    prefersDark,
  };
}

function detectFromContentLuminance(doc: Document): DetectionOutcome {
  const contentSelectors = [
    'main',
    'article',
    '#content',
    '#mw-content-text',
    '#siteTable',
    'shreddit-app',
    '.content',
  ];

  for (const selector of contentSelectors) {
    const el = doc.querySelector(selector);
    if (!el) continue;
    const bg = doc.defaultView?.getComputedStyle(el).backgroundColor;
    if (!bg || isExtensionInjectedBackground(bg)) continue;
    const rgb = parseColor(bg);
    if (!rgb) continue;
    const lum = computeLuminance(rgb.r / 255, rgb.g / 255, rgb.b / 255);
    if (lum > 0.75) {
      return { result: 'light', confidence: 'medium' };
    }
  }

  return { result: 'unknown', confidence: 'low' };
}

/**
 * Browser-side detection using live DOM (content script only).
 * Never uses CSS class-name heuristics (theme-dark etc.) or theme-color alone for skip.
 */
export function detectFromDom(doc: Document = document): DetectionOutcome {
  const html = doc.documentElement;

  if (hasExtensionMarkup(doc) && html.hasAttribute(EXTENSION_MARKERS.rootAttr)) {
    return detectFromAuthoredSignals(collectAuthoredSignals(doc));
  }

  const authoredOutcome = detectFromAuthoredSignals(collectAuthoredSignals(doc));
  if (authoredOutcome.result !== 'unknown') return authoredOutcome;

  // theme-color is a weak hint only — never high-confidence native-dark skip
  const themeColorContent = doc
    .querySelector('meta[name="theme-color"]')
    ?.getAttribute('content');
  if (themeColorContent) {
    const rgb = parseColor(themeColorContent);
    if (rgb) {
      const lum = computeLuminance(rgb.r / 255, rgb.g / 255, rgb.b / 255);
      if (lum > 0.75) {
        return { result: 'light', confidence: 'medium' };
      }
    }
  }

  return detectFromContentLuminance(doc);
}

export function isDetectCacheValid(timestamp: number, ttlMs: number): boolean {
  return Date.now() - timestamp < ttlMs;
}

export function isHighConfidenceDark(outcome: DetectionOutcome): boolean {
  return outcome.result === 'dark' && outcome.confidence === 'high';
}

export function shouldSkipForNativeDark(outcome: DetectionOutcome): boolean {
  return isHighConfidenceDark(outcome);
}

/**
 * Clear poisoned or stale detect cache entries.
 */
export function purgePoisonedDetectCache<
  T extends Record<string, { result: DetectResult; confidence: DetectConfidence; timestamp: number }>,
>(cache: T): T {
  const cleaned = { ...cache };
  for (const [origin, entry] of Object.entries(cleaned)) {
    if (entry.result === 'dark' && entry.confidence !== 'high') {
      delete cleaned[origin];
    }
  }
  return cleaned;
}

/**
 * Full cache reset after detection logic changes.
 */
export function clearDetectCache<
  T extends Record<string, { result: DetectResult; confidence: DetectConfidence; timestamp: number }>,
>(_cache: T): Record<string, never> {
  return {};
}
