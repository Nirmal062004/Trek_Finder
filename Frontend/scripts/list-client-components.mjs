import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..', 'src');
const extensions = ['.tsx', '.ts', '.jsx', '.js'];
const results = [];

function walk(directory) {
  const items = readdirSync(directory, { withFileTypes: true });
  for (const item of items) {
    const fullPath = join(directory, item.name);
    if (item.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!extensions.includes(extname(item.name))) continue;
    try {
      const content = readFileSync(fullPath, 'utf8');
      const head = content.slice(0, 200);
      if (/^\s*['"]use client['"];?/m.test(head)) {
        results.push(fullPath.replace(process.cwd() + sep, ''));
      }
    } catch { }
  }
}

if (!existsSync(root)) {
  console.error('src/ directory not found');
  process.exit(2);
}

walk(root);
if (results.length === 0) {
  console.log('No client components found.');
  process.exit(0);
}
console.log('Files that start with `use client` (consider converting to server components where safe):');
results.forEach((result) => console.log('-', result));
process.exit(0);