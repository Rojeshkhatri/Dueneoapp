# Task 2-h — Games Agent Work Record

**Agent**: games
**Task ID**: 2-h
**Date**: 2025 (current build)

## Scope

Implement 12 classic games flagged `implemented: true` in `src/data/games.ts`:
Sudoku, Daily Sudoku, Minesweeper, 2048, Word Search, Hangman, Memory Match,
Connect Four, Tic-Tac-Toe, Checkers, Reversi, Scribble.

(Solitaire / Spider Solitaire / FreeCell, IDs 3-5, were left to a future task —
they need a shared card engine with drag-and-drop that's outside this task's
scope.)

## What was built

### Shared helpers
- `_game-helpers.ts` — `makeRng` (mulberry32), `hashString` (FNV-1a),
  `todayKey` (YYYY-MM-DD), `readLocal`/`writeLocal`/`removeLocal` (try-catch
  wrappers), `formatTime`, `pickRandom`, `shuffle` (Fisher-Yates),
  `checkWin`/`winningLines` (generic N×N win detector).
- `_sudoku-engine.ts` — pure-logic Sudoku: `solve` (backtracking),
  `countSolutions` (capped), `generateSolved` (randomised), `makePuzzle`
  (hole-punching with uniqueness check + maxIter cap),
  `generatePuzzleSeeded` (mulberry32 swap-in for daily), `conflicts`,
  `isComplete`, `hint`.
- `_sudoku-game.tsx` — shared interactive board used by both Sudoku and
  Daily Sudoku. Cell selection (click or arrow keys), number input (1–9),
  Notes mode (press `N`), Erase, Hint, Check (3s conflict highlight),
  Reset, timer, completion toast, localStorage auto-save (skipped for
  seeded puzzles).

### Game components (each renders via `GameLayout`)
1. `tic-tac-toe.tsx` — 3 modes (friend / AI Easy random+heuristic / AI Hard
   minimax+alphabeta, unbeatable). Winning line highlighted. Score tally.
2. `connect-four.tsx` — 7×6. 3 modes. AI Hard = minimax depth 4 with
   positional 4-window scoring. Win detection in all 4 directions. Winning
   cells ringed amber.
3. `2048.tsx` — Arrow keys + WASD + swipe + on-screen arrow pad. Score +
   best score in localStorage. Win banner at 2048 with "Keep going".
   Game-over overlay. New game button.
4. `memory-match.tsx` — 3 sizes (2×4 / 4×4 / 6×6, 4/8/18 pairs). 32-emoji
   pool. Move counter, timer, best time per size in localStorage. Auto-resolve
   matches after 350ms; non-matches flip back after 800ms.
5. `hangman.tsx` — 4 categories × 24 words = 96 total. On-screen A–Z + physical
   keyboard. SVG gallows grows head→body→arms→legs (max 6 wrong). Win/lose
   toast. New word / Give up / Switch category.
6. `minesweeper.tsx` — Easy 9×9/10, Medium 16×16/40, Hard 16×30/99. First
   click always safe (mines placed after, 3×3 safe zone). Flood-fill stack.
   Left-click reveal, right-click flag, chord-click on numbers. Mobile flag
   mode toggle. Mine counter, timer, smiley reset.
7. `sudoku.tsx` — thin wrapper around `<SudokuGame />`. 4 difficulties
   (Easy 40 clues / Medium 32 / Hard 27 / Expert 22).
8. `daily-sudoku.tsx` — `<SudokuGame seed={hashString(today)} fixedDifficulty="medium" hideDifficulty onCompleted={…} />`.
   Date display + "Already solved today" badge persisted to localStorage
   per date.
9. `word-search.tsx` — 10×10 or 12×12 grid, 3 themes (Animals/Fruits/
   Countries). All 8 directions, forwards/backwards, intersecting words
   share letters. Click-drag (desktop) or tap-first-then-tap-last (mobile).
   Found words highlighted green and crossed off. Timer.
10. `reversi.tsx` — 8×8 Othello. 3 modes. AI Hard = 3-ply minimax with
    positional weights + mobility. Auto-pass when no legal move. Disc
    counter, turn indicator, win/draw detection.
11. `checkers.tsx` — American draughts. Diagonal moves, mandatory captures,
    multi-jumps (locked piece), kings (crown icon, any direction). 3 modes.
    AI Hard = 4-ply minimax with material + position evaluation. Highlighted
    movable pieces + legal destinations. Win = no pieces or no legal moves.
12. `scribble.tsx` — `<canvas>` drawing pad. Pen / Eraser / 12-colour palette
    / brush-size slider 1–40px / Undo (per-stroke) / Clear / Download PNG.
    Pointer Events for unified mouse/touch/stylus. DPR-aware 4:3 canvas.

## Registration

All 12 components registered in `src/components/games/game-router.tsx` under
keys matching the registry's `component` field:
`tic-tac-toe`, `connect-four`, `2048`, `memory-match`, `hangman`,
`minesweeper`, `sudoku`, `daily-sudoku`, `word-search`, `reversi`,
`checkers`, `scribble`.

## Issues hit and fixed

1. `React.useState` shadowed by inner `useState` helper in hangman.tsx → removed.
2. 11 unused `eslint-disable-next-line react-hooks/exhaustive-deps` directives
   (rule is disabled in project config) → stripped via perl one-liner.
3. `react-hooks/immutability` rule flagged ref mutations in scribble.tsx →
   refactored to a clean `useCallback` chain (redraw→setupCanvas→resize effect),
   no refs needed.
4. `react-hooks/immutability` flagged "Cannot access variable before declared"
   for `placeNumber` in `_sudoku-game.tsx` → moved function declaration above
   the useEffect that uses it; added `state.puzzle` to deps.
5. Daily Sudoku completion detection via MutationObserver → replaced with
   `onCompleted?: () => void` prop on `SudokuGame`.
6. `drawingRef = React useRefStrokeRef<…>` typo in scribble.tsx → fixed to
   `React.useRef<Stroke | null>(null)`.
7. Dead `forceRedraw` reducer in scribble.tsx → removed.

## Verification

- `bun run lint` → 0 errors, 0 warnings.
- `tail dev.log` → only `Compiled in Nms` and `GET / 200` lines, no errors.
- `curl http://127.0.0.1:81/` → HTTP 200.
- `bun build src/components/games/game-router.tsx` → 120 modules bundled,
  0.53 MB, no errors.
- All 12 games reachable via `#/games/<slug>` (the 3 unimplemented card games
  still show their not-found page).

## Notes for future agents

- The 3 unimplemented games (Solitaire, Spider Solitaire, FreeCell) need a
  shared card-engine component with drag-and-drop. IDs 3-5 in `games.ts`.
- `_sudoku-engine.ts` and `_sudoku-game.tsx` are reusable for Sudoku variants.
- `_game-helpers.ts` `makeRng`/`hashString`/`todayKey` is reusable for any
  future daily-mode game.
