# Uninsta - Instagram DM Bulk Unsend Userscript

## Overview

A Tampermonkey userscript that unsends all of the logged-in user's messages in the currently open Instagram DM conversation. Uses Instagram's internal REST API directly (no DOM automation). Written in TypeScript, built with esbuild, released via GitHub Actions.

## Architecture

Single-file userscript output (`dist/uninsta.user.js`) produced by bundling TypeScript source from `src/`.

### Source Structure

```
src/
  main.ts           -- Entry point. Sets up fetch interceptor, waits for DOM ready, injects UI.
  auth.ts           -- Extracts csrftoken, ds_user_id, x-ig-www-claim. Exposes readiness state.
  interceptor.ts    -- Patches window.fetch to capture x-ig-app-id from Instagram's own requests.
  api.ts            -- API client: fetchMessages (paginated), unsendMessage, with rate-limit handling.
  engine.ts         -- Core loop: fetch pages -> filter own messages -> unsend with delays -> report progress.
  ui.ts             -- Injects trigger button, builds floating panel, manages log and progress display.
  picker.ts         -- Click-to-pick boundary message feature (with timestamp fallback).
  styles.ts         -- CSS string using Instagram's CSS variables for theme integration.
  types.ts          -- Shared TypeScript interfaces and types.
```

### Build

- **esbuild** bundles `src/main.ts` into a single IIFE
- A build script (`scripts/build.ts`) prepends the Tampermonkey metadata header block to the bundled output
- Output: `dist/uninsta.user.js`
- Dev: `npm run build` (one-shot) or `npm run dev` (watch mode)

### GitHub Action

- Trigger: push of a version tag (`v*`)
- Steps: checkout, install deps, `npm run build`, create GitHub Release with `dist/uninsta.user.js` as an attached artifact
- Users copy/paste the release artifact content into Tampermonkey as a custom userscript

## Tampermonkey Metadata

```
// ==UserScript==
// @name            Uninsta
// @description     Unsend all your messages in an Instagram DM conversation
// @version         {{version from package.json}}
// @author          Catalin Teodorescu
// @match           https://www.instagram.com/direct/*
// @grant           none
// @run-at          document-idle
// @license         MIT
// ==/UserScript==
```

## Core Engine

### Authentication (auto-detected, no user input)

| Credential | Source | Purpose |
|---|---|---|
| `csrftoken` | `document.cookie` | CSRF protection header (`x-csrftoken`) |
| `ds_user_id` | `document.cookie` | Identifies the logged-in user's numeric ID |
| `x-ig-app-id` | Intercepted from Instagram's own `fetch` calls | Identifies request as Instagram web app |
| `x-ig-www-claim` | `sessionStorage.getItem("www-claim-v2")` | Session claim token |

**App ID capture**: On script load, `window.fetch` is patched to inspect outgoing request headers. The first request carrying `x-ig-app-id` is captured and stored. If the user clicks "Unsend All" before capture, the log displays: "App ID not captured yet. Please refresh the page and try again." No hardcoded fallback.

### API Endpoints

All requests use `credentials: "include"` to send session cookies. Domain: `https://www.instagram.com`.

**Fetch messages (paginated)**:
```
GET /api/v1/direct_v2/threads/{threadId}/?cursor={cursor}
```
- Response includes `items[]` (messages) and `oldest_cursor` for next page
- Pagination ends when `oldest_cursor === "MINCURSOR"`

**Unsend a message**:
```
POST /api/v1/direct_v2/threads/{threadId}/items/{itemId}/delete/
Content-Type: application/x-www-form-urlencoded
```

### Thread ID Extraction

Parsed from the current URL: `instagram.com/direct/t/{threadId}/`

### Message Filtering

- Only messages where `item.user_id == ds_user_id` (your own messages)
- If a boundary message is set (via click-to-pick or timestamp), only messages with a timestamp strictly before the boundary
- If both boundary types are set, use whichever is more restrictive (the newer cutoff)

### Rate Limiting

**Proactive**:
- 3500ms base delay between delete requests, jittered +/- 500ms (random) to avoid mechanical patterns
- 2000ms delay between page fetch requests

**Reactive**:
- On HTTP 429: read `retry_after` from response body, wait `retry_after + 3000ms`, then resume
- Increase base delete delay after each 429 response
- Max 3 retry attempts per individual message before marking as failed and moving on

### Unsend Loop

1. Extract thread ID from URL
2. Validate all auth credentials are available (cookie values + captured app ID)
3. Fetch first page of messages
4. Filter to own messages, apply boundary cutoff if set
5. Unsend each message with rate-limited delays
6. Fetch next page via cursor, repeat until `MINCURSOR`
7. Report final stats in log

## UI Panel

### Trigger Button

A small icon button injected near the Instagram chat header area. Clicking toggles the floating panel open/closed.

### Floating Panel Layout

```
+----------------------------------------------+
| Uninsta                        [_] [X]       |  <- Header (draggable)
+----------------------------------------------+
| Status: Ready / Running / Stopped / Done     |
| Thread: {threadId}  User: {userId}           |
| App ID: Captured / Not captured              |
+----------------------------------------------+
| Boundary (optional):                         |
| [Pick message]  "hey what's u..." (Apr 3)  X |
|   -- or --                                   |
| Before: [____datetime-local input____]       |
+----------------------------------------------+
| [  Unsend All  ]          [  Stop  ]         |
+----------------------------------------------+
| > [1/318] Unsending "hey what's up..." OK    |  <- Log area
| > [2/318] Unsending "lol yeah" OK            |    (scrollable, monospace)
| > [3/318] Unsending media message OK         |
| > Waiting 3.2s...                            |
|                                              |
+----------------------------------------------+
| [42/318] 13.2%              ETA: ~14min      |  <- Progress footer
+----------------------------------------------+
```

### Styling

- Uses Instagram's CSS variables (`--ig-primary-background`, `--web-always-white`, etc.) for theme integration
- Fixed position, z-index high enough to float over Instagram's UI
- Draggable header
- Scrollable log area with monospace font

### Boundary Message Picker (click-to-pick)

1. User clicks "Pick message" button in the panel
2. Panel enters pick mode: cursor changes, hovering over chat messages highlights them
3. User clicks a message in the chat
4. Script reads the message's item ID from the DOM (data attributes or React fiber internals)
5. Panel shows a preview of the selected message with a "clear" button
6. If DOM extraction of item IDs is not feasible, this feature is omitted and only the timestamp input remains

The timestamp input (`datetime-local`) is always available as an alternative/fallback.

## Error Handling

| Condition | Behavior |
|---|---|
| Not on a DM page (`/direct/t/` not in URL) | Log warning: "Navigate to a DM conversation first." |
| Not logged in (missing cookies) | Log error: "Not logged in. Please log in to Instagram." |
| App ID not captured | Log error: "App ID not captured yet. Please refresh the page and try again." |
| HTTP 429 (rate limit) | Pause for `retry_after + 3s`, log the wait, resume automatically |
| HTTP 401/403 (auth failure) | Stop entirely, log: "Session expired. Please refresh and log in again." |
| Network error on delete | Retry up to 3 times with exponential backoff, then skip message and log as failed |
| Message already gone (non-200 on delete, not 429/401/403) | Log as "skipped", continue |
| User clicks Stop | Halt after current in-flight request. Clicking "Unsend All" again restarts from scratch. |

## Build & Release

### Dependencies

- `typescript` -- type checking
- `esbuild` -- bundling
- No runtime dependencies

### Build Script (`scripts/build.ts`)

A Node script (run via `tsx`) that:
1. Reads the version from `package.json`
2. Calls esbuild to bundle `src/main.ts` into an IIFE string
3. Prepends the Tampermonkey metadata header (with version interpolated)
4. Writes the result to `dist/uninsta.user.js`

### package.json Scripts

- `typecheck` -- `tsc --noEmit`
- `build` -- `npm run typecheck && tsx scripts/build.ts`
- `dev` -- esbuild watch mode (for local development, no header prepend)

### GitHub Action (`.github/workflows/release.yml`)

Trigger: push of a tag matching `v*`

Steps:
1. Checkout repo
2. Setup Node.js
3. `npm ci`
4. `npm run build`
5. Create GitHub Release from the tag
6. Upload `dist/uninsta.user.js` as a release asset

Users install by: going to the release page, copying the raw content of `uninsta.user.js`, pasting into Tampermonkey's "Create new script" editor.
