# Steam Chat Desktop (Electron)

An Electron-based wrapper for Steam Chat on Linux (tested on Arch + XFCE). It embeds `https://steamcommunity.com/chat`
in a hardened Electron window, provides a tray icon with an unread badge, and mirrors web notifications to native ones
with a **Read** action that focuses the main window.

---

## Overview

- Tech stack: Node.js + Electron
- Package manager: npm (see `package-lock.json`)
- Builder: `electron-builder` (Linux target: AppImage)
- Entry points: `main.js` (main process), `preload.js` (notification bridge)
- App ID: `com.github.jankofron.steam-chat`
- Platform focus: Linux (arch) + XFCE (tested); other OS targets are not configured.

### Key features

- System tray icon with unread indicator (uses app icons in `icons/`).
- Opens external links in the default browser; keeps Steam/Store links inside the app.
- Forces a modern Chrome user-agent for better compatibility.
- Minimizes to tray instead of quitting on window close.
- Web notifications are mirrored to native ones with a **Read** button; clicking it (or the notification body) focuses
  the window and clears the unread badge.

### Security notes

- `contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false` in the BrowserWindow.
- A dedicated persistent partition is used: `persist:steamchat`.
- Permission requests are restricted to allow notifications only on Steam domains.

---

## Requirements

- OS: Linux (desktop environment with system tray support)
- Node.js: Recent LTS recommended. Electron 38 typically works with Node.js >= 18 (>= 20 preferred).
- npm
- Build tooling (for packaging): `electron-builder` downloads most dependencies automatically. On some distros you may
  need additional system packages for AppImage packaging.
- Optional: Arch Linux packaging via the included `PKGBUILD`.

---

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the app in development:
   ```bash
   npm start
   ```

The app will open Steam Chat. On close, it minimizes to the tray; use the tray menu to quit.

---

## Scripts

Defined in `package.json`:

- `start`: launches Electron in development.
- `dist`: builds a Linux AppImage using `electron-builder`.

Examples:

```bash
# Development
npm start

# Build AppImage (artifacts in dist/)
npm run dist
```

> Note: Only Linux AppImage target is configured at the moment.

---

## Environment variables

There are currently no required environment variables for normal use or build.


---

## Tests

There are no automated tests in this repository yet.

---

## Project structure

```
.
├─ assets/
│  └─ icons/           # App and tray icons (icon.png, icon-unread.png)
├─ main.js             # Electron main process (window, tray, permissions, native notification bridge)
├─ preload.js          # Preload script (mirrors web notifications to main)
├─ package.json        # Scripts, electron-builder config
├─ package-lock.json   # npm lockfile
├─ PKGBUILD            # Arch Linux packaging (optional)
├─ LICENSE             # Project license
└─ README.md           # This file
```

Other files in the root may include prebuilt artifacts or packaging outputs.

---

## Packaging

This project uses `electron-builder` with an AppImage target:

- Configure options under the `build` key in `package.json`.
- Run `npm run dist` to produce an AppImage under `dist/`.

Arch Linux (`PKGBUILD`):

- A `PKGBUILD` is included for AUR-style packaging.
- Adjust metadata and version as needed before building.

> TODO: Add step-by-step Arch packaging instructions and any required dependencies.

---

## How it works (notes for developers)

- Unread badge: incremented when web notifications fire; cleared on focus or when clicking **Read**.
- Notifications: `preload.js` overrides `Notification` to forward title/body to `main.js`, which shows a native
  notification with an action that activates the window.
- External links: Only Steam domains are allowed inside the app; others open via `shell.openExternal`.
- User agent: A modern Chrome UA is forced for the window and via `app.userAgentFallback`.
- Single instance lock: Prevents opening multiple instances; subsequent launches focus the existing one.
