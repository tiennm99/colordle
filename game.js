// Game logic: state, classification, threshold management, range inference,
// daily seed, localStorage persistence, and streak tracking.

export const INITIAL_GREEN = 64;
export const INITIAL_YELLOW = 128;
export const CHANNEL_NAMES = ['R', 'G', 'B'];

// Returns a fresh, empty state object
export function createState() {
  return {
    target: [0, 0, 0],
    maxGuesses: 6,
    guesses: [],
    thresholds: [],
    done: false,
    won: false,
    mode: 'daily',
    dailyDate: null,
  };
}

export const randInt256 = () => Math.floor(Math.random() * 256);

// Converts an [r, g, b] array to a CSS hex string like "#1a2b3c"
export const rgbToHex = ([r, g, b]) =>
  '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');

// Parses a 3- or 6-digit hex string (with or without #) into [r, g, b] or null
export function parseHex(s) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((s || '').trim());
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

// Parses a channel string (0–255 integer) or returns null if invalid
export function parseChannel(s) {
  const m = /^\d{1,3}$/.exec((s || '').trim());
  if (!m) return null;
  const n = Number(m[0]);
  return n >= 0 && n <= 255 ? n : null;
}

// Classifies a channel delta against current thresholds
export function classify(delta, t) {
  if (delta === 0) return 'exact';
  if (delta <= t.green) return 'green';
  if (delta <= t.yellow) return 'yellow';
  return 'red';
}

// Shrinks thresholds based on how good the result was
export function tightenThreshold(t, result) {
  // exact is strictly better than green; treat it like green for shrinking
  if (result === 'exact' || result === 'green') {
    t.green /= 4;
    t.yellow /= 4;
  } else if (result === 'yellow') {
    t.green /= 2;
    t.yellow /= 2;
  }
}

// Returns the set of possible target ranges implied by one channel's guess result
export function possibleRanges({ value: v, result, band }) {
  if (result === 'exact') return [[v, v]];
  const g = Math.max(0, Math.floor(band.green));
  const y = Math.max(0, Math.floor(band.yellow));
  if (result === 'green') {
    return [[Math.max(0, v - g), Math.min(255, v + g)]];
  }
  if (result === 'yellow') {
    // |Δ| > g AND |Δ| ≤ y → two sub-intervals flanking the green zone
    const out = [];
    const leftHi = v - g - 1;
    if (leftHi >= 0) out.push([Math.max(0, v - y), leftHi]);
    const rightLo = v + g + 1;
    if (rightLo <= 255) out.push([rightLo, Math.min(255, v + y)]);
    return out;
  }
  // red: outside the yellow band at both ends
  const out = [];
  if (v - y - 1 >= 0) out.push([0, v - y - 1]);
  if (v + y + 1 <= 255) out.push([v + y + 1, 255]);
  return out;
}

// Intersects two sets of ranges and returns merged, sorted result
export function intersectRanges(a, b) {
  const out = [];
  for (const [al, ah] of a) {
    for (const [bl, bh] of b) {
      const lo = Math.max(al, bl);
      const hi = Math.min(ah, bh);
      if (lo <= hi) out.push([lo, hi]);
    }
  }
  out.sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const r of out) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

// Returns the intersection of all possible ranges for a channel given past guesses
export function feasibleRanges(state, channelIdx) {
  let ranges = [[0, 255]];
  for (const g of state.guesses) {
    ranges = intersectRanges(ranges, possibleRanges(g.channels[channelIdx]));
    if (!ranges.length) return [];
  }
  return ranges;
}

// Returns the midpoint of the widest range segment, or null if no ranges
export function suggestedValue(ranges) {
  if (!ranges.length) return null;
  let widest = ranges[0];
  for (const r of ranges) {
    if ((r[1] - r[0]) > (widest[1] - widest[0])) widest = r;
  }
  return Math.round((widest[0] + widest[1]) / 2);
}

// Formats a ranges array into a human-readable label like "10–30 or 80"
export function rangesLabel(ranges) {
  return ranges
    .map(([lo, hi]) => (lo === hi ? `${lo}` : `${lo}–${hi}`))
    .join(' or ');
}

// Returns today's date as YYYY-MM-DD in UTC
export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

// mulberry32 PRNG — deterministic pseudo-random from a 32-bit seed
function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a 32-bit hash of a date string for use as PRNG seed
function hashDate(dateStr) {
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Returns a deterministic [r, g, b] target for the given YYYY-MM-DD date string
export function dailyTarget(dateStr) {
  const rng = mulberry32(hashDate(dateStr));
  return [
    Math.floor(rng() * 256),
    Math.floor(rng() * 256),
    Math.floor(rng() * 256),
  ];
}

// Colordle #N — number of days since 2026-01-01 (day 1)
export function dailyNumber(dateStr) {
  const start = Date.UTC(2026, 0, 1);
  const now = Date.UTC(
    parseInt(dateStr.slice(0, 4), 10),
    parseInt(dateStr.slice(5, 7), 10) - 1,
    parseInt(dateStr.slice(8, 10), 10),
  );
  return Math.floor((now - start) / 86400000) + 1;
}

// Resets state to start a new puzzle.
// opts.mode: 'daily' | 'practice' (default 'daily')
// opts.dateStr: override date for daily mode (defaults to todayUtc())
export function newGame(state, maxGuesses, opts = {}) {
  const mode = opts.mode || 'daily';
  const dateStr = opts.dateStr || todayUtc();

  if (mode === 'daily') {
    state.target = dailyTarget(dateStr);
    state.maxGuesses = 6;
    state.mode = 'daily';
    state.dailyDate = dateStr;
  } else {
    state.target = [randInt256(), randInt256(), randInt256()];
    state.maxGuesses = Math.max(1, maxGuesses || 6);
    state.mode = 'practice';
    state.dailyDate = null;
  }

  state.guesses = [];
  state.thresholds = [0, 1, 2].map(() => ({
    green: INITIAL_GREEN,
    yellow: INITIAL_YELLOW,
  }));
  state.done = false;
  state.won = false;
}

// Applies a guess [r, g, b] to state; mutates state.guesses / state.done / state.won
export function submitGuess(state, rgb) {
  const channels = rgb.map((v, i) => {
    const delta = Math.abs(v - state.target[i]);
    const t = state.thresholds[i];
    const band = { green: t.green, yellow: t.yellow };
    const result = classify(delta, t);
    return { value: v, delta, result, band };
  });

  // Tighten AFTER classification so subsequent guesses see the shrunken bands
  channels.forEach((c, i) => tightenThreshold(state.thresholds[i], c.result));

  state.guesses.push({ rgb, channels });

  if (channels.every((c) => c.result === 'exact')) {
    state.done = true;
    state.won = true;
  } else if (state.guesses.length >= state.maxGuesses) {
    state.done = true;
  }
}

// ── localStorage persistence ────────────────────────────────────────────────

const STORAGE_KEY = 'colordle:v1';

// Persists the in-flight game state so sessions survive a page reload
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      target: state.target,
      maxGuesses: state.maxGuesses,
      guesses: state.guesses,
      thresholds: state.thresholds,
      done: state.done,
      won: state.won,
      mode: state.mode,
      dailyDate: state.dailyDate,
    }));
  } catch (_) { /* quota or privacy mode — silently skip */ }
}

// Restores persisted game state, or returns null if nothing is stored
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) { return null; }
}

// Removes the persisted game state
export function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

// ── Streak / stats tracking ─────────────────────────────────────────────────

const STATS_KEY = 'colordle:stats:v1';

const DEFAULT_STATS = () => ({
  streak: 0,
  maxStreak: 0,
  lastPlayedDate: null,
  played: 0,
  won: 0,
});

export function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY)) || DEFAULT_STATS();
  } catch (_) {
    return DEFAULT_STATS();
  }
}

export function saveStats(stats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (_) {}
}

// Updates stats after a daily game completion. Idempotent: calling twice for
// the same dateStr is a no-op so page reloads don't double-count.
export function recordDailyResult(stats, won, dateStr) {
  if (stats.lastPlayedDate === dateStr) return stats; // already recorded today

  const yesterday = new Date(dateStr + 'T00:00:00Z');
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const continuing = stats.lastPlayedDate === yesterdayStr;

  stats.played += 1;
  if (won) {
    stats.won += 1;
    stats.streak = continuing ? stats.streak + 1 : 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
  } else {
    stats.streak = 0;
  }
  stats.lastPlayedDate = dateStr;
  saveStats(stats);
  return stats;
}
