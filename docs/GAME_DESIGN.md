# Game Design — Pip & the Prism Vault

## Series foundation

**Series:** *Pip’s Pocket Worlds*  
**Game one:** *Pip & the Prism Vault*  
**Format:** single-screen puzzle arcade  
**Campaign:** 100 rooms, ten chapters, ten rooms per chapter  
**Target session:** 45 seconds to four minutes per room  
**Target audience:** players who enjoy readable systems, compact spatial puzzles, deterministic enemies, collectable mastery grades, and expressive cartoon presentation

The series is built around one instantly recognizable hero, one highly readable control language, and different “pocket world” rule sets. Later games can shift toward puzzle platforming, gravity manipulation, digging, light routing, or vehicle puzzles while keeping Pip’s silhouette, scarf, prism badge, animation grammar, UI voice, and musical motif.

## Hero: Pip the Sparkkeeper

Pip is a small clockwork fox with a coral scarf, blue work suit, cream muzzle, amber fur, and glowing cyan prism badge. His design priorities are:

1. **Readable at 32–48 pixels.** Large ears, rounded head, bright scarf, dark boots, and diamond badge survive small rendering sizes.
2. **Expressive without dialogue portraits.** Blink, ear angle, scarf motion, body squash, and face changes convey confidence, surprise, defeat, and victory.
3. **Reusable across games.** The suit and badge support equipment attachments without changing Pip’s central silhouette.
4. **Friendly under pressure.** Fail states are comic and recoverable rather than punishing. Undo is part of Pip’s identity: a Sparkkeeper studies, rewinds, and tries again.

### Character voice

Pip does not need long dialogue. UI copy should be warm, clever, and mechanically helpful. Defeat lines are playful rather than mocking. Hints are direct enough to restore momentum without giving exact move sequences.

## Story

The Prism Vault stabilizes a network of miniature worlds by housing the Prism Heart. Baron Null steals the Heart because he finds perfect order boring. The Heart fractures into one hundred Sparks, each trapped in a single-screen chamber as the Vault’s museum wings distort around them.

Pip travels from the Clockwork Foyer to the Prism Core, reactivating lifts and recovering three Sparks per room. The finale restores the Heart, but Baron Null escapes through a pocket-sized fracture, establishing a recurring antagonist without undercutting the campaign’s resolution.

The chapter order tells a clear escalation story:

1. The Vault’s familiar brass machinery wakes.
2. Living exhibits overgrow their enclosures.
3. Climate controls freeze entire galleries.
4. Foundries begin manufacturing hostile machines.
5. Teleport research tears rooms into unstable pairs.
6. The archive itself becomes animate.
7. The Orrery opens onto ghost-lit voids.
8. Flooded exhibits strain the Vault’s pumps.
9. Null’s elite guard concentrates at the Citadel.
10. Every learned rule combines inside the Prism Core.

## Core loop

1. Read the room: Sparks, lift, walls, mechanisms, enemies, and floor rules.
2. Make one cardinal move.
3. Resolve pushes, doors, floor movement, teleportation, collection, enemy turns, and turret pulses.
4. Use Undo freely to test a hypothesis.
5. Collect all three Sparks.
6. Enter the active lift.
7. Earn one to three stars based on turn efficiency.
8. Continue immediately or replay for mastery.

The game is deterministic. Enemies move after Pip and expose clear cadences. This preserves the planning appeal of a turn-based puzzle while the presentation remains lively and arcade-like.

## Rules and mechanics

### Universal

- Pip moves one orthogonal cell per turn.
- Three Prism Sparks must be collected before the lift activates.
- Undo restores the complete prior turn state, including tiles, enemies, keys, crates, gates, and turn count.
- Restart is instant.
- Hazards cause a comic defeat and preserve access to Undo.
- A key opens one door.
- Crates can be pushed but not pulled.
- Any crate or Pip standing on a sun plate powers the room’s gates.

### Floor systems

- **Ice:** continues Pip in the incoming direction until a non-ice stop or obstruction.
- **Conveyors:** move Pip one additional cell in the arrow direction after the manual move.
- **Fragile floor:** collapses after Pip leaves it, permanently changing the route until Undo or restart.
- **Teleport coils:** paired cyan and violet coils preserve Pip’s current facing and move him between distant room regions.
- **Spikes and world hazards:** passable but lethal, which makes enemy timing and forced movement meaningful.

### Enemy roster

| Enemy | Readable rule | Design use |
|---|---|---|
| Brass Scarab | Patrols horizontally and reverses at blockers | Basic timing and lane control |
| Tide Crawler | Patrols vertically and reverses at blockers | Intersections and cross-lane timing |
| Moss Slime | Chases every other turn | Slow pressure and route commitment |
| Spring Hopper | Moves twice on its active cadence | Long-lane prediction |
| Null Turret | Fires on a three-turn pulse with line-of-sight blocking | Turn-count planning and cover |
| Archive Ghost | Moves through walls every other turn | Soft time limit and spatial pressure |
| Mimic Chest | Sleeps until Pip approaches, then chases | Surprise that becomes deterministic |
| Arc Drone | Rotates through cardinal directions | Cyclic movement and crowded rooms |

No enemy exists only as decoration. Each has a distinct silhouette, color family, cadence, and puzzle role.

## Difficulty curve

Every ten-room chapter follows a consistent teaching rhythm while changing the active rule set:

1. **Arrival:** low-pressure visual introduction.
2. **Read:** route and floor-rule recognition.
3. **Key:** key/door planning.
4. **Weight:** crate/plate/gate planning.
5. **Enemy:** chapter enemy cadence.
6. **Combine:** two learned concepts together.
7. **Commit:** irreversible or forced-movement route.
8. **Timing:** enemy and environment synchronization.
9. **Exam:** dense but fair chapter test.
10. **Crown:** mastery room that previews the next chapter’s pressure.

The first three chapters prioritize teaching and confidence. Chapters four through eight introduce stronger timing pressure. Chapters nine and ten combine the full roster. Undo ensures experimentation remains inviting even when a room is complex.

## Room construction

Rooms use an 18×11 grid framed by an 864×528 playfield. Ten authored spatial blueprints establish distinct lane, quadrant, fortress, crossing, and gauntlet compositions. Each room then applies a fixed chapter/stage specification: start and exit, Spark positions, key/door pair, crate/plate/gate relationship, deterministic enemy roster, hazard ribbon, themed floor rules, hint, par value, and unique name.

This is not endless random generation. The same room number always materializes the same layout and rule combination. Fixed seeds are used only to make authored decoration/hazard placement reproducible.

## Scoring and progression

- **Three stars:** solve at or under par.
- **Two stars:** solve within 135% of par.
- **One star:** complete the room.
- Best turn count is stored per room.
- Completing a room unlocks the next room.
- Chapter directory shows lock state, best record, and stars.
- Progress is stored locally and degrades gracefully if browser storage is unavailable.

Stars support replay without blocking story progress. The full campaign remains finishable without optimizing every room.

## UI flow

1. Title/key art
2. Begin or continue campaign
3. Five-panel comic intro on first play
4. Room banner with chapter, room name, and contextual hint
5. Gameplay HUD: Sparks, keys, turns, par, Undo, Pause
6. Victory: room name, stars, turn record, next/replay/directory
7. Defeat: readable cause, retry, Undo, directory
8. Level directory: ten chapter pages, ten room cards each
9. Options: audio, reduced motion, high contrast
10. Campaign ending

All major actions are available by keyboard and pointer. Touch controls appear on mobile-class devices.

## Production architecture

The first pass is a dependency-free Canvas 2D game using ES modules:

- `levels.js` owns campaign data and deterministic materialization.
- `game.js` owns state transitions, movement, interaction, AI, persistence, input, tweening, UI, and VFX orchestration.
- `art.js` owns runtime vector illustration and UI drawing.
- `audio.js` owns theme arrangements, synthesis voices, percussion, and SFX.

The separation makes it practical to move to another runtime later while keeping the campaign data and art direction intact.

## Release-candidate roadmap

The current version is a complete first-pass browser campaign. A release candidate should add:

- exhaustive solver-assisted validation for crate/gate states and optimal par values
- gamepad support and remappable controls
- localized copy pipeline
- save-slot import/export and explicit progress reset
- richer chapter transition comics and ending sequence
- additional frame-by-frame hero poses for push, skid, teleport, and celebration
- performance profiling on low-end mobile browsers
- accessibility pass for screen-reader summaries outside the canvas
- packaging for desktop/mobile storefronts

The core identity, campaign, rules, screens, artwork direction, and reusable series architecture are already established.
