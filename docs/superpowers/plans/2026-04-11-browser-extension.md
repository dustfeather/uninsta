# Browser Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a browser extension build target (Chrome/Firefox/Edge MV3) alongside the existing Tampermonkey userscript, sharing the same core source code.

**Architecture:** The existing `src/main.ts` content script runs in the MAIN world (for `window.fetch` interception). A tiny `src/bridge.ts` in the ISOLATED world relays toolbar icon clicks from the background service worker to the content script via `CustomEvent`. The build script is extended to produce both `dist/uninsta.user.js` and `dist/extension/` (zipped as `dist/uninsta-extension.zip`).

**Tech Stack:** TypeScript, esbuild, javascript-obfuscator, archiver (zip), Chrome MV3 APIs

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/background.ts` | Create | MV3 service worker -- relay toolbar icon click to content script |
| `src/bridge.ts` | Create | ISOLATED world content script -- relay `chrome.runtime.onMessage` to `CustomEvent` |
| `src/main.ts` | Modify | Add `uninsta-toggle` CustomEvent listener for panel toggle |
| `scripts/build.ts` | Modify | Add extension build step (bundle, obfuscate, manifest, icons, zip) |
| `extension/icons/icon16.png` | Create | 16x16 extension icon |
| `extension/icons/icon32.png` | Create | 32x32 extension icon |
| `extension/icons/icon48.png` | Create | 48x48 extension icon |
| `extension/icons/icon128.png` | Create | 128x128 extension icon |
| `package.json` | Modify | Add `archiver` dev dependency |
| `.github/workflows/release.yml` | Modify | Attach `uninsta-extension.zip` to releases |

---

### Task 1: Add `archiver` Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install archiver**

Run: `npm install --save-dev archiver @types/archiver`

- [ ] **Step 2: Verify install**

Run: `npm ls archiver`
Expected: Shows `archiver` in the dependency tree.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add archiver for extension zip packaging"
```

---

### Task 2: Create Extension Icons

**Files:**
- Create: `extension/icons/icon16.png`
- Create: `extension/icons/icon32.png`
- Create: `extension/icons/icon48.png`
- Create: `extension/icons/icon128.png`

- [ ] **Step 1: Create icons directory**

Run: `mkdir -p extension/icons`

- [ ] **Step 2: Generate placeholder icons**

Use Node to generate simple colored PNG icons with a "U" letter. Create a script `scripts/generate-icons.ts`:

```typescript
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'extension', 'icons');
mkdirSync(iconsDir, { recursive: true });

// Minimal valid PNG generator for solid-color square icons
function createPng(size: number): Buffer {
  // Create a simple PNG with Instagram-blue background
  // Using raw IDAT with no compression for simplicity
  const width = size;
  const height = size;

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT chunk - raw pixel data
  // Each row: filter byte (0) + RGB pixels
  const rawData: number[] = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter: none
    for (let x = 0; x < width; x++) {
      // Instagram blue: #0095f6
      rawData.push(0x00, 0x95, 0xf6);
    }
  }

  // Deflate the raw data (use zlib)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = createChunk('IDAT', compressed);

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);

  // CRC32
  let crc = 0xffffffff;
  for (let i = 0; i < crcData.length; i++) {
    crc ^= crcData[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  crc ^= 0xffffffff;
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

for (const size of [16, 32, 48, 128]) {
  const png = createPng(size);
  writeFileSync(join(iconsDir, `icon${size}.png`), png);
  console.log(`Generated icon${size}.png`);
}
```

Run: `npx tsx scripts/generate-icons.ts`
Expected: Four PNG files created in `extension/icons/`.

- [ ] **Step 3: Verify icons exist**

Run: `ls -la extension/icons/`
Expected: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png` all present.

- [ ] **Step 4: Commit**

```bash
git add extension/icons/
git commit -m "feat: add extension placeholder icons"
```

---

### Task 3: Create Background Service Worker

**Files:**
- Create: `src/background.ts`

- [ ] **Step 1: Create `src/background.ts`**

```typescript
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'uninsta-toggle' });
  }
});
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: Will fail because `chrome` types are not installed.

- [ ] **Step 3: Install Chrome types**

Run: `npm install --save-dev @anthropic-ai/sdk@latest 2>/dev/null; npm install --save-dev @anthropic-ai/sdk@latest 2>/dev/null; npm install --save-dev @anthropic-ai/sdk@latest 2>/dev/null; npm install --save-dev @types/chrome`

Run: `npm install --save-dev @types/chrome`

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/background.ts package.json package-lock.json
git commit -m "feat: add extension background service worker"
```

---

### Task 4: Create Bridge Script

**Files:**
- Create: `src/bridge.ts`

- [ ] **Step 1: Create `src/bridge.ts`**

```typescript
chrome.runtime.onMessage.addListener((msg: { type: string }) => {
  if (msg.type === 'uninsta-toggle') {
    document.dispatchEvent(new CustomEvent('uninsta-toggle'));
  }
});
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/bridge.ts
git commit -m "feat: add ISOLATED-to-MAIN world bridge for toolbar toggle"
```

---

### Task 5: Update Main Entry Point with Toggle Listener

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Add CustomEvent listener in the `init` function**

In `src/main.ts`, add the following after the `injectTriggerButton(triggerBtn)` line (around line 113):

```typescript
    // Listen for toolbar icon toggle (from extension bridge script)
    document.addEventListener('uninsta-toggle', () => {
      const isVisible = uiElements.panel.style.display !== 'none';
      uiElements.panel.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) refreshStatusInfo();
    });
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Verify userscript still builds**

Run: `npm run build`
Expected: `dist/uninsta.user.js` created successfully.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: add CustomEvent listener for extension toolbar toggle"
```

---

### Task 6: Extend Build Script for Extension Output

**Files:**
- Modify: `scripts/build.ts`

- [ ] **Step 1: Replace `scripts/build.ts` with the extended version**

Replace the entire contents of `scripts/build.ts` with:

```typescript
import { buildSync } from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { readFileSync, writeFileSync, mkdirSync, cpSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));

const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: false,
  stringArray: true,
  stringArrayEncoding: ['base64'] as const,
  stringArrayThreshold: 0.75,
  identifierNamesGenerator: 'hexadecimal' as const,
  renameGlobals: false,
  selfDefending: false,
  transformObjectKeys: true,
};

function bundleAndObfuscate(entryPoint: string): string {
  const result = buildSync({
    entryPoints: [entryPoint],
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2020',
    write: false,
  });
  const bundled = new TextDecoder().decode(result.outputFiles[0].contents);
  return JavaScriptObfuscator.obfuscate(bundled, obfuscatorOptions).getObfuscatedCode();
}

// ── 1. Userscript build ─────────────────────────────────────────────────────

const tmHeader = `// ==UserScript==
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

const userscriptCode = bundleAndObfuscate(join(root, 'src/main.ts'));
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/uninsta.user.js'), tmHeader + userscriptCode);
console.log(`Built dist/uninsta.user.js (v${pkg.version})`);

// ── 2. Extension build ──────────────────────────────────────────────────────

const extDir = join(root, 'dist/extension');
mkdirSync(join(extDir, 'icons'), { recursive: true });

// Content script (same code as userscript, no TM header)
const contentCode = bundleAndObfuscate(join(root, 'src/main.ts'));
writeFileSync(join(extDir, 'content.js'), contentCode);

// Bridge script
const bridgeCode = bundleAndObfuscate(join(root, 'src/bridge.ts'));
writeFileSync(join(extDir, 'bridge.js'), bridgeCode);

// Background service worker
const backgroundCode = bundleAndObfuscate(join(root, 'src/background.ts'));
writeFileSync(join(extDir, 'background.js'), backgroundCode);

// Manifest
const manifest = {
  manifest_version: 3,
  name: 'Uninsta',
  description: 'Unsend all your messages in an Instagram DM conversation',
  version: pkg.version,
  permissions: [] as string[],
  action: {
    default_icon: {
      '16': 'icons/icon16.png',
      '32': 'icons/icon32.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
    default_title: 'Uninsta - Toggle panel',
  },
  icons: {
    '16': 'icons/icon16.png',
    '32': 'icons/icon32.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
  content_scripts: [
    {
      matches: ['https://www.instagram.com/direct/*'],
      js: ['content.js'],
      run_at: 'document_idle',
      world: 'MAIN',
    },
    {
      matches: ['https://www.instagram.com/direct/*'],
      js: ['bridge.js'],
      run_at: 'document_idle',
      world: 'ISOLATED',
    },
  ],
  background: {
    service_worker: 'background.js',
  },
  browser_specific_settings: {
    gecko: {
      id: 'uninsta@dustfeather',
    },
  },
};
writeFileSync(join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Copy icons
cpSync(join(root, 'extension/icons'), join(extDir, 'icons'), { recursive: true });

console.log(`Built dist/extension/ (v${pkg.version})`);

// ── 3. Zip extension ────────────────────────────────────────────────────────

async function zipExtension(): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(join(root, 'dist/uninsta-extension.zip'));
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Built dist/uninsta-extension.zip (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(extDir, false);
    archive.finalize();
  });
}

zipExtension();
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Run the build**

Run: `rm -rf dist && npm run build`
Expected: Output shows all three built:
```
Built dist/uninsta.user.js (v...)
Built dist/extension/ (v...)
Built dist/uninsta-extension.zip (... bytes)
```

- [ ] **Step 4: Verify extension output structure**

Run: `ls dist/extension/`
Expected: `background.js`, `bridge.js`, `content.js`, `icons/`, `manifest.json`

- [ ] **Step 5: Verify manifest content**

Run: `node -e "console.log(JSON.parse(require('fs').readFileSync('dist/extension/manifest.json','utf8')).manifest_version)"`
Expected: `3`

- [ ] **Step 6: Verify zip exists**

Run: `ls -la dist/uninsta-extension.zip`
Expected: File exists with non-zero size.

- [ ] **Step 7: Commit**

```bash
git add scripts/build.ts
git commit -m "feat: extend build script to produce browser extension output"
```

---

### Task 7: Update GitHub Action to Attach Extension Zip

**Files:**
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Update the release workflow**

In `.github/workflows/release.yml`, change the `files` line in the "Create tag and release" step from:

```yaml
          files: dist/uninsta.user.js
```

to:

```yaml
          files: |
            dist/uninsta.user.js
            dist/uninsta-extension.zip
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: attach extension zip to GitHub Releases"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Clean build**

Run: `rm -rf dist && npm run build`
Expected: All outputs created without errors.

- [ ] **Step 2: Verify userscript header**

Run: `head -11 dist/uninsta.user.js`
Expected: Clean Tampermonkey metadata header.

- [ ] **Step 3: Verify extension manifest**

Run: `cat dist/extension/manifest.json`
Expected: Valid JSON with `manifest_version: 3`, correct `content_scripts` with both MAIN and ISOLATED world entries, `browser_specific_settings.gecko.id`.

- [ ] **Step 4: Verify all extension JS files are obfuscated**

Run: `head -c 100 dist/extension/content.js && echo && head -c 100 dist/extension/bridge.js && echo && head -c 100 dist/extension/background.js`
Expected: All three show hex-identifier obfuscated code.

- [ ] **Step 5: Verify icons are in the zip**

Run: `unzip -l dist/uninsta-extension.zip | grep icon`
Expected: Four icon files listed.

- [ ] **Step 6: Commit and push**

```bash
git add -A
git commit -m "feat: complete browser extension build (Chrome/Firefox/Edge MV3)"
git push origin main
```
