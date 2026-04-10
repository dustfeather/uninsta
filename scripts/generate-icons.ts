import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'extension', 'icons');
mkdirSync(iconsDir, { recursive: true });

// Logo: rounded chat bubble with Instagram gradient + undo arrow inside
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFDC80"/>
      <stop offset="15%" stop-color="#F77737"/>
      <stop offset="40%" stop-color="#E1306C"/>
      <stop offset="65%" stop-color="#C13584"/>
      <stop offset="90%" stop-color="#833AB4"/>
      <stop offset="100%" stop-color="#5851DB"/>
    </linearGradient>
  </defs>

  <!-- Chat bubble -->
  <path d="
    M 256 48
    C 141 48 48 130 48 232
    C 48 290 76 342 120 378
    L 96 456
    L 180 408
    C 204 418 230 424 256 424
    C 371 424 464 342 464 232
    C 464 130 371 48 256 48
    Z
  " fill="url(#ig)"/>

  <!-- Undo arrow (white) -->
  <!-- Arrow curve -->
  <path d="
    M 200 210
    A 80 80 0 1 1 280 310
  " fill="none" stroke="white" stroke-width="32" stroke-linecap="round"/>

  <!-- Arrowhead -->
  <polygon points="200,160 200,260 148,210" fill="white"/>
</svg>
`;

const sizes = [16, 32, 48, 128, 256, 512];

async function generate() {
  for (const size of sizes) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, `icon${size}.png`));
    console.log(`Generated icon${size}.png (${size}x${size})`);
  }
}

generate();
