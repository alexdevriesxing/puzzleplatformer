# Cloudflare Pages test and recovery

## Local Pages runtime

```bash
npm ci --ignore-scripts
npm run check
```

The release gate builds `dist`, starts `wrangler pages dev`, and verifies the application shell, `health.json`, manifest, and production hero atlas.

To keep the local runtime open:

```bash
npm run dev
```

## Deploy to `puzzleplatformer.pages.dev`

```bash
npm ci --ignore-scripts
npx wrangler login
npm run deploy
```

The primary `wrangler.jsonc` is a Pages configuration:

- project: `puzzleplatformer`
- output: `./dist`
- production branch: `main`

After deployment:

```bash
npm run smoke:url -- https://puzzleplatformer.pages.dev
```

The smoke retries through propagation delay and verifies HTML, health metadata, PWA manifest, service worker, and production artwork.

## Optional Worker preview

Workers Static Assets is intentionally separated so it cannot be confused with the Pages hostname:

```bash
npm run deploy:worker
```

It uses `wrangler.worker.jsonc` and the Worker name `pip-prism-vault`.

## GitHub deployment

Set:

- `CLOUDFLARE_API_TOKEN` with Cloudflare Pages edit permission
- `CLOUDFLARE_ACCOUNT_ID`

`.github/workflows/cloudflare.yml` deploys `main`, records the GitHub deployment, and smoke-tests both the immutable deployment URL and `https://puzzleplatformer.pages.dev`.

## 522 recovery

A 522 on a `pages.dev` hostname indicates the live project/deployment path is unhealthy, not a JavaScript or art-loader failure. The 3.6 release prevents deployment-target confusion and adds cached navigation recovery for returning players.

1. Check **Workers & Pages → puzzleplatformer → Deployments**.
2. Roll back to the last healthy deployment if necessary.
3. Run `npm run deploy` from this source tree.
4. Confirm `https://puzzleplatformer.pages.dev/health.json` reports `"status": "ok"` and `"deploymentTarget": "cloudflare-pages"`.
