import type { TruelyDarkMessage } from '../types';

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

export async function broadcastSettingsChanged(): Promise<void> {
  const tabs = await browser.tabs.query({});
  const message: TruelyDarkMessage = { type: 'SETTINGS_CHANGED' };

  for (const tab of tabs) {
    if (tab.id) {
      try {
        await browser.tabs.sendMessage(tab.id, message);
      } catch {
        // Tab may not have content script loaded
      }
    }
  }
}

export function onMessage(
  handler: (
    message: TruelyDarkMessage,
    sender: Browser.runtime.MessageSender,
  ) => Promise<unknown> | unknown,
): void {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const result = handler(message as TruelyDarkMessage, sender);
    if (result instanceof Promise) {
      result
        .then((value) => sendResponse(value))
        .catch((err) => sendResponse({ error: String(err) }));
      return true;
    }
    sendResponse(result);
    return true;
  });
}
