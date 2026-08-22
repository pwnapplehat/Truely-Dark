# Truely Dark

**Instantly dark. Never sluggish. Never double-dark. Never sketchy.**

Production-grade flash-free dark mode for Chrome and Firefox. Truely Dark applies dark mode at `document_start` — before the first paint — so you never see a white flash. It smartly skips already-dark sites, preserves images and videos, and never uses heavy dynamic rewrite engines that slow down your browser.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-MV3-green)](https://developer.chrome.com/docs/extensions/mv3/)
[![Firefox](https://img.shields.io/badge/Firefox-MV3-orange)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)

## Screenshots

> Screenshots coming soon — load the extension locally to preview the popup and options UI.

| Popup | Options |
|-------|---------|
| _Placeholder_ | _Placeholder_ |

## Why Truely Dark?

| Problem with other dark extensions | Truely Dark solution |
|-----------------------------------|---------------------|
| White flash on navigation (FOUC) | Preload CSS injected at `document_start` |
| Performance lag from dynamic rewrites | Lightweight CSS filter engine — no DOM rewriting |
| Already-dark sites get double-darkened | Smart detection with per-origin cache |
| Photos/videos inverted | Counter-invert on media elements (default ON) |
| Broken SPAs / Google Docs | Site packs with per-origin rules |
| Trust concerns in the category | Zero telemetry, no network, open source MIT |

## Features

- **Global on/off** — Master toggle for all sites
- **Per-site modes** — Auto, Soft, On, Off for any origin
- **Flash-resistant first paint** — Dark background before content loads
- **Smart skip** — Detects already-dark sites and skips them (cached per-origin)
- **Live adjustments** — Brightness, contrast, warmth with instant preview
- **Media preservation** — Images, videos, SVGs stay natural (default ON)
- **Site overrides** — Manage per-site rules in options
- **Keyboard shortcuts** — `Alt+Shift+D` (global), `Alt+Shift+S` (current site)
- **Schedule** — Time-based activation + follow system `prefers-color-scheme`
- **Battery saver** — Cached detection only, no live re-sampling, prefers Soft mode
- **Import/export** — Backup and restore settings as JSON
- **Presets** — Midnight, OLED True Black, Paper Night, High Contrast

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Truely Dark                          │
├─────────────┬──────────────┬────────────────────────────┤
│  Popup UI   │  Options UI  │   Background Service Worker│
│  (React)    │  (React)     │   Settings, commands, alarms│
├─────────────┴──────────────┴────────────────────────────┤
│              Content Script (document_start)            │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Preload  │  │ Detect   │  │ Soft Engine (CSS     │  │
│  │ CSS      │  │ Engine   │  │ filter invert)       │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  Site Packs (JSON rules) │ Storage (chrome.storage.local)│
└─────────────────────────────────────────────────────────┘
```

**Stack:** WXT (Vite) + TypeScript + React · Manifest V3 · Vitest

**Hybrid engine:**
1. **Soft (default):** CSS `filter: invert(1) hue-rotate(180deg)` on `html` with counter-invert on media
2. **Detect:** Already-dark detection via `color-scheme`, `data-theme`, backdrop sampling, MutationObserver
3. **Flash-free:** `document_start` preload CSS + dynamic content script registration
4. **Site packs:** JSON rules for GitHub, Google Docs/Sheets, YouTube, and more

## Why not Dark Reader?

Truely Dark is **not** a Dark Reader clone and does not vendor its source. The approaches differ fundamentally:

| | Dark Reader | Truely Dark |
|---|-------------|-------------|
| Engine | Dynamic DOM analysis & CSS rewriting | Lightweight CSS `filter: invert()` |
| Performance | Can lag on heavy SPAs | No DOM rewriting — near-zero overhead |
| Flash (FOUC) | Often flashes white on navigation | `document_start` preload CSS before first paint |
| Already-dark sites | May double-darken | Native-first: high-confidence detect skips Soft |
| Trust model | Closed-source history in category | MIT, zero telemetry, no network by default |

Truely Dark is for users who want **instant, flash-free darkening** without a heavyweight rewrite engine.

## FOUC mitigation

White flash happens when the browser paints the page before dark styles apply. Truely Dark prevents this with two layers:

1. **Preload CSS** — Injected at `document_start` (before DOM build): `html, body { background: #121212; color-scheme: dark }`
2. **Soft engine** — Applied as soon as settings resolve; child iframes self-darken via `all_frames` content scripts

On Firefox, `html` and `body` backgrounds are set explicitly (Firefox does not propagate root filter backgrounds the same way as Chrome).

## Google Docs & Sheets

Google Docs and Sheets render their editing surface on **`<canvas>`** elements. Truely Dark applies Soft mode to the surrounding chrome with `preserveMedia: false` so the canvas inverts with the page.

**Known limitations (honest):**
- Embedded charts, drawings, and some add-on panels may not invert perfectly
- Canvas pixel content cannot be selectively re-themed without a rewrite engine (by design — we avoid that cost)
- If a document looks wrong, set the site to **Off** in the popup or use Google's built-in dark theme

## Quick Start (Development)

### Prerequisites

- Node.js 18+
- pnpm 8+ (recommended) or npm

### Install & Build

```bash
git clone https://github.com/pwnapplehat/Truely-Dark.git
cd Truely-Dark
pnpm install
pnpm build          # Chrome
pnpm build:firefox  # Firefox
```

### Load Unpacked (Chrome)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3` directory

### Load Temporary Add-on (Firefox)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select any file inside `.output/firefox-mv3` (e.g., `manifest.json`)

### Development Mode

```bash
pnpm dev    # Starts WXT dev server with HMR
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development with hot reload |
| `pnpm build` | Production build for Chrome |
| `pnpm build:firefox` | Production build for Firefox |
| `pnpm zip` | Create Chrome distribution zip |
| `pnpm zip:firefox` | Create Firefox distribution zip |
| `pnpm test` | Run Vitest unit tests |
| `pnpm typecheck` | TypeScript type checking |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+D` | Toggle Truely Dark globally |
| `Alt+Shift+S` | Toggle Truely Dark for current site |

Customize in your browser's extension keyboard shortcuts page.

## Presets

| Preset | Background | Description |
|--------|------------|-------------|
| **Midnight** | `#121212` | Comfortable dark gray with softened contrast — default, avoids halation |
| **OLED True Black** | `#000000` | Pure black — explicit opt-in for OLED displays |
| **Paper Night** | `#1a1410` | Warm, low-blue tones for evening reading |
| **High Contrast** | `#000000` | Boosted contrast for readability |

## Privacy

Truely Dark collects **zero data**. No telemetry, no analytics, no network requests by default. All settings are stored locally in your browser. See [PRIVACY.md](PRIVACY.md) for full details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). We welcome bug fixes, performance improvements, site pack additions, and accessibility improvements.

## License

MIT © [Chauhan Sahil](https://github.com/pwnapplehat)

## Author

**Chauhan Sahil** — [GitHub: pwnapplehat](https://github.com/pwnapplehat)

---

*Truely Dark is not affiliated with or derived from Dark Reader. All dark mode logic is original.*
