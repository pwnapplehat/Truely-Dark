// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { generateShadowForceCss, generateShadowInvertPrepCss } from '../src/lib/shadow-force';
import { DEFAULT_SETTINGS } from '../src/lib/defaults';
import { resolveEffectiveSettings } from '../src/lib/resolver';

describe('shadow-force css', () => {
  const effective = resolveEffectiveSettings({
    origin: 'https://example.com',
    hostname: 'example.com',
    settings: DEFAULT_SETTINGS,
    detectOutcome: { result: 'light', confidence: 'medium' },
  });

  it('generates shadow force css with host and media exceptions', () => {
    const css = generateShadowForceCss(effective);
    expect(css).toContain(':host');
    expect(css).toContain('#121212');
    expect(css).toContain('img, svg, video');
  });

  it('generates invert-prep css for shadow roots', () => {
    const css = generateShadowInvertPrepCss();
    expect(css).toContain('#ffffff');
    expect(css).toContain(':host');
  });
});
