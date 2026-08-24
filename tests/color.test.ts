import { describe, expect, it } from 'vitest';
import {
  computeLuminance,
  cssColorLuminance,
  parseColor,
  rgbByteLuminance,
} from '../src/lib/color';

describe('color.parseColor (culori)', () => {
  it('parses 3- and 6-digit hex', () => {
    expect(parseColor('#121212')).toEqual({ r: 18, g: 18, b: 18 });
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('#0d1117')).toEqual({ r: 13, g: 17, b: 23 });
  });

  it('parses rgb/rgba', () => {
    expect(parseColor('rgb(18, 18, 18)')).toEqual({ r: 18, g: 18, b: 18 });
    expect(parseColor('rgba(0, 0, 0, 0.5)')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('parses hsl/hsla', () => {
    const white = parseColor('hsl(0, 0%, 100%)');
    expect(white).toEqual({ r: 255, g: 255, b: 255 });

    const black = parseColor('hsla(0, 0%, 0%, 1)');
    expect(black).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('parses oklch (CSS Color 4)', () => {
    const dark = parseColor('oklch(0.2 0.02 260)');
    expect(dark).not.toBeNull();
    expect(dark!.r).toBeLessThan(80);
    expect(dark!.g).toBeLessThan(80);
    expect(dark!.b).toBeLessThan(100);
  });

  it('parses named CSS colors', () => {
    expect(parseColor('white')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('black')).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseColor('rebeccapurple')).not.toBeNull();
  });

  it('returns null for transparent and zero-alpha', () => {
    expect(parseColor('transparent')).toBeNull();
    expect(parseColor('rgba(0, 0, 0, 0)')).toBeNull();
    expect(parseColor('rgb(0, 0, 0, 0)')).toBeNull();
  });

  it('returns null for invalid strings', () => {
    expect(parseColor('')).toBeNull();
    expect(parseColor('not-a-color')).toBeNull();
    expect(parseColor('#gggggg')).toBeNull();
  });
});

describe('color.computeLuminance', () => {
  it('matches WCAG endpoints', () => {
    expect(computeLuminance(0, 0, 0)).toBe(0);
    expect(computeLuminance(1, 1, 1)).toBe(1);
  });

  it('rgbByteLuminance matches channel-normalized computeLuminance', () => {
    const fromBytes = rgbByteLuminance(18, 18, 18);
    const fromUnit = computeLuminance(18 / 255, 18 / 255, 18 / 255);
    expect(fromBytes).toBeCloseTo(fromUnit, 5);
  });
});

describe('color.cssColorLuminance', () => {
  it('computes luminance from hex without round-trip loss', () => {
    const lum = cssColorLuminance('#ffffff');
    expect(lum).toBeCloseTo(1, 5);
  });

  it('computes dark theme-color luminance', () => {
    const lum = cssColorLuminance('#0d1117');
    expect(lum).not.toBeNull();
    expect(lum!).toBeLessThan(0.1);
  });

  it('returns null for transparent', () => {
    expect(cssColorLuminance('transparent')).toBeNull();
  });
});
