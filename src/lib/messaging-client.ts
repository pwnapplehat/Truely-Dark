import type { TruelyDarkMessage } from '../types';

/** Popup/content-safe messaging — no background-only imports (avoids cross-world chunk preload). */
export async function sendMessage<T = unknown>(
  message: TruelyDarkMessage,
): Promise<T> {
  return browser.runtime.sendMessage(message) as Promise<T>;
}

export async function sendMessageToTab<T = unknown>(
  tabId: number,
  message: TruelyDarkMessage,
): Promise<T> {
  return browser.tabs.sendMessage(tabId, message) as Promise<T>;
}
