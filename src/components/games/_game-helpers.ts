/**
 * Shared helpers for the Dueneo games.
 *
 * Everything here is pure (no React) so it can be unit-tested in isolation
 * and tree-shaken into the bundle of any game component.
 */

/** Result of {@link checkWin} for a generic board game. */
export interface WinResult {
  winner: number;
  line: number[] | null;
}

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Returns a function that produces floats in [0, 1).
 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash an arbitrary string into a 32-bit unsigned integer. */
export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Returns the current date as `YYYY-MM-DD` in local time. */
export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Try to read a JSON value from localStorage, returning `fallback` on any
 * error or in non-browser environments.
 */
export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Write a JSON value to localStorage, swallowing any errors. */
export function writeLocal(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / privacy mode errors
  }
}

/** Remove a localStorage key, swallowing any errors. */
export function removeLocal(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Format a number of seconds as `M:SS` (or `H:MM:SS` past an hour). */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

/** Pick a random element from a non-empty array. */
export function pickRandom<T>(arr: readonly T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Fisher-Yates shuffle (returns a new array). */
export function shuffle<T>(input: readonly T[], rng: () => number = Math.random): T[] {
  const out = input.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Check whether any winning line exists on a 1D board of `size` cells per
 * side. Returns the winning player (1 or 2) and the indices of the winning
 * line, or `{ winner: 0, line: null }` if none.
 */
export function checkWin(
  board: readonly number[],
  size: number,
  winLen: number
): WinResult {
  const lines = winningLines(size, winLen);
  for (const line of lines) {
    const first = board[line[0]];
    if (first === 0) continue;
    if (line.every((i) => board[i] === first)) {
      return { winner: first, line };
    }
  }
  return { winner: 0, line: null };
}

/**
 * Enumerate all winning lines on an N×N grid of given win length.
 * Lines are arrays of cell indices.
 */
export function winningLines(size: number, winLen: number): number[][] {
  const lines: number[][] = [];
  // Horizontal
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - winLen; c++) {
      const line: number[] = [];
      for (let k = 0; k < winLen; k++) line.push(r * size + c + k);
      lines.push(line);
    }
  }
  // Vertical
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - winLen; r++) {
      const line: number[] = [];
      for (let k = 0; k < winLen; k++) line.push((r + k) * size + c);
      lines.push(line);
    }
  }
  // Diagonal down-right
  for (let r = 0; r <= size - winLen; r++) {
    for (let c = 0; c <= size - winLen; c++) {
      const line: number[] = [];
      for (let k = 0; k < winLen; k++) line.push((r + k) * size + c + k);
      lines.push(line);
    }
  }
  // Diagonal up-right
  for (let r = winLen - 1; r < size; r++) {
    for (let c = 0; c <= size - winLen; c++) {
      const line: number[] = [];
      for (let k = 0; k < winLen; k++) line.push((r - k) * size + c + k);
      lines.push(line);
    }
  }
  return lines;
}
