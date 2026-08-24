import type { TruelyDarkMessage } from '../types';
import { applyPreferForceMainWorldForTab } from './force-main-world';
import { getHostnameFromUrl, hostPrefersForceStylesheet } from './site-packs';

export async function broadcastSettingsChanged(): Promise<void> {
  const tabs = await browser.tabs.query({});
  const message: TruelyDarkMessage = { type: 'SETTINGS_CHANGED' };

  for (const tab of tabs) {
    if (tab.id) {
      if (tab.url && hostPrefersForceStylesheet(getHostnameFromUrl(tab.url))) {
        void applyPreferForceMainWorldForTab(tab.id, tab.url);
      }
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
