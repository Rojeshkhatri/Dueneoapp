"use client";

import * as React from "react";
import { GameLayout, type GameContent } from "@/components/dueneo/game-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw, Flag, Bomb, Smile, Frown, Trophy } from "lucide-react";
import type { GameDefinition } from "@/data/games";
import { formatTime } from "./_game-helpers";

type Difficulty = "easy" | "medium" | "hard";

interface Config {
  rows: number;
  cols: number;
  mines: number;
  label: string;
}

const CONFIG: Record<Difficulty, Config> = {
  easy: { rows: 9, cols: 9, mines: 10, label: "Easy · 9×9" },
  medium: { rows: 16, cols: 16, mines: 40, label: "Medium · 16×16" },
  hard: { rows: 16, cols: 30, mines: 99, label: "Hard · 16×30" },
};

interface Cell {
  isMine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
  exploded?: boolean;
}

function buildBoard(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    }))
  );
}

function placeMines(board: Cell[][], mines: number, safeR: number, safeC: number): Cell[][] {
  const rows = board.length;
  const cols = board[0].length;
  const candidates: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Keep a 3×3 safe area around the first click.
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      candidates.push([r, c]);
    }
  }
  // Fisher-Yates partial shuffle.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const next = board.map((row) => row.map((cell) => ({ ...cell })));
  for (let i = 0; i < Math.min(mines, candidates.length); i++) {
    const [r, c] = candidates[i];
    next[r][c].isMine = true;
  }
  // Compute adjacency counts.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (next[r][c].isMine) continue;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && next[rr][cc].isMine) n++;
        }
      }
      next[r][c].adjacent = n;
    }
  }
  return next;
}

function floodReveal(board: Cell[][], startR: number, startC: number): Cell[][] {
  const rows = board.length;
  const cols = board[0].length;
  const next = board.map((row) => row.map((cell) => ({ ...cell })));
  const stack: [number, number][] = [[startR, startC]];
  while (stack.length) {
    const [r, c] = stack.pop()!;
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    const cell = next[r][c];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adjacent === 0 && !cell.isMine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          stack.push([r + dr, c + dc]);
        }
      }
    }
  }
  return next;
}

function checkWin(board: Cell[][]): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (!cell.isMine && !cell.revealed) return false;
    }
  }
  return true;
}

const NUM_COLORS = [
  "",
  "text-blue-500",
  "text-emerald-500",
  "text-rose-500",
  "text-violet-500",
  "text-amber-600",
  "text-cyan-500",
  "text-fuchsia-500",
  "text-orange-500",
];

export function Minesweeper({ game }: { game: GameDefinition }) {
  const [difficulty, setDifficulty] = React.useState<Difficulty>("easy");
  const cfg = CONFIG[difficulty];
  const [board, setBoard] = React.useState<Cell[][]>(() => buildBoard(cfg.rows, cfg.cols));
  const [started, setStarted] = React.useState(false);
  const [gameState, setGameState] = React.useState<"playing" | "won" | "lost">("playing");
  const [elapsed, setElapsed] = React.useState(0);
  const [flagMode, setFlagMode] = React.useState(false);

  // Timer
  React.useEffect(() => {
    if (!started || gameState !== "playing") return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, [started, gameState]);

  // Reset when difficulty changes.
  React.useEffect(() => {
    setBoard(buildBoard(cfg.rows, cfg.cols));
    setStarted(false);
    setGameState("playing");
    setElapsed(0);
  }, [difficulty, cfg.rows, cfg.cols]);

  function reset() {
    setBoard(buildBoard(cfg.rows, cfg.cols));
    setStarted(false);
    setGameState("playing");
    setElapsed(0);
  }

  function changeDifficulty(d: Difficulty) {
    setDifficulty(d);
  }

  function reveal(r: number, c: number) {
    if (gameState !== "playing") return;
    setBoard((prev) => {
      if (prev[r][c].flagged) return prev;
      let next = prev;
      if (!started) {
        // First click: place mines avoiding the clicked 3×3.
        next = placeMines(prev, cfg.mines, r, c);
        setStarted(true);
      }
      const cell = next[r][c];
      if (cell.revealed) return prev;
      if (cell.isMine) {
        const exploded = next.map((row) =>
          row.map((cc) => ({
            ...cc,
            revealed: cc.isMine || cc.revealed,
            exploded: cc === next[r][c],
          }))
        );
        setGameState("lost");
        toast.error("💥 Boom! You hit a mine.");
        return exploded;
      }
      next = floodReveal(next, r, c);
      if (checkWin(next)) {
        setGameState("won");
        toast.success("🎉 Field cleared!");
      }
      return next.map((row) => row.map((cc) => ({ ...cc })));
    });
  }

  function toggleFlag(r: number, c: number) {
    if (gameState !== "playing") return;
    setBoard((prev) => {
      if (prev[r][c].revealed) return prev;
      const next = prev.map((row) => row.map((cc) => ({ ...cc })));
      next[r][c].flagged = !next[r][c].flagged;
      return next;
    });
  }

  function handleClick(r: number, c: number) {
    if (flagMode) {
      toggleFlag(r, c);
      return;
    }
    if (board[r][c].revealed && board[r][c].adjacent > 0) {
      // Chord click: if flag count matches adjacent count, reveal neighbours.
      const flags = countFlags(board, r, c);
      if (flags === board[r][c].adjacent) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const rr = r + dr;
            const cc = c + dc;
            if (rr >= 0 && rr < board.length && cc >= 0 && cc < board[0].length) {
              if (!board[rr][cc].flagged && !board[rr][cc].revealed) reveal(rr, cc);
            }
          }
        }
      }
      return;
    }
    reveal(r, c);
  }

  function handleContext(e: React.MouseEvent, r: number, c: number) {
    e.preventDefault();
    toggleFlag(r, c);
  }

  const flagsUsed = React.useMemo(
    () => board.flat().filter((c) => c.flagged).length,
    [board]
  );
  const minesRemaining = cfg.mines - flagsUsed;

  const cellSize =
    difficulty === "hard"
      ? "h-6 w-6 text-xs sm:h-7 sm:w-7 sm:text-sm"
      : "h-8 w-8 text-sm sm:h-9 sm:w-9 sm:text-base";

  const content: GameContent = {
    intro:
      "Clear the minefield without detonating a mine. The first click is always safe — every number tells you how many mines touch that cell. Flag suspected mines with a right-click (or use the flag toggle on touch devices) and clear the rest to win.",
    game: (
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
            {(Object.keys(CONFIG) as Difficulty[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => changeDifficulty(d)}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  difficulty === d ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {CONFIG[d].label}
              </button>
            ))}
          </div>
          <Button onClick={reset} variant="default" size="sm">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm">
            <Bomb className="h-4 w-4 text-destructive" />
            <span className="font-bold tabular-nums">{minesRemaining}</span>
          </div>
          <Button
            onClick={reset}
            variant="outline"
            size="icon"
            aria-label="New game"
            className="rounded-full"
          >
            {gameState === "won" ? (
              <Trophy className="h-5 w-5 text-amber-500" />
            ) : gameState === "lost" ? (
              <Frown className="h-5 w-5 text-destructive" />
            ) : (
              <Smile className="h-5 w-5" />
            )}
          </Button>
          <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm">
            <span className="text-muted-foreground">⏱</span>
            <span className="font-bold tabular-nums">{formatTime(elapsed)}</span>
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <div
            className={`grid gap-px overflow-x-auto rounded-lg bg-foreground/10 p-1 ${difficulty === "hard" ? "max-w-full" : ""}`}
            style={{ gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))` }}
            role="grid"
            aria-label="Minesweeper field"
          >
            {board.map((row, r) =>
              row.map((cell, c) => {
                const revealed = cell.revealed;
                const num = cell.adjacent;
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => handleClick(r, c)}
                    onContextMenu={(e) => handleContext(e, r, c)}
                    disabled={gameState !== "playing"}
                    className={`flex items-center justify-center rounded-sm font-bold ${cellSize} ${
                      revealed
                        ? cell.isMine
                          ? cell.exploded
                            ? "bg-destructive text-white"
                            : "bg-destructive/80 text-white"
                          : "bg-background"
                        : "bg-muted hover:bg-accent"
                    } ${revealed && !cell.isMine && num > 0 ? NUM_COLORS[num] : ""}`}
                    aria-label={
                      revealed
                        ? cell.isMine
                          ? "Mine"
                          : num === 0
                            ? "Empty cell"
                            : `${num}`
                        : cell.flagged
                          ? "Flagged cell"
                          : "Hidden cell"
                    }
                  >
                    {revealed ? (
                      cell.isMine ? (
                        <Bomb className="h-3.5 w-3.5" />
                      ) : num > 0 ? (
                        num
                      ) : null
                    ) : cell.flagged ? (
                      <Flag className="h-3.5 w-3.5 text-rose-500" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Mobile flag toggle */}
        <div className="mt-3 flex justify-center sm:hidden">
          <Button
            onClick={() => setFlagMode((v) => !v)}
            variant={flagMode ? "default" : "outline"}
            size="sm"
          >
            <Flag className="h-4 w-4" /> {flagMode ? "Flag mode ON" : "Flag mode OFF"}
          </Button>
        </div>

        {gameState !== "playing" && (
          <div
            className={`mt-3 rounded-md px-3 py-2 text-center text-sm font-medium ${
              gameState === "won"
                ? "bg-emerald-500/15 text-emerald-600"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {gameState === "won" ? "🎉 Field cleared!" : "💥 You hit a mine."} Time:{" "}
            {formatTime(elapsed)}.{" "}
            <button onClick={reset} className="underline">
              Play again
            </button>
          </div>
        )}
      </div>
    ),
    rules: (
      <div className="space-y-3">
        <p>
          Each cell starts hidden. Left-click (or tap, with flag mode off) to
          reveal a cell. If it's a mine, the game ends. If it's a number, that
          number tells you how many of the eight surrounding cells contain a
          mine. If it's empty, the game automatically reveals all connected
          empty cells and their numbered borders.
        </p>
        <p>
          Right-click (or use the flag-mode toggle on touch devices) to mark a
          cell you suspect is a mine. When the number of flags around a
          revealed numbered cell matches its number, you can left-click that
          number to automatically reveal all unflagged neighbours — this is
          called a "chord" and is the fastest way to clear dense areas.
        </p>
        <p>
          Win by revealing every cell that isn't a mine. The first click is
          always safe: mines are placed only after your first reveal, and a
          3×3 area around your click is guaranteed mine-free.
        </p>
      </div>
    ),
    tips: (
      <ul className="list-disc space-y-1 pl-5">
        <li>If a number equals its flag count, chording reveals the rest safely.</li>
        <li>Start in the middle of the board — corner starts are riskier because you can't flood-fill.</li>
        <li>On Hard (16×30), scan horizontally for "1-2-1" patterns that force mines into predictable spots.</li>
        <li>Use flags sparingly in easy mode — speed comes from logical certainty, not from labelling every guess.</li>
      </ul>
    ),
    controls: (
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Left-click</strong> a hidden cell to reveal it.</li>
        <li><strong>Right-click</strong> (or long-press on touch) to toggle a flag.</li>
        <li><strong>Left-click a revealed number</strong> with matching flag count to chord.</li>
        <li>On mobile, use the Flag mode button to switch between reveal and flag actions.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is the first click always safe?",
        a: "Yes. Mines are placed only after your first reveal, and the 3×3 area around your first click is excluded from mine placement, so you'll always start with at least a small cleared region.",
      },
      {
        q: "What does the number mean?",
        a: "Each number tells you how many mines are in the 8 surrounding cells (horizontal, vertical, and diagonal). An empty cell means zero adjacent mines.",
      },
      {
        q: "Does the timer pause when I switch tabs?",
        a: "No — the timer keeps running. Use Reset to start a fresh game with the clock at zero.",
      },
      {
        q: "Are scores saved?",
        a: "Times are kept only for the current session. We don't persist stats to localStorage for Minesweeper.",
      },
    ],
  };

  return <GameLayout game={game} content={content} />;
}

function countFlags(board: Cell[][], r: number, c: number): number {
  let n = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < board.length && cc >= 0 && cc < board[0].length) {
        if (board[rr][cc].flagged) n++;
      }
    }
  }
  return n;
}
