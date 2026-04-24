// Message pools shown after win or loss
export const MESSAGES = {
  one: [
    "Cheating?",
    "Are you a bot? Bots get banned.",
    "Suspicious. Highly suspicious.",
    "Nobody does that. Nobody.",
    "Lucky guess. Or witchcraft.",
    "One shot, one kill.",
    "I'm calling the referee.",
    "Statistically implausible.",
    "Did you peek at the source?",
    "Hex vision confirmed.",
  ],
  prodigy: [
    "Chromatic prodigy.",
    "Eagle-eyed.",
    "Masterful.",
    "Pantone's secret child?",
    "Prodigious.",
    "Uncanny color sense.",
    "Effortless.",
    "The retina remembers.",
  ],
  solid: [
    "Solidly done.",
    "Nailed it.",
    "Pigment whisperer.",
    "Respectable showing.",
    "Handsomely played.",
    "Smooth.",
    "Tidy work.",
  ],
  scenic: [
    "Got there eventually.",
    "Scenic route, but you arrived.",
    "Patience pays.",
    "A bit meandering, but a win.",
    "Victory, however ragged.",
    "Earned every pixel of that.",
  ],
  tight: [
    "Dramatic finish.",
    "You like living dangerously.",
    "Close one.",
    "Nearly a tragedy.",
    "A whisker from the void.",
  ],
  last: [
    "Phew!",
    "By the skin of your teeth.",
    "Clutch.",
    "On fumes.",
    "Heart attack narrowly avoided.",
    "Graceless — but a win.",
    "The last breath saved you.",
    "Cut it finer next time, will you?",
  ],
  loseAlmost: [
    "Almost!!",
    "Painfully close.",
    "A single pixel away.",
    "Oh, so nearly.",
    "Cruel. Just cruel.",
    "Practically had it.",
    "Within arm's reach.",
    "Could taste it.",
    "Heartbreak hex.",
    "That one will sting for a while.",
  ],
  loseWarm: [
    "Tantalizing.",
    "Warm. Very warm.",
    "Knocking on the door.",
    "The color winked and left.",
    "So near, so far.",
    "Close, but no pigment.",
  ],
  loseClose: [
    "Respectable, but no cigar.",
    "In the neighbourhood.",
    "The palette had other ideas.",
    "Good hunting, wrong quarry.",
    "Circling the right hue.",
  ],
  loseMid: [
    "Somewhere in the ballpark.",
    "You and the color are roughly acquainted.",
    "Middling effort.",
    "A passing familiarity at best.",
    "Chromatically adjacent.",
  ],
  loseFar: [
    "Spectrum mismatch.",
    "A different hue altogether.",
    "The wheel keeps turning.",
    "Noted attempt. Wrong territory.",
    "Cold.",
    "Outfoxed by six little digits.",
  ],
  loseAwful: [
    "Not even close.",
    "Were you trying?",
    "Chromatic amnesia.",
    "Are we looking at the same colors?",
    "Hexual identity crisis.",
    "The void consumed your guess.",
    "Diametrically opposed.",
    "You picked the opposite corner of the cube, friend.",
  ],
};

// Pick a random element from an array
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Returns a congratulatory message based on number of guesses used
export function successMessage(guesses, max) {
  if (guesses === 1) return pick(MESSAGES.one);
  if (guesses === max) return pick(MESSAGES.last);
  if (max >= 4 && guesses === max - 1) return pick(MESSAGES.tight);
  const ratio = guesses / max;
  if (ratio <= 0.34) return pick(MESSAGES.prodigy);
  if (ratio <= 0.67) return pick(MESSAGES.solid);
  return pick(MESSAGES.scenic);
}

// Returns a consolation message based on best nearness percentage achieved
export function failMessage(bestPct) {
  if (bestPct >= 95) return pick(MESSAGES.loseAlmost);
  if (bestPct >= 85) return pick(MESSAGES.loseWarm);
  if (bestPct >= 70) return pick(MESSAGES.loseClose);
  if (bestPct >= 50) return pick(MESSAGES.loseMid);
  if (bestPct >= 25) return pick(MESSAGES.loseFar);
  return pick(MESSAGES.loseAwful);
}
