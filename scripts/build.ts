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
