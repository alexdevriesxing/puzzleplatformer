# Final Commercial Sanity Pass — 3.3

## Fixed release blockers

- Imported the production Pip renderer on the final completion screen. The previous build could throw after room 100 even though syntax validation passed.
- Added a headless render smoke test that exercises all twelve shipping screens and catches undefined symbols, missing screen state, and incomplete production-asset interfaces.
- Removed dormant procedural fallback branches from backdrop, panel, particle, key-art, logo, comic, and atlas rendering. Missing production artwork now fails explicitly.
- Added chapter-complete interstitials between each ten-room world.
- Added complete How to Play and Credits screens and made both available from the title and pause flows.
- Hid mobile touch controls on menus and overlays; they are now exposed only during active gameplay.
- Added touch and gamepad hint access.
- Changed local build revisioning to hash the complete shipping source and commercial-asset tree, preventing stale art after an asset-only update.
- Replaced shared `any maskable` icon declarations with dedicated safe-zone maskable icons.
- Added wide and narrow PWA install screenshots.
- Switched GitHub validation and Cloudflare deployment workflows to deterministic `npm ci` installs.

## Asset completeness gate

The release now validates:

- 32 production image files in the shipping asset inventory
- 24 Pip cells
- 32 enemy cells
- 20 object cells
- 8 collectible cells
- 20 tile cells
- 8 VFX cells
- 8 UI cells
- safe transparent padding around all non-tile atlas cells
- minimum distinct-frame counts for every animation family
- ten unique chapter backdrop files
- runtime preload, renderer usage, service-worker caching, and manifest inventory
- absence of legacy SVGs, model sheets, dormant asset fallbacks, and placeholder branches

## Automated release result

- 100 explicit rooms
- 100 unique wall topologies
- 100 unique critical layouts
- 100 verified routes
- all eight deterministic enemy families replayed safely
- clean npm audit with zero vulnerabilities
- production build succeeds
- Wrangler dry deployment succeeds
- local Cloudflare runtime serves the app shell, manifest, service worker, and production atlases with HTTP 200

## External sign-off still required

Automated checks cannot replace physical-device and human testing. Before a paid public launch, complete:

- multi-player difficulty and comprehension testing across all chapters
- physical iOS Safari and Android Chrome testing
- full Safari, Firefox, and Chromium desktop matrix
- live Cloudflare URL smoke test after deployment
- final legal/store review for marketing copy, privacy disclosures, and platform requirements
