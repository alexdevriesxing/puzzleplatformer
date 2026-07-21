import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of ['index.html', 'manifest.webmanifest', 'service-worker.js', '_headers']) {
  await cp(resolve(root, entry), resolve(dist, entry));
}
for (const directory of ['src', 'assets']) {
  await cp(resolve(root, directory), resolve(dist, directory), { recursive: true });
}
await rm(resolve(dist, 'assets/source'), { recursive: true, force: true });
await rm(resolve(dist, 'assets/screenshots'), { recursive: true, force: true });
await rm(resolve(dist, 'assets/campaign-atlas.webp'), { force: true });
await rm(resolve(dist, 'assets/commercial/commercial-art-bible.webp'), { force: true });

async function collectFiles(entry) {
  const absolute = resolve(root, entry);
  const info = await stat(absolute);
  if (info.isFile()) return [entry];
  const children = await readdir(absolute);
  const nested = await Promise.all(children.sort().map(child => collectFiles(`${entry}/${child}`)));
  return nested.flat();
}

const revisionEntries = (await Promise.all([
  'package.json', 'index.html', 'manifest.webmanifest', 'service-worker.js', '_headers', 'src', 'assets/commercial'
].map(collectFiles))).flat().sort();
const revisionHash = createHash('sha256');
for (const entry of revisionEntries) {
  revisionHash.update(entry);
  revisionHash.update(await readFile(resolve(root, entry)));
}
const localRevision = revisionHash.digest('hex').slice(0, 12);
const revision = process.env.CF_PAGES_COMMIT_SHA?.slice(0, 12)
  ?? process.env.GITHUB_SHA?.slice(0, 12)
  ?? localRevision;

const htmlPath = resolve(dist, 'index.html');
const html = await readFile(htmlPath, 'utf8');
await writeFile(htmlPath, html.replaceAll('__BUILD_REVISION__', revision).replaceAll('__APP_VERSION__', pkg.version));
const serviceWorkerPath = resolve(dist, 'service-worker.js');
const serviceWorker = await readFile(serviceWorkerPath, 'utf8');
await writeFile(serviceWorkerPath, serviceWorker.replaceAll('__BUILD_REVISION__', revision));

const health = {
  status: 'ok',
  application: 'Pip & the Prism Vault',
  version: pkg.version,
  revision,
  deploymentTarget: 'cloudflare-pages',
  productionAssetCount: (await readdir(resolve(dist, 'assets/commercial'))).length
};
await writeFile(resolve(dist, 'health.json'), `${JSON.stringify(health, null, 2)}\n`);

console.log(`Built Cloudflare Pages bundle in ${dist} (${pkg.version}, ${revision}).`);
