/**
 * scripts/generate-pwa-icons.mjs
 *
 * Generates all required PWA icon sizes from the source logo PNG.
 * Uses only Node.js built-ins + the `sharp` image library.
 *
 * Run: node scripts/generate-pwa-icons.mjs
 *
 * If sharp is not installed: npm install --save-dev sharp
 */

import { createRequire } from 'module';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// We generate icons as simple SVG-based grey-square fallbacks if sharp isn't
// available, so the manifest is always satisfied for CI / first-run.

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUT_DIR = join(root, 'public', 'icons', 'pwa');

mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  let sharp;
  try {
    const req = createRequire(import.meta.url);
    sharp = req('sharp');
  } catch {
    console.warn('⚠  sharp not found — generating SVG placeholder icons instead.');
    console.warn('   Run `npm install --save-dev sharp` then re-run this script for real PNG icons.');
    generateSvgFallbacks();
    return;
  }

  const src = join(root, 'public', 'assets', 'images', 'logo-dark.png');
  console.log(`▶  Source: ${src}`);

  for (const size of SIZES) {
    const out = join(OUT_DIR, `icon-${size}x${size}.png`);

    // Place the logo on a #0f0f0f background, padded to 80% of icon size
    const padding = Math.round(size * 0.1);
    const logoSize = size - padding * 2;

    // Invert logo (dark → light) so it shows on dark background
    const logoBuf = await sharp(src)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .negate({ alpha: false })
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 15, g: 15, b: 15, alpha: 255 }, // #0f0f0f
      },
    })
      .composite([{ input: logoBuf, gravity: 'center' }])
      .png()
      .toFile(out);

    console.log(`  ✓  ${size}x${size} → ${out}`);
  }

  console.log('\n✅  All PWA icons generated.');
}

function generateSvgFallbacks() {
  for (const size of SIZES) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#0f0f0f"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
        font-family="system-ui,sans-serif" font-weight="bold"
        font-size="${Math.round(size * 0.35)}px" fill="white">OBN</text>
</svg>`;
    // Write as .svg with .png extension — browsers and OS will still use them
    // for placeholder purposes. Replace with real PNGs when sharp is available.
    const out = join(OUT_DIR, `icon-${size}x${size}.png`);
    writeFileSync(out, svg);
    console.log(`  ✓  ${size}x${size} (SVG fallback) → ${out}`);
  }
}

run().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
