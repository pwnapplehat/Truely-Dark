const galleryGestureAttempted = new Set<number>();
const galleryInjectionExhausted = new Set<number>();

export function markGalleryGestureAttempted(tabId: number): void {
  galleryGestureAttempted.add(tabId);
}

export function isGalleryGestureAttempted(tabId: number): boolean {
  return galleryGestureAttempted.has(tabId);
}

/** Gallery injection failed after gesture ladder — do not retry until navigation. */
export function markGalleryInjectionExhausted(tabId: number): void {
  galleryInjectionExhausted.add(tabId);
}

export function isGalleryInjectionExhausted(tabId: number): boolean {
  return galleryInjectionExhausted.has(tabId);
}

export function clearGalleryGestureAttempted(tabId: number): void {
  galleryGestureAttempted.delete(tabId);
  galleryInjectionExhausted.delete(tabId);
}
