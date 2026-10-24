'use strict';
// Einstieg: Spielschleife, Eingabe und Verknüpfung von Logik und Oberfläche.

const BASE_TICK_MS = 380;
const SPEEDS = [1, 2, 4];
const BEST_KEY = 'dungeonArchitect.best';

let g = null;
const view = { selected: null, targets: [], hover: null, alpha: 1, speedIdx: 0 };
let tickAcc = 0;
let lastPhase = null;

function loadBest() {
  try { return JSON.parse(localStorage.getItem(BEST_KEY)); } catch (e) { return null; }
}
function saveBest() {
  const best = loadBest();
  const run = { wave: g.wave, won: g.phase === 'victory' || g.endless, kills: g.stats.kills };
  if (best && (best.wave > run.wave || (best.wave === run.wave && best.kills >= run.kills))) return;
  try { localStorage.setItem(BEST_KEY, JSON.stringify(run)); } catch (e) { /* Speicher nicht verfügbar */ }
}

function startRun() {
  g = newGame();
  clearSelection();
  lastPhase = null;
  UI.hideModal();
  refresh();
}

function clearSelection() {
  view.selected = null;
  view.targets = [];
}

function refresh() {
  UI.renderHUD(g);
  UI.renderHand(g, view);
  UI.renderSide(g, view);
  if (g.phase !== lastPhase) onPhaseChange();
}

function onPhaseChange() {
  lastPhase = g.phase;
  const banner = $('phase-banner');
  const texts = { build: 'Bauphase', wave: 'Die Tür öffnet sich…' };
  banner.textContent = texts[g.phase] || '';
  banner.classList.remove('show');
  if (texts[g.phase]) { void banner.offsetWidth; banner.classList.add('show'); }

  if (g.phase === 'reward') setTimeout(() => g.phase === 'reward' && UI.renderReward(g), 700);
  if (g.phase === 'gameover') { saveBest(); setTimeout(() => UI.renderEnd(g, false), 900); }
  if (g.phase === 'victory') { saveBest(); setTimeout(() => UI.renderEnd(g, true), 900); }
}

// ---------- Karten ----------

function selectCard(uid) {
  if (g.phase !== 'build') return;
  const card = g.hand.find(c => c.uid === uid);
  if (!card) return;
  if (view.selected === uid) { clearSelection(); refresh(); return; }
  if (!canAfford(g, card)) return;
  if (!needsTarget(card)) {
    playCard(g, uid);
    clearSelection();
    refresh();
    return;
  }
  const targets = cardTargets(g, card);
  if (!targets.length) return;
  view.selected = uid;
  view.targets = targets;
  refresh();
}

function tileFromEvent(e) {
  const canvas = $('board');
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / rect.width * COLS);
  const y = Math.floor((e.clientY - rect.top) / rect.height * ROWS);
  return tileAt(g, x, y);
}

function onBoardClick(e) {
  if (!g || view.selected === null) return;
  const t = tileFromEvent(e);
  if (t && view.targets.includes(t)) {
    playCard(g, view.selected, t);
    clearSelection();
    refresh();
  }
}

// ---------- Dialog-Aktionen ----------

function onModalAction(el) {
  const a = el.dataset.action;
  switch (a) {
    case 'new-run': startRun(); break;
    case 'close': UI.hideModal(); break;
    case 'take-artifact': takeRewardArtifact(g, el.dataset.id); UI.renderReward(g); break;
    case 'take-card': takeRewardCard(g, el.dataset.id); UI.renderReward(g); break;
    case 'skip-card': takeRewardCard(g, null); UI.renderReward(g); break;
    case 'buy-card': buyShopCard(g, Number(el.dataset.index)); UI.renderReward(g); break;
    case 'buy-artifact': buyShopArtifact(g); UI.renderReward(g); break;
    case 'open-remove': UI.renderRemove(g); break;
    case 'remove-card': removeCard(g, Number(el.dataset.uid)); UI.renderReward(g); break;
    case 'back-reward': UI.renderReward(g); break;
    case 'next-wave': nextWave(g); UI.hideModal(); break;
    case 'endless': continueEndless(g); UI.renderReward(g); break;
  }
  refresh();
}

// ---------- Schleife ----------

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(100, now - lastFrame);
  lastFrame = now;
  if (g) {
    const tickMs = BASE_TICK_MS / SPEEDS[view.speedIdx];
    if (g.phase === 'wave') {
      tickAcc += dt;
      let ticked = false;
      while (tickAcc >= tickMs && g.phase === 'wave') {
        tickAcc -= tickMs;
        simTick(g);
        ticked = true;
      }
      if (ticked) refresh();
      view.alpha = tickAcc / tickMs * 1.6;
    } else {
      tickAcc = 0;
      view.alpha = 1;
    }
    renderBoard($('board').getContext('2d'), g, view, dt, now);
  }
  requestAnimationFrame(frame);
}

// ---------- Init ----------

function init() {
  buildSprites();

  $('hand').addEventListener('click', e => {
    const el = e.target.closest('.card[data-uid]');
    if (el) selectCard(Number(el.dataset.uid));
  });

  const board = $('board');
  board.addEventListener('click', onBoardClick);
  board.addEventListener('contextmenu', e => { e.preventDefault(); clearSelection(); refresh(); });
  board.addEventListener('mousemove', e => {
    const t = tileFromEvent(e);
    if (t !== view.hover) { view.hover = t; UI.renderSide(g, view); }
  });
  board.addEventListener('mouseleave', () => { view.hover = null; UI.renderSide(g, view); });

  $('btn-start').addEventListener('click', () => { clearSelection(); startWave(g); refresh(); });
  $('btn-mana').addEventListener('click', () => { buyMana(g); refresh(); });
  $('btn-deck').addEventListener('click', () => UI.renderDeck(g));
  $('btn-speed').addEventListener('click', () => {
    view.speedIdx = (view.speedIdx + 1) % SPEEDS.length;
    $('btn-speed').textContent = `Tempo ${SPEEDS[view.speedIdx]}×`;
  });

  $('modal').addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (el && !el.classList.contains('disabled') && !el.disabled) onModalAction(el);
  });

  document.addEventListener('keydown', e => {
    if (!g) return;
    if (e.key === 'Escape') { clearSelection(); refresh(); }
    if (e.key === ' ' && g.phase === 'build' && $('overlay').classList.contains('hidden')) {
      e.preventDefault();
      clearSelection();
      startWave(g);
      refresh();
    }
    const n = Number(e.key);
    if (n >= 1 && n <= 9 && g.phase === 'build' && g.hand[n - 1]) selectCard(g.hand[n - 1].uid);
  });

  g = newGame();
  refresh();
  UI.renderTitle(loadBest());
  requestAnimationFrame(frame);
}

window.addEventListener('DOMContentLoaded', init);
