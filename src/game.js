import { LEVELS, WORLDS, TILE, GRID_W, GRID_H, getLevel } from './levels.js';
import {
  createState,
  snapshotState,
  restoreState,
  performTurn,
  tileAt,
  platePressed,
  exitActive,
  lineOfSight,
  turretWillFireNextTurn,
} from './engine.js';
import { AudioDirector } from './audio.js';
import {
  VIEW,
  background,
  panel,
  button,
  text,
  wrap,
  drawTile,
  drawSpark,
  drawKey,
  drawCrate,
  drawPip,
  drawEnemy,
  logo,
  comic,
} from './art.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const live = document.getElementById('live-region');
const touchControls = document.getElementById('touch-controls');
const audio = new AudioDirector();

const SAVE_KEY = 'pip-prism-vault-save-v2';
const LEGACY_SAVE_KEY = 'pip-prism-vault-save-v1';
const DEFAULT_SAVE = Object.freeze({
  unlocked: 1,
  completed: {},
  stars: {},
  best: {},
  sound: true,
  musicVolume: 0.72,
  sfxVolume: 0.9,
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  contrast: false,
  introSeen: false,
  lastRoom: 1,
});

const SCREEN = Object.freeze({
  TITLE: 'title',
  COMIC: 'comic',
  SELECT: 'select',
  PLAY: 'play',
  PAUSE: 'pause',
  DEFEAT: 'defeat',
  VICTORY: 'victory',
  OPTIONS: 'options',
  CREDITS: 'credits',
  ENDING: 'ending',
});

const DIRECTION_ACTIONS = Object.freeze({
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
});

let save = loadSave();
let screen = SCREEN.TITLE;
let optionsReturnScreen = SCREEN.TITLE;
let comicPage = 0;
let selectedWorld = Math.max(0, Math.min(9, Math.floor((save.lastRoom - 1) / 10)));
let selectedLevel = Math.max(0, Math.min(99, save.lastRoom - 1));
let game = null;
let lastTime = 0;
let time = 0;
let shake = 0;
let flash = 0;
let transition = 1;
let particles = [];
let buttons = [];
let keyboardFocus = -1;
let pointerPosition = null;
let bufferedAction = null;
let pendingOutcome = null;
let gamepadLatch = new Map();
let gamepadRepeatAt = 0;

function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function normalizeSave(raw) {
  const merged = { ...DEFAULT_SAVE, ...(raw || {}) };
  merged.completed = { ...(raw?.completed || {}) };
  merged.stars = { ...(raw?.stars || {}) };
  merged.best = { ...(raw?.best || {}) };
  merged.unlocked = Math.max(1, Math.min(100, Number(merged.unlocked) || 1));
  merged.lastRoom = Math.max(1, Math.min(100, Number(merged.lastRoom) || 1));
  merged.musicVolume = Math.max(0, Math.min(1, Number(merged.musicVolume ?? DEFAULT_SAVE.musicVolume)));
  merged.sfxVolume = Math.max(0, Math.min(1, Number(merged.sfxVolume ?? DEFAULT_SAVE.sfxVolume)));
  return merged;
}

function loadSave() {
  try {
    const current = localStorage.getItem(SAVE_KEY);
    const legacy = localStorage.getItem(LEGACY_SAVE_KEY);
    const parsed = JSON.parse(current || legacy || '{}');
    const normalized = normalizeSave(parsed);
    if (!current && legacy) localStorage.setItem(SAVE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return normalizeSave({});
  }
}

function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage may be unavailable in private browsing; play continues in memory.
  }
}

function configureAudio() {
  audio.setEnabled(save.sound);
  audio.setMix?.(save.musicVolume, save.sfxVolume);
}
configureAudio();

function announce(message) {
  if (!live) return;
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = message; });
}

function setScreen(next, options = {}) {
  if (screen === next && !options.force) return;
  screen = next;
  keyboardFocus = -1;
  pointerPosition = null;
  transition = save.reduced ? 0 : 1;
  if (next !== SCREEN.PLAY && next !== SCREEN.PAUSE && next !== SCREEN.DEFEAT && next !== SCREEN.VICTORY) {
    bufferedAction = null;
  }
}

function menu() {
  audio.stopMusic();
  setScreen(SCREEN.TITLE);
  announce('Main menu');
}

function loadLevel(id) {
  const level = getLevel(id);
  game = createState(level);
  game.history = [];
  game.hint = false;
  game.locked = false;
  game.animation = null;
  game.renderPlayer = { ...game.player };
  selectedLevel = level.id - 1;
  selectedWorld = level.world - 1;
  save.lastRoom = level.id;
  persist();
  pendingOutcome = null;
  bufferedAction = null;
  setScreen(SCREEN.PLAY, { force: true });
  audio.startMusic(WORLDS[level.world - 1]);
  updateDanger();
  announce(`Room ${level.id}: ${level.name}. ${level.hint}`);
}

function boardPosition(x, y) {
  return {
    x: VIEW.boardX + x * VIEW.tile + VIEW.tile / 2,
    y: VIEW.boardY + y * VIEW.tile + VIEW.tile / 2,
  };
}

function addBurst(x, y, color, count = 18, speed = 4) {
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = 1.2 + Math.random() * speed;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - 1,
      life: 650 + Math.random() * 350,
      max: 1000,
      color,
      size: 2 + Math.random() * 5,
    });
  }
}

function playEvents(events) {
  for (const event of events) {
    if (event.type === 'spark') {
      const point = boardPosition(event.x, event.y);
      addBurst(point.x, point.y, '#ffe86d', 24, 5);
      audio.sfx('spark');
      announce(`${3 - event.remaining} of 3 Prism Sparks collected`);
    } else if (event.type === 'key') {
      audio.sfx('key');
      announce(`Sunkey collected. ${event.count} held.`);
    } else if (event.type === 'unlock') {
      audio.sfx('unlock');
      announce('Sealed door opened');
    } else if (event.type === 'push') {
      audio.sfx('push');
    } else if (event.type === 'teleport') {
      const origin = boardPosition(event.from.x, event.from.y);
      const destination = boardPosition(event.to.x, event.to.y);
      addBurst(origin.x, origin.y, '#67f3ff', 16, 4);
      addBurst(destination.x, destination.y, '#ff69c0', 16, 4);
      audio.sfx('teleport');
    } else if (event.type === 'collapse') {
      const point = boardPosition(event.x, event.y);
      addBurst(point.x, point.y, '#d8b996', 12, 2.5);
      audio.sfx('collapse');
    } else if (event.type === 'turret-fire') {
      shake = Math.max(shake, 16);
      flash = Math.max(flash, 0.55);
      audio.sfx('danger');
    } else if (event.type === 'defeat') {
      shake = Math.max(shake, 20);
      flash = Math.max(flash, 0.65);
      audio.sfx('danger');
    }
  }
}

function animationDuration(kind) {
  if (save.reduced) return 1;
  if (kind === 'slide') return 66;
  if (kind === 'conveyor') return 82;
  if (kind === 'teleport') return 150;
  return 105;
}

function beginAnimation(path) {
  if (!game || path.length === 0) return;
  game.animation = {
    segments: path.map((segment) => ({ ...segment, duration: animationDuration(segment.kind) })),
    index: 0,
    elapsed: 0,
  };
  game.locked = true;
}

function finishTurnOutcome() {
  if (!game || !pendingOutcome) return;
  const outcome = pendingOutcome;
  pendingOutcome = null;
  if (outcome === SCREEN.DEFEAT) {
    setScreen(SCREEN.DEFEAT);
    announce(`Pip was lost to ${game.deathReason || 'the Vault'}. Undo or retry.`);
  } else if (outcome === SCREEN.VICTORY) {
    completeRoom();
  }
}

function updateAnimation(dt) {
  if (!game?.animation || screen !== SCREEN.PLAY) return;
  const animation = game.animation;
  animation.elapsed += dt;
  while (animation.index < animation.segments.length) {
    const segment = animation.segments[animation.index];
    if (animation.elapsed < segment.duration) break;
    animation.elapsed -= segment.duration;
    animation.index += 1;
  }
  if (animation.index >= animation.segments.length) {
    game.animation = null;
    game.locked = false;
    game.renderPlayer = { ...game.player };
    finishTurnOutcome();
    if (screen === SCREEN.PLAY && bufferedAction) {
      const action = bufferedAction;
      bufferedAction = null;
      input(action);
    }
  }
}

function renderPlayerPosition() {
  if (!game?.animation) return boardPosition(game.player.x, game.player.y);
  const segment = game.animation.segments[game.animation.index];
  if (!segment) return boardPosition(game.player.x, game.player.y);
  const progress = Math.max(0, Math.min(1, game.animation.elapsed / segment.duration));
  const eased = segment.kind === 'teleport'
    ? progress < 0.5 ? progress * 0.25 : 0.75 + progress * 0.25
    : 1 - (1 - progress) ** 3;
  const from = boardPosition(segment.from.x, segment.from.y);
  const to = boardPosition(segment.to.x, segment.to.y);
  return {
    x: from.x + (to.x - from.x) * eased,
    y: from.y + (to.y - from.y) * eased,
    alpha: segment.kind === 'teleport' ? Math.abs(progress - 0.5) * 2 : 1,
  };
}

function performMove(dx, dy) {
  if (!game || screen !== SCREEN.PLAY || game.dead || game.won) return;
  if (game.locked) {
    bufferedAction = Object.entries(DIRECTION_ACTIONS).find(([, vector]) => vector[0] === dx && vector[1] === dy)?.[0] ?? null;
    return;
  }

  const before = snapshotState(game);
  const result = performTurn(game, dx, dy);
  if (!result.moved) {
    audio.sfx('bump');
    return;
  }

  game.history.push(before);
  if (game.history.length > 160) game.history.shift();
  audio.sfx('move');
  playEvents(result.events);
  beginAnimation(result.path);
  updateDanger();

  if (game.dead) pendingOutcome = SCREEN.DEFEAT;
  if (game.won) pendingOutcome = SCREEN.VICTORY;
  if (!game.animation) finishTurnOutcome();
}

function undo() {
  if (!game || ![SCREEN.PLAY, SCREEN.DEFEAT].includes(screen) || game.locked || game.history.length === 0) return;
  const snapshot = game.history.pop();
  restoreState(game, snapshot);
  game.dead = false;
  game.won = false;
  game.deathReason = '';
  game.animation = null;
  game.locked = false;
  pendingOutcome = null;
  bufferedAction = null;
  setScreen(SCREEN.PLAY, { force: true });
  audio.sfx('undo');
  updateDanger();
  announce('Turn rewound');
}

function restart() {
  if (game) loadLevel(game.level.id);
}

function starsFor(moves, par) {
  if (moves <= par) return 3;
  if (moves <= Math.ceil(par * 1.45)) return 2;
  return 1;
}

function completeRoom() {
  if (!game) return;
  const id = game.level.id;
  const stars = starsFor(game.moves, game.level.par);
  save.completed[id] = true;
  save.stars[id] = Math.max(save.stars[id] || 0, stars);
  save.best[id] = Math.min(save.best[id] || Number.POSITIVE_INFINITY, game.moves);
  save.unlocked = Math.max(save.unlocked, Math.min(100, id + 1));
  save.lastRoom = Math.min(100, id + 1);
  persist();
  const point = boardPosition(game.player.x, game.player.y);
  addBurst(point.x, point.y, '#ffe86d', 48, 6);
  audio.sfx('win');
  setScreen(id === 100 ? SCREEN.ENDING : SCREEN.VICTORY);
  announce(`Room restored with ${stars} stars in ${game.moves} moves`);
}

function updateDanger() {
  if (!game) return;
  let danger = 0;
  for (const enemy of game.enemies) {
    const distance = Math.abs(enemy.x - game.player.x) + Math.abs(enemy.y - game.player.y);
    if (distance < 4) danger = Math.max(danger, (4 - distance) / 3);
    if (enemy.type === 'turret' && lineOfSight(game, enemy, game.player)) danger = Math.max(danger, 0.7);
  }
  audio.setDanger(danger);
}

function input(action) {
  audio.unlock();
  if (DIRECTION_ACTIONS[action]) {
    const [dx, dy] = DIRECTION_ACTIONS[action];
    performMove(dx, dy);
  } else if (action === 'undo') {
    undo();
  } else if (action === 'restart') {
    restart();
  }
}

function pointer(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * canvas.width / bounds.width,
    y: (event.clientY - bounds.top) * canvas.height / bounds.height,
  };
}

function inside(point, rectangle) {
  return point
    && point.x >= rectangle.x
    && point.y >= rectangle.y
    && point.x <= rectangle.x + rectangle.w
    && point.y <= rectangle.y + rectangle.h;
}

function addButton(rectangle, label, handler, accent = '#67f3ff', options = {}) {
  const index = buttons.length;
  const active = Boolean(options.selected) || keyboardFocus === index || inside(pointerPosition, rectangle);
  buttons.push({ rectangle, label, handler, disabled: Boolean(options.disabled) });
  button(ctx, rectangle, label, active && !options.disabled, options.disabled ? '#66708a' : accent);
  if (options.disabled) {
    ctx.save();
    ctx.fillStyle = 'rgba(5,8,18,.48)';
    ctx.fillRect(rectangle.x, rectangle.y, rectangle.w, rectangle.h);
    ctx.restore();
  }
}

function activateFocusedButton() {
  if (buttons.length === 0) return false;
  if (keyboardFocus < 0) keyboardFocus = 0;
  const target = buttons[keyboardFocus];
  if (!target || target.disabled) return false;
  audio.sfx('click');
  target.handler();
  return true;
}

function cycleFocus(delta) {
  if (buttons.length === 0) return;
  let next = keyboardFocus;
  for (let attempts = 0; attempts < buttons.length; attempts += 1) {
    next = (next + delta + buttons.length) % buttons.length;
    if (!buttons[next].disabled) break;
  }
  keyboardFocus = next;
  announce(buttons[next]?.label || '');
}

function handleBack() {
  if (screen === SCREEN.PLAY) setScreen(SCREEN.PAUSE);
  else if (screen === SCREEN.PAUSE) setScreen(SCREEN.PLAY);
  else if (screen === SCREEN.OPTIONS) setScreen(optionsReturnScreen);
  else if (screen !== SCREEN.TITLE) menu();
}

function handleKeydown(event) {
  const key = event.key.toLowerCase();
  const prevent = ['arrowup','arrowdown','arrowleft','arrowright',' ','enter','tab','backspace'].includes(key);
  if (prevent) event.preventDefault();
  audio.unlock();

  if (key === 'escape' || key === 'p') {
    handleBack();
    return;
  }
  if (key === 'm') {
    save.sound = !save.sound;
    configureAudio();
    persist();
    announce(`Sound ${save.sound ? 'on' : 'off'}`);
    return;
  }
  if (key === 'f') {
    document.fullscreenElement ? document.exitFullscreen() : canvas.parentElement.requestFullscreen?.();
    return;
  }
  if (key === 'tab') {
    cycleFocus(event.shiftKey ? -1 : 1);
    return;
  }
  if ((key === 'enter' || key === ' ') && activateFocusedButton()) return;

  if (screen === SCREEN.COMIC) {
    if (key === 'enter' || key === ' ' || key === 'arrowright') advanceComic();
    else if (key === 'arrowleft' && comicPage > 0) comicPage -= 1;
    return;
  }
  if (screen === SCREEN.TITLE && (key === 'enter' || key === ' ')) {
    beginStoryOrContinue();
    return;
  }
  if (key === 'h' && screen === SCREEN.PLAY && game) {
    game.hint = !game.hint;
    announce(game.hint ? game.level.hint : 'Hint hidden');
    return;
  }
  if (key === 'z' || key === 'backspace') {
    undo();
    return;
  }
  if (key === 'r') {
    restart();
    return;
  }

  const keyMap = {
    arrowup: 'up', w: 'up',
    arrowdown: 'down', s: 'down',
    arrowleft: 'left', a: 'left',
    arrowright: 'right', d: 'right',
  };
  if (keyMap[key]) {
    if (screen === SCREEN.PLAY) input(keyMap[key]);
    else cycleFocus(['up', 'left'].includes(keyMap[key]) ? -1 : 1);
  }
}

function beginStoryOrContinue() {
  if (save.introSeen) {
    setScreen(SCREEN.SELECT);
  } else {
    comicPage = 0;
    setScreen(SCREEN.COMIC);
  }
  audio.sfx('click');
}

function advanceComic() {
  if (comicPage < 1) {
    comicPage += 1;
    audio.sfx('page');
  } else {
    save.introSeen = true;
    persist();
    setScreen(SCREEN.SELECT);
    announce('Chapter directory');
  }
}

window.addEventListener('keydown', handleKeydown, { passive: false });
canvas.addEventListener('pointermove', (event) => { pointerPosition = pointer(event); keyboardFocus = -1; });
canvas.addEventListener('pointerleave', () => { pointerPosition = null; });
canvas.addEventListener('pointerdown', (event) => {
  audio.unlock();
  pointerPosition = pointer(event);
  const target = buttons.find((entry) => inside(pointerPosition, entry.rectangle));
  if (target && !target.disabled) {
    audio.sfx('click');
    target.handler();
  } else if (screen === SCREEN.COMIC) {
    advanceComic();
  }
});

document.querySelectorAll('[data-action]').forEach((control) => {
  control.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    input(control.dataset.action);
  });
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === SCREEN.PLAY) setScreen(SCREEN.PAUSE);
});

function pollGamepad(now) {
  const pads = navigator.getGamepads?.() || [];
  const pad = [...pads].find(Boolean);
  if (!pad) return;
  const pressed = (index) => Boolean(pad.buttons[index]?.pressed);
  const axisX = pad.axes[0] || 0;
  const axisY = pad.axes[1] || 0;
  const directional = Math.abs(axisX) > Math.abs(axisY)
    ? axisX < -0.55 ? 'left' : axisX > 0.55 ? 'right' : null
    : axisY < -0.55 ? 'up' : axisY > 0.55 ? 'down' : null;
  const dpad = pressed(12) ? 'up' : pressed(13) ? 'down' : pressed(14) ? 'left' : pressed(15) ? 'right' : null;
  const move = dpad || directional;

  if (move && now >= gamepadRepeatAt) {
    if (screen === SCREEN.PLAY) input(move);
    else cycleFocus(['up', 'left'].includes(move) ? -1 : 1);
    gamepadRepeatAt = now + 175;
  }

  const mappings = [
    [0, 'accept'], [1, 'back'], [2, 'undo'], [3, 'restart'], [9, 'pause'],
  ];
  for (const [index, action] of mappings) {
    const current = pressed(index);
    const previous = gamepadLatch.get(index) || false;
    if (current && !previous) {
      if (action === 'accept') activateFocusedButton() || (screen === SCREEN.COMIC && advanceComic());
      else if (action === 'back' || action === 'pause') handleBack();
      else if (action === 'undo') undo();
      else if (action === 'restart') restart();
    }
    gamepadLatch.set(index, current);
  }
}

function drawTitle() {
  background(ctx, WORLDS[0], time);
  ctx.save();
  ctx.globalAlpha = 0.28;
  for (let index = 0; index < 8; index += 1) drawSpark(ctx, 115 + index * 150, 90 + (index % 2) * 25, 34, time + index * 90);
  ctx.restore();
  panel(ctx, 160, 88, 960, 545, '#ffe56d', 0.86);
  logo(ctx, 640, 225, 1.34);
  drawPip(ctx, 420, 488, 225, time, 1, 'idle', save.contrast);
  text(ctx, '100 crafted single-screen puzzle rooms', 750, 380, 29, '#fff4d6', 'center', 900);
  text(ctx, 'Ten living galleries · Eight enemy families', 750, 423, 21, '#bcefff', 'center', 800);
  const restored = Object.keys(save.completed).length;
  if (restored) text(ctx, `${restored} ROOMS RESTORED · ${Object.values(save.stars).reduce((sum, value) => sum + value, 0)} STARS`, 750, 458, 17, '#ffe56d', 'center', 900);
  addButton({ x: 650, y: 492, w: 310, h: 66 }, save.introSeen ? 'CHAPTER DIRECTORY' : 'BEGIN STORY', beginStoryOrContinue, '#ffe56d');
  addButton({ x: 650, y: 570, w: 145, h: 48 }, 'CREDITS', () => setScreen(SCREEN.CREDITS));
  addButton({ x: 815, y: 570, w: 145, h: 48 }, 'OPTIONS', () => { optionsReturnScreen = SCREEN.TITLE; setScreen(SCREEN.OPTIONS); });
}

function drawSelect() {
  const world = WORLDS[selectedWorld];
  background(ctx, world, time);
  panel(ctx, 30, 24, 1220, 672, world.color, 0.92);
  text(ctx, 'CHAPTER DIRECTORY', 66, 64, 32, '#fff4d6');
  text(ctx, `${Object.keys(save.completed).length} / 100 RESTORED`, 1210, 64, 18, '#bdefff', 'right');

  for (let index = 0; index < 10; index += 1) {
    const firstRoom = index * 10 + 1;
    const locked = save.unlocked < firstRoom;
    const rect = { x: 66 + (index % 5) * 230, y: 92 + Math.floor(index / 5) * 82, w: 210, h: 62 };
    const chapterStars = Array.from({ length: 10 }, (_, room) => save.stars[firstRoom + room] || 0).reduce((sum, value) => sum + value, 0);
    const label = locked ? `CHAPTER ${index + 1} LOCKED` : `${index + 1}. ${WORLDS[index].name.split(' ')[0].toUpperCase()} · ${chapterStars}/30`;
    addButton(rect, label, () => {
      selectedWorld = index;
      selectedLevel = index * 10;
    }, WORLDS[index].color, { disabled: locked, selected: index === selectedWorld });
  }

  text(ctx, world.name, 70, 297, 32, world.color);
  text(ctx, world.tagline, 70, 332, 20, '#fff4d6');
  wrap(ctx, world.brief, 70, 363, 1080, 17, 23, '#bdefff');

  for (let local = 0; local < 10; local += 1) {
    const id = selectedWorld * 10 + local + 1;
    const locked = id > save.unlocked;
    const rect = { x: 70 + (local % 5) * 148, y: 410 + Math.floor(local / 5) * 91, w: 132, h: 72 };
    const stars = save.stars[id] || 0;
    const label = locked ? '—' : stars ? `${String(id).padStart(2, '0')} · ${stars}★` : `${String(id).padStart(2, '0')} · NEW`;
    addButton(rect, label, () => { selectedLevel = id - 1; announce(`Room ${id}: ${getLevel(id).name}`); }, world.color, { disabled: locked, selected: id - 1 === selectedLevel });
  }

  const highlighted = getLevel(selectedLevel + 1);
  panel(ctx, 835, 404, 365, 170, world.color, 0.68);
  text(ctx, `ROOM ${highlighted.id}`, 865, 438, 17, '#bdefff');
  wrap(ctx, highlighted.name, 865, 473, 300, 27, 32, '#fff4d6');
  text(ctx, `PAR ${highlighted.par} · BEST ${save.best[highlighted.id] || '—'}`, 865, 542, 17, '#ffe56d');
  addButton({ x: 845, y: 603, w: 170, h: 50 }, 'PLAY ROOM', () => loadLevel(highlighted.id), '#ffe56d', { disabled: highlighted.id > save.unlocked });
  addButton({ x: 1030, y: 603, w: 170, h: 50 }, 'MAIN MENU', menu, '#67f3ff');
}

function drawBoard() {
  const world = WORLDS[game.level.world - 1];
  panel(ctx, 28, 108, 790, 560, world.color, 0.82);
  const activePlate = platePressed(game);
  for (let y = 0; y < GRID_H; y += 1) {
    for (let x = 0; x < GRID_W; x += 1) {
      drawTile(
        ctx,
        tileAt(game, x, y),
        VIEW.boardX + x * VIEW.tile,
        VIEW.boardY + y * VIEW.tile,
        VIEW.tile,
        world,
        time,
        { active: exitActive(game), on: activePlate, open: activePlate },
      );
    }
  }

  for (const spark of game.sparks) {
    const point = boardPosition(spark.x, spark.y);
    drawSpark(ctx, point.x, point.y, 30, time);
  }
  for (const key of game.keys) {
    const point = boardPosition(key.x, key.y);
    drawKey(ctx, point.x, point.y, 38);
  }
  for (const crate of game.crates) {
    const point = boardPosition(crate.x, crate.y);
    drawCrate(ctx, point.x, point.y, 48, world);
  }

  for (const enemy of game.enemies) {
    const point = boardPosition(enemy.x, enemy.y);
    if (turretWillFireNextTurn(game, enemy)) {
      const player = boardPosition(game.player.x, game.player.y);
      ctx.save();
      ctx.strokeStyle = world.danger;
      ctx.globalAlpha = 0.52 + Math.sin(time * 0.016) * 0.12;
      ctx.lineWidth = 5;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(player.x, player.y);
      ctx.stroke();
      ctx.restore();
    }
    drawEnemy(ctx, enemy, point.x, point.y, 50, time, world);
  }

  const player = renderPlayerPosition();
  ctx.save();
  ctx.globalAlpha = player.alpha ?? 1;
  drawPip(ctx, player.x, player.y, 54, time, game.player.dir, game.locked ? 'move' : 'idle', save.contrast);
  ctx.restore();

  for (const particle of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, particle.life / particle.max);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function enemyLabel(type) {
  return ({
    scarab: 'Scarab patrol', crawler: 'Crawler patrol', slime: 'Slime chaser', hopper: 'Lunar hopper',
    turret: 'Three-beat turret', ghost: 'Wall ghost', mimic: 'Mirror mimic', drone: 'Orbit drone',
  })[type] || type;
}

function drawHUD() {
  const world = WORLDS[game.level.world - 1];
  panel(ctx, 840, 108, 398, 560, world.color, 0.9);
  text(ctx, `CHAPTER ${game.level.world}`, 870, 145, 16, world.color, 'left', 900);
  text(ctx, world.name.toUpperCase(), 870, 173, 20, '#fff4d6');
  text(ctx, `ROOM ${game.level.id}`, 870, 215, 17, '#bdefff');
  wrap(ctx, game.level.name, 870, 250, 330, 29, 33, '#fff4d6');

  panel(ctx, 870, 315, 335, 88, world.color, 0.55);
  text(ctx, `SPARKS  ${3 - game.sparks.length}/3`, 892, 343, 20, '#ffe56d');
  text(ctx, `KEYS  ${game.inventory.keys}`, 1075, 343, 20, '#ffe56d');
  text(ctx, `MOVES  ${game.moves}`, 892, 378, 18, '#dceaff');
  text(ctx, `PAR  ${game.level.par}`, 1075, 378, 18, '#dceaff');

  const families = [...new Set(game.enemies.map((enemy) => enemy.type))];
  text(ctx, 'ROOM READOUT', 870, 430, 15, '#bdefff');
  if (families.length) {
    families.slice(0, 3).forEach((family, index) => text(ctx, `• ${enemyLabel(family)}`, 882, 459 + index * 24, 16, '#fff4d6'));
  } else {
    text(ctx, '• No hostiles', 882, 459, 16, '#fff4d6');
  }

  if (game.hint) {
    panel(ctx, 858, 525, 362, 80, '#ffe56d', 0.72);
    wrap(ctx, game.level.hint, 878, 548, 320, 15, 20, '#fff4d6');
  }

  addButton({ x: 858, y: 618, w: 82, h: 38 }, 'UNDO', undo, '#67f3ff', { disabled: game.history.length === 0 || game.locked });
  addButton({ x: 948, y: 618, w: 82, h: 38 }, 'RETRY', restart, '#ffe56d');
  addButton({ x: 1038, y: 618, w: 82, h: 38 }, game.hint ? 'HIDE' : 'HINT', () => { game.hint = !game.hint; }, '#ff79aa');
  addButton({ x: 1128, y: 618, w: 82, h: 38 }, 'PAUSE', () => setScreen(SCREEN.PAUSE), '#dbe3ff');
}

function drawPlay() {
  const world = WORLDS[game.level.world - 1];
  background(ctx, world, time);
  ctx.save();
  if (shake) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  drawBoard();
  ctx.restore();
  drawHUD();
}

function overlay(title, subtitle, accent = '#ffe56d') {
  ctx.fillStyle = 'rgba(4,7,18,.76)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  panel(ctx, 335, 126, 610, 480, accent, 0.98);
  text(ctx, title, 640, 205, 47, '#fff4d6', 'center', 1000);
  wrap(ctx, subtitle, 640, 264, 510, 21, 29, '#cfeaff', 'center');
}

function drawPause() {
  drawPlay();
  buttons = [];
  overlay('PAUSED', 'The Vault waits. Nothing moves until Pip does.', '#67f3ff');
  addButton({ x: 465, y: 350, w: 350, h: 58 }, 'RESUME', () => setScreen(SCREEN.PLAY), '#67f3ff');
  addButton({ x: 465, y: 424, w: 350, h: 52 }, 'OPTIONS', () => { optionsReturnScreen = SCREEN.PAUSE; setScreen(SCREEN.OPTIONS); }, '#ffe56d');
  addButton({ x: 465, y: 492, w: 350, h: 52 }, 'CHAPTER DIRECTORY', () => setScreen(SCREEN.SELECT), '#ff79aa');
}

function drawDefeat() {
  drawPlay();
  buttons = [];
  overlay('THREAD BROKEN', `Pip was lost to ${game.deathReason || 'the Vault'}. Every mistake is information.`, '#ff6f8e');
  addButton({ x: 455, y: 350, w: 370, h: 60 }, 'UNDO LAST TURN', undo, '#67f3ff', { disabled: game.history.length === 0 });
  addButton({ x: 455, y: 430, w: 370, h: 54 }, 'RESTART ROOM', restart, '#ffe56d');
  addButton({ x: 455, y: 500, w: 370, h: 50 }, 'CHAPTER DIRECTORY', () => setScreen(SCREEN.SELECT), '#ff7b9b');
}

function drawVictory() {
  drawPlay();
  buttons = [];
  const stars = starsFor(game.moves, game.level.par);
  const best = save.best[game.level.id];
  overlay('ROOM RESTORED', `${game.level.name} is bright again. ${game.moves} moves against par ${game.level.par}.`, '#ffe56d');
  text(ctx, '★'.repeat(stars) + '☆'.repeat(3 - stars), 640, 330, 58, '#ffe56d', 'center', 1000);
  text(ctx, `BEST ${best} MOVES`, 640, 372, 17, '#bdefff', 'center');
  addButton({ x: 455, y: 405, w: 370, h: 58 }, 'NEXT ROOM', () => loadLevel(Math.min(100, game.level.id + 1)), '#ffe56d');
  addButton({ x: 455, y: 478, w: 370, h: 50 }, 'REPLAY', restart, '#67f3ff');
  addButton({ x: 455, y: 542, w: 370, h: 46 }, 'CHAPTER DIRECTORY', () => setScreen(SCREEN.SELECT), '#ff7aa0');
}

function volumeLabel(value) {
  return `${Math.round(value * 100)}%`;
}

function adjustVolume(field, delta) {
  save[field] = Math.max(0, Math.min(1, Math.round((save[field] + delta) * 10) / 10));
  configureAudio();
  persist();
  audio.sfx('click');
}

function drawOptions() {
  background(ctx, WORLDS[selectedWorld] || WORLDS[0], time);
  panel(ctx, 300, 54, 680, 620, '#67f3ff', 0.96);
  text(ctx, 'OPTIONS', 640, 115, 44, '#fff4d6', 'center', 1000);

  const toggle = (y, label, value, handler) => {
    text(ctx, label, 380, y + 27, 22, '#fff4d6');
    addButton({ x: 715, y, w: 180, h: 54 }, value ? 'ON' : 'OFF', handler, value ? '#67f3ff' : '#ff7b9b');
  };
  toggle(165, 'MASTER SOUND', save.sound, () => { save.sound = !save.sound; configureAudio(); persist(); });

  text(ctx, 'MUSIC', 380, 260, 22, '#fff4d6');
  addButton({ x: 650, y: 235, w: 62, h: 50 }, '−', () => adjustVolume('musicVolume', -0.1), '#67f3ff');
  text(ctx, volumeLabel(save.musicVolume), 765, 260, 20, '#bdefff', 'center');
  addButton({ x: 820, y: 235, w: 62, h: 50 }, '+', () => adjustVolume('musicVolume', 0.1), '#67f3ff');

  text(ctx, 'SOUND EFFECTS', 380, 330, 22, '#fff4d6');
  addButton({ x: 650, y: 305, w: 62, h: 50 }, '−', () => adjustVolume('sfxVolume', -0.1), '#ffe56d');
  text(ctx, volumeLabel(save.sfxVolume), 765, 330, 20, '#bdefff', 'center');
  addButton({ x: 820, y: 305, w: 62, h: 50 }, '+', () => adjustVolume('sfxVolume', 0.1), '#ffe56d');

  toggle(385, 'REDUCED MOTION', save.reduced, () => { save.reduced = !save.reduced; persist(); });
  toggle(455, 'HIGH CONTRAST PIP', save.contrast, () => { save.contrast = !save.contrast; persist(); });
  addButton({ x: 390, y: 540, w: 230, h: 50 }, 'FULLSCREEN', () => document.fullscreenElement ? document.exitFullscreen() : canvas.parentElement.requestFullscreen?.(), '#ffe56d');
  addButton({ x: 650, y: 540, w: 230, h: 50 }, 'RESET PROGRESS', resetProgress, '#ff7b9b');
  addButton({ x: 505, y: 610, w: 270, h: 46 }, 'BACK', () => setScreen(optionsReturnScreen), '#67f3ff');
}

function resetProgress() {
  const confirmed = window.confirm('Reset every room record and story unlock? This cannot be undone.');
  if (!confirmed) return;
  save = normalizeSave({ sound: save.sound, musicVolume: save.musicVolume, sfxVolume: save.sfxVolume, reduced: save.reduced, contrast: save.contrast });
  selectedWorld = 0;
  selectedLevel = 0;
  persist();
  announce('Progress reset');
  setScreen(SCREEN.TITLE);
}

function drawCredits() {
  background(ctx, WORLDS[6], time);
  panel(ctx, 170, 48, 940, 620, '#dbe3ff', 0.92);
  logo(ctx, 640, 137, 0.8);
  text(ctx, 'ORIGINAL GAME · ART SYSTEM · LEVEL SYSTEM · MUSIC & SFX', 640, 255, 18, '#dceaff', 'center');
  text(ctx, 'ALEX DE VRIES XING · PIP’S POCKET WORLDS', 640, 300, 27, '#ffe56d', 'center', 1000);
  wrap(ctx, 'A dependency-free Canvas 2D puzzle arcade game with original vector artwork, deterministic room logic, procedural audio, and a reusable series hero.', 640, 360, 720, 22, 31, '#fff4d6', 'center');
  text(ctx, 'Thank you for keeping the light.', 640, 505, 25, '#bdefff', 'center');
  addButton({ x: 515, y: 575, w: 250, h: 52 }, 'BACK', menu, '#ffe56d');
}

function drawEnding() {
  background(ctx, WORLDS[9], time);
  for (let index = 0; index < 10; index += 1) drawSpark(ctx, 110 + index * 118, 115 + Math.sin(index + time * 0.002) * 30, 50, time + index * 70);
  panel(ctx, 190, 112, 900, 520, '#ffe56d', 0.88);
  logo(ctx, 640, 215, 0.9);
  text(ctx, 'MORNING RETURNS', 640, 342, 48, '#fff4d6', 'center', 1000);
  wrap(ctx, 'The Prism Heart sings. Every pocket world wakes. Far beyond the restored Vault, a clockwork moon blinks once in the dark…', 640, 408, 700, 24, 34, '#dceaff', 'center');
  text(ctx, '100 / 100 ROOMS RESTORED', 640, 500, 20, '#ffe56d', 'center');
  addButton({ x: 470, y: 545, w: 340, h: 58 }, 'CHAPTER DIRECTORY', () => setScreen(SCREEN.SELECT), '#ffe56d');
  addButton({ x: 550, y: 612, w: 180, h: 42 }, 'CREDITS', () => setScreen(SCREEN.CREDITS), '#67f3ff');
}

function update(dt) {
  for (const particle of particles) {
    particle.x += particle.vx * dt * 0.06;
    particle.y += particle.vy * dt * 0.06;
    particle.vy += 0.006 * dt;
    particle.life -= dt;
  }
  particles = particles.filter((particle) => particle.life > 0);
  shake = Math.max(0, shake - dt * 0.04);
  flash = Math.max(0, flash - dt * 0.0022);
  transition = Math.max(0, transition - dt * 0.0045);
  updateAnimation(dt);
}

function render(timestamp) {
  const dt = Math.min(40, timestamp - lastTime || 16);
  lastTime = timestamp;
  time = timestamp;
  buttons = [];
  update(dt);
  pollGamepad(timestamp);

  if (screen === SCREEN.TITLE) drawTitle();
  else if (screen === SCREEN.COMIC) comic(ctx, comicPage, time);
  else if (screen === SCREEN.SELECT) drawSelect();
  else if (screen === SCREEN.PLAY) drawPlay();
  else if (screen === SCREEN.PAUSE) drawPause();
  else if (screen === SCREEN.DEFEAT) drawDefeat();
  else if (screen === SCREEN.VICTORY) drawVictory();
  else if (screen === SCREEN.OPTIONS) drawOptions();
  else if (screen === SCREEN.CREDITS) drawCredits();
  else if (screen === SCREEN.ENDING) drawEnding();

  if (flash) {
    ctx.fillStyle = `rgba(255,255,255,${flash})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (transition) {
    ctx.fillStyle = `rgba(4,7,18,${transition})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(render);
}

if (touchControls) touchControls.hidden = false;
requestAnimationFrame(render);
