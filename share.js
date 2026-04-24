// Share functionality: canvas image generation, social share buttons
import { rgbToHex } from './game.js';
import { bestGuess } from './scoring.js';

// Preload icon for share image — resolves true/false depending on load success
const iconImage = new Image();
iconImage.crossOrigin = 'anonymous';
iconImage.src = 'colordle_icon.png';
export const iconReady = new Promise((resolve) => {
  iconImage.addEventListener('load', () => resolve(true), { once: true });
  iconImage.addEventListener('error', () => resolve(false), { once: true });
});

// Builds a plain-object summary of current game state for share functions
function shareContext(state) {
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

// Returns the one-line text summary used in social shares
function shareSummary(ctx) {
  if (ctx.won) {
    return `I solved Colordle in ${ctx.guesses} ${
      ctx.guesses === 1 ? 'guess' : 'guesses'
    }! 🎨`;
  }
  return `Colordle got me this time — closest guess was ${ctx.bestPct}% after ${ctx.guesses} tries. 🎨`;
}

// Opens url in new tab, falling back to location redirect if pop-up was blocked
function openShareWindow(url) {
  const w = window.open(url, '_blank');
  if (!w) window.location.href = url;
}

function shareX(state) {
  const ctx = shareContext(state);
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

// Draws and returns an HTMLCanvasElement with the result image
async function drawResultImage(state, skipIcon = false) {
  const ctx = shareContext(state);
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

  // Result pill — well below the RGB numbers under the swatches
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

// Returns a Promise<Blob> from a canvas element
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

// Shares or downloads the result image; falls back to download if Web Share API unavailable
async function shareImage(state) {
  let blob;
  try {
    const canvas = await drawResultImage(state, false);
    blob = await canvasToBlob(canvas);
  } catch (err) {
    // Tainted canvas (e.g. file:// origin or CORS-less icon host).
    // Redraw without the icon and try again.
    if (String(err && err.name) === 'SecurityError' ||
        /tainted/i.test(String(err && err.message))) {
      console.warn('Share image tainted by icon — regenerating without it.', err);
      const fallback = await drawResultImage(state, true);
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
        text: shareSummary(shareContext(state)),
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

// Builds and returns the share button row DOM element
export function buildShareRow(state) {
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

  row.appendChild(mk('x', 'X', () => shareX(state)));
  row.appendChild(mk('fb', 'Facebook', () => shareFacebook()));
  row.appendChild(mk('img', 'Image', () => shareImage(state)));
  return row;
}
