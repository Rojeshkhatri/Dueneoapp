"use client";

import * as React from "react";
import type { GameDefinition } from "@/data/games";

/**
 * Game component registry using LAZY imports.
 * Each game is only loaded when the user navigates to it.
 */

type GameComp = React.ComponentType<{ game: GameDefinition }>;
type LazyGameComp = React.LazyExoticComponent<GameComp>;

function lazyNamed(
  factory: () => Promise<Record<string, unknown>>,
  name: string
): LazyGameComp {
  return React.lazy(async () => {
    const mod = await factory();
    return { default: mod[name] as GameComp };
  });
}

const GAME_COMPONENTS: Record<string, LazyGameComp> = {
  "tic-tac-toe": lazyNamed(() => import("./tic-tac-toe"), "TicTacToe"),
  "connect-four": lazyNamed(() => import("./connect-four"), "ConnectFour"),
  "2048": lazyNamed(() => import("./2048"), "Game2048"),
  "memory-match": lazyNamed(() => import("./memory-match"), "MemoryMatch"),
  "hangman": lazyNamed(() => import("./hangman"), "Hangman"),
  "minesweeper": lazyNamed(() => import("./minesweeper"), "Minesweeper"),
  "sudoku": lazyNamed(() => import("./sudoku"), "Sudoku"),
  "daily-sudoku": lazyNamed(() => import("./daily-sudoku"), "DailySudoku"),
  "word-search": lazyNamed(() => import("./word-search"), "WordSearch"),
  "reversi": lazyNamed(() => import("./reversi"), "Reversi"),
  "checkers": lazyNamed(() => import("./checkers"), "Checkers"),
  "scribble": lazyNamed(() => import("./scribble"), "Scribble"),
  "solitaire": lazyNamed(() => import("./solitaire"), "Solitaire"),
  "spider-solitaire": lazyNamed(() => import("./spider-solitaire"), "SpiderSolitaire"),
  "freecell": lazyNamed(() => import("./freecell"), "FreeCell"),
};

export function GameRouter({ game }: { game: GameDefinition }) {
  const LazyComponent = game.component ? GAME_COMPONENTS[game.component] : undefined;

  if (!LazyComponent) {
    return (
      <main className="dueneo-container flex-1 py-20 text-center text-sm text-muted-foreground">
        Component <code className="rounded bg-muted px-1.5 py-0.5">{game.component ?? "(none)"}</code>{" "}
        is not registered yet for <strong>{game.name}</strong>.
      </main>
    );
  }

  return (
    <React.Suspense
      fallback={
        <main className="dueneo-container flex-1 py-20 text-center text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading {game.name}…
          </div>
        </main>
      }
    >
      <LazyComponent game={game} />
    </React.Suspense>
  );
}
