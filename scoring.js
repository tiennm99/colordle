// Maximum possible RGB distance (corner to corner of the unit cube scaled to 255)
export const MAX_DIST = Math.sqrt(3) * 255;

// Returns a 0–100 integer representing how close a guess is to the target
export function nearnessPct(guess, target) {
  const dr = guess[0] - target[0];
  const dg = guess[1] - target[1];
  const db = guess[2] - target[2];
  const dist = Math.sqrt(dr * dr + dg * dg + db * db);
  return Math.round((1 - dist / MAX_DIST) * 100);
}

// Returns { guess, pct, idx } for the guess nearest to target, or null if no guesses
export function bestGuess(guesses, target) {
  let best = null;
  let bestPct = -1;
  guesses.forEach((g, idx) => {
    const pct = nearnessPct(g.rgb, target);
    if (pct > bestPct) {
      bestPct = pct;
      best = { guess: g, pct, idx };
    }
  });
  return best;
}
