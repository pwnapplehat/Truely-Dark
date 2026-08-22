# Store Listing Draft — Truely Dark

> Draft copy for Chrome Web Store and Firefox Add-ons. Not yet submitted.

## Short description (132 chars max)

Instantly dark. Never sluggish. Never double-dark. Flash-free dark mode with zero telemetry.

## Full description

**Instantly dark. Never sluggish. Never double-dark. Never sketchy.**

Truely Dark is a lightweight, flash-free dark mode extension for Chrome and Firefox. Unlike heavy rewrite engines, Truely Dark uses a fast CSS filter approach that darkens pages before the first pixel paints — no white flash, no lag.

### Why Truely Dark?

- **Flash-free** — Dark background injected at document start, before content loads
- **Smart skip** — Detects sites that are already dark (GitHub, YouTube, etc.) and leaves them alone
- **Media preserved** — Photos and videos stay natural with counter-invert (default on)
- **Per-site control** — Auto, Soft, On, or Off for any website
- **Battery saver** — Optional low-power mode using cached detection
- **Zero telemetry** — No data collection, no network requests, no accounts

### Features

- Global toggle + per-site modes (Auto / Soft / On / Off)
- Brightness, contrast, and warmth sliders
- Presets: Midnight, OLED True Black, Paper Night, High Contrast
- Schedule with system theme follow
- Keyboard shortcuts: Alt+Shift+D (global), Alt+Shift+S (current site)
- Import/export settings as JSON

### Privacy

Truely Dark does not collect, transmit, or store any personal data. All settings are stored locally on your device. No analytics. No crash reporting. No remote servers.

### Not Dark Reader

Truely Dark is an original implementation. It does not copy or vendor Dark Reader. Built for speed and simplicity, not DOM rewriting.

---

**Author:** Chauhan Sahil  
**License:** MIT  
**Support:** https://github.com/pwnapplehat/Truely-Dark/issues

## Chrome Web Store — permission justifications

| Permission | Justification |
|------------|---------------|
| storage | Save user settings locally |
| tabs | Read active tab URL for per-site mode |
| scripting | Inject dark mode at document start |
| alarms | Check schedule settings (local only) |
| `<all_urls>` | Apply dark mode on visited pages |

## Firefox Add-ons — notes

- Manifest V3, minimum Firefox 109
- No data collection consent required (zero telemetry)
- Temporary add-on loading supported for development

## Categories

- Accessibility
- Appearance / Dark mode

## Keywords

dark mode, dark theme, night mode, flash free, no flash, eye care, oled, accessibility, privacy
