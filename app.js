(() => {
  const $ = (id) => document.getElementById(id);

  const INITIAL_GREEN = 64;
  const INITIAL_YELLOW = 128;
  const CHANNEL_NAMES = ['R', 'G', 'B'];

  const state = {
    target: [0, 0, 0],
    maxGuesses: 6,
    guesses: [],
    thresholds: [],
    done: false,
    won: false,
  };

  const randInt256 = () => Math.floor(Math.random() * 256);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const MESSAGES = {
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

  function successMessage(guesses, max) {
    if (guesses === 1) return pick(MESSAGES.one);
    if (guesses === max) return pick(MESSAGES.last);
    if (max >= 4 && guesses === max - 1) return pick(MESSAGES.tight);
    const ratio = guesses / max;
    if (ratio <= 0.34) return pick(MESSAGES.prodigy);
    if (ratio <= 0.67) return pick(MESSAGES.solid);
    return pick(MESSAGES.scenic);
  }

  function bestGuess(guesses, target) {
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

  function failMessage(bestPct) {
    if (bestPct >= 95) return pick(MESSAGES.loseAlmost);
    if (bestPct >= 85) return pick(MESSAGES.loseWarm);
    if (bestPct >= 70) return pick(MESSAGES.loseClose);
    if (bestPct >= 50) return pick(MESSAGES.loseMid);
    if (bestPct >= 25) return pick(MESSAGES.loseFar);
    return pick(MESSAGES.loseAwful);
  }

  const rgbToHex = ([r, g, b]) =>
    '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');

  function parseHex(s) {
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

  function parseChannel(s) {
    const m = /^\d{1,3}$/.exec((s || '').trim());
    if (!m) return null;
    const n = Number(m[0]);
    return n >= 0 && n <= 255 ? n : null;
  }

  function readRgbInputs() {
    const r = parseChannel($('rInput').value);
    const g = parseChannel($('gInput').value);
    const b = parseChannel($('bInput').value);
    if (r == null || g == null || b == null) return null;
    return [r, g, b];
  }

  const MAX_DIST = Math.sqrt(3) * 255;

  function possibleRanges({ value: v, result, band }) {
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

  function rangesLabel(ranges) {
    return ranges
      .map(([lo, hi]) => (lo === hi ? `${lo}` : `${lo}–${hi}`))
      .join(' or ');
  }

  function nearnessPct(guess, target) {
    const dr = guess[0] - target[0];
    const dg = guess[1] - target[1];
    const db = guess[2] - target[2];
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    return Math.round((1 - dist / MAX_DIST) * 100);
  }

  function classify(delta, t) {
    if (delta === 0) return 'exact';
    if (delta <= t.green) return 'green';
    if (delta <= t.yellow) return 'yellow';
    return 'red';
  }

  function tightenThreshold(t, result) {
    // exact is strictly better than green; treat it like green for shrinking
    if (result === 'exact' || result === 'green') {
      t.green /= 4;
      t.yellow /= 4;
    } else if (result === 'yellow') {
      t.green /= 2;
      t.yellow /= 2;
    }
  }

  function newGame() {
    state.target = [randInt256(), randInt256(), randInt256()];
    state.maxGuesses = Math.max(1, parseInt($('maxGuesses').value, 10) || 6);
    state.guesses = [];
    state.thresholds = [0, 1, 2].map(() => ({
      green: INITIAL_GREEN,
      yellow: INITIAL_YELLOW,
    }));
    state.done = false;
    state.won = false;
    render();
  }

  function submitGuess() {
    if (state.done) return;
    const rgb = readRgbInputs();
    if (!rgb) {
      RGB_IDS.forEach((id) => {
        if (parseChannel($(id).value) == null) $(id).classList.add('invalid');
      });
      return;
    }
    RGB_IDS.forEach((id) => $(id).classList.remove('invalid'));

    const channels = rgb.map((v, i) => {
      const delta = Math.abs(v - state.target[i]);
      const t = state.thresholds[i];
      const band = { green: t.green, yellow: t.yellow };
      const result = classify(delta, t);
      return { value: v, delta, result, band };
    });

    // Tighten AFTER classification, so subsequent guesses see the shrunken bands.
    channels.forEach((c, i) => tightenThreshold(state.thresholds[i], c.result));

    state.guesses.push({ rgb, channels });

    if (channels.every((c) => c.result === 'exact')) {
      state.done = true;
      state.won = true;
    } else if (state.guesses.length >= state.maxGuesses) {
      state.done = true;
    }
    render();
  }

  function intersectRanges(a, b) {
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

  function feasibleRanges(channelIdx) {
    let ranges = [[0, 255]];
    for (const g of state.guesses) {
      ranges = intersectRanges(ranges, possibleRanges(g.channels[channelIdx]));
      if (!ranges.length) return [];
    }
    return ranges;
  }

  function suggestedValue(ranges) {
    if (!ranges.length) return null;
    let widest = ranges[0];
    for (const r of ranges) {
      if ((r[1] - r[0]) > (widest[1] - widest[0])) widest = r;
    }
    return Math.round((widest[0] + widest[1]) / 2);
  }

  function renderPossible() {
    const panel = $('possible');
    panel.querySelectorAll('.poss-row').forEach((el) => el.remove());

    const feasible = [0, 1, 2].map((i) => feasibleRanges(i));
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
      hint.textContent = ranges.length
        ? rangesLabel(ranges)
        : '—';
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

  function render() {
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
    renderPossible();

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
        near.title = `Color nearness: 100% = exact, 0% = opposite corner of the RGB cube (e.g. white vs black)`;
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
        const tally = n === 1 ? "1 guess" : `${n} guesses`;
        result.innerHTML =
          `<h2>${msg}</h2><p>${hex} &nbsp;(${r}, ${g}, ${b}) in ${tally}.</p>`;
      } else {
        const best = bestGuess(state.guesses, state.target);
        const msg = failMessage(best.pct);
        const bhex = rgbToHex(best.guess.rgb);
        result.innerHTML =
          `<h2>${msg}</h2>` +
          `<p>The color was <span class="reveal" style="background:${hex}"></span> <strong>${hex}</strong> (${r}, ${g}, ${b}).</p>` +
          `<p class="best-line">Your best guess (#${best.idx + 1}): ` +
          `<span class="reveal" style="background:${bhex}"></span> <strong>${bhex}</strong> — ` +
          `<span class="best-pct" style="background:hsl(${best.pct * 1.2}, 58%, 38%)">${best.pct}%</span></p>`;
      }
      result.appendChild(buildShareRow());
    } else {
      result.hidden = true;
    }
    $('submitGuess').disabled = state.done;
  }

  const RGB_IDS = ['rInput', 'gInput', 'bInput'];

  function setGuess(rgb, origin) {
    const hex = rgbToHex(rgb);
    if (origin !== 'picker') $('colorPicker').value = hex;
    if (origin !== 'rgb') {
      RGB_IDS.forEach((id, i) => { $(id).value = String(rgb[i]); });
    }
    const preview = $('guessPreview');
    preview.style.background = hex;
    preview.title = `${hex}  (${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    RGB_IDS.forEach((id) => $(id).classList.remove('invalid'));
  }

  $('colorPicker').addEventListener('input', () => {
    const rgb = parseHex($('colorPicker').value);
    if (rgb) setGuess(rgb, 'picker');
  });

  RGB_IDS.forEach((id) => {
    const el = $(id);
    el.addEventListener('input', () => {
      const rgb = readRgbInputs();
      if (rgb) setGuess(rgb, 'rgb');
      else el.classList.add('invalid');
    });
  });

  const submitOnEnter = (e) => { if (e.key === 'Enter') submitGuess(); };
  RGB_IDS.forEach((id) => $(id).addEventListener('keydown', submitOnEnter));

  const iconImage = new Image();
  iconImage.crossOrigin = 'anonymous';
  iconImage.src = 'colordle_icon.png';
  const iconReady = new Promise((resolve) => {
    iconImage.addEventListener('load', () => resolve(true), { once: true });
    iconImage.addEventListener('error', () => resolve(false), { once: true });
  });

  function shareContext() {
    const best = bestGuess(state.guesses, state.target) || {
      guess: state.guesses[state.guesses.length - 1] || { rgb: [128, 128, 128] },
      pct: 0,
    };
    return {
      won: state.won,
      target: state.target,
      guesses: state.guesses.length,
      maxGuesses: state.maxGuesses,
      bestRgb: best.guess.rgb,
      bestPct: best.pct,
    };
  }

  function shareSummary(ctx) {
    if (ctx.won) {
      return `I solved Colordle in ${ctx.guesses} ${
        ctx.guesses === 1 ? 'guess' : 'guesses'
      }! 🎨`;
    }
    return `Colordle got me this time — closest guess was ${ctx.bestPct}% after ${ctx.guesses} tries. 🎨`;
  }

  function openShareWindow(url) {
    const w = window.open(url, '_blank');
    if (!w) window.location.href = url;
  }

  function shareX() {
    const ctx = shareContext();
    const text = `${shareSummary(ctx)}\n${window.location.href}`;
    openShareWindow(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
    );
  }

  function shareFacebook() {
    openShareWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
    );
  }

  async function drawResultImage(skipIcon = false) {
    const ctx = shareContext();
    const hasIcon = skipIcon ? false : await iconReady;
    const W = 900;
    const H = 530;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d');

    // Background
    g.fillStyle = '#141414';
    g.fillRect(0, 0, W, H);
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#1c1c1c');
    grad.addColorStop(1, '#0f0f0f');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    // Title (optionally with icon on the left)
    const titleText = 'COLORDLE';
    const titleY = 95;
    const iconSize = 72;
    const iconGap = 16;
    g.font = '800 72px system-ui, -apple-system, "Segoe UI", sans-serif';
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    const titleW = g.measureText(titleText).width;
    const blockW = hasIcon ? iconSize + iconGap + titleW : titleW;
    const startX = (W - blockW) / 2;

    if (hasIcon) {
      g.drawImage(iconImage, startX, titleY - iconSize / 2, iconSize, iconSize);
    }
    g.fillStyle = '#f5f5f5';
    g.fillText(titleText, hasIcon ? startX + iconSize + iconGap : startX, titleY);

    // Subtitle
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#8a8a8a';
    g.font = '500 22px system-ui, sans-serif';
    g.fillText(ctx.won ? 'Solved' : 'Stumped', W / 2, 150);

    // Swatches
    const sw = 180;
    const sh = 180;
    const topY = 180;
    const gap = 60;
    const totalW = sw * 2 + gap;
    const leftX = (W - totalW) / 2;
    const rightX = leftX + sw + gap;

    const drawSwatch = (x, rgb, label, hex) => {
      g.fillStyle = '#222';
      g.fillRect(x - 4, topY - 4, sw + 8, sh + 8);
      g.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      g.fillRect(x, topY, sw, sh);

      g.fillStyle = '#cfcfcf';
      g.font = '600 20px system-ui, sans-serif';
      g.fillText(label, x + sw / 2, topY - 18);

      g.fillStyle = '#f0f0f0';
      g.font = '700 24px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillText(hex, x + sw / 2, topY + sh + 34);

      g.fillStyle = '#8a8a8a';
      g.font = '500 18px ui-monospace, monospace';
      g.fillText(
        `(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
        x + sw / 2,
        topY + sh + 58,
      );
    };

    const targetHex = rgbToHex(ctx.target);
    const bestHex = rgbToHex(ctx.bestRgb);
    drawSwatch(leftX, ctx.bestRgb, 'Best guess', bestHex);
    drawSwatch(rightX, ctx.target, 'Target', targetHex);

    // Result line — well below the RGB numbers under the swatches
    const pillY = H - 50;
    const pillPad = 18;
    g.font = '800 30px system-ui, sans-serif';
    const pctText = `${ctx.bestPct}% close`;
    const tallyText = ctx.won
      ? `${ctx.guesses} / ${ctx.maxGuesses} guesses`
      : `after ${ctx.guesses} guesses`;
    const fullText = `${pctText}   •   ${tallyText}`;
    const textW = g.measureText(fullText).width;
    const pillW = textW + pillPad * 2;
    const pillX = (W - pillW) / 2;
    const pillH = 48;

    g.fillStyle = `hsl(${ctx.bestPct * 1.2}, 58%, 38%)`;
    const radius = pillH / 2;
    g.beginPath();
    g.moveTo(pillX + radius, pillY - pillH / 2);
    g.arcTo(pillX + pillW, pillY - pillH / 2, pillX + pillW, pillY + pillH / 2, radius);
    g.arcTo(pillX + pillW, pillY + pillH / 2, pillX, pillY + pillH / 2, radius);
    g.arcTo(pillX, pillY + pillH / 2, pillX, pillY - pillH / 2, radius);
    g.arcTo(pillX, pillY - pillH / 2, pillX + pillW, pillY - pillH / 2, radius);
    g.closePath();
    g.fill();

    g.fillStyle = '#fff';
    g.textBaseline = 'middle';
    g.fillText(fullText, W / 2, pillY);

    return canvas;
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('toBlob returned null'));
        }, 'image/png');
      } catch (err) {
        reject(err);
      }
    });
  }

  async function shareImage() {
    let blob;
    try {
      const canvas = await drawResultImage(false);
      blob = await canvasToBlob(canvas);
    } catch (err) {
      // Tainted canvas (e.g. file:// origin or CORS-less icon host).
      // Redraw without the icon and try again.
      if (String(err && err.name) === 'SecurityError' ||
          /tainted/i.test(String(err && err.message))) {
        console.warn('Share image tainted by icon — regenerating without it.', err);
        const fallback = await drawResultImage(true);
        blob = await canvasToBlob(fallback);
      } else {
        throw err;
      }
    }

    const file = new File([blob], 'colordle.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Colordle',
          text: shareSummary(shareContext()),
        });
        return;
      } catch (_) { /* user cancelled — fall through to download */ }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'colordle.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function buildShareRow() {
    const row = document.createElement('div');
    row.className = 'share-row';

    const label = document.createElement('span');
    label.className = 'share-label';
    label.textContent = 'Share:';
    row.appendChild(label);

    const mk = (cls, text, handler) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `share-btn ${cls}`;
      b.textContent = text;
      b.addEventListener('click', handler);
      return b;
    };

    row.appendChild(mk('x', 'X', shareX));
    row.appendChild(mk('fb', 'Facebook', shareFacebook));
    row.appendChild(mk('img', 'Image', shareImage));
    return row;
  }

  $('submitGuess').addEventListener('click', submitGuess);
  $('newGame').addEventListener('click', newGame);
  $('applySuggestion').addEventListener('click', () => {
    const raw = $('applySuggestion').dataset.rgb;
    if (!raw) return;
    const rgb = raw.split(',').map((n) => parseInt(n, 10));
    if (rgb.length === 3 && rgb.every((n) => n >= 0 && n <= 255)) {
      setGuess(rgb, 'apply');
    }
  });

  setGuess(parseHex($('colorPicker').value) || [128, 128, 128], 'picker');
  newGame();
})();
