import type { DetectConfidence, DetectResult, DetectionOutcome } from '../types';
import {
  computeLuminance,
  cssColorLuminance,
  parseColor,
  rgbByteLuminance,
} from './color';
import { computedFilterHasStrictInvert } from './filter-verify';

export { computeLuminance, parseColor } from './color';

const LIGHT_LUMINANCE_THRESHOLD = 0.7;
const DARK_LUMINANCE_THRESHOLD = 0.35;
const COLORFUL_VARIANCE_THRESHOLD = 0.08;

/** Exported for tests — luminance above this counts as a clearly light surface. */
export const REGION_LIGHT_LUMINANCE = LIGHT_LUMINANCE_THRESHOLD;

/** Exported for tests — luminance below this counts as a clearly dark surface. */
export const REGION_DARK_LUMINANCE = DARK_LUMINANCE_THRESHOLD;

const REGION_GROUPS: ReadonlyArray<{ id: string; selectors: readonly string[] }> = [
  {
    id: 'header',
    selectors: [
      'header',
      '[role="banner"]',
      'nav',
      '.header',
      '#header',
      '.navbar',
      '.navigation',
      '.site-header',
      '.top-bar',
      '.banner',
    ],
  },
  {
    id: 'main',
    selectors: [
      'main',
      '[role="main"]',
      '.hero',
      '.hero-section',
      '#hero',
      'section.hero',
      '.main-content',
      'article',
      '.banner',
      'section:first-of-type',
    ],
  },
  {
    id: 'sidebar',
    selectors: [
      'aside',
      '[role="complementary"]',
      '.sidebar',
      '#sidebar',
      '.side-nav',
      '.sidenav',
      '#mw-navigation',
    ],
  },
  {
    id: 'footer',
    selectors: [
      'footer',
      '[role="contentinfo"]',
      '.footer',
      '#footer',
      '.site-footer',
    ],
  },
];

/** Truely Dark preload paints this — must not count as site-native dark. */
export const EXTENSION_PRELOAD_BG = '#121212';

/** Force Soft marketing palette — MAIN/insertCSS force path, not site-native (x.ai skip). */
export const EXTENSION_FORCE_SOFT_BG = '#0d1117';
export const EXTENSION_FORCE_SOFT_FG = '#e8e8e8';

export const EXTENSION_MARKERS = {
  preloadStyleId: 'truely-dark-preload',
  styleId: 'truely-dark-styles',
  rootAttr: 'data-truely-dark-active',
  forceAttr: 'data-truely-dark-force',
  appShellAttr: 'data-truely-dark-app-shell',
  filterTargetAttr: 'data-truely-dark-filter-target',
} as const;

export interface AuthoredSignalInput {
  dataTheme?: string;
  dataColorMode?: string;
  metaColorScheme?: string;
  /** Resolve data-color-mode="auto" and dual meta schemes. */
  prefersDark?: boolean;
}

function rgbMatchesByteTriplet(
  rgb: { r: number; g: number; b: number },
  r: number,
  g: number,
  b: number,
  tolerance = 1,
): boolean {
  return (
    Math.abs(rgb.r - r) <= tolerance &&
    Math.abs(rgb.g - g) <= tolerance &&
    Math.abs(rgb.b - b) <= tolerance
  );
}

/** FOUC preload #121212 — never site-native dark. */
export function isExtensionPreloadBackground(color: string | undefined): boolean {
  if (!color) return false;
  const rgb = parseColor(color);
  if (!rgb) return false;
  return rgbMatchesByteTriplet(rgb, 18, 18, 18);
}

/** Force Soft marketing bg #0d1117 — Truely Dark MAIN/insertCSS paint, not native x.ai (#0a0a0a). */
export function isExtensionForceSoftBackground(color: string | undefined): boolean {
  if (!color) return false;
  const rgb = parseColor(color);
  if (!rgb) return false;
  return rgbMatchesByteTriplet(rgb, 13, 17, 23);
}

/** Force Soft marketing fg #e8e8e8 paired with force bg on html. */
export function isExtensionForceSoftForeground(color: string | undefined): boolean {
  if (!color) return false;
  const rgb = parseColor(color);
  if (!rgb) return false;
  return rgbMatchesByteTriplet(rgb, 232, 232, 232, 2);
}

/**
 * True when a computed color matches Truely Dark injected paint (preload or force Soft).
 * GitHub-native #0d1117 is site-native unless extension force context is active.
 */
export function isExtensionInjectedBackground(color: string | undefined): boolean {
  return isExtensionPreloadBackground(color);
}

/** Skip luminance sampling when bg is extension paint in the current DOM context. */
function isSiteNativeBackground(color: string, doc: Document, el: Element): boolean {
  if (isExtensionPreloadBackground(color)) return false;
  if (!isExtensionForceSoftBackground(color)) return true;
  return !isExtensionForceSoftSurface(doc, el);
}

/** Force Soft palette on html/body while extension attrs or inline pairing is present. */
function isExtensionForceSoftSurface(doc: Document, el: Element): boolean {
  if (isExtensionPaintActive(doc)) return true;
  if (el !== doc.documentElement) return false;
  return isExtensionForceSoftInlinePaint(doc);
}

/** Inline force Soft pairing on html — survives attr strip until paint-free cleanup. */
export function isExtensionForceSoftInlinePaint(doc: Document = document): boolean {
  const view = doc.defaultView;
  if (!view) return false;

  const html = doc.documentElement;
  const bg = view.getComputedStyle(html).backgroundColor;
  const fg = view.getComputedStyle(html).color;
  return isExtensionForceSoftBackground(bg) && isExtensionForceSoftForeground(fg);
}

/**
 * Resolve explicit theme mode tokens (light / dark / auto).
 * GitHub uses data-color-mode as source of truth — never infer dark from
 * presence of data-dark-theme attribute when mode is light or auto+system-light.
 */
export function resolveExplicitThemeMode(
  value: string | undefined,
  prefersDark?: boolean,
): DetectionOutcome | null {
  if (!value) return null;
  const lower = value.toLowerCase().trim();

  if (lower === 'light' || lower === 'day' || lower === 'bright' || lower === 'white') {
    return { result: 'light', confidence: 'high' };
  }
  if (lower === 'dark' || lower === 'night' || lower === 'dim' || lower === 'black') {
    return { result: 'dark', confidence: 'high' };
  }
  if (lower === 'auto') {
    if (prefersDark !== undefined) {
      return { result: prefersDark ? 'dark' : 'light', confidence: 'high' };
    }
    return { result: 'unknown', confidence: 'low' };
  }

  return null;
}

/**
 * Resolve meta color-scheme content.
 */
export function resolveMetaColorScheme(
  value: string | undefined,
  prefersDark?: boolean,
): DetectionOutcome | null {
  if (!value) return null;
  const lower = value.toLowerCase().trim();

  if (lower === 'dark') return { result: 'dark', confidence: 'high' };
  if (lower === 'light') return { result: 'light', confidence: 'high' };

  if (lower.includes('light') && lower.includes('dark')) {
    if (prefersDark !== undefined) {
      return { result: prefersDark ? 'dark' : 'light', confidence: 'high' };
    }
    return { result: 'unknown', confidence: 'low' };
  }

  if (lower.includes('dark')) return { result: 'dark', confidence: 'high' };
  if (lower.includes('light')) return { result: 'light', confidence: 'high' };

  return null;
}

/**
 * Site-authored theme signals only (DOM attributes + meta tags).
 * Both light and dark short-circuit — never fall through to class heuristics.
 */
export function detectFromAuthoredSignals(signals: AuthoredSignalInput): DetectionOutcome {
  const colorMode = resolveExplicitThemeMode(signals.dataColorMode, signals.prefersDark);
  if (colorMode) return colorMode;

  const dataTheme = resolveExplicitThemeMode(signals.dataTheme, signals.prefersDark);
  if (dataTheme) return dataTheme;

  const meta = resolveMetaColorScheme(signals.metaColorScheme, signals.prefersDark);
  if (meta) return meta;

  return { result: 'unknown', confidence: 'low' };
}

/**
 * Determine theme from signal bundle. Ignores computed color-scheme and dark
 * backgrounds that match Truely Dark preload (FOUC poison).
 */
export function detectFromSignals(signals: {
  colorScheme?: string;
  dataTheme?: string;
  dataColorMode?: string;
  bodyBackground?: string;
  htmlBackground?: string;
  metaColorScheme?: string;
  prefersDark?: boolean;
}): DetectionOutcome {
  const authored = detectFromAuthoredSignals({
    dataTheme: signals.dataTheme,
    dataColorMode: signals.dataColorMode,
    metaColorScheme: signals.metaColorScheme,
    prefersDark: signals.prefersDark,
  });
  if (authored.result !== 'unknown') return authored;

  const backgrounds = [signals.bodyBackground, signals.htmlBackground];
  for (const bg of backgrounds) {
    if (!bg || isExtensionInjectedBackground(bg)) continue;
    const rgb = parseColor(bg);
    if (!rgb) continue;
    const lum = rgbByteLuminance(rgb.r, rgb.g, rgb.b);
    if (lum > 0.75) {
      return { result: 'light', confidence: 'medium' };
    }
  }

  return { result: 'unknown', confidence: 'low' };
}

/**
 * Sample backdrop colors from canvas pixel data (for colorful detection).
 */
export function analyzeBackdropSamples(
  samples: Array<{ r: number; g: number; b: number }>,
): { luminance: number; variance: number } {
  if (samples.length === 0) {
    return { luminance: 1, variance: 0 };
  }

  let totalLum = 0;
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];

  for (const { r, g, b } of samples) {
    const lum = rgbByteLuminance(r, g, b);
    totalLum += lum;
    rs.push(r);
    gs.push(g);
    bs.push(b);
  }

  const avgLum = totalLum / samples.length;
  const avgR = rs.reduce((a, v) => a + v, 0) / rs.length;
  const avgG = gs.reduce((a, v) => a + v, 0) / gs.length;
  const avgB = bs.reduce((a, v) => a + v, 0) / bs.length;

  let variance = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    if (!sample) continue;
    const dr = sample.r - avgR;
    const dg = sample.g - avgG;
    const db = sample.b - avgB;
    variance += (dr * dr + dg * dg + db * db) / (255 * 255);
  }
  variance /= samples.length;

  return { luminance: avgLum, variance };
}

/**
 * Full detection combining authored signals and optional backdrop samples.
 */
export function detectPageTheme(
  signals: {
    colorScheme?: string;
    dataTheme?: string;
    dataColorMode?: string;
    bodyBackground?: string;
    htmlBackground?: string;
    metaColorScheme?: string;
    prefersDark?: boolean;
  },
  backdropSamples?: Array<{ r: number; g: number; b: number }>,
): DetectionOutcome {
  const signalOutcome = detectFromSignals(signals);
  if (signalOutcome.result !== 'unknown') return signalOutcome;

  if (backdropSamples && backdropSamples.length > 0) {
    const { luminance, variance } = analyzeBackdropSamples(backdropSamples);
    if (luminance > 0.7) {
      return { result: 'light', confidence: 'medium' };
    }
    if (variance > COLORFUL_VARIANCE_THRESHOLD && luminance < 0.5) {
      return { result: 'unknown', confidence: 'low' };
    }
    if (luminance < DARK_LUMINANCE_THRESHOLD) {
      return { result: 'unknown', confidence: 'low' };
    }
  }

  return { result: 'unknown', confidence: 'low' };
}

function hasExtensionMarkup(doc: Document): boolean {
  const html = doc.documentElement;
  return (
    html.hasAttribute(EXTENSION_MARKERS.rootAttr) ||
    html.hasAttribute(EXTENSION_MARKERS.forceAttr) ||
    html.hasAttribute(EXTENSION_MARKERS.appShellAttr) ||
    doc.getElementById(EXTENSION_MARKERS.preloadStyleId) !== null ||
    doc.getElementById(EXTENSION_MARKERS.styleId) !== null
  );
}

/**
 * True when Truely Dark Soft/On/force paint is actively applied — not site-native dark.
 * Used to break Auto feedback loops (invert → color-scheme dark → false native skip).
 */
export function isExtensionPaintActive(doc: Document = document): boolean {
  const html = doc.documentElement;
  if (html.hasAttribute(EXTENSION_MARKERS.rootAttr)) return true;
  if (html.hasAttribute(EXTENSION_MARKERS.forceAttr)) return true;
  if (html.hasAttribute(EXTENSION_MARKERS.appShellAttr)) return true;
  if (doc.getElementById(EXTENSION_MARKERS.styleId)) return true;
  if (doc.getElementById('truely-dark-force-styles')) return true;
  if (isExtensionForceSoftInlinePaint(doc)) return true;

  const view = doc.defaultView;
  if (!view) return false;

  const htmlFilter = view.getComputedStyle(html).filter;
  if (computedFilterHasStrictInvert(htmlFilter)) return true;

  const body = doc.body;
  if (body) {
    const bodyFilter = view.getComputedStyle(body).filter;
    if (computedFilterHasStrictInvert(bodyFilter)) return true;
  }

  return false;
}

function hasAuthoredNativeDarkSignal(doc: Document): boolean {
  const signals = collectAuthoredSignals(doc);
  const authored = detectFromAuthoredSignals(signals);
  return authored.result === 'dark' && authored.confidence === 'high';
}

function collectAuthoredSignals(doc: Document): AuthoredSignalInput {
  const html = doc.documentElement;
  const body = doc.body;
  const prefersDark =
    doc.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches ?? false;

  const hasDarkClass = html.classList.contains('dark');
  const hasLightClass = html.classList.contains('light');
  // html.dark is a reliable authored signal; html.light is not (x.ai keeps class=light on black UI).
  const dataThemeFromClass = hasDarkClass && !hasLightClass ? 'dark' : undefined;

  return {
    dataTheme:
      html.getAttribute('data-theme') ??
      html.getAttribute('theme') ??
      dataThemeFromClass ??
      undefined,
    dataColorMode:
      html.getAttribute('data-color-mode') ??
      html.getAttribute('data-mode') ??
      body?.getAttribute('data-color-mode') ??
      undefined,
    metaColorScheme:
      doc.querySelector('meta[name="color-scheme"]')?.getAttribute('content') ?? undefined,
    prefersDark,
  };
}

function detectComputedColorSchemeDark(doc: Document): DetectionOutcome | null {
  if (isExtensionPaintActive(doc) && !hasAuthoredNativeDarkSignal(doc)) {
    return null;
  }

  const view = doc.defaultView;
  if (!view) return null;
  const scheme = view.getComputedStyle(doc.documentElement).colorScheme;
  if (scheme === 'dark') {
    return { result: 'dark', confidence: 'high' };
  }
  return null;
}

/**
 * Temporarily strip Truely Dark Soft/force paint so Auto detect reads native surfaces.
 * Does not restore — caller owns apply vs skip after detect (x.ai native skip).
 */
export function stripExtensionPaintForDetect(doc: Document): boolean {
  const html = doc.documentElement;
  const hadPaint =
    isExtensionPaintActive(doc) || Boolean(doc.getElementById(EXTENSION_MARKERS.preloadStyleId));

  doc.getElementById(EXTENSION_MARKERS.preloadStyleId)?.remove();
  doc.getElementById(EXTENSION_MARKERS.styleId)?.remove();
  doc.getElementById('truely-dark-force-styles')?.remove();

  html.removeAttribute(EXTENSION_MARKERS.rootAttr);
  html.removeAttribute(EXTENSION_MARKERS.forceAttr);
  html.removeAttribute(EXTENSION_MARKERS.appShellAttr);
  html.removeAttribute(EXTENSION_MARKERS.filterTargetAttr);

  html.style.removeProperty('filter');
  html.style.removeProperty('-webkit-filter');
  html.style.removeProperty('background-color');
  html.style.removeProperty('color');
  html.style.removeProperty('color-scheme');

  if (doc.body) {
    doc.body.style.removeProperty('filter');
    doc.body.style.removeProperty('-webkit-filter');
    doc.body.style.removeProperty('background-color');
    doc.body.style.removeProperty('color');
    doc.body.style.removeProperty('color-scheme');
  }

  return hadPaint;
}

/**
 * Meta color-scheme:light on SPAs like x.ai is misleading while #__next paints dark.
 * Never short-circuit to light/high when an SPA root is present but not yet sampled dark.
 */
function rejectSpaMisleadingAuthoredLight(
  doc: Document,
  authored: DetectionOutcome,
): DetectionOutcome {
  if (authored.result !== 'light' || authored.confidence !== 'high') return authored;

  const spaRoots = collectSpaRootElements(doc);
  if (spaRoots.length === 0) return authored;

  const spaSamples = spaRoots
    .map((el) => getElementBackgroundLuminance(el, doc))
    .filter((lum): lum is number => lum !== null);
  const spaDark = classifyUniformDarkSurfaces(spaSamples);
  if (spaDark) return authored;

  return { result: 'unknown', confidence: 'low' };
}

const SPA_ROOT_SELECTORS = ['#__next', '#root'] as const;

function collectSpaRootElements(doc: Document): Element[] {
  const roots: Element[] = [];
  for (const selector of SPA_ROOT_SELECTORS) {
    const el = doc.querySelector(selector);
    if (el) roots.push(el);
  }
  return roots;
}

function classifyUniformDarkSurfaces(samples: number[]): DetectionOutcome | null {
  if (samples.length === 0) return null;

  const darkSamples = samples.filter((lum) => lum < DARK_LUMINANCE_THRESHOLD);
  const lightSamples = samples.filter((lum) => lum > LIGHT_LUMINANCE_THRESHOLD);

  if (lightSamples.length > 0) return null;
  if (darkSamples.length === 0) return null;

  const avg = samples.reduce((sum, lum) => sum + lum, 0) / samples.length;
  if (avg < DARK_LUMINANCE_THRESHOLD) {
    return { result: 'dark', confidence: 'high' };
  }

  return null;
}

/**
 * Uniform dark html/body before extension paint — native dark SPAs (x.ai, etc.).
 * Painted #__next / #root surfaces beat misleading html.light / color-scheme:light tokens.
 */
export function detectNativeDarkRootSurfaces(doc: Document = document): DetectionOutcome | null {
  if (isExtensionPaintActive(doc) && !hasAuthoredNativeDarkSignal(doc)) {
    return null;
  }

  const spaRoots = collectSpaRootElements(doc);
  if (spaRoots.length > 0) {
    const spaSamples = spaRoots
      .map((el) => getElementBackgroundLuminance(el, doc))
      .filter((lum): lum is number => lum !== null);
    const spaDark = classifyUniformDarkSurfaces(spaSamples);
    if (spaDark) return spaDark;
  }

  const candidates: Element[] = [doc.documentElement];
  if (doc.body) candidates.push(doc.body);
  const nextRoot = doc.querySelector('#__next');
  const reactRoot = doc.querySelector('#root');
  if (nextRoot) candidates.push(nextRoot);
  if (reactRoot) candidates.push(reactRoot);
  if (doc.body?.firstElementChild) candidates.push(doc.body.firstElementChild);

  const samples: number[] = [];
  for (const el of candidates) {
    const lum = getElementBackgroundLuminance(el, doc);
    if (lum !== null) samples.push(lum);
  }

  return classifyUniformDarkSurfaces(samples);
}

function getElementBackgroundLuminance(el: Element, doc: Document): number | null {
  const view = doc.defaultView;
  if (!view) return null;

  let current: Element | null = el;
  while (current) {
    const bg = view.getComputedStyle(current).backgroundColor;
    if (bg && isSiteNativeBackground(bg, doc, current)) {
      const rgb = parseColor(bg);
      if (rgb) {
        return computeLuminance(rgb.r / 255, rgb.g / 255, rgb.b / 255);
      }
    }
    if (current === doc.documentElement) break;
    current = current.parentElement;
  }

  return null;
}

/**
 * Sample one luminance per major viewport region (header/nav, main/hero, footer).
 */
export function sampleRegionalLuminances(doc: Document): number[] {
  const luminances: number[] = [];

  for (const group of REGION_GROUPS) {
    for (const selector of group.selectors) {
      const el = doc.querySelector(selector);
      if (!el) continue;
      const lum = getElementBackgroundLuminance(el, doc);
      if (lum !== null) {
        luminances.push(lum);
        break;
      }
    }
  }

  return luminances;
}

/**
 * Classify regional luminance samples into a detection outcome.
 * Mixed light+dark marketing pages → mixed (apply Soft, never native skip).
 * Uniform dark with no light surfaces → high-confidence native skip.
 */
export function analyzeRegionalLuminances(luminances: number[]): DetectionOutcome {
  const samples = luminances.filter((lum) => lum >= 0 && Number.isFinite(lum));
  if (samples.length === 0) {
    return { result: 'unknown', confidence: 'low' };
  }

  const lightRegions = samples.filter((lum) => lum > LIGHT_LUMINANCE_THRESHOLD);
  const darkRegions = samples.filter((lum) => lum < DARK_LUMINANCE_THRESHOLD);

  if (lightRegions.length > 0 && darkRegions.length > 0) {
    const avg = samples.reduce((sum, lum) => sum + lum, 0) / samples.length;
    if (avg < DARK_LUMINANCE_THRESHOLD && darkRegions.length >= lightRegions.length) {
      return { result: 'dark', confidence: 'high' };
    }
    return { result: 'mixed', confidence: 'medium' };
  }

  if (lightRegions.length > 0) {
    return { result: 'light', confidence: 'medium' };
  }

  if (darkRegions.length > 0 && lightRegions.length === 0) {
    const majorityDark = darkRegions.length >= Math.ceil(samples.length / 2);
    if (majorityDark && samples.length >= 2) {
      return { result: 'dark', confidence: 'high' };
    }
    if (samples.length === 1) {
      return { result: 'unknown', confidence: 'low' };
    }
    if (majorityDark) {
      return { result: 'dark', confidence: 'high' };
    }
  }

  return { result: 'unknown', confidence: 'low' };
}

function detectFromRegionalLuminance(doc: Document): DetectionOutcome {
  const regional = analyzeRegionalLuminances(sampleRegionalLuminances(doc));
  if (regional.result !== 'unknown') return regional;

  // Legacy single-element fallback for pages without semantic regions
  const contentSelectors = [
    'main',
    'article',
    '#content',
    '#mw-content-text',
    '#siteTable',
    'shreddit-app',
    '.content',
  ];

  for (const selector of contentSelectors) {
    const el = doc.querySelector(selector);
    if (!el) continue;
    const lum = getElementBackgroundLuminance(el, doc);
    if (lum === null) continue;
    if (lum > LIGHT_LUMINANCE_THRESHOLD) {
      return { result: 'light', confidence: 'medium' };
    }
  }

  return { result: 'unknown', confidence: 'low' };
}

/**
 * Browser-side detection using live DOM (content script only).
 * Never uses CSS class-name heuristics (theme-dark etc.) or theme-color alone for skip.
 */
export function detectFromDom(doc: Document = document): DetectionOutcome {
  if (isExtensionPaintActive(doc) && !hasAuthoredNativeDarkSignal(doc)) {
    return { result: 'unknown', confidence: 'low' };
  }

  // Painted app surfaces beat misleading html.light / color-scheme:light (x.ai pricing).
  const paintedDark = detectNativeDarkRootSurfaces(doc);
  if (paintedDark) return paintedDark;

  const authoredOutcome = rejectSpaMisleadingAuthoredLight(
    doc,
    detectFromAuthoredSignals(collectAuthoredSignals(doc)),
  );
  if (authoredOutcome.result !== 'unknown') return authoredOutcome;

  const colorSchemeDark = detectComputedColorSchemeDark(doc);
  if (colorSchemeDark) return colorSchemeDark;

  // theme-color is a weak hint only — never high-confidence native-dark skip
  const themeColorContent = doc
    .querySelector('meta[name="theme-color"]')
    ?.getAttribute('content');
  if (themeColorContent) {
    const lum = cssColorLuminance(themeColorContent);
    if (lum !== null && lum > 0.75) {
      return { result: 'light', confidence: 'medium' };
    }
  }

  return detectFromRegionalLuminance(doc);
}

/**
 * Paint-free DOM detection — strips FOUC preload AND extension Soft/force paint
 * so native surface luminance (#__next, etc.) is readable on Auto re-detect.
 */
export function detectFromDomPaintFree(doc: Document = document): DetectionOutcome {
  const preload = doc.getElementById(EXTENSION_MARKERS.preloadStyleId);
  const preloadParent = preload?.parentElement ?? null;
  const preloadNext = preload?.nextSibling ?? null;

  stripExtensionPaintForDetect(doc);

  try {
    return detectFromDom(doc);
  } finally {
    if (preload && preloadParent) {
      preloadParent.insertBefore(preload, preloadNext);
    }
  }
}

export function isDetectCacheValid(timestamp: number, ttlMs: number): boolean {
  return Date.now() - timestamp < ttlMs;
}

export function isHighConfidenceDark(outcome: DetectionOutcome): boolean {
  return outcome.result === 'dark' && outcome.confidence === 'high';
}

export function shouldSkipForNativeDark(outcome: DetectionOutcome): boolean {
  return isHighConfidenceDark(outcome);
}

/**
 * Clear poisoned or stale detect cache entries.
 */
export function purgePoisonedDetectCache<
  T extends Record<string, { result: DetectResult; confidence: DetectConfidence; timestamp: number }>,
>(cache: T): T {
  const cleaned = { ...cache };
  for (const [origin, entry] of Object.entries(cleaned)) {
    if (entry.result === 'dark' && entry.confidence !== 'high') {
      delete cleaned[origin];
    }
  }
  return cleaned;
}

/**
 * Full cache reset after detection logic changes.
 */
export function clearDetectCache<
  T extends Record<string, { result: DetectResult; confidence: DetectConfidence; timestamp: number }>,
>(_cache: T): Record<string, never> {
  return {};
}
