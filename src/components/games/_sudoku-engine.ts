/**
 * Pure-logic Sudoku engine: generation, validation, hints and saving.
 *
 * Boards are 9×9 grids of numbers 0..9 where 0 = empty.
 * Cells are addressed by [row, col] with row, col ∈ [0, 8].
 */

export type Board = number[][];
export type Difficulty = "easy" | "medium" | "hard" | "expert";

export interface DifficultyConfig {
  /** Approximate number of clues to leave in the puzzle. */
  clues: number;
  label: string;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { clues: 40, label: "Easy" },
  medium: { clues: 32, label: "Medium" },
  hard: { clues: 27, label: "Hard" },
  expert: { clues: 22, label: "Expert" },
};

const SIZE = 9;
const BOX = 3;

/** Create an empty 9×9 board. */
export function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
}

/** Deep-clone a board. */
export function cloneBoard(b: Board): Board {
  return b.map((row) => row.slice());
}

/** Build the list of cells in the same row, column or box as [r, c]. */
export function peers(r: number, c: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < SIZE; i++) {
    if (i !== c) out.push([r, i]);
    if (i !== r) out.push([i, c]);
  }
  const br = Math.floor(r / BOX) * BOX;
  const bc = Math.floor(c / BOX) * BOX;
  for (let rr = br; rr < br + BOX; rr++) {
    for (let cc = bc; cc < bc + BOX; cc++) {
      if (rr !== r || cc !== c) out.push([rr, cc]);
    }
  }
  return out;
}

/** Is it legal to place `n` at [r, c] given the current board? */
export function isLegal(board: Board, r: number, c: number, n: number): boolean {
  if (n === 0) return true;
  for (const [rr, cc] of peers(r, c)) {
    if (board[rr][cc] === n) return false;
  }
  return true;
}

/** Find the next empty cell with the fewest candidates (MRV heuristic). */
function findEmpty(board: Board): [number, number] | null {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return [r, c];
    }
  }
  return null;
}

/** Solve via backtracking. Returns true and fills `board` in place if solvable. */
export function solve(board: Board): boolean {
  const cell = findEmpty(board);
  if (!cell) return true;
  const [r, c] = cell;
  for (let n = 1; n <= 9; n++) {
    if (isLegal(board, r, c, n)) {
      board[r][c] = n;
      if (solve(board)) return true;
      board[r][c] = 0;
    }
  }
  return false;
}

/**
 * Count solutions (up to `limit`). Used to verify a puzzle has a unique
 * solution. Does not mutate the input.
 */
export function countSolutions(board: Board, limit = 2): number {
  const copy = cloneBoard(board);
  let count = 0;
  const helper = (): boolean => {
    const cell = findEmpty(copy);
    if (!cell) {
      count++;
      return count >= limit;
    }
    const [r, c] = cell;
    for (let n = 1; n <= 9; n++) {
      if (isLegal(copy, r, c, n)) {
        copy[r][c] = n;
        if (helper()) return true;
        copy[r][c] = 0;
      }
    }
    return false;
  };
  helper();
  return count;
}

/** Fisher-Yates shuffle in place. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate a fully-solved Sudoku grid via randomised backtracking.
 * Starts from an empty board.
 */
export function generateSolved(): Board {
  const board = emptyBoard();
  // Seed diagonal boxes (they don't share rows/cols so can be filled independently).
  const fillBox = (br: number, bc: number) => {
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    let idx = 0;
    for (let r = br; r < br + BOX; r++) {
      for (let c = bc; c < bc + BOX; c++) {
        board[r][c] = nums[idx++];
      }
    }
  };
  fillBox(0, 0);
  fillBox(3, 3);
  fillBox(6, 6);
  solve(board);
  return board;
}

/**
 * Punch holes in a solved board to produce a puzzle with approximately
 * `clues` filled cells. Attempts to verify uniqueness; if removing a cell
 * produces multiple solutions, it's left in.
 *
 * @param maxIter Limits total work to keep generation under ~1s on slow devices.
 */
export function makePuzzle(solved: Board, clues: number, maxIter = 200): Board {
  const puzzle = cloneBoard(solved);
  const cells: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) cells.push([r, c]);
  shuffle(cells);
  const targetToRemove = SIZE * SIZE - clues;
  let removed = 0;
  let iter = 0;
  for (const [r, c] of cells) {
    if (removed >= targetToRemove) break;
    if (iter++ > maxIter) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    // Verify still uniquely solvable.
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[r][c] = backup;
    } else {
      removed++;
    }
  }
  return puzzle;
}

/**
 * Generate a complete puzzle (problem + solution) for the given difficulty.
 * Bounded so it never runs longer than a soft budget.
 */
export function generatePuzzle(difficulty: Difficulty): { puzzle: Board; solution: Board } {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const solution = generateSolved();
  const puzzle = makePuzzle(solution, cfg.clues);
  return { puzzle, solution };
}

/** Seeded version of {@link generatePuzzle} for daily mode. */
export function generatePuzzleSeeded(
  seed: number,
  difficulty: Difficulty = "medium"
): { puzzle: Board; solution: Board } {
  // Use a simple seeded RNG (mulberry32) by temporarily overriding Math.random.
  let a = seed >>> 0;
  const rng = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const origRandom = Math.random;
  (Math as { random: () => number }).random = rng;
  try {
    return generatePuzzle(difficulty);
  } finally {
    (Math as { random: () => number }).random = origRandom;
  }
}

/** Compute a 2D grid of conflict flags (true = same value exists in row/col/box). */
export function conflicts(board: Board): boolean[][] {
  const out: boolean[][] = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c];
      if (v === 0) continue;
      for (const [rr, cc] of peers(r, c)) {
        if (board[rr][cc] === v) {
          out[r][c] = true;
          out[rr][cc] = true;
        }
      }
    }
  }
  return out;
}

/** Is the board completely and correctly filled? */
export function isComplete(board: Board): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c];
      if (v === 0) return false;
      if (!isLegal(board, r, c, v)) return false;
    }
  }
  return true;
}

/** Find the first empty cell whose solution is known — for the Hint button. */
export function hint(board: Board, solution: Board): [number, number, number] | null {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) {
        return [r, c, solution[r][c]];
      }
    }
  }
  return null;
}
