# Uninsta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tampermonkey userscript (TypeScript, esbuild, GitHub Actions) that bulk-unsends all of the logged-in user's messages in an Instagram DM conversation via Instagram's internal REST API.

**Architecture:** TypeScript source in `src/` is bundled by esbuild into a single IIFE, minified, obfuscated with javascript-obfuscator, and prepended with a Tampermonkey metadata header. The script intercepts Instagram's own fetch calls to capture auth credentials, then uses the same REST API to paginate through messages and unsend them one by one with rate-limit-aware delays.

**Tech Stack:** TypeScript, esbuild, javascript-obfuscator, tsx, GitHub Actions

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | Project metadata, scripts, dev dependencies |
| `tsconfig.json` | TypeScript configuration (strict, ESNext, bundler resolution) |
| `scripts/build.ts` | Build pipeline: esbuild bundle + minify -> obfuscate -> prepend TM header -> write dist |
| `src/types.ts` | Shared interfaces: `IGMessage`, `IGThreadResponse`, `AuthCredentials`, `EngineState`, `EngineCallbacks` |
| `src/interceptor.ts` | Patches `window.fetch` to capture `x-ig-app-id` from Instagram's outgoing requests |
| `src/auth.ts` | Reads `csrftoken`, `ds_user_id` from cookies, `www-claim-v2` from sessionStorage, app ID from interceptor |
| `src/api.ts` | `fetchThreadMessages(threadId, cursor, auth)` and `unsendMessage(threadId, itemId, auth)` with headers |
| `src/engine.ts` | Core loop: paginate -> filter own messages -> unsend with delays -> report progress via callbacks |
| `src/styles.ts` | CSS string for the panel, using Instagram CSS variables |
| `src/ui.ts` | Builds floating panel DOM, trigger button, log area, progress bar, start/stop controls |
| `src/picker.ts` | Click-to-pick boundary message + timestamp input fallback |
| `src/main.ts` | Entry point: wires interceptor, auth, engine, UI together |
| `.github/workflows/release.yml` | CI: build on version tag push, create GitHub Release with artifact |
| `.gitignore` | Ignore `node_modules/`, `dist/` |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: Create `.gitignore`**

```gitignore
node_modules/
dist/
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "uninsta",
  "version": "0.1.0",
  "private": true,
  "description": "Tampermonkey userscript to unsend all your messages in an Instagram DM conversation",
  "author": "Catalin Teodorescu",
  "license": "MIT",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "npm run typecheck && tsx scripts/build.ts",
    "dev": "tsx scripts/dev.ts"
  },
  "devDependencies": {
    "esbuild": "^0.25.0",
    "javascript-obfuscator": "^4.1.1",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*.ts", "scripts/**/*.ts"]
}
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` generated.

- [ ] **Step 5: Verify typecheck script works**

Run: `npm run typecheck`
Expected: Succeeds (no source files yet, no errors).

- [ ] **Step 6: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json
git commit -m "chore: scaffold project with TypeScript and esbuild"
```

---

### Task 2: Build Script

**Files:**
- Create: `scripts/build.ts`
- Create: `scripts/dev.ts`
- Create: `src/main.ts` (minimal placeholder for build verification)

- [ ] **Step 1: Create minimal `src/main.ts` placeholder**

```typescript
(function () {
  'use strict';
  console.log('Uninsta loaded');
})();
```

- [ ] **Step 2: Create `scripts/build.ts`**

```typescript
import { buildSync } from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));

const header = `// ==UserScript==
// @name            Uninsta
// @description     Unsend all your messages in an Instagram DM conversation
// @version         ${pkg.version}
// @author          ${pkg.author}
// @match           https://www.instagram.com/direct/*
// @grant           none
// @run-at          document-idle
// @license         MIT
// ==/UserScript==
`;

// 1. Bundle + minify with esbuild
const result = buildSync({
  entryPoints: [join(root, 'src/main.ts')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  write: false,
});

const bundled = new TextDecoder().decode(result.outputFiles[0].contents);

// 2. Obfuscate
const obfuscated = JavaScriptObfuscator.obfuscate(bundled, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  selfDefending: false,
  transformObjectKeys: true,
}).getObfuscatedCode();

// 3. Prepend header and write
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/uninsta.user.js'), header + obfuscated);

console.log(`Built dist/uninsta.user.js (v${pkg.version})`);
```

- [ ] **Step 3: Create `scripts/dev.ts`**

```typescript
import { context } from 'esbuild';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

async function dev() {
  const ctx = await context({
    entryPoints: [join(root, 'src/main.ts')],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    outfile: join(root, 'dist/uninsta.dev.js'),
    sourcemap: true,
  });

  await ctx.watch();
  console.log('Watching for changes...');
}

dev();
```

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: `dist/uninsta.user.js` is created. Output starts with the `// ==UserScript==` header followed by obfuscated code.

- [ ] **Step 5: Verify the output**

Run: `head -12 dist/uninsta.user.js`
Expected: The Tampermonkey metadata header lines appear cleanly.

- [ ] **Step 6: Commit**

```bash
git add scripts/build.ts scripts/dev.ts src/main.ts
git commit -m "chore: add build script with esbuild + obfuscation pipeline"
```

---

### Task 3: Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

```typescript
/** A single message item from Instagram's thread API response. */
export interface IGMessage {
  item_id: string;
  user_id: number;
  timestamp: number; // microseconds
  item_type: string; // "text", "media", "link", "raven_media", etc.
  text?: string;
}

/** Response shape from GET /api/v1/direct_v2/threads/{threadId}/ */
export interface IGThreadResponse {
  thread: {
    thread_id: string;
    thread_title: string;
    items: IGMessage[];
    oldest_cursor: string;
    has_older: boolean;
  };
  status: string;
}

/** Collected auth credentials needed for API requests. */
export interface AuthCredentials {
  csrfToken: string;
  userId: string;
  appId: string;
  wwwClaim: string;
}

/** Tracks progress of the unsend loop. */
export interface EngineState {
  running: boolean;
  totalFound: number;
  unsentCount: number;
  skippedCount: number;
  failedCount: number;
  currentPage: number;
}

/** Callbacks from the engine to the UI layer. */
export interface EngineCallbacks {
  onLog: (message: string, level: 'info' | 'success' | 'warn' | 'error' | 'debug') => void;
  onProgress: (state: EngineState) => void;
  onComplete: (state: EngineState) => void;
}

/** Boundary configuration for limiting which messages to unsend. */
export interface Boundary {
  /** Message item_id to stop before (from click-to-pick). */
  messageId?: string;
  /** Timestamp in microseconds to stop before (from datetime input). */
  timestamp?: number;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 4: Fetch Interceptor

**Files:**
- Create: `src/interceptor.ts`

- [ ] **Step 1: Create `src/interceptor.ts`**

```typescript
let capturedAppId: string | null = null;

/**
 * Returns the captured x-ig-app-id, or null if not yet intercepted.
 */
export function getAppId(): string | null {
  return capturedAppId;
}

/**
 * Patches window.fetch to intercept x-ig-app-id from Instagram's own requests.
 * Call once on script load. Safe to call multiple times (only patches once).
 */
export function installInterceptor(): void {
  if ((window as any).__uninstaInterceptorInstalled) return;
  (window as any).__uninstaInterceptorInstalled = true;

  const originalFetch = window.fetch;

  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (!capturedAppId && init?.headers) {
      const appId = extractAppId(init.headers);
      if (appId) {
        capturedAppId = appId;
        console.log('[Uninsta] Captured x-ig-app-id:', appId);
      }
    }
    return originalFetch.call(window, input, init);
  };
}

function extractAppId(headers: HeadersInit): string | null {
  if (headers instanceof Headers) {
    return headers.get('x-ig-app-id');
  }
  if (Array.isArray(headers)) {
    const entry = headers.find(([key]) => key.toLowerCase() === 'x-ig-app-id');
    return entry ? entry[1] : null;
  }
  if (typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === 'x-ig-app-id') return value;
    }
  }
  return null;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/interceptor.ts
git commit -m "feat: add fetch interceptor to capture x-ig-app-id"
```

---

### Task 5: Auth Module

**Files:**
- Create: `src/auth.ts`

- [ ] **Step 1: Create `src/auth.ts`**

```typescript
import type { AuthCredentials } from './types';
import { getAppId } from './interceptor';

/**
 * Extract a named value from document.cookie.
 */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Attempt to gather all auth credentials.
 * Returns null with a reason string if any credential is missing.
 */
export function getAuth(): { auth: AuthCredentials } | { auth: null; reason: string } {
  const csrfToken = getCookie('csrftoken');
  if (!csrfToken) return { auth: null, reason: 'Not logged in. Please log in to Instagram.' };

  const userId = getCookie('ds_user_id');
  if (!userId) return { auth: null, reason: 'Not logged in. Please log in to Instagram.' };

  const appId = getAppId();
  if (!appId) return { auth: null, reason: 'App ID not captured yet. Please refresh the page and try again.' };

  const wwwClaim = sessionStorage.getItem('www-claim-v2') || '0';

  return { auth: { csrfToken, userId, appId, wwwClaim } };
}

/**
 * Extract the thread ID from the current URL.
 * Expects a URL like: https://www.instagram.com/direct/t/THREAD_ID/
 * Returns null if not on a DM thread page.
 */
export function getThreadId(): string | null {
  const match = window.location.pathname.match(/\/direct\/t\/(\d+)/);
  return match ? match[1] : null;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/auth.ts
git commit -m "feat: add auth credential extraction from cookies and session storage"
```

---

### Task 6: API Client

**Files:**
- Create: `src/api.ts`

- [ ] **Step 1: Create `src/api.ts`**

```typescript
import type { AuthCredentials, IGThreadResponse } from './types';

function buildHeaders(auth: AuthCredentials): Record<string, string> {
  return {
    'x-csrftoken': auth.csrfToken,
    'x-ig-app-id': auth.appId,
    'x-ig-www-claim': auth.wwwClaim,
    'x-requested-with': 'XMLHttpRequest',
  };
}

/**
 * Fetch a page of messages from a thread.
 * Returns the parsed response, or throws on non-retryable errors.
 */
export async function fetchThreadMessages(
  threadId: string,
  cursor: string | null,
  auth: AuthCredentials,
): Promise<IGThreadResponse> {
  const url = cursor
    ? `https://www.instagram.com/api/v1/direct_v2/threads/${threadId}/?cursor=${cursor}`
    : `https://www.instagram.com/api/v1/direct_v2/threads/${threadId}/`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
    credentials: 'include',
  });

  if (!resp.ok) {
    const error = new Error(`Fetch messages failed: HTTP ${resp.status}`) as Error & {
      status: number;
      body?: any;
    };
    error.status = resp.status;
    try { error.body = await resp.json(); } catch {}
    throw error;
  }

  return resp.json();
}

/**
 * Unsend (delete) a single message.
 * Returns the HTTP status code.
 */
export async function unsendMessage(
  threadId: string,
  itemId: string,
  auth: AuthCredentials,
): Promise<number> {
  const url = `https://www.instagram.com/api/v1/direct_v2/threads/${threadId}/items/${itemId}/delete/`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      ...buildHeaders(auth),
      'content-type': 'application/x-www-form-urlencoded',
    },
    credentials: 'include',
  });

  return resp.status;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/api.ts
git commit -m "feat: add Instagram API client for fetching messages and unsending"
```

---

### Task 7: Engine (Core Unsend Loop)

**Files:**
- Create: `src/engine.ts`

- [ ] **Step 1: Create `src/engine.ts`**

```typescript
import type { AuthCredentials, Boundary, EngineCallbacks, EngineState, IGMessage } from './types';
import { fetchThreadMessages, unsendMessage } from './api';

const BASE_DELETE_DELAY = 3500;
const DELETE_JITTER = 500;
const FETCH_DELAY = 2000;
const MAX_RETRIES = 3;

function jitteredDelay(base: number, jitter: number): number {
  return base + Math.floor(Math.random() * jitter * 2) - jitter;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine the effective boundary timestamp in microseconds.
 * If both picker and datetime boundaries are set, use the more restrictive one (the newer/larger timestamp).
 */
function resolveBoundaryTimestamp(boundary: Boundary | null): number | null {
  if (!boundary) return null;

  const values: number[] = [];
  if (boundary.timestamp != null) values.push(boundary.timestamp);
  // messageId boundary is resolved to a timestamp during the fetch loop (see engine loop below).
  // This function only handles the timestamp input.
  if (values.length === 0) return null;
  return Math.max(...values);
}

export class UnsendEngine {
  private state: EngineState = {
    running: false,
    totalFound: 0,
    unsentCount: 0,
    skippedCount: 0,
    failedCount: 0,
    currentPage: 0,
  };

  private deleteDelay = BASE_DELETE_DELAY;
  private abortFlag = false;

  constructor(
    private threadId: string,
    private auth: AuthCredentials,
    private boundary: Boundary | null,
    private callbacks: EngineCallbacks,
  ) {}

  async start(): Promise<void> {
    this.abortFlag = false;
    this.state = {
      running: true,
      totalFound: 0,
      unsentCount: 0,
      skippedCount: 0,
      failedCount: 0,
      currentPage: 0,
    };
    this.deleteDelay = BASE_DELETE_DELAY;
    this.callbacks.onProgress(this.state);

    const boundaryTimestamp = resolveBoundaryTimestamp(this.boundary);
    const boundaryMessageId = this.boundary?.messageId ?? null;

    let cursor: string | null = null;
    let reachedBoundary = false;

    this.callbacks.onLog('Starting unsend process...', 'info');

    try {
      while (!reachedBoundary) {
        if (this.abortFlag) {
          this.callbacks.onLog('Stopped by user.', 'warn');
          break;
        }

        this.state.currentPage++;
        this.callbacks.onLog(`Fetching page ${this.state.currentPage}...`, 'debug');

        const data = await fetchThreadMessages(this.threadId, cursor, this.auth);
        const items = data.thread.items;

        if (!items || items.length === 0) {
          this.callbacks.onLog('No more messages found.', 'info');
          break;
        }

        // Filter to own messages
        const ownMessages = items.filter(
          (msg) => String(msg.user_id) === this.auth.userId,
        );

        for (const msg of ownMessages) {
          if (this.abortFlag) break;

          // Check boundary by message ID
          if (boundaryMessageId && msg.item_id === boundaryMessageId) {
            reachedBoundary = true;
            this.callbacks.onLog('Reached boundary message. Stopping.', 'info');
            break;
          }

          // Check boundary by timestamp
          if (boundaryTimestamp != null && msg.timestamp < boundaryTimestamp) {
            reachedBoundary = true;
            this.callbacks.onLog('Reached timestamp boundary. Stopping.', 'info');
            break;
          }

          this.state.totalFound++;
          const preview = msg.text
            ? `"${msg.text.substring(0, 40)}${msg.text.length > 40 ? '...' : ''}"`
            : `[${msg.item_type}]`;

          this.callbacks.onLog(
            `[${this.state.unsentCount + this.state.failedCount + 1}] Unsending ${preview}`,
            'debug',
          );

          const success = await this.unsendWithRetry(msg);

          if (success) {
            this.state.unsentCount++;
            this.callbacks.onLog(
              `[${this.state.unsentCount}] ${preview} - OK`,
              'success',
            );
          } else {
            this.state.failedCount++;
            this.callbacks.onLog(
              `${preview} - FAILED after ${MAX_RETRIES} retries`,
              'error',
            );
          }

          this.callbacks.onProgress(this.state);

          const delay = jitteredDelay(this.deleteDelay, DELETE_JITTER);
          this.callbacks.onLog(`Waiting ${(delay / 1000).toFixed(1)}s...`, 'debug');
          await wait(delay);
        }

        // Check if there are more pages
        if (
          !data.thread.has_older ||
          data.thread.oldest_cursor === 'MINCURSOR'
        ) {
          this.callbacks.onLog('Reached end of conversation.', 'info');
          break;
        }

        cursor = data.thread.oldest_cursor;

        // Delay between page fetches
        await wait(FETCH_DELAY);
      }
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        this.callbacks.onLog('Session expired. Please refresh and log in again.', 'error');
      } else {
        this.callbacks.onLog(`Unexpected error: ${err.message}`, 'error');
      }
    }

    this.state.running = false;
    this.callbacks.onComplete(this.state);
  }

  stop(): void {
    this.abortFlag = true;
  }

  private async unsendWithRetry(msg: IGMessage): Promise<boolean> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const status = await unsendMessage(this.threadId, msg.item_id, this.auth);

      if (status === 200 || status === 204) {
        return true;
      }

      if (status === 429) {
        // Rate limited -- back off
        const backoff = 6000 + attempt * 2000;
        this.deleteDelay += 1000; // permanently increase
        this.callbacks.onLog(
          `Rate limited (429). Waiting ${(backoff / 1000).toFixed(0)}s, increasing delay to ${(this.deleteDelay / 1000).toFixed(1)}s...`,
          'warn',
        );
        await wait(backoff);
        continue;
      }

      if (status === 401 || status === 403) {
        throw Object.assign(new Error('Auth failure'), { status });
      }

      // Other errors (404 = already gone, etc.) -- skip
      if (attempt === 1) {
        this.callbacks.onLog(`HTTP ${status}, skipping message.`, 'warn');
        this.state.skippedCount++;
        return true; // treat as "handled", not a retry-worthy failure
      }
    }

    return false;
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/engine.ts
git commit -m "feat: add unsend engine with pagination, filtering, and rate limiting"
```

---

### Task 8: Styles

**Files:**
- Create: `src/styles.ts`

- [ ] **Step 1: Create `src/styles.ts`**

```typescript
export const PANEL_CSS = `
/* Uninsta Panel */
#uninsta-panel {
  position: fixed;
  z-index: 10000;
  top: 60px;
  right: 16px;
  display: flex;
  flex-direction: column;
  width: 420px;
  max-height: 70vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  color: var(--ig-primary-text, #262626);
  background: var(--ig-primary-background, #fff);
  border: 1px solid var(--ig-elevated-separator, #dbdbdb);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.15);
  overflow: hidden;
}

#uninsta-panel.dark {
  color: var(--ig-primary-text, #f5f5f5);
  background: var(--ig-primary-background, #000);
  border-color: var(--ig-elevated-separator, #363636);
}

/* Header */
#uninsta-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--ig-secondary-background, #fafafa);
  border-bottom: 1px solid var(--ig-elevated-separator, #dbdbdb);
  cursor: grab;
  user-select: none;
}

#uninsta-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  flex-grow: 1;
}

#uninsta-header button {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--ig-secondary-text, #8e8e8e);
  padding: 0 4px;
  line-height: 1;
}

#uninsta-header button:hover {
  color: var(--ig-primary-text, #262626);
}

/* Status */
#uninsta-status {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--ig-secondary-text, #8e8e8e);
  border-bottom: 1px solid var(--ig-elevated-separator, #dbdbdb);
}

#uninsta-status .status-row {
  display: flex;
  gap: 12px;
}

/* Boundary */
#uninsta-boundary {
  padding: 12px 16px;
  border-bottom: 1px solid var(--ig-elevated-separator, #dbdbdb);
}

#uninsta-boundary label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--ig-secondary-text, #8e8e8e);
  text-transform: uppercase;
  margin-bottom: 8px;
}

#uninsta-boundary .picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

#uninsta-boundary .picker-preview {
  flex: 1;
  font-size: 12px;
  color: var(--ig-secondary-text, #8e8e8e);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#uninsta-boundary input[type="datetime-local"] {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--ig-elevated-separator, #dbdbdb);
  border-radius: 8px;
  background: var(--ig-primary-background, #fff);
  color: var(--ig-primary-text, #262626);
  font-size: 14px;
}

/* Controls */
#uninsta-controls {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ig-elevated-separator, #dbdbdb);
}

#uninsta-controls button {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

#uninsta-controls button:hover {
  opacity: 0.85;
}

#uninsta-controls button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

#uninsta-btn-start {
  background: #0095f6;
  color: #fff;
}

#uninsta-btn-stop {
  background: #ed4956;
  color: #fff;
}

#uninsta-btn-pick {
  background: var(--ig-secondary-background, #fafafa);
  color: var(--ig-primary-text, #262626);
  border: 1px solid var(--ig-elevated-separator, #dbdbdb) !important;
}

/* Log Area */
#uninsta-log {
  flex: 1;
  min-height: 120px;
  max-height: 300px;
  overflow-y: auto;
  padding: 8px 12px;
  font-family: "SF Mono", SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 11px;
  line-height: 1.6;
}

#uninsta-log .log-entry {
  margin-bottom: 2px;
}

#uninsta-log .log-success { color: #58c322; }
#uninsta-log .log-error { color: #ed4956; }
#uninsta-log .log-warn { color: #fdcb6e; }
#uninsta-log .log-info { color: #0095f6; }
#uninsta-log .log-debug { color: var(--ig-secondary-text, #8e8e8e); }

/* Progress Footer */
#uninsta-progress {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  font-size: 12px;
  color: var(--ig-secondary-text, #8e8e8e);
  border-top: 1px solid var(--ig-elevated-separator, #dbdbdb);
  gap: 8px;
}

#uninsta-progress-bar {
  flex: 1;
  height: 4px;
  background: var(--ig-elevated-separator, #dbdbdb);
  border-radius: 2px;
  overflow: hidden;
}

#uninsta-progress-bar-fill {
  height: 100%;
  background: #0095f6;
  border-radius: 2px;
  transition: width 0.3s ease;
  width: 0%;
}

/* Trigger Button */
#uninsta-trigger {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: var(--ig-primary-text, #262626);
  font-size: 20px;
  line-height: 1;
  display: flex;
  align-items: center;
}

#uninsta-trigger:hover {
  opacity: 0.7;
}

#uninsta-trigger.active {
  color: #ed4956;
}

/* Picker Mode Overlay */
.uninsta-pick-mode [role="row"],
.uninsta-pick-mode [role="listitem"] {
  cursor: crosshair !important;
}

.uninsta-pick-mode [role="row"]:hover,
.uninsta-pick-mode [role="listitem"]:hover {
  outline: 2px solid #0095f6;
  outline-offset: -2px;
  border-radius: 4px;
}

.uninsta-pick-highlight {
  outline: 2px solid #0095f6 !important;
  outline-offset: -2px;
  border-radius: 4px;
  background: rgba(0, 149, 246, 0.05) !important;
}
`;
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/styles.ts
git commit -m "feat: add panel CSS styles with Instagram theme integration"
```

---

### Task 9: UI Panel

**Files:**
- Create: `src/ui.ts`

- [ ] **Step 1: Create `src/ui.ts`**

```typescript
import type { Boundary, EngineState } from './types';
import { PANEL_CSS } from './styles';

export interface UIElements {
  panel: HTMLDivElement;
  logArea: HTMLDivElement;
  progressText: HTMLSpanElement;
  progressBarFill: HTMLDivElement;
  statusText: HTMLSpanElement;
  btnStart: HTMLButtonElement;
  btnStop: HTMLButtonElement;
  btnPick: HTMLButtonElement;
  pickerPreview: HTMLSpanElement;
  datetimeInput: HTMLInputElement;
  btnClearPicker: HTMLButtonElement;
}

export interface UICallbacks {
  onStart: (boundary: Boundary | null) => void;
  onStop: () => void;
  onPickModeEnter: () => void;
}

/**
 * Inject the CSS styles into the document head.
 */
export function injectStyles(): void {
  const style = document.createElement('style');
  style.textContent = PANEL_CSS;
  document.head.appendChild(style);
}

/**
 * Build the full floating panel and return references to key elements.
 */
export function buildPanel(callbacks: UICallbacks): UIElements {
  const panel = document.createElement('div');
  panel.id = 'uninsta-panel';
  panel.style.display = 'none';

  // Detect dark mode
  if (document.documentElement.classList.contains('dark') ||
      getComputedStyle(document.body).backgroundColor === 'rgb(0, 0, 0)') {
    panel.classList.add('dark');
  }

  panel.innerHTML = `
    <div id="uninsta-header">
      <h3>Uninsta</h3>
      <button id="uninsta-btn-minimize" title="Minimize">&minus;</button>
      <button id="uninsta-btn-close" title="Close">&times;</button>
    </div>
    <div id="uninsta-status">
      <div class="status-row">
        <span id="uninsta-status-text">Status: Ready</span>
      </div>
    </div>
    <div id="uninsta-boundary">
      <label>Boundary (optional)</label>
      <div class="picker-row">
        <button id="uninsta-btn-pick">Pick message</button>
        <span id="uninsta-picker-preview">No message selected</span>
        <button id="uninsta-btn-clear-picker" style="display:none" title="Clear">&times;</button>
      </div>
      <input type="datetime-local" id="uninsta-datetime" title="Unsend messages before this date">
    </div>
    <div id="uninsta-controls">
      <button id="uninsta-btn-start">Unsend All</button>
      <button id="uninsta-btn-stop" disabled>Stop</button>
    </div>
    <div id="uninsta-log"></div>
    <div id="uninsta-progress">
      <span id="uninsta-progress-text">Ready</span>
      <div id="uninsta-progress-bar">
        <div id="uninsta-progress-bar-fill"></div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Grab element references
  const elements: UIElements = {
    panel,
    logArea: panel.querySelector('#uninsta-log')!,
    progressText: panel.querySelector('#uninsta-progress-text')!,
    progressBarFill: panel.querySelector('#uninsta-progress-bar-fill')!,
    statusText: panel.querySelector('#uninsta-status-text')!,
    btnStart: panel.querySelector('#uninsta-btn-start')!,
    btnStop: panel.querySelector('#uninsta-btn-stop')!,
    btnPick: panel.querySelector('#uninsta-btn-pick')!,
    pickerPreview: panel.querySelector('#uninsta-picker-preview')!,
    datetimeInput: panel.querySelector('#uninsta-datetime')!,
    btnClearPicker: panel.querySelector('#uninsta-btn-clear-picker')!,
  };

  // Wire up close/minimize
  panel.querySelector('#uninsta-btn-close')!.addEventListener('click', () => {
    panel.style.display = 'none';
  });

  panel.querySelector('#uninsta-btn-minimize')!.addEventListener('click', () => {
    const body = panel.querySelector('#uninsta-boundary') as HTMLElement;
    const log = elements.logArea;
    const controls = panel.querySelector('#uninsta-controls') as HTMLElement;
    const isMinimized = body.style.display === 'none';
    body.style.display = isMinimized ? '' : 'none';
    log.style.display = isMinimized ? '' : 'none';
    controls.style.display = isMinimized ? '' : 'none';
  });

  // Wire up start/stop
  elements.btnStart.addEventListener('click', () => {
    const boundary = getBoundaryFromUI(elements);
    callbacks.onStart(boundary);
  });

  elements.btnStop.addEventListener('click', () => {
    callbacks.onStop();
  });

  // Wire up pick button
  elements.btnPick.addEventListener('click', () => {
    callbacks.onPickModeEnter();
  });

  // Wire up clear picker
  elements.btnClearPicker.addEventListener('click', () => {
    elements.pickerPreview.textContent = 'No message selected';
    elements.pickerPreview.removeAttribute('data-item-id');
    elements.btnClearPicker.style.display = 'none';
  });

  // Make header draggable
  setupDrag(panel, panel.querySelector('#uninsta-header')!);

  return elements;
}

function getBoundaryFromUI(elements: UIElements): Boundary | null {
  const boundary: Boundary = {};

  const pickedId = elements.pickerPreview.getAttribute('data-item-id');
  if (pickedId) {
    boundary.messageId = pickedId;
  }

  const datetimeValue = elements.datetimeInput.value;
  if (datetimeValue) {
    // Convert to microseconds (Instagram uses microsecond timestamps)
    boundary.timestamp = new Date(datetimeValue).getTime() * 1000;
  }

  if (!boundary.messageId && !boundary.timestamp) return null;
  return boundary;
}

/**
 * Create the trigger button to toggle the panel.
 */
export function createTriggerButton(panel: HTMLDivElement): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = 'uninsta-trigger';
  btn.title = 'Uninsta - Unsend messages';
  btn.innerHTML = '\u2716'; // X mark character
  btn.addEventListener('click', () => {
    const isVisible = panel.style.display !== 'none';
    panel.style.display = isVisible ? 'none' : 'flex';
  });
  return btn;
}

/**
 * Inject the trigger button into Instagram's chat header.
 * Retries with a MutationObserver if the header isn't found yet.
 */
export function injectTriggerButton(btn: HTMLButtonElement): void {
  function tryInject(): boolean {
    // Instagram's chat header area -- look for common container patterns
    const header =
      document.querySelector('[role="banner"]') ||
      document.querySelector('header') ||
      document.querySelector('[data-pagelet="ChatHeader"]');
    if (header) {
      header.appendChild(btn);
      return true;
    }
    return false;
  }

  if (tryInject()) return;

  // If not found yet, observe for DOM changes
  const observer = new MutationObserver(() => {
    if (tryInject()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Give up after 30 seconds
  setTimeout(() => observer.disconnect(), 30000);
}

/**
 * Append a log entry to the log area.
 */
export function appendLog(
  logArea: HTMLDivElement,
  message: string,
  level: 'info' | 'success' | 'warn' | 'error' | 'debug',
): void {
  const entry = document.createElement('div');
  entry.className = `log-entry log-${level}`;
  entry.textContent = message;
  logArea.appendChild(entry);
  logArea.scrollTop = logArea.scrollHeight;
}

/**
 * Update the progress display.
 */
export function updateProgress(
  elements: UIElements,
  state: EngineState,
): void {
  const total = state.totalFound || 1;
  const done = state.unsentCount + state.failedCount + state.skippedCount;
  const pct = state.totalFound > 0 ? Math.round((done / total) * 100) : 0;
  elements.progressText.textContent = `[${done}/${state.totalFound}] ${pct}%`;
  elements.progressBarFill.style.width = `${pct}%`;
}

/**
 * Set UI into running or stopped state.
 */
export function setRunningState(elements: UIElements, running: boolean): void {
  elements.btnStart.disabled = running;
  elements.btnStop.disabled = !running;
  elements.statusText.textContent = running ? 'Status: Running...' : 'Status: Ready';
}

/**
 * Simple drag functionality for the panel.
 */
function setupDrag(panel: HTMLElement, handle: HTMLElement): void {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startRight = 0;
  let startTop = 0;

  handle.addEventListener('mousedown', (e: MouseEvent) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startRight = parseInt(panel.style.right || '16', 10);
    startTop = parseInt(panel.style.top || '60', 10);
    handle.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.right = `${startRight - dx}px`;
    panel.style.top = `${startTop + dy}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      handle.style.cursor = 'grab';
    }
  });
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/ui.ts
git commit -m "feat: add floating UI panel with controls, log, and progress bar"
```

---

### Task 10: Boundary Message Picker

**Files:**
- Create: `src/picker.ts`

- [ ] **Step 1: Create `src/picker.ts`**

```typescript
import type { UIElements } from './ui';

/**
 * Attempt to extract the Instagram item_id from a clicked message DOM element.
 * Instagram may store this in data attributes or in the React fiber tree.
 * Returns null if extraction fails.
 */
function extractItemId(element: HTMLElement): string | null {
  // Walk up from clicked element to find the message container
  let el: HTMLElement | null = element;
  while (el && el !== document.body) {
    // Check data attributes
    if (el.dataset.itemId) return el.dataset.itemId;
    if (el.dataset.messageId) return el.dataset.messageId;

    // Check React fiber internals (Instagram uses React)
    const fiberKey = Object.keys(el).find((key) => key.startsWith('__reactFiber$'));
    if (fiberKey) {
      let fiber = (el as any)[fiberKey];
      // Walk up the fiber tree looking for message props
      let depth = 0;
      while (fiber && depth < 15) {
        const props = fiber.memoizedProps || fiber.pendingProps;
        if (props) {
          if (props.itemId) return String(props.itemId);
          if (props.item_id) return String(props.item_id);
          if (props.message?.item_id) return String(props.message.item_id);
          if (props.messageId) return String(props.messageId);
        }
        fiber = fiber.return;
        depth++;
      }
    }

    el = el.parentElement;
  }
  return null;
}

/**
 * Extract a text preview from the clicked message element.
 */
function extractPreview(element: HTMLElement): string {
  const text = element.textContent?.trim() || '';
  if (text.length > 50) return text.substring(0, 50) + '...';
  return text || '[media]';
}

/**
 * Enter pick mode: highlight messages on hover, capture click.
 * Returns a cleanup function to exit pick mode.
 */
export function enterPickMode(
  uiElements: UIElements,
  onPicked: (itemId: string, preview: string) => void,
  onFail: () => void,
): () => void {
  document.body.classList.add('uninsta-pick-mode');
  uiElements.btnPick.textContent = 'Click a message...';
  uiElements.btnPick.disabled = true;

  function handleClick(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    const itemId = extractItemId(target);

    if (itemId) {
      const preview = extractPreview(target);
      onPicked(itemId, preview);
    } else {
      onFail();
    }

    cleanup();
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      cleanup();
      onFail();
    }
  }

  // Use capture phase to intercept before Instagram's own handlers
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeydown, true);

  function cleanup(): void {
    document.body.classList.remove('uninsta-pick-mode');
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeydown, true);
    uiElements.btnPick.textContent = 'Pick message';
    uiElements.btnPick.disabled = false;
  }

  return cleanup;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/picker.ts
git commit -m "feat: add click-to-pick boundary message selector"
```

---

### Task 11: Main Entry Point (Wire Everything Together)

**Files:**
- Modify: `src/main.ts` (replace placeholder)

- [ ] **Step 1: Replace `src/main.ts` with full entry point**

Replace the entire contents of `src/main.ts` with:

```typescript
import type { Boundary, EngineState } from './types';
import { installInterceptor } from './interceptor';
import { getAuth, getThreadId } from './auth';
import { UnsendEngine } from './engine';
import {
  injectStyles,
  buildPanel,
  createTriggerButton,
  injectTriggerButton,
  appendLog,
  updateProgress,
  setRunningState,
} from './ui';
import type { UIElements } from './ui';
import { enterPickMode } from './picker';

(function uninsta() {
  'use strict';

  // Install the fetch interceptor immediately to start capturing x-ig-app-id
  installInterceptor();

  let engine: UnsendEngine | null = null;
  let uiElements: UIElements;
  let pickModeCleanup: (() => void) | null = null;

  function log(message: string, level: 'info' | 'success' | 'warn' | 'error' | 'debug'): void {
    appendLog(uiElements.logArea, message, level);
  }

  function handleStart(boundary: Boundary | null): void {
    const threadId = getThreadId();
    if (!threadId) {
      log('Navigate to a DM conversation first.', 'warn');
      return;
    }

    const result = getAuth();
    if (!result.auth) {
      log(result.reason, 'error');
      return;
    }

    // Clear log
    uiElements.logArea.innerHTML = '';

    setRunningState(uiElements, true);

    engine = new UnsendEngine(threadId, result.auth, boundary, {
      onLog: log,
      onProgress: (state: EngineState) => updateProgress(uiElements, state),
      onComplete: (state: EngineState) => {
        setRunningState(uiElements, false);
        updateProgress(uiElements, state);
        uiElements.statusText.textContent = 'Status: Done';
        log(
          `Complete. Unsent: ${state.unsentCount}, Failed: ${state.failedCount}, Skipped: ${state.skippedCount}`,
          'info',
        );
      },
    });

    engine.start();
  }

  function handleStop(): void {
    if (engine) {
      engine.stop();
      setRunningState(uiElements, false);
      uiElements.statusText.textContent = 'Status: Stopped';
    }
  }

  function handlePickModeEnter(): void {
    if (pickModeCleanup) pickModeCleanup();

    pickModeCleanup = enterPickMode(
      uiElements,
      (itemId: string, preview: string) => {
        uiElements.pickerPreview.textContent = preview;
        uiElements.pickerPreview.setAttribute('data-item-id', itemId);
        uiElements.btnClearPicker.style.display = '';
        log(`Boundary set: ${preview} (ID: ${itemId})`, 'info');
        pickModeCleanup = null;
      },
      () => {
        log('Pick mode cancelled or failed to read message ID. Use the date input instead.', 'warn');
        pickModeCleanup = null;
      },
    );
  }

  function init(): void {
    injectStyles();

    uiElements = buildPanel({
      onStart: handleStart,
      onStop: handleStop,
      onPickModeEnter: handlePickModeEnter,
    });

    const triggerBtn = createTriggerButton(uiElements.panel);
    injectTriggerButton(triggerBtn);
  }

  // Wait for the page to be ready
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: `dist/uninsta.user.js` created with Tampermonkey header + obfuscated code.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire up entry point connecting all modules"
```

---

### Task 12: GitHub Actions Release Workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  build-and-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - run: npm run build

      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          files: dist/uninsta.user.js
          generate_release_notes: true
```

- [ ] **Step 2: Commit**

```bash
mkdir -p .github/workflows
git add .github/workflows/release.yml
git commit -m "ci: add GitHub Actions release workflow"
```

---

### Task 13: Final Build Verification & Initial Release Tag

- [ ] **Step 1: Run full build from clean state**

Run: `rm -rf dist && npm run build`
Expected: `dist/uninsta.user.js` is created. Starts with `// ==UserScript==` header. Remainder is obfuscated.

- [ ] **Step 2: Verify the header is intact**

Run: `head -12 dist/uninsta.user.js`
Expected output:
```
// ==UserScript==
// @name            Uninsta
// @description     Unsend all your messages in an Instagram DM conversation
// @version         0.1.0
// @author          Catalin Teodorescu
// @match           https://www.instagram.com/direct/*
// @grant           none
// @run-at          document-idle
// @license         MIT
// ==/UserScript==
```

- [ ] **Step 3: Verify the obfuscated code is present after the header**

Run: `sed -n '11,12p' dist/uninsta.user.js`
Expected: Line 11+ contains obfuscated JavaScript (hex variable names, encoded strings).

- [ ] **Step 4: Commit all remaining files**

```bash
git add -A
git commit -m "feat: complete Uninsta v0.1.0 - Instagram DM bulk unsend userscript"
```

- [ ] **Step 5: Push**

```bash
git push origin main
```
