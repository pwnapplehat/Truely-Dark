import { describe, expect, it } from 'vitest';
import {
  computedFilterHasStrictInvert,
  STRICT_INVERT_FILTER_PATTERN,
} from '../src/lib/filter-verify';

describe('STRICT_INVERT_FILTER_PATTERN', () => {
  it('matches invert(1) and invert(100%)', () => {
    expect(STRICT_INVERT_FILTER_PATTERN.test('invert(1) hue-rotate(180deg)')).toBe(true);
    expect(STRICT_INVERT_FILTER_PATTERN.test('invert(100%) hue-rotate(180deg)')).toBe(true);
  });

  it('rejects invert(0) and partial invert', () => {
    expect(computedFilterHasStrictInvert('invert(0)')).toBe(false);
    expect(computedFilterHasStrictInvert('invert(0.5)')).toBe(false);
    expect(computedFilterHasStrictInvert('none')).toBe(false);
  });
});
