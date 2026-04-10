# Uninsta Browser Extension - Design Spec

## Overview

Add a browser extension build target (Chrome, Firefox, Edge) alongside the existing Tampermonkey userscript. The core `src/` modules are shared between both targets. The extension is a thin wrapper: manifest.json + content script + background service worker for toolbar icon toggle.

## What Changes

### New Files

- `src/background.ts` -- MV3 service worker. Listens for toolbar icon clicks, sends a message to the content script bridge.
- `src/bridge.ts` -- Tiny ISOLATED world content script. Relays toolbar toggle from `chrome.runtime.onMessage` to a `CustomEvent` on the document (crossing from ISOLATED to MAIN world).
- `src/main.ts` -- Updated to listen for `uninsta-toggle` CustomEvent (panel toggle). No other changes.
- `extension/icons/` -- Icon set (16, 32, 48, 128px PNGs). Simple "U" or eraser icon.
- `scripts/build.ts` -- Extended to produce the extension build in addition to the userscript build.

### Extension Output (`dist/extension/`)

```
dist/extension/
  manifest.json       -- Generated from template with version from package.json
  content.js          -- Bundled + obfuscated content script (MAIN world, same code as userscript)
  bridge.js           -- Tiny ISOLATED world script relaying toolbar toggle via CustomEvent
  background.js       -- Bundled service worker
  icons/
    icon16.png
    icon32.png
    icon48.png
    icon128.png
```

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Uninsta",
  "description": "Unsend all your messages in an Instagram DM conversation",
  "version": "{{from package.json}}",
  "permissions": [],
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    },
    "default_title": "Uninsta - Toggle panel"
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "content_scripts": [
    {
      "matches": ["https://www.instagram.com/direct/*"],
      "js": ["content.js"],
      "run_at": "document_idle",
      "world": "MAIN"
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "uninsta@dustfeather"
    }
  }
}
```

### Background Service Worker (`src/background.ts`)

Minimal: listens for `action.onClicked`, sends a message to the active tab's content script to toggle the panel.

```typescript
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'uninsta-toggle' });
  }
});
```

### Toolbar Toggle Bridge

Since the content script runs in `"world": "MAIN"` (required for `window.fetch` interception and cookie access), it cannot use `chrome.runtime.onMessage`. The toolbar toggle uses a two-script approach:

1. **`src/bridge.ts`** -- A tiny content script running in the default `ISOLATED` world. Listens for `chrome.runtime.onMessage` from the background worker, then dispatches a `CustomEvent` on the document to communicate with the MAIN world script.

```typescript
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'uninsta-toggle') {
    document.dispatchEvent(new CustomEvent('uninsta-toggle'));
  }
});
```

2. **`src/main.ts`** -- Add a `CustomEvent` listener alongside the existing init:

```typescript
document.addEventListener('uninsta-toggle', () => {
  // toggle panel visibility
});
```

This event listener works in both Tampermonkey (manual trigger button) and extension (toolbar icon) contexts.

### Updated manifest content_scripts

```json
"content_scripts": [
  {
    "matches": ["https://www.instagram.com/direct/*"],
    "js": ["content.js"],
    "run_at": "document_idle",
    "world": "MAIN"
  },
  {
    "matches": ["https://www.instagram.com/direct/*"],
    "js": ["bridge.js"],
    "run_at": "document_idle",
    "world": "ISOLATED"
  }
]
```

## Build Pipeline Updates

### `scripts/build.ts`

The build script produces both outputs in sequence:

1. **Userscript build** (existing): esbuild bundle + minify -> obfuscate -> prepend TM header -> `dist/uninsta.user.js`
2. **Extension build** (new):
   - esbuild bundle + minify `src/main.ts` -> obfuscate -> `dist/extension/content.js`
   - esbuild bundle + minify `src/bridge.ts` -> obfuscate -> `dist/extension/bridge.js`
   - esbuild bundle + minify `src/background.ts` -> obfuscate -> `dist/extension/background.js`
   - Generate `dist/extension/manifest.json` from template with version interpolated
   - Copy `extension/icons/*.png` to `dist/extension/icons/`
   - Zip `dist/extension/` into `dist/uninsta-extension.zip`

### Dependencies

- `archiver` (npm package) for creating the zip, or use Node's built-in `child_process` to call `zip` command. Prefer `archiver` for cross-platform CI compatibility.

## GitHub Action Updates

Release artifacts become:
- `dist/uninsta.user.js` (Tampermonkey userscript)
- `dist/uninsta-extension.zip` (browser extension)

Both attached to each GitHub Release.

## Icons

Simple placeholder icons generated as solid-color squares with "U" text, or a simple eraser/trash SVG converted to PNG at 16/32/48/128px. These can be replaced with proper designed icons later.

## Firefox Compatibility

MV3 is supported in Firefox 109+. The `browser_specific_settings.gecko.id` field is required for Firefox. The `chrome.*` APIs are also available in Firefox MV3 (Firefox polyfills them). No separate Firefox build needed.

## What Doesn't Change

- All `src/` modules (types, interceptor, auth, api, engine, styles, ui, picker) stay identical
- The Tampermonkey userscript build continues to work
- The floating panel, log, picker, engine behavior is the same
- The content script runs in the page context with same-origin access to Instagram's cookies (content scripts in MV3 have access to the host page's cookies via `fetch` with `credentials: include`)

## Installation

**Chrome/Edge**: Download `uninsta-extension.zip` from GitHub Releases, unzip, go to `chrome://extensions`, enable Developer Mode, click "Load unpacked", select the unzipped folder.

**Firefox**: Download `uninsta-extension.zip`, go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", select the zip file (or any file inside the unzipped folder).

**Tampermonkey**: Same as before -- copy `uninsta.user.js` content into a new userscript.
