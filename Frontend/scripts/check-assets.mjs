import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const galleryPage = join(projectRoot, 'src', 'app', 'gallery', 'page.tsx');

if (!existsSync(galleryPage)) {
  console.error('Gallery page not found at', galleryPage);
  process.exit(1);
}

const content = readFileSync(galleryPage, 'utf8');
const assetRegex = /\/(assets\/[^"'\)\s]+)\b/g;
let match;
const assets = new Set();
while ((match = assetRegex.exec(content)) !== null) {
  assets.add(match[1]);
}

if (assets.size === 0) {
  console.log('No assets referenced in gallery page.');
  process.exit(0);
}

console.log('Referenced assets:');
const missing = [];
assets.forEach((asset) => {
  const assetPath = join(projectRoot, 'public', asset);
  const exists = existsSync(assetPath);
  console.log('-', asset, exists ? '' : '(MISSING)');
  if (!exists) missing.push(asset);
});

if (missing.length) {
  console.log('\nMissing assets detected. Please add the missing files under public/ or update the gallery page to point to existing assets.');
  process.exit(2);
}

console.log('\nAll referenced assets exist.');
process.exit(0);