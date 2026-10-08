# Browser Extensions

## Goal

One grouped note for four TypeScript browser extensions (discord-purge, [uninsta](./OVERVIEW.md), FileList Monitor, Auto Skip for Plex & Netflix) that share a common Manifest V3 stack and a single publishing pipeline driven by [shared-workflows](https://github.com/dustfeather/shared-workflows/blob/main/docs/OVERVIEW.md).

## Stack

Common across all four:

- **Language**: TypeScript 6, ES modules, Node >= 24.
- **Manifest**: Manifest V3 (`manifest_version: 3`).
- **Styling**: Sass/SCSS (FileList Monitor adds Tailwind CSS 4 via PostCSS).
- **Targets**: Chrome (Web Store) + Firefox (AMO) for all four. `discord-purge` and `uninsta` additionally ship a Tampermonkey userscript.

Per-extension bundler differences:

- **discord-purge** — `esbuild` via custom `tsx scripts/build.ts` (per-target: chrome / firefox / userscript).
- **uninsta** — `esbuild` via custom `tsx scripts/build.ts`; manifest is generated at build time (no checked-in manifest).
- **FileList Monitor** — **Vite 8 + CRXJS** (`@crxjs/vite-plugin`); package-managed with **pnpm**.
- **Auto Skip** — raw `esbuild` (IIFE bundle) via `build.mjs`; leanest of the four (no permissions, content-script only).

> [!note] Manifest sources
> `discord-purge` keeps split `manifest.chrome.json` / `manifest.firefox.json`. `FileList Monitor` and `Auto Skip` keep `src/manifest.json` with `browser_specific_settings.gecko` for Firefox. `uninsta` generates its manifest in the build script.

## Publishing

Shared pipeline via [shared-workflows](https://github.com/dustfeather/shared-workflows/blob/main/docs/OVERVIEW.md). Each repo's `.github/workflows/release.yml` runs on push to `main` and:

1. Calls the reusable `node-test.yml` for tests/typecheck.
2. Builds, auto-bumps the version from the latest `v*` git tag, tags the release, and creates a GitHub Release with the packaged artifacts (Chrome `.zip`, Firefox `.xpi`, plus an AMO source archive; userscripts where applicable).
3. Publishes to the **Chrome Web Store** via reusable `publish-chrome.yml` and to **Firefox AMO** via reusable `publish-firefox.yml` (`secrets: inherit`, each passing its own `addon-id`).

Pipeline versions / runners differ:

- **discord-purge**, **uninsta** — shared workflows pinned `@v1`, GitHub-hosted `ubuntu-latest`.
- **FileList Monitor**, **Auto Skip** — shared workflows pinned `@v2`, self-hosted k3s ARC runners (`arc-df-filelist-ext`, `arc-df-series-auto-skip`) hosted in [Homelab](https://github.com/ITGuys-RO/k3s-cluster/blob/main/docs/homelab.md).

All four also share `claude.yml`, `pr-checks.yml`, and `dependabot-auto-merge.yml` referencing [shared-workflows](https://github.com/dustfeather/shared-workflows/blob/main/docs/OVERVIEW.md).

### uninsta

- **Repo**: `dustfeather/uninsta`
- **Local dir**: `~/projects/browser-extensions/uninsta/`
- **Purpose**: Bulk-unsend all your messages in an Instagram DM conversation.
- **Targets**: Chrome, Firefox, + Tampermonkey userscript.
- **Status**: Active; version `0.0.0-dev`, versioned at release time.
- **Build details**: `esbuild` via `tsx scripts/build.ts`; userscript and extension share the same bundled engine; manifest synthesized in the build script (gecko id `uninsta@dustfeather`). Shared workflows `@v1` on `ubuntu-latest`.

## Tasks

Open GitHub issues — **FileList Monitor** (`dustfeather/filelist-ext`); a qBittorrent + Plex automation cluster:

- [ ] [filelist-ext#60](https://github.com/dustfeather/filelist-ext/issues/60) — filelist → Plex / qBittorrent automation *(epic)*
- [ ] [filelist-ext#7](https://github.com/dustfeather/filelist-ext/issues/7) — integrate with qBittorrent WebUI for automatic downloads
- [ ] [filelist-ext#8](https://github.com/dustfeather/filelist-ext/issues/8) — auto-add downloaded series to local Plex Media Server
- [ ] [filelist-ext#9](https://github.com/dustfeather/filelist-ext/issues/9) — replace torrent-found notification with Plex-added notification

Cross-group maintenance (no ticket):

- [ ] Unify shared-workflow pins — `discord-purge` and `uninsta` still on `@v1`; migrate to `@v2` like the others.
- [ ] Consider moving `discord-purge` and `uninsta` builds onto self-hosted ARC runners to match the other two.
- [ ] Standardize bundler approach (custom `esbuild` scripts vs. Vite + CRXJS) across the group where practical.

## Notes

Area: Software Engineering. Publishing pipeline: [shared-workflows](https://github.com/dustfeather/shared-workflows/blob/main/docs/OVERVIEW.md).

All four are owned by `dustfeather/*` (rebase-only merge policy). Confirmed git remotes via `git remote -v` on each local dir.

## Log

- **2026-05-31** — Grouped note created from repo scan of 4 extensions.
- **2026-05-31** — Moved FileList Monitor task tracking from Jira (FLX-1..4) back to GitHub issues (#7, #8, #9 reopened; #60 created for the epic).
