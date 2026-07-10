"use client";

import * as React from "react";
import { GameLayout, type GameContent } from "@/components/dueneo/game-layout";
import type { GameDefinition } from "@/data/games";
import { SudokuGame } from "./_sudoku-game";
import { todayKey, hashString, readLocal, writeLocal } from "./_game-helpers";
import { CalendarDays } from "lucide-react";

/**
 * Daily Sudoku: a date-seeded puzzle shared by every visitor on the same day.
 *
 * The seed is derived from today's YYYY-MM-DD string so the same puzzle is
 * generated everywhere. Completion state is stored locally per date so a
 * visitor can return and see "Solved" if they already finished.
 */
export function DailySudoku({ game }: { game: GameDefinition }) {
  const date = todayKey();
  const seed = hashString(date);
  const completedKey = `dueneo:daily-sudoku:done:${date}`;
  const [alreadyDone, setAlreadyDone] = React.useState<boolean>(() => readLocal<boolean>(completedKey, false));

  const onCompleted = React.useCallback(() => {
    writeLocal(completedKey, true);
    setAlreadyDone(true);
  }, [completedKey]);

  const content: GameContent = {
    intro:
      "Today's Sudoku, served fresh from a date-seeded generator. Every visitor who lands on this page on the same day gets the exact same puzzle — solve it, then come back tomorrow for a new one. The puzzle is generated locally so there's no server round-trip.",
    game: (
      <div>
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span>{new Date(date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
          {alreadyDone && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600">
              Already solved today
            </span>
          )}
        </div>
        <SudokuGame
          seed={seed}
          fixedDifficulty="medium"
          hideDifficulty
          dateLabel="Today"
          onCompleted={onCompleted}
        />
      </div>
    ),
    rules: (
      <div className="space-y-3">
        <p>
          Daily Sudoku follows the same rules as standard Sudoku: fill every
          row, column and 3×3 box with the digits 1–9 so that no digit repeats
          within a row, column or box.
        </p>
        <p>
          The puzzle is generated from a seed derived from today's date
          (YYYY-MM-DD), so every player on Earth gets the identical grid today.
          Come back tomorrow — the seed rolls over at midnight local time and a
          brand new puzzle appears.
        </p>
        <p>
          Difficulty is fixed at <strong>Medium</strong> for the daily. If you
          want easier or harder puzzles, head to the regular{" "}
          <a href="/games/sudoku/" className="text-primary underline">Sudoku</a>{" "}
          page.
        </p>
      </div>
    ),
    tips: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Daily puzzles make great warm-up rituals — solve one each morning to keep your logic sharp.</li>
        <li>Use Notes mode for cells with 2–3 candidates; revisit them as the board fills in.</li>
        <li>If you get stuck, the Hint button reveals one cell — but it'll feel better when you do it yourself.</li>
        <li>The puzzle resets at midnight local time, so don't leave it half-finished overnight.</li>
      </ul>
    ),
    controls: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Click a cell, then click a number (or press 1–9) to fill it in.</li>
        <li>Arrow keys move the selection. Press <kbd className="rounded border bg-muted px-1 text-xs">N</kbd> for Notes mode.</li>
        <li>Hint, Check, and Reset work the same as on the standard Sudoku page.</li>
      </ul>
    ),
    faq: [
      {
        q: "How is the daily puzzle chosen?",
        a: "We hash today's date (YYYY-MM-DD) into a 32-bit seed, then use that seed to drive the Sudoku generator. Same date string → same seed → same puzzle, everywhere.",
      },
      {
        q: "What time does the new puzzle appear?",
        a: "At midnight in your device's local timezone. If you're playing late at night, your puzzle changes when the calendar rolls over.",
      },
      {
        q: "Is my completion saved?",
        a: "Yes — once you solve today's puzzle, the page will show an 'Already solved today' badge the next time you visit, until the puzzle resets.",
      },
      {
        q: "Can I switch difficulty on the daily?",
        a: "No. The daily is fixed at Medium to keep the global leaderboard (informally) fair. Use the regular Sudoku page for other difficulties.",
      },
    ],
  };

  return <GameLayout game={game} content={content} />;
}
