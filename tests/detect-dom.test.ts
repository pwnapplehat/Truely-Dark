// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest';
import { detectFromDom } from '../src/lib/detect';
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
