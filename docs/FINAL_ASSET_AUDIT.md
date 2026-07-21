# Final Production Asset Audit

## Result

The shipping runtime uses the production pack in `assets/commercial/`. Character and enemy atlases are frame-aligned, object/VFX/UI sheets are clean transparent runtime exports, and each chapter has a detailed illustrated backdrop. Procedural character, enemy, object, tile, logo, comic, and scenic fallback renderers are absent.

## Shipping coverage

- 24 illustrated Pip animation frames: idle, movement, interaction, victory, crystal-cast, hurt, and defeat states
- 32 enemy animation frames across eight visually distinct families
- 20 interactive-object sprites
- Eight collectible/key sprites
- Twenty environment tiles across ten chapters
- Eight VFX sprites
- Eight scalable UI chrome cells
- Ten 1280×720 illustrated chapter backdrops
- Five cinematic comic panels
- 1600×900 key art, transparent logo, app icons, favicon, and social image

## Enforcement

`npm run check` verifies dimensions, alpha channels, minimum sizes, preload wiring, renderer usage, manifest version, campaign proof, and absence of legacy placeholder references. The game fails fast when any required production asset is unavailable.
