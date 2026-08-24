import { describe, expect, it } from 'vitest';
import { GALLERY_CHROME_LIMITATION, GALLERY_INJECTION_BLOCKED_LABEL } from '../src/lib/gallery-access';
import {
  isGalleryInjectionExhausted,
  markGalleryInjectionExhausted,
} from '../src/lib/gallery-gesture-state';
import { attemptGalleryInjection } from '../src/lib/gallery-injection';

describe('gallery-injection', () => {
  it('exports attemptGalleryInjection', () => {
    expect(typeof attemptGalleryInjection).toBe('function');
  });

  it('documents Chrome limitation with restricted-sites citation', () => {
    expect(GALLERY_CHROME_LIMITATION).toContain('chromewebstore.google.com');
    expect(GALLERY_CHROME_LIMITATION).toContain('extensions-on-chrome-urls');
    expect(GALLERY_CHROME_LIMITATION).toContain('developer.chrome.com');
  });

  it('blocked label references Options after paths tried', () => {
    expect(GALLERY_INJECTION_BLOCKED_LABEL).toContain('Web Store');
    expect(GALLERY_INJECTION_BLOCKED_LABEL).toContain('Options');
  });

  it('skips retry after gallery injection exhausted', async () => {
    markGalleryInjectionExhausted(99);
    expect(isGalleryInjectionExhausted(99)).toBe(true);
    await expect(
      attemptGalleryInjection(99, 'https://chromewebstore.google.com/'),
    ).resolves.toBe(false);
  });
});
