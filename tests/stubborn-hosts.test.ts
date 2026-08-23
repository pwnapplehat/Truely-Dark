import { describe, expect, it } from 'vitest';
import { computedFilterHasStrictInvert } from '../src/lib/filter-verify';
import { verifySoftFilterApplied } from '../src/lib/engine';

// @vitest-environment happy-dom

describe('strict invert content verification', () => {
  it('verifySoftFilterApplied rejects invert(0)', () => {
    document.documentElement.innerHTML = '<head></head><body></body>';
    document.documentElement.style.setProperty('filter', 'invert(0)', 'important');
    expect(computedFilterHasStrictInvert('invert(0)')).toBe(false);
    expect(verifySoftFilterApplied(document, 'html')).toBe(false);
    document.documentElement.style.removeProperty('filter');
  });
});
