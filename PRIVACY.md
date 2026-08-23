# Privacy Policy

**Truely Dark** — Last updated: August 23, 2026

## Summary

Truely Dark collects **zero data**. There is no telemetry, no analytics, no crash reporting, and no network activity by default.

## What Truely Dark Does NOT Do

- Does **not** collect personal information
- Does **not** transmit data to any server
- Does **not** use third-party analytics or tracking services
- Does **not** inject advertisements
- Does **not** modify page content beyond applying dark mode styles
- Does **not** read passwords, form data, or browsing history for any purpose other than determining the current page's origin for per-site settings

## What Is Stored Locally

Truely Dark stores the following data **only in your browser's local storage** (`chrome.storage.local` / `browser.storage.local`):

| Data | Purpose |
|------|---------|
| Global on/off state | Remember whether dark mode is enabled |
| Per-site mode overrides | Remember Auto/Soft/On/Off per origin |
| Brightness, contrast, warmth settings | Remember your appearance preferences |
| Preset selection | Remember your chosen preset |
| Schedule settings | Remember your dark mode schedule |
| Already-dark detection cache | Avoid re-detecting dark sites (per-origin, expires after 7 days) |
| Per-tab injection status | Remember whether Soft filter verified on active tab (session only, not synced) |

This data never leaves your device. It is not synced to any cloud service.

## Network Requests

Truely Dark makes **no network requests** in normal operation. The extension does not contact any external server.

The only exception is if you explicitly click a link in the options page (e.g., to view the GitHub repository or privacy policy), which opens a normal browser tab — that is standard browser navigation, not extension telemetry.

## Permissions Explained

| Permission | Why it's needed |
|------------|-----------------|
| `storage` | Save your settings locally |
| `tabs` | Read the active tab URL to apply per-site settings |
| `scripting` | Inject dark mode styles at document start |
| `alarms` | Check schedule settings periodically (local only) |
| `<all_urls>` host permission | Apply dark mode on all websites you visit |

## Third-Party Code

Truely Dark does not vendor or include Dark Reader or any other dark mode extension's source code. All dark mode logic is original.

## Children's Privacy

Truely Dark does not knowingly collect information from anyone, including children under 13.

## Changes to This Policy

If this policy changes, the updated version will be committed to the repository. The "Last updated" date at the top will reflect the change.

## Contact

For privacy questions, open an issue at [github.com/pwnapplehat/Truely-Dark](https://github.com/pwnapplehat/Truely-Dark) or contact the author via GitHub.
