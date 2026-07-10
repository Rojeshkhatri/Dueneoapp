"use client";

import * as React from "react";
import { GameLayout, type GameContent } from "@/components/dueneo/game-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, Clock } from "lucide-react";
import type { GameDefinition } from "@/data/games";
import { formatTime, shuffle } from "./_game-helpers";

type Theme = "animals" | "fruits" | "countries";

const WORDS_BY_THEME: Record<Theme, string[]> = {
  animals: ["cat", "dog", "fox", "owl", "bee", "ant", "cow", "pig", "rat", "bat", "lion", "wolf", "bear", "deer", "goat", "duck", "frog", "seal", "mole", "hare"],
  fruits: ["fig", "pear", "plum", "kiwi", "lime", "date", "apple", "grape", "mango", "lemon", "peach", "melon", "berry", "guava", "olive", "papaya", "cherry", "banana", "orange", "coconut"],
  countries: ["peru", "cuba", "iran", "iraq", "togo", "mali", "chad", "fiji", "laos", "oman", "spain", "italy", "india", "china", "japan", "egypt", "kenya", "sudan", "nepal", "chile"],
};

const THEME_LABEL: Record<Theme, string> = {
  animals: "Animals",
  fruits: "Fruits",
  countries: "Countries",
};

interface PlacedWord {
  word: string;
  cells: [number, number][];
}

const DIRECTIONS: [number, number][] = [
  [0, 1], // right
  [1, 0], // down
  [1, 1], // down-right
  [-1, 1], // up-right
  [0, -1], // left
  [-1, 0], // up
  [-1, -1], // up-left
  [1, -1], // down-left
];

function generateGrid(size: number, words: string[]): { grid: string[][]; placed: PlacedWord[] } {
  const grid: string[][] = Array.from({ length: size }, () => Array<string>(size).fill(""));
  const placed: PlacedWord[] = [];

  // Sort words longest first for better placement.
  const sorted = [...words].sort((a, b) => b.length - a.length);

  for (const word of sorted) {
    if (word.length > size) continue;
    let placedThis = false;
    for (let attempt = 0; attempt < 200 && !placedThis; attempt++) {
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const startR = Math.floor(Math.random() * size);
      const startC = Math.floor(Math.random() * size);
      const endR = startR + dir[0] * (word.length - 1);
      const endC = startC + dir[1] * (word.length - 1);
      if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;
      // Check fit.
      let ok = true;
      const cells: [number, number][] = [];
      for (let i = 0; i < word.length; i++) {
        const r = startR + dir[0] * i;
        const c = startC + dir[1] * i;
        const existing = grid[r][c];
        if (existing !== "" && existing !== word[i]) {
          ok = false;
          break;
        }
        cells.push([r, c]);
      }
      if (!ok) continue;
      for (let i = 0; i < word.length; i++) {
        grid[cells[i][0]][cells[i][1]] = word[i];
      }
      placed.push({ word, cells });
      placedThis = true;
    }
  }

  // Fill empty cells with random letters.
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }

  return { grid, placed };
}

export function WordSearch({ game }: { game: GameDefinition }) {
  const [theme, setTheme] = React.useState<Theme>("animals");
  const [size, setSize] = React.useState<10 | 12>(10);
  const [data, setData] = React.useState<{ grid: string[][]; placed: PlacedWord[] }>(() => {
    const words = shuffle(WORDS_BY_THEME.animals).slice(0, 8);
    return generateGrid(10, words);
  });
  const [foundWords, setFoundWords] = React.useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = React.useState<Set<string>>(new Set());
  const [startCell, setStartCell] = React.useState<[number, number] | null>(null);
  const [endCell, setEndCell] = React.useState<[number, number] | null>(null);
  const [startedAt, setStartedAt] = React.useState<number | null>(null);
  const [elapsed, setElapsed] = React.useState(0);

  const completed = foundWords.size === data.placed.length;

  // Timer.
  React.useEffect(() => {
    if (!startedAt || completed) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(id);
  }, [startedAt, completed]);

  React.useEffect(() => {
    if (completed && startedAt) {
      toast.success(`🎉 All ${data.placed.length} words found in ${formatTime(elapsed)}!`);
    }
  }, [completed]);

  function newPuzzle(nextTheme: Theme = theme, nextSize: 10 | 12 = size) {
    const pool = WORDS_BY_THEME[nextTheme];
    const count = nextSize === 10 ? 8 : 12;
    const words = shuffle(pool).slice(0, Math.min(count, pool.length));
    setData(generateGrid(nextSize, words));
    setFoundWords(new Set());
    setFoundCells(new Set());
    setStartCell(null);
    setEndCell(null);
    setStartedAt(null);
    setElapsed(0);
  }

  function changeTheme(t: Theme) {
    if (t === theme) return;
    setTheme(t);
    newPuzzle(t, size);
  }

  function changeSize(s: 10 | 12) {
    if (s === size) return;
    setSize(s);
    newPuzzle(theme, s);
  }

  function cellKey(r: number, c: number) {
    return `${r}-${c}`;
  }

  /** Determine if the line from start to end is a valid 8-direction line. */
  function lineCells(start: [number, number], end: [number, number]): [number, number][] | null {
    const [r1, c1] = start;
    const [r2, c2] = end;
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);
    const len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
    if (len === 0) return null;
    // Must be straight or 45° diagonal.
    if (dr !== 0 && dc !== 0 && Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return null;
    const cells: [number, number][] = [];
    for (let i = 0; i <= len; i++) {
      cells.push([r1 + dr * i, c1 + dc * i]);
    }
    return cells;
  }

  function getSelectionString(): { string: string; cells: [number, number][] } | null {
    if (!startCell || !endCell) return null;
    const cells = lineCells(startCell, endCell);
    if (!cells) return null;
    const str = cells.map(([r, c]) => data.grid[r][c]).join("");
    return { string: str, cells };
  }

  const selection = getSelectionString();
  const selectionCells = React.useMemo(() => {
    if (!selection) return new Set<string>();
    return new Set(selection.cells.map(([r, c]) => cellKey(r, c)));
  }, [selection]);

  function tryMatch(from?: [number, number] | null, to?: [number, number] | null) {
    const s = from ?? startCell;
    const e = to ?? endCell;
    if (!s || !e) return;
    const cells = lineCells(s, e);
    if (!cells) return;
    const forward = cells.map(([r, c]) => data.grid[r][c]).join("");
    const reverse = forward.split("").reverse().join("");
    for (const placed of data.placed) {
      if (foundWords.has(placed.word)) continue;
      if (placed.word.toUpperCase() === forward || placed.word.toUpperCase() === reverse) {
        const next = new Set(foundWords);
        next.add(placed.word);
        setFoundWords(next);
        const nextCells = new Set(foundCells);
        placed.cells.forEach(([r, c]) => nextCells.add(cellKey(r, c)));
        setFoundCells(nextCells);
        toast.success(`Found "${placed.word.toUpperCase()}"!`);
        return;
      }
    }
  }

  function handleCellDown(r: number, c: number) {
    if (completed) return;
    if (startedAt === null) setStartedAt(Date.now());
    setStartCell([r, c]);
    setEndCell([r, c]);
  }

  function handleCellEnter(r: number, c: number) {
    if (!startCell) return;
    setEndCell([r, c]);
  }

  function handleCellUp() {
    const s = startCell;
    const e = endCell;
    if (!s || !e) {
      setStartCell(null);
      setEndCell(null);
      return;
    }
    tryMatch(s, e);
    setStartCell(null);
    setEndCell(null);
  }

  function handleCellClick(r: number, c: number) {
    // Click-to-select alternative for touch devices.
    if (completed) return;
    if (startedAt === null) setStartedAt(Date.now());
    if (!startCell) {
      setStartCell([r, c]);
      return;
    }
    const s = startCell;
    const e: [number, number] = [r, c];
    setEndCell(e);
    // Use the captured values directly — no stale closure.
    tryMatch(s, e);
    setStartCell(null);
    setEndCell(null);
  }

  React.useEffect(() => {
    function onMouseUp() {
      if (startCell && endCell) {
        tryMatch(startCell, endCell);
        setStartCell(null);
        setEndCell(null);
      }
    }
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [startCell, endCell, data, foundWords, foundCells]);

  const cellSizeClass = size === 12 ? "h-7 w-7 text-sm sm:h-8 sm:w-8 sm:text-base" : "h-8 w-8 text-base sm:h-9 sm:w-9 sm:text-lg";

  const content: GameContent = {
    intro:
      "Find the hidden words in a grid of letters. Words can run horizontally, vertically, diagonally — and forwards or backwards. Click and drag (or tap the first and last letter) to select a word. Three themes and two grid sizes keep things fresh.",
    game: (
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
            {(Object.keys(WORDS_BY_THEME) as Theme[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => changeTheme(t)}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  theme === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {THEME_LABEL[t]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
              {[10, 12].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeSize(s as 10 | 12)}
                  className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                    size === s ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}×{s}
                </button>
              ))}
            </div>
            <Button onClick={() => newPuzzle()} variant="default" size="sm">
              <RotateCcw className="h-4 w-4" /> New
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 text-sm">
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" /> {formatTime(elapsed)}
          </Badge>
          <Badge variant="secondary">{foundWords.size} / {data.placed.length} found</Badge>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_200px]">
          <div className="overflow-x-auto">
            <div
              className="inline-grid gap-px select-none touch-none"
              style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
              role="grid"
              aria-label="Word search grid"
            >
              {data.grid.map((row, r) =>
                row.map((letter, c) => {
                  const key = cellKey(r, c);
                  const isFound = foundCells.has(key);
                  const isSelected = selectionCells.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onMouseDown={() => handleCellDown(r, c)}
                      onMouseEnter={() => handleCellEnter(r, c)}
                      onClick={() => handleCellClick(r, c)}
                      className={`flex items-center justify-center rounded-sm font-bold transition-colors touch-none ${cellSizeClass} ${
                        isFound
                          ? "bg-emerald-500/30 text-emerald-700 dark:text-emerald-200"
                          : isSelected
                            ? "bg-primary/30 text-primary"
                            : "bg-background hover:bg-accent"
                      }`}
                      aria-label={`Row ${r + 1} column ${c + 1}, letter ${letter}`}
                    >
                      {letter}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Words to find</h3>
            <ul className="space-y-1 text-sm">
              {data.placed.map((w) => {
                const found = foundWords.has(w.word);
                return (
                  <li
                    key={w.word}
                    className={`flex items-center gap-2 ${found ? "text-muted-foreground line-through" : ""}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${found ? "bg-emerald-500" : "bg-foreground/30"}`} />
                    {w.word.toUpperCase()}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    ),
    rules: (
      <div className="space-y-3">
        <p>
          A list of theme words is hidden inside a square letter grid. Words
          may run <strong>horizontally</strong>, <strong>vertically</strong>{" "}
          or <strong>diagonally</strong>, and they may read either forwards or
          backwards. Letters can be shared between intersecting words.
        </p>
        <p>
          On a desktop, click and drag from the first letter to the last. On a
          touch device, tap the first letter, then tap the last letter of the
          word — the straight (or 45° diagonal) line between them is matched
          against the word list. Found words stay highlighted and are crossed
          off the list.
        </p>
        <p>
          Switch between Animals, Fruits and Countries themes, and between
          10×10 and 12×12 grid sizes. The timer starts on your first
          interaction and stops when every word is found.
        </p>
      </div>
    ),
    tips: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Scan rows first for the longest words — fewer places they can fit.</li>
        <li>Look for rare letters (Q, X, Z) as anchor points; they belong to one or two words only.</li>
        <li>Words can be reversed, so always read both directions along a promising line.</li>
        <li>If you get stuck, switch theme — a fresh grid often jogs your eye.</li>
      </ul>
    ),
    controls: (
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Desktop:</strong> click-and-drag from the first to the last letter of a word.</li>
        <li><strong>Mobile:</strong> tap the first letter, then tap the last letter.</li>
        <li>Use the theme and grid-size toggles to start a new puzzle.</li>
      </ul>
    ),
    faq: [
      {
        q: "How are words placed in the grid?",
        a: "The generator tries up to 200 random placements (random direction + random start) per word, accepting a spot only if no conflicting letters are already in those cells. Words that don't fit are silently dropped, so you may see fewer than the target count.",
      },
      {
        q: "Can the same letter be part of two words?",
        a: "Yes — if a word's letter matches what's already in a cell from another placed word, they share that cell. This makes the puzzle denser and more interesting.",
      },
      {
        q: "Does the timer save my best time?",
        a: "Not currently — the timer runs only for the current session. Use New to start a fresh puzzle and a fresh clock.",
      },
      {
        q: "Why don't all words appear in the list?",
        a: "If a word is longer than the grid size or didn't fit after 200 tries, it's skipped. The header shows how many words were actually placed for the current grid.",
      },
    ],
  };

  return <GameLayout game={game} content={content} />;
}
