"use client";

import { GameLayout, type GameContent } from "@/components/dueneo/game-layout";
import type { GameDefinition } from "@/data/games";
import { SudokuGame } from "./_sudoku-game";

export function Sudoku({ game }: { game: GameDefinition }) {
  const content: GameContent = {
    intro:
      "The classic 9×9 number puzzle. Fill every row, column and 3×3 box with the digits 1–9 — no repeats. Four difficulty levels, pencil notes for tough spots, and a hint button for when you're stuck. Your progress saves automatically in your browser.",
    game: <SudokuGame />,
    rules: (
      <div className="space-y-3">
        <p>
          The board is a 9×9 grid split into nine 3×3 boxes. Some cells start
          filled (the "clues"); the rest are empty. Your job is to fill every
          empty cell with a digit from 1 to 9 so that each row, each column and
          each 3×3 box contains every digit exactly once.
        </p>
        <p>
          Click a cell to select it, then click a number from the pad below
          (or press 1–9 on your keyboard) to fill it in. Use the arrow keys to
          move the selection. Toggle <strong>Notes</strong> mode (or press
          <kbd className="mx-1 rounded border bg-muted px-1.5 py-0.5 text-xs">N</kbd>)
          to pencil in candidate digits — small numbers in the corner of a cell
          that you can later confirm or erase.
        </p>
        <p>
          Use <strong>Hint</strong> to reveal the answer for one empty cell,
          <strong> Check</strong> to briefly highlight conflicts, and{" "}
          <strong>Reset</strong> to start the current puzzle over from scratch.
        </p>
      </div>
    ),
    tips: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Scan each row, column and box for "naked singles" — cells with only one possible candidate.</li>
        <li>Use Notes mode to track candidates in tough cells; eliminate them as peers get filled.</li>
        <li>Look for "hidden singles" — a digit that can only go in one cell within a row/col/box, even if the cell has other candidates.</li>
        <li>Start with Easy puzzles to learn patterns; Expert puzzles often require advanced techniques like X-Wing or naked pairs.</li>
      </ul>
    ),
    controls: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Click a cell to select; click a number (or press 1–9) to fill it.</li>
        <li>Arrow keys move the selection. Press <kbd className="rounded border bg-muted px-1 text-xs">N</kbd> to toggle Notes mode.</li>
        <li>Press <kbd className="rounded border bg-muted px-1 text-xs">Backspace</kbd> or <kbd className="rounded border bg-muted px-1 text-xs">0</kbd> to clear a cell.</li>
        <li>Switch difficulty from the Easy / Medium / Hard / Expert toggle to start a fresh puzzle.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my progress saved?",
        a: "Yes. The current board, your filled-in values, pencil notes, timer and difficulty are stored in localStorage and restored when you return. Clearing site data will lose your save.",
      },
      {
        q: "How is difficulty determined?",
        a: "By the number of starting clues: Easy ~40, Medium ~32, Hard ~27, Expert ~22. Fewer clues means more cells to deduce and tougher solving techniques are required.",
      },
      {
        q: "Are the puzzles guaranteed to have a unique solution?",
        a: "Yes. The generator only removes a clue if doing so still leaves exactly one valid solution.",
      },
      {
        q: "What does the Hint button do?",
        a: "It reveals the correct value for the first empty cell, taken from the solved answer. Use it sparingly — it counts as a help, not a clean solve.",
      },
    ],
  };

  return <GameLayout game={game} content={content} />;
}
