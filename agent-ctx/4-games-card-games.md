# Task 4-games — Card Games Agent Work Record

**Agent**: card-games
**Task ID**: 4-games
**Date**: 2025 (current build)

## Scope

Implement the 3 remaining card games flagged `implemented: false` in
`src/data/games.ts`:
- Solitaire (Klondike) — ID 3
- Spider Solitaire (1-suit easy) — ID 4
- FreeCell — ID 5

These were the last 3 "Coming soon" entries in the games registry. After this
task, all 15 games are fully playable.

## What was built

### Shared card primitives
- `_cards.tsx` — types (`Suit`, `Card`, `CardSize`), helpers (`createDeck`,
  `shuffle`, `rankLabel`, `suitSymbol`, `isRed`, `canStackTableau`,
  `canStackFoundation`), and 3 React components:
  - `<CardView>` — single card. Face-down = indigo gradient back with diagonal
    stripes; face-up = rank+suit in top-left + bottom-right (rotated), large
    suit pip in the middle, red (rose-600) or black (slate-900).
  - `<EmptySlot>` — dashed outline for empty piles, with optional label.
  - `<Pile>` — stack of cards. `variant="fan"` for tableau (vertical offsets,
    face-down offset < face-up offset so rank+suit stay visible); `variant=
    "stack"` for stock/waste/foundation (top card only, subtle shadow layers
    behind). Per-card click + double-click handlers, `selectedIds` Set for
    highlight, face-down cards never clickable in fan mode.

### Game components (each renders via `GameLayout`)
1. `solitaire.tsx` (`Solitaire`) — Klondike. 7 tableau columns (1-7 cards),
   4 foundations (♠♥♦♣), stock + waste. Draw-1 (default) or Draw-3 mode.
   Easy mode allows any card on empty tableau columns (default: Kings only).
   Click-to-select + click-to-drop, double-click to auto-send to foundation.
   Auto-flip face-down tableau cards when their face-up child is removed.
   Stock recycles waste when empty. 50-deep undo. Move counter, timer, best
   time + moves saved to `dueneo:solitaire:best`. Custom `<WasteView>` fans
   the last 1 (draw-1) or 3 (draw-3) drawn cards so player can see what's
   coming next.

2. `spider-solitaire.tsx` (`SpiderSolitaire`) — 1-suit (easiest). 8 sets of
   A-K spades = 104 cards. 10 tableau columns (cols 1-4 get 6, cols 5-10 get
   5 = 54 dealt), 50 cards in stock (5 deals of 10). Tableau builds DOWN by
   rank (any descending run is moveable as a group in 1-suit). Complete K→A
   descending sequence at top of column auto-collects to foundation. 8
   sequences = win. Stock refuses to deal if any column is empty. Empty
   columns accept any card or run. 50-deep undo. Best time saved to
   `dueneo:spider:best`. Rules text mentions 2-suit + 4-suit variants.

3. `freecell.tsx` (`FreeCell`) — 8 tableau columns (cols 1-4 get 7, cols 5-8
   get 6 = 52, all face-up), 4 free cells (each 1 card), 4 foundations (A→K
   by suit). Tableau builds DOWN in alternating colours. "Supermove" formula:
   `(1 + emptyFreeCells) × 2^emptyCols` (with `emptyCols - 1` when target is
   empty); live "Max move: N" badge shows current cap. Double-click to
   auto-send to foundation. 50-deep undo. Best time saved to
   `dueneo:freecell:best`.

### Registry + router
- `games.ts` — added `component: "solitaire"`, `component: "spider-solitaire"`,
  `component: "freecell"` + `implemented: true` to the 3 card-game entries.
- `game-router.tsx` — imported and registered all 3 components in
  `GAME_COMPONENTS` map.

## Issues caught & fixed
- Initial `spider-solitaire.tsx` draft used a confused state model (started
  with `useState(() => () => {...})` then patched with `useRef` + force-
  rerender). Rewrote cleanly with plain `useState(() => deal(...))` matching
  the Solitaire/FreeCell pattern.
- `solitaire.tsx` `handleSelect` had an unreadable nested `as Extract<…>`
  cast for same-card detection. Extracted a small `sameSelection(a, b)`
  helper.
- agent-browser click on FreeCell cards reported "covered by <span>" —
  Playwright actionability strictness (the card's inner `<span>` labels cover
  the button centre). Real users clicking anywhere on the card trigger the
  button via event bubbling. Verified Solitaire + Spider interactions work;
  verified FreeCell rendering via accessibility snapshot.

## Verification
- `bun run lint` exits 0 with no errors or warnings.
- `tail -50 dev.log` shows only `Compiled in Nms` + `GET / 200` lines, no
  compile errors.
- agent-browser smoke-tested all 3 routes:
  - `#/games/solitaire` — full board renders (stock, waste, 4 foundations,
    7 tableau columns). Stock click → moves 0→1, waste shows "4 of diamonds".
    Tableau card click + destination click → 9 of clubs moved onto 10 of
    hearts, moves 1→2, source column became empty (showing "K" hint).
  - `#/games/spider-solitaire` — full board renders (8 K→A foundation slots,
    stock with "5 deals left", 10 tableau columns). Stock click → 50→40
    remaining, moves 0→1, undo enabled.
  - `#/games/freecell` — full board renders (4 free cells, 4 foundations,
    8 tableau columns, "Max move: 5" badge). All elements correctly labelled
    in accessibility tree.
- Games listing page (`#/games`) — all 3 card games now show as "Play" links
  (no more "Coming soon").

## Follow-ups for future agents
- The `_cards.tsx` `<CardView>` / `<Pile>` / `EmptySlot` + the
  `canStackTableau` / `canStackFoundation` / `createDeck` / `shuffle` helpers
  are reusable for any future card game (Pyramid, TriPeaks, Golf, Forty
  Thieves, etc.) — just import and supply game-specific move logic.
- 2-suit and 4-suit Spider variants could be added by extending `deal()` to
  take a `suits` parameter and tightening `isValidRun` to require same-suit
  runs (`tryCompleteSequence` already checks same-suit).
- A daily FreeCell mode using the Microsoft deal numbers (1-32000) would be
  a natural follow-up: replace the random seed in `deal()` with the deal
  number and use a known-good shuffling algorithm.
