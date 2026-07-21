# Focused Commercial UI Pass — 3.4

This pass improves the interface without changing the authored campaign or visual identity.

## Changes

- Rebuilt panel rendering with visible borders, inner highlights, and consistent depth.
- Activated the intended per-button color treatments that were previously passed by screens but ignored by the renderer.
- Added distinct normal, hover, pressed, focused, and disabled control states.
- Added automatic text fitting for long room names, level names, button labels, and status values.
- Reorganized the title screen around one dominant campaign action and three compact progress summaries.
- Reworked the gameplay HUD around the current objective, Spark progress, route score, and clearer room identity.
- Standardized victory, defeat, pause, chapter-complete, and ending screens around comparable stat cards and action hierarchy.
- Enhanced the level directory with chapter access, stars, mechanic focus, best route, par, lock state, and safer text fitting.
- Rebuilt How to Play and Options as clearly separated information cards with concise explanations.
- Added a fullscreen control to Options and accessible screen-specific canvas labels.
- Improved mobile controls with safe-area spacing, stronger pressed feedback, compact-device sizing, and a dedicated touch Hint button.
- Added complete Apple touch/social metadata that the previous runtime regression test expected.

## Validation

- `npm ci --ignore-scripts`
- `npm audit --omit=dev` — zero vulnerabilities
- 100-room solution and enemy-route replay gate
- 32-image and 112-atlas-cell production-asset gate
- focused UI regression test
- every-screen render smoke test
- production build
- Wrangler deployment dry run
- local Cloudflare HTTP smoke for HTML, game code, CSS, manifest, and UI atlas
