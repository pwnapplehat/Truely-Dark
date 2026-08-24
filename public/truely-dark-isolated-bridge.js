/**
 * ISOLATED world document_start bridge — pairs with MAIN bootstrap.
 * Registered via chrome.scripting.registerContentScripts (persistAcrossSessions).
 */
(function () {
  if (window.__truelyDarkBridgeInstalled) return;
  window.__truelyDarkBridgeInstalled = true;

  document.addEventListener('truely-dark-main-apply', function (ev) {
    try {
      window.dispatchEvent(new CustomEvent('truely-dark-main-apply', { detail: ev.detail }));
    } catch (e) {
      /* cross-world dispatch */
    }
  });
})();
