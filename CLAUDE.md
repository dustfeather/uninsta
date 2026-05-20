# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

unInsta bulk-unsends your own messages in an Instagram DM conversation. One TypeScript codebase (`src/main.ts` entry) builds **two artifacts**: a Tampermonkey userscript and a Manifest V3 extension (Chrome + Firefox).

## Build

- `npm run build` runs the whole pipeline; `npm run dev` is userscript-only watch. No test suite.
- Version comes from the `UNINSTA_VERSION` env var (CI sets it from the git tag); `package.json` stays `0.0.0-dev` — never bump it.
- `src/styles.ts` is generated from `src/panel.scss` by the build (a `PANEL_CSS` template literal) — edit the SCSS, never `styles.ts`. Same for `docs/styles.css` from `docs/page.scss`.

## Runtime split (extension)

- `content.js` runs in the **MAIN world** (needs page globals / `window.fetch`); MAIN-world scripts can't use `chrome.runtime`.
- `bridge.js` runs in the **ISOLATED world** and relays `chrome.runtime` messages to MAIN via DOM `CustomEvent`.
- `background.js` is the service worker (toolbar toggle, color/grayscale icon swap).

## Instagram reverse-engineering (non-obvious)

- DMs use GraphQL at `/api/graphql`, not REST. Queries are identified by numeric `doc_id`, not query text.
- `doc_id` `26252548844395561` = `IGDMessageListOffMsysQuery` (fetch messages); `24812777031749983` = `IGDMessageUnsendDialogOffMsysMutation` (unsend).
- Three distinct thread ID formats: the URL thread key, `thread_fbid`, and `thread_igid` (128-bit decimal). Extract `thread_igid`/`thread_fbid` from inline `<script>` tags (PolarisDirectInboxRoot props), not the React fiber tree.
- Identify your own messages via `sender.igid` (matches the `ds_user_id` cookie) — `sender_fbid` is a different ID.
- `timestamp_ms` arrives as a **string**; parse with `parseInt()`.
- Message IDs are `mid.$xxxxx` format (not numeric). Messages come newest-first from the API.
- GraphQL auth needs `fb_dtsg`, `lsd`, and `x-ig-app-id` extracted from page scripts/globals.
- The fetch interceptor patches `window.fetch` early to capture `x-ig-app-id` from Instagram's own requests; `tryExtractAppIdFromPage()` is the fallback for when the extension loads after initial requests.
- The engine collects all message IDs into IndexedDB first, then unsends in a second pass — keeps progress accurate and avoids OOM on large conversations.
- Non-text messages are labelled `[SharedContent]`, never their internal type name.

## Conventions

- Branding is **unInsta** — camelCase, lowercase `u`.
- Build outputs are minified; no obfuscation (Chrome Web Store flags it).
- The panel uses its own dark theme — never reuse Instagram's CSS variables, or the panel melts into the IG UI.
- Build DOM with `createElement`/`textContent`/`append`, never `innerHTML` — AMO's scanner flags `innerHTML` even for static HTML.
- Log timestamps use ISO format `YYYY-MM-DD HH:MM:SS`.

## Scars (mistakes already made — do not repeat)

- Used REST `/api/v1/direct_v2/threads/` for DMs → returns `item_ack` 500 on web; use the GraphQL `doc_id` queries.
- Assumed `sender_fbid` == `ds_user_id` → use `sender.igid` instead.
- Extracted thread IDs from the React fiber tree → fragile across sessions/bundle versions; read inline `<script>` props.
- Treated `timestamp_ms` as a number → it's a string.
- Held all messages in an in-memory array before unsending → crashed on large threads; persist to IndexedDB.
- Screenshot `<img>` in a flex row stretches → needs `height: auto; object-fit: contain; align-self: flex-start`.
