'use strict';
// Pixel-Art: 8×8-Sprites als Zeichenketten, zur Laufzeit in Canvas-Bilder umgewandelt.

const PAL = {
  k: '#1a1020', w: '#f4f0e8', g: '#5fbf3f', G: '#2f6f2f', r: '#d83b3b', R: '#7a1f2a',
  b: '#3b6fd8', B: '#23407a', y: '#f2c94c', o: '#e07b39', p: '#a66ad8', P: '#55307a',
  s: '#c8c8d0', S: '#6f6f80', n: '#8b5a2b', N: '#4f331a', f: '#f0c8a0', c: '#6fe0e0',
};

const SPRITE_DATA = {
  // Räume
  gang: ['........', '...yo...', '...oy...', '...nn...', '...nn...', '..SSSS..', '........', '........'],
  pilzhoehle: ['..rrrr..', '.rwrrwr.', 'rrrrrrrr', '...ww...', '...ww...', '..wwww..', '........', '........'],
  waffenkammer: ['s......s', '.s....s.', '..s..s..', '...ss...', '...ss...', '..n..n..', '.n....n.', 'y......y'],
  kaserne: ['..rrrr..', '..ryyr..', '..rrrr..', '..ryyr..', '..rrrr..', '..r..r..', '..n.....', '..n.....'],
  schatzkammer: ['........', '...y....', '..yoy...', '.yyyyy..', 'yoyyoyy.', 'yyyyyyyy', '........', '........'],
  labyrinth: ['SSSSSSSS', 'S......S', 'S.SSSS.S', 'S.S..S.S', 'S.S.SS.S', 'S.S....S', 'S.SSSSSS', 'S.......'],
  giftsee: ['........', '..gggg..', '.gGggGg.', 'gggwgggg', 'gGgggggG', '.gggGgg.', '..gggg..', '........'],
  krypta: ['..SSSS..', '.SssssS.', '.SsSSsS.', '.SssSsS.', '.SssSsS.', '.SssssS.', 'NNNNNNNN', '........'],
  ritualkammer: ['..pppp..', '.p....p.', 'p..pp..p', 'p.pPPp.p', 'p.pPPp.p', 'p..pp..p', '.p....p.', '..pppp..'],
  lavagrube: ['........', '.oo..r..', 'oyyo.ro.', '.oyyoo..', '..oyyo..', '.r.ooyo.', 'ro...oo.', '........'],

  // Monster
  goblin: ['g......g', 'gg.gg.gg', '.gggggg.', '.gykgyk.', '.gggggg.', '..grrg..', '.nnnnnn.', '.g....g.'],
  skelett: ['..wwww..', '.wkwwkw.', '.wwwwww.', '..wkkw..', '...ww...', '.wwwwww.', '..w..w..', '.ww..ww.'],
  spinne: ['k..kk..k', '.k.kk.k.', '..kkkk..', 'kkkrrkkk', '..kPPk..', '.k.kk.k.', 'k......k', '........'],
  feuerwichtel: ['o......o', '.oo..oo.', '.oyooyo.', '.oooooo.', '..oRRo..', '..oooo..', '..o..o..', '........'],
  pilzling: ['..pppp..', '.pwppwp.', 'pppppppp', '..ffff..', '..kffk..', '..ffff..', '.f.ff.f.', '..f..f..'],
  ork: ['.GGGGGG.', 'GGkGGkGG', 'GGGGGGGG', 'GwGGGGwG', '.GGGGGG.', 'NnnnnnnN', '.nn..nn.', '.GG..GG.'],
  nekromant: ['...PP...', '..PPPP..', '.PPkkPP.', '.PcPPcP.', '.PPPPPP.', 'PPPPPPPP', '.PP..PP.', 'PP....PP'],
  gargoyle: ['S.SSSS.S', 'SSSSSSSS', '.SrSSrS.', '.SSSSSS.', 'SS.SS.SS', 'S.SSSS.S', '..S..S..', '.SS..SS.'],
  lich: ['.y.yy.y.', '.yyyyyy.', '.wkwwkw.', '.wwwwww.', '..wkkw..', '.PPPPPP.', 'PPPPPPPP', '.PP..PP.'],
  oger: ['.oooooo.', 'ookooko.', 'oooooooo', 'owwoowwo', '.oooooo.', 'NNNNNNNN', 'oo....oo', 'oo....oo'],
  drache: ['r.....r.', 'rr...rr.', '.rrrrr..', '.rykrrr.', 'rrrrrrrr', '.rRRRrr.', '..r..r.o', '.rr..rro'],

  // Fallen
  stacheln: ['........', '........', '..s...s.', '.sSs.sSs', 'sSSSsSSS', 'SSSSSSSS', '........', '........'],
  giftpfeile: ['........', '.....s..', '......s.', 'gnnnnnns', '......s.', '.....s..', '........', '........'],
  netz: ['w..w..w.', '.w.w.w..', '..www...', 'wwwwwww.', '..www...', '.w.w.w..', 'w..w..w.', '........'],
  fluchsiegel: ['........', '..pppp..', '.p.ww.p.', 'p.wPPw.p', 'p.wPPw.p', '.p.ww.p.', '..pppp..', '........'],
  fallgrube: ['........', '.NNNNNN.', 'NkkkkkkN', 'NkkkkkkN', 'NkkkkkkN', '.NNNNNN.', '........', '........'],
  feuerrune: ['..oooo..', '.o.yy.o.', 'o.y..y.o', 'oy.oo.yo', 'oy.oo.yo', 'o.y..y.o', '.o.yy.o.', '..oooo..'],

  // Zauber
  dunkleEnergie: ['..PPPP..', '.PppppP.', 'PppwpppP', 'PpwppppP', 'PppppppP', 'PpppppPP', '.PppppP.', '..PPPP..'],
  blutpakt: ['...r....', '...r....', '..rrr...', '.rrrrr..', '.rrwrr..', '.rrrrr..', '..rrr...', '........'],
  herzblut: ['........', '.rr.rr..', 'rwrrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...', '...r....', '........'],
  verstaerkung: ['...g....', '..ggg...', '.ggggg..', 'ggGgGgg.', '..ggg...', '..ggg...', '..ggg...', '........'],
  einsturz: ['.SS..S..', 'SSs.SSs.', '.S...S..', '...SS...', '..SSsS..', '........', 'NNNNNNNN', 'NnNNnNNN'],
  seuchenwolke: ['........', '..gg....', '.gGgg.g.', 'gggGgggg', 'gGgggGgg', '.gggggg.', '..G.G.G.', '.G.G.G..'],

  // Helden
  h_krieger: ['..ssss..', '.ssssss.', '.sfkfks.', '..ffff..', '.srrrrs.', 's.rrrr.s', '..BBBB..', '..B..B..'],
  h_magier: ['...bb...', '..bbbb..', '.bbbbbb.', '..fkfk..', '..ffff..', '.bbbbbb.', 'ybbbbbb.', '..b..b..'],
  h_dieb: ['..GGGG..', '.GGGGGG.', '.GkffkG.', '..ffff..', '.NGGGGN.', 's.GGGG..', '..N..N..', '.NN..NN.'],
  h_paladin: ['..yyyy..', '.yssssy.', '.sfkfks.', '..ffff..', '.ywwwwy.', 'y.wrrw.y', '..wwww..', '..s..s..'],
  h_champion: ['.y.y.y..', '.yyyyy..', 'ssssss..', 'sfkfks.s', '.ffff..s', 'RrrrrR.s', 'RrrrrRyy', '.B..B...'],
  h_erzmagierin: ['...PP...', '..PyPP..', '.PPPPPP.', 'PPPPPPPP', '..fkfk..', '.pffffp.', 'cppppppc', '.pp..pp.'],

  // Sonstiges
  herz: ['.rr..rr.', 'rwwrrrrr', 'rwrrrrrr', 'rrrrrrRr', '.rrrrRr.', '..rrRr..', '...rr...', '........'],
  tuer: ['.NNNNNN.', 'NnnnnnnN', 'NnNnnNnN', 'NnNnnNnN', 'NnnnnnyN', 'NnNnnNnN', 'NnNnnNnN', 'NnnnnnnN'],
  artefakt: ['...ww...', '..wxxw..', '.wxxxxw.', 'wxxwxxxw', '.wxxxxw.', '..wxxw..', '...ww...', '........'],
};

const Sprites = {};
const spriteUrlCache = {};

function buildSprite(rows, override = {}) {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 8;
  const ctx = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < 8; x++) {
      const ch = row[x] || '.';
      const col = override[ch] || PAL[ch];
      if (ch === '.' || !col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return c;
}

function buildSprites() {
  for (const [name, rows] of Object.entries(SPRITE_DATA)) Sprites[name] = buildSprite(rows);
  for (const [id, a] of Object.entries(ARTIFACTS)) {
    Sprites['art_' + id] = buildSprite(SPRITE_DATA.artefakt, { x: PAL[a.color] });
  }
}

function spriteFor(kind, id) {
  if (kind === 'hero') return Sprites['h_' + id];
  if (kind === 'artifact') return Sprites['art_' + id];
  return Sprites[id];
}

// Hochskaliertes Bild als Data-URL für HTML-Elemente (Karten, Listen).
function spriteURL(name, scale = 6) {
  const key = name + '@' + scale;
  if (spriteUrlCache[key]) return spriteUrlCache[key];
  const src = Sprites[name];
  if (!src) return '';
  const c = document.createElement('canvas');
  c.width = c.height = 8 * scale;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return (spriteUrlCache[key] = c.toDataURL());
}
