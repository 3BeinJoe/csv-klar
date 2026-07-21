import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
const publicFiles = [
  '.nojekyll',
  'favicon.svg',
  'index.html',
  'robots.txt',
  'sample.csv',
  'site.webmanifest',
  'styles.css'
];

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
publicFiles.forEach((file) => cpSync(join(root, file), join(output, file)));
cpSync(join(root, 'src'), join(output, 'src'), { recursive: true });

console.log(`Website gebaut: ${output}`);
