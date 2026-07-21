import { GRID_H, GRID_W, TILE } from './levels.js';

const CARDINALS = Object.freeze([
  { dx: 1, dy: 0, name: 'right' },
  { dx: -1, dy: 0, name: 'left' },
  { dx: 0, dy: 1, name: 'down' },
  { dx: 0, dy: -1, name: 'up' }
]);

export const DIRECTIONS = CARDINALS;

function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}

function keyOf(x, y) {
  return `${x},${y}`;
}

export function createState(level, options = {}) {
  const includeEnemies = options.includeEnemies !== false;
  return {
    level: clone(level),
    player: { ...level.start, dir: 1 },
    crates: clone(level.crates ?? []),
    enemies: includeEnemies ? clone(level.enemies ?? []) : [],
    sparks: clone(level.sparks ?? []),
    keys: clone(level.keys ?? []),
    inventory: { keys: 0 },
    moves: 0,
    turn: 0,
    dead: false,
    won: false,
    deathReason: '',
  };
}

export function snapshotState(state) {
  return clone({
    level: state.level,
    player: state.player,
    crates: state.crates,
    enemies: state.enemies,
    sparks: state.sparks,
    keys: state.keys,
    inventory: state.inventory,
    moves: state.moves,
    turn: state.turn,
    dead: state.dead,
    won: state.won,
    deathReason: state.deathReason,
  });
}

export function restoreState(state, snapshot) {
  const restored = clone(snapshot);
  for (const field of Object.keys(restored)) state[field] = restored[field];
  return state;
}

export function tileAt(state, x, y) {
  return state.level.tiles[y]?.[x] ?? TILE.WALL;
}

export function insideBoard(x, y) {
  return x > 0 && y > 0 && x < GRID_W - 1 && y < GRID_H - 1;
}

export function crateAt(state, x, y) {
  return state.crates.find((crate) => crate.x === x && crate.y === y) ?? null;
}

export function enemyAt(state, x, y, except = null) {
  return state.enemies.find((enemy) => enemy !== except && enemy.x === x && enemy.y === y) ?? null;
}

export function platePressed(state) {
  return tileAt(state, state.player.x, state.player.y) === TILE.PLATE
    || state.crates.some((crate) => tileAt(state, crate.x, crate.y) === TILE.PLATE);
}

export function exitActive(state) {
  return state.sparks.length === 0;
}

function isClosedTerrain(state, x, y) {
  const tile = tileAt(state, x, y);
  return tile === TILE.WALL
    || tile === TILE.DOOR
    || (tile === TILE.GATE && !platePressed(state));
}

function canPlayerEnter(state, x, y) {
  return insideBoard(x, y) && !isClosedTerrain(state, x, y) && !crateAt(state, x, y);
}

function canCrateEnter(state, x, y) {
  if (!insideBoard(x, y) || crateAt(state, x, y) || enemyAt(state, x, y)) return false;
  const tile = tileAt(state, x, y);
  return ![
    TILE.WALL, TILE.DOOR, TILE.GATE, TILE.WATER, TILE.PIT,
    TILE.SPIKE, TILE.FRAGILE, TILE.EXIT, TILE.TELEPORT_A, TILE.TELEPORT_B,
  ].includes(tile);
}

function canEnemyEnter(state, enemy, x, y) {
  if (!insideBoard(x, y) || crateAt(state, x, y) || enemyAt(state, x, y, enemy)) return false;
  if (enemy.type === 'ghost') return true;
  const tile = tileAt(state, x, y);
  return ![
    TILE.WALL, TILE.DOOR, TILE.WATER, TILE.PIT,
  ].includes(tile) && !(tile === TILE.GATE && !platePressed(state));
}

function collectAtPlayer(state, events) {
  const sparkIndex = state.sparks.findIndex((spark) => samePosition(spark, state.player));
  if (sparkIndex >= 0) {
    state.sparks.splice(sparkIndex, 1);
    events.push({ type: 'spark', remaining: state.sparks.length, ...state.player });
  }

  const keyIndex = state.keys.findIndex((key) => samePosition(key, state.player));
  if (keyIndex >= 0) {
    state.keys.splice(keyIndex, 1);
    state.inventory.keys += 1;
    events.push({ type: 'key', count: state.inventory.keys, ...state.player });
  }
}

function collapseDeparture(state, from, events) {
  if (tileAt(state, from.x, from.y) !== TILE.FRAGILE) return;
  state.level.tiles[from.y][from.x] = TILE.PIT;
  events.push({ type: 'collapse', x: from.x, y: from.y });
}

function pairedTeleporter(state, tile) {
  const other = tile === TILE.TELEPORT_A ? TILE.TELEPORT_B : TILE.TELEPORT_A;
  for (let y = 1; y < GRID_H - 1; y += 1) {
    for (let x = 1; x < GRID_W - 1; x += 1) {
      if (tileAt(state, x, y) === other) return { x, y };
    }
  }
  return null;
}

function killPlayer(state, reason, events) {
  state.dead = true;
  state.deathReason = reason;
  events.push({ type: 'defeat', reason, ...state.player });
}

function resolveLanding(state, from, events, path) {
  collapseDeparture(state, from, events);
  collectAtPlayer(state, events);

  if (enemyAt(state, state.player.x, state.player.y)) {
    killPlayer(state, 'enemy', events);
    return;
  }

  const tile = tileAt(state, state.player.x, state.player.y);
  if ([TILE.SPIKE, TILE.WATER, TILE.PIT].includes(tile)) {
    killPlayer(state, tile === TILE.SPIKE ? 'spikes' : tile === TILE.WATER ? 'water' : 'pit', events);
    return;
  }

  if (tile === TILE.TELEPORT_A || tile === TILE.TELEPORT_B) {
    const destination = pairedTeleporter(state, tile);
    if (destination && !crateAt(state, destination.x, destination.y)) {
      const origin = { ...state.player };
      state.player.x = destination.x;
      state.player.y = destination.y;
      path.push({ from: origin, to: { ...state.player }, kind: 'teleport' });
      events.push({ type: 'teleport', from: origin, to: { ...state.player } });
      collectAtPlayer(state, events);
      if (enemyAt(state, state.player.x, state.player.y)) {
        killPlayer(state, 'enemy', events);
        return;
      }
    }
  }

  if (tileAt(state, state.player.x, state.player.y) === TILE.EXIT && exitActive(state)) {
    state.won = true;
    events.push({ type: 'victory', moves: state.moves });
  }
}

function unlockDoor(state, x, y, events) {
  if (tileAt(state, x, y) !== TILE.DOOR || state.inventory.keys < 1) return false;
  state.inventory.keys -= 1;
  state.level.tiles[y][x] = TILE.FLOOR;
  events.push({ type: 'unlock', x, y, keys: state.inventory.keys });
  return true;
}

function attemptPlayerStep(state, dx, dy, options, result) {
  const from = { ...state.player };
  const x = from.x + dx;
  const y = from.y + dy;
  const targetCrate = crateAt(state, x, y);

  if (!insideBoard(x, y)) return false;

  if (targetCrate) {
    if (!options.allowPush) return false;
    const crateX = x + dx;
    const crateY = y + dy;
    if (!canCrateEnter(state, crateX, crateY)) return false;
    targetCrate.x = crateX;
    targetCrate.y = crateY;
    result.events.push({ type: 'push', from: { x, y }, to: { x: crateX, y: crateY } });
  } else if (tileAt(state, x, y) === TILE.DOOR) {
    if (!unlockDoor(state, x, y, result.events)) return false;
  } else if (!canPlayerEnter(state, x, y)) {
    return false;
  }

  state.player.x = x;
  state.player.y = y;
  if (dx) state.player.dir = Math.sign(dx);
  result.path.push({ from, to: { ...state.player }, kind: options.kind ?? 'walk' });
  resolveLanding(state, from, result.events, result.path);
  return true;
}

function autoDirection(state, fallbackDx, fallbackDy) {
  const tile = tileAt(state, state.player.x, state.player.y);
  if (tile === TILE.ICE) return { dx: fallbackDx, dy: fallbackDy, kind: 'slide' };
  if (tile === TILE.CONVEYOR_R) return { dx: 1, dy: 0, kind: 'conveyor' };
  if (tile === TILE.CONVEYOR_L) return { dx: -1, dy: 0, kind: 'conveyor' };
  return null;
}

function movePatroller(state, enemy, dx, dy, result) {
  const firstX = enemy.x + dx;
  const firstY = enemy.y + dy;
  if (canEnemyEnter(state, enemy, firstX, firstY)) {
    enemy.x = firstX;
    enemy.y = firstY;
    return;
  }
  enemy.dir = enemy.dir % 2 === 0 ? 1 : 0;
  const reverseX = enemy.x - dx;
  const reverseY = enemy.y - dy;
  if (canEnemyEnter(state, enemy, reverseX, reverseY)) {
    enemy.x = reverseX;
    enemy.y = reverseY;
  } else {
    result.events.push({ type: 'enemy-blocked', enemy: enemy.type, x: enemy.x, y: enemy.y });
  }
}

function chaseVector(enemy, player) {
  const horizontal = Math.abs(player.x - enemy.x) >= Math.abs(player.y - enemy.y);
  return horizontal
    ? [{ dx: Math.sign(player.x - enemy.x), dy: 0 }, { dx: 0, dy: Math.sign(player.y - enemy.y) }]
    : [{ dx: 0, dy: Math.sign(player.y - enemy.y) }, { dx: Math.sign(player.x - enemy.x), dy: 0 }];
}

function moveChaser(state, enemy, result) {
  for (const direction of chaseVector(enemy, state.player)) {
    if (!direction.dx && !direction.dy) continue;
    const x = enemy.x + direction.dx;
    const y = enemy.y + direction.dy;
    if (!canEnemyEnter(state, enemy, x, y)) continue;
    enemy.x = x;
    enemy.y = y;
    return;
  }
  result.events.push({ type: 'enemy-blocked', enemy: enemy.type, x: enemy.x, y: enemy.y });
}

export function lineOfSight(state, from, to) {
  if (from.x !== to.x && from.y !== to.y) return false;
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  let x = from.x + dx;
  let y = from.y + dy;
  while (x !== to.x || y !== to.y) {
    const tile = tileAt(state, x, y);
    if (tile === TILE.WALL || tile === TILE.DOOR || (tile === TILE.GATE && !platePressed(state)) || crateAt(state, x, y)) return false;
    x += dx;
    y += dy;
  }
  return true;
}

export function turretWillFireNextTurn(state, turret) {
  return turret.type === 'turret' && (state.turn + 1) % 3 === 0 && lineOfSight(state, turret, state.player);
}

function moveEnemies(state, playerDx, playerDy, result) {
  for (const enemy of state.enemies) {
    if (state.dead || state.won) return;

    if (enemy.type === 'turret') {
      if (state.turn % 3 === 0 && lineOfSight(state, enemy, state.player)) {
        result.events.push({ type: 'turret-fire', from: { x: enemy.x, y: enemy.y }, to: { ...state.player } });
        killPlayer(state, 'turret', result.events);
      }
      continue;
    }

    const phase = (state.turn + (enemy.phase ?? 0)) % 2;
    if (enemy.type === 'scarab') {
      movePatroller(state, enemy, enemy.dir % 2 === 0 ? 1 : -1, 0, result);
    } else if (enemy.type === 'crawler') {
      movePatroller(state, enemy, 0, enemy.dir % 2 === 0 ? 1 : -1, result);
    } else if ((enemy.type === 'slime' || enemy.type === 'ghost') && phase === 0) {
      moveChaser(state, enemy, result);
    } else if (enemy.type === 'hopper' && phase === 0) {
      const candidates = chaseVector(enemy, state.player);
      for (const direction of candidates) {
        const x = enemy.x + direction.dx * 2;
        const y = enemy.y + direction.dy * 2;
        if (!canEnemyEnter(state, enemy, x, y)) continue;
        enemy.x = x;
        enemy.y = y;
        break;
      }
    } else if (enemy.type === 'mimic') {
      const x = enemy.x + playerDx;
      const y = enemy.y + playerDy;
      if (canEnemyEnter(state, enemy, x, y)) {
        enemy.x = x;
        enemy.y = y;
      }
    } else if (enemy.type === 'drone') {
      const cycle = CARDINALS;
      const direction = cycle[(state.turn + (enemy.dir ?? 0)) % cycle.length];
      const x = enemy.x + direction.dx;
      const y = enemy.y + direction.dy;
      if (canEnemyEnter(state, enemy, x, y)) {
        enemy.x = x;
        enemy.y = y;
      }
    }

    result.events.push({ type: 'enemy-move', enemy: enemy.type, x: enemy.x, y: enemy.y });
    if (samePosition(enemy, state.player)) killPlayer(state, 'enemy', result.events);
  }
}

export function performTurn(state, dx, dy, options = {}) {
  const result = { moved: false, path: [], events: [], dead: state.dead, won: state.won };
  if (state.dead || state.won || (!dx && !dy)) return result;

  const moved = attemptPlayerStep(state, dx, dy, { allowPush: true, kind: 'walk' }, result);
  if (!moved) {
    result.events.push({ type: 'bump', x: state.player.x + dx, y: state.player.y + dy });
    return result;
  }

  result.moved = true;
  state.moves += 1;
  state.turn += 1;

  let autoDx = dx;
  let autoDy = dy;
  const visitedAuto = new Set();
  for (let safety = 0; safety < 32 && !state.dead && !state.won; safety += 1) {
    const automatic = autoDirection(state, autoDx, autoDy);
    if (!automatic || (!automatic.dx && !automatic.dy)) break;
    const signature = `${keyOf(state.player.x, state.player.y)}:${automatic.dx},${automatic.dy}:${tileAt(state, state.player.x, state.player.y)}`;
    if (visitedAuto.has(signature)) {
      result.events.push({ type: 'auto-loop-stopped', ...state.player });
      break;
    }
    visitedAuto.add(signature);
    const autoMoved = attemptPlayerStep(
      state,
      automatic.dx,
      automatic.dy,
      { allowPush: false, kind: automatic.kind },
      result,
    );
    if (!autoMoved) break;
    autoDx = automatic.dx;
    autoDy = automatic.dy;
  }

  if (!state.dead && !state.won && options.moveEnemies !== false) {
    moveEnemies(state, dx, dy, result);
  }

  result.dead = state.dead;
  result.won = state.won;
  return result;
}

export function serializePuzzleState(state) {
  const dynamicTiles = [];
  for (let y = 1; y < GRID_H - 1; y += 1) {
    for (let x = 1; x < GRID_W - 1; x += 1) {
      const tile = tileAt(state, x, y);
      if (tile === TILE.DOOR || tile === TILE.PIT) dynamicTiles.push(`${x},${y},${tile}`);
    }
  }
  const positions = (items) => items.map((item) => `${item.x},${item.y}`).sort().join(';');
  return [
    `${state.player.x},${state.player.y}`,
    state.inventory.keys,
    positions(state.crates),
    positions(state.sparks),
    positions(state.keys),
    dynamicTiles.sort().join(';'),
  ].join('|');
}
