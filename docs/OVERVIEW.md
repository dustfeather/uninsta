# uninsta

## Goal

unInsta bulk-unsends your own messages in an Instagram DM conversation. It uses Instagram's internal API to go through every message in the open thread and unsend yours one by one. It rate-limits itself so Instagram's abuse detection doesn't trip. It ships as a browser extension (Firefox, Chrome/Edge) and as a Tampermonkey userscript.

- Unsends all of your messages in the DM conversation that is currently open.
- An optional boundary limits it to messages older than a chosen date or a picked message.
- A floating panel shows a live log and progress. It works with Instagram's light and dark themes.

## Stack

- TypeScript (`typescript` ^7.0.2, `tsc --noEmit` for typechecking), `@types/chrome` for the extension APIs.
- esbuild ^0.28.1 bundles and minifies each entry point. The build and dev scripts are TypeScript run through `tsx` (`scripts/build.ts`, `scripts/dev.ts`).
- `sass` for styles, `sharp` for image processing and `archiver` to package the `.zip`/`.xpi`.
- Package manager: pnpm (`pnpm-lock.yaml`, `pnpm.onlyBuiltDependencies`, and `overrides` for `brace-expansion` and `immutable`). The README still tells you to use `npm install` / `npm run build`. Node.js v22+.
- License: GPL-3.0-only.

## Repo

- `dustfeather/uninsta` (confirmed: `git@github.com:dustfeather/uninsta.git`).
- Layout: `src/` holds the content script and panel, `extension/` holds the extension assets and `icons/`, and `scripts/` holds the build/dev tooling. `docs/` contains `screenshots/` and `superpowers/`. `.githooks/` is wired up by the `prepare` script (`core.hooksPath`). `.github/` has `workflows/` and `ISSUE_TEMPLATE/`.
- Community files: `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `PRIVACY.md`, `CLAUDE.md`.
- Build targets: `build:chrome`, `build:firefox`, `build:userscript`. The outputs go to `dist/`: `uninsta-extension.zip` (Chrome/Edge), `uninsta-extension.xpi` (Firefox), `uninsta.user.js` (Tampermonkey) and the unpacked `dist/extension/`.

## Deploy

Nothing is hosted. It runs in the user's browser. Users get it three ways:

- **Firefox:** the Mozilla Add-ons listing (`addons.mozilla.org/.../addon/uninsta/`).
- **Chrome/Edge:** `uninsta-extension.zip` from GitHub Releases, loaded unpacked in developer mode.
- **Tampermonkey:** `uninsta.user.js` from GitHub Releases.

Releases are built by the `release.yml` GitHub Actions workflow, and the README shows its status badge. Recent CI work makes a release fire on a bot merge as well, because that raises no push event. CI calls the shared workflows, with `NPM_TOKEN` passed through to them.

## Status

active. `package.json` holds the placeholder version `0.0.0-dev`. Recent work is mostly CI and tooling:

- shared-workflows re-pinned to @v5, then @v6
- merge-on-approval serialised per PR
- the interactive Claude job moved off the ARC pool
- `issues: write` granted so that `Closes #N` closes the issue
- Dependabot auto-merge permissions

There was also a security fix: sharp 0.35.3 → 0.35.4 for GHSA-rgj7-g3m4-5g8c (high).

## Notes

- How it works: a content script on `instagram.com/direct/*` intercepts Instagram's own API requests to pick up auth credentials. When the user clicks "Unsend All", it:
  1. reads the user ID from cookies
  2. takes the thread ID from the URL
  3. fetches messages page by page through Instagram's REST API
  4. filters to the user's own messages
  5. sends one delete request per message
- Rate limiting: a jittered delay of about 3.5s between delete requests. On HTTP 429 it backs off and retries on its own.
- The `package.json` `description` is stale: it still calls the project only a "Tampermonkey userscript", but the project now ships browser extensions too.
- Inspired by [Undiscord](https://github.com/victornpb/undiscord), which does the same thing for Discord.
- Related: [shared-workflows](https://github.com/dustfeather/shared-workflows/blob/main/docs/OVERVIEW.md) (reusable CI workflows pinned from this repo).
- Area: Software Engineering

## Log

- **2026-09-29** — Note created from repo scan.
