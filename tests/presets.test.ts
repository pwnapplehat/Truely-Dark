import { describe, expect, it } from 'vitest';
import { applyPreset, PRESETS } from '../src/lib/defaults';
import { buildFilterString } from '../src/lib/engine';
import { DEFAULT_SETTINGS } from '../src/lib/defaults';

describe('presets', () => {
  it('includes all v1 presets', () => {
    expect(Object.keys(PRESETS)).toEqual(
      expect.arrayContaining(['midnight', 'oled', 'paper-night', 'high-contrast']),
    );
  });

  it('applyPreset updates brightness/contrast/sepia', () => {
    const oled = applyPreset(DEFAULT_SETTINGS, 'oled');
    expect(oled.preset).toBe('oled');
    expect(oled.brightness).toBe(PRESETS.oled.brightness);
    expect(oled.contrast).toBe(PRESETS.oled.contrast);
    expect(oled.sepia).toBe(PRESETS.oled.sepia);
  });

  it('applyPreset paper-night sets warmth', () => {
    const paper = applyPreset(DEFAULT_SETTINGS, 'paper-night');
    expect(paper.sepia).toBeGreaterThan(0);
  });
});

describe('buildFilterString — live appearance', () => {
  it('reflects brightness/contrast/sepia in CSS filter', () => {
    const filter = buildFilterString(110, 120, 15);
    expect(filter).toContain('brightness(1.1)');
    expect(filter).toContain('contrast(1.2)');
    expect(filter).toContain('sepia(0.15)');
    expect(filter).toContain('invert(1)');
  });
});
