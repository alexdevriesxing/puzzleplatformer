import { TILE } from './levels.js';

export const VIEW = Object.freeze({ w: 1280, h: 720, boardX: 48, boardY: 130, tile: 58, hudX: 842, hudW: 390 });

function roundedPath(ctx, x, y, width, height, radius = 14) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function starPath(ctx, outer, inner, points = 8) {
  ctx.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI / points;
    const radius = index % 2 === 0 ? outer : inner;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function colorWithAlpha(hex, alpha) {
  if (!hex?.startsWith('#')) return hex;
  const normalized = hex.length === 4
    ? hex.slice(1).split('').map((value) => value + value).join('')
    : hex.slice(1);
  const number = Number.parseInt(normalized, 16);
  return `rgba(${number >> 16},${(number >> 8) & 255},${number & 255},${alpha})`;
}

export function text(ctx, value, x, y, size = 24, color = '#fff4d6', align = 'left', weight = 800) {
  ctx.save();
  ctx.font = `${weight} ${size}px ui-rounded, "Trebuchet MS", system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(String(value), x, y);
  ctx.restore();
}

export function wrap(ctx, value, x, y, maxWidth, size = 22, lineHeight = 30, color = '#fff4d6', align = 'left') {
  const words = String(value).split(/\s+/);
  const lines = [];
  let current = '';
  ctx.save();
  ctx.font = `800 ${size}px ui-rounded, "Trebuchet MS", system-ui, sans-serif`;
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  ctx.restore();
  lines.forEach((line, index) => text(ctx, line, x, y + index * lineHeight, size, color, align));
  return lines.length * lineHeight;
}

export function panel(ctx, x, y, width, height, accent = '#67f3ff', alpha = 0.92) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.42)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  roundedPath(ctx, x, y, width, height, 20);
  const fill = ctx.createLinearGradient(x, y, x, y + height);
  fill.addColorStop(0, `rgba(13,20,48,${alpha})`);
  fill.addColorStop(1, `rgba(5,9,25,${Math.min(1, alpha + 0.04)})`);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = colorWithAlpha(accent, 0.52);
  ctx.lineWidth = 2;
  ctx.stroke();
  const gloss = ctx.createLinearGradient(x, y, x, y + 30);
  gloss.addColorStop(0, 'rgba(255,255,255,.16)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  roundedPath(ctx, x + 2, y + 2, width - 4, Math.min(30, height - 4), 17);
  ctx.fillStyle = gloss;
  ctx.fill();
  ctx.restore();
}

export function button(ctx, rectangle, label, active = false, accent = '#67f3ff') {
  const { x, y, w, h } = rectangle;
  ctx.save();
  ctx.shadowColor = active ? colorWithAlpha(accent, 0.45) : 'rgba(0,0,0,.28)';
  ctx.shadowBlur = active ? 20 : 9;
  ctx.shadowOffsetY = 5;
  roundedPath(ctx, x, y, w, h, Math.min(15, h * 0.3));
  const fill = ctx.createLinearGradient(x, y, x, y + h);
  fill.addColorStop(0, active ? '#4a5a9a' : '#303963');
  fill.addColorStop(1, active ? '#222d61' : '#171e40');
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = active ? accent : 'rgba(255,255,255,.24)';
  ctx.lineWidth = active ? 3 : 2;
  ctx.stroke();
  if (active) {
    ctx.fillStyle = colorWithAlpha(accent, 0.16);
    roundedPath(ctx, x + 5, y + 5, w - 10, h - 10, Math.min(11, h * 0.24));
    ctx.fill();
  }
  let fontSize = Math.max(12, Math.min(22, h * 0.43));
  ctx.font = `900 ${fontSize}px ui-rounded, "Trebuchet MS", system-ui, sans-serif`;
  while (fontSize > 12 && ctx.measureText(String(label)).width > w - 18) {
    fontSize -= 1;
    ctx.font = `900 ${fontSize}px ui-rounded, "Trebuchet MS", system-ui, sans-serif`;
  }
  text(ctx, label, x + w / 2, y + h / 2, fontSize, active ? '#ffffff' : '#fff4d6', 'center', 900);
  ctx.restore();
}

export function background(ctx, world, timestamp = 0) {
  const palette = world.palette;
  const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
  gradient.addColorStop(0, palette[0]);
  gradient.addColorStop(0.52, palette[1]);
  gradient.addColorStop(1, '#070a17');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1280, 720);

  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = palette[3];
  ctx.lineWidth = 2;
  for (let index = 0; index < 18; index += 1) {
    const y = (index * 53 + timestamp * 0.01 * (index % 3 + 1)) % 820 - 50;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(320, y - 50, 680, y + 80, 1280, y - 10);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.16;
  for (let index = 0; index < 28; index += 1) {
    const x = (index * 83 + Math.sin(timestamp * 0.0003 + index) * 18) % 1280;
    const y = (index * 137 + timestamp * 0.006 * (index % 2 ? 1 : -1) + 720) % 720;
    const radius = 1 + index % 4;
    ctx.fillStyle = index % 3 ? palette[3] : palette[4];
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const vignette = ctx.createRadialGradient(640, 330, 180, 640, 360, 780);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.42)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 1280, 720);
}

function tileBase(ctx, x, y, size, fill, stroke = 'rgba(255,255,255,.12)') {
  roundedPath(ctx, x + 2, y + 2, size - 4, size - 4, 10);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawFloorOrnament(ctx, x, y, size, world, timestamp) {
  const worldIndex = world.id || 1;
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = world.palette[3];
  ctx.lineWidth = 1.5;
  if (worldIndex === 1 || worldIndex === 9) {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * 0.18, 0, Math.PI * 2);
    for (let index = 0; index < 8; index += 1) {
      const angle = timestamp * 0.0002 + index * Math.PI / 4;
      ctx.moveTo(x + size / 2 + Math.cos(angle) * size * 0.2, y + size / 2 + Math.sin(angle) * size * 0.2);
      ctx.lineTo(x + size / 2 + Math.cos(angle) * size * 0.29, y + size / 2 + Math.sin(angle) * size * 0.29);
    }
    ctx.stroke();
  } else if (worldIndex === 2 || worldIndex === 8) {
    ctx.beginPath();
    ctx.moveTo(x + 8, y + size - 9);
    ctx.quadraticCurveTo(x + size * 0.45, y + size * 0.15, x + size - 8, y + 10);
    ctx.stroke();
  } else if (worldIndex === 6) {
    ctx.strokeRect(x + 10, y + 10, size - 20, size - 20);
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 18);
    ctx.lineTo(x + size - 15, y + 18);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x + 8, y + size - 10);
    ctx.lineTo(x + size - 9, y + 9);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawTile(ctx, tile, x, y, size, world, timestamp, flags = {}) {
  const palette = world.palette;
  switch (tile) {
    case TILE.FLOOR:
      tileBase(ctx, x, y, size, palette[1]);
      drawFloorOrnament(ctx, x, y, size, world, timestamp);
      break;
    case TILE.WALL: {
      const gradient = ctx.createLinearGradient(x, y, x, y + size);
      gradient.addColorStop(0, palette[2]);
      gradient.addColorStop(1, palette[0]);
      tileBase(ctx, x, y, size, gradient, palette[3]);
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      roundedPath(ctx, x + 8, y + 7, size - 16, 9, 5);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      roundedPath(ctx, x + 10, y + size - 15, size - 20, 6, 3);
      ctx.fill();
      break;
    }
    case TILE.EXIT:
      tileBase(ctx, x, y, size, '#070b1a', flags.active ? palette[3] : palette[2]);
      ctx.save();
      ctx.shadowColor = palette[3];
      ctx.shadowBlur = flags.active ? 20 + Math.sin(timestamp * 0.006) * 4 : 4;
      ctx.strokeStyle = flags.active ? palette[3] : '#65708d';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size * 0.58, size * 0.24, Math.PI, 0);
      ctx.lineTo(x + size * 0.74, y + size * 0.82);
      ctx.lineTo(x + size * 0.26, y + size * 0.82);
      ctx.closePath();
      ctx.stroke();
      if (flags.active) {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = palette[3];
        ctx.fill();
      }
      ctx.restore();
      break;
    case TILE.DOOR:
      tileBase(ctx, x, y, size, palette[0], palette[4]);
      for (let index = 0; index < 3; index += 1) {
        ctx.fillStyle = index === 1 ? palette[3] : palette[2];
        roundedPath(ctx, x + 10 + index * 13, y + 7, 9, size - 14, 4);
        ctx.fill();
      }
      ctx.fillStyle = '#ffe56d';
      ctx.beginPath();
      ctx.arc(x + size * 0.72, y + size * 0.54, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case TILE.PLATE:
      tileBase(ctx, x, y, size, palette[1]);
      ctx.fillStyle = flags.on ? palette[3] : '#11182e';
      ctx.shadowColor = flags.on ? palette[3] : 'transparent';
      ctx.shadowBlur = flags.on ? 14 : 0;
      ctx.beginPath();
      ctx.ellipse(x + size / 2, y + size * 0.62, size * 0.29, size * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette[3];
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      break;
    case TILE.GATE:
      tileBase(ctx, x, y, size, palette[0]);
      for (let index = 0; index < 4; index += 1) {
        const height = flags.open ? size * 0.25 : size - 10;
        ctx.fillStyle = flags.open ? 'rgba(255,255,255,.18)' : palette[4];
        roundedPath(ctx, x + 8 + index * 12, flags.open ? y + 5 : y + 5, 7, height, 4);
        ctx.fill();
      }
      break;
    case TILE.ICE:
      tileBase(ctx, x, y, size, '#bdebf5', '#e8ffff');
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 12);
      ctx.lineTo(x + size * 0.55, y + 5);
      ctx.lineTo(x + size * 0.27, y + size * 0.65);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      for (let index = 0; index < 3; index += 1) {
        ctx.beginPath();
        ctx.moveTo(x + 8 + index * 16, y + size - 8);
        ctx.lineTo(x + size - 8, y + 8 + index * 9);
        ctx.stroke();
      }
      break;
    case TILE.SPIKE:
      tileBase(ctx, x, y, size, palette[0]);
      ctx.fillStyle = palette[4];
      ctx.shadowColor = palette[4];
      ctx.shadowBlur = 8;
      for (let index = 0; index < 3; index += 1) {
        ctx.beginPath();
        ctx.moveTo(x + 6 + index * 17, y + size - 8);
        ctx.lineTo(x + 14 + index * 17, y + 12);
        ctx.lineTo(x + 22 + index * 17, y + size - 8);
        ctx.fill();
      }
      ctx.shadowColor = 'transparent';
      break;
    case TILE.CONVEYOR_R:
    case TILE.CONVEYOR_L:
      tileBase(ctx, x, y, size, palette[1]);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 4, y + 4, size - 8, size - 8);
      ctx.clip();
      ctx.fillStyle = palette[3];
      for (let index = -1; index < 4; index += 1) {
        const offset = (timestamp * 0.08 + index * 20) % 64;
        const centerX = tile === TILE.CONVEYOR_R ? x + offset : x + size - offset;
        ctx.beginPath();
        ctx.moveTo(centerX - 8, y + 17);
        ctx.lineTo(centerX + 6, y + size / 2);
        ctx.lineTo(centerX - 8, y + size - 17);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      break;
    case TILE.FRAGILE:
      tileBase(ctx, x, y, size, palette[2]);
      ctx.strokeStyle = palette[4];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 10);
      ctx.lineTo(x + 27, y + 26);
      ctx.lineTo(x + 20, y + 43);
      ctx.moveTo(x + 27, y + 26);
      ctx.lineTo(x + 44, y + 16);
      ctx.moveTo(x + 27, y + 26);
      ctx.lineTo(x + 44, y + 46);
      ctx.stroke();
      break;
    case TILE.PIT:
      tileBase(ctx, x, y, size, '#03050d');
      ctx.fillStyle = 'rgba(0,0,0,.7)';
      ctx.beginPath();
      ctx.ellipse(x + size / 2, y + size / 2, size * 0.34, size * 0.23, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colorWithAlpha(palette[4], 0.35);
      ctx.stroke();
      break;
    case TILE.TELEPORT_A:
    case TILE.TELEPORT_B:
      tileBase(ctx, x, y, size, palette[0]);
      ctx.save();
      ctx.translate(x + size / 2, y + size / 2);
      ctx.rotate(timestamp * 0.001 * (tile === TILE.TELEPORT_A ? 1 : -1));
      ctx.strokeStyle = tile === TILE.TELEPORT_A ? '#67f3ff' : '#ff69c0';
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let angle = 0; angle < Math.PI * 3; angle += 0.15) {
        const radius = angle * 2.3;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (angle === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
      break;
    case TILE.WATER:
      tileBase(ctx, x, y, size, '#12667a', '#7af4ff');
      ctx.strokeStyle = 'rgba(255,255,255,.58)';
      for (let index = 0; index < 3; index += 1) {
        const yy = y + 15 + index * 14;
        ctx.beginPath();
        for (let xx = 0; xx < size; xx += 4) {
          const py = yy + Math.sin(xx * 0.25 + timestamp * 0.004 + index) * 3;
          if (xx === 0) ctx.moveTo(x + xx, py); else ctx.lineTo(x + xx, py);
        }
        ctx.stroke();
      }
      break;
    case TILE.BRIDGE:
      tileBase(ctx, x, y, size, '#754932', '#ffd47a');
      for (let index = 0; index < 4; index += 1) {
        ctx.fillStyle = index % 2 ? '#9c6640' : '#b77a4a';
        roundedPath(ctx, x + 6, y + 7 + index * 12, size - 12, 9, 3);
        ctx.fill();
      }
      ctx.strokeStyle = '#e8bf73';
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 5);
      ctx.lineTo(x + 10, y + size - 5);
      ctx.moveTo(x + size - 10, y + 5);
      ctx.lineTo(x + size - 10, y + size - 5);
      ctx.stroke();
      break;
    default:
      tileBase(ctx, x, y, size, palette[1]);
  }
}

export function drawSpark(ctx, x, y, size, timestamp) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(timestamp * 0.002);
  const pulse = 1 + Math.sin(timestamp * 0.008) * 0.08;
  ctx.scale(pulse, pulse);
  ctx.shadowColor = '#fff07a';
  ctx.shadowBlur = 20;
  const gradient = ctx.createRadialGradient(-size * 0.1, -size * 0.12, 1, 0, 0, size * 0.5);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.42, '#fff3a1');
  gradient.addColorStop(1, '#f6be4b');
  ctx.fillStyle = gradient;
  starPath(ctx, size * 0.48, size * 0.2, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawKey(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.15);
  ctx.strokeStyle = '#ffe16b';
  ctx.lineWidth = size * 0.16;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#ffe16b';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(-size * 0.15, -size * 0.12, size * 0.2, 0, Math.PI * 2);
  ctx.moveTo(0, 0);
  ctx.lineTo(size * 0.35, size * 0.32);
  ctx.moveTo(size * 0.19, size * 0.16);
  ctx.lineTo(size * 0.33, size * 0.02);
  ctx.stroke();
  ctx.restore();
}

export function drawCrate(ctx, x, y, size, world) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = 'rgba(0,0,0,.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 5;
  const gradient = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
  gradient.addColorStop(0, '#e29a61');
  gradient.addColorStop(1, '#6d3d2b');
  roundedPath(ctx, -size * 0.4, -size * 0.4, size * 0.8, size * 0.8, 9);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = world?.color || '#ffe08a';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = '#5a3025';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-size * 0.32, -size * 0.32);
  ctx.lineTo(size * 0.32, size * 0.32);
  ctx.moveTo(size * 0.32, -size * 0.32);
  ctx.lineTo(-size * 0.32, size * 0.32);
  ctx.stroke();
  ctx.fillStyle = '#ffe08a';
  starPath(ctx, size * 0.12, size * 0.05, 6);
  ctx.fill();
  ctx.restore();
}

export function drawPip(ctx, x, y, size, timestamp, direction = 1, state = 'idle', contrast = false) {
  ctx.save();
  ctx.translate(x, y);
  const moving = state === 'move';
  const bob = moving ? Math.sin(timestamp * 0.026) * size * 0.035 : Math.sin(timestamp * 0.004) * size * 0.025;
  ctx.translate(0, bob);
  ctx.scale(direction || 1, 1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#071027';
  ctx.lineWidth = size * 0.065;

  const scarfLift = moving ? Math.sin(timestamp * 0.019) * size * 0.08 : 0;
  ctx.fillStyle = '#ff5f80';
  ctx.beginPath();
  ctx.moveTo(-size * 0.15, -size * 0.02);
  ctx.quadraticCurveTo(-size * 0.62, -size * 0.05 - scarfLift, -size * 0.85, size * 0.2 - scarfLift);
  ctx.lineTo(-size * 0.18, size * 0.27);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const coat = ctx.createLinearGradient(0, -size * 0.1, 0, size * 0.5);
  coat.addColorStop(0, contrast ? '#b8ffff' : '#70f4ff');
  coat.addColorStop(0.55, contrast ? '#4fd9ff' : '#39bde4');
  coat.addColorStop(1, '#267ab7');
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(0, size * 0.16, size * 0.31, size * 0.39, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const footSwing = moving ? Math.sin(timestamp * 0.025) * size * 0.09 : 0;
  ctx.fillStyle = '#303a60';
  ctx.beginPath();
  ctx.ellipse(-size * 0.18 + footSwing, size * 0.53, size * 0.24, size * 0.13, 0, 0, Math.PI * 2);
  ctx.ellipse(size * 0.18 - footSwing, size * 0.53, size * 0.24, size * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fff0cf';
  ctx.beginPath();
  ctx.arc(0, -size * 0.25, size * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#3b4980';
  ctx.beginPath();
  ctx.arc(0, -size * 0.29, size * 0.34, Math.PI, 0);
  ctx.quadraticCurveTo(0, -size * 0.52, -size * 0.34, -size * 0.29);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffe56d';
  ctx.shadowColor = '#ffe56d';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(size * 0.18, -size * 0.58, size * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.stroke();

  ctx.fillStyle = '#11172e';
  ctx.beginPath();
  ctx.ellipse(-size * 0.1, -size * 0.24, size * 0.028, size * 0.05, 0, 0, Math.PI * 2);
  ctx.ellipse(size * 0.1, -size * 0.24, size * 0.028, size * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.beginPath();
  ctx.arc(-size * 0.09, -size * 0.26, size * 0.011, 0, Math.PI * 2);
  ctx.arc(size * 0.11, -size * 0.26, size * 0.011, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c66768';
  ctx.lineWidth = size * 0.032;
  ctx.beginPath();
  ctx.arc(0, -size * 0.16, size * 0.09, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.restore();
}

function enemyEyes(ctx, size, expression = 'round') {
  ctx.fillStyle = '#10162d';
  if (expression === 'visor') {
    roundedPath(ctx, -size * 0.18, -size * 0.1, size * 0.36, size * 0.11, size * 0.05);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.arc(-size * 0.09, -size * 0.05, size * 0.038, 0, Math.PI * 2);
  ctx.arc(size * 0.09, -size * 0.05, size * 0.038, 0, Math.PI * 2);
  ctx.fill();
}

export function drawEnemy(ctx, enemy, x, y, size, timestamp, world) {
  ctx.save();
  ctx.translate(x, y + Math.sin(timestamp * 0.006 + enemy.x) * 2);
  ctx.strokeStyle = '#071028';
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const danger = world.danger;
  const accent = world.color;

  switch (enemy.type) {
    case 'scarab':
      ctx.fillStyle = danger;
      ctx.beginPath();
      ctx.ellipse(0, 3, size * 0.34, size * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.2);
      ctx.lineTo(0, size * 0.23);
      ctx.moveTo(-size * 0.2, -size * 0.15);
      ctx.lineTo(-size * 0.36, -size * 0.32);
      ctx.moveTo(size * 0.2, -size * 0.15);
      ctx.lineTo(size * 0.36, -size * 0.32);
      ctx.moveTo(-size * 0.25, size * 0.05);
      ctx.lineTo(-size * 0.4, size * 0.18);
      ctx.moveTo(size * 0.25, size * 0.05);
      ctx.lineTo(size * 0.4, size * 0.18);
      ctx.stroke();
      enemyEyes(ctx, size);
      break;
    case 'crawler':
      for (let index = -1; index <= 1; index += 1) {
        ctx.fillStyle = index ? danger : accent;
        ctx.beginPath();
        ctx.arc(index * size * 0.22, 0, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      enemyEyes(ctx, size);
      break;
    case 'slime':
      ctx.fillStyle = '#61db8d';
      ctx.beginPath();
      ctx.moveTo(-size * 0.36, size * 0.22);
      ctx.quadraticCurveTo(-size * 0.4, -size * 0.24, 0, -size * 0.32);
      ctx.quadraticCurveTo(size * 0.4, -size * 0.24, size * 0.36, size * 0.22);
      ctx.quadraticCurveTo(size * 0.18, size * 0.08, 0, size * 0.22);
      ctx.quadraticCurveTo(-size * 0.18, size * 0.08, -size * 0.36, size * 0.22);
      ctx.fill();
      ctx.stroke();
      enemyEyes(ctx, size);
      break;
    case 'hopper':
      ctx.fillStyle = '#f2b85e';
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.04, size * 0.25, size * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.18, size * 0.25);
      ctx.lineTo(-size * 0.36, size * 0.42);
      ctx.moveTo(size * 0.18, size * 0.25);
      ctx.lineTo(size * 0.36, size * 0.42);
      ctx.stroke();
      enemyEyes(ctx, size);
      break;
    case 'turret':
      ctx.fillStyle = danger;
      roundedPath(ctx, -size * 0.32, -size * 0.32, size * 0.64, size * 0.64, 9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();
      enemyEyes(ctx, size, 'visor');
      break;
    case 'ghost':
      ctx.globalAlpha = 0.84;
      ctx.fillStyle = '#c6ddff';
      ctx.beginPath();
      ctx.moveTo(-size * 0.35, size * 0.3);
      ctx.lineTo(-size * 0.35, -size * 0.05);
      ctx.arc(0, -size * 0.05, size * 0.35, Math.PI, 0);
      ctx.lineTo(size * 0.35, size * 0.3);
      ctx.lineTo(size * 0.18, size * 0.17);
      ctx.lineTo(0, size * 0.3);
      ctx.lineTo(-size * 0.18, size * 0.17);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      enemyEyes(ctx, size);
      break;
    case 'mimic':
      ctx.fillStyle = '#d86bc7';
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.4);
      ctx.lineTo(size * 0.3, -size * 0.18);
      ctx.lineTo(size * 0.24, size * 0.38);
      ctx.lineTo(-size * 0.24, size * 0.38);
      ctx.lineTo(-size * 0.3, -size * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-size * 0.16, -size * 0.05);
      ctx.lineTo(0, size * 0.08);
      ctx.lineTo(size * 0.16, -size * 0.05);
      ctx.stroke();
      break;
    case 'drone':
      ctx.save();
      ctx.rotate(timestamp * 0.0015);
      ctx.fillStyle = '#6ce0e9';
      ctx.beginPath();
      for (let index = 0; index < 6; index += 1) {
        const angle = index * Math.PI / 3 - Math.PI / 2;
        const px = Math.cos(angle) * size * 0.34;
        const py = Math.sin(angle) * size * 0.34;
        if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = danger;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
      ctx.fill();
      enemyEyes(ctx, size, 'visor');
      break;
    default:
      ctx.fillStyle = danger;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      enemyEyes(ctx, size);
  }
  ctx.restore();
}

export function logo(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  text(ctx, 'PIP & THE', 0, -46, 38, '#fff4d6', 'center', 1000);
  const gradient = ctx.createLinearGradient(-220, 0, 220, 0);
  gradient.addColorStop(0, '#65f3ff');
  gradient.addColorStop(0.52, '#ffe56d');
  gradient.addColorStop(1, '#ff6b9b');
  ctx.save();
  ctx.font = '1000 64px ui-rounded, "Trebuchet MS", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#080d21';
  ctx.lineWidth = 14;
  ctx.lineJoin = 'round';
  ctx.strokeText('PRISM VAULT', 0, 14);
  ctx.fillStyle = gradient;
  ctx.fillText('PRISM VAULT', 0, 14);
  ctx.restore();
  text(ctx, 'A PIP’S POCKET WORLDS ADVENTURE', 0, 70, 17, '#bdeeff', 'center', 900);
  ctx.restore();
}

function comicPanel(ctx, rectangle, rotation, fill, draw) {
  const { x, y, w, h } = rectangle;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rotation);
  ctx.fillStyle = fill;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = '#11162c';
  ctx.lineWidth = 8;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  for (let yy = -h / 2; yy < h / 2; yy += 9) {
    ctx.beginPath();
    ctx.moveTo(-w / 2, yy);
    ctx.lineTo(w / 2, yy);
    ctx.stroke();
  }
  ctx.restore();
  draw(w, h);
  ctx.restore();
}

export function comic(ctx, page, timestamp) {
  ctx.fillStyle = '#fff1cf';
  ctx.fillRect(0, 0, 1280, 720);
  if (page === 0) {
    comicPanel(ctx, { x: 45, y: 45, w: 720, h: 300 }, -0.01, '#172449', (w, h) => {
      text(ctx, 'THE PRISM VAULT HELD THE FIRST LIGHT', 0, -h * 0.28, 25, '#fff1cf', 'center', 1000);
      drawSpark(ctx, 0, 25, 120, timestamp);
    });
    comicPanel(ctx, { x: 790, y: 45, w: 445, h: 300 }, 0.015, '#28376d', (w, h) => {
      text(ctx, 'BARON NULL', 0, -h * 0.31, 30, '#ff748f', 'center', 1000);
      ctx.fillStyle = '#070a17';
      ctx.beginPath();
      ctx.arc(0, 35, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff5e7f';
      ctx.beginPath();
      ctx.arc(-30, 15, 8, 0, Math.PI * 2);
      ctx.arc(30, 15, 8, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, '“LIGHT IS ONLY A LOCK.”', 0, 126, 18, '#fff1cf', 'center', 900);
    });
    comicPanel(ctx, { x: 45, y: 370, w: 1190, h: 300 }, -0.008, '#172449', (w, h) => {
      text(ctx, 'CRACK!', 0, -h * 0.28, 64, '#ffe56d', 'center', 1000);
      for (let index = 0; index < 8; index += 1) drawSpark(ctx, (index - 3.5) * 120, 35 + Math.sin(index) * 35, 55, timestamp + index * 120);
      text(ctx, 'TEN GALLERIES FELL DARK.', 0, 120, 25, '#fff1cf', 'center', 1000);
    });
  } else {
    comicPanel(ctx, { x: 45, y: 45, w: 560, h: 625 }, -0.012, '#172449', (w, h) => {
      drawPip(ctx, 0, 80, 260, timestamp, 1, 'idle');
      text(ctx, 'THE SMALLEST KEEPER', 0, -h * 0.37, 28, '#fff1cf', 'center', 1000);
      text(ctx, 'WITH THE BRIGHTEST THREAD', 0, -h * 0.3, 21, '#bdeeff', 'center', 900);
    });
    comicPanel(ctx, { x: 630, y: 45, w: 605, h: 295 }, 0.012, '#28376d', (w, h) => {
      text(ctx, '“I’LL BRING IT HOME.”', 0, -h * 0.15, 30, '#fff1cf', 'center', 1000);
      ctx.fillStyle = '#ff5f80';
      ctx.beginPath();
      ctx.moveTo(-210, 90);
      ctx.quadraticCurveTo(0, -20, 230, 80);
      ctx.lineTo(40, 130);
      ctx.closePath();
      ctx.fill();
    });
    comicPanel(ctx, { x: 630, y: 365, w: 605, h: 305 }, -0.01, '#172449', (w, h) => {
      logo(ctx, 0, -10, 0.68);
      text(ctx, '100 ROOMS. ONE BRIGHT THREAD.', 0, h * 0.3, 22, '#fff1cf', 'center', 900);
    });
  }
  text(ctx, page === 0 ? 'PAGE 1 / 2  ·  CLICK OR PRESS ENTER' : 'PAGE 2 / 2  ·  BEGIN THE RESCUE', 640, 697, 18, '#11162c', 'center', 1000);
}
