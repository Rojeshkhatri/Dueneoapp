/**
 * Shared helpers for Dueneo education tools.
 *
 * Browser-only, framework-agnostic, tree-shakeable. No JSX in this file
 * so it can stay a `.ts` module.
 */

/** Parse a user-typed number, returning 0 for empty / invalid input. */
export function parseNumber(input: string | number | null | undefined): number {
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  if (input == null) return 0;
  const trimmed = String(input).trim().replace(/[, ]+/g, "");
  if (trimmed === "") return 0;
  const cleaned = trimmed
    .replace(/^[^0-9.\-()+]+/, "")
    .replace(/[^0-9.\-()+]+$/, "")
    .replace(/^\((.+)\)$/, "-$1");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Format a number with thousands separators. */
export function formatNumber(
  value: number,
  options: { digits?: number; locale?: string } = {}
): string {
  const { digits = 2, locale } = options;
  if (!Number.isFinite(value)) value = 0;
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return value.toFixed(digits);
  }
}

/** Format a percentage value (0–100 scale) with a trailing `%` sign. */
export function formatPercent(value: number, digits = 2): string {
  if (!Number.isFinite(value)) value = 0;
  return `${value.toFixed(digits)}%`;
}

/** Format a 0–1 ratio as a percentage with the given number of digits. */
export function ratioToPercent(ratio: number, digits = 2): string {
  return formatPercent(ratio * 100, digits);
}

/** Returns today's date in YYYY-MM-DD for use as an `<input type="date">` value. */
export function todayInputValue(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string into a local-midnight Date (null on invalid). */
export function parseDateInput(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Add `days` days to a date, returning a new Date. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Whole days between two dates (a - b). */
export function dayDiff(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / 86_400_000);
}

/** Format a Date using Intl.DateTimeFormat with safe fallback. */
export function formatDate(
  date: Date | null,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" }
): string {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, options).format(date);
  } catch {
    return date.toDateString();
  }
}

/** ISO weekday 1=Mon .. 7=Sun. */
export function isoWeekday(date: Date): number {
  const d = date.getDay(); // 0=Sun..6=Sat
  return d === 0 ? 7 : d;
}

/** Stable, seed-free Fisher-Yates shuffle (Math.random — sufficient for study tools). */
export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Generate a short unique id (good enough for localStorage keys). */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Trigger a download of a text/blob with the given filename. */
export function downloadText(filename: string, text: string, mime = "text/plain"): void {
  if (typeof window === "undefined") return;
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

/** Trigger a download of an HTML document and open the print dialog. */
export function downloadHtmlAndPrint(filename: string, html: string, title: string): void {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!w) {
    // Popup blocked — fall back to a download.
    downloadText(filename, html, "text/html");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  // Give the new document a beat to lay out before printing.
  setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch {
      // Print failed — leave the tab open.
    }
  }, 400);
}

/** Auto-CSV-quote a field if it contains a delimiter, quote, or newline. */
export function csvField(value: string, delimiter = ","): string {
  const v = value == null ? "" : String(value);
  if (v.includes(delimiter) || v.includes('"') || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

/** Build a CSV string from an array of rows (each row an array of strings). */
export function toCsv(rows: string[][], delimiter = ","): string {
  return rows.map((r) => r.map((c) => csvField(c, delimiter)).join(delimiter)).join("\r\n");
}

/** localStorage helper that survives SSR, parse errors and quota issues. */
export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or disabled storage — silently ignore.
  }
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Standard disclaimer for education tools — outputs are study aids and
 * not a substitute for checking your syllabus or institutional rules.
 */
export const EDU_DISCLAIMER =
  "These results are study aids only and not a substitute for your course syllabus, institutional policies or official academic advice. Always confirm deadlines, weighting and attendance rules with your instructor.";
