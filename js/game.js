'use strict';
// Spiellogik: Zustand, Karten, Simulation der Invasion.
// Kein DOM-Zugriff – läuft auch headless (siehe tools/simtest.js).

const COLS = 9, ROWS = 5;
const ENTRANCE = { x: 0, y: 2 };
const HEART = { x: 8, y: 2 };
const MAX_WAVES = 10;
const MAX_LEVEL = 3;
const HAND_SIZE = 5;
const MANA_PRICE = 10;
const MANA_BUY_LIMIT = 2;
const REMOVE_PRICE = 25;
const SPAWN_GAP = 4;
const DIRS = [[1, 0], [0, -1], [0, 1], [-1, 0]];

// ---------- Hilfsfunktionen ----------

function randInt(n) { return Math.floor(Math.random() * n); }
function pick(a) { return a[randInt(a.length)]; }
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hasArt(g, id) { return g.artifacts.includes(id); }
function hasTag(id, tag) { const t = CARDS[id].tags; return !!t && t.includes(tag); }

function addLog(g, text, cls = '') {
  g.log.push({ text, cls });
  if (g.log.length > 100) g.log.shift();
}
function fx(g, tile, text, color) {
  g.fx.push({ x: tile.x, y: tile.y, text, color, age: 0, jitter: Math.random() * 20 - 10 });
}

function tileAt(g, x, y) {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS ? g.grid[y][x] : null;
}
function entranceTile(g) { return g.grid[ENTRANCE.y][ENTRANCE.x]; }
function heartTile(g) { return g.grid[HEART.y][HEART.x]; }
function allTiles(g) { return g.grid.flat(); }
function neighbors(g, t) {
  const r = [];
  for (const [dx, dy] of DIRS) {
    const n = tileAt(g, t.x + dx, t.y + dy);
    if (n) r.push(n);
  }
  return r;
}
function isBuilt(t) { return !!t && t.kind !== 'rock'; }
function dist(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function tileName(t) {
  if (t.kind === 'entrance') return 'dem Eingang';
  if (t.kind === 'heart') return 'der Herzkammer';
  return CARDS[t.room].name;
}

// Alle Felder, die vom Startfeld aus über gebaute Felder erreichbar sind.
// Das Herz zählt als erreichbar, wird aber nicht durchquert. `skip` gilt als Fels.
function floodFrom(g, start, skip = null) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const t = queue.shift();
    if (t.kind === 'heart' && t !== start) continue;
    for (const n of neighbors(g, t)) {
      if (!isBuilt(n) || n === skip || seen.has(n)) continue;
      seen.add(n);
      queue.push(n);
    }
  }
  return seen;
}

function bfsPath(g, from, to) {
  const prev = new Map([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const t = queue.shift();
    if (t === to) break;
    if (t.kind === 'heart') continue;
    for (const n of neighbors(g, t)) {
      if (!isBuilt(n) || prev.has(n)) continue;
      prev.set(n, t);
      queue.push(n);
    }
  }
  if (!prev.has(to)) return null;
  const path = [];
  for (let t = to; t; t = prev.get(t)) path.unshift(t);
  return path;
}

// Schatzsucher erkunden jeden erreichbaren Raum (Tiefensuche mit Rückweg)
// und gehen erst danach zum Herz. Sackgassen bedeuten: Fallen doppelt passieren.
function explorePath(g) {
  const start = entranceTile(g), heart = heartTile(g);
  const region = floodFrom(g, start);
  region.delete(heart);
  const dirs = shuffle(DIRS.slice());
  const visited = new Set([start]);
  const stack = [start];
  const walk = [start];
  while (stack.length && visited.size < region.size) {
    const cur = stack[stack.length - 1];
    let next = null;
    for (const [dx, dy] of dirs) {
      const n = tileAt(g, cur.x + dx, cur.y + dy);
      if (n && region.has(n) && !visited.has(n)) { next = n; break; }
    }
    if (next) {
      visited.add(next);
      stack.push(next);
      walk.push(next);
    } else {
      stack.pop();
      if (stack.length) walk.push(stack[stack.length - 1]);
    }
  }
  const tail = bfsPath(g, walk[walk.length - 1], heart);
  if (tail) walk.push(...tail.slice(1));
  return walk;
}

// ---------- Neues Spiel ----------

function newGame() {
  const g = {
    phase: 'build', wave: 1, heartMax: 30, heart: 30, gold: 15, souls: 0,
    mana: 0, manaBought: 0, deck: [], hand: [], discard: [], artifacts: [],
    grid: [], heroes: [], fallen: [], log: [], fx: [], tick: 0, uid: 1,
    plague: 0, endless: false, roster: [], reward: null,
    stats: { kills: 0, escaped: 0, built: 0, cardsPlayed: 0 },
  };
  for (let y = 0; y < ROWS; y++) {
    const row = [];
    for (let x = 0; x < COLS; x++) row.push({ x, y, kind: 'rock', room: null, monster: null, trap: null });
    g.grid.push(row);
  }
  entranceTile(g).kind = 'entrance';
  heartTile(g).kind = 'heart';
  for (let x = ENTRANCE.x + 1; x < HEART.x; x++) {
    const t = g.grid[ENTRANCE.y][x];
    t.kind = 'room';
    t.room = 'gang';
  }
  g.deck = shuffle(STARTING_DECK.map(id => makeCard(g, id)));
  addLog(g, 'Dein Dungeon erwacht. Baue, bevor die Helden kommen.', 'sys');
  startBuild(g);
  return g;
}

function makeCard(g, id) { return { uid: g.uid++, id }; }
function allCards(g) { return [...g.deck, ...g.discard, ...g.hand]; }

// ---------- Bauphase ----------

function baseMana(g) {
  return 3 + Math.floor((g.wave - 1) / 3) + (hasArt(g, 'obsidian') ? 1 : 0);
}

function startBuild(g) {
  g.phase = 'build';
  g.mana = baseMana(g);
  g.manaBought = 0;
  g.roster = waveRoster(g.wave);
  drawCards(g, HAND_SIZE + (hasArt(g, 'fuenfteHand') ? 1 : 0));
  refreshAllMonsters(g, true);
}

function drawCards(g, n) {
  for (let i = 0; i < n; i++) {
    if (!g.deck.length) {
      if (!g.discard.length) return;
      g.deck = shuffle(g.discard);
      g.discard = [];
    }
    g.hand.push(g.deck.pop());
  }
}

function buyMana(g) {
  if (g.phase !== 'build' || g.manaBought >= MANA_BUY_LIMIT || g.gold < MANA_PRICE) return false;
  g.gold -= MANA_PRICE;
  g.mana++;
  g.manaBought++;
  return true;
}

function canCollapse(g, t) {
  return t.kind === 'room' && floodFrom(g, entranceTile(g), t).has(heartTile(g));
}

function needsTarget(card) {
  const d = CARDS[card.id];
  return d.type !== 'spell' || !!d.target;
}

function cardTargets(g, card) {
  const d = CARDS[card.id];
  const res = [];
  const region = d.type === 'room' ? floodFrom(g, entranceTile(g)) : null;
  for (const t of allTiles(g)) {
    switch (d.type) {
      case 'room':
        if (t.kind === 'room' && t.room !== card.id) res.push(t);
        else if (t.kind === 'rock' && neighbors(g, t).some(n => region.has(n) && n.kind !== 'heart')) res.push(t);
        break;
      case 'monster':
        if (t.kind === 'room' && (!t.monster || (t.monster.id === card.id && t.monster.level < MAX_LEVEL))) res.push(t);
        break;
      case 'trap':
        if (t.kind === 'room' && (!t.trap || (t.trap.id === card.id && t.trap.level < MAX_LEVEL))) res.push(t);
        break;
      case 'spell':
        if (d.target === 'monster' && t.monster && t.monster.level < MAX_LEVEL) res.push(t);
        if (d.target === 'room' && canCollapse(g, t)) res.push(t);
        break;
    }
  }
  return res;
}

function canAfford(g, card) { return CARDS[card.id].cost <= g.mana; }

function playCard(g, uid, tile = null) {
  if (g.phase !== 'build') return false;
  const idx = g.hand.findIndex(c => c.uid === uid);
  if (idx < 0) return false;
  const card = g.hand[idx];
  const d = CARDS[card.id];
  if (!canAfford(g, card)) return false;
  if (needsTarget(card) && (!tile || !cardTargets(g, card).includes(tile))) return false;

  g.mana -= d.cost;
  g.hand.splice(idx, 1);
  g.stats.cardsPlayed++;

  switch (d.type) {
    case 'room':
      if (tile.kind === 'rock') { tile.kind = 'room'; g.stats.built++; }
      tile.room = card.id;
      break;
    case 'monster':
      if (tile.monster && tile.monster.id === card.id) tile.monster.level++;
      else tile.monster = makeMonster(g, card.id);
      break;
    case 'trap':
      if (tile.trap && tile.trap.id === card.id) tile.trap.level++;
      else tile.trap = { id: card.id, level: 1 };
      break;
    case 'spell':
      castSpell(g, card.id, tile);
      break;
  }
  g.discard.push(card);
  refreshAllMonsters(g, true);
  return true;
}

function castSpell(g, id, tile) {
  switch (id) {
    case 'dunkleEnergie': drawCards(g, 2); break;
    case 'blutpakt':
      g.mana += 2;
      g.heart = Math.max(1, g.heart - 3);
      break;
    case 'herzblut': g.heart = Math.min(g.heartMax, g.heart + 8); break;
    case 'verstaerkung': tile.monster.level++; break;
    case 'einsturz':
      tile.kind = 'rock';
      tile.room = tile.monster = tile.trap = null;
      break;
    case 'seuchenwolke': g.plague += 5; break;
  }
}

// ---------- Monster ----------

function makeMonster(g, id, level = 1) {
  return { uid: g.uid++, id, level, hp: 1, maxHp: 1, atk: 1, risen: false, summoned: false };
}

function refreshMonster(g, t, heal) {
  const m = t.monster;
  if (!m) return;
  const d = CARDS[m.id];
  const undead = hasTag(m.id, 'untot');
  let hp = d.hp * (1 + 0.5 * (m.level - 1));
  let atk = d.atk + (m.level - 1);
  if (t.room === 'kaserne') hp *= 1.6;
  if (undead && t.room === 'krypta') atk += 1;
  for (const n of neighbors(g, t)) {
    if (n.kind !== 'room') continue;
    if (n.room === 'waffenkammer') atk += 2;
    if (n.room === 'krypta' && undead) atk += 1;
  }
  if (hasArt(g, 'kriegstrommel')) atk += 1;
  if (undead) {
    hp += Math.floor(g.souls / 2);
    if (hasArt(g, 'knochenthron')) atk += 2;
  }
  m.maxHp = Math.round(hp);
  m.atk = atk;
  m.hp = heal ? m.maxHp : Math.min(m.hp, m.maxHp);
}

function refreshAllMonsters(g, heal) {
  for (const t of allTiles(g)) if (t.monster) refreshMonster(g, t, heal);
}

function summonSkeleton(g, t) {
  t.monster = makeMonster(g, 'skelett');
  t.monster.summoned = true;
  refreshMonster(g, t, true);
}

// ---------- Wellen ----------

function waveRoster(wave) {
  if (wave <= WAVES.length) return WAVES[wave - 1].slice();
  const pool = ['krieger', 'magier', 'dieb', 'paladin'];
  const roster = [];
  const n = 4 + Math.floor((wave - MAX_WAVES) / 2);
  for (let i = 0; i < n; i++) roster.push(pick(pool));
  if (wave % 5 === 0) roster.unshift(pick(['champion', 'erzmagierin']));
  return roster;
}

function waveScale(wave) {
  return { hp: 1 + 0.2 * (wave - 1), atk: 1 + 0.1 * (wave - 1) };
}

function makeHero(g, id, spawnTick) {
  const d = HEROES[id];
  const sc = waveScale(g.wave);
  const maxHp = Math.round(d.hp * sc.hp);
  return {
    uid: g.uid++, id, def: d, name: d.name, maxHp, hp: maxHp,
    atk: Math.round(d.atk * sc.atk), armor: d.armor || 0,
    poison: g.plague, burn: 0, curse: false, stun: 0, wait: 0, cleanse: 0,
    state: 'waiting', spawnTick, path: null, step: 0, tile: null, prev: null,
  };
}

function startWave(g) {
  if (g.phase !== 'build') return;
  g.discard.push(...g.hand);
  g.hand = [];
  g.phase = 'wave';
  g.tick = 0;
  g.fallen = [];
  for (const t of allTiles(g)) {
    if (t.kind === 'room' && t.room === 'krypta' && !t.monster) summonSkeleton(g, t);
  }
  refreshAllMonsters(g, true);
  g.heroes = g.roster.map((id, i) => makeHero(g, id, 1 + i * SPAWN_GAP));
  g.plague = 0;
  addLog(g, `Welle ${g.wave}: ${g.heroes.map(h => h.name).join(', ')} betreten den Dungeon!`, 'wave');
}

// ---------- Simulation ----------

function addPoison(g, h, n) {
  if (h.state !== 'in' || n <= 0) return;
  h.poison += n + (hasArt(g, 'giftkessel') ? 1 : 0);
}
function addBurn(g, h, n) {
  if (h.state !== 'in') return;
  h.burn = Math.max(h.burn, n * (hasArt(g, 'ewigeFlamme') ? 2 : 1));
}
function addCurse(g, h) {
  if (h.state !== 'in') return;
  if (h.def.curseImmune) { fx(g, h.tile, 'immun', '#ffe08a'); return; }
  if (!h.curse) fx(g, h.tile, 'verflucht', '#c58cff');
  h.curse = true;
}

const DMG_COLORS = { phys: '#ffffff', trap: '#ffd27a', poison: '#7dff6a', burn: '#ff9a3c' };

function hurtHero(g, h, amount, kind) {
  if (h.state !== 'in') return;
  let a = amount;
  if (kind === 'phys' || kind === 'trap') a = Math.max(1, a - h.armor);
  if (h.curse && hasArt(g, 'fluchkrone')) a = Math.round(a * 1.5);
  h.hp -= a;
  fx(g, h.tile, '-' + a, DMG_COLORS[kind]);
  if (h.hp <= 0) killHero(g, h);
}

function killHero(g, h) {
  h.state = 'dead';
  h.hp = 0;
  const t = h.tile;
  const base = 4 + g.wave + (h.def.boss ? 25 : 0);
  const gold = Math.round(base * (hasArt(g, 'gierigeTruhe') ? 1.5 : 1));
  g.gold += gold;
  g.souls++;
  g.stats.kills++;
  addLog(g, `${h.name} stirbt in ${tileName(t)}. +${gold} Gold`, 'kill');
  fx(g, t, '+' + gold + 'G', '#ffd700');

  for (const n of [t, ...neighbors(g, t)]) {
    if (!n.monster || n.monster.id !== 'nekromant') continue;
    const free = [n, ...neighbors(g, n)].filter(x => x.kind === 'room' && !x.monster);
    if (!free.length) continue;
    const s = pick(free);
    summonSkeleton(g, s);
    fx(g, s, 'erhebt sich', '#b8f0ff');
    addLog(g, 'Der Nekromant erhebt ein Skelett aus dem Leichnam.', 'sys');
  }
  if (hasArt(g, 'blutmond') && t.monster) t.monster.hp = t.monster.maxHp;
}

function triggerTrap(g, h, t) {
  const tr = t.trap;
  const d = CARDS[tr.id];
  if (h.def.ignoresTraps) { fx(g, t, 'umgangen', '#9fd8ff'); return; }
  const mult = 1 + 0.5 * (tr.level - 1);
  const victims = d.aoe
    ? g.heroes.filter(v => v.state === 'in' && v.tile === t && !v.def.ignoresTraps)
    : [h];
  for (const v of victims) {
    if (d.dmg) hurtHero(g, v, Math.round(d.dmg * mult) + (hasArt(g, 'zahnraeder') ? 2 : 0), 'trap');
    if (v.state !== 'in') continue;
    if (d.poison) addPoison(g, v, Math.round(d.poison * mult));
    if (d.burn) addBurn(g, v, Math.round(d.burn * mult));
    if (d.stun) { v.stun = Math.max(v.stun, d.stun + tr.level - 1); fx(g, t, 'gefangen', '#ffffff'); }
    if (d.curse) addCurse(g, v);
  }
}

function enterTile(g, h, t) {
  if (t.kind !== 'room') return;
  const r = CARDS[t.room];
  if (t.room === 'pilzhoehle') addPoison(g, h, 2);
  if (t.room === 'ritualkammer') addCurse(g, h);
  if (t.room === 'lavagrube') addBurn(g, h, 3);
  if (r.linger) h.wait = r.linger;
  if (t.trap && h.state === 'in') triggerTrap(g, h, t);
}

function heroAttack(g, h, t) {
  const m = t.monster;
  const d = CARDS[m.id];
  let dmg = h.atk * (h.curse ? 0.5 : 1) * (h.def.vsMonster || 1);
  if (!h.def.magic && d.armor) dmg -= d.armor;
  dmg = Math.max(1, Math.round(dmg));
  m.hp -= dmg;
  fx(g, t, '-' + dmg, '#ff6b6b');
  if (m.hp <= 0) killMonster(g, t);
}

function killMonster(g, t) {
  const m = t.monster;
  if (m.id === 'skelett' && !m.risen) {
    m.risen = true;
    m.hp = hasArt(g, 'knochenthron') ? m.maxHp : Math.ceil(m.maxHp / 2);
    fx(g, t, 'erhebt sich', '#b8f0ff');
    return;
  }
  t.monster = null;
  addLog(g, `${CARDS[m.id].name} in ${tileName(t)} wurde besiegt.`, 'loss');
  if (!m.summoned) g.fallen.push({ tile: t, monster: m });
}

function monsterAttack(g, t, h) {
  const m = t.monster;
  const d = CARDS[m.id];
  if (h.def.dodge && Math.random() < h.def.dodge) { fx(g, t, 'ausgewichen', '#cccccc'); return; }
  let dmg = m.atk;
  if (t.room === 'ritualkammer' && h.curse) dmg += 3;
  hurtHero(g, h, dmg, 'phys');
  if (h.state !== 'in') return;
  if (d.poison) addPoison(g, h, d.poison + m.level - 1);
  if (d.burn) addBurn(g, h, d.burn);
  if (d.curse) addCurse(g, h);
}

function heroAtHeart(g, h) {
  h.state = 'escaped';
  g.stats.escaped++;
  const dmg = h.def.heart + Math.floor((g.wave - 1) / 3);
  g.heart -= dmg;
  fx(g, heartTile(g), '-' + dmg + '♥', '#ff3b3b');
  addLog(g, `${h.name} erreicht das Herz! −${dmg} LP`, 'danger');
  if (h.def.steal && g.gold > 0) {
    const s = Math.ceil(g.gold * h.def.steal);
    g.gold -= s;
    addLog(g, `${h.name} stiehlt ${s} Gold.`, 'danger');
  }
  if (g.heart <= 0) {
    g.heart = 0;
    g.phase = 'gameover';
    addLog(g, 'Das Herz des Dungeons ist zerbrochen.', 'danger');
  }
}

function simTick(g) {
  if (g.phase !== 'wave') return;
  g.tick++;
  const ent = entranceTile(g);

  for (const h of g.heroes) {
    if (h.state === 'waiting' && g.tick >= h.spawnTick) {
      h.state = 'in';
      h.tile = h.prev = ent;
      h.path = h.def.shortest ? bfsPath(g, ent, heartTile(g)) : explorePath(g);
      h.step = 0;
    }
  }

  // Helden handeln
  for (const h of g.heroes) {
    if (h.state !== 'in') continue;
    h.prev = h.tile;
    if (h.poison > 0) { hurtHero(g, h, h.poison, 'poison'); h.poison--; }
    if (h.state === 'in' && h.burn > 0) { hurtHero(g, h, 2, 'burn'); h.burn--; }
    if (h.state !== 'in') continue;
    if (h.stun > 0) { h.stun--; continue; }

    const t = h.tile;
    if (t.monster) { heroAttack(g, h, t); continue; }
    if (h.wait > 0) {
      h.wait--;
      if (t.room === 'labyrinth' && t.trap) triggerTrap(g, h, t);
      continue;
    }
    const next = h.path[++h.step];
    if (!next) { h.state = 'escaped'; continue; }
    h.tile = next;
    if (next.kind === 'heart') {
      heroAtHeart(g, h);
      if (g.phase !== 'wave') return;
      continue;
    }
    enterTile(g, h, next);
  }

  // Raum- und Monster-Auren
  for (const h of g.heroes) {
    if (h.state !== 'in') continue;
    const t = h.tile;
    if (t.room === 'giftsee') addPoison(g, h, 2);
    if (t.monster && CARDS[t.monster.id].aura) addPoison(g, h, CARDS[t.monster.id].aura + t.monster.level - 1);
  }

  // Monster schlagen zurück
  for (const t of allTiles(g)) {
    if (!t.monster) continue;
    const target = g.heroes.find(h => h.state === 'in' && h.tile === t);
    if (target) monsterAttack(g, t, target);
  }

  // Paladine reinigen
  for (const p of g.heroes) {
    if (p.state !== 'in' || !p.def.cleanse) continue;
    if (++p.cleanse < 3) continue;
    p.cleanse = 0;
    let any = false;
    for (const h of g.heroes) {
      if (h.state !== 'in' || dist(h.tile, p.tile) > 1) continue;
      if (h.poison || h.burn || h.curse || h.hp < h.maxHp) any = true;
      h.poison = h.burn = 0;
      h.curse = false;
      h.hp = Math.min(h.maxHp, h.hp + 2);
    }
    if (any) fx(g, p.tile, 'Reinigung', '#fff3a0');
  }

  if (g.heroes.every(h => h.state === 'dead' || h.state === 'escaped')) endWave(g);
}

function endWave(g) {
  for (const t of allTiles(g)) if (t.monster && t.monster.summoned) t.monster = null;
  for (const { tile, monster } of g.fallen) {
    if (tile.kind === 'room' && !tile.monster) tile.monster = monster;
  }
  g.fallen = [];
  for (const t of allTiles(g)) if (t.monster) t.monster.risen = false;
  refreshAllMonsters(g, true);

  const killed = g.heroes.filter(h => h.state === 'dead').length;
  const escaped = g.heroes.length - killed;
  const treasure = allTiles(g).filter(t => t.kind === 'room' && t.room === 'schatzkammer').length * 5;
  g.gold += treasure;
  g.heart = Math.min(g.heartMax, g.heart + 2);
  addLog(g, `Welle ${g.wave} überstanden: ${killed} besiegt, ${escaped} entkommen.` +
    (treasure ? ` Schatzkammern: +${treasure} Gold.` : ''), 'sys');
  g.lastWave = { killed, escaped };
  g.heroes = [];

  if (g.wave >= MAX_WAVES && !g.endless) { g.phase = 'victory'; return; }
  g.phase = 'reward';
  g.reward = makeReward(g);
}

// ---------- Belohnung & Händler ----------

const CARD_PRICES = { common: 12, rare: 22, legendary: 40 };
const ARTIFACT_PRICE = 45;

function rollCard(g, exclude) {
  const r = Math.random() * 100;
  let rarity = 'common';
  if (g.wave >= 4 && r < 10) rarity = 'legendary';
  else if (g.wave >= 2 && r < 40) rarity = 'rare';
  let pool = Object.keys(CARDS).filter(id => CARDS[id].rarity === rarity && !exclude.includes(id));
  if (!pool.length) pool = Object.keys(CARDS).filter(id => CARDS[id].rarity !== 'basic' && !exclude.includes(id));
  return pick(pool);
}

function makeReward(g) {
  const choices = [];
  while (choices.length < 3) choices.push(rollCard(g, choices));
  const shop = [];
  while (shop.length < 2) {
    const id = rollCard(g, [...choices, ...shop.map(s => s.id)]);
    shop.push({ id, price: CARD_PRICES[CARDS[id].rarity], sold: false });
  }
  const pool = shuffle(Object.keys(ARTIFACTS).filter(a => !g.artifacts.includes(a)));
  const isBoss = g.wave % 5 === 0;
  const artifactChoices = isBoss ? pool.splice(0, 3) : [];
  const shopArtifact = pool.length ? { id: pool[0], price: ARTIFACT_PRICE, sold: false } : null;
  return { choices, picked: false, shop, shopArtifact, artifactChoices, artifactPicked: !artifactChoices.length, removed: false };
}

function takeRewardCard(g, id) {
  const r = g.reward;
  if (!r || r.picked) return false;
  r.picked = true;
  if (id) {
    g.deck.push(makeCard(g, id));
    shuffle(g.deck);
  } else {
    g.gold += 8;
  }
  return true;
}

function takeRewardArtifact(g, id) {
  const r = g.reward;
  if (!r || r.artifactPicked || !r.artifactChoices.includes(id)) return false;
  r.artifactPicked = true;
  addArtifact(g, id);
  return true;
}

function buyShopCard(g, i) {
  const s = g.reward && g.reward.shop[i];
  if (!s || s.sold || g.gold < s.price) return false;
  g.gold -= s.price;
  s.sold = true;
  g.deck.push(makeCard(g, s.id));
  shuffle(g.deck);
  return true;
}

function buyShopArtifact(g) {
  const s = g.reward && g.reward.shopArtifact;
  if (!s || s.sold || g.gold < s.price) return false;
  g.gold -= s.price;
  s.sold = true;
  addArtifact(g, s.id);
  return true;
}

function addArtifact(g, id) {
  if (g.artifacts.includes(id)) return;
  g.artifacts.push(id);
  if (id === 'steinherz') { g.heartMax += 10; g.heart += 10; }
  addLog(g, `Artefakt erhalten: ${ARTIFACTS[id].name}`, 'sys');
}

function removeCard(g, uid) {
  const r = g.reward;
  if (!r || r.removed || g.gold < REMOVE_PRICE) return false;
  for (const pile of [g.deck, g.discard]) {
    const i = pile.findIndex(c => c.uid === uid);
    if (i >= 0) {
      pile.splice(i, 1);
      g.gold -= REMOVE_PRICE;
      r.removed = true;
      return true;
    }
  }
  return false;
}

function nextWave(g) {
  if (g.phase !== 'reward') return;
  g.wave++;
  g.reward = null;
  startBuild(g);
}

function continueEndless(g) {
  if (g.phase !== 'victory') return;
  g.endless = true;
  g.phase = 'reward';
  g.reward = makeReward(g);
}
