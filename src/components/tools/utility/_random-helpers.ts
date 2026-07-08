/**
 * Shared helpers for the random / picker tools (Task 2-a-viral).
 *
 * All randomness is browser-only. We prefer `crypto.getRandomValues`
 * (rejection-sampled to avoid modulo bias) and fall back to `Math.random`
 * only when `crypto` is unavailable.
 */

/** Returns true if the WebCrypto API is available. */
export function hasCrypto(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.getRandomValues === "function"
  );
}

/**
 * Uniform random integer in [0, max) using rejection sampling so the
 * modulo bias is removed. Falls back to `Math.floor(Math.random()*max)`
 * when `crypto` is unavailable.
 */
export function randomInt(max: number): number {
  if (max <= 0) return 0;
  if (!hasCrypto()) return Math.floor(Math.random() * max);
  const limit = 0xffffffff;
  // Largest multiple of `max` that is <= 2^32 - 1.
  const maxUsable = limit - ((limit % max) + 1) % max;
  const buf = new Uint32Array(1);
  // Loop a few times then fall back (the chance of falling through is
  // astronomically small for small `max`).
  for (let i = 0; i < 32; i++) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] <= maxUsable) return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

/** Uniform integer in the inclusive range [min, max]. */
export function randomIntInRange(min: number, max: number): number {
  if (min > max) [min, max] = [max, min];
  return min + randomInt(max - min + 1);
}

/** Pick a random element from a non-empty array. */
export function randomPick<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("Cannot pick from an empty array.");
  return arr[randomInt(arr.length)] as T;
}

/** Fisher–Yates shuffle (returns a new array). Uses crypto randomness. */
export function secureShuffle<T>(input: readonly T[]): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    if (i !== j) {
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }
  return arr;
}

/** Parse a textarea blob into an array of trimmed, non-empty lines. */
export function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** Parse a textarea or comma-separated blob into options. */
export function parseOptions(text: string): string[] {
  return text
    .split(/[,\n\r]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/**
 * A pleasing palette for wheel segments. Each entry is a [fill, text]
 * pair (text is either dark or light depending on the fill brightness).
 */
export const WHEEL_PALETTE: { fill: string; text: string }[] = [
  { fill: "#ef4444", text: "#ffffff" }, // red-500
  { fill: "#f97316", text: "#1f2937" }, // orange-500
  { fill: "#f59e0b", text: "#1f2937" }, // amber-500
  { fill: "#eab308", text: "#1f2937" }, // yellow-500
  { fill: "#84cc16", text: "#1f2937" }, // lime-500
  { fill: "#22c55e", text: "#ffffff" }, // green-500
  { fill: "#10b981", text: "#ffffff" }, // emerald-500
  { fill: "#14b8a6", text: "#ffffff" }, // teal-500
  { fill: "#06b6d4", text: "#1f2937" }, // cyan-500
  { fill: "#0ea5e9", text: "#ffffff" }, // sky-500
  { fill: "#6366f1", text: "#ffffff" }, // indigo-500
  { fill: "#8b5cf6", text: "#ffffff" }, // violet-500
  { fill: "#a855f7", text: "#ffffff" }, // purple-500
  { fill: "#d946ef", text: "#ffffff" }, // fuchsia-500
  { fill: "#ec4899", text: "#ffffff" }, // pink-500
  { fill: "#f43f5e", text: "#ffffff" }, // rose-500
];

/** Team header palette (slightly different feel). */
export const TEAM_PALETTE: { fill: string; text: string; soft: string }[] = [
  { fill: "#ef4444", text: "#ffffff", soft: "#fee2e2" },
  { fill: "#f97316", text: "#ffffff", soft: "#ffedd5" },
  { fill: "#eab308", text: "#1f2937", soft: "#fef9c3" },
  { fill: "#22c55e", text: "#ffffff", soft: "#dcfce7" },
  { fill: "#14b8a6", text: "#ffffff", soft: "#ccfbf1" },
  { fill: "#0ea5e9", text: "#ffffff", soft: "#e0f2fe" },
  { fill: "#8b5cf6", text: "#ffffff", soft: "#ede9fe" },
  { fill: "#ec4899", text: "#ffffff", soft: "#fce7f3" },
];
