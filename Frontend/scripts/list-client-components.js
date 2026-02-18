const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'src');
const exts = ['.tsx', '.ts', '.jsx', '.js'];
const results = [];

function walk(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) {
      walk(full);
      continue;
    }
    if (!exts.includes(path.extname(it.name))) continue;
    try {
      const content = fs.readFileSync(full, 'utf8');
      // look for 'use client' either single or double quoted near top of file
      const head = content.slice(0, 200);
      if (/^\s*['"]use client['"];?/m.test(head)) {
        results.push(full.replace(process.cwd() + path.sep, ''));
      }
    } catch (err) {}
  }
}

if (!fs.existsSync(root)) {
  console.error('src/ directory not found');
  process.exit(2);
}

walk(root);
if (results.length === 0) {
  console.log('No client components found.');
  process.exit(0);
}
console.log('Files that start with `use client` (consider converting to server components where safe):');
results.forEach(r => console.log('-', r));
process.exit(0);
