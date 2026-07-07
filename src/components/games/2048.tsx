"use client";

import * as React from "react";
import { GameLayout, type GameContent } from "@/components/dueneo/game-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw, Trophy } from "lucide-react";
import type { GameDefinition } from "@/data/games";
import { readLocal, writeLocal } from "./_game-helpers";

const SIZE = 4;
type Grid = number[][]; // 0 = empty

const TILE_COLORS: Record<number, string> = {
  2: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  4: "bg-amber-200 text-amber-900 dark:bg-amber-800/60 dark:text-amber-50",
  8: "bg-orange-300 text-orange-950 dark:bg-orange-700 dark:text-orange-50",
  16: "bg-orange-400 text-orange-50 dark:bg-orange-600 dark:text-orange-50",
  32: "bg-rose-400 text-rose-50 dark:bg-rose-600 dark:text-rose-50",
  64: "bg-rose-500 text-rose-50 dark:bg-rose-500 dark:text-rose-50",
  128: "bg-yellow-400 text-yellow-950 dark:bg-yellow-500 dark:text-yellow-50",
  256: "bg-yellow-500 text-yellow-950 dark:bg-yellow-600 dark:text-yellow-50",
  512: "bg-emerald-400 text-emerald-950 dark:bg-emerald-600 dark:text-emerald-50",
  1024: "bg-emerald-500 text-emerald-50 dark:bg-emerald-500 dark:text-emerald-50",
  2048: "bg-fuchsia-500 text-white dark:bg-fuchsia-500 dark:text-white",
  4096: "bg-violet-600 text-white dark:bg-violet-600 dark:text-white",
  8192: "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white",
};

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
}

function clone(g: Grid): Grid {
  return g.map((row) => row.slice());
}

function addRandomTile(g: Grid): Grid {
  const empty: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return g;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = clone(g);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function newGame(): Grid {
  let g = emptyGrid();
  g = addRandomTile(g);
  g = addRandomTile(g);
  return g;
}

/** Slide & merge a single row leftwards; returns [newRow, gainedScore]. */
function slideRowLeft(row: number[]): [number[], number] {
  const nonZero = row.filter((x) => x !== 0);
  const merged: number[] = [];
  let gained = 0;
  for (let i = 0; i < nonZero.length; i++) {
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const v = nonZero[i] * 2;
      merged.push(v);
      gained += v;
      i++;
    } else {
      merged.push(nonZero[i]);
    }
  }
  while (merged.length < SIZE) merged.push(0);
  return [merged, gained];
}

type Direction = "left" | "right" | "up" | "down";

function move(g: Grid, dir: Direction): { grid: Grid; gained: number; moved: boolean } {
  const next = clone(g);
  let gained = 0;

  const rowsTransform = (matrix: Grid): Grid => matrix.map((row) => {
    const [newRow, score] = slideRowLeft(row);
    gained += score;
    return newRow;
  });

  const reverseRows = (matrix: Grid): Grid => matrix.map((row) => row.slice().reverse());
  const transpose = (matrix: Grid): Grid => {
    const t = emptyGrid();
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) t[c][r] = matrix[r][c];
    return t;
  };

  let working = next;
  if (dir === "left") {
    working = rowsTransform(working);
  } else if (dir === "right") {
    working = reverseRows(working);
    working = rowsTransform(working);
    working = reverseRows(working);
  } else if (dir === "up") {
    working = transpose(working);
    working = rowsTransform(working);
    working = transpose(working);
  } else {
    // down
    working = transpose(working);
    working = reverseRows(working);
    working = rowsTransform(working);
    working = reverseRows(working);
    working = transpose(working);
  }

  const moved = JSON.stringify(working) !== JSON.stringify(g);
  return { grid: working, gained, moved };
}

function canMove(g: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] === 0) return true;
      if (c + 1 < SIZE && g[r][c] === g[r][c + 1]) return true;
      if (r + 1 < SIZE && g[r][c] === g[r + 1][c]) return true;
    }
  }
  return false;
}

function hasWon(g: Grid): boolean {
  return g.some((row) => row.includes(2048));
}

const BEST_KEY = "dueneo:2048:best";

export function Game2048({ game }: { game: GameDefinition }) {
  const [grid, setGrid] = React.useState<Grid>(() => newGame());
  const [score, setScore] = React.useState(0);
  const [best, setBest] = React.useState<number>(() => readLocal<number>(BEST_KEY, 0));
  const [won, setWon] = React.useState(false);
  const [keepGoing, setKeepGoing] = React.useState(false);
  const [touchStart, setTouchStart] = React.useState<{ x: number; y: number } | null>(null);

  const gameOver = !canMove(grid);

  React.useEffect(() => {
    if (score > best) {
      setBest(score);
      writeLocal(BEST_KEY, score);
    }
  }, [score, best]);

  const doMove = React.useCallback(
    (dir: Direction) => {
      if (gameOver) return;
      setGrid((prev) => {
        const { grid: next, gained, moved } = move(prev, dir);
        if (!moved) return prev;
        const withTile = addRandomTile(next);
        if (gained > 0) setScore((s) => s + gained);
        if (!keepGoing && !won && hasWon(withTile)) {
          setWon(true);
          toast.success("🏆 You reached 2048!");
        }
        return withTile;
      });
    },
    [gameOver, keepGoing, won]
  );

  // Keyboard support.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
        a: "left",
        d: "right",
        w: "up",
        s: "down",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        doMove(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove]);

  function restart() {
    setGrid(newGame());
    setScore(0);
    setWon(false);
    setKeepGoing(false);
  }

  function continuePlaying() {
    setKeepGoing(true);
  }

  // Touch handlers for swipe support.
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    setTouchStart({ x: t.clientX, y: t.clientY });
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const threshold = 24;
    if (Math.max(absX, absY) < threshold) return;
    if (absX > absY) doMove(dx > 0 ? "right" : "left");
    else doMove(dy > 0 ? "down" : "up");
    setTouchStart(null);
  }

  const tileSize = "h-16 w-16 sm:h-20 sm:w-20";

  const content: GameContent = {
    intro:
      "Slide numbered tiles on a 4×4 grid. When two tiles with the same number touch they merge into one with double the value. Reach the 2048 tile to win — then keep going for a higher score if you dare.",
    game: (
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted px-3 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Score</div>
              <div className="text-lg font-bold tabular-nums">{score}</div>
            </div>
            <div className="rounded-lg bg-muted px-3 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Best</div>
              <div className="text-lg font-bold tabular-nums">{best}</div>
            </div>
          </div>
          <Button onClick={restart} variant="default" size="sm">
            <RotateCcw className="h-4 w-4" /> New game
          </Button>
        </div>

        <div
          className="mt-4 select-none touch-none"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="relative mx-auto w-fit rounded-xl bg-amber-200/70 p-2 dark:bg-amber-900/40">
            <div className="grid grid-cols-4 gap-2">
              {grid.flatMap((row, r) =>
                row.map((val, c) => (
                  <div
                    key={`${r}-${c}`}
                    className={`flex items-center justify-center rounded-md font-bold tabular-nums ${tileSize} ${
                      val === 0
                        ? "bg-amber-100/60 dark:bg-amber-950/30"
                        : TILE_COLORS[val] ?? "bg-fuchsia-600 text-white"
                    }`}
                  >
                    {val !== 0 && (val < 100 ? "text-2xl" : val < 1000 ? "text-xl" : "text-lg")}
                    {val !== 0 && val}
                  </div>
                ))
              )}
            </div>

            {won && !keepGoing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/80 backdrop-blur-sm">
                <Trophy className="h-10 w-10 text-amber-500" />
                <div className="text-2xl font-bold">You made 2048!</div>
                <Button onClick={continuePlaying} variant="default">Keep going</Button>
              </div>
            )}
            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/80 backdrop-blur-sm">
                <div className="text-2xl font-bold">Game over</div>
                <div className="text-sm text-muted-foreground">Final score: {score}</div>
                <Button onClick={restart} variant="default">
                  <RotateCcw className="h-4 w-4" /> Play again
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile swipe pad */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:hidden">
          <div />
          <Button variant="outline" onClick={() => doMove("up")} aria-label="Up">▲</Button>
          <div />
          <Button variant="outline" onClick={() => doMove("left")} aria-label="Left">◀</Button>
          <Button variant="outline" onClick={() => doMove("down")} aria-label="Down">▼</Button>
          <Button variant="outline" onClick={() => doMove("right")} aria-label="Right">▶</Button>
        </div>
      </div>
    ),
    rules: (
      <div className="space-y-3">
        <p>
          The board starts with two numbered tiles (2 or 4). Use the arrow
          keys (or swipe on a touch device) to slide every tile in that
          direction as far as it can go. When two tiles with the same value
          collide they merge into one tile with double the value, and the new
          value is added to your score.
        </p>
        <p>
          After every successful move a new 2 or 4 appears in a random empty
          cell. The game ends when the board is full and no two adjacent tiles
          can be merged. Reach the <strong>2048</strong> tile to win — you can
          then keep playing for an even higher score.
        </p>
      </div>
    ),
    tips: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Pick one corner and keep your biggest tile there for the whole game.</li>
        <li>Never press the direction opposite your "anchor" corner — it strands the big tile.</li>
        <li>Build a chain of descending values along one edge so merges cascade.</li>
        <li>If you can't move in your preferred direction, prefer the orthogonal one over reversing.</li>
      </ul>
    ),
    controls: (
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Desktop:</strong> Arrow keys or WASD.</li>
        <li><strong>Mobile:</strong> swipe in any direction, or use the on-screen arrow pad.</li>
        <li><strong>New game</strong> resets the board and your score. Your best score is kept in localStorage.</li>
      </ul>
    ),
    faq: [
      {
        q: "Where is my best score saved?",
        a: "In your browser's localStorage under the key dueneo:2048:best. Clearing site data or using private mode will reset it.",
      },
      {
        q: "Can I keep playing after reaching 2048?",
        a: "Yes. When you hit 2048 a win banner appears with a Keep going button. You can chase 4096, 8192 and beyond — the game ends only when no moves remain.",
      },
      {
        q: "Are the new tiles random?",
        a: "Yes — each new tile has a 90% chance to be a 2 and a 10% chance to be a 4, mirroring the original game.",
      },
    ],
  };

  return <GameLayout game={game} content={content} />;
}
