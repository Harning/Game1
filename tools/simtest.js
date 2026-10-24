'use strict';
// Headless-Test: spielt viele Runs mit einem einfachen Bot durch.
// Prüft, dass die Simulation nicht abstürzt oder hängen bleibt, und gibt grobe Balance-Werte aus.
//   node tools/simtest.js [runs]

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const src = ['js/data.js', 'js/game.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

const bot = `
function botBuild(g, smart) {
  for (let guard = 0; guard < 50; guard++) {
    const playable = g.hand.filter(c => canAfford(g, c) && (!needsTarget(c) || cardTargets(g, c).length));
    if (!playable.length) {
      if (smart && g.gold >= MANA_PRICE + 20 && buyMana(g)) continue;
      return;
    }
    const card = pick(playable);
    let target = null;
    if (needsTarget(card)) {
      const ts = cardTargets(g, card);
      if (smart) {
        // Smarter Bot: lieber aufwerten oder nahe am Hauptgang bauen
        const d = CARDS[card.id];
        const scored = ts.map(t => {
          let s = Math.random();
          if (d.type === 'room' && t.kind === 'rock') s += 1;
          if (d.type === 'room' && t.room === 'gang') s += 2;
          if (t.y === 2) s += 1;
          if (t.monster && t.monster.id === card.id) s += 3;
          if (t.trap && t.trap.id === card.id) s += 3;
          if (card.id === 'einsturz') s -= 10;
          return { t, s };
        }).sort((a, b) => b.s - a.s);
        if (card.id === 'einsturz') continue;
        target = scored[0].t;
      } else target = pick(ts);
    }
    if (!playCard(g, card.uid, target)) throw new Error('playCard failed for ' + card.id);
  }
}

function botReward(g) {
  const r = g.reward;
  if (!r.artifactPicked) takeRewardArtifact(g, pick(r.artifactChoices));
  takeRewardCard(g, pick(r.choices));
  if (r.shopArtifact) buyShopArtifact(g);
  for (let i = 0; i < r.shop.length; i++) buyShopCard(g, i);
  nextWave(g);
}

function runOnce(smart) {
  const g = newGame();
  let ticks = 0;
  while (g.phase !== 'gameover' && g.phase !== 'victory') {
    if (g.phase === 'build') { botBuild(g, smart); startWave(g); }
    else if (g.phase === 'wave') {
      simTick(g); g.fx.length = 0;
      if (++ticks > 200000) throw new Error('Simulation hängt in Welle ' + g.wave);
    }
    else if (g.phase === 'reward') botReward(g);
  }
  return { wave: g.wave, won: g.phase === 'victory', kills: g.stats.kills, heart: g.heart };
}

function report(label, smart, runs) {
  const res = [];
  for (let i = 0; i < runs; i++) res.push(runOnce(smart));
  const wins = res.filter(r => r.won).length;
  const avgWave = res.reduce((s, r) => s + r.wave, 0) / runs;
  const hist = {};
  for (const r of res) { const k = r.won ? 'Sieg' : 'W' + r.wave; hist[k] = (hist[k] || 0) + 1; }
  console.log(label + ': Siege ' + wins + '/' + runs + ', Ø erreichte Welle ' + avgWave.toFixed(2));
  console.log('  Verteilung:', JSON.stringify(hist));
}
`;

const runs = Number(process.argv[2]) || 300;
const ctx = vm.createContext({ console, Math });
vm.runInContext(src + bot + `
report('Zufalls-Bot', false, ${runs});
report('Gieriger Bot', true, ${runs});
`, ctx);
