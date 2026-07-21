const targets = process.argv.slice(2).filter(Boolean);
if (!targets.length) {
  console.error('Usage: node scripts/smoke-url.mjs <deployment-url> [canonical-url]');
  process.exit(2);
}

const paths = [
  ['/', 'text/html'],
  ['/health.json', 'application/json'],
  ['/manifest.webmanifest', 'application/manifest+json'],
  ['/service-worker.js', 'javascript'],
  ['/assets/commercial/hero-sprites.png', 'image/png']
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, attempts = 8) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if (response.ok) return response;
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await sleep(Math.min(2000 * attempt, 10000));
  }
  throw lastError;
}

for (const target of targets) {
  const base = target.replace(/\/$/, '');
  for (const [path, expectedType] of paths) {
    const response = await fetchWithRetry(`${base}${path}`);
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes(expectedType)) throw new Error(`${base}${path} returned ${type}; expected ${expectedType}`);
    if (path === '/health.json') {
      const health = await response.json();
      if (health.status !== 'ok' || health.deploymentTarget !== 'cloudflare-pages') {
        throw new Error(`${base}${path} returned an invalid deployment health payload.`);
      }
      console.log(`✓ ${base} version ${health.version}, revision ${health.revision}`);
    }
  }
  console.log(`✓ ${base} served the application shell, health endpoint, PWA manifest, service worker, and production atlas.`);
}
