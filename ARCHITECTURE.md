# Truely Dark — Architecture & Dependencies

This document explains **why** each major dependency exists and how the extension is structured. Truely Dark is an original invert-based Soft engine — not a fork or wrapper of Dark Reader, Midnight Lizard, or Night Eye.

## Design principles

1. **Flash-free first paint** — preload CSS at `document_start`, then apply Soft invert with verified injection.
2. **Truthful status** — popup never claims Soft is active unless computed `filter` includes `invert`.
3. **Native-first when confident** — high-confidence authored or uniformly dark pages skip Soft; mixed marketing pages never skip.
4. **Lean runtime** — no analytics, telemetry, remote config, or heavy DOM rewrite engines.
5. **Cross-browser MV3** — one WXT codebase builds Chrome and Firefox artifacts.

## Stack overview

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
│  Site Packs (per-origin rules) │ chrome.storage.local   │
└─────────────────────────────────────────────────────────┘
```

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Content | `src/entrypoints/content.ts` | Preload, detect, apply Soft, SPA re-apply, injection verification |
| Engine | `src/lib/engine.ts` | CSS invert pipeline, media counter-invert, shadow DOM |
| Detect | `src/lib/detect.ts` | Authored signals, multi-region luminance, mixed/light/dark |
| Color | `src/lib/color.ts` | CSS color parsing & WCAG luminance (culori wrapper) |
| Resolver | `src/lib/resolver.ts` | Auto/Soft/On/Off, native-dark skip policy |
| Background | `src/lib/background-handlers.ts` | Tab status, detect cache, pessimistic `softApplied` |
| UI | `src/entrypoints/popup`, `options` | React popup/options — settings only, no runtime engine |

## Major dependencies

### WXT `^0.21.4` (dev)

**Why:** Official MV3 cross-browser toolchain (Vite-based). Handles manifest generation, HMR in dev, Chrome + Firefox build targets, and content-script bundling without maintaining separate webpack configs.

**Not used:** `webextension-polyfill` — WXT’s `browser` namespace covers our API surface (`storage`, `tabs`, `scripting`, `alarms`). Polyfill added only if a gap appears.

### TypeScript `^5.8` strict

**Why:** Compile-time safety across content/background/popup boundaries, shared settings types, and Zod-inferred schemas.

### React `^19.2` + `@wxt-dev/module-react`

**Why:** Popup and options are already React. WXT’s React module keeps JSX/HMR integrated. UI is settings-only (toggle, sliders, site list) — no component library; native elements keep the popup bundle small.

**Not added:** Radix, MUI, Chakra, or other UI kits — would balloon popup size without improving the engine.

### Zod `^3.25`

**Why:** Runtime validation for settings JSON (import/export) and storage migrations. Zod 3.x is stable, well-documented, and tree-shakeable. Valibot is smaller but Zod is already integrated with strong DX for schema evolution.

### culori `^4.0.2` (runtime)

**Why:** Battle-tested CSS Color 4 parsing (hex, rgb, hsl, oklch, lab, named colors) and WCAG 2.x luminance. Replaces hand-rolled parsers that missed edge cases (oklch, named colors, alpha). Used by detection (`src/lib/detect.ts`) and engine background complement (`src/lib/engine.ts`).

**Alternative considered:** colorjs.io — excellent but heavier; culori is smaller and sufficient for parse + luminance only.

**Wrapper:** `src/lib/color.ts` exposes a thin API (`parseColor`, `cssColorLuminance`, `rgbByteLuminance`) so engine/detect never import culori directly — easy to mock in tests.

### Vitest `^3.2` + happy-dom `^20`

**Why:** Fast unit/DOM tests without a browser. happy-dom provides `document`, `getComputedStyle`, and meta elements for detect tests. 80+ tests cover resolver, detect, engine CSS, site packs, color parsing, and tab status.

**Not added:** Playwright E2E in CI (deferred — manual checklist in `MANUAL_TEST.md`).

## What we deliberately exclude

| Excluded | Reason |
|----------|--------|
| Dark Reader / Midnight Lizard / Night Eye engines | Different architecture (dynamic rewrite); Truely Dark is invert-based by design |
| Analytics / telemetry | Privacy and trust — zero network from extension logic |
| Remote config | Settings are local-only (`chrome.storage.local`) |
| Heavy UI kits | Popup must stay fast and small |
| `webextension-polyfill` | Unnecessary with WXT `browser` API today |

## Soft engine (original)

Soft mode is **not** DOM rewriting:

1. Inject dark preload at `document_start`
2. Set invert-safe root background complement
3. Apply `filter: invert(1) hue-rotate(180deg)` on `html` (body fallback)
4. Reinforce with inline `!important` + constructable stylesheet fallback
5. Reset `backdrop-filter` on sticky chrome
6. Counter-invert media in open shadow roots when preserve-media is on
7. Verify computed filter — report injection failure to popup if invert missing

## Detection pipeline

1. **Authored signals** — `data-color-mode`, `data-theme`, meta `color-scheme` (high confidence)
2. **Weak hint** — `theme-color` meta (light only; never alone for native-dark skip)
3. **Regional luminance** — header, main, sidebar, footer via culori-backed WCAG luminance
4. **Outcomes** — `light`, `dark`, `mixed`, `unknown` with confidence levels
5. **Cache** — per-origin detect cache in storage; battery saver uses cache only

Mixed pages (e.g. OVH light header + dark footer) → **Soft**, never false native skip.

## Site packs

`src/lib/site-packs.ts` — per-origin `customCss`, `preserveMedia`, `forceSoft` overrides. No remote fetching; packs ship in the bundle.

## Build outputs

| Command | Output |
|---------|--------|
| `pnpm build` | `.output/chrome-mv3` |
| `pnpm build:firefox` | `.output/firefox-mv3` |
| `pnpm test` | Vitest unit/DOM suite |
| `pnpm typecheck` | `wxt prepare` + `tsc --noEmit` |

## Version policy

- Stay on **current stable** minors for WXT, React, Zod, Vitest, culori
- Pin major versions in `package.json` with `^`; lockfile records exact resolves
- Dependency changes that affect runtime behavior require test + both browser builds green before merge
