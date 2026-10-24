'use strict';
// Spieldaten: Karten, Helden, Artefakte, Wellen.
// Reine Daten – keine Logik, kein DOM.

const CARDS = {
  // ---------- Räume ----------
  gang: {
    name: 'Gang', type: 'room', cost: 0, rarity: 'basic', floor: '#3a3340',
    desc: 'Erweitert den Dungeon um ein leeres Feld.',
  },
  pilzhoehle: {
    name: 'Pilzhöhle', type: 'room', cost: 1, rarity: 'common', tags: ['gift'], floor: '#343d2a',
    desc: 'Helden erhalten beim Betreten 2 Gift.',
  },
  waffenkammer: {
    name: 'Waffenkammer', type: 'room', cost: 1, rarity: 'common', floor: '#473a31',
    desc: 'Monster in angrenzenden Räumen erhalten +2 ANG.',
  },
  kaserne: {
    name: 'Kaserne', type: 'room', cost: 1, rarity: 'common', floor: '#40352d',
    desc: 'Das Monster in diesem Raum hat +60% LP.',
  },
  schatzkammer: {
    name: 'Schatzkammer', type: 'room', cost: 1, rarity: 'common', floor: '#4a4122', linger: 2,
    desc: '+5 Gold nach jeder Welle. Gierige Helden verweilen hier 2 Runden.',
  },
  labyrinth: {
    name: 'Labyrinth', type: 'room', cost: 1, rarity: 'common', floor: '#333338', linger: 2,
    desc: 'Helden irren 2 Runden umher. Die Falle hier löst dabei jede Runde erneut aus.',
  },
  giftsee: {
    name: 'Giftsee', type: 'room', cost: 2, rarity: 'rare', tags: ['gift'], floor: '#24402a', linger: 1,
    desc: 'Helden hier erhalten jede Runde 2 Gift und waten 1 Runde länger hindurch.',
  },
  krypta: {
    name: 'Krypta', type: 'room', cost: 2, rarity: 'rare', tags: ['untot'], floor: '#373846',
    desc: 'Zu Wellenbeginn erhebt sich hier ein Skelett. Untote hier und nebenan +1 ANG.',
  },
  ritualkammer: {
    name: 'Ritualkammer', type: 'room', cost: 2, rarity: 'rare', tags: ['fluch'], floor: '#382a47',
    desc: 'Helden werden beim Betreten verflucht. Das Monster hier hat +3 ANG gegen Verfluchte.',
  },
  lavagrube: {
    name: 'Lavagrube', type: 'room', cost: 2, rarity: 'rare', tags: ['feuer'], floor: '#4a2a20',
    desc: 'Helden erhalten beim Betreten 3 Brand.',
  },

  // ---------- Monster ----------
  goblin: {
    name: 'Goblin', type: 'monster', cost: 1, rarity: 'basic', hp: 7, atk: 2,
    desc: 'Billig, gierig, zahlreich.',
  },
  skelett: {
    name: 'Skelett', type: 'monster', cost: 1, rarity: 'common', tags: ['untot'], hp: 6, atk: 2,
    desc: 'Untot. Erhebt sich einmal pro Welle mit halben LP wieder.',
  },
  spinne: {
    name: 'Spinne', type: 'monster', cost: 1, rarity: 'common', tags: ['gift'], hp: 5, atk: 1, poison: 2,
    desc: 'Angriffe verursachen 2 Gift.',
  },
  feuerwichtel: {
    name: 'Feuerwichtel', type: 'monster', cost: 1, rarity: 'common', tags: ['feuer'], hp: 5, atk: 1, burn: 2,
    desc: 'Angriffe verursachen 2 Brand.',
  },
  pilzling: {
    name: 'Pilzling', type: 'monster', cost: 2, rarity: 'rare', tags: ['gift'], hp: 10, atk: 1, aura: 1,
    desc: 'Alle Helden in diesem Raum erhalten jede Runde 1 Gift.',
  },
  ork: {
    name: 'Ork', type: 'monster', cost: 2, rarity: 'rare', hp: 16, atk: 3,
    desc: 'Ein solider Türsteher.',
  },
  nekromant: {
    name: 'Nekromant', type: 'monster', cost: 2, rarity: 'rare', tags: ['untot'], hp: 7, atk: 1,
    desc: 'Stirbt ein Held hier oder nebenan, erhebt sich bis Wellenende ein Skelett.',
  },
  gargoyle: {
    name: 'Gargoyle', type: 'monster', cost: 2, rarity: 'rare', hp: 12, atk: 2, armor: 2,
    desc: 'Rüstung 2 gegen physische Angriffe. Magie durchdringt sie.',
  },
  lich: {
    name: 'Lich', type: 'monster', cost: 3, rarity: 'legendary', tags: ['untot', 'fluch'], hp: 14, atk: 3, curse: true,
    desc: 'Untot. Angriffe verfluchen.',
  },
  oger: {
    name: 'Oger', type: 'monster', cost: 3, rarity: 'legendary', hp: 32, atk: 5,
    desc: 'Groß. Hungrig. Unaufhaltsam.',
  },
  drache: {
    name: 'Drache', type: 'monster', cost: 4, rarity: 'legendary', tags: ['feuer'], hp: 50, atk: 6, burn: 3,
    desc: 'Angriffe verursachen 3 Brand.',
  },

  // ---------- Fallen ----------
  stacheln: {
    name: 'Stachelfalle', type: 'trap', cost: 1, rarity: 'basic', dmg: 4,
    desc: '4 Schaden beim Betreten.',
  },
  giftpfeile: {
    name: 'Giftpfeile', type: 'trap', cost: 1, rarity: 'common', tags: ['gift'], poison: 3,
    desc: '3 Gift beim Betreten.',
  },
  netz: {
    name: 'Spinnennetz', type: 'trap', cost: 1, rarity: 'common', stun: 2,
    desc: 'Betäubt den Helden 2 Runden.',
  },
  fluchsiegel: {
    name: 'Fluchsiegel', type: 'trap', cost: 1, rarity: 'common', tags: ['fluch'], curse: true,
    desc: 'Verflucht: Der Held verursacht nur halben Schaden.',
  },
  fallgrube: {
    name: 'Fallgrube', type: 'trap', cost: 2, rarity: 'rare', dmg: 9,
    desc: '9 Schaden beim Betreten.',
  },
  feuerrune: {
    name: 'Feuerrune', type: 'trap', cost: 2, rarity: 'rare', tags: ['feuer'], dmg: 3, burn: 3, aoe: true,
    desc: '3 Schaden und 3 Brand für alle Helden im Raum.',
  },

  // ---------- Zauber ----------
  dunkleEnergie: {
    name: 'Dunkle Energie', type: 'spell', cost: 1, rarity: 'common',
    desc: 'Ziehe 2 Karten.',
  },
  blutpakt: {
    name: 'Blutpakt', type: 'spell', cost: 0, rarity: 'common',
    desc: '+2 Mana. Das Herz verliert 3 LP.',
  },
  herzblut: {
    name: 'Herzblut', type: 'spell', cost: 1, rarity: 'common',
    desc: 'Das Herz heilt 8 LP.',
  },
  verstaerkung: {
    name: 'Verstärkung', type: 'spell', cost: 1, rarity: 'common', target: 'monster',
    desc: 'Ein Monster steigt um 1 Stufe auf.',
  },
  einsturz: {
    name: 'Einsturz', type: 'spell', cost: 1, rarity: 'common', target: 'room',
    desc: 'Ein Raum stürzt ein und wird zu Fels. Der Weg zum Herz muss frei bleiben.',
  },
  seuchenwolke: {
    name: 'Seuchenwolke', type: 'spell', cost: 1, rarity: 'rare', tags: ['gift'],
    desc: 'Helden der nächsten Welle beginnen mit 5 Gift.',
  },
};

const TYPE_NAMES = { room: 'Raum', monster: 'Monster', trap: 'Falle', spell: 'Zauber' };
const RARITY_NAMES = { basic: 'Basis', common: 'Gewöhnlich', rare: 'Selten', legendary: 'Legendär' };
const TAG_NAMES = { gift: 'Gift', untot: 'Untot', fluch: 'Fluch', feuer: 'Feuer' };

const STARTING_DECK = [
  'gang', 'gang', 'gang',
  'goblin', 'goblin', 'skelett',
  'stacheln', 'stacheln', 'giftpfeile',
  'pilzhoehle',
];

const HEROES = {
  krieger: {
    name: 'Krieger', hp: 22, atk: 3, armor: 1, heart: 4, vsMonster: 1.5,
    desc: 'Zerstört Monster: +50% Schaden gegen Monster. Rüstung 1.',
  },
  magier: {
    name: 'Magier', hp: 13, atk: 4, heart: 3, magic: true, ignoresTraps: true,
    desc: 'Umgeht Fallen. Magie ignoriert Rüstung.',
  },
  dieb: {
    name: 'Dieb', hp: 11, atk: 2, heart: 2, dodge: 0.3, shortest: true, steal: 0.3,
    desc: 'Nimmt den kürzesten Weg, weicht 30% der Angriffe aus und stiehlt 30% deines Goldes.',
  },
  paladin: {
    name: 'Paladin', hp: 20, atk: 2, armor: 1, heart: 4, cleanse: true, curseImmune: true,
    desc: 'Reinigt alle 3 Runden Gift, Brand und Flüche bei Helden in der Nähe und heilt sie.',
  },
  champion: {
    name: 'Sir Aldric', hp: 55, atk: 5, armor: 2, heart: 10, vsMonster: 1.5, boss: true,
    desc: 'BOSS. Ein legendärer Krieger. +50% Schaden gegen Monster. Rüstung 2.',
  },
  erzmagierin: {
    name: 'Erzmagierin Velka', hp: 60, atk: 6, heart: 12, magic: true, ignoresTraps: true, boss: true,
    desc: 'BOSS. Umgeht Fallen, Magie ignoriert Rüstung.',
  },
};

// Feste Kampagne von 10 Wellen; danach wird endlos zufällig generiert.
const WAVES = [
  ['krieger'],
  ['krieger', 'dieb'],
  ['krieger', 'magier'],
  ['krieger', 'dieb', 'magier'],
  ['champion', 'paladin'],
  ['krieger', 'magier', 'paladin'],
  ['krieger', 'krieger', 'dieb', 'magier'],
  ['paladin', 'magier', 'magier', 'dieb'],
  ['krieger', 'krieger', 'paladin', 'magier', 'dieb'],
  ['erzmagierin', 'paladin', 'krieger', 'krieger'],
];

const ARTIFACTS = {
  giftkessel:    { name: 'Giftkessel',          color: 'g', desc: 'Jede Gift-Anwendung +1.' },
  knochenthron:  { name: 'Knochenthron',        color: 'w', desc: 'Untote +2 ANG. Skelette erheben sich mit vollen LP.' },
  blutmond:      { name: 'Blutmond',            color: 'r', desc: 'Stirbt ein Held bei einem Monster, heilt es vollständig.' },
  steinherz:     { name: 'Steinherz',           color: 'S', desc: 'Das Herz erhält +10 max. LP.' },
  gierigeTruhe:  { name: 'Gierige Truhe',       color: 'y', desc: '+50% Gold durch besiegte Helden.' },
  fluchkrone:    { name: 'Fluchkrone',          color: 'p', desc: 'Verfluchte Helden erleiden +50% Schaden.' },
  ewigeFlamme:   { name: 'Ewige Flamme',        color: 'o', desc: 'Brand hält doppelt so lange.' },
  kriegstrommel: { name: 'Kriegstrommel',       color: 'n', desc: 'Alle Monster +1 ANG.' },
  zahnraeder:    { name: 'Höllische Zahnräder', color: 's', desc: 'Fallen verursachen +2 Schaden.' },
  fuenfteHand:   { name: 'Fünfte Hand',         color: 'f', desc: 'Ziehe jede Bauphase 1 Karte mehr.' },
  obsidian:      { name: 'Obsidian-Obelisk',    color: 'P', desc: '+1 Mana in jeder Bauphase.' },
};
