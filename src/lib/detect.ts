import type { DetectResult } from '../types';

const DARK_LUMINANCE_THRESHOLD = 0.35;
const COLORFUL_VARIANCE_THRESHOLD = 0.08;

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
 * Determine if a page is already dark based on DOM signals (no live DOM required).
 */
export function detectFromSignals(signals: {
  colorScheme?: string;
  dataTheme?: string;
  dataColorMode?: string;
  bodyBackground?: string;
  htmlBackground?: string;
  metaColorScheme?: string;
}): DetectResult {
  const darkThemeValues = ['dark', 'night', 'dim', 'black', 'oled'];
  const lightThemeValues = ['light', 'day', 'bright', 'white'];

  const checkValue = (value: string | undefined): DetectResult | null => {
    if (!value) return null;
    const lower = value.toLowerCase();
    if (darkThemeValues.some((v) => lower.includes(v))) return 'dark';
    if (lightThemeValues.some((v) => lower.includes(v))) return 'light';
    return null;
  };

  const themeResult =
    checkValue(signals.dataTheme) ??
    checkValue(signals.dataColorMode) ??
    checkValue(signals.colorScheme) ??
    checkValue(signals.metaColorScheme);

  if (themeResult) return themeResult;

  const backgrounds = [signals.bodyBackground, signals.htmlBackground];
  for (const bg of backgrounds) {
    if (!bg) continue;
    const rgb = parseColor(bg);
    if (!rgb) continue;
    const lum = computeLuminance(rgb.r / 255, rgb.g / 255, rgb.b / 255);
    if (lum < DARK_LUMINANCE_THRESHOLD) return 'dark';
    if (lum > 0.75) return 'light';
  }

  return 'unknown';
}

/**
 * Sample backdrop colors from canvas pixel data (for colorful detection).
 * Returns average luminance and color variance.
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
 * Full detection combining signals and optional backdrop samples.
 */
export function detectPageTheme(
  signals: {
    colorScheme?: string;
    dataTheme?: string;
    dataColorMode?: string;
    bodyBackground?: string;
    htmlBackground?: string;
    metaColorScheme?: string;
  },
  backdropSamples?: Array<{ r: number; g: number; b: number }>,
): DetectResult {
  const signalResult = detectFromSignals(signals);
  if (signalResult !== 'unknown') return signalResult;

  if (backdropSamples && backdropSamples.length > 0) {
    const { luminance, variance } = analyzeBackdropSamples(backdropSamples);
    if (variance > COLORFUL_VARIANCE_THRESHOLD && luminance < 0.5) {
      return 'dark';
    }
    if (luminance < DARK_LUMINANCE_THRESHOLD) return 'dark';
    if (luminance > 0.7) return 'light';
  }

  return 'unknown';
}

/**
 * Browser-side detection using live DOM (content script only).
 */
export function detectFromDom(doc: Document = document): DetectResult {
  const html = doc.documentElement;
  const body = doc.body;

  const metaScheme = doc.querySelector('meta[name="color-scheme"]');
  const metaColorScheme = metaScheme?.getAttribute('content') ?? undefined;

  const computedHtml = doc.defaultView?.getComputedStyle(html);
  const computedBody = body ? doc.defaultView?.getComputedStyle(body) : null;

  const signals = {
    colorScheme: computedHtml?.colorScheme ?? undefined,
    dataTheme: html.getAttribute('data-theme') ?? html.getAttribute('theme') ?? undefined,
    dataColorMode:
      html.getAttribute('data-color-mode') ??
      html.getAttribute('data-mode') ??
      body?.getAttribute('data-color-mode') ??
      undefined,
    bodyBackground: computedBody?.backgroundColor ?? undefined,
    htmlBackground: computedHtml?.backgroundColor ?? undefined,
    metaColorScheme,
  };

  return detectFromSignals(signals);
}

export function isDetectCacheValid(timestamp: number, ttlMs: number): boolean {
  return Date.now() - timestamp < ttlMs;
}
