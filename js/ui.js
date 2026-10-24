'use strict';
// DOM-Oberfläche: HUD, Kartenhand, Seitenleiste und Dialoge.

const $ = id => document.getElementById(id);

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function cardSubline(id) {
  const d = CARDS[id];
  if (d.type === 'monster') return `${d.hp} LP · ${d.atk} ANG`;
  return TYPE_NAMES[d.type];
}

function cardHTML(id, { uid = null, classes = '', footer = '' } = {}) {
  const d = CARDS[id];
  const tags = (d.tags || []).map(t => `<span class="tag tag-${t}">${TAG_NAMES[t]}</span>`).join('');
  return `
    <div class="card type-${d.type} rarity-${d.rarity} ${classes}" ${uid !== null ? `data-uid="${uid}"` : ''} data-id="${id}">
      <div class="cost">${d.cost}</div>
      <div class="art"><img src="${spriteURL(id, 6)}" alt=""></div>
      <div class="name">${esc(d.name)}</div>
      <div class="sub">${cardSubline(id)}</div>
      <div class="desc">${esc(d.desc)}</div>
      <div class="tags">${tags}</div>
      ${footer}
    </div>`;
}

function heroChip(id) {
  const d = HEROES[id];
  return `<div class="hero-chip ${d.boss ? 'boss' : ''}" title="${esc(d.name + ': ' + d.desc)}">
    <img src="${spriteURL('h_' + id, 4)}" alt=""><span>${esc(d.name)}</span></div>`;
}

const UI = {
  renderHUD(g) {
    $('st-wave').innerHTML = `Welle <b>${g.wave}</b>${g.endless ? '' : '/' + MAX_WAVES}`;
    $('st-heart').innerHTML = `♥ <b>${g.heart}</b>/${g.heartMax}`;
    $('st-gold').innerHTML = `● <b>${g.gold}</b> Gold`;
    $('st-souls').innerHTML = `✦ <b>${g.souls}</b> Seelen`;
    $('st-mana').innerHTML = `◆ <b>${g.mana}</b> Mana`;
    $('st-deck').innerHTML = `Deck ${g.deck.length} · Ablage ${g.discard.length}`;
    $('st-heart').classList.toggle('low', g.heart <= g.heartMax * 0.3);

    const build = g.phase === 'build';
    const btnMana = $('btn-mana');
    btnMana.textContent = `+1 Mana (${MANA_PRICE} Gold)`;
    btnMana.disabled = !build || g.gold < MANA_PRICE || g.manaBought >= MANA_BUY_LIMIT;
    $('btn-start').disabled = !build;
    $('btn-start').textContent = build ? 'Tür öffnen ▶' : g.phase === 'wave' ? 'Invasion läuft…' : '—';
  },

  renderHand(g, view) {
    const hand = $('hand');
    if (g.phase !== 'build') {
      hand.innerHTML = `<div class="hand-empty">${g.phase === 'wave'
        ? 'Die Helden sind im Dungeon. Sieh zu, wie sie scheitern.'
        : ''}</div>`;
      return;
    }
    if (!g.hand.length) {
      hand.innerHTML = '<div class="hand-empty">Keine Karten mehr. Öffne die Tür.</div>';
      return;
    }
    hand.innerHTML = g.hand.map(c => {
      const playable = canAfford(g, c) && (!needsTarget(c) || cardTargets(g, c).length > 0);
      const cls = [playable ? '' : 'disabled', view.selected === c.uid ? 'selected' : ''].join(' ');
      return cardHTML(c.id, { uid: c.uid, classes: cls });
    }).join('');
  },

  renderSide(g, view) {
    // Nächste Welle
    const roster = g.phase === 'wave' ? g.heroes.map(h => h.id) : g.roster;
    $('wave-title').textContent = g.phase === 'wave' ? `Welle ${g.wave} – Invasion` : `Welle ${g.wave} – Vorschau`;
    $('wave-preview').innerHTML = (roster || []).map(heroChip).join('') +
      (g.plague ? `<div class="note gift">Seuchenwolke: Helden starten mit ${g.plague} Gift</div>` : '');

    // Info zum Feld unter der Maus
    $('info-body').innerHTML = view.hover ? UI.tileInfo(g, view.hover) :
      '<p class="muted">Fahre über ein Feld für Details. Wähle eine Karte und klicke auf ein leuchtendes Feld, um sie zu spielen. Rechtsklick bricht ab.</p>';

    // Artefakte
    $('artifact-list').innerHTML = g.artifacts.length
      ? g.artifacts.map(a => `<div class="artifact" title="${esc(ARTIFACTS[a].desc)}">
          <img src="${spriteURL('art_' + a, 3)}" alt=""><span>${esc(ARTIFACTS[a].name)}</span></div>`).join('')
      : '<p class="muted">Noch keine. Bosse und der Händler bieten welche an.</p>';

    // Chronik
    const log = $('log');
    log.innerHTML = g.log.slice(-40).map(l => `<div class="log-${l.cls}">${esc(l.text)}</div>`).join('');
    log.scrollTop = log.scrollHeight;
  },

  tileInfo(g, t) {
    if (t.kind === 'rock') return '<b>Fels</b><p class="muted">Massiver Stein. Spiele einen Raum daneben, um den Dungeon zu erweitern.</p>';
    if (t.kind === 'entrance') return '<b>Eingang</b><p class="muted">Hier betreten die Helden dein Reich.</p>';
    if (t.kind === 'heart') return `<b>Herz des Dungeons</b><p>${g.heart}/${g.heartMax} LP</p><p class="muted">Erreicht ein Held das Herz, verliert es LP. Bei 0 ist der Run vorbei.</p>`;
    let html = `<b>${esc(CARDS[t.room].name)}</b><p class="muted">${esc(CARDS[t.room].desc)}</p>`;
    if (t.monster) {
      const m = t.monster, d = CARDS[m.id];
      html += `<div class="info-row"><img src="${spriteURL(m.id, 3)}" alt="">
        <div><b>${esc(d.name)}</b> ${'★'.repeat(m.level)}${m.summoned ? ' <i>(beschworen)</i>' : ''}<br>
        ${m.hp}/${m.maxHp} LP · ${m.atk} ANG<br><span class="muted">${esc(d.desc)}</span></div></div>`;
    }
    if (t.trap) {
      const d = CARDS[t.trap.id];
      html += `<div class="info-row"><img src="${spriteURL(t.trap.id, 3)}" alt="">
        <div><b>${esc(d.name)}</b> ${'★'.repeat(t.trap.level)}<br><span class="muted">${esc(d.desc)}</span></div></div>`;
    }
    for (const h of g.heroes.filter(h => h.state === 'in' && h.tile === t)) {
      const st = [h.poison && `Gift ${h.poison}`, h.burn && `Brand ${h.burn}`, h.curse && 'verflucht', h.stun && 'betäubt']
        .filter(Boolean).join(', ');
      html += `<div class="info-row"><img src="${spriteURL('h_' + h.id, 3)}" alt="">
        <div><b>${esc(h.name)}</b><br>${h.hp}/${h.maxHp} LP · ${h.atk} ANG${st ? '<br>' + st : ''}</div></div>`;
    }
    return html;
  },

  showModal(html, wide = false) {
    $('modal').innerHTML = html;
    $('modal').classList.toggle('wide', wide);
    $('overlay').classList.remove('hidden');
  },

  hideModal() { $('overlay').classList.add('hidden'); },

  renderTitle(best) {
    UI.showModal(`
      <div class="title-screen">
        <img class="title-heart" src="${spriteURL('herz', 10)}" alt="">
        <h1>DUNGEON ARCHITECT</h1>
        <p class="tagline">Erschaffe den ultimativen Dungeon. Lass Helden darin scheitern.</p>
        <div class="howto">
          <p><b>1. Planen:</b> Spiele Karten: <span class="c-room">Räume</span> erweitern den Dungeon,
            <span class="c-monster">Monster</span> und <span class="c-trap">Fallen</span> kommen in Räume,
            <span class="c-spell">Zauber</span> wirken sofort. Dieselbe Karte auf dasselbe Monster bzw. dieselbe Falle wertet sie auf (★).</p>
          <p><b>2. Beobachten:</b> Öffne die Tür. Helden erkunden <i>jeden</i> Raum, bevor sie das Herz angreifen. Diebe nehmen den kürzesten Weg.</p>
          <p><b>3. Verbessern:</b> Nach jeder Welle: neue Karten, ein Händler, Artefakte von Bossen.</p>
          <p><b>4. Überleben:</b> Halte 10 Wellen stand. Kombiniere Gift, Untote, Flüche und Feuer zu tödlichen Synergien.</p>
        </div>
        ${best ? `<p class="muted">Bester Run: Welle ${best.wave}${best.won ? ' (Sieg)' : ''} · ${best.kills} Helden besiegt</p>` : ''}
        <button class="primary big" data-action="new-run">Neuer Run</button>
      </div>`, true);
  },

  renderReward(g) {
    const r = g.reward;
    let html = `<h2>Welle ${g.wave} überstanden</h2>
      <p class="muted">${g.lastWave.killed} Helden besiegt, ${g.lastWave.escaped} entkommen. Das Herz regeneriert 2 LP.</p>`;

    if (!r.artifactPicked) {
      html += `<h3>Beute des Bosses – wähle ein Artefakt</h3><div class="artifact-choices">` +
        r.artifactChoices.map(a => `
          <div class="artifact-card" data-action="take-artifact" data-id="${a}">
            <img src="${spriteURL('art_' + a, 6)}" alt=""><b>${esc(ARTIFACTS[a].name)}</b>
            <span>${esc(ARTIFACTS[a].desc)}</span></div>`).join('') + '</div>';
      UI.showModal(html, true);
      return;
    }

    html += `<h3>${r.picked ? 'Karte gewählt' : 'Wähle eine neue Karte'}</h3>`;
    if (!r.picked) {
      html += `<div class="card-row">${r.choices.map(id => `<div data-action="take-card" data-id="${id}">${cardHTML(id, { classes: 'pickable' })}</div>`).join('')}</div>
        <button data-action="skip-card">Überspringen (+8 Gold)</button>`;
    }

    html += `<h3>Händler der Finsternis <span class="muted">– du hast ${g.gold} Gold</span></h3><div class="card-row shop">`;
    html += r.shop.map((s, i) => `<div data-action="buy-card" data-index="${i}">${cardHTML(s.id, {
      classes: s.sold ? 'sold' : g.gold < s.price ? 'disabled' : 'pickable',
      footer: `<div class="price">${s.sold ? 'Verkauft' : s.price + ' Gold'}</div>`,
    })}</div>`).join('');
    if (r.shopArtifact) {
      const s = r.shopArtifact;
      html += `<div class="artifact-card shop-artifact ${s.sold ? 'sold' : g.gold < s.price ? 'disabled' : ''}" data-action="buy-artifact">
        <img src="${spriteURL('art_' + s.id, 6)}" alt=""><b>${esc(ARTIFACTS[s.id].name)}</b>
        <span>${esc(ARTIFACTS[s.id].desc)}</span><div class="price">${s.sold ? 'Verkauft' : s.price + ' Gold'}</div></div>`;
    }
    html += `</div>`;
    html += `<div class="modal-actions">
      <button data-action="open-remove" ${r.removed || g.gold < REMOVE_PRICE ? 'disabled' : ''}>Karte entfernen (${REMOVE_PRICE} Gold)</button>
      <button class="primary" data-action="next-wave">Weiter zu Welle ${g.wave + 1} ▶</button></div>`;
    UI.showModal(html, true);
  },

  renderRemove(g) {
    const cards = [...g.deck, ...g.discard].sort((a, b) => a.id.localeCompare(b.id));
    UI.showModal(`<h2>Karte entfernen</h2><p class="muted">Ein schlankes Deck zieht öfter deine besten Karten. Kosten: ${REMOVE_PRICE} Gold.</p>
      <div class="card-row wrap">${cards.map(c => `<div data-action="remove-card" data-uid="${c.uid}">${cardHTML(c.id, { classes: 'pickable small' })}</div>`).join('')}</div>
      <div class="modal-actions"><button data-action="back-reward">Zurück</button></div>`, true);
  },

  renderDeck(g) {
    const cards = allCards(g).sort((a, b) => CARDS[a.id].type.localeCompare(CARDS[b.id].type) || a.id.localeCompare(b.id));
    UI.showModal(`<h2>Dein Deck (${cards.length} Karten)</h2>
      <div class="card-row wrap">${cards.map(c => cardHTML(c.id, { classes: 'small' })).join('')}</div>
      <div class="modal-actions"><button data-action="close">Schließen</button></div>`, true);
  },

  renderEnd(g, won) {
    UI.showModal(`
      <div class="end-screen ${won ? 'won' : 'lost'}">
        <h1>${won ? 'Der Dungeon triumphiert!' : 'Das Herz ist zerbrochen'}</h1>
        <p class="tagline">${won
          ? 'Keine Heldengeneration hat dein Meisterwerk überlebt.'
          : 'Die Helden feiern. Doch dein nächster Dungeon wird besser.'}</p>
        <div class="stats-grid">
          <div><b>${g.wave}</b><span>Welle</span></div>
          <div><b>${g.stats.kills}</b><span>Helden besiegt</span></div>
          <div><b>${g.stats.built}</b><span>Räume gegraben</span></div>
          <div><b>${g.souls}</b><span>Seelen</span></div>
        </div>
        <div class="modal-actions">
          ${won ? '<button data-action="endless">Endlos weiterspielen</button>' : ''}
          <button class="primary big" data-action="new-run">Neuer Run</button>
        </div>
      </div>`, true);
  },
};
