# Art, Animation, UI, VFX, and Audio Bible

## Visual identity

The game uses crisp cartoon vector construction with dark indigo outlines, luminous cyan guidance, warm gold objectives, and coral danger accents. Shapes must read before texture. Decorative lines, glows, scan patterns, and particles support depth but never compete with the puzzle state.

The visual target is not pixel-art imitation. It translates the clarity, limited palettes, and instantly readable silhouettes of classic games into clean modern vector rendering.

## Pip

Canonical features:

- cyan coat with a dark-to-light vertical gradient
- coral scarf whose trailing angle communicates velocity
- warm cream face and hands
- indigo moon-cap with a gold cap light
- dark boots and a compact pear-shaped body
- two-dot eyes and a small warm smile

Animation principles:

- walking uses cap bob, boot alternation, and mild scarf drag
- running exaggerates scarf lag and arm reach
- push animation begins with anticipation and preserves contact
- hurt animation breaks the silhouette and flashes opacity
- victory raises both arms and increases cap-light emphasis
- squash and stretch remain under eight percent to preserve the model

The supplied `hero-model-sheet.svg` is the canonical reference for future games.

## Enemies

Every enemy has a unique outer contour:

- scarab: low oval shell and antennae
- crawler: segmented rounded rectangle
- slime: soft dome with scalloped base
- hopper: tall egg body with extended feet
- turret: square housing and central lens
- ghost: translucent bell shape with a torn base
- mimic: tall mask with mirrored chevrons
- drone: angular pentagonal shell

Enemy colors vary, but all share dark outlines and a bright functional accent.

## Tiles and environments

Each world owns a five-color palette: deep background, primary floor, raised structure, guidance light, and danger/accent. The same mechanical tile retains its silhouette across worlds while inheriting chapter color.

- walls are raised, bevelled, and visually solid
- floors are quiet and low-contrast
- exits are dark arch panels with pulsing gold light
- spikes use coral triangles
- ice uses pale reflective diagonals
- conveyors use animated chevrons
- fragile floors use branching cracks
- teleporters use counter-rotating cyan and magenta spirals
- plates use recessed illuminated ellipses
- gates use vertical accent bars
- water uses saturated cyan waves
- bridges use warm wood slats and gold rails

## Comic presentation

The intro uses cream paper, thick indigo panel borders, slight panel rotation, halftone scan lines, declarative captions, and high-contrast scene silhouettes. It should feel like a premium Saturday-morning adventure comic rather than a cutscene substitute.

## UI and HUD

The UI uses deep translucent indigo panels, rounded corners, two-pixel light borders, and raised gradient buttons. Important numbers are large and right-aligned. The HUD always shows Sparks, moves, par, keys, undo depth, and the current chapter concept.

Hints appear inside the HUD rather than covering the playfield. Victory, defeat, pause, options, directory, credits, and ending screens reuse the same panel grammar.

## VFX

- Spark pickup: gold-white radial burst
- key pickup: smaller gold burst
- teleport: cyan departure and magenta arrival particles
- crate push: short low-frequency dust/noise cue
- defeat: brief screen shake and white flash
- victory: large gold burst and sustained exit glow

Reduced-motion mode shortens tweens and reduces particle counts.

## Music

Each world defines a root note, pentatonic or modal scale, and tempo. The procedural sequencer builds a three-layer arrangement:

1. low triangle-wave pulse
2. short square-wave melodic notes
3. sparse sine-wave upper response

When enemies approach, a restrained sawtooth danger pulse is introduced. This keeps the soundtrack adaptive without obscuring puzzle timing.

## SFX

All SFX are synthesized at runtime through oscillators and filtered noise:

- move: short triangle tick
- bump: low square impact and filtered noise
- Spark: ascending three-note shimmer
- key: bright two-note interval
- unlock: rising sawtooth triad
- push: low square thud
- teleport: four-note sine sweep
- undo: descending triangle sequence
- danger: low sawtooth hit and noise
- victory: ascending five-note phrase

No external audio files, stock effects, or licensed loops are used.
