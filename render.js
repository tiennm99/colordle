// DOM rendering: history rows, possible-target panel, result section, guess inputs,
// daily badge, stats line, and hex input sync.
import {
  CHANNEL_NAMES,
  rgbToHex,
  feasibleRanges,
  suggestedValue,
  rangesLabel,
  dailyNumber,
} from './game.js';
import { nearnessPct, bestGuess } from './scoring.js';
import { successMessage, failMessage } from './messages.js';
import { buildShareRow } from './share.js';

const $ = (id) => document.getElementById(id);

const RGB_IDS = ['rInput', 'gInput', 'bInput'];

// Syncs color picker, hex text input, RGB text inputs, and preview swatch to rgb.
// origin: 'picker' | 'rgb' | 'apply' | 'hex' — avoids feedback loops between inputs.
export function setGuess(rgb, origin) {
  const hex = rgbToHex(rgb).toUpperCase();
  const hexLower = hex.toLowerCase(); // color picker requires lowercase

  if (origin !== 'picker') $('colorPicker').value = hexLower;
  if (origin !== 'hex') $('hexInput').value = hex;
  if (origin !== 'rgb') {
    RGB_IDS.forEach((id, i) => { $(id).value = String(rgb[i]); });
  }
  const preview = $('guessPreview');
  preview.style.background = hexLower;
  preview.title = `${hex}  (${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  RGB_IDS.forEach((id) => {
    const el = $(id);
    el.classList.remove('invalid');
    el.removeAttribute('aria-invalid');
  });
}

// Renders the "Possible target" panel with range segments and optional midpoint button.
// Rows are inserted into #hintsBody (the toggle-controlled container); visibility is
// handled by the hidden attribute on the body itself, not here.
function renderPossible(state) {
  const panel = $('hintsBody');
  panel.querySelectorAll('.poss-row').forEach((el) => el.remove());

  const feasible = [0, 1, 2].map((i) => feasibleRanges(state, i));
  const applyBtn = $('applySuggestion');

  [0, 1, 2].forEach((i) => {
    const ranges = feasible[i];
    const row = document.createElement('div');
    row.className = `poss-row c${CHANNEL_NAMES[i].toLowerCase()}`;

    const label = document.createElement('span');
    label.className = 'poss-label';
    label.textContent = CHANNEL_NAMES[i];
    row.appendChild(label);

    const track = document.createElement('div');
    track.className = 'poss-track';

    ranges.forEach(([lo, hi]) => {
      const seg = document.createElement('span');
      seg.className = 'poss-seg';
      seg.style.left = `${(lo / 255) * 100}%`;
      seg.style.width = `${Math.max(0.5, ((hi - lo) / 255) * 100)}%`;
      seg.title = lo === hi ? `target = ${lo}` : `target ∈ ${lo}–${hi}`;
      track.appendChild(seg);
    });

    state.guesses.forEach((g, gi) => {
      const c = g.channels[i];
      const tick = document.createElement('span');
      tick.className = `poss-tick ${c.result}`;
      tick.style.left = `${(c.value / 255) * 100}%`;
      tick.title = `guess #${gi + 1}: ${CHANNEL_NAMES[i]}=${c.value} (${c.result})`;
      track.appendChild(tick);
    });

    row.appendChild(track);

    const hint = document.createElement('span');
    hint.className = 'poss-hint';
    hint.textContent = ranges.length ? rangesLabel(ranges) : '—';
    row.appendChild(hint);

    panel.insertBefore(row, applyBtn);
  });

  const canSuggest =
    !state.done &&
    state.guesses.length > 0 &&
    feasible.every((r) => r.length > 0);
  if (canSuggest) {
    const rgb = feasible.map(suggestedValue);
    const hex = rgbToHex(rgb);
    $('applySuggestionSwatch').style.background = hex;
    $('applySuggestionHex').textContent = hex;
    applyBtn.hidden = false;
    applyBtn.dataset.rgb = rgb.join(',');
  } else {
    applyBtn.hidden = true;
    delete applyBtn.dataset.rgb;
  }
}

// Renders the daily badge (puzzle number + streak) when in daily mode.
// The badge is split across two spans inside .counter so "Colordle #N · Guess X/Y · Streak Z"
// reads as a single hierarchy line instead of competing with the header.
function renderDailyBadge(state, stats) {
  const badge = $('dailyBadge');
  const streakWrap = $('dailyStreakWrap');
  const isDaily = state.mode === 'daily' && state.dailyDate;
  badge.hidden = !isDaily;
  streakWrap.hidden = !isDaily;
  if (!isDaily) return;
  $('dailyNumber').textContent = `Colordle #${dailyNumber(state.dailyDate)}`;
  $('dailyStreak').textContent = stats ? stats.streak : 0;
}

// Renders mode-dependent controls (practice controls visible only in practice mode)
function renderModeControls(state) {
  const practiceControls = $('practiceControls');
  if (state.mode === 'daily') {
    practiceControls.hidden = true;
  } else {
    practiceControls.hidden = false;
  }
}

// Builds a stats line element for daily completion
function buildStatsLine(stats) {
  const winPct = stats.played > 0
    ? Math.round((stats.won / stats.played) * 100)
    : 0;
  const line = document.createElement('div');
  line.className = 'stats-line';

  const items = [
    ['Streak', stats.streak],
    ['Best', stats.maxStreak],
    ['Played', stats.played],
    ['Win %', winPct],
  ];
  items.forEach(([label, val]) => {
    const div = document.createElement('div');
    div.textContent = label + ' ';
    const span = document.createElement('span');
    span.className = 'stat-value';
    span.textContent = String(val);
    div.appendChild(span);
    line.appendChild(div);
  });
  return line;
}

// Builds the Play-again / Come-back-tomorrow button
function buildReplayButton(state) {
  const replay = document.createElement('button');
  replay.type = 'button';
  replay.className = 'play-again';
  const isDailyDone = state.mode === 'daily' && state.done;
  replay.textContent = isDailyDone ? 'Come back tomorrow' : 'Play again';
  replay.disabled = isDailyDone;
  replay.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('colordle:new-game'));
  });
  return replay;
}

// Full re-render: target swatch, counters, possible panel, history rows,
// result section, daily badge, and mode controls.
// stats is the current stats object (may be null in practice mode — pass null)
export function render(state, stats) {
  const swatch = $('targetSwatch');
  if (state.done) {
    swatch.style.background = rgbToHex(state.target);
    swatch.textContent = '';
    swatch.classList.remove('hidden');
  } else {
    swatch.style.background = '';
    swatch.textContent = '?';
    swatch.classList.add('hidden');
  }
  $('guessCount').textContent = state.guesses.length;
  $('maxGuessesLabel').textContent = state.maxGuesses;

  renderPossible(state);
  renderModeControls(state);
  renderDailyBadge(state, stats);

  // Update mode-switch button aria-selected state
  document.querySelectorAll('#modeSwitch button').forEach((btn) => {
    const isActive = btn.dataset.mode === state.mode;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  const history = $('history');
  history.innerHTML = '';
  state.guesses.forEach((g, idx) => {
    const row = document.createElement('div');
    row.className = 'row';

    const sw = document.createElement('div');
    sw.className = 'swatch small';
    sw.style.background = rgbToHex(g.rgb);
    row.appendChild(sw);

    const num = document.createElement('span');
    num.className = 'hex';
    num.textContent = `#${idx + 1} ${rgbToHex(g.rgb)}`;
    row.appendChild(num);

    const channels = document.createElement('div');
    channels.className = 'channels';
    g.channels.forEach((c, i) => {
      const letter = CHANNEL_NAMES[i];
      const block = document.createElement('span');
      block.className = `channel ${c.result}`;

      const main = document.createElement('span');
      main.className = 'channel-main';
      main.textContent = `${letter}:${c.result === 'exact' ? '✓' : c.value}`;
      block.appendChild(main);

      const caption = document.createElement('span');
      caption.className = 'channel-range';
      const gN = Math.max(0, Math.floor(c.band.green));
      const yN = Math.max(0, Math.floor(c.band.yellow));
      if (c.result === 'exact') caption.textContent = 'exact';
      else if (c.result === 'green') caption.textContent = `Δ ≤ ${gN}`;
      else if (c.result === 'yellow') caption.textContent = `Δ ≤ ${yN}`;
      else caption.textContent = `Δ > ${yN}`;
      block.appendChild(caption);

      block.title =
        `${letter} = ${c.value}   Δ = ${c.delta}\n` +
        `Ranges at this guess: green ≤${gN}, yellow ≤${yN}, red >${yN}`;

      channels.appendChild(block);
    });
    row.appendChild(channels);

    const isIncorrect = g.channels.some((c) => c.result !== 'exact');
    if (isIncorrect) {
      const pct = nearnessPct(g.rgb, state.target);
      const near = document.createElement('span');
      near.className = 'nearness';
      near.style.background = `hsl(${pct * 1.2}, 58%, 38%)`;
      near.textContent = `${pct}%`;
      near.title = 'Color nearness: 100% = exact, 0% = opposite corner of the RGB cube (e.g. white vs black)';
      row.appendChild(near);
    }

    history.appendChild(row);
  });

  const result = $('result');
  if (state.done) {
    result.hidden = false;
    const hex = rgbToHex(state.target);
    const [r, g, b] = state.target;
    if (state.won) {
      const n = state.guesses.length;
      const msg = successMessage(n, state.maxGuesses);
      const tally = n === 1 ? '1 guess' : `${n} guesses`;
      result.innerHTML = '';
      const h2 = document.createElement('h2');
      h2.textContent = msg;
      result.appendChild(h2);
      const p = document.createElement('p');
      p.textContent = `${hex.toUpperCase()}  (${r}, ${g}, ${b}) in ${tally}.`;
      result.appendChild(p);
    } else {
      const best = bestGuess(state.guesses, state.target);
      const msg = failMessage(best.pct);
      const bhex = rgbToHex(best.guess.rgb);

      result.innerHTML = '';
      const h2 = document.createElement('h2');
      h2.textContent = msg;
      result.appendChild(h2);

      // "The color was …" line
      const p1 = document.createElement('p');
      p1.textContent = 'The color was ';
      const revealTarget = document.createElement('span');
      revealTarget.className = 'reveal';
      revealTarget.style.background = hex;
      p1.appendChild(revealTarget);
      p1.append(` ${hex.toUpperCase()} (${r}, ${g}, ${b}).`);
      result.appendChild(p1);

      // "Your best guess …" line
      const p2 = document.createElement('p');
      p2.className = 'best-line';
      p2.textContent = `Your best guess (#${best.idx + 1}): `;
      const revealBest = document.createElement('span');
      revealBest.className = 'reveal';
      revealBest.style.background = bhex;
      p2.appendChild(revealBest);
      p2.append(` ${bhex.toUpperCase()} — `);
      const pctSpan = document.createElement('span');
      pctSpan.className = 'best-pct';
      pctSpan.style.background = `hsl(${best.pct * 1.2}, 58%, 38%)`;
      pctSpan.textContent = `${best.pct}%`;
      p2.appendChild(pctSpan);
      result.appendChild(p2);
    }

    // Stats line for daily completions
    if (state.mode === 'daily' && stats) {
      result.appendChild(buildStatsLine(stats));
    }

    // Play-again / Come-back-tomorrow button
    result.appendChild(buildReplayButton(state));

    result.appendChild(buildShareRow(state));
  } else {
    result.hidden = true;
  }
  $('submitGuess').disabled = state.done;
}
