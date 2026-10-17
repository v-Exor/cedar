import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('..', import.meta.url));
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate HTML IDs');
for (const [, target] of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
  if (target.startsWith('#')) { if (!ids.includes(target.slice(1))) throw new Error(`Missing anchor: ${target}`); }
  else if (target.startsWith('./')) await stat(resolve(root, target));
}
for (const id of ['part1', 'part2', 'part4', 'home', 'overview', 'objectives', 'experiments', 'results', 'questions', 'conclusion']) if (!ids.includes(id)) throw new Error(`Missing required section: ${id}`);
if ((html.match(/class="qa-number"/g) || []).length !== 5) throw new Error('All five handout questions are required');
for (const file of ['app.js', 'worker.js', 'processing.js', 'site-config.js', 'scripts/serve.mjs', 'scripts/check.mjs']) {
  const result = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8' });
  if (result.status) throw new Error(result.stderr);
}
for (const file of ['assets/moon.png', 'assets/vendor/opencv.js', 'assets/NOTICE.md', 'README.md', 'SOURCE_MAP.md', 'downloads/python-lab3.zip', '.nojekyll', '.github/workflows/pages.yml']) await stat(resolve(root, file));
console.log('Passed: syntax, required lab sections, five questions, anchors, relative asset paths, downloads, and deployment files.');
