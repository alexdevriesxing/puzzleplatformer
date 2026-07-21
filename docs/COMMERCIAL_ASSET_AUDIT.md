# Commercial Asset Integration Audit

## Status

All shipping visual categories are supplied by the versioned production pack under `assets/commercial/`. The final 3.1 source-art pass replaces the earlier simplified hero, enemy, and scenic treatments with frame-aligned illustrated atlases and detailed chapter environments.

## Runtime coverage

| Area | Shipping assets |
|---|---|
| Title, ending, store art | `key-art.webp`, `logo.png`, app icons, favicon, `og-image.webp` |
| Pip | `hero-sprites.png` — 24 aligned frames |
| Eight enemy families | `enemy-sprites.png` — 32 frames |
| Puzzle objects | `object-sprites.png` — 20 transparent cells |
| Sparks and keys | `collectible-sprites.png` — 8 cells |
| Ten environments | `tile-sprites.png` and ten 1280×720 chapter backdrops |
| Collection, teleport, impact effects | `vfx-sprites.png` |
| UI chrome | `ui-atlas.png` |
| Story | `comic-1.webp` through `comic-5.webp` |

## Integration

`src/assets.js` performs fail-fast preloading, `src/main.js` waits for the complete pack, `src/art.js` draws the atlases and chapter paintings, and `service-worker.js` precaches every shipping asset. No concept board is loaded by the browser.

## Release gate

`tests/validate-assets.mjs` verifies dimensions, transparency, minimum production size, manifest version, preload/renderer wiring, and absence of legacy or procedural visual fallbacks.
