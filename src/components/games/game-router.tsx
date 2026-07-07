"use client";

import * as React from "react";
import type { GameDefinition } from "@/data/games";
import { TicTacToe } from "./tic-tac-toe";
import { ConnectFour } from "./connect-four";
import { Game2048 } from "./2048";
import { MemoryMatch } from "./memory-match";
import { Hangman } from "./hangman";
import { Minesweeper } from "./minesweeper";
import { Sudoku } from "./sudoku";
import { DailySudoku } from "./daily-sudoku";
import { WordSearch } from "./word-search";
import { Reversi } from "./reversi";
import { Checkers } from "./checkers";
import { Scribble } from "./scribble";

/**
 * Central registry of implemented game components, keyed by `game.component`.
 *
 * Keys MUST match the `component` field defined in `src/data/games.ts`.
 */
const GAME_COMPONENTS: Record<string, React.ComponentType<{ game: GameDefinition }>> = {
  "tic-tac-toe": TicTacToe,
  "connect-four": ConnectFour,
  "2048": Game2048,
  "memory-match": MemoryMatch,
  "hangman": Hangman,
  "minesweeper": Minesweeper,
  "sudoku": Sudoku,
  "daily-sudoku": DailySudoku,
  "word-search": WordSearch,
  "reversi": Reversi,
  "checkers": Checkers,
  "scribble": Scribble,
};

export function GameRouter({ game }: { game: GameDefinition }) {
  const Component = game.component ? GAME_COMPONENTS[game.component] : undefined;

  if (!Component) {
    return (
      <main className="dueneo-container flex-1 py-20 text-center text-sm text-muted-foreground">
        Component <code className="rounded bg-muted px-1.5 py-0.5">{game.component ?? "(none)"}</code>{" "}
        is not registered yet for <strong>{game.name}</strong>.
      </main>
    );
  }

  return <Component game={game} />;
}
