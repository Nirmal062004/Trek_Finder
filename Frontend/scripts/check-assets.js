const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const galleryPage = path.join(projectRoot, 'src', 'app', 'gallery', 'page.tsx');

if (!fs.existsSync(galleryPage)) {
  console.error('Gallery page not found at', galleryPage);
  process.exit(1);
}

const content = fs.readFileSync(galleryPage, 'utf8');
const assetRegex = /\/(assets\/[^"'\)\s]+)\b/g;
let m;
const assets = new Set();
while ((m = assetRegex.exec(content)) !== null) {
  assets.add(m[1]);
}

if (assets.size === 0) {
  console.log('No assets referenced in gallery page.');
  process.exit(0);
}

console.log('Referenced assets:');
const missing = [];
assets.forEach(a => {
  const p = path.join(projectRoot, 'public', a);
  const exists = fs.existsSync(p);
  console.log('-', a, exists ? '' : '(MISSING)');
  if (!exists) missing.push(a);
});

if (missing.length) {
  console.log('\nMissing assets detected. Please add the missing files under public/ or update the gallery page to point to existing assets.');
  process.exit(2);
}

console.log('\nAll referenced assets exist.');
process.exit(0);
