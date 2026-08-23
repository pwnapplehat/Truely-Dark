import { rgbByteLuminance } from './color';

/** Average sampled luminance below this counts as visually dark. */
export const VISUAL_DARK_LUMINANCE_THRESHOLD = 0.45;

const DEFAULT_SAMPLE_FRACTIONS: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.5],
  [0.25, 0.25],
  [0.75, 0.25],
  [0.25, 0.75],
  [0.75, 0.75],
];

/**
 * Average WCAG luminance from RGBA pixel samples at fractional coordinates.
 */
export function averageLuminanceFromSamples(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  fractions: ReadonlyArray<readonly [number, number]> = DEFAULT_SAMPLE_FRACTIONS,
): number {
  if (width <= 0 || height <= 0 || fractions.length === 0) return 1;

  let total = 0;
  for (const [fx, fy] of fractions) {
    const x = Math.min(width - 1, Math.max(0, Math.floor(width * fx)));
    const y = Math.min(height - 1, Math.max(0, Math.floor(height * fy)));
    const i = (y * width + x) * 4;
    total += rgbByteLuminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
  }
  return total / fractions.length;
}

/**
 * True when average luminance indicates a visually dark viewport.
 */
export function isVisuallyDarkLuminance(luminance: number): boolean {
  return luminance < VISUAL_DARK_LUMINANCE_THRESHOLD;
}

/**
 * Capture the visible tab and sample center/quadrant pixel luminance.
 * Returns null when capture or decode fails (treat as unverified).
 */
export async function captureTabAverageLuminance(windowId: number): Promise<number | null> {
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

    return averageLuminanceFromSamples(
      imageData.data,
      imageData.width,
      imageData.height,
    );
  } catch {
    return null;
  }
}
