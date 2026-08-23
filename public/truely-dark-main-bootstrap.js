/**
 * MAIN world document_start bootstrap — shadow piercing + Truely Dark hooks.
 * Registered via chrome.scripting.registerContentScripts (persistAcrossSessions).
 */
(function () {
  if (window.__truelyDarkMainInstalled) return;
  window.__truelyDarkMainInstalled = true;

  var SHADOW_FORCE_ID = 'truely-dark-shadow-force';
  var SHADOW_FILTER_ID = 'truely-dark-shadow-filter';
  var FORCE_STYLE_ID = 'truely-dark-force-styles';
  var FORCE_BG = '#0d1117';
  var INVERT_PRE_BG = '#ededed';

  /** Duplicated from site-packs — bootstrap cannot import TS. */
  var PREFER_FORCE_SUFFIXES = ['ovhcloud.com', 'x.ai', 'medium.com'];

  var preferForceWatchdogTimer = null;

  function hostnamePrefersForce(hostname) {
    if (!hostname) return false;
    var h = String(hostname).toLowerCase();
    for (var i = 0; i < PREFER_FORCE_SUFFIXES.length; i++) {
      var suffix = PREFER_FORCE_SUFFIXES[i];
      if (h === suffix || h.endsWith('.' + suffix)) return true;
    }
    return false;
  }

  function filterStringHasInvert(filterStr) {
    if (!filterStr) return false;
    return /invert\s*\(/i.test(filterStr);
  }

  function injectIntoShadowRoot(root, cssText, styleId, visited) {
    if (!root || visited.has(root)) return;
    visited.add(root);

    var styleEl = root.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      root.appendChild(styleEl);
    }
    styleEl.textContent = cssText;

    try {
      if (root.adoptedStyleSheets) {
        var sheet = new CSSStyleSheet();
        sheet.replaceSync(cssText);
        var kept = [];
        for (var i = 0; i < root.adoptedStyleSheets.length; i++) {
          if (root.adoptedStyleSheets[i] !== sheet) kept.push(root.adoptedStyleSheets[i]);
        }
        kept.push(sheet);
        root.adoptedStyleSheets = kept;
      }
    } catch (e) {
      /* adoptedStyleSheets blocked */
    }
  }

  function removeShadowStyleIds(node, styleIds, visited) {
    if (!node || visited.has(node)) return;
    visited.add(node);

    if (node.shadowRoot) {
      var root = node.shadowRoot;
      for (var s = 0; s < styleIds.length; s++) {
        var el = root.getElementById(styleIds[s]);
        if (el) el.remove();
      }
      for (var i = 0; i < root.children.length; i++) {
        removeShadowStyleIds(root.children[i], styleIds, visited);
      }
      var descendants = root.querySelectorAll('*');
      for (var j = 0; j < descendants.length; j++) {
        removeShadowStyleIds(descendants[j], styleIds, visited);
      }
    }
    if (node.children) {
      for (var k = 0; k < node.children.length; k++) {
        removeShadowStyleIds(node.children[k], styleIds, visited);
      }
    }
  }

  function walkShadowTree(node, shadowCss, shadowFilterCss, visited) {
    if (!node) return;
    if (node.shadowRoot) {
      var root = node.shadowRoot;
      if (shadowCss) injectIntoShadowRoot(root, shadowCss, SHADOW_FORCE_ID, visited);
      if (shadowFilterCss) injectIntoShadowRoot(root, shadowFilterCss, SHADOW_FILTER_ID, visited);
      for (var i = 0; i < root.children.length; i++) {
        walkShadowTree(root.children[i], shadowCss, shadowFilterCss, visited);
      }
      var descendants = root.querySelectorAll('*');
      for (var j = 0; j < descendants.length; j++) {
        walkShadowTree(descendants[j], shadowCss, shadowFilterCss, visited);
      }
    }
    if (node.children) {
      for (var k = 0; k < node.children.length; k++) {
        walkShadowTree(node.children[k], shadowCss, shadowFilterCss, visited);
      }
    }
  }

  function pierceAllShadows(shadowCss, shadowFilterCss) {
    walkShadowTree(document.documentElement, shadowCss, shadowFilterCss, new WeakSet());
  }

  function removeAllShadowStyles() {
    removeShadowStyleIds(
      document.documentElement,
      [SHADOW_FORCE_ID, SHADOW_FILTER_ID],
      new WeakSet(),
    );
  }

  function resolveDefaultBg(opts) {
    if (opts.bg) return opts.bg;
    if (opts.force) return FORCE_BG;
    return INVERT_PRE_BG;
  }

  function resolveDefaultText(opts) {
    if (opts.text) return opts.text;
    if (opts.force) return '#e8e8e8';
    return '#000000';
  }

  function stripInvertFromHtml(html) {
    html.style.removeProperty('filter');
    html.style.removeProperty('-webkit-filter');
    html.removeAttribute('data-truely-dark-filter-target');
    if (document.body) {
      document.body.style.removeProperty('filter');
      document.body.style.removeProperty('-webkit-filter');
    }
  }

  function applyHtmlPaint(bg, text, filterStr, mode, force) {
    var html = document.documentElement;
    html.setAttribute('data-truely-dark-active', mode || 'soft');
    if (force) {
      html.setAttribute('data-truely-dark-force', 'true');
      html.setAttribute('data-truely-dark-filter-target', 'force');
      stripInvertFromHtml(html);
    } else {
      html.removeAttribute('data-truely-dark-force');
      html.setAttribute('data-truely-dark-filter-target', 'html');
      if (filterStr) {
        html.style.setProperty('filter', filterStr, 'important');
        html.style.setProperty('-webkit-filter', filterStr, 'important');
      }
    }
    html.style.setProperty('background-color', bg, 'important');
    html.style.setProperty('color', text, 'important');
    if (document.body) {
      document.body.style.setProperty('background-color', bg, 'important');
      document.body.style.setProperty('color', text, 'important');
      if (!force) {
        document.body.style.removeProperty('filter');
        document.body.style.removeProperty('-webkit-filter');
      }
    }
  }

  function injectLightForceCss(cssText) {
    if (!cssText) return;
    var el = document.getElementById(FORCE_STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = FORCE_STYLE_ID;
      var parent = document.head || document.documentElement;
      parent.appendChild(el);
    }
    el.textContent = cssText;
  }

  var observer = null;
  function startShadowObserver(shadowCss, shadowFilterCss) {
    if (observer) observer.disconnect();
    observer = new MutationObserver(function () {
      pierceAllShadows(shadowCss, shadowFilterCss);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function stopPreferForceWatchdog() {
    if (preferForceWatchdogTimer !== null) {
      clearInterval(preferForceWatchdogTimer);
      preferForceWatchdogTimer = null;
    }
  }

  function runPreferForceWatchdog() {
    if (!hostnamePrefersForce(location.hostname)) return;

    var html = document.documentElement;
    if (!html.hasAttribute('data-truely-dark-active')) return;

    var forceMissing = html.getAttribute('data-truely-dark-force') !== 'true';
    var inlineInvert = filterStringHasInvert(html.style.filter || html.style.webkitFilter);
    var computedInvert = false;
    try {
      computedInvert = filterStringHasInvert(getComputedStyle(html).filter);
    } catch (e) {
      /* getComputedStyle blocked */
    }

    if (forceMissing || inlineInvert || computedInvert) {
      window.__truelyDarkMain.apply({
        force: true,
        mode: html.getAttribute('data-truely-dark-active') || 'soft',
        bg: FORCE_BG,
        text: '#e8e8e8',
      });
    }
  }

  function startPreferForceWatchdog() {
    if (!hostnamePrefersForce(location.hostname)) return;
    if (preferForceWatchdogTimer !== null) return;
    preferForceWatchdogTimer = setInterval(runPreferForceWatchdog, 400);
    requestAnimationFrame(runPreferForceWatchdog);
  }

  window.__truelyDarkMain = {
    pierceShadows: pierceAllShadows,
    apply: function (opts) {
      opts = opts || {};

      if (hostnamePrefersForce(location.hostname)) {
        opts.force = true;
        opts.filter = undefined;
        opts.bg = opts.bg || FORCE_BG;
        opts.text = opts.text || '#e8e8e8';
        opts.shadowFilterCss = null;
      }

      var force = opts.force || false;
      applyHtmlPaint(
        resolveDefaultBg(opts),
        resolveDefaultText(opts),
        opts.filter,
        opts.mode || 'soft',
        force,
      );
      if (opts.lightCss) injectLightForceCss(opts.lightCss);
      pierceAllShadows(opts.shadowCss, force ? null : opts.shadowFilterCss);
      if (opts.watchShadows) {
        startShadowObserver(opts.shadowCss, force ? null : opts.shadowFilterCss);
      }

      if (force || hostnamePrefersForce(location.hostname)) {
        startPreferForceWatchdog();
      }
    },
    remove: function () {
      stopPreferForceWatchdog();

      var html = document.documentElement;
      html.removeAttribute('data-truely-dark-active');
      html.removeAttribute('data-truely-dark-force');
      html.removeAttribute('data-truely-dark-filter-target');
      html.style.removeProperty('filter');
      html.style.removeProperty('-webkit-filter');
      html.style.removeProperty('background-color');
      html.style.removeProperty('color');
      if (document.body) {
        document.body.style.removeProperty('filter');
        document.body.style.removeProperty('-webkit-filter');
        document.body.style.removeProperty('background-color');
        document.body.style.removeProperty('color');
      }
      var forceEl = document.getElementById(FORCE_STYLE_ID);
      if (forceEl) forceEl.remove();
      removeAllShadowStyles();
      if (observer) observer.disconnect();
      observer = null;
    },
  };

  document.addEventListener('truely-dark-main-apply', function (ev) {
    var detail = ev.detail || {};
    window.__truelyDarkMain.apply(detail);
  });

  document.addEventListener('truely-dark-main-remove', function () {
    window.__truelyDarkMain.remove();
  });
})();
