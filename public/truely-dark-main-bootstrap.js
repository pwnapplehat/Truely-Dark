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

  function applyHtmlPaint(bg, text, filterStr, mode, force) {
    var html = document.documentElement;
    html.setAttribute('data-truely-dark-active', mode || 'soft');
    if (force) {
      html.setAttribute('data-truely-dark-force', 'true');
      html.setAttribute('data-truely-dark-filter-target', 'force');
      html.style.removeProperty('filter');
      html.style.removeProperty('-webkit-filter');
    } else {
      html.removeAttribute('data-truely-dark-force');
      html.setAttribute('data-truely-dark-filter-target', 'html');
      if (filterStr) {
        html.style.setProperty('filter', filterStr, 'important');
        html.style.setProperty('-webkit-filter', filterStr, 'important');
      }
    }
    html.style.setProperty('background-color', bg, 'important');
    html.style.setProperty('color', text || '#000000', 'important');
    if (document.body) {
      document.body.style.setProperty('background-color', bg, 'important');
      document.body.style.setProperty('color', text || '#000000', 'important');
      if (!force) {
        document.body.style.removeProperty('filter');
        document.body.style.removeProperty('-webkit-filter');
      }
    }
  }

  function injectLightForceCss(cssText) {
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

  window.__truelyDarkMain = {
    pierceShadows: pierceAllShadows,
    apply: function (opts) {
      opts = opts || {};
      applyHtmlPaint(
        opts.bg || '#ffffff',
        opts.text,
        opts.filter,
        opts.mode || 'soft',
        opts.force || false,
      );
      if (opts.lightCss) injectLightForceCss(opts.lightCss);
      pierceAllShadows(opts.shadowCss, opts.shadowFilterCss);
      if (opts.watchShadows) startShadowObserver(opts.shadowCss, opts.shadowFilterCss);
    },
  };

  document.addEventListener('truely-dark-main-apply', function (ev) {
    var detail = ev.detail || {};
    window.__truelyDarkMain.apply(detail);
  });
})();
