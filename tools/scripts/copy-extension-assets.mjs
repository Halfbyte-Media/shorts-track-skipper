import { cp, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const [,, target] = process.argv;

if (!target) {
  console.error('Usage: node copy-extension-assets.mjs <target>');
  process.exit(1);
}

const cwd = process.cwd();
const distDir = path.join(cwd, 'dist');
const manifestPath = path.join(cwd, 'manifest.json');
const publicDir = path.join(cwd, 'public');

try {
  await mkdir(distDir, { recursive: true });
  await cp(manifestPath, path.join(distDir, 'manifest.json'));
} catch (error) {
  console.error(`[copy:${target}] Failed copying manifest`, error);
  process.exit(1);
}

try {
  await cp(publicDir, distDir, { recursive: true });
} catch (error) {
  const code = typeof error === 'object' && error && 'code' in error ? error.code : undefined;
  if (code !== 'ENOENT') {
    console.error(`[copy:${target}] Failed copying public assets`, error);
    process.exit(1);
  }
}

const msg = `Copied manifest + static assets for ${target}`;
await readFile(manifestPath);
console.info(msg);
