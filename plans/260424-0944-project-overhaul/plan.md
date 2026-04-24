# Colordle Project Overhaul

Comprehensive cleanup + UX + feature pass on the static site.

## Decisions (pre-agreed, no debate)

- **Scoring metric:** keep sRGB Euclidean. Game is RGB-explicit — perceptual weighting adds complexity without matching the mental model.
- **Suggestion algo:** keep midpoint-of-widest-range. Comprehensible.
- **Daily puzzle:** seeded by `YYYY-MM-DD` UTC via mulberry32; track streak/history in localStorage.
- **Modularization:** ES modules via `<script type="module">`. No build step (GitHub Pages serves static).
- **Module split:** `messages.js`, `scoring.js`, `game.js`, `render.js`, `share.js`, `main.js`.
- **Dropped logic tweaks:** luma weighting, binary-search suggestion. Not worth the complexity.

## Waves

### Wave 1 (parallel, foundation)
- **W1-A modularizer** — split `app.js` into 6 modules; update `index.html` `<script>` to `type="module"`. No behavior change.
- **W1-B asset-optimizer** — compress `colordle_icon.png` (1.8 MB → target <50 KB).

### Wave 2 (parallel, enhancements)
- **W2-A polish** — owns `style.css` + `index.html <head>`. Meta tags (OG, description, theme-color), CSS custom properties, `:focus-visible`, colorblind chip icons, mobile tooltip fix, `prefers-reduced-motion`, animations.
- **W2-B features** — owns `index.html <body>`, `game.js`, `render.js`, `main.js`, `scoring.js` (seed PRNG). Hex input, Play-again button, localStorage persistence, daily puzzle, streak display.

## File ownership matrix

| File                | W1-A | W1-B | W2-A | W2-B |
|---------------------|------|------|------|------|
| app.js              | delete |    |      |      |
| colordle_icon.png   |      | edit |      |      |
| index.html `<head>` | edit* |    | edit |      |
| index.html `<body>` | edit* |    |      | edit |
| style.css           |      |      | edit |      |
| messages.js (new)   | create |    |      |      |
| scoring.js (new)    | create |    |      | edit |
| game.js (new)       | create |    |      | edit |
| render.js (new)     | create |    |      | edit |
| share.js (new)      | create |    |      |      |
| main.js (new)       | create |    |      | edit |

*W1-A only touches the `<script>` tag.

## Verification

After each wave: serve locally with `python3 -m http.server`, verify in browser via head-less render or visual inspection. Check console for module errors.

## Status

- [x] W1-A modularizer — 6 modules, node --check passes
- [x] W1-B asset-optimizer — 1.8 MB → 48 KB (256×256)
- [x] W2-A polish — CSS vars, focus-visible, glyph icons, reduced-motion
- [x] W2-B features — hex input, persistence, daily + streak, play-again
- [x] Final verification — all modules import cleanly, HTML structure intact
