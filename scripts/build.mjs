import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const out = new URL('../dist/', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const file of ['index.html', 'styles.css', 'manifest.webmanifest', 'service-worker.js', '.nojekyll']) {
  await cp(new URL(`../${file}`, import.meta.url), new URL(file, out));
}
for (const dir of ['src', 'assets']) {
  await cp(new URL(`../${dir}/`, import.meta.url), new URL(`${dir}/`, out), { recursive: true });
}
const source = await readFile(new URL('../src/game.js', import.meta.url));
const revision = createHash('sha256').update(source).digest('hex').slice(0, 12);
const swPath = new URL('service-worker.js', out);
const sw = (await readFile(swPath, 'utf8')).replaceAll('__BUILD_REVISION__', revision);
await writeFile(swPath, sw);
console.log(`Built Cloudflare static bundle: dist/ (${revision})`);
