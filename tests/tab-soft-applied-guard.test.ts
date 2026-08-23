import { describe, expect, it } from 'vitest';
import {
  getTabSoftApplied,
  setTabSoftApplied,
} from '../src/lib/tab-injection-state';

describe('tab-injection-state softApplied guard', () => {
  it('never downgrades true to false', () => {
    setTabSoftApplied(99, true);
    setTabSoftApplied(99, false);
    expect(getTabSoftApplied(99)).toBe(true);
  });
});
