# Release Checklist

- [x] 100 explicit room definitions
- [x] 100 unique wall topologies
- [x] 100 unique critical layouts
- [x] 100 unique verified solution routes
- [x] Full deterministic enemy-route replay
- [x] 24 frame-aligned Pip frames
- [x] 32 enemy frames across eight families
- [x] Complete object, collectible, tile, VFX, UI, comic, and backdrop coverage
- [x] No legacy SVG/model-sheet runtime references
- [x] No procedural gameplay-art fallback renderer
- [x] Progress-reporting production asset preload with retry and explicit failure UI
- [x] Build-revisioned offline service-worker cache with stale asset refresh
- [x] Cached navigation recovery after network errors and HTTP 5xx responses
- [x] User-controlled service-worker update activation
- [x] Focus-visible keyboard menus, press-and-hold touch, and gamepad support
- [x] Reduced-motion and high-contrast options
- [x] Full-app fullscreen mode including touch controls
- [x] Master-bus audio compression and reusable noise buffer
- [x] Runtime polish regression checks in CI
- [x] Help, credits, chapter-complete, final-complete, victory, defeat, pause, settings, comic, directory, title, and gameplay screens
- [x] Headless render smoke test across every shipping screen
- [x] Every one of 112 atlas cells checked for occupancy and slice-edge safety
- [x] Dedicated maskable PWA icons and wide/narrow install screenshots
- [x] Full shipping source and asset tree included in build-revision hashing
- [x] Deterministic `npm ci` in validation and deployment workflows
- [x] Cloudflare Pages production configuration for `puzzleplatformer.pages.dev`
- [x] Optional Workers Static Assets preview isolated in a separate config
- [x] Generated `health.json` and post-deployment URL smoke
- [x] Security and cache headers for Pages
- [x] Clean install and zero npm audit vulnerabilities
- [x] Local Cloudflare Pages runtime smoke
- [x] Optional Worker Wrangler dry run
- [ ] Human playtest matrix across multiple players
- [ ] Physical iOS and Android device QA
- [ ] Live production deployment and canonical URL smoke from the owner account

## Vault Secrets

- [x] Six solution-neutral discoveries persist in the campaign save.
- [x] Secret inputs cannot move Pip, spend keys, change scores, or unlock rooms.
- [x] Credits ledger and title progress indicator are wired.
- [x] Archive mode respects reduced-motion and high-contrast settings.
- [x] Screen-reader announcements include discovery messages.
- [x] Automated secret trigger and persistence regression test passes.
