# Publish production build 3.6 to GitHub

Target repository: `alexdevriesxing/puzzleplatformer`
Target branch: `agent/polish-all`
Existing pull request: `#1`
Primary deployment: `puzzleplatformer.pages.dev`

This tree separates Cloudflare Pages production deployment from the optional Workers preview and includes post-deployment health checks.

```bash
git clone https://github.com/alexdevriesxing/puzzleplatformer.git
cd puzzleplatformer
git checkout agent/polish-all
rsync -a --delete --exclude .git --exclude node_modules --exclude dist /path/to/pip-polish-3.6/ ./
npm ci --ignore-scripts
npm run check
npx wrangler deploy --config wrangler.worker.jsonc --dry-run
git add -A
git commit -m "Polish Cloudflare Pages delivery and runtime recovery"
git push origin agent/polish-all
```

After merge, the Pages workflow deploys `dist` to project `puzzleplatformer`, then smoke-tests the deployment URL and canonical `pages.dev` hostname.
