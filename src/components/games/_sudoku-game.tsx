"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Lightbulb, Check, RotateCcw, Clock, Eraser } from "lucide-react";
import {
  type Board,
  type Difficulty,
  DIFFICULTY_CONFIG,
  cloneBoard,
  conflicts,
  generatePuzzle,
  generatePuzzleSeeded,
  hint as hintFn,
  isComplete,
} from "./_sudoku-engine";
import { formatTime, readLocal, writeLocal } from "./_game-helpers";

export interface SudokuGameProps {
  /** Seed (date hash). If provided, puzzle is deterministic. */
  seed?: number;
  /** Difficulty label for display. */
  fixedDifficulty?: Difficulty;
  /** Whether difficulty selector should be hidden (daily mode). */
  hideDifficulty?: boolean;
  /** Date label for daily mode, e.g. "Today". */
  dateLabel?: string;
  /** Called once when the board is fully and correctly solved. */
  onCompleted?: () => void;
}

interface GameState {
  puzzle: Board;
  solution: Board;
  current: Board;
  notes: Set<string>[][]; // notes[r][c] = Set<string> of "1".."9"
  selected: [number, number] | null;
  noteMode: boolean;
  startedAt: number;
  elapsed: number;
  completed: boolean;
}

const SAVE_KEY = "dueneo:sudoku:save";
const SIZE = 9;

function newGame(difficulty: Difficulty, seed?: number): { puzzle: Board; solution: Board } {
  if (seed !== undefined) return generatePuzzleSeeded(seed, difficulty);
  return generatePuzzle(difficulty);
}

function emptyNotes(): Set<string>[][] {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => new Set<string>())
  );
}

function loadSave(): (GameState & { difficulty: Difficulty; seed?: number }) | null {
  const raw = readLocal<{ difficulty: Difficulty; seed?: number; state: Omit<GameState, "elapsed"> & { elapsed: number } } | null>(SAVE_KEY, null);
  if (!raw) return null;
  // Don't restore seeded (daily) saves — daily state is managed separately.
  if (raw.seed !== undefined) return null;
  const s = raw.state;
  return {
    difficulty: raw.difficulty,
    seed: undefined,
    selected: s.selected,
    noteMode: s.noteMode,
    startedAt: Date.now() - s.elapsed * 1000,
    elapsed: s.elapsed,
    completed: s.completed,
    puzzle: s.puzzle,
    solution: s.solution,
    current: s.current,
    notes: s.notes.map((row) => row.map((set) => new Set(set))),
  };
}

export function SudokuGame({ seed, fixedDifficulty, hideDifficulty, dateLabel, onCompleted }: SudokuGameProps) {
  const [difficulty, setDifficulty] = React.useState<Difficulty>(fixedDifficulty ?? "easy");
  const [state, setState] = React.useState<GameState>(() => {
    // For non-seeded games, try to restore an in-progress save.
    if (seed === undefined && fixedDifficulty === undefined) {
      const saved = loadSave();
      if (saved && saved.difficulty) {
        return {
          puzzle: saved.puzzle,
          solution: saved.solution,
          current: saved.current,
          notes: saved.notes,
          selected: null,
          noteMode: false,
          startedAt: saved.startedAt,
          elapsed: saved.elapsed,
          completed: saved.completed,
        };
      }
    }
    const g = newGame(fixedDifficulty ?? "easy", seed);
    return {
      puzzle: g.puzzle,
      solution: g.solution,
      current: cloneBoard(g.puzzle),
      notes: emptyNotes(),
      selected: null,
      noteMode: false,
      startedAt: Date.now(),
      elapsed: 0,
      completed: false,
    };
  });
  const [showConflicts, setShowConflicts] = React.useState(false);

  // Timer tick.
  React.useEffect(() => {
    if (state.completed) return;
    const id = setInterval(() => {
      setState((s) => ({ ...s, elapsed: Math.floor((Date.now() - s.startedAt) / 1000) }));
    }, 500);
    return () => clearInterval(id);
  }, [state.completed, state.startedAt]);

  // Persist save for non-seeded games.
  React.useEffect(() => {
    if (seed !== undefined) return; // don't save daily
    writeLocal(SAVE_KEY, {
      difficulty,
      seed: undefined,
      state: {
        puzzle: state.puzzle,
        solution: state.solution,
        current: state.current,
        notes: state.notes.map((row) => row.map((set) => Array.from(set))),
        selected: state.selected,
        noteMode: state.noteMode,
        elapsed: state.elapsed,
        completed: state.completed,
      },
    });
  }, [state, difficulty, seed]);

  // Completion detection.
  React.useEffect(() => {
    if (state.completed) return;
    if (isComplete(state.current)) {
      setState((s) => ({ ...s, completed: true }));
      toast.success("🎉 Sudoku solved!");
      onCompleted?.();
    }
  }, [state.current, state.completed]);

  function placeNumber(r: number, c: number, n: number) {
    if (state.completed) return;
    if (state.puzzle[r][c] !== 0) return; // can't edit clue
    setState((s) => {
      const current = cloneBoard(s.current);
      const notes = s.notes.map((row) => row.map((set) => new Set(set)));
      if (s.noteMode && n !== 0) {
        if (current[r][c] !== 0) {
          current[r][c] = 0;
        }
        if (notes[r][c].has(String(n))) notes[r][c].delete(String(n));
        else notes[r][c].add(String(n));
      } else {
        current[r][c] = n;
        notes[r][c].clear();
        // Remove this number from peer notes.
        if (n !== 0) {
          for (const [rr, cc] of peersList(r, c)) {
            notes[rr][cc].delete(String(n));
          }
        }
      }
      return { ...s, current, notes };
    });
  }

  // Keyboard input.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state.completed) return;
      if (!state.selected) return;
      const [r, c] = state.selected;
      // Movement
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setState((s) => ({ ...s, selected: [Math.max(0, r - 1), c] }));
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setState((s) => ({ ...s, selected: [Math.min(SIZE - 1, r + 1), c] }));
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setState((s) => ({ ...s, selected: [r, Math.max(0, c - 1)] }));
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setState((s) => ({ ...s, selected: [r, Math.min(SIZE - 1, c + 1)] }));
        return;
      }
      if (e.key === "n" || e.key === "N") {
        setState((s) => ({ ...s, noteMode: !s.noteMode }));
        return;
      }
      if (e.key >= "1" && e.key <= "9") {
        placeNumber(r, c, parseInt(e.key, 10));
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        placeNumber(r, c, 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.selected, state.completed, state.noteMode, state.puzzle, state.completed]);

  function startNew(diff: Difficulty) {
    setDifficulty(diff);
    const g = newGame(diff, seed);
    setState({
      puzzle: g.puzzle,
      solution: g.solution,
      current: cloneBoard(g.puzzle),
      notes: emptyNotes(),
      selected: null,
      noteMode: false,
      startedAt: Date.now(),
      elapsed: 0,
      completed: false,
    });
    setShowConflicts(false);
  }

  function reset() {
    setState((s) => ({
      ...s,
      current: cloneBoard(s.puzzle),
      notes: emptyNotes(),
      selected: null,
      noteMode: false,
      startedAt: Date.now(),
      elapsed: 0,
      completed: false,
    }));
    setShowConflicts(false);
  }

  function toggleNotes() {
    setState((s) => ({ ...s, noteMode: !s.noteMode }));
  }

  function giveHint() {
    const h = hintFn(state.current, state.solution);
    if (!h) {
      toast.message("No empty cells left.");
      return;
    }
    const [r, c, n] = h;
    placeNumber(r, c, n);
    setState((s) => ({ ...s, selected: [r, c] }));
    toast.success(`Hint: ${n} placed at row ${r + 1}, column ${c + 1}.`);
  }

  function doCheck() {
    setShowConflicts(true);
    const conflictsCount = countConflicts(state.current);
    if (conflictsCount === 0) {
      toast.success("No conflicts so far — keep going!");
    } else {
      toast.error(`${conflictsCount} conflicting cell${conflictsCount > 1 ? "s" : ""} highlighted.`);
    }
    setTimeout(() => setShowConflicts(false), 3000);
  }

  function erase() {
    if (!state.selected) return;
    const [r, c] = state.selected;
    if (state.puzzle[r][c] !== 0) return;
    placeNumber(r, c, 0);
  }

  const conflictGrid = React.useMemo(
    () => (showConflicts ? conflicts(state.current) : Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false))),
    [showConflicts, state.current]
  );

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!hideDifficulty && (
          <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
            {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => startNew(d)}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  difficulty === d ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {DIFFICULTY_CONFIG[d].label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          {dateLabel && <Badge variant="secondary">{dateLabel}</Badge>}
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" /> {formatTime(state.elapsed)}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center">
        <div className="overflow-x-auto">
          <div
            className="grid grid-cols-9 gap-px rounded-md bg-foreground/20 p-px"
            role="grid"
            aria-label="Sudoku board"
          >
            {state.current.map((row, r) =>
              row.map((val, c) => {
                const isClue = state.puzzle[r][c] !== 0;
                const isSelected = state.selected && state.selected[0] === r && state.selected[1] === c;
                const sameValue = val !== 0 && state.selected && state.current[state.selected[0]][state.selected[1]] === val;
                const conflict = conflictGrid[r][c];
                const borderRight = (c + 1) % 3 === 0 && c !== 8 ? "border-r-2 border-r-foreground/30" : "";
                const borderBottom = (r + 1) % 3 === 0 && r !== 8 ? "border-b-2 border-b-foreground/30" : "";
                const notes = state.notes[r][c];
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => setState((s) => ({ ...s, selected: [r, c] }))}
                    className={`flex h-9 w-9 items-center justify-center text-base font-semibold transition-colors sm:h-11 sm:w-11 sm:text-lg ${borderRight} ${borderBottom} ${
                      isSelected
                        ? "bg-primary/20"
                        : sameValue
                          ? "bg-primary/10"
                          : isClue
                            ? "bg-muted/40"
                            : "bg-background hover:bg-accent"
                    } ${conflict ? "text-destructive" : isClue ? "text-foreground" : "text-primary"} ${state.completed ? "text-emerald-600" : ""}`}
                    aria-label={`Row ${r + 1} column ${c + 1}${val ? `, value ${val}` : ", empty"}`}
                  >
                    {val !== 0 ? (
                      val
                    ) : notes.size > 0 ? (
                      <div className="grid grid-cols-3 gap-px text-[8px] leading-none text-muted-foreground sm:text-[9px]">
                        {Array.from({ length: 9 }, (_, i) => (
                          <span key={i} className="flex h-2.5 w-2.5 items-center justify-center sm:h-3 sm:w-3">
                            {notes.has(String(i + 1)) ? i + 1 : ""}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Number pad */}
        <div className="mt-4 grid w-full max-w-md grid-cols-9 gap-1 sm:grid-cols-9">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => state.selected && placeNumber(state.selected[0], state.selected[1], n)}
              disabled={state.completed || !state.selected}
              className="flex h-9 items-center justify-center rounded-md border border-input bg-background text-base font-semibold transition-colors hover:bg-accent disabled:opacity-40 sm:h-11 sm:text-lg"
            >
              {n}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Button
            onClick={toggleNotes}
            variant={state.noteMode ? "default" : "outline"}
            size="sm"
          >
            <Pencil className="h-4 w-4" /> {state.noteMode ? "Notes ON" : "Notes"}
          </Button>
          <Button onClick={erase} variant="outline" size="sm" disabled={!state.selected || state.completed}>
            <Eraser className="h-4 w-4" /> Erase
          </Button>
          <Button onClick={giveHint} variant="outline" size="sm" disabled={state.completed}>
            <Lightbulb className="h-4 w-4" /> Hint
          </Button>
          <Button onClick={doCheck} variant="outline" size="sm" disabled={state.completed}>
            <Check className="h-4 w-4" /> Check
          </Button>
          <Button onClick={reset} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>

        {state.completed && (
          <div className="mt-3 rounded-md bg-emerald-500/15 px-4 py-2 text-center text-sm font-medium text-emerald-600">
            🎉 Solved in {formatTime(state.elapsed)}!
          </div>
        )}
      </div>
    </div>
  );
}

/** Pre-compute peers list per cell to avoid recomputation. */
const PEERS_CACHE: [number, number][][][] = (() => {
  const out: [number, number][][][] = Array.from({ length: SIZE }, () => []);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      out[r][c] = peersListRaw(r, c);
    }
  }
  return out;
})();

function peersListRaw(r: number, c: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < SIZE; i++) {
    if (i !== c) out.push([r, i]);
    if (i !== r) out.push([i, c]);
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) {
      if (rr !== r || cc !== c) out.push([rr, cc]);
    }
  }
  return out;
}

function peersList(r: number, c: number): [number, number][] {
  return PEERS_CACHE[r][c];
}

function countConflicts(board: Board): number {
  const grid = conflicts(board);
  let n = 0;
  for (const row of grid) for (const cell of row) if (cell) n++;
  return n;
}
