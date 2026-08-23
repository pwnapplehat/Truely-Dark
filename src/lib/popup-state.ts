/** Popup messages extend this window — captureVisibleTab often includes the popup overlay. */
const POPUP_OPEN_MS = 45_000;
let popupOpenUntil = 0;

export function markPopupOpen(): void {
  popupOpenUntil = Date.now() + POPUP_OPEN_MS;
}

export function isPopupLikelyOpen(): boolean {
  return Date.now() < popupOpenUntil;
}

export function isPopupSender(sender: Browser.runtime.MessageSender | undefined): boolean {
  const url = sender?.url ?? '';
  return url.includes('popup.html');
}
