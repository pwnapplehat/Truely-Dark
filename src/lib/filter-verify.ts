/** Matches invert(1) or invert(100%) — rejects invert(0), invert(0.5), etc. */
export const STRICT_INVERT_FILTER_PATTERN = /\binvert\s*\(\s*(?:1|100%)\s*\)/i;

/**
 * True when a computed filter string includes a full invert (not partial/zero).
 */
export function computedFilterHasStrictInvert(filterValue: string): boolean {
  if (!filterValue) return false;
  return STRICT_INVERT_FILTER_PATTERN.test(filterValue);
}
