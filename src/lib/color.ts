import { converter, parse, wcagLuminance } from 'culori';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const toRgb = converter('rgb');

const TRANSPARENT_LITERALS = new Set([
  'transparent',
  'rgba(0, 0, 0, 0)',
  'rgb(0, 0, 0, 0)',
]);

/**
 * Parse any CSS Color Level 4 string to sRGB 0–255 via culori.
 * Handles hex, rgb/rgba, hsl/hsla, oklch, lab, named colors, etc.
 */
export function parseColor(color: string): RgbColor | null {
  if (!color) return null;
  const trimmed = color.trim();
  if (TRANSPARENT_LITERALS.has(trimmed.toLowerCase())) return null;

  const parsed = parse(trimmed);
  if (!parsed) return null;

  const alpha = parsed.alpha ?? 1;
  if (alpha <= 0) return null;

  const rgb = toRgb(parsed);
  if (!rgb || rgb.r === undefined || rgb.g === undefined || rgb.b === undefined) {
    return null;
  }

  return {
    r: Math.round(rgb.r * 255),
    g: Math.round(rgb.g * 255),
    b: Math.round(rgb.b * 255),
  };
}

/**
 * WCAG 2.x relative luminance from linear RGB channels in 0–1 range.
 */
export function computeLuminance(r: number, g: number, b: number): number {
  return wcagLuminance({ mode: 'rgb', r, g, b }) ?? 0;
}

/**
 * Relative luminance directly from a CSS color string.
 */
export function cssColorLuminance(color: string): number | null {
  const trimmed = color.trim();
  if (!trimmed || TRANSPARENT_LITERALS.has(trimmed.toLowerCase())) return null;

  const parsed = parse(trimmed);
  if (!parsed) return null;
  if ((parsed.alpha ?? 1) <= 0) return null;

  const lum = wcagLuminance(parsed);
  return lum ?? null;
}

/**
 * Luminance from sRGB 0–255 channels (detection pipeline helper).
 */
export function rgbByteLuminance(r: number, g: number, b: number): number {
  return computeLuminance(r / 255, g / 255, b / 255);
}
