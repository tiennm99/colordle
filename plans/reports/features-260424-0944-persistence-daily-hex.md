# W2-B Features Implementation Report

## Files Modified

| File | Lines | Delta |
|------|-------|-------|
| index.html | 106 | +18 (meta tags, hex input, mode-switch, daily-badge, practiceControls id) |
| game.js | 317 | +145 (todayUtc, mulberry32/hashDate, dailyTarget, dailyNumber, newGame opts, saveState, loadState, clearState, loadStats, saveStats, recordDailyResult) |
| render.js | 318 | +117 (hex sync in setGuess, renderDailyBadge, renderModeControls, buildStatsLine, buildReplayButton; result card rebuilt via createElement to avoid innerHTML with dynamic strings; render() takes stats arg) |
| main.js | 196 | +119 (hexInput listeners, modeSwitch listeners, switchMode(), colordle:new-game handler, IIFE init with localStorage restore) |
| scoring.js | 25 | 0 (untouched) |
| messages.js | 135 | 0 (untouched) |

## New Exports (game.js)

- `todayUtc()` — YYYY-MM-DD UTC string
- `dailyTarget(dateStr)` — deterministic [r,g,b] from mulberry32(FNV-1a(date))
- `dailyNumber(dateStr)` — integer days since 2026-01-01
- `newGame(state, maxGuesses, opts)` — opts.mode / opts.dateStr added; backward-compatible (opts defaults to daily)
- `saveState(state)` / `loadState()` / `clearState()` — localStorage key `colordle:v1`
- `loadStats()` / `saveStats(stats)` / `recordDailyResult(stats, won, dateStr)` — localStorage key `colordle:stats:v1`

## Feature Checklist

- [x] Feature 1: `<head>` OG / twitter / theme-color / description meta tags
- [x] Feature 2: `#hexInput` `.hex-input`; setGuess syncs it (origin `'hex'` skips self); hex display uppercase; Enter submits
- [x] Feature 3: Play-again button `.play-again`; disabled + "Come back tomorrow" in daily mode; dispatches `colordle:new-game`
- [x] Feature 4: saveState after submitGuess / newGame / mode switch; loadState on init; daily restored if date matches, practice always valid
- [x] Feature 5: mode-switch `.mode-switch` with `aria-selected` toggling; daily badge `#dailyBadge` with puzzle number + streak; stats-line on daily result card; streak tracking via recordDailyResult (idempotent)
- [x] Feature 6: practice controls (`#practiceControls`) hidden in daily mode; max-guesses locked at 6 daily

## Syntax Check

```
node --check game.js    → OK
node --check render.js  → OK
node --check main.js    → OK
node --check scoring.js → OK
node --check messages.js→ OK
```

## UX Trade-offs

- `colordle:new-game` custom event decouples render.js from main.js (render doesn't import game init logic).
- result card rebuilt with `createElement` calls instead of `innerHTML` template literals — slightly more verbose but safe against any future dynamic content injected into `hex` strings.
- `render()` signature changed from `render(state)` to `render(state, stats)` — callers in main.js all pass `stats`; stats is undefined-safe (badge and stats-line guard with `&& stats`).
- Daily "Play again" button is rendered but disabled with text "Come back tomorrow" — keeps the UI shape consistent rather than hiding the button.
- On mode switch to daily, if a saved daily for today exists it is restored (preserves in-progress game); if not, a fresh puzzle starts.

## Unresolved Questions

None.
