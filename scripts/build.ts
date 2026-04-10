import { buildSync } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const buildVersion = process.env.UNINSTA_VERSION || pkg.version;

function bundle(entryPoint: string): string {
  const result = buildSync({
    entryPoints: [entryPoint],
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2020',
    write: false,
  });
  return new TextDecoder().decode(result.outputFiles[0].contents);
}

// ── 1. Userscript build ─────────────────────────────────────────────────────

const tmHeader = `// ==UserScript==
// @name            Uninsta
// @description     Unsend all your messages in an Instagram DM conversation
// @version         ${buildVersion}
// @author          ${pkg.author}
// @match           https://www.instagram.com/direct/*
// @grant           none
// @run-at          document-idle
// @license         GPL-3.0-only
// ==/UserScript==
`;

const userscriptCode = bundle(join(root, 'src/main.ts'));
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/uninsta.user.js'), tmHeader + userscriptCode);
console.log(`Built dist/uninsta.user.js (v${buildVersion})`);

// ── 2. Extension build ──────────────────────────────────────────────────────

const extDir = join(root, 'dist/extension');
mkdirSync(join(extDir, 'icons'), { recursive: true });

// Content script (same code as userscript, no TM header)
writeFileSync(join(extDir, 'content.js'), bundle(join(root, 'src/main.ts')));

// Bridge script
writeFileSync(join(extDir, 'bridge.js'), bundle(join(root, 'src/bridge.ts')));

// Background service worker
writeFileSync(join(extDir, 'background.js'), bundle(join(root, 'src/background.ts')));

// Manifest
const manifest = {
  manifest_version: 3,
  name: 'Uninsta',
  description: 'Unsend all your messages in an Instagram DM conversation',
  version: buildVersion,
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
    '256': 'icons/icon256.png',
    '512': 'icons/icon512.png',
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

console.log(`Built dist/extension/ (v${buildVersion})`);

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
