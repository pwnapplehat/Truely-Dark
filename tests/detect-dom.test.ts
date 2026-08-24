// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest';
import { detectFromDom, detectFromDomPaintFree, detectNativeDarkRootSurfaces } from '../src/lib/detect';
import { DEFAULT_SETTINGS } from '../src/lib/defaults';
import { resolveEffectiveSettings } from '../src/lib/resolver';

function buildGitHubLightDom(): Document {
  document.documentElement.innerHTML = `
    <head>
      <meta name="color-scheme" content="light dark">
      <meta name="theme-color" content="#1e1e1e">
    </head>
    <body style="background-color: #ffffff">
      <main style="background-color: #ffffff">Dashboard</main>
    </body>
  `;
  document.documentElement.setAttribute('data-color-mode', 'light');
  document.documentElement.setAttribute('data-dark-theme', 'dark');
  document.documentElement.className = 'logged-in env-production page-responsive';
  return document;
}

function buildGitHubDarkDom(): Document {
  document.documentElement.innerHTML = `
    <head>
      <meta name="color-scheme" content="light dark">
    </head>
    <body style="background-color: #0d1117">
      <main style="background-color: #0d1117">Dashboard</main>
    </body>
  `;
  document.documentElement.setAttribute('data-color-mode', 'dark');
  document.documentElement.setAttribute('data-dark-theme', 'dark');
  return document;
}

function buildRedditLightDom(): Document {
  document.documentElement.innerHTML = `
    <head>
      <meta name="theme-color" content="#1a1a1b">
    </head>
    <body class="theme-light" style="background-color: #ffffff">
      <shreddit-app style="background-color: #ffffff"></shreddit-app>
    </body>
  `;
  document.documentElement.classList.add('theme-dark');
  return document;
}

function buildMixedMarketingDom(): Document {
  document.documentElement.innerHTML = `
    <head>
      <meta name="theme-color" content="#0d1117">
    </head>
    <body style="background-color: #ffffff">
      <header style="background-color: #ffffff">Nav</header>
      <section class="hero" style="background-color: #e8f4fc">Hero</section>
      <main style="background-color: #ffffff">Content</main>
      <footer style="background-color: #0d1117">Footer cards</footer>
    </body>
  `;
  return document;
}

function buildUniformDarkDom(): Document {
  document.documentElement.innerHTML = `
    <body style="background-color: #0d1117">
      <header style="background-color: #0d1117">Nav</header>
      <main style="background-color: #121212">Main</main>
      <footer style="background-color: #0a0a0a">Footer</footer>
    </body>
  `;
  return document;
}

function buildUniformLightDom(): Document {
  document.documentElement.innerHTML = `
    <body style="background-color: #ffffff">
      <header style="background-color: #ffffff">Nav</header>
      <main style="background-color: #f5f5f5">Main</main>
      <footer style="background-color: #fafafa">Footer</footer>
    </body>
  `;
  return document;
}

describe('detectFromDom — GitHub and Reddit false-positive regression', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-truely-dark-active');
    document.documentElement.removeAttribute('data-color-mode');
    document.documentElement.removeAttribute('data-dark-theme');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('theme');
    document.documentElement.className = '';
    document.getElementById('truely-dark-preload')?.remove();
    document.getElementById('truely-dark-styles')?.remove();
  });

  it('GitHub light theme (data-color-mode=light) → light, Soft active', () => {
    buildGitHubLightDom();
    const outcome = detectFromDom(document);

    expect(outcome).toEqual({ result: 'light', confidence: 'high' });

    const resolved = resolveEffectiveSettings({
      origin: 'https://github.com',
      hostname: 'github.com',
      settings: DEFAULT_SETTINGS,
      detectOutcome: outcome,
    });

    expect(resolved.active).toBe(true);
    expect(resolved.mode).toBe('soft');
    expect(resolved.nativeDark).toBe(false);
  });

  it('GitHub dark theme (data-color-mode=dark) → native skip', () => {
    buildGitHubDarkDom();
    const outcome = detectFromDom(document);

    expect(outcome).toEqual({ result: 'dark', confidence: 'high' });

    const resolved = resolveEffectiveSettings({
      origin: 'https://github.com',
      hostname: 'github.com',
      settings: DEFAULT_SETTINGS,
      detectOutcome: outcome,
    });

    expect(resolved.active).toBe(false);
    expect(resolved.nativeDark).toBe(true);
  });

  it('Reddit light DOM with unused theme-dark class → Soft active', () => {
    buildRedditLightDom();
    const outcome = detectFromDom(document);

    expect(outcome.result).toBe('light');
    expect(outcome.confidence).not.toBe('high');

    const resolved = resolveEffectiveSettings({
      origin: 'https://www.reddit.com',
      hostname: 'www.reddit.com',
      settings: DEFAULT_SETTINGS,
      detectOutcome: outcome,
    });

    expect(resolved.active).toBe(true);
    expect(resolved.mode).toBe('soft');
    expect(resolved.nativeDark).toBe(false);
  });

  it('does not treat dark theme-color meta alone as native-dark skip', () => {
    buildRedditLightDom();
    const outcome = detectFromDom(document);

    expect(outcome.result).not.toBe('dark');
  });
});

describe('detectFromDom — mixed marketing pages', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-truely-dark-active');
    document.documentElement.removeAttribute('data-color-mode');
    document.documentElement.removeAttribute('data-dark-theme');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('theme');
    document.documentElement.className = '';
    document.getElementById('truely-dark-preload')?.remove();
    document.getElementById('truely-dark-styles')?.remove();
  });

  it('light hero + dark footer (OVH-like) → mixed, Soft active', () => {
    buildMixedMarketingDom();
    const outcome = detectFromDom(document);

    expect(outcome.result).toBe('mixed');

    const resolved = resolveEffectiveSettings({
      origin: 'https://www.ovhcloud.com',
      hostname: 'www.ovhcloud.com',
      settings: DEFAULT_SETTINGS,
      detectOutcome: outcome,
    });

    expect(resolved.active).toBe(true);
    expect(resolved.mode).toBe('soft');
    expect(resolved.nativeDark).toBe(false);
  });

  it('uniform dark header/main/footer → native skip', () => {
    buildUniformDarkDom();
    const outcome = detectFromDom(document);

    expect(outcome).toEqual({ result: 'dark', confidence: 'high' });

    const resolved = resolveEffectiveSettings({
      origin: 'https://example-dark.com',
      hostname: 'example-dark.com',
      settings: DEFAULT_SETTINGS,
      detectOutcome: outcome,
    });

    expect(resolved.active).toBe(false);
    expect(resolved.nativeDark).toBe(true);
  });

  it('uniform light regions → Soft active', () => {
    buildUniformLightDom();
    const outcome = detectFromDom(document);

    expect(outcome.result).toBe('light');

    const resolved = resolveEffectiveSettings({
      origin: 'https://example-light.com',
      hostname: 'example-light.com',
      settings: DEFAULT_SETTINGS,
      detectOutcome: outcome,
    });

    expect(resolved.active).toBe(true);
    expect(resolved.mode).toBe('soft');
    expect(resolved.nativeDark).toBe(false);
  });
});

describe('detectFromDom — x.ai native dark Auto skip', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-truely-dark-active');
    document.documentElement.className = '';
    document.getElementById('truely-dark-preload')?.remove();
    document.getElementById('truely-dark-styles')?.remove();
  });

  it('detectNativeDarkRootSurfaces detects uniform dark html/body', () => {
    document.documentElement.innerHTML = '<head></head><body></body>';
    document.documentElement.style.setProperty('background-color', '#0a0a0a', 'important');
    document.body.style.setProperty('background-color', '#0a0a0a', 'important');

    expect(detectNativeDarkRootSurfaces(document)).toEqual({
      result: 'dark',
      confidence: 'high',
    });
  });

  it('detectFromDom treats exact html.dark class as native dark (not theme-dark)', () => {
    document.documentElement.innerHTML = '<head></head><body></body>';
    document.documentElement.classList.add('dark');

    expect(detectFromDom(document)).toEqual({ result: 'dark', confidence: 'high' });
  });

  it('detectFromDom still detects native dark when extension attrs are present', () => {
    document.documentElement.innerHTML = '<head></head><body></body>';
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-truely-dark-active', 'soft');
    document.documentElement.style.setProperty('background-color', '#0a0a0a', 'important');
    document.body.style.setProperty('background-color', '#0a0a0a', 'important');

    expect(detectFromDom(document)).toEqual({ result: 'dark', confidence: 'high' });
  });

  it('detectFromDom native-skips x.ai html.light + dark #__next (misleading color-scheme)', () => {
    document.documentElement.innerHTML =
      '<head></head><body><div id="__next" style="background-color:#0a0a0a;min-height:100vh"></div></body>';
    document.documentElement.classList.add('light');
    document.documentElement.style.setProperty('color-scheme', 'light', 'important');

    expect(detectFromDom(document)).toEqual({ result: 'dark', confidence: 'high' });
    expect(detectFromDomPaintFree(document)).toEqual({ result: 'dark', confidence: 'high' });

    const resolved = resolveEffectiveSettings({
      origin: 'https://x.ai',
      hostname: 'x.ai',
      settings: DEFAULT_SETTINGS,
      detectOutcome: detectFromDomPaintFree(document),
    });
    expect(resolved.active).toBe(false);
    expect(resolved.nativeDark).toBe(true);
  });
});
