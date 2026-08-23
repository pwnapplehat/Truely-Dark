# Truely Dark — 5-Minute Manual Test Checklist

Run after loading unpacked from `.output/chrome-mv3` (Chrome) or `.output/firefox-mv3` (Firefox).
Reload the extension after each build.

## Setup (30 seconds)

1. Open `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `.output/chrome-mv3`
2. Pin **Truely Dark** to the toolbar
3. Ensure global **Dark mode** toggle is ON in the popup

---

## Critical paths (~3 minutes)

### Chrome Web Store (MUST darken)

| Step | Action | Pass criteria |
|------|--------|---------------|
| 1 | Open `https://chromewebstore.google.com/` | Page loads |
| 2 | Set mode to **Soft** in popup | Popup: green dot + "Extension dark mode active (Soft)" |
| 3 | Visual check | Store UI is visibly inverted/darkened (not white) |

### OVHcloud (Soft reliability)

| Step | Action | Pass criteria |
|------|--------|---------------|
| 1 | Open `https://www.ovhcloud.com/en-in/` | Page loads |
| 2 | Set mode to **Soft** | Status: active (Soft), green dot |
| 3 | Visual check | Light header **and** light-blue hero are darkened (not left white) |

### GitHub Auto — light vs dark

| Step | Action | Pass criteria |
|------|--------|---------------|
| 1 | GitHub → Settings → Appearance → **Light** | Light UI |
| 2 | Popup mode **Auto** | "Extension dark mode active (Soft)" — page darkens |
| 3 | GitHub → Appearance → **Dark** | Dark native UI |
| 4 | Popup mode **Auto** | "Natively dark — Truely Dark skipped" — no double-dark |

### Wikipedia + Hacker News (no false native skip)

| Site | Mode | Pass criteria |
|------|------|---------------|
| `https://en.wikipedia.org` | Auto | Soft active, page darkens |
| `https://news.ycombinator.com` | Auto | Soft active, page darkens |

### Restricted pages only

| URL | Pass criteria |
|-----|---------------|
| `chrome://extensions` | "Browser blocks dark mode on this page" — **not** "Soft active" |
| `https://chromewebstore.google.com/` | Must **NOT** show restricted message |

---

## Quick spot checks (~1 minute)

| Site | Mode | Expect |
|------|------|--------|
| `https://example.com` | Soft | Darkens |
| `https://www.google.com` | Auto | Search page darkens |
| `https://www.reddit.com` | Auto | Soft active on light Reddit |
| `https://www.youtube.com` (dark theme on) | Auto | Native skip if truly dark |

---

## Options page (~30 seconds)

1. Right-click extension → **Options** (or popup → All settings)
2. Change **Brightness** slider → revisit a tab → appearance updates
3. Click a **Preset** (e.g. OLED) → confirm change
4. **Export settings** → JSON downloads
5. **Site overrides** list shows any per-site modes you set

---

## Failure signals

| Popup message | Meaning |
|---------------|---------|
| Applying dark mode… | Wait 1–2s or hard-refresh tab |
| Soft enabled — filter could not apply | Injection failed — reload tab; file issue if persistent |
| Extension dark mode active (Soft) + green dot | Filter verified on page |

---

## Report issues

Open an issue at [github.com/pwnapplehat/Truely-Dark/issues](https://github.com/pwnapplehat/Truely-Dark/issues) with: URL, mode, popup status text, screenshot, browser version.
