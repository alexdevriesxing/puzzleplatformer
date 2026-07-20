# Game Design Document — Pip & the Prism Vault

## Product statement

A premium-feeling, single-screen puzzle arcade game in which every room communicates a compact idea, every enemy follows a learnable rule, and every action remains immediately reversible through undo. The game celebrates the legibility and economy of classic 8-bit and 16-bit design while using modern animation, presentation, accessibility, and audio polish.

## Series foundation

**Series:** Pip’s Pocket Worlds  
**Game one:** Pip & the Prism Vault  
**Hero:** Pip, a small Sparkkeeper with a cyan coat, coral scarf, moon-cap, and visible cap light  
**Core promise:** one consistent hero, one readable visual language, and a new puzzle vocabulary in every game

Pip must remain recognizable in silhouette at tiny scale. The cap light, scarf, coat proportions, face construction, and victory language are canonical series elements. Future games may change tools, environments, and movement rules, but not Pip’s core identity.

## Story

The Prism Vault is a living museum that stores the first light of a hundred pocket worlds. Baron Null fractures the Prism Heart, scatters its Sparks through ten galleries, and activates the Vault’s defensive exhibits. Pip carries the last clean thread of light in a glowing scarf and enters the rearranged museum alone.

The opening is told in two comic-book pages. Each chapter is framed as a wing of the museum. The final room restores the Prism Heart, returns morning to the Vault, and reveals a distant clockwork moon as the next series destination.

## Core loop

1. Read the room and identify the exit, Sparks, mechanisms, and enemy tells.
2. Move one tile. The room then resolves automatic floor motion and enemy turns.
3. Collect all three Prism Sparks.
4. Manipulate keys, crates, plates, gates, teleporters, and terrain in the correct order.
5. Reach the active lift.
6. Earn one to three stars based on the room par, then continue or replay.

Undo is a first-class action rather than a punishment reducer. The player is expected to test hypotheses, rewind, and refine.

## Rules of clarity

- Player input is always resolved before enemy movement.
- Enemies use deterministic, chapter-consistent rules.
- A tile’s silhouette and color communicate its function before decoration.
- Critical objectives are never hidden behind cosmetic detail.
- The exit activates only after all three Sparks are collected.
- Hazards use warm warning colors; traversable guidance uses cyan or gold.
- Every room has a structural route and a mechanically validated solution.

## Campaign arc

### 1. Clockwork Foyer
Introduces movement, Sparks, exit activation, patrol timing, undo, and restart. Rooms are spacious and use simple vertical wall bands. Scarabs and crawlers establish the move-after-you rhythm.

### 2. Mosslight Conservatory
Introduces keys and doors. Early rooms place the key directly before the lock; later rooms position optional branches and enemies so route ordering matters.

### 3. Glacier Gallery
Introduces push-only crates, pressure plates, and gates. Every crate sequence is placed on a validated straight route segment, preserving pushing space and avoiding accidental deadlocks in the teaching arc.

### 4. Ember Foundry
Introduces ice commitment and spike avoidance. The player learns that a safe tile can still be a poor stopping point.

### 5. Storm Laboratory
Introduces conveyors and stationary turrets. Turrets fire on a three-turn rhythm and display a visible line before a charged shot.

### 6. Infinite Library
Introduces fragile floors that crack when left and then collapse. Ghosts ignore internal walls, shifting attention from maze geometry to timing.

### 7. Moonlit Orrery
Introduces paired teleport coils. Coils preserve the player’s strategic direction while changing spatial context.

### 8. Sunken Aquarium
Introduces lethal water pockets and safe bridge lanes. Drones create circular movement pressure while slimes approach on alternate turns.

### 9. Obsidian Citadel
Combines locks, gates, fragile paths, and dangerous enemy patterns. Rooms are layered so the player solves one dependency at a time.

### 10. Prism Core
Combines the whole vocabulary. The final sequence is fast, bright, and celebratory without abandoning deterministic rules.

## Enemy design

| Enemy | Rule | Player lesson |
|---|---|---|
| Scarab | Moves horizontally; reverses at obstacles | Read patrol lanes |
| Crawler | Moves vertically; reverses at obstacles | Use perpendicular timing |
| Slime | Moves toward Pip every second turn | Exploit tempo gaps |
| Hopper | Attempts a two-tile jump every second turn | Avoid apparent safe distance |
| Turret | Fires down a clear row or column every third turn | Count and use cover |
| Ghost | Moves through internal walls every second turn | Geometry is not always protection |
| Mimic | Mirrors Pip’s latest direction | Manipulate reflected intent |
| Drone | Follows a rotating directional cycle | Predict loops and intersections |

## Scoring and progression

Each room awards:

- **3 stars:** at or under par
- **2 stars:** up to 145% of par
- **1 star:** completion

Progress, stars, and best moves are stored locally. Chapters unlock sequentially. Rooms can be replayed immediately from the chapter directory.

## Failure and recovery

Defeat occurs on enemy contact, a charged turret line, spikes, water, or a collapsed pit. The defeat screen foregrounds learning rather than punishment and offers undo when history is available, otherwise restart or directory.

## Accessibility

- full keyboard and touch support
- no sound-dependent information
- persistent sound toggle
- reduced-motion mode
- high-contrast overlay
- live-region announcements for room starts and pickups
- large logical hit targets and a fixed 16:9 composition
- deterministic systems that permit deliberate pacing

## Technical architecture

The browser implementation uses a dependency-free Canvas 2D renderer and Web Audio. Campaign generation is deterministic and exported as 100 concrete room objects. Rendering, level data, audio, and game-state logic are separated into independent modules.

The architecture is intentionally portable. A future native or engine-based edition can retain the level specifications, rules, hero identity, art direction, and audio motifs while replacing the renderer.

## Release-candidate path

The polished first pass is feature-complete as a browser game. A commercial release candidate would add platform achievements, cloud saves, localization, controller remapping, external QA passes, authored orchestral stems, and platform-specific packaging while preserving the deterministic campaign and visual identity.
