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
