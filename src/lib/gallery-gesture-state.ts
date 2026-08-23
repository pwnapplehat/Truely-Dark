const galleryGestureAttempted = new Set<number>();

export function markGalleryGestureAttempted(tabId: number): void {
  galleryGestureAttempted.add(tabId);
}

export function isGalleryGestureAttempted(tabId: number): boolean {
  return galleryGestureAttempted.has(tabId);
}

export function clearGalleryGestureAttempted(tabId: number): void {
  galleryGestureAttempted.delete(tabId);
}
