# Final Art, Animation, UI, VFX, and Audio Direction

## Shipping art pipeline

The game ships a raster production pack in `assets/commercial/`. The source board is stored at `assets/source/final-art-source.png`, and the controlled atlas/export pipeline is `tools/build_final_assets.py`.

Runtime artwork includes cinematic key art, a transparent logo, frame-aligned Pip and enemy animation atlases, interactive objects, collectibles, keys, chapter tile sets, VFX, UI chrome, ten chapter backdrops, five comic panels, PWA icons, and social art.

`src/assets.js` loads every required image before the game is constructed. `src/art.js` contains no procedural character, enemy, object, tile, backdrop, logo, comic, or debug-shape substitute. Canvas remains responsible for layout, text, beams, particles, screen transitions, and accessibility overlays.

## Asset rules

- Every gameplay sprite uses transparent padding and a fixed frame grid.
- Pip remains consistent across all poses: dark-violet hair, red scarf/cape, blue tunic, warm skin, dark boots, and prism badge.
- Enemy silhouettes remain distinct at the 48 px gameplay-cell target.
- Interactive meaning is conveyed through silhouette and iconography, not color alone.
- The ten worlds each have a unique floor, wall, and 1280×720 scenic backdrop.
- UI text is rendered separately for localization, contrast, and crisp scaling.
- `npm run check` must pass after every asset change.

## Animation grammar

Pip has six-frame idle, walk, and push rows plus victory, blink, and hurt states. Every enemy family has four cadence frames, with directional mirroring where appropriate. Collectibles rotate and pulse; VFX atlas cells are combined with lightweight particles and beams. Reduced-motion mode shortens movement interpolation and limits shake without removing gameplay information.

## Audio

The ten chapter arrangements and interaction sounds use Web Audio synthesis. Audio begins only after user interaction, supports instant mute, requires no streamed files, and remains available offline.
