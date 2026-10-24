'use strict';
// Zeichnet das Dungeon-Raster, Monster, Fallen, Helden und schwebende Zahlen.

const TILE = 72;
const BLOCK = 8;

function hash(x, y, i) {
  let h = (x * 73856093) ^ (y * 19349663) ^ (i * 83492791);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.max(0, Math.min(255, Math.round(v + amt)));
  const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255);
  return `rgb(${r},${g},${b})`;
}

function drawSprite(ctx, name, x, y, scale) {
  const s = Sprites[name];
  if (s) ctx.drawImage(s, Math.round(x), Math.round(y), 8 * scale, 8 * scale);
}

function drawFloor(ctx, t, base) {
  const px = t.x * TILE, py = t.y * TILE;
  for (let by = 0; by < TILE / BLOCK; by++) {
    for (let bx = 0; bx < TILE / BLOCK; bx++) {
      const v = hash(t.x * 16 + bx, t.y * 16 + by, 1);
      const checker = (bx + by) % 2 ? 4 : -4;
      ctx.fillStyle = shade(base, checker + (v - 0.5) * 14);
      ctx.fillRect(px + bx * BLOCK, py + by * BLOCK, BLOCK, BLOCK);
    }
  }
}

function drawRock(ctx, t) {
  const px = t.x * TILE, py = t.y * TILE;
  for (let by = 0; by < TILE / BLOCK; by++) {
    for (let bx = 0; bx < TILE / BLOCK; bx++) {
      const v = hash(t.x * 16 + bx, t.y * 16 + by, 7);
      ctx.fillStyle = v > 0.93 ? '#3a3142' : shade('#1b1720', (v - 0.5) * 12);
      ctx.fillRect(px + bx * BLOCK, py + by * BLOCK, BLOCK, BLOCK);
    }
  }
}

function drawWalls(ctx, g, t) {
  const px = t.x * TILE, py = t.y * TILE, w = 6;
  ctx.fillStyle = '#120e16';
  for (const [dx, dy] of DIRS) {
    const n = tileAt(g, t.x + dx, t.y + dy);
    if (isBuilt(n)) continue;
    if (dx === 1) ctx.fillRect(px + TILE - w, py, w, TILE);
    if (dx === -1) ctx.fillRect(px, py, w, TILE);
    if (dy === 1) ctx.fillRect(px, py + TILE - w, TILE, w);
    if (dy === -1) ctx.fillRect(px, py, TILE, w);
  }
}

function drawBar(ctx, x, y, w, frac, color) {
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 1, y - 1, w + 2, 5);
  ctx.fillStyle = '#3a0d12';
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.round(w * frac)), 3);
}

function drawLevel(ctx, x, y, level) {
  ctx.fillStyle = '#f2c94c';
  for (let i = 0; i < level; i++) ctx.fillRect(x + i * 6, y, 4, 4);
}

function drawTile(ctx, g, t, now) {
  const px = t.x * TILE, py = t.y * TILE;
  if (t.kind === 'rock') { drawRock(ctx, t); return; }

  if (t.kind === 'entrance') {
    drawFloor(ctx, t, '#2e2a33');
    drawWalls(ctx, g, t);
    drawSprite(ctx, 'tuer', px + 16, py + 16, 5);
    return;
  }
  if (t.kind === 'heart') {
    drawFloor(ctx, t, '#3a1a22');
    drawWalls(ctx, g, t);
    const pulse = 5 + Math.sin(now / 260) * 0.4;
    const size = 8 * pulse;
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(now / 260);
    ctx.fillStyle = '#ff3b3b';
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + TILE / 2, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(Sprites.herz, px + (TILE - size) / 2, py + (TILE - size) / 2, size, size);
    return;
  }

  const room = CARDS[t.room];
  drawFloor(ctx, t, room.floor);
  drawWalls(ctx, g, t);
  ctx.globalAlpha = t.room === 'gang' ? 0.7 : 0.9;
  drawSprite(ctx, t.room, px + 6, py + 6, 2);
  ctx.globalAlpha = 1;

  if (t.trap) {
    drawSprite(ctx, t.trap.id, px + TILE - 26, py + TILE - 26, 2.5);
    if (t.trap.level > 1) drawLevel(ctx, px + TILE - 26, py + TILE - 32, t.trap.level);
  }
  if (t.monster) {
    const m = t.monster;
    const bob = g.phase === 'wave' ? Math.sin(now / 200 + t.x) * 1.5 : 0;
    if (m.summoned) ctx.globalAlpha = 0.75;
    drawSprite(ctx, m.id, px + 20, py + 16 + bob, 4);
    ctx.globalAlpha = 1;
    drawBar(ctx, px + 18, py + 52, 36, m.hp / m.maxHp, '#e04848');
    if (m.level > 1) drawLevel(ctx, px + 20, py + 58, m.level);
  }
}

function heroDrawPos(h, alpha) {
  const from = h.prev || h.tile, to = h.tile;
  const a = Math.min(1, alpha);
  return {
    x: (from.x + (to.x - from.x) * a) * TILE,
    y: (from.y + (to.y - from.y) * a) * TILE,
  };
}

const HERO_OFFSETS = [[0, 0], [-16, -12], [16, -12], [-16, 14], [16, 14], [0, -20]];

function drawHeroes(ctx, g, alpha, now) {
  const perTile = new Map();
  for (const h of g.heroes) {
    if (h.state !== 'in') continue;
    const n = perTile.get(h.tile) || 0;
    perTile.set(h.tile, n + 1);
    const pos = heroDrawPos(h, alpha);
    const [ox, oy] = HERO_OFFSETS[n % HERO_OFFSETS.length];
    const fighting = !!h.tile.monster;
    const x = pos.x + TILE / 2 - 12 + ox + (fighting ? 10 : 0);
    const y = pos.y + TILE / 2 - 12 + oy + (fighting ? 6 : 0) + Math.sin(now / 120 + h.uid) * (fighting ? 1.5 : 0.8);
    const scale = h.def.boss ? 3.5 : 3;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 2, y + 8 * scale - 2, 8 * scale - 4, 3);
    drawSprite(ctx, 'h_' + h.id, x, y, scale);
    drawBar(ctx, x, y - 6, 8 * scale, h.hp / h.maxHp, '#58d058');
    let sx = x;
    const dot = col => { ctx.fillStyle = col; ctx.fillRect(sx, y - 12, 4, 4); sx += 5; };
    if (h.poison) dot('#7dff6a');
    if (h.burn) dot('#ff9a3c');
    if (h.curse) dot('#c58cff');
    if (h.stun) dot('#ffffff');
  }
}

function drawFx(ctx, g, dt) {
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  for (const f of g.fx) {
    f.age += dt;
    const life = f.age / 1000;
    const x = f.x * TILE + TILE / 2 + f.jitter;
    const y = f.y * TILE + 22 - life * 26;
    ctx.globalAlpha = Math.max(0, 1 - life);
    ctx.fillStyle = '#000';
    ctx.fillText(f.text, x + 1, y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, x, y);
  }
  ctx.globalAlpha = 1;
  g.fx = g.fx.filter(f => f.age < 1000);
}

function drawHighlights(ctx, targets, hover, now) {
  const a = 0.35 + 0.2 * Math.sin(now / 180);
  for (const t of targets) {
    ctx.fillStyle = `rgba(120, 220, 255, ${a * 0.45})`;
    ctx.fillRect(t.x * TILE, t.y * TILE, TILE, TILE);
    ctx.strokeStyle = `rgba(160, 235, 255, ${a + 0.3})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(t.x * TILE + 3, t.y * TILE + 3, TILE - 6, TILE - 6);
  }
  if (hover) {
    ctx.strokeStyle = targets.includes(hover) ? '#ffffff' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(hover.x * TILE + 1, hover.y * TILE + 1, TILE - 2, TILE - 2);
  }
}

function renderBoard(ctx, g, view, dt, now) {
  ctx.imageSmoothingEnabled = false;
  for (const t of allTiles(g)) drawTile(ctx, g, t, now);
  drawHighlights(ctx, view.targets, view.hover, now);
  if (g.phase === 'wave' || g.heroes.length) drawHeroes(ctx, g, view.alpha, now);
  drawFx(ctx, g, dt);
}
