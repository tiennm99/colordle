# Colordle UI/UX Review — Post Hints-Toggle

Date: 2026-04-24
Scope: vanilla HTML/CSS/JS static site. Dark theme (locked). No build step. No framework swaps.
Files reviewed: `index.html`, `style.css`, `render.js`, `main.js`, `game.js`.

---

## 1. First-impression verdict

Polish is **above-average-indie** — noticeably better than a weekend clone, clearly below a Wordle-NYT tier finish. The palette is confident, the channel chips are legible, the tick-marked range bars are genuinely clever, and the dark theme reads as intentional not lazy. What holds it back: the header is busy (four separate widgets fighting for the same row), the input bar wraps awkwardly in a narrow viewport band, and the new hints toggle currently lives in a section whose framing ("Hints panel", footer note about "Possible target") leaks slightly when the body is collapsed — creating a half-second "wait, where is it?" moment for first-time players. Typography is system-stack and fine; it doesn't *sing*, but for a color-centric game that's arguably correct (don't compete with the hero swatch). Overall: a tidy, thoughtful product with ~4-6 concrete rough edges to sand.

---

## 2. Hints toggle — the recent change

### Tempting-but-resistible?

Mostly yes, with a caveat.

**What works:**
- Collapsed state shows a pill button with a right-pointing caret + "Show hints" label. That's the right visual — inviting but clearly optional.
- Expanded state changes both the border and text color to `--c-exact` (#1fd17a). The color shift doubles as confirmation ("hints are ON") and as a subtle "you're in assist mode" flag. This is a nice touch — the green hints-on chrome gives an honest reward-signal for cheating-yourself-a-bit.
- The help chip `?` next to it provides the "this is what you're turning on" disclosure without forcing expansion.
- Persistence across sessions via `prefs.hintsVisible` is correct — don't re-ask every session.

**What weakens the temptation:**
- The button sits inside a bordered card (`.possible`) that has padding even when collapsed. An empty framed container for a single pill looks like **the component didn't finish loading**. A first-time player may not realize this is interactive — the bordered frame reads as "info container", not "call-to-action". Consider: when collapsed, either (a) remove the card chrome and show just the naked pill + help chip inline, or (b) lean into the frame by adding a one-line teaser like "Need a nudge? Reveal the feasible-range bars." The current middle-ground is the weakest option.
- The pill is the same visual weight as other buttons in the app (Guess, New puzzle). It doesn't pop. Since you explicitly want it to "still pop into their eyes", consider a slight treatment bump: a subtle border color accent (maybe `--ch-g` or a desaturated `--c-exact`) or a tiny glyph (💡 / lightbulb) in place of the caret when collapsed. Keep it restrained — this is a suggestion, not a billboard.

### Expanded / collapsed state clarity

- Caret rotates 90° (right → down) on expand. Good, conventional.
- Label swaps "Show hints" ↔ "Hide hints". Good, explicit.
- Border + text color flip to exact-green. Good, but *only* visible if you know the collapsed color. First-timer has nothing to compare against. Not a problem — the label text carries the meaning. But don't rely on the color alone.

### Better placements / labels / treatments

1. **Placement** — current location (between input and history) is correct. Don't move it to the header (crowded) or the footer (off-screen on mobile). Right where it is.
2. **Label options** worth A/B-ing:
   - "Show hints" (current) — clear.
   - "Reveal hints" — slightly more tempting, connotes uncovering something.
   - "Show feasible ranges" — more specific but overshoots for novices.
   - "Need a hint?" — too cute, undersells the tool.
   - **Recommend:** keep "Show hints" / "Hide hints". It's fine.
3. **Treatment** — consider a subtle pulsing or fade-in *only on the very first game* (track via prefs), to announce its existence once and never again. If that's too much engineering for the ROI, skip it.
4. **Keyboard hint** — the button isn't keyboard-shortcut'd. Not required, but a `?` hotkey or `H` hotkey would be a nice power-user touch. Very low priority.

### Does hiding-by-default hurt first-time players?

Slightly, yes. The footer says "The **Possible target** bars narrow as you guess" — but if the user's first read of the page has the bars hidden, that sentence describes something invisible. Mitigation:
- Footer copy should either reference the toggle ("Turn on **Show hints** to see feasible-range bars that narrow as you guess") or be shortened/removed when hints are off.
- The help `?` chip already exists and explains the system well. The copy is good — "Leave hints off for a pure challenge" lands the tone. But the chip is 16×16px, which is below the 24px+ recommended target for tooltip triggers (see §4).
- Consider showing the hints-section *auto-expanded on guess #2* if the user has `hintsVisible: false` AND it's their first-ever game (track in prefs). Lowers the onboarding cliff without undermining challenge mode.

Verdict on the toggle: **B+ execution**. It does the job; the empty-card-when-collapsed moment is the biggest issue and is a 15-minute fix.

---

## 3. Information hierarchy

### What draws the eye first?

The **target swatch** — correct. It's 180px tall, full-width, with a prominent "?" glyph at 5rem. That's the hero, and it should be. Full marks.

### Second focal point?

Competition between:
- Header title ("Colordle" + icon at 1.75rem) — top-of-page anchor.
- Mode switch pill (daily/practice) — high-saturation active state.
- Daily badge ("Colordle #N · Streak N") — monospace pill.

Three elements in the header row roughly equally weighted. This is the biggest hierarchy issue. The daily badge is *supplementary info* but its pill shape and monospace font make it visually assertive. The mode switch is a *control*, which has more legitimate claim to visual weight. Currently the badge and switch fight.

**Fix options:**
- De-emphasize the daily badge: smaller font (0.7rem), thinner border, maybe drop the pill border entirely and let it be plain text with a `·` separator.
- Put daily badge and streak *below* the header as a sub-line under the target swatch counter. e.g. replace "Guess 0 / 6" with "Colordle #42 · Guess 0/6 · Streak 3". One line, one hierarchy.

### Third focal point?

The input section card. Good — that's where the user acts. The color picker's 44×44 swatch is visually strong (which is correct), but the guess-preview swatch (also 44×44, right next to the submit button) is **also** strong. Two equal-weight color squares straddling the text inputs create a visual bookend effect that's fine, borderline busy.

### Header clutter

Count: logo icon + "Colordle" text + mode switch (2 buttons) + daily badge (3 spans) + practice controls (input + button, hidden in daily but present in DOM). Even with `hidden`, on mobile the flex wrap produces a multi-line header that feels dense. This is the #1 visual-polish issue IMO.

**Recommended simplification:**
- Row 1: logo + title (left) + mode switch (right). That's it.
- Row 2 (optional, below target swatch): daily badge inline with counter.
- Practice controls: move into the hints-panel-style collapsed area, or show only when mode=practice AND stay in row 2.

This single restructure probably moves the "polish" needle more than any other change.

---

## 4. Accessibility

### Focus-visible

- `button`, `input`, `.help-chip`, `.poss-apply`, `.play-again`, `.share-btn` all have `:focus-visible` with a 2px green ring. Solid coverage.
- **Gap:** `.mode-switch button` inherits the generic `button:focus-visible`, which gives a full ring — but the button sits inside a rounded pill container, and a square ring on a pill button will look off. Verify visually; may need a custom ring-matching-border-radius override.
- **Gap:** the target swatch has `aria-label="Target color"` but no `tabindex`, so it's never focusable. Fine — it's not interactive.
- **Gap:** history rows aren't focusable. That's correct (they're read-only).
- **Gap:** the `.help-chip` is `tabindex="0"` (focusable), but hover/focus trigger the tooltip via sibling selector `.help-chip:focus ~ .help-tooltip`. That works for keyboard users. Good.

### ARIA correctness

- `aria-expanded` on `#hintsToggle` + `aria-controls="hintsBody"` — **correct**. This is the textbook pattern for a disclosure widget.
- `role="tablist"` / `role="tab"` on `.mode-switch` — **questionable**. True tabs imply a tab *panel* is being switched. Here the whole page changes state. `role="group"` with `aria-pressed` on each button, or a radio-group pattern, fits better. Not wrong enough to urgently fix; Wordle-style mode switches often use this same loose pattern.
- The hints tooltip has `role="tooltip"`, but it's not `aria-describedby`'d from the `.help-chip`. Screen readers may not announce it when the chip is focused. Add `aria-describedby="helpTooltipId"` on the chip and give the tooltip an `id`.
- `aria-live="polite"` on `#history` — good. New guess rows will be announced.
- **Gap:** `#result` has no `aria-live`. Win/loss announcement may be missed. Add `aria-live="polite"` or `aria-live="assertive"` (probably polite — the result isn't time-critical).
- **Gap:** the `.invalid` class on RGB inputs adds a red border but no `aria-invalid="true"`. Add it.

### Color contrast (channel chips)

Spot-check:
- `.channel.red` = #d64545 bg, #fff text → contrast ratio ~4.2:1 on 14px text. **Just under AA for normal text (needs 4.5:1)**. Fails strictly. Bump to #cf3a3a or darken, or bold the text (channel-main is already `font-weight: 700`, which helps but doesn't flip the ratio).
- `.channel.yellow` = #e2b93b bg, #1a1a1a text → ~9.5:1. Excellent.
- `.channel.green` = #46b04a bg, #0a0a0a text → ~6.5:1. Good.
- `.channel.exact` = #1fd17a bg, #0a0a0a text → ~9:1. Excellent.
- `.chip.red` in the legend — same issue, same fix.

The `.channel-range` caption is at 0.68rem with `opacity: 0.85`. On the red background that's **~3.5:1** effective — fails AA for small text, fails AAA-large. Remove the opacity-0.85 on colored backgrounds, or raise it to 0.95, or use a darker red background.

The red-on-red inset shadow on `.channel.exact` (`box-shadow: 0 0 0 2px #fff8`) is a nice emphasis touch.

### Screen reader experience

- Reading order (top-to-bottom DOM): header → target → input → hints panel → history → result → footer. **Reasonable.**
- Input section: color picker + hex + 3 RGB inputs + preview + submit. A screen reader user tabbing through will hit the picker first. That's odd — most keyboard users will want hex or RGB first. Consider reordering so the **hex input is the first focusable item** in the input section, with the color picker after (or visually first but with `tabindex` override — ugly, don't).
- Guess preview has `aria-label="Current guess preview"` — good, but it conveys only "preview" without the color value. When the user types, screen readers don't know the preview changed. The `title` attribute is set to the hex (good) but `title` is not reliably announced. Consider updating an `aria-label` or live region with the hex on change.
- Mode switch: `aria-selected` updates correctly in render.js. Good.
- The daily badge has no label beyond the visible text, which is fine.

### Touch target sizes

- Pill buttons in mode switch: `padding: 0.3rem 0.8rem` ≈ 30-34px tall. **Below 44×44 minimum.**
- `.help-chip` at 16×16px. **Way below.** This is the worst offender. Bump to 24×24px minimum, better 28×28px, and increase the hit area via invisible padding if visual size must stay small.
- `.hints-toggle` at `padding: 0.35rem 0.7rem` ≈ 32px tall. **Below 44.**
- `.poss-apply` (midpoint suggestion) same — ~32px tall.
- Tick marks on range bars: 2px wide. Not tappable. The `pointer-events: auto` on `.poss-tick` with a `title` means they're hover-hint-only. That's fine. Maybe widen to 4-6px for easier hover on desktop + finger hit on touch. Low priority.
- Share buttons: `padding: 0.4rem 0.9rem` ≈ 34px tall. Below 44.
- Swatches (`.swatch.small` at 44×44 in history rows) — good.
- Color picker + guess preview (44×44) — good.

**Pattern:** most buttons are ~32-34px tall. Bumping padding from `0.35rem 0.7rem` to `0.55rem 0.9rem` globally on interactive pills gets most to 44px without significant visual impact. This is a high-ROI change.

---

## 5. Mobile responsiveness

### Breakpoint review

Single breakpoint at `max-width: 480px`. That's aggressive. Potential issues in the 481-640px band:

- Header wraps at some point because of `flex-wrap: wrap` + 4 children. I suspect at ~520px the mode-switch drops to a second line. Manageable, but the daily badge's `hidden` attribute in daily mode + visible in daily means the layout *changes* depending on mode. Test both.
- Input section has **6 controls** (picker, hex, 3 RGB, preview, submit = 7, actually). With gap `0.6rem` and typical widths (44 + 88 + 3×51 + 44 + ~80 = 409px + gaps), it fits at ~480px+. Below 480, it wraps. The wrap is not graceful — the hex input goes to line 2, leaving the picker alone at line 1.
- **Recommend** explicit mobile stacking: at `max-width: 480px`, make `.input` `flex-direction: column` for the first three children (picker+hex row, RGB row, preview+submit row), or use an intermediate `max-width: 540px` breakpoint to start softening the layout.

### Specific squishing risks

- `.counter` is center-aligned, short — fine.
- The target swatch shrinks to 140px on mobile — good.
- `.poss-track` uses `flex: 1` + `min-width: 0` — should collapse gracefully. But the `.poss-hint` min-width of 4.5rem (= ~72px) may steal too much horizontal room on narrow screens, leaving the track very short. At 320px viewport: 320 - 32 (body padding) - 32 (card padding) - 18 (label) - 72 (hint) ≈ 166px track. Workable, tight.
- `.channels` has `flex-wrap: wrap`. On mobile, channels wrap below the hex — good. `margin-left: auto` is neutralized on mobile via the 480px media query. Good.
- `.share-row` wraps fine.

### Overflow risks

- `.hex-input` at `width: 5.5rem` (88px) — fine.
- `#maxGuesses` at 4.5rem — fine.
- `.help-tooltip` is `width: min(340px, 90vw)` — excellent responsive pattern. Pinned right on mobile to avoid viewport overflow.
- The target swatch "?" at 5rem font-size on a 140px-tall mobile swatch — the "?" is ~80px tall. Fits with ~30px vertical padding each side. Tight but OK.

**Main mobile concern:** the 481-540px band. That's a real range (some Androids, landscape iPhone SE). Add a softening breakpoint.

---

## 6. Visual polish

### Typography

- System stack. Fine for a non-brand-heavy utility game.
- `letter-spacing: 0.02em` on h1 is a nice touch.
- Monospace for all hex / RGB / channel text — correct, aids scanning.
- `font-variant-numeric: tabular-nums` on `.counter` and `.stats-line .stat-value` — excellent, stops numbers from jiggling.
- **Missing:** tabular-nums on `.channel-main` and `.channel-range`. The channel values (0-255) change each guess; non-tabular nums will shift pixel-positions. Add it.
- **Missing:** on `.hex` in history rows. Same issue.
- Type scale: h1 1.75rem, h2 (result) ~1.5rem (browser default), body 1rem, small 0.82rem, tiny 0.68-0.78rem. Reasonable but the jump from 1rem to 0.68rem for `.channel-range` is steep. Consider 0.72rem minimum.

### Color palette feedback

Dark theme hex-by-hex:
- `--bg: #161616` — clean near-black. Good.
- `--bg-elev-1: #1d1d1d` / `--bg-elev-2: #262626` — 9 and 16 unit steps. Could benefit from slightly more contrast between elev-1 and elev-2; currently they're close enough that the visual layering is subtle. Consider `--bg-elev-2: #2a2a2a`.
- `--border: #2a2a2a` — identical to the suggested `--bg-elev-2`. This is why the elevation layering feels flat: borders and fills are the same tone. Keep border at `#2a2a2a`, push bg-elev-2 to `#2e2e2e`.
- `--c-red: #d64545` — see accessibility note. Consider `#cc3838` for contrast.
- `--c-yellow: #e2b93b` — warm, readable. Good.
- `--c-green: #46b04a` vs `--c-exact: #1fd17a` — good separation. Exact reads brighter/fresher, which is correct (exact is better than green).
- `--ch-r / --ch-g / --ch-b` (#ff6b6b, #5ad884, #6fa0ff) — used as label accent + bar gradient endpoint. Harmonious trio. The blue is slightly lighter than the red and green — intentional? It reads fine.

**Suggestion:** the bar gradients (`linear-gradient(to right, #4a1d1d, var(--ch-r))`) are a great detail. The feasible-range bar feels *alive*. Keep.

### Motion

- `guess-row-in` keyframe (180ms ease-out, translateY 4px + opacity 0→1). Subtle, good.
- Caret rotation on hints toggle (180ms ease). Good.
- Tooltip scale + opacity transition with a slightly over-easing cubic-bezier(0.2, 0.85, 0.25, 1.25) — nice, feels springy.
- Share button `transform: translateY(-1px)` on hover — classic. Fine.
- `@media (prefers-reduced-motion: reduce)` kills all `transition` and `animation`. Global `!important` nuke. Correct and respectful.

**Missing motion:** when a guess resolves, the channel chips appear at full opacity immediately (the row fades in, but the chips don't *reveal*). Wordle has sequential tile reveals. Not essential but would add delight. Low priority and could annoy — test before committing.

### Shadows, radii, borders

- Radii: `--radius: 8px`, `--radius-sm: 6px`, various one-offs (4px, 5px, 999px). Consistent enough, but 5px on `.channel` and `.nearness` while `.chip` uses 4px — two values doing the same job. Pick one (recommend 5px, slightly softer).
- `.swatch` uses 10px, which is a one-off. Fine — the hero can have its own radius.
- Shadows: `inset 0 0 0 1px #0006` on target swatch; `0 0 0 1px #000a` on tick marks; `0 12px 30px #000c` on tooltip. No elevation system per se, but each usage is purposeful. OK.
- Borders: `--border` for containers, `--border-strong` for interactive controls. Clean distinction.

**Inconsistency:** `.play-again` uses `border: 1px solid #1aae66` (a one-off hex) instead of `var(--c-exact)` or a derived variable. Extract to a variable or use `color-mix(in srgb, var(--c-exact), black 15%)` if keeping the darker shade.

---

## 7. Copy & micro-interactions

### Flavor text (MESSAGES)

Not read directly (in `messages.js`) — trusting the prompt description. The report says the library is rich. Varied success/fail copy based on guess count or nearness% is great for replay feel. My only concern: make sure the copy scales down gracefully for screen readers (no pure-emoji messages, no ASCII art that reads terribly aloud). If all messages are plain text, skip this concern.

### Tooltip copy (hints panel `?`)

> "Hints show where the target can still be, after combining every guess so far. Each bar spans 0–255 for a channel; the **highlighted** segment is the feasible region. Tick marks are your past guess values. Hit **Try midpoint** for the middle of the widest remaining range. Leave hints off for a pure challenge."

Assessment: **good but slightly long**. 5 sentences for a tooltip is borderline. For the novice this is exactly the right amount; for a return visitor it's more than needed. Consider a two-tier approach:
- Short first sentence: "Hints show where the target can still be."
- Rest collapsed under a "More" link inside the tooltip, or simply trimmed.

Alternatively, keep it as-is and trust that users who hover the `?` want depth. Defensible.

**Minor copy edits:**
- "after combining every guess so far" → "based on your guesses so far" (simpler).
- "Hit **Try midpoint**" → "Tap **Try midpoint**" (mobile-friendly verb, works on desktop too).

### Error states — `.invalid` on RGB inputs

Current: `border-color: #c44`. Just a red border. No icon, no help text.

Assessment:
- Visually clear. Color-reliant but OK since the border is structural change, not just hue.
- **Missing:** no screen-reader cue. Add `aria-invalid="true"` when the class is applied (see §4).
- **Missing:** no textual explanation. If a user types "300", they see a red border but no "Values must be 0-255" message. Consider a single shared `.input-error` live region below the RGB group that fills with the reason on failure.
- **Missing:** the invalid class is only applied on submit (main.js line 43) or on input when parsing fails (line 155). The UX is reactive, not preventive. Not a problem — Wordle-style games typically validate on action, not keystroke. Keep.

Low priority overall; the current error state is functional.

### Header microinteractions

- Mode switch transition: none explicit. Clicking a mode has no animated state transfer (the active background just pops). Fine.
- Practice controls show/hide via `hidden` attribute — no transition. Might feel abrupt. `.practice-controls { transition: opacity 180ms; }` + `opacity: 0` on hide would smooth it, but CSS transitions don't work with `hidden`. Low priority.

### Result section entrance

- `.result` uses `hidden` attribute, no transition. When the final guess resolves, the result card appears instantly. Could benefit from the same `guess-row-in` animation (or a slightly longer variant). Small touch, high emotional payoff at the win moment.

---

## 8. Top 5 suggestions, prioritized

### 1. Declutter the header (highest impact)
**Why:** header has 4 competing elements (title, mode switch, daily badge, practice controls). Collapsing to 2 per row and relocating the daily badge under the target swatch counter immediately improves visual hierarchy and reduces mobile wrap awkwardness. Single largest polish win.

### 2. Fix channel-chip contrast (accessibility blocker)
**Why:** `.channel.red` at #d64545 with white text clocks ~4.2:1, below WCAG AA. Channel-range caption at 0.68rem with 0.85 opacity is worse. Darken the red background to ~#cc3838 and remove the opacity dim on colored chips. Low effort, fixes a real a11y gap.

### 3. Bump interactive target sizes to 44×44 minimum (mobile UX)
**Why:** help-chip (16×16), mode-switch buttons (~32px tall), hints-toggle (~32px tall), share buttons (~34px tall) all fall short. Increase vertical padding on pill-style buttons globally to reach 44px. Help-chip needs an invisible hit area expansion. Tangibly improves mobile feel.

### 4. Polish the hints-toggle collapsed state (the new-feature request)
**Why:** the empty bordered card housing a single pill reads as "loading" or "broken". Two options: (a) strip the card chrome when collapsed, or (b) add a one-line teaser inside the card to give the frame content. Plus consider a subtle one-time pulse for first-time players so it announces itself once. Directly addresses the "tempting but resistible" goal.

### 5. Add tabular-nums to mutable numeric text + add `aria-live` + `aria-invalid` (polish + a11y combo)
**Why:** `font-variant-numeric: tabular-nums` on `.channel-main`, `.channel-range`, `.hex` stops numeric jiggle between guesses — a subtle but noticeable feel improvement. Adding `aria-live="polite"` on `#result` and `aria-invalid` syncing with the `.invalid` class closes two screen-reader gaps. Small diff, disproportionate polish.

---

## Unresolved questions

- Should the hints panel auto-expand on a first-ever session to teach the feature? (Onboarding trade-off — may undermine challenge-first intent.)
- Is `role="tablist"` intentional on the mode switch, or would `radiogroup` / `aria-pressed` be preferred? (Spec argues against it; current usage is conventional.)
- Tick marks at 2px width — is hover-hint on desktop a priority, or are they purely visual reference? (Affects whether to widen them.)
- Is there appetite for a one-time "welcome dialog" for first-ever visitors? (Would relieve pressure on the tooltip to do onboarding.)
- Are any share buttons (X, FB, img) going to remain, or is the landscape changing? (Affects how much polish effort to spend on `.share-row`.)

---

**Status:** DONE
**Summary:** Review delivered with 5 prioritized recommendations. Hints toggle is B+ execution; main wins are header decluttering, contrast fixes on channel chips, and interactive target-size bumps.
