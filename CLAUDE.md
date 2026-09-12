# CLAUDE.md

unInsta — bulk-unsends own messages in Instagram DM. One TS codebase (`src/main.ts` entry) builds **two artifacts**: Tampermonkey userscript + MV3 extension (Chrome + Firefox).

## Build

- `npm run build` = whole pipeline; `npm run dev` = userscript-only watch. No tests.
- Version from `UNINSTA_VERSION` env (CI sets from git tag); `package.json` stays `0.0.0-dev` — never bump.
- `src/styles.ts` generated from `src/panel.scss` by build (`PANEL_CSS` template literal) — edit SCSS, never `styles.ts`. Same for `docs/styles.css` from `docs/page.scss`.

## Runtime split (extension)

- `content.js` runs in **MAIN world** (needs page globals/`window.fetch`); MAIN-world scripts can't use `chrome.runtime`.
- `bridge.js` runs in **ISOLATED world**, relays `chrome.runtime` messages to MAIN via DOM `CustomEvent`.
- `background.js` = service worker (toolbar toggle, color/grayscale icon swap).

## Instagram reverse-engineering (non-obvious)

- DMs use GraphQL at `/api/graphql`, NOT REST. Queries identified by numeric `doc_id`, not query text.
- `doc_id` `26252548844395561` = `IGDMessageListOffMsysQuery` (fetch); `24812777031749983` = `IGDMessageUnsendDialogOffMsysMutation` (unsend).
- Three thread ID formats: URL thread key, `thread_fbid`, `thread_igid` (128-bit decimal). Extract `thread_igid`/`thread_fbid` from inline `<script>` tags (PolarisDirectInboxRoot props), NOT React fiber tree.
- Identify own messages via `sender.igid` (matches `ds_user_id` cookie) — `sender_fbid` is different ID.
- `timestamp_ms` arrives as **string**; parse with `parseInt()`.
- Message IDs = `mid.$xxxxx` format (not numeric). Messages come newest-first from API.
- GraphQL auth needs `fb_dtsg`, `lsd`, `x-ig-app-id` extracted from page scripts/globals.
- Fetch interceptor patches `window.fetch` early to capture `x-ig-app-id` from IG's own requests; `tryExtractAppIdFromPage()` = fallback when extension loads after initial requests.
- Engine collects all message IDs into IndexedDB first, then unsends in second pass — keeps progress accurate, avoids OOM on large convos.
- Non-text messages labelled `[SharedContent]`, never internal type name.

## Conventions

- Branding **unInsta** — camelCase, lowercase `u`.
- Build outputs minified; no obfuscation (CWS flags it).
- Panel uses own dark theme — never reuse Instagram's CSS variables, or panel melts into IG UI.
- Build DOM with `createElement`/`textContent`/`append`, NEVER `innerHTML` — AMO scanner flags `innerHTML` even for static HTML.
- Log timestamps ISO `YYYY-MM-DD HH:MM:SS`.

## Scars — do NOT repeat

- Used REST `/api/v1/direct_v2/threads/` for DMs → `item_ack` 500 on web; use GraphQL `doc_id` queries.
- Assumed `sender_fbid == ds_user_id` → use `sender.igid`.
- Extracted thread IDs from React fiber tree → fragile across sessions/bundle versions; read inline `<script>` props.
- Treated `timestamp_ms` as number → it's a string.
- Held all messages in in-memory array before unsending → crashed on large threads; persist to IndexedDB.
- Screenshot `<img>` in flex row stretches → needs `height: auto; object-fit: contain; align-self: flex-start`.
