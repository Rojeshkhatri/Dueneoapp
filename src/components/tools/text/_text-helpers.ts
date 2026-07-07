/**
 * Shared helpers for Dueneo text tools.
 *
 * Everything here is browser-only, framework-agnostic, and tree-shakeable.
 * No JSX in this file so it can stay a `.ts` module.
 */

/** Maximum input size accepted by text tools (1 MB of UTF-8 text). */
export const MAX_INPUT_BYTES = 1 * 1024 * 1024;

/** Friendly label for an input that is too large. */
export const INPUT_TOO_LARGE_MSG =
  "Input is larger than 1 MB. Please trim it down — these tools run on the main thread.";

/**
 * Returns the UTF-8 byte length of a string. `String.length` would count
 * UTF-16 code units, which is misleading for size-sensitive UIs.
 */
export function byteLength(input: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(input).length;
  }
  return new Blob([input]).size;
}

/** Human-readable byte size (e.g. 12.3 KB). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / Math.pow(1024, i);
  const rounded = i === 0 ? v : v.toFixed(v >= 100 ? 0 : 1);
  return `${rounded} ${units[i]}`;
}

/** Trigger a download of a text file in the browser. */
export function downloadText(filename: string, text: string, mime = "text/plain"): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Format a non-negative integer with thousands separators. */
export function formatInt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.trunc(n).toLocaleString("en-US");
}

/* ─────────────────────────────── Counts ─────────────────────────────── */

/** Count whitespace-separated word tokens in the input. */
export function countWords(text: string): number {
  if (!text) return 0;
  const matches = text.match(/[^\s]+/g);
  return matches ? matches.length : 0;
}

/**
 * Count sentences by splitting on `.`, `!`, `?` followed by whitespace
 * or end-of-string. Trailing punctuation without a following space is
 * treated as the end of a sentence.
 */
export function countSentences(text: string): number {
  if (!text || !text.trim()) return 0;
  // Match runs of non-terminal characters followed by a terminal mark.
  const matches = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g);
  if (!matches) return 0;
  // Filter out runs that are only whitespace/punctuation.
  return matches.filter((s) => s.replace(/[\s.!?]/g, "").length > 0).length;
}

/** Count paragraphs (separated by one or more blank lines). */
export function countParagraphs(text: string): number {
  if (!text || !text.trim()) return 0;
  return text
    .split(/\n\s*\n+/)
    .filter((p) => p.trim().length > 0).length;
}

/** Count lines (counting a trailing newline as ending the last line). */
export function countLines(text: string): number {
  if (text === "") return 0;
  return text.split(/\r\n|\r|\n/).length;
}

/* ────────────────────────── Reading / speaking ─────────────────────── */

/**
 * Format a duration in seconds as `X min Y sec` or `Y sec`,
 * rounding to whole seconds.
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 sec";
  const total = Math.round(seconds);
  if (total < 60) return `${total} sec`;
  const minutes = Math.floor(total / 60);
  const remaining = total - minutes * 60;
  if (remaining === 0) return `${minutes} min`;
  return `${minutes} min ${remaining} sec`;
}

/* ─────────────────────────── Case conversion ───────────────────────── */

/**
 * Split text into a list of words. Handles camelCase, PascalCase,
 * snake_case, kebab-case, SCREAMING_SNAKE_CASE and plain whitespace.
 */
export function splitWords(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  // Insert spaces at camelCase / PascalCase boundaries.
  const spaced = trimmed
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  // Split on any non-alphanumeric run.
  return spaced
    .split(/[^a-zA-Z0-9]+/)
    .filter((w) => w.length > 0);
}

export function toUpperCase(text: string): string {
  return text.toUpperCase();
}

export function toLowerCase(text: string): string {
  return text.toLowerCase();
}

/** Capitalise the first letter of every word. */
export function toTitleCase(text: string): string {
  return text.replace(/[A-Za-z\u00C0-\u024F]+[A-Za-z\u00C0-\u024F']*/g, (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

/** Capitalise the first letter of each sentence; lower-case the rest. */
export function toSentenceCase(text: string): string {
  const lower = text.toLowerCase();
  return lower.replace(
    /(^|[\n\r.!?]+\s+|\s+["(])([a-z\u00C0-\u024F])/g,
    (_m, prefix: string, ch: string) => prefix + ch.toUpperCase()
  );
}

/** camelCase — first word lower, subsequent words capitalised. */
export function toCamelCase(text: string): string {
  const words = splitWords(text);
  if (words.length === 0) return "";
  return words
    .map((w, i) =>
      i === 0
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join("");
}

/** PascalCase — every word capitalised. */
export function toPascalCase(text: string): string {
  const words = splitWords(text);
  if (words.length === 0) return "";
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

/** snake_case — words joined with underscores. */
export function toSnakeCase(text: string): string {
  return splitWords(text)
    .map((w) => w.toLowerCase())
    .join("_");
}

/** kebab-case — words joined with hyphens. */
export function toKebabCase(text: string): string {
  return splitWords(text)
    .map((w) => w.toLowerCase())
    .join("-");
}

/** CONSTANT_CASE — upper-case words joined with underscores. */
export function toConstantCase(text: string): string {
  return splitWords(text)
    .map((w) => w.toUpperCase())
    .join("_");
}

/* ──────────────────────────── Slug generator ───────────────────────── */

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "on", "in", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "it", "as", "this", "that", "these", "those", "into", "than",
  "then", "so", "such", "no", "nor", "not", "too", "very", "can", "will",
  "just", "should", "now",
]);

export interface SlugOptions {
  separator: string;
  lowercase: boolean;
  removeStopWords: boolean;
  stripAccents: boolean;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function slugify(text: string, opts: SlugOptions): string {
  let s = text;
  if (opts.stripAccents) {
    s = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  }
  if (opts.lowercase) {
    s = s.toLowerCase();
  }
  const esc = escapeRegex(opts.separator);
  // Replace any run of non-alphanumeric characters with the separator.
  s = s.replace(/[^a-zA-Z0-9]+/g, opts.separator);
  // Trim separators from edges.
  s = s.replace(new RegExp(`^${esc}+|${esc}+$`, "g"), "");
  // Collapse repeated separators.
  s = s.replace(new RegExp(`${esc}{2,}`, "g"), opts.separator);
  // Remove stop words if requested.
  if (opts.removeStopWords) {
    const parts = s.split(opts.separator).filter(Boolean);
    s = parts
      .filter((p) => !STOP_WORDS.has(p.toLowerCase()))
      .join(opts.separator);
  }
  return s;
}

/* ─────────────────────────── Lorem Ipsum ───────────────────────────── */

const LOREM_WORDS = (
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod " +
  "tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam " +
  "quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo " +
  "consequat duis aute irure in reprehenderit voluptate velit esse cillum " +
  "eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident " +
  "sunt culpa qui officia deserunt mollit anim id est laborum at vero eos " +
  "accusam et justo duo dolores ea rebum stet clita kasd gubergren no sea " +
  "takimata sanctus est lorem ipsum dolor sit amet"
).split(/\s+/);

const LOREM_SENTENCES: string[] = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  "Curabitur pretium tincidunt lacus, at gravida nisl pretium vitae.",
  "Nulla malesuada nibh eu nisi suscipit, sit amet fermentum ipsum pulvinar.",
  "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.",
  "Praesent volutpat nibh non sapien fermentum, in pretium risus faucibus.",
  "Mauris tincidunt justo eget magna consectetur, vitae elementum leo luctus.",
  "Aenean vehicula eros vitae nisl convallis, et gravida arcu bibendum.",
  "Fusce ac turpis quis ligula lacinia aliquet.",
];

/** Mulberry32 — tiny deterministic PRNG so the same seed gives the same text. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

/** Generate a single sentence of Lorem Ipsum with 6–16 words. */
function makeSentence(rand: () => number): string {
  const length = 6 + Math.floor(rand() * 11);
  const words: string[] = [];
  for (let i = 0; i < length; i++) {
    words.push(pick(LOREM_WORDS, rand));
  }
  let s = words.join(" ");
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[.!?]$/.test(s)) s += ".";
  return s;
}

/** Generate a paragraph of 3–6 sentences. */
function makeParagraph(rand: () => number): string {
  const n = 3 + Math.floor(rand() * 4);
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0 && rand() < 0.5) {
      parts.push(pick(LOREM_SENTENCES, rand));
    } else {
      parts.push(makeSentence(rand));
    }
  }
  return parts.join(" ");
}

export type LoremKind = "paragraphs" | "sentences" | "words";

export function generateLorem(
  kind: LoremKind,
  count: number,
  seed = Date.now() & 0xffffffff
): string {
  const safe = Math.max(0, Math.min(1000, Math.trunc(count)));
  if (safe === 0) return "";
  const rand = mulberry32(seed);
  if (kind === "paragraphs") {
    const parts: string[] = [];
    for (let i = 0; i < safe; i++) parts.push(makeParagraph(rand));
    return parts.join("\n\n");
  }
  if (kind === "sentences") {
    const parts: string[] = [];
    for (let i = 0; i < safe; i++) {
      if (i === 0 && rand() < 0.5) parts.push(pick(LOREM_SENTENCES, rand));
      else parts.push(makeSentence(rand));
    }
    return parts.join(" ");
  }
  // words
  const words: string[] = [];
  for (let i = 0; i < safe; i++) words.push(pick(LOREM_WORDS, rand));
  let s = words.join(" ");
  s = s.charAt(0).toUpperCase() + s.slice(1) + ".";
  return s;
}
