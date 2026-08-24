import type { EffectiveSiteSettings, SitePack } from '../types';
export const FORCE_MARKETING_BG = '#0d1117';

/** Marker: Truely Dark set YouTube native theme attrs — safe to remove on off. */
export const YOUTUBE_NATIVE_DARK_HINT_ATTR = 'data-truely-dark-youtube-hint';

export function isYouTubeHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === 'youtube.com' || normalized.endsWith('.youtube.com');
}

/**
 * YouTube Polymer reads html[dark] / ytd-masthead[dark] for internal theme vars.
 * Without this hint, force shell CSS alone leaves light-theme surfaces (#dfe1e5).
 */
export function syncYouTubeNativeDarkHint(doc: Document, enable: boolean): void {
  const html = doc.documentElement;
  if (enable) {
    html.setAttribute('dark', '');
    html.setAttribute('darker-dark-theme', '');
    html.setAttribute(YOUTUBE_NATIVE_DARK_HINT_ATTR, 'true');
    for (const masthead of doc.querySelectorAll('ytd-masthead')) {
      masthead.setAttribute('dark', '');
    }
    return;
  }

  if (html.getAttribute(YOUTUBE_NATIVE_DARK_HINT_ATTR) !== 'true') return;

  html.removeAttribute('dark');
  html.removeAttribute('darker-dark-theme');
  html.removeAttribute(YOUTUBE_NATIVE_DARK_HINT_ATTR);
  for (const masthead of doc.querySelectorAll('ytd-masthead')) {
    masthead.removeAttribute('dark');
  }
}

/** Counter-invert filter — cancels parent html invert(1) on isolated surfaces (Wikipedia footer). */
export const INVERT_COUNTER_FILTER =
  'invert(1) hue-rotate(180deg) brightness(0.98) contrast(0.92)';

/** Host suffixes that must never receive invert Soft (MAIN bootstrap duplicates this list). */
export const PREFER_FORCE_HOST_SUFFIXES = [
  'ovhcloud.com',
  'x.ai',
  'medium.com',
  'youtube.com',
] as const;

/** Hide OVH fixed white overlay whenever Truely Dark is active — even if invert leaks once. */
export const REDIRECTION_BANNER_KILL_CSS = `
  html[data-truely-dark-active] .redirection-banners,
  html[data-truely-dark-active] [class*="redirection-banner"],
  html[data-truely-dark-active] [class*="redirection-banners"] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    opacity: 0 !important;
    background: transparent !important;
    background-image: none !important;
  }
`;

/** Shared force-mode shell — root surfaces only; headers stay transparent. */
export const MARKETING_FORCE_SHELL_CSS = `
  html[data-truely-dark-active] {
    color-scheme: dark !important;
  }
  html[data-truely-dark-active],
  html[data-truely-dark-active] body,
  html[data-truely-dark-active] #__next,
  html[data-truely-dark-active] #root,
  html[data-truely-dark-active] main,
  html[data-truely-dark-active] [role="main"] {
    background-color: var(--truely-dark-bg, ${FORCE_MARKETING_BG}) !important;
    background-image: none !important;
    color: #e8eaed !important;
    filter: none !important;
    -webkit-filter: none !important;
  }
  html[data-truely-dark-active] header,
  html[data-truely-dark-active] nav,
  html[data-truely-dark-active] [role="banner"] {
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    color: #e8eaed !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    max-height: 8rem !important;
    overflow: visible !important;
  }
  html[data-truely-dark-active] header[style*="position: fixed"],
  html[data-truely-dark-active] header[style*="position: sticky"],
  html[data-truely-dark-active] nav[style*="position: fixed"],
  html[data-truely-dark-active] nav[style*="position: sticky"],
  html[data-truely-dark-active] header[class*="sticky"],
  html[data-truely-dark-active] nav[class*="sticky"] {
    max-height: 8rem !important;
    overflow: visible !important;
  }
  html[data-truely-dark-active] footer,
  html[data-truely-dark-active] [role="contentinfo"] {
    background-color: var(--truely-dark-bg, ${FORCE_MARKETING_BG}) !important;
    background-image: none !important;
    color: #e8eaed !important;
  }
  html[data-truely-dark-active] section[class*="hero"],
  html[data-truely-dark-active] section[class*="Hero"],
  html[data-truely-dark-active] [class*="hero"]:not(header):not(nav),
  html[data-truely-dark-active] [class*="Hero"]:not(header):not(nav),
  html[data-truely-dark-active] [class*="card"],
  html[data-truely-dark-active] [class*="Card"] {
    background-color: #1a1a1a !important;
    background-image: none !important;
    color: #e8eaed !important;
  }
  html[data-truely-dark-active] h1,
  html[data-truely-dark-active] h2,
  html[data-truely-dark-active] h3,
  html[data-truely-dark-active] h4,
  html[data-truely-dark-active] p,
  html[data-truely-dark-active] span,
  html[data-truely-dark-active] li,
  html[data-truely-dark-active] label {
    color: #e8eaed !important;
  }
  html[data-truely-dark-active] small,
  html[data-truely-dark-active] [class*="subtitle"],
  html[data-truely-dark-active] [class*="description"] {
    color: #bdc1c6 !important;
  }
  html[data-truely-dark-active] a,
  html[data-truely-dark-active] a:visited {
    color: #7baaf7 !important;
  }
  html[data-truely-dark-active] a:hover {
    color: #a8c7fa !important;
  }
  html[data-truely-dark-active] img,
  html[data-truely-dark-active] svg,
  html[data-truely-dark-active] picture,
  html[data-truely-dark-active] video {
    background-color: transparent !important;
  }
`;

/** Targeted gutter/footer reinforcement — NOT universal * paint (legacy name kept for tests). */
export const MARKETING_FORCE_NUCLEAR_CSS = `
  html[data-truely-dark-active][data-truely-dark-force] footer,
  html[data-truely-dark-active][data-truely-dark-force] [role="contentinfo"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="footer"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Footer"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="copyright"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Copyright"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="legal"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Legal"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="gutter"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Gutter"] {
    background-color: var(--truely-dark-bg, ${FORCE_MARKETING_BG}) !important;
    background-image: none !important;
    color: #e8eaed !important;
  }
`;

/** Form surfaces on force marketing hosts — readable newsletter inputs. */
export const FORCE_FORM_SURFACE_CSS = `
  html[data-truely-dark-active][data-truely-dark-force] input:not([type="image"]):not([type="checkbox"]):not([type="radio"]),
  html[data-truely-dark-active][data-truely-dark-force] textarea,
  html[data-truely-dark-active][data-truely-dark-force] select {
    background-color: #1a1a1a !important;
    color: #e8eaed !important;
    border-color: #3c4043 !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] [class*="newsletter"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Newsletter"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="subscribe"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Subscribe"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="keep-in-touch"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="KeepInTouch"] {
    background-color: var(--truely-dark-bg, ${FORCE_MARKETING_BG}) !important;
    color: #e8eaed !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] [class*="newsletter"] *,
  html[data-truely-dark-active][data-truely-dark-force] [class*="subscribe"] *,
  html[data-truely-dark-active][data-truely-dark-force] [class*="keep-in-touch"] * {
    color: #e8eaed !important;
  }
`;

const OVH_FORCE_CSS = `
  html[data-truely-dark-active][data-truely-dark-force] {
    --truely-dark-bg: ${FORCE_MARKETING_BG};
  }
  html[data-truely-dark-active][data-truely-dark-force] header.ods-header-universe,
  html[data-truely-dark-active][data-truely-dark-force] .ods-header-universe,
  html[data-truely-dark-active][data-truely-dark-force] .ods-header-topbar__content,
  html[data-truely-dark-active][data-truely-dark-force] [class*="ods-header"]:not(.ods-header-topbar) {
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    max-height: 8rem !important;
    overflow: visible !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] .ods-header-topbar {
    background-color: #00185e !important;
    background-image: none !important;
    max-height: 3rem !important;
    overflow: hidden !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] header.ods-header-universe {
    max-height: 8rem !important;
    overflow: hidden !important;
    isolation: isolate !important;
    z-index: 302 !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] main,
  html[data-truely-dark-active][data-truely-dark-force] [role="main"] {
    position: static !important;
    z-index: auto !important;
  }
  html[data-truely-dark-active][data-truely-dark-force],
  html[data-truely-dark-active][data-truely-dark-force] body,
  html[data-truely-dark-active][data-truely-dark-force] .dialog-off-canvas-main-canvas,
  html[data-truely-dark-active][data-truely-dark-force] main,
  html[data-truely-dark-active][data-truely-dark-force] footer,
  html[data-truely-dark-active][data-truely-dark-force] footer.lazy-rendering,
  html[data-truely-dark-active][data-truely-dark-force] .lazy-rendering--footer,
  html[data-truely-dark-active][data-truely-dark-force] .ods-footer,
  html[data-truely-dark-active][data-truely-dark-force] .ods-bottomfooter,
  html[data-truely-dark-active][data-truely-dark-force] .odss-section,
  html[data-truely-dark-active][data-truely-dark-force] .odss-section__content {
    min-height: auto !important;
    max-height: none !important;
    height: auto !important;
    overflow: visible !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] footer,
  html[data-truely-dark-active][data-truely-dark-force] .ods-footer,
  html[data-truely-dark-active][data-truely-dark-force] [class*="ods-footer"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="lazy-rendering--footer"] {
    contain: none !important;
    content-visibility: visible !important;
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
    min-height: auto !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] aside.ovhcloud-menu-navbar,
  html[data-truely-dark-active][data-truely-dark-force] aside[class*="menu-navbar"],
  html[data-truely-dark-active][data-truely-dark-force] .ovhcloud-mainmenu,
  html[data-truely-dark-active][data-truely-dark-force] [class*="menu-navbar"]:not(button):not(a):not(li) {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    max-height: 0 !important;
    min-height: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
    position: absolute !important;
    inset: auto !important;
    opacity: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] aside.ovhcloud-menu-navbar.is-open,
  html[data-truely-dark-active][data-truely-dark-force] aside.ovhcloud-menu-navbar.open,
  html[data-truely-dark-active][data-truely-dark-force] aside.ovhcloud-menu-navbar.visible,
  html[data-truely-dark-active][data-truely-dark-force] aside.ovhcloud-menu-navbar.active,
  html[data-truely-dark-active][data-truely-dark-force] aside.ovhcloud-menu-navbar[open],
  html[data-truely-dark-active][data-truely-dark-force] aside.ovhcloud-menu-navbar[aria-expanded="true"],
  html[data-truely-dark-active][data-truely-dark-force] .ovhcloud-mainmenu.is-open,
  html[data-truely-dark-active][data-truely-dark-force] .ovhcloud-mainmenu.open,
  html[data-truely-dark-active][data-truely-dark-force] .ovhcloud-mainmenu.visible,
  html[data-truely-dark-active][data-truely-dark-force] .ovhcloud-mainmenu.active,
  html[data-truely-dark-active][data-truely-dark-force] .ovhcloud-mainmenu[open],
  html[data-truely-dark-active][data-truely-dark-force] .ovhcloud-mainmenu[aria-expanded="true"],
  html[data-truely-dark-active][data-truely-dark-force] aside[class*="menu-navbar"].is-open,
  html[data-truely-dark-active][data-truely-dark-force] aside[class*="menu-navbar"].open,
  html[data-truely-dark-active][data-truely-dark-force] aside[class*="menu-navbar"].visible,
  html[data-truely-dark-active][data-truely-dark-force] aside[class*="menu-navbar"].active,
  html[data-truely-dark-active][data-truely-dark-force] aside[class*="menu-navbar"][open],
  html[data-truely-dark-active][data-truely-dark-force] aside[class*="menu-navbar"][aria-expanded="true"],
  html[data-truely-dark-active][data-truely-dark-force] .ods-header-universe:has([aria-expanded="true"]) aside.ovhcloud-menu-navbar,
  html[data-truely-dark-active][data-truely-dark-force] .ods-header-universe:has([aria-expanded="true"]) .ovhcloud-mainmenu,
  html[data-truely-dark-active][data-truely-dark-force] .ods-header-universe:has(.is-open) aside.ovhcloud-menu-navbar,
  html[data-truely-dark-active][data-truely-dark-force] .ods-header-universe:has(.is-open) .ovhcloud-mainmenu,
  html[data-truely-dark-active][data-truely-dark-force] .ods-header-universe:has([data-state="open"]) aside.ovhcloud-menu-navbar,
  html[data-truely-dark-active][data-truely-dark-force] .ods-header-universe:has([data-state="open"]) .ovhcloud-mainmenu {
    display: block !important;
    visibility: visible !important;
    height: auto !important;
    max-height: 90vh !important;
    min-height: unset !important;
    overflow: auto !important;
    pointer-events: auto !important;
    position: fixed !important;
    inset: auto !important;
    opacity: 1 !important;
    background-color: var(--truely-dark-bg, ${FORCE_MARKETING_BG}) !important;
    z-index: 303 !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] section[class*="homepage"],
  html[data-truely-dark-active][data-truely-dark-force] .homepage-hero,
  html[data-truely-dark-active][data-truely-dark-force] [data-ods-domain-form],
  html[data-truely-dark-active][data-truely-dark-force] [data-domain-wrapper],
  html[data-truely-dark-active][data-truely-dark-force] [data-domain-cards],
  html[data-truely-dark-active][data-truely-dark-force] .domain-search-header-form,
  html[data-truely-dark-active][data-truely-dark-force] .domain-search-input,
  html[data-truely-dark-active][data-truely-dark-force] .ods-domain-form-no-bulk,
  html[data-truely-dark-active][data-truely-dark-force] .ods-domain-form__highlights,
  html[data-truely-dark-active][data-truely-dark-force] .ods-domain-form__tld,
  html[data-truely-dark-active][data-truely-dark-force] .odss-section--light-blue,
  html[data-truely-dark-active][data-truely-dark-force] .odss-section--blue,
  html[data-truely-dark-active][data-truely-dark-force] .odss-section__content,
  html[data-truely-dark-active][data-truely-dark-force] .odss-slider__slide,
  html[data-truely-dark-active][data-truely-dark-force] .odss-slider__viewport,
  html[data-truely-dark-active][data-truely-dark-force] .odss-slider__container,
  html[data-truely-dark-active][data-truely-dark-force] [class*="domain-search"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="DomainSearch"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="domain-name"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="search-domain"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="homepage-search"],
  html[data-truely-dark-active][data-truely-dark-force] section[class*="domain"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="partner"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Partner"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="customers"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Customers"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="logo-strip"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="logo-list"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="brands"],
  html[data-truely-dark-active][data-truely-dark-force] .ods-footer,
  html[data-truely-dark-active][data-truely-dark-force] .ods-bottomfooter,
  html[data-truely-dark-active][data-truely-dark-force] [class*="site-footer"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="SiteFooter"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="subfooter"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="sub-footer"] {
    background-color: var(--truely-dark-bg, ${FORCE_MARKETING_BG}) !important;
    background-image: none !important;
    color: #e8eaed !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] section[data-custom-gradient-start],
  html[data-truely-dark-active][data-truely-dark-force] section.odss-section--light-blue,
  html[data-truely-dark-active][data-truely-dark-force] section.odss-section--blue {
    --section-custom-gradient-start: var(--truely-dark-bg, ${FORCE_MARKETING_BG}) !important;
    --section-custom-gradient-end: var(--truely-dark-bg, ${FORCE_MARKETING_BG}) !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] .ods-domain-form__tld,
  html[data-truely-dark-active][data-truely-dark-force] .ods-domain-form__tld__name,
  html[data-truely-dark-active][data-truely-dark-force] .ods-domain-form__tld .price-value,
  html[data-truely-dark-active][data-truely-dark-force] .ods-domain-form__tld .price-suffix,
  html[data-truely-dark-active][data-truely-dark-force] .ods-domain-form__tld .tax-excluded-price,
  html[data-truely-dark-active][data-truely-dark-force] .ods-domain-form__tld .base-price,
  html[data-truely-dark-active][data-truely-dark-force] [class*="domain-search"] *,
  html[data-truely-dark-active][data-truely-dark-force] [class*="DomainSearch"] *,
  html[data-truely-dark-active][data-truely-dark-force] [data-ods-domain-form] *,
  html[data-truely-dark-active][data-truely-dark-force] .odss-section--light-blue *,
  html[data-truely-dark-active][data-truely-dark-force] .odss-slider__slide *,
  html[data-truely-dark-active][data-truely-dark-force] [class*="partner"] *,
  html[data-truely-dark-active][data-truely-dark-force] [class*="Partner"] *,
  html[data-truely-dark-active][data-truely-dark-force] [class*="customers"] *,
  html[data-truely-dark-active][data-truely-dark-force] [class*="Customers"] * {
    color: #e8eaed !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] [class*="partner"] img,
  html[data-truely-dark-active][data-truely-dark-force] [class*="Partner"] img,
  html[data-truely-dark-active][data-truely-dark-force] [class*="customers"] img,
  html[data-truely-dark-active][data-truely-dark-force] [class*="Customers"] img,
  html[data-truely-dark-active][data-truely-dark-force] [class*="logo-strip"] img,
  html[data-truely-dark-active][data-truely-dark-force] [class*="brands"] img {
    background-color: transparent !important;
    filter: none !important;
    -webkit-filter: none !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] .ods-footer__menu,
  html[data-truely-dark-active][data-truely-dark-force] .ods-footer__menu__item,
  html[data-truely-dark-active][data-truely-dark-force] .ods-footer__menu__item__block,
  html[data-truely-dark-active][data-truely-dark-force] .ods-bottomfooter__menu,
  html[data-truely-dark-active][data-truely-dark-force] .ods-bottomfooter__menu__item {
    background-color: var(--truely-dark-bg, ${FORCE_MARKETING_BG}) !important;
    background-image: none !important;
    color: #e8eaed !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] .ods-footer__link,
  html[data-truely-dark-active][data-truely-dark-force] .ods-footer__menu__item__title,
  html[data-truely-dark-active][data-truely-dark-force] .ods-bottomfooter__menu__item a,
  html[data-truely-dark-active][data-truely-dark-force] .ods-bottomfooter__menu__item span {
    color: #e8eaed !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] [class*="mainmenu"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Mainmenu"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="mega-menu"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="MegaMenu"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="megamenu"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="overlay"]:not(.redirection-banners):not([class*="redirection"]),
  html[data-truely-dark-active][data-truely-dark-force] [class*="Overlay"]:not([class*="redirection"]),
  html[data-truely-dark-active][data-truely-dark-force] [aria-hidden="true"],
  html[data-truely-dark-active][data-truely-dark-force] [hidden] {
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    pointer-events: none !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] [class*="logo"] img,
  html[data-truely-dark-active][data-truely-dark-force] [class*="Logo"] img {
    background-color: transparent !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] .otds-button .button,
  html[data-truely-dark-active][data-truely-dark-force] .otds-button button,
  html[data-truely-dark-active][data-truely-dark-force] .button__centered-text {
    background-color: #0050d7 !important;
    color: #fff !important;
    border-color: #0050d7 !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] .oui-cta--primary,
  html[data-truely-dark-active][data-truely-dark-force] a.oui-cta--primary,
  html[data-truely-dark-active][data-truely-dark-force] .oui-cta.oui-cta--primary {
    background-color: #0050d7 !important;
    color: #fff !important;
    border-color: #0050d7 !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] .oui-cta--primary *,
  html[data-truely-dark-active][data-truely-dark-force] a.oui-cta--primary * {
    color: #fff !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] .oui-cta--link,
  html[data-truely-dark-active][data-truely-dark-force] a.oui-cta--link {
    background-color: transparent !important;
    color: #8ab4f8 !important;
    border-color: transparent !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] button.oui-back-to-top,
  html[data-truely-dark-active][data-truely-dark-force] button.oui-back-to-top.position-fixed,
  html[data-truely-dark-active][data-truely-dark-force] .oui-back-to-top {
    background-color: #1a1a2e !important;
    background: #1a1a2e !important;
    color: #e8eaed !important;
    border: 1px solid #3c4043 !important;
    filter: none !important;
    -webkit-filter: none !important;
    box-shadow: none !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] .oui-back-to-top__icon {
    color: #e8eaed !important;
    filter: none !important;
    -webkit-filter: none !important;
  }
`;

/** Apple force Soft — dark promo surfaces, images stay natural (no invert). */
const APPLE_FORCE_CSS = `
  html[data-truely-dark-active][data-truely-dark-force] [class*="ribbon"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Ribbon"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="donation"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="Donation"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="globalmessage"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="GlobalMessage"],
  html[data-truely-dark-active][data-truely-dark-force] .ac-ls-promo,
  html[data-truely-dark-active][data-truely-dark-force] [class*="ac-ls"],
  html[data-truely-dark-active][data-truely-dark-force] #ac-localnav,
  html[data-truely-dark-active][data-truely-dark-force] [class*="localnav"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="promo-strip"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="PromoStrip"],
  html[data-truely-dark-active][data-truely-dark-force] body > div[class*="banner"]:not([class*="unit"]),
  html[data-truely-dark-active][data-truely-dark-force] section[class*="banner"]:not(.unit):not([class*="hero"]) {
    background-color: #1d1d1f !important;
    background-image: none !important;
    color: #f5f5f7 !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] [class*="ribbon"] *,
  html[data-truely-dark-active][data-truely-dark-force] [class*="donation"] *,
  html[data-truely-dark-active][data-truely-dark-force] [class*="globalmessage"] *,
  html[data-truely-dark-active][data-truely-dark-force] .ac-ls-promo *,
  html[data-truely-dark-active][data-truely-dark-force] [class*="ac-ls"] * {
    color: #f5f5f7 !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] #globalnav,
  html[data-truely-dark-active][data-truely-dark-force] .globalnav,
  html[data-truely-dark-active][data-truely-dark-force] nav.globalnav {
    background-color: #1d1d1f !important;
    background-image: none !important;
    max-height: 3rem !important;
    overflow: visible !important;
    color: #f5f5f7 !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] #main,
  html[data-truely-dark-active][data-truely-dark-force] #main > section,
  html[data-truely-dark-active][data-truely-dark-force] section.unit,
  html[data-truely-dark-active][data-truely-dark-force] .unit,
  html[data-truely-dark-active][data-truely-dark-force] [class*="unit"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="tile"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="promo"],
  html[data-truely-dark-active][data-truely-dark-force] section[class*="module"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="module"],
  html[data-truely-dark-active][data-truely-dark-force] [class*="rf-cc"],
  html[data-truely-dark-active][data-truely-dark-force] [data-module-name],
  html[data-truely-dark-active][data-truely-dark-force] [data-analytics-region*="promo"],
  html[data-truely-dark-active][data-truely-dark-force] main > div {
    background-color: #121212 !important;
    background-image: none !important;
    color: #f5f5f7 !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] [class*="unit"] h2,
  html[data-truely-dark-active][data-truely-dark-force] [class*="unit"] h3,
  html[data-truely-dark-active][data-truely-dark-force] [class*="tile"] h2,
  html[data-truely-dark-active][data-truely-dark-force] [class*="promo"] h2,
  html[data-truely-dark-active][data-truely-dark-force] [class*="unit"] p,
  html[data-truely-dark-active][data-truely-dark-force] [class*="tile"] p,
  html[data-truely-dark-active][data-truely-dark-force] [class*="promo"] p {
    color: #f5f5f7 !important;
  }
  html[data-truely-dark-active][data-truely-dark-force] [class*="unit"] img,
  html[data-truely-dark-active][data-truely-dark-force] [class*="tile"] img,
  html[data-truely-dark-active][data-truely-dark-force] [class*="promo"] img,
  html[data-truely-dark-active][data-truely-dark-force] picture,
  html[data-truely-dark-active][data-truely-dark-force] video,
  html[data-truely-dark-active][data-truely-dark-force] source {
    background-color: transparent !important;
    filter: none !important;
    -webkit-filter: none !important;
  }
`;

/** Invert Soft supplement — wikipedia.org footer/navbox under invert Soft. */
const WIKIPEDIA_INVERT_SURFACE_CSS = `
  html[data-truely-dark-active] body .navbox,
  html[data-truely-dark-active] body .navbox-inner,
  html[data-truely-dark-active] body .navbox-title,
  html[data-truely-dark-active] body .navbox-list,
  html[data-truely-dark-active] body table.navbox,
  html[data-truely-dark-active] body .navbox th,
  html[data-truely-dark-active] body .navbox td {
    background-color: #1a1a1a !important;
    background-image: none !important;
    filter: ${INVERT_COUNTER_FILTER} !important;
    -webkit-filter: ${INVERT_COUNTER_FILTER} !important;
    color: #e8eaed !important;
    border-color: #3c4043 !important;
  }
  html[data-truely-dark-active] body #footer,
  html[data-truely-dark-active] body footer#footer,
  html[data-truely-dark-active] body .mw-footer,
  html[data-truely-dark-active] body footer.mw-footer,
  html[data-truely-dark-active] body .footer-info,
  html[data-truely-dark-active] body #footer-info,
  html[data-truely-dark-active] body #footer-info-lastmod,
  html[data-truely-dark-active] body #footer-info-copyright,
  html[data-truely-dark-active] body #footer-info-poweredby,
  html[data-truely-dark-active] body #footer-info-viewport,
  html[data-truely-dark-active] body [id^="footer-info"],
  html[data-truely-dark-active] body #mw-data-after-content,
  html[data-truely-dark-active] body .post-content,
  html[data-truely-dark-active] body .mw-portlet-footer,
  html[data-truely-dark-active] body #lastmod,
  html[data-truely-dark-active] body .lastmod,
  html[data-truely-dark-active] body #footer-info-text,
  html[data-truely-dark-active] body .footer-info-text,
  html[data-truely-dark-active] body .license,
  html[data-truely-dark-active] body #footer li,
  html[data-truely-dark-active] body #footer ul,
  html[data-truely-dark-active] body .mw-footer li,
  html[data-truely-dark-active] body .mw-footer ul,
  html[data-truely-dark-active] body #footer-info li,
  html[data-truely-dark-active] body #footer-info ul,
  html[data-truely-dark-active] body .footer-info li,
  html[data-truely-dark-active] body .footer-info ul,
  html[data-truely-dark-active] body [id*="footer"],
  html[data-truely-dark-active] body [class*="footer"] {
    background-color: ${FORCE_MARKETING_BG} !important;
    background-image: none !important;
    filter: ${INVERT_COUNTER_FILTER} !important;
    -webkit-filter: ${INVERT_COUNTER_FILTER} !important;
    color: #e8eaed !important;
    border-color: #3c4043 !important;
  }
  html[data-truely-dark-active] body #footer *,
  html[data-truely-dark-active] body .mw-footer *,
  html[data-truely-dark-active] body #footer-info *,
  html[data-truely-dark-active] body [id^="footer-info"] *,
  html[data-truely-dark-active] body .footer-info *,
  html[data-truely-dark-active] body .license *,
  html[data-truely-dark-active] body #lastmod *,
  html[data-truely-dark-active] body .lastmod *,
  html[data-truely-dark-active] body #mw-data-after-content * {
    color: #e8eaed !important;
  }
  html[data-truely-dark-active] body .mw-footer img,
  html[data-truely-dark-active] body #footer img,
  html[data-truely-dark-active] body .footer-info img {
    background-color: transparent !important;
    filter: ${INVERT_COUNTER_FILTER} !important;
    -webkit-filter: ${INVERT_COUNTER_FILTER} !important;
  }
`;

const GOOGLE_DOCS_CSS = `
  .docs-material,
  #docs-chrome,
  .docs-titlebar,
  .docs-bars,
  .goog-menu,
  .goog-toolbar,
  .kix-appview-editor {
    background-color: transparent !important;
  }
  .docs-material .goog-toolbar-button,
  #docs-toolbar-wrapper {
    color-scheme: dark;
  }
`;

const GOOGLE_SHEETS_CSS = `
  #docs-chrome,
  .docs-material,
  .docs-bars,
  .grid-container,
  .waffle,
  #sheets-viewport {
    background-color: transparent !important;
  }
  .grid-container {
    color-scheme: dark;
  }
`;

const GOOGLE_SEARCH_CSS = `
  html[data-truely-dark-active] #searchform,
  html[data-truely-dark-active] .RNNXgb,
  html[data-truely-dark-active] header,
  html[data-truely-dark-active] #gb {
    background-color: transparent !important;
  }
`;

const YOUTUBE_FORCE_CSS = `
  html[data-truely-dark-active],
  html[data-truely-dark-active][dark],
  html[data-truely-dark-active][darker-dark-theme] {
    --truely-dark-bg: #0f0f0f;
    --yt-spec-base-background: #0f0f0f !important;
    --yt-spec-raised-background: #212121 !important;
    --yt-spec-menu-background: #212121 !important;
    --yt-spec-text-primary: #f1f1f1 !important;
    --yt-spec-text-secondary: #aaaaaa !important;
    --yt-spec-general-background-a: #0f0f0f !important;
    --yt-spec-general-background-b: #0f0f0f !important;
    --yt-spec-brand-background-solid: #0f0f0f !important;
    --ytd-searchbox-background: #121212 !important;
    --ytd-searchbox-legacy-button-color: #f1f1f1 !important;
    --ytd-searchbox-legacy-button-border-color: #3f3f3f !important;
    --ytd-searchbox-text-color: #f1f1f1 !important;
    color-scheme: dark !important;
  }
  html[data-truely-dark-active],
  html[data-truely-dark-active] body {
    background-color: var(--truely-dark-bg, #0f0f0f) !important;
    background-image: none !important;
    color: #f1f1f1 !important;
  }
  html[data-truely-dark-active] ytd-app,
  html[data-truely-dark-active] #content,
  html[data-truely-dark-active] #background,
  html[data-truely-dark-active] ytd-app #background,
  html[data-truely-dark-active] ytd-stateful-shell,
  html[data-truely-dark-active] ytd-page-manager,
  html[data-truely-dark-active] ytd-browse,
  html[data-truely-dark-active] ytd-two-column-browse-results-renderer,
  html[data-truely-dark-active] #page-manager,
  html[data-truely-dark-active] ytd-rich-grid-renderer,
  html[data-truely-dark-active] ytd-section-list-renderer,
  html[data-truely-dark-active] #primary,
  html[data-truely-dark-active] #primary-inner,
  html[data-truely-dark-active] #guide,
  html[data-truely-dark-active] ytd-guide-renderer,
  html[data-truely-dark-active] ytd-mini-guide-renderer {
    background-color: var(--truely-dark-bg, #0f0f0f) !important;
    background-image: none !important;
    color: #f1f1f1 !important;
  }
  html[data-truely-dark-active] #masthead,
  html[data-truely-dark-active] ytd-masthead,
  html[data-truely-dark-active] #header,
  html[data-truely-dark-active] ytd-app #masthead-container,
  html[data-truely-dark-active] #masthead-container {
    background-color: #0f0f0f !important;
    background-image: none !important;
  }
  html[data-truely-dark-active] #search,
  html[data-truely-dark-active] ytd-searchbox,
  html[data-truely-dark-active] ytd-searchbox #container,
  html[data-truely-dark-active] ytd-searchbox input,
  html[data-truely-dark-active] input#search,
  html[data-truely-dark-active] form#search-form,
  html[data-truely-dark-active] #search-input #search,
  html[data-truely-dark-active] ytd-searchbox .ytSearchboxComponentInputBox,
  html[data-truely-dark-active] ytd-searchbox .ytSearchboxComponentInputBoxDark {
    background-color: #121212 !important;
    color: #f1f1f1 !important;
    border-color: #3f3f3f !important;
  }
  html[data-truely-dark-active] ytd-topbar-menu-button-renderer,
  html[data-truely-dark-active] ytd-button-renderer,
  html[data-truely-dark-active] #buttons ytd-button-renderer,
  html[data-truely-dark-active] .yt-spec-button-shape-next,
  html[data-truely-dark-active] tp-yt-paper-button,
  html[data-truely-dark-active] yt-icon-button {
    color: #f1f1f1 !important;
  }
  html[data-truely-dark-active] .yt-spec-button-shape-next--call-to-action,
  html[data-truely-dark-active] ytd-button-renderer.style-scope.ytd-masthead,
  html[data-truely-dark-active] #sign-in-button {
    background-color: #065fd4 !important;
    color: #fff !important;
  }
  html[data-truely-dark-active] ytd-message-renderer,
  html[data-truely-dark-active] ytd-message-renderer #content,
  html[data-truely-dark-active] ytd-message-renderer #title,
  html[data-truely-dark-active] ytd-message-renderer #message,
  html[data-truely-dark-active] ytd-message-renderer yt-formatted-string,
  html[data-truely-dark-active] ytd-message-renderer #title yt-formatted-string,
  html[data-truely-dark-active] #title.ytd-message-renderer,
  html[data-truely-dark-active] #message.ytd-message-renderer,
  html[data-truely-dark-active] ytd-browse h1,
  html[data-truely-dark-active] ytd-browse h2,
  html[data-truely-dark-active] ytd-browse h3,
  html[data-truely-dark-active] yt-formatted-string {
    background-color: var(--truely-dark-bg, #0f0f0f) !important;
    color: #f1f1f1 !important;
    -webkit-text-fill-color: #f1f1f1 !important;
  }
  html[data-truely-dark-active] img,
  html[data-truely-dark-active] video,
  html[data-truely-dark-active] ytd-thumbnail,
  html[data-truely-dark-active] #thumbnail,
  html[data-truely-dark-active] yt-image,
  html[data-truely-dark-active] ytd-thumbnail img {
    filter: none !important;
    -webkit-filter: none !important;
    background-color: transparent !important;
  }
`;

const CHROME_WEB_STORE_CSS = `
  html[data-truely-dark-active] {
    --truely-dark-bg: #121212;
    color-scheme: dark !important;
  }
  html[data-truely-dark-active],
  html[data-truely-dark-active] body {
    background-color: var(--truely-dark-bg, #121212) !important;
    background-image: none !important;
    color: #e8eaed !important;
  }
  html[data-truely-dark-active] c-wiz,
  html[data-truely-dark-active] main,
  html[data-truely-dark-active] #root,
  html[data-truely-dark-active] [role="main"],
  html[data-truely-dark-active] header,
  html[data-truely-dark-active] nav,
  html[data-truely-dark-active] section,
  html[data-truely-dark-active] article,
  html[data-truely-dark-active] [class*="card"],
  html[data-truely-dark-active] [class*="Card"] {
    background-color: var(--truely-dark-bg, #121212) !important;
    background-image: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    color: #e8eaed !important;
    isolation: auto !important;
  }
  html[data-truely-dark-active] h1,
  html[data-truely-dark-active] h2,
  html[data-truely-dark-active] h3,
  html[data-truely-dark-active] p,
  html[data-truely-dark-active] span,
  html[data-truely-dark-active] a {
    color: #e8eaed !important;
  }
`;

const XAI_FORCE_CSS = `
  html[data-truely-dark-active] {
    --truely-dark-bg: #0a0a0a;
  }
  html[data-truely-dark-active] header,
  html[data-truely-dark-active] nav,
  html[data-truely-dark-active] [role="banner"],
  html[data-truely-dark-active] [class*="logo"],
  html[data-truely-dark-active] [class*="Logo"],
  html[data-truely-dark-active] [class*="navbar"],
  html[data-truely-dark-active] [class*="Navbar"],
  html[data-truely-dark-active] [class*="header"],
  html[data-truely-dark-active] [class*="Header"] {
    background-color: #0a0a0a !important;
    background-image: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    color: #e8eaed !important;
  }
  html[data-truely-dark-active] [class*="pricing"],
  html[data-truely-dark-active] [class*="Pricing"],
  html[data-truely-dark-active] [class*="plan"],
  html[data-truely-dark-active] [class*="Plan"],
  html[data-truely-dark-active] [class*="tier"],
  html[data-truely-dark-active] [class*="Tier"],
  html[data-truely-dark-active] [class*="feature"],
  html[data-truely-dark-active] [class*="Feature"],
  html[data-truely-dark-active] [class*="compare"],
  html[data-truely-dark-active] [class*="Compare"] {
    background-color: #141414 !important;
    background-image: none !important;
    color: #e8eaed !important;
  }
  html[data-truely-dark-active] [class*="compare"][class*="sticky"],
  html[data-truely-dark-active] [class*="Compare"][class*="sticky"],
  html[data-truely-dark-active] [class*="sticky"][class*="compare"],
  html[data-truely-dark-active] [class*="sticky"][class*="Compare"],
  html[data-truely-dark-active] [class*="plan-comparison"],
  html[data-truely-dark-active] [class*="PlanComparison"],
  html[data-truely-dark-active] [class*="comparison-header"],
  html[data-truely-dark-active] [class*="ComparisonHeader"],
  html[data-truely-dark-active] [class*="sticky-header"],
  html[data-truely-dark-active] [class*="StickyHeader"],
  html[data-truely-dark-active] [class*="compare"] thead,
  html[data-truely-dark-active] [class*="Compare"] thead,
  html[data-truely-dark-active] [class*="compare"] th,
  html[data-truely-dark-active] [class*="Compare"] th,
  html[data-truely-dark-active] [class*="compare"] [role="row"],
  html[data-truely-dark-active] [class*="Compare"] [role="row"] {
    background-color: #0a0a0a !important;
    background-image: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    color: #e8eaed !important;
    opacity: 1 !important;
  }
  html[data-truely-dark-active] [class*="compare"] th *,
  html[data-truely-dark-active] [class*="Compare"] th *,
  html[data-truely-dark-active] [class*="compare"] thead *,
  html[data-truely-dark-active] [class*="Compare"] thead *,
  html[data-truely-dark-active] [class*="sticky"][class*="compare"] *,
  html[data-truely-dark-active] [class*="sticky"][class*="Compare"] * {
    color: #e8eaed !important;
  }
  html[data-truely-dark-active] main [class*="sticky"],
  html[data-truely-dark-active] main [style*="position: sticky"],
  html[data-truely-dark-active] main [style*="position:sticky"],
  html[data-truely-dark-active] section [class*="sticky"],
  html[data-truely-dark-active] section [style*="position: sticky"],
  html[data-truely-dark-active] section [style*="position:sticky"],
  html[data-truely-dark-active] main [role="row"],
  html[data-truely-dark-active] main [role="rowgroup"] [role="row"],
  html[data-truely-dark-active] main [role="columnheader"],
  html[data-truely-dark-active] [class*="feature"] [class*="sticky"],
  html[data-truely-dark-active] [class*="Feature"] [class*="sticky"],
  html[data-truely-dark-active] [class*="pricing"] [class*="sticky"],
  html[data-truely-dark-active] [class*="Pricing"] [class*="sticky"],
  html[data-truely-dark-active] table thead,
  html[data-truely-dark-active] table thead tr,
  html[data-truely-dark-active] table thead th,
  html[data-truely-dark-active] thead,
  html[data-truely-dark-active] thead tr,
  html[data-truely-dark-active] thead th,
  html[data-truely-dark-active] table [class*="sticky"],
  html[data-truely-dark-active] table [class*="Sticky"],
  html[data-truely-dark-active] table [style*="sticky"] {
    background-color: #0a0a0a !important;
    background-image: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    color: #e8eaed !important;
    opacity: 1 !important;
  }
  html[data-truely-dark-active] main [class*="sticky"] *,
  html[data-truely-dark-active] main [style*="position: sticky"] *,
  html[data-truely-dark-active] main [style*="position:sticky"] *,
  html[data-truely-dark-active] section [class*="sticky"] *,
  html[data-truely-dark-active] section [style*="position: sticky"] *,
  html[data-truely-dark-active] section [style*="position:sticky"] *,
  html[data-truely-dark-active] main [role="row"] *,
  html[data-truely-dark-active] main [role="rowgroup"] [role="row"] *,
  html[data-truely-dark-active] main [role="columnheader"] *,
  html[data-truely-dark-active] table thead *,
  html[data-truely-dark-active] thead th * {
    color: #e8eaed !important;
    opacity: 1 !important;
  }
  html[data-truely-dark-active] .sticky-section-header,
  html[data-truely-dark-active] .sticky-section-header * {
    background: #0a0a0a !important;
    background-color: #0a0a0a !important;
    background-image: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    color: #e8eaed !important;
    opacity: 1 !important;
    isolation: auto !important;
    mix-blend-mode: normal !important;
  }
  html[data-truely-dark-active] .sticky-section-header::before,
  html[data-truely-dark-active] .sticky-section-header::after {
    background: none !important;
    background-color: transparent !important;
    background-image: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    opacity: 0 !important;
    mix-blend-mode: normal !important;
    content: none !important;
  }
  html[data-truely-dark-active] [class*="cookie"],
  html[data-truely-dark-active] [class*="Cookie"],
  html[data-truely-dark-active] [class*="consent"],
  html[data-truely-dark-active] [class*="Consent"],
  html[data-truely-dark-active] [id*="cookie"],
  html[data-truely-dark-active] [id*="Cookie"],
  html[data-truely-dark-active] [class*="onetrust"],
  html[data-truely-dark-active] #onetrust-banner-sdk,
  html[data-truely-dark-active] .ot-sdk-container,
  html[data-truely-dark-active] [class*="banner"][class*="cookie"],
  html[data-truely-dark-active] [class*="privacy"],
  html[data-truely-dark-active] [class*="Privacy"],
  html[data-truely-dark-active] [class*="gdpr"],
  html[data-truely-dark-active] [class*="Gdpr"],
  html[data-truely-dark-active] [class*="notice"],
  html[data-truely-dark-active] [class*="Notice"],
  html[data-truely-dark-active] [class*="cookie-banner"],
  html[data-truely-dark-active] [class*="CookieBanner"] {
    background-color: #141414 !important;
    background-image: none !important;
    color: #e8eaed !important;
    border-color: #3c4043 !important;
  }
  html[data-truely-dark-active] [class*="cookie"] *,
  html[data-truely-dark-active] [class*="Cookie"] *,
  html[data-truely-dark-active] [class*="consent"] *,
  html[data-truely-dark-active] [class*="Consent"] *,
  html[data-truely-dark-active] [class*="privacy"] *,
  html[data-truely-dark-active] [class*="Privacy"] *,
  html[data-truely-dark-active] #onetrust-banner-sdk *,
  html[data-truely-dark-active] [class*="cookie-banner"] *,
  html[data-truely-dark-active] [class*="CookieBanner"] * {
    color: #e8eaed !important;
  }
  html[data-truely-dark-active] [class*="cookie"] button,
  html[data-truely-dark-active] [class*="consent"] button,
  html[data-truely-dark-active] [class*="privacy"] button,
  html[data-truely-dark-active] [class*="cookie-banner"] button,
  html[data-truely-dark-active] [class*="CookieBanner"] button {
    background-color: #1a1a1a !important;
    color: #e8eaed !important;
    border-color: #3c4043 !important;
  }
  html[data-truely-dark-active] [class*="cookie"] button[class*="primary"],
  html[data-truely-dark-active] [class*="consent"] button[class*="primary"],
  html[data-truely-dark-active] [class*="cookie"] button:last-of-type,
  html[data-truely-dark-active] [class*="consent"] button:last-of-type {
    background-color: #e8eaed !important;
    color: #0a0a0a !important;
  }
  html[data-truely-dark-active] div[class*="fixed"][class*="bottom"],
  html[data-truely-dark-active] div[class*="fixed"][class*="right"],
  html[data-truely-dark-active] [class*="bg-white"],
  html[data-truely-dark-active] [class*="bg-neutral-"],
  html[data-truely-dark-active] [class*="bg-gray-"],
  html[data-truely-dark-active] [class*="bg-zinc-"] {
    background-color: #141414 !important;
    background-image: none !important;
    color: #e8eaed !important;
    border-color: #3c4043 !important;
  }
  html[data-truely-dark-active] div[class*="fixed"][class*="bottom"] *,
  html[data-truely-dark-active] div[class*="fixed"][class*="right"] *,
  html[data-truely-dark-active] [class*="bg-white"] *,
  html[data-truely-dark-active] [class*="text-gray-"],
  html[data-truely-dark-active] [class*="text-neutral-"] {
    color: #e8eaed !important;
  }
`;

const OVH_FORCE_PACK_CSS = `${REDIRECTION_BANNER_KILL_CSS}${FORCE_FORM_SURFACE_CSS}${OVH_FORCE_CSS}`;

const GITHUB_CSS = `
  .js-navigation-container,
  .Header,
  header.AppHeader {
    background-color: transparent !important;
  }
`;

const REDDIT_CSS = `
  shreddit-app,
  #SHORTCUT_FOCUSABLE_DIV {
    background-color: transparent !important;
  }
`;

const AMAZON_CSS = `
  #navbar,
  #nav-belt,
  #nav-main {
    background-color: transparent !important;
  }
`;

const LINKEDIN_CSS = `
  header,
  .global-nav,
  .scaffold-layout__toolbar {
    background-color: transparent !important;
  }
`;

/**
 * Site-specific rules for top sites that need special handling.
 * Order: more specific hostnames first when overlapping packs matter.
 */
export const SITE_PACKS: SitePack[] = [
  {
    origins: ['chromewebstore.google.com'],
    mode: 'auto',
    skipDetect: false,
    injectCssFallback: true,
    requiresVisualVerify: true,
    preferForceStylesheet: true,
    forceStylesheetFallback: true,
    customCss: CHROME_WEB_STORE_CSS,
  },
  {
    origins: ['chrome.google.com'],
    mode: 'auto',
    skipDetect: false,
    injectCssFallback: true,
    requiresVisualVerify: true,
    preferForceStylesheet: true,
    forceStylesheetFallback: true,
    customCss: CHROME_WEB_STORE_CSS,
  },
  {
    origins: ['docs.google.com'],
    mode: 'soft',
    skipDetect: true,
    preserveMedia: false,
    customCss: GOOGLE_DOCS_CSS,
  },
  {
    origins: ['sheets.google.com'],
    mode: 'soft',
    skipDetect: true,
    preserveMedia: false,
    customCss: GOOGLE_SHEETS_CSS,
  },
  {
    origins: ['drive.google.com'],
    mode: 'auto',
    skipDetect: false,
  },
  {
    origins: ['google.com', 'www.google.com'],
    mode: 'auto',
    skipDetect: false,
    customCss: GOOGLE_SEARCH_CSS,
  },
  {
    origins: ['apple.com', 'www.apple.com'],
    mode: 'auto',
    skipDetect: false,
    preferForceStylesheet: true,
    customCss: APPLE_FORCE_CSS,
  },
  {
    origins: ['wikipedia.org'],
    mode: 'auto',
    skipDetect: false,
    invertOnlyCustomCss: WIKIPEDIA_INVERT_SURFACE_CSS,
  },
  {
    origins: ['github.com', 'www.github.com'],
    mode: 'auto',
    skipDetect: false,
    customCss: GITHUB_CSS,
  },
  {
    origins: ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
    mode: 'auto',
    skipDetect: false,
    injectCssFallback: true,
    preferForceStylesheet: true,
    requiresVisualVerify: true,
    forceStylesheetFallback: true,
    customCss: YOUTUBE_FORCE_CSS,
  },
  {
    origins: ['twitter.com', 'www.twitter.com'],
    mode: 'auto',
    skipDetect: false,
  },
  {
    origins: ['x.ai', 'www.x.ai'],
    mode: 'auto',
    skipDetect: false,
    requiresVisualVerify: true,
    preferForceStylesheet: true,
    forceStylesheetFallback: true,
    customCss: XAI_FORCE_CSS,
  },
  {
    origins: ['x.com', 'www.x.com'],
    mode: 'auto',
    skipDetect: false,
  },
  {
    origins: ['reddit.com', 'www.reddit.com', 'old.reddit.com'],
    mode: 'auto',
    skipDetect: false,
    customCss: REDDIT_CSS,
  },
  {
    origins: ['stackoverflow.com', 'www.stackoverflow.com'],
    mode: 'auto',
    skipDetect: false,
  },
  {
    origins: ['ovhcloud.com', 'www.ovhcloud.com'],
    mode: 'soft',
    skipDetect: true,
    requiresVisualVerify: true,
    preferForceStylesheet: true,
    forceStylesheetFallback: true,
    customCss: OVH_FORCE_PACK_CSS,
  },
  {
    origins: ['amazon.com', 'www.amazon.com'],
    mode: 'auto',
    skipDetect: false,
    customCss: AMAZON_CSS,
  },
  {
    origins: ['linkedin.com', 'www.linkedin.com'],
    mode: 'auto',
    skipDetect: false,
    customCss: LINKEDIN_CSS,
  },
  {
    origins: ['medium.com', 'www.medium.com'],
    mode: 'auto',
    skipDetect: false,
    preferForceStylesheet: true,
    requiresVisualVerify: true,
  },
  {
    origins: ['notion.so', 'www.notion.so'],
    mode: 'auto',
    skipDetect: false,
  },
  {
    origins: ['linear.app'],
    mode: 'auto',
    skipDetect: false,
  },
];

export function findSitePack(hostname: string): SitePack | undefined {
  const normalized = hostname.toLowerCase();
  return SITE_PACKS.find((pack) =>
    pack.origins.some((origin) => normalized === origin || normalized.endsWith(`.${origin}`)),
  );
}

export function hostUsesInjectCssFallback(hostname: string): boolean {
  const pack = findSitePack(hostname);
  return pack?.injectCssFallback === true;
}

export function hostRequiresVisualVerify(hostname: string): boolean {
  const pack = findSitePack(hostname);
  return pack?.requiresVisualVerify === true;
}

export function hostUsesForceStylesheetFallback(hostname: string): boolean {
  const pack = findSitePack(hostname);
  return pack?.forceStylesheetFallback === true;
}

export function hostPrefersForceStylesheet(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  for (const suffix of PREFER_FORCE_HOST_SUFFIXES) {
    if (normalized === suffix || normalized.endsWith(`.${suffix}`)) {
      return true;
    }
  }
  const pack = findSitePack(hostname);
  return pack?.preferForceStylesheet === true;
}

/** invertOnlyCustomCss for hosts that use invert Soft (wikipedia.org). */
export function resolveInvertSupplementCss(hostname: string): string | undefined {
  const pack = findSitePack(hostname);
  return pack?.invertOnlyCustomCss;
}

export function hostUsesInvertSupplement(hostname: string): boolean {
  return Boolean(resolveInvertSupplementCss(hostname));
}

export function hostRequiresMarketingVisualVerify(hostname: string): boolean {
  const pack = findSitePack(hostname);
  return pack?.preferForceStylesheet === true && pack?.requiresVisualVerify === true;
}

/** Force-mode bg for marketing hosts — dark surfaces only, never invert pre-bg white. */
export function resolveForceBackgroundColor(
  settings: Pick<EffectiveSiteSettings, 'backgroundColor' | 'sitePack'>,
): string {
  if (settings.sitePack?.preferForceStylesheet) {
    return FORCE_MARKETING_BG;
  }
  return settings.backgroundColor;
}

export function getOriginFromUrl(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

export function getHostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function isExcludedOrigin(hostname: string, siteMode: string): boolean {
  if (siteMode === 'off') return true;
  const pack = findSitePack(hostname);
  return pack?.mode === 'off' || pack?.excludeFromProcessing === true;
}
