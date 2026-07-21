# Campaign Authorship and Quality Audit

## Release gate

The campaign is accepted only when all automated assertions below pass:

- exactly 100 explicit room records
- 100 unique room names
- 100 unique wall topologies after mirror normalization
- 100 unique critical layouts
- 100 unique intended solution strings
- at least 16% cell difference between the two nearest wall topologies
- full mechanical solution proof for every room
- full deterministic replay of every stored solution against enemies and turrets
- meaningful representation of every enemy and signature mechanic
- an approachable opening curve and sustained late-game route length

## Current measured campaign

- **Rooms:** 100
- **Unique wall topologies:** 100
- **Unique critical layouts:** 100
- **Unique intended routes:** 100
- **Nearest wall-topology difference:** 16.7%
- **Optimal route range:** 20–95 turns
- **Average optimal route:** 48.63 turns
- **Solver search range:** 130–99,491 states

## Mechanic coverage

- **conveyor:** 26 rooms
- **crate:** 25 rooms
- **fragile:** 10 rooms
- **gate:** 25 rooms
- **hazard:** 55 rooms
- **ice:** 18 rooms
- **key:** 16 rooms
- **spikes:** 34 rooms
- **teleport:** 24 rooms

## Enemy coverage

- **crawler:** 53 placements
- **drone:** 38 placements
- **ghost:** 32 placements
- **hopper:** 40 placements
- **mimic:** 18 placements
- **scarab:** 40 placements
- **slime:** 24 placements
- **turret:** 35 placements

## What the solver proves

The puzzle solver models walls, hazards, spikes, ice, four-way conveyors, paired teleporters, fragile-floor collapse, one-use keys and doors, crate pushing, pressure plates, persistent gates, Spark collection, and exit activation. It computes a shortest route without relying on enemies.

A second deterministic replay layer then executes the stored route with the exact campaign enemy roster, including patrol reversal, chase cadence, ghost wall traversal, mimic activation range, drone rotation, hopper double steps, gate line blocking, and turret firing cadence. A room fails validation if that route is unsafe or does not finish with all three Sparks.

## Similarity policy

Mirror-equivalent maps are treated as the same topology. The validator rejects any campaign where two rooms fall below the minimum wall-cell difference. It separately compares critical layouts so moving a Spark or changing a palette cannot disguise a duplicate puzzle.
