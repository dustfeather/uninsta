import { buildSync } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import archiver from 'archiver';
import * as sass from 'sass';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const buildVersion = process.env.UNINSTA_VERSION || pkg.version.replace(/-.*$/, '') || '0.0.0';

// ── 0. Compile SCSS ─────────────────────────────────────────────────────────

// Extension panel styles → src/styles.ts (consumed by esbuild)
const panelResult = sass.compile(join(root, 'src/panel.scss'), { style: 'expanded' });
const panelCss = panelResult.css.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
writeFileSync(
  join(root, 'src/styles.ts'),
  `// Generated from src/panel.scss — do not edit directly\nexport const PANEL_CSS = \`\n${panelCss}\`;\n`,
);
console.log('Compiled src/panel.scss → src/styles.ts');

// Landing page styles → docs/styles.css (served by GitHub Pages)
const pageResult = sass.compile(join(root, 'docs/page.scss'), { style: 'expanded' });
writeFileSync(
  join(root, 'docs/styles.css'),
  `/* Generated from docs/page.scss — do not edit directly */\n${pageResult.css}`,
);
console.log('Compiled docs/page.scss → docs/styles.css');

// ── 0.5. Typecheck ──────────────────────────────────────────────────────────

execSync('npx tsc --noEmit', { cwd: root, stdio: 'inherit' });

// ── 1. Bundle helpers ───────────────────────────────────────────────────────

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

// ── 2. Userscript build ─────────────────────────────────────────────────────

const tmHeader = `// ==UserScript==
// @name            unInsta
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

// ── 3. Extension build ──────────────────────────────────────────────────────

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
  name: 'unInsta',
  description: 'Unsend all your messages in an Instagram DM conversation',
  version: buildVersion,
  permissions: [] as string[],
  action: {
    default_icon: {
      '16': 'icons/icon16-gray.png',
      '32': 'icons/icon32-gray.png',
      '48': 'icons/icon48-gray.png',
      '128': 'icons/icon128-gray.png',
    },
    default_title: 'unInsta - Toggle panel',
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
    scripts: ['background.js'],
  },
  browser_specific_settings: {
    gecko: {
      id: 'uninsta@dustfeather',
      strict_min_version: '149.0',
      data_collection_permissions: {
        required: ['none'],
      },
    },
  },
};
writeFileSync(join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Copy icons
cpSync(join(root, 'extension/icons'), join(extDir, 'icons'), { recursive: true });

// Generate grayscale icons for inactive state
const iconSizes = [16, 32, 48, 128];

async function generateGrayIcons(): Promise<void> {
  await Promise.all(
    iconSizes.map((size) =>
      sharp(join(extDir, `icons/icon${size}.png`))
        .grayscale()
        .toFile(join(extDir, `icons/icon${size}-gray.png`)),
    ),
  );
}

// ── 4. Zip extension ────────────────────────────────────────────────────────

async function zipDir(dir: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Built ${outPath} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(dir, false);
    archive.finalize();
  });
}

(async () => {
  await generateGrayIcons();
  console.log(`Built dist/extension/ (v${buildVersion})`);

  await Promise.all([
    zipDir(extDir, join(root, 'dist/uninsta-extension.zip')),
    zipDir(extDir, join(root, 'dist/uninsta-extension.xpi')),
  ]);
})();
