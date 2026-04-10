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
  stringArrayEncoding: ['base64' as const],
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
