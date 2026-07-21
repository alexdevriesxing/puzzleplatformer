import { readFile } from 'node:fs/promises';

const pkg=JSON.parse(await readFile('package.json','utf8'));
const pages=JSON.parse((await readFile('wrangler.jsonc','utf8')).replace(/\/\/.*$/gm,''));
const worker=JSON.parse((await readFile('wrangler.worker.jsonc','utf8')).replace(/\/\/.*$/gm,''));
const workflow=await readFile('.github/workflows/cloudflare.yml','utf8');
const headers=await readFile('_headers','utf8');
const build=await readFile('scripts/build.mjs','utf8');
const main=await readFile('src/main.js','utf8');
const assets=await readFile('src/assets.js','utf8');
const sw=await readFile('service-worker.js','utf8');
const html=await readFile('index.html','utf8');

if(pkg.version!=='3.6.0')throw new Error(`Expected deployment polish version 3.6.0; received ${pkg.version}.`);
if(pages.name!=='puzzleplatformer'||pages.pages_build_output_dir!=='./dist')throw new Error('Wrangler is not configured for the puzzleplatformer Pages project.');
if(pages.assets)throw new Error('Primary Wrangler configuration still targets Workers Static Assets instead of Pages.');
if(worker.name!=='pip-prism-vault'||worker.assets?.directory!=='./dist')throw new Error('Optional Worker configuration is incomplete.');
for(const marker of ['pages deploy dist --project-name=puzzleplatformer --branch=main','deployment-url','puzzleplatformer.pages.dev','scripts/smoke-url.mjs'])if(!workflow.includes(marker))throw new Error(`Pages deployment workflow missing ${marker}.`);
for(const marker of ['Content-Security-Policy','/health.json','/service-worker.js','/assets/commercial/*'])if(!headers.includes(marker))throw new Error(`Pages headers missing ${marker}.`);
for(const marker of ['health.json','deploymentTarget','cloudflare-pages','__APP_VERSION__'])if(!build.includes(marker))throw new Error(`Build health metadata missing ${marker}.`);
for(const marker of ['boot-overlay','boot-progress','system-banner'])if(!html.includes(marker))throw new Error(`Production boot UI missing ${marker}.`);
for(const marker of ['onProgress','retry=','Required production asset timed out'])if(!assets.includes(marker))throw new Error(`Resilient asset loader missing ${marker}.`);
for(const marker of ['3.6.0-pages-resilience-polish','updateViaCache','SKIP_WAITING','Connection lost','Connection restored'])if(!main.includes(marker))throw new Error(`Runtime resilience feature missing ${marker}.`);
for(const marker of ["response.status>=500",'navigationPreload','SKIP_WAITING','cachedFallback'])if(!sw.includes(marker))throw new Error(`Service-worker recovery feature missing ${marker}.`);
if(!pkg.scripts['deploy:pages']?.includes('puzzleplatformer')||!pkg.scripts['deploy:worker']?.includes('wrangler.worker.jsonc'))throw new Error('Deployment scripts do not separate Pages from Workers.');
console.log('✓ Cloudflare Pages production deployment, health smoke, visible boot/update states, 5xx cache recovery, and optional Worker preview are configured independently.');
