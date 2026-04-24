// Entry point: wires state, event listeners, localStorage restore, and initial render.
import {
  createState,
  newGame,
  submitGuess,
  parseHex,
  parseChannel,
  saveState,
  loadState,
  loadStats,
  loadPrefs,
  savePrefs,
  recordDailyResult,
  todayUtc,
} from './game.js';
import { render, setGuess } from './render.js';

const $ = (id) => document.getElementById(id);

const RGB_IDS = ['rInput', 'gInput', 'bInput'];

const state = createState();
// stats is kept in module scope so render() always has the latest version
let stats = loadStats();

// ── Helpers ─────────────────────────────────────────────────────────────────

function readRgbInputs() {
  const r = parseChannel($('rInput').value);
  const g = parseChannel($('gInput').value);
  const b = parseChannel($('bInput').value);
  if (r == null || g == null || b == null) return null;
  return [r, g, b];
}

// ── Submit ───────────────────────────────────────────────────────────────────

// Keep aria-invalid in sync with the .invalid CSS class for screen readers
function setInvalid(el, isInvalid) {
  el.classList.toggle('invalid', isInvalid);
  if (isInvalid) el.setAttribute('aria-invalid', 'true');
  else el.removeAttribute('aria-invalid');
}

function handleSubmit() {
  if (state.done) return;
  const rgb = readRgbInputs();
  if (!rgb) {
    RGB_IDS.forEach((id) => setInvalid($(id), parseChannel($(id).value) == null));
    return;
  }
  RGB_IDS.forEach((id) => setInvalid($(id), false));
  submitGuess(state, rgb);
  saveState(state);

  // Record daily completion exactly once (recordDailyResult is idempotent)
  if (state.done && state.mode === 'daily') {
    stats = recordDailyResult(stats, state.won, state.dailyDate);
  }

  render(state, stats);
}

// ── New game ─────────────────────────────────────────────────────────────────

function handleNewGame() {
  if (state.mode === 'daily') {
    // Daily is already loaded; pressing new-game from a completed daily is a no-op
    // (button is hidden in daily mode — this path is only reached via the
    //  colordle:new-game event dispatched by the Play-again button when mode=practice)
    return;
  }
  const maxGuesses = Math.max(1, parseInt($('maxGuesses').value, 10) || 6);
  newGame(state, maxGuesses, { mode: 'practice' });
  saveState(state);
  render(state, stats);
}

// colordle:new-game dispatched by the Play-again button in render.js
document.addEventListener('colordle:new-game', () => {
  if (state.mode === 'practice') {
    handleNewGame();
  }
  // In daily mode the button is disabled so this event won't fire
});

// ── Mode switch ──────────────────────────────────────────────────────────────

function switchMode(mode) {
  if (mode === state.mode) return;

  if (mode === 'daily') {
    const today = todayUtc();
    // Try to restore a persisted daily game for today before starting fresh
    const saved = loadState();
    if (saved && saved.mode === 'daily' && saved.dailyDate === today) {
      Object.assign(state, saved);
    } else {
      newGame(state, 6, { mode: 'daily', dateStr: today });
    }
    // Record result if a restored daily game was already done
    if (state.done) {
      stats = recordDailyResult(stats, state.won, state.dailyDate);
    }
  } else {
    const maxGuesses = Math.max(1, parseInt($('maxGuesses').value, 10) || 6);
    newGame(state, maxGuesses, { mode: 'practice' });
  }

  saveState(state);
  render(state, stats);
}

document.querySelectorAll('#modeSwitch button').forEach((btn) => {
  btn.addEventListener('click', () => switchMode(btn.dataset.mode));
});

// ── New game button (practice only) ──────────────────────────────────────────

$('newGame').addEventListener('click', () => {
  if (state.mode === 'practice') handleNewGame();
});

// ── Apply midpoint suggestion ─────────────────────────────────────────────────

$('applySuggestion').addEventListener('click', () => {
  const raw = $('applySuggestion').dataset.rgb;
  if (!raw) return;
  const rgb = raw.split(',').map((n) => parseInt(n, 10));
  if (rgb.length === 3 && rgb.every((n) => n >= 0 && n <= 255)) {
    setGuess(rgb, 'apply');
  }
});

// ── Color picker sync ─────────────────────────────────────────────────────────

$('colorPicker').addEventListener('input', () => {
  const rgb = parseHex($('colorPicker').value);
  if (rgb) setGuess(rgb, 'picker');
});

// ── Hex input sync ───────────────────────────────────────────────────────────

$('hexInput').addEventListener('input', () => {
  const rgb = parseHex($('hexInput').value);
  if (rgb) setGuess(rgb, 'hex');
});

$('hexInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSubmit();
});

// ── RGB text input sync ───────────────────────────────────────────────────────

RGB_IDS.forEach((id) => {
  const el = $(id);
  el.addEventListener('input', () => {
    const rgb = readRgbInputs();
    if (rgb) setGuess(rgb, 'rgb');
    else setInvalid(el, true);
  });
});

// Enter key submits from any RGB input
const submitOnEnter = (e) => { if (e.key === 'Enter') handleSubmit(); };
RGB_IDS.forEach((id) => $(id).addEventListener('keydown', submitOnEnter));

// Submit button
$('submitGuess').addEventListener('click', handleSubmit);

// ── Hints toggle ────────────────────────────────────────────────────────────
// Hints are hidden by default so challenge mode is the out-of-the-box feel;
// toggle preference is persisted so it sticks across sessions.

const prefs = loadPrefs();

function applyHintsPref() {
  const btn = $('hintsToggle');
  const body = $('hintsBody');
  const panel = $('possible');
  const label = btn.querySelector('.hints-toggle-label');
  btn.setAttribute('aria-expanded', prefs.hintsVisible ? 'true' : 'false');
  body.hidden = !prefs.hintsVisible;
  label.textContent = prefs.hintsVisible ? 'Hide hints' : 'Show hints';
  // Collapsed: strip the card chrome so the toggle reads as a standalone pill,
  // not an empty-looking container.
  panel.classList.toggle('collapsed', !prefs.hintsVisible);
}

$('hintsToggle').addEventListener('click', () => {
  prefs.hintsVisible = !prefs.hintsVisible;
  savePrefs(prefs);
  applyHintsPref();
});

// ── Initial load ─────────────────────────────────────────────────────────────

(function init() {
  const today = todayUtc();
  const saved = loadState();

  // Default to daily mode on first-ever load
  let restored = false;

  if (saved) {
    const dailyValid = saved.mode === 'daily' && saved.dailyDate === today;
    const practiceValid = saved.mode === 'practice';
    if (dailyValid || practiceValid) {
      Object.assign(state, saved);
      restored = true;
    }
  }

  if (!restored) {
    // Fresh daily puzzle for today
    newGame(state, 6, { mode: 'daily', dateStr: today });
    saveState(state);
  }

  // If a completed daily was restored, record the result (idempotent)
  if (state.done && state.mode === 'daily') {
    stats = recordDailyResult(stats, state.won, state.dailyDate);
  }

  // Sync input fields with the initial guess colour
  setGuess(parseHex($('colorPicker').value) || [128, 128, 128], 'picker');
  applyHintsPref();
  render(state, stats);
})();
