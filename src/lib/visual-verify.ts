import { rgbByteLuminance } from './color';

/** Average sampled luminance below this counts as visually dark. */
export const VISUAL_DARK_LUMINANCE_THRESHOLD = 0.45;
export const VISUAL_MAX_LUMINANCE_THRESHOLD = 0.55;
export const VISUAL_TOP_BAND_LUMINANCE_THRESHOLD = 0.6;
export const VISUAL_TOP_BAND_FRACTION = 0.25;

/** Top band + mid + bottom — header/hero weighted heavily. */
export const VISUAL_SAMPLE_FRACTIONS: ReadonlyArray<readonly [number, number]> = [
  [0.1, 0.05],
  [0.3, 0.05],
  [0.5, 0.05],
  [0.7, 0.05],
  [0.9, 0.05],
  [0.1, 0.12],
  [0.5, 0.12],
  [0.9, 0.12],
  [0.1, 0.2],
  [0.5, 0.2],
  [0.9, 0.2],
  [0.25, 0.5],
  [0.5, 0.5],
  [0.75, 0.5],
  [0.5, 0.85],
  [0.25, 0.9],
  [0.75, 0.9],
];

export interface VisualSampleAnalysis {
  average: number;
  max: number;
  topBandMax: number;
}

function sampleLuminanceAt(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  fx: number,
  fy: number,
): number {
  const x = Math.min(width - 1, Math.max(0, Math.floor(width * fx)));
  const y = Math.min(height - 1, Math.max(0, Math.floor(height * fy)));
  const i = (y * width + x) * 4;
  return rgbByteLuminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
}

/**
 * Analyze luminance samples — top band weighted in sample list.
 */
export function analyzeVisualSamples(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  fractions: ReadonlyArray<readonly [number, number]> = VISUAL_SAMPLE_FRACTIONS,
): VisualSampleAnalysis {
  if (width <= 0 || height <= 0 || fractions.length === 0) {
    return { average: 1, max: 1, topBandMax: 1 };
  }

  let total = 0;
  let max = 0;
  let topBandMax = 0;

  for (const [fx, fy] of fractions) {
    const lum = sampleLuminanceAt(data, width, height, fx, fy);
    total += lum;
    max = Math.max(max, lum);
    if (fy <= VISUAL_TOP_BAND_FRACTION) {
      topBandMax = Math.max(topBandMax, lum);
    }
  }

  return {
    average: total / fractions.length,
    max,
    topBandMax,
  };
}

/**
 * Average WCAG luminance from RGBA pixel samples at fractional coordinates.
 */
export function averageLuminanceFromSamples(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  fractions: ReadonlyArray<readonly [number, number]> = VISUAL_SAMPLE_FRACTIONS,
): number {
  return analyzeVisualSamples(data, width, height, fractions).average;
}

/**
 * True when average luminance indicates a visually dark viewport (legacy helper).
 */
export function isVisuallyDarkLuminance(luminance: number): boolean {
  return luminance < VISUAL_DARK_LUMINANCE_THRESHOLD;
}

/**
 * Strict visual gate: average dark, no bright hotspot, top band (header/hero) not light.
 */
export function isVisuallyDarkAnalysis(analysis: VisualSampleAnalysis): boolean {
  return (
    analysis.average < VISUAL_DARK_LUMINANCE_THRESHOLD &&
    analysis.max < VISUAL_MAX_LUMINANCE_THRESHOLD &&
    analysis.topBandMax < VISUAL_TOP_BAND_LUMINANCE_THRESHOLD
  );
}

/**
 * Capture the visible tab and analyze center + top-band + quadrant pixel luminance.
 * Returns null when capture or decode fails (treat as unverified).
 */
export async function captureTabVisualAnalysis(windowId: number): Promise<VisualSampleAnalysis | null> {
  try {
    const dataUrl = await browser.tabs.captureVisibleTab(windowId, {
      format: 'jpeg',
      quality: 65,
    });

    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      bitmap.close();
      return null;
    }

    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    bitmap.close();

    return analyzeVisualSamples(imageData.data, imageData.width, imageData.height);
  } catch {
    return null;
  }
}

/** @deprecated Use captureTabVisualAnalysis */
export async function captureTabAverageLuminance(windowId: number): Promise<number | null> {
  const analysis = await captureTabVisualAnalysis(windowId);
  return analysis?.average ?? null;
}
