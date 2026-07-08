"use client";

/**
 * Shared helpers for Dueneo content-creator tools (Task 3-content, IDs 190-198).
 *
 * Everything runs 100% in the browser — no backend, no uploads. Timestamp
 * parsing and formatting is centralised here so the podcast chapter generator,
 * YouTube timestamp formatter and subtitle editor all agree on the rules.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// Re-export shared utilities so each content tool has a consistent look.
export { downloadText } from "../developer/_dev-helpers";

/** Maximum size accepted by text-based content tools (1 MB of UTF-8 text). */
export const MAX_INPUT_BYTES = 1 * 1024 * 1024;

/** Friendly label for an input that is too large. */
export const INPUT_TOO_LARGE_MSG =
  "Input is larger than 1 MB. Please trim it down — these tools run on the main thread.";

/** UTF-8 byte length of a string. */
export function byteLength(input: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(input).length;
  }
  return new Blob([input]).size;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMESTAMP PARSING & FORMATTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse a timestamp string into seconds.
 *
 * Accepts:
 *   "1:23"            -> 83          (MM:SS)
 *   "01:23"           -> 83
 *   "1:02:03"         -> 3723        (HH:MM:SS)
 *   "1.5"             -> 1.5         (plain seconds, decimal)
 *   "90s" / "90 sec"  -> 90          (trailing "s" tolerated)
 *
 * Returns null when the input is empty or does not look like a timestamp.
 */
export function parseTimestamp(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;

  // Strip a trailing unit suffix.
  const cleaned = s.replace(/\s*s(ec(onds?)?)?\s*$/i, "");

  // Plain decimal number → seconds.
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    const v = parseFloat(cleaned);
    return Number.isFinite(v) && v >= 0 ? v : null;
  }

  // Colon-separated H:M:S or M:S (with optional decimal seconds).
  const parts = cleaned.split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  let sum = 0;
  for (const p of parts) {
    if (!/^\d+(\.\d+)?$/.test(p)) return null;
    sum = sum * 60 + parseFloat(p);
  }
  return Number.isFinite(sum) && sum >= 0 ? sum : null;
}

/**
 * Format a number of seconds as `HH:MM:SS` (or `MM:SS` when under an hour).
 * Used by podcast chapter JSON / description output.
 */
export function formatHMS(seconds: number, alwaysHours = false): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  if (h > 0 || alwaysHours) {
    return `${String(h).padStart(2, "0")}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Format a number of seconds in YouTube description style — no leading zeros,
 * minutes always shown, hours only when present.
 *
 *   5     -> "0:05"
 *   83    -> "1:23"
 *   3723  -> "1:02:03"
 */
export function formatYouTubeTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * Format a number of seconds (with optional millisecond precision) as
 * `HH:MM:SS,mmm` — the SRT timestamp format. Uses a comma before the ms.
 */
export function formatSrtTime(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(totalMs / 3_600_000);
  const m = Math.floor((totalMs % 3_600_000) / 60_000);
  const s = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return (
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:` +
    `${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`
  );
}

/** Parse an SRT timestamp (`HH:MM:SS,mmm` or `HH:MM:SS.mmm`) into seconds. */
export function parseSrtTime(raw: string): number | null {
  const s = raw.trim();
  const m = s.match(/^(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})$/);
  if (!m) return null;
  const [, h, mi, se, ms] = m;
  return (
    parseInt(h, 10) * 3600 +
    parseInt(mi, 10) * 60 +
    parseInt(se, 10) +
    parseInt(ms.padEnd(3, "0"), 10) / 1000
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SRT PARSER / SERIALIZER
// ═══════════════════════════════════════════════════════════════════════════

export interface SrtEntry {
  /** Sequential index, 1-based. */
  index: number;
  /** Start time in seconds. */
  start: number;
  /** End time in seconds. */
  end: number;
  /** Subtitle text (may contain multiple lines). */
  text: string;
}

/**
 * Parse a complete SRT document into a list of entries. Malformed lines are
 * skipped; the parser is forgiving about trailing whitespace and BOMs.
 */
export function parseSrt(input: string): SrtEntry[] {
  const cleaned = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!cleaned) return [];

  const blocks = cleaned.split(/\n\s*\n/);
  const entries: SrtEntry[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.length > 0);
    if (lines.length < 2) continue;

    let lineIdx = 0;
    // Optional index line — must be all digits.
    let index = entries.length + 1;
    if (/^\d+$/.test(lines[0].trim())) {
      index = parseInt(lines[0].trim(), 10);
      lineIdx = 1;
    }

    const timeLine = lines[lineIdx];
    if (!timeLine) continue;
    const m = timeLine.match(
      /^([\d:,.\s]+?)\s*-->\s*([\d:,.\s]+?)(?:\s+.*)?$/,
    );
    if (!m) continue;
    const start = parseSrtTime(m[1].trim());
    const end = parseSrtTime(m[2].trim());
    if (start == null || end == null) continue;

    const text = lines
      .slice(lineIdx + 1)
      .join("\n")
      .trim();
    entries.push({ index, start, end, text });
  }

  return entries;
}

/** Serialise SRT entries back into a valid SRT document. */
export function serializeSrt(entries: SrtEntry[]): string {
  return entries
    .map((e, i) => {
      const idx = i + 1;
      return `${idx}\n${formatSrtTime(e.start)} --> ${formatSrtTime(e.end)}\n${e.text}`;
    })
    .join("\n\n");
}

/**
 * Fix overlapping entries: ensures each entry's end time does not exceed the
 * next entry's start time. Returns a new array (does not mutate the input).
 */
export function fixOverlaps(entries: SrtEntry[]): SrtEntry[] {
  const out = entries.map((e) => ({ ...e }));
  for (let i = 0; i < out.length - 1; i++) {
    if (out[i].end > out[i + 1].start) {
      // Clip the end to just before the next entry's start (1 ms gap).
      out[i].end = Math.max(out[i].start + 0.001, out[i + 1].start - 0.001);
    }
    // Guard against entries where end ≤ start.
    if (out[i].end <= out[i].start) {
      out[i].end = out[i].start + 0.5;
    }
  }
  const last = out[out.length - 1];
  if (last && last.end <= last.start) {
    last.end = last.start + 1;
  }
  return out;
}

/**
 * Shift every entry's start and end time by `delta` seconds (can be negative).
 * Times are clamped at 0 so subtitles never start before the video does.
 */
export function shiftEntries(entries: SrtEntry[], delta: number): SrtEntry[] {
  return entries.map((e) => {
    const start = Math.max(0, e.start + delta);
    const end = Math.max(start + 0.001, e.end + delta);
    return { ...e, start, end };
  });
}

/** Renumber entries so their `index` is sequential 1..N. */
export function renumberEntries(entries: SrtEntry[]): SrtEntry[] {
  return entries.map((e, i) => ({ ...e, index: i + 1 }));
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSCRIPT / STRING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Common English filler words and discourse markers removed by the transcript
 * cleaner. Each entry is matched as a complete-word, case-insensitive phrase.
 */
export const FILLER_WORDS = [
  "um",
  "uh",
  "umm",
  "uhh",
  "er",
  "ah",
  "ahh",
  "like",
  "you know",
  "i mean",
  "basically",
  "literally",
  "actually",
  "sort of",
  "kind of",
  "kinda",
  "sorta",
  "okay so",
  "so yeah",
  "you see",
  "well so",
] as const;

/** Counts words in a string. A "word" is a maximal run of non-whitespace. */
export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/**
 * Naive sentence splitter — splits on `.`, `!`, `?` followed by whitespace or
 * end-of-string. Returns the list of trimmed sentences (empty entries removed).
 */
export function splitSentences(text: string): string[] {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return [];
  const matches = t.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g);
  return matches ? matches.map((s) => s.trim()).filter(Boolean) : [];
}

/** Capitalise the first letter of every sentence in `text`. */
export function capitaliseSentences(text: string): string {
  // Replace runs of whitespace with a single space to normalise.
  const normalised = text.replace(/\s+/g, " ").trim();
  if (!normalised) return "";
  return normalised.replace(
    /(^|[.!?]\s+)([a-z])/g,
    (_, prefix: string, ch: string) => prefix + ch.toUpperCase(),
  );
}

/**
 * Remove speaker labels that commonly appear in auto-generated transcripts.
 * Handles patterns like `Speaker 1:`, `John:`, `[John]:`, `>> John:` and
 * `JOHN:` at the start of a paragraph or line.
 */
export function removeSpeakerLabels(text: string): string {
  // Lines starting with "Name:" or "Name :" — name may contain letters,
  // digits, spaces, apostrophes and hyphens, max 40 chars to avoid eating
  // real sentences that happen to start with a colon.
  const lineRe =
    /^\s*([A-Z][A-Za-z0-9'’\- ]{0,40}|Speaker\s+\d+|Interviewer|Host|Guest)\s*:\s*/gm;
  // Bracketed labels at start of line: "[John]:", "(Host):", ">> John:".
  const bracketRe =
    /^\s*(?:>>\s*)?[\[(]\s*([A-Za-z][A-Za-z0-9'’\- ]{0,40})\s*[\])]\s*:?\s*/gm;
  return text.replace(lineRe, "").replace(bracketRe, "");
}

/** Remove bracketed timestamps like [00:12], (01:23), <00:00:05> anywhere. */
export function removeTimestamps(text: string): string {
  return text
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b\s*[-–—]\s*/g, "") // "12:34 - " prefixes
    .replace(/[\[(<]\s*\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?\s*[\])>]/g, "")
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, "");
}

/**
 * Remove filler words from `text`. Returns the cleaned string and the number
 * of removed occurrences. Phrases like "you know" are matched as a unit.
 */
export function removeFillerWords(
  text: string,
): { cleaned: string; removed: number } {
  let cleaned = text;
  let removed = 0;
  for (const filler of FILLER_WORDS) {
    // Word-boundary safe; filler phrases are pure letters/spaces.
    const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b[\\s,]*`, "gi");
    cleaned = cleaned.replace(re, () => {
      removed += 1;
      return "";
    });
  }
  // Tidy double spaces and leading/trailing whitespace per line.
  cleaned = cleaned.replace(/[ \t]{2,}/g, " ").replace(/^[ \t]+|[ \t]+$/gm, "");
  return { cleaned, removed };
}

/** Insert paragraph breaks every `n` sentences. */
export function addParagraphBreaks(text: string, n: number): string {
  if (!Number.isFinite(n) || n < 1) return text;
  const sentences = splitSentences(text);
  if (sentences.length === 0) return text;
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += n) {
    paragraphs.push(sentences.slice(i, i + n).join(" "));
  }
  return paragraphs.join("\n\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// WORD / TITLE ANALYSIS DICTIONARIES (video-title-scorer + hook-analyzer)
// ═══════════════════════════════════════════════════════════════════════════

/** Power words that signal authority or instructional promise. */
export const POWER_WORDS = [
  "ultimate",
  "best",
  "proven",
  "secret",
  "how to",
  "why",
  "guide",
  "complete",
  "definitive",
  "essential",
  "guaranteed",
  "step by step",
  "step-by-step",
  "expert",
  "master",
  "exclusive",
  "insider",
  "advanced",
  "comprehensive",
  "easy",
  "fast",
  "quick",
  "simple",
  "instant",
  "now",
  "today",
  "free",
  "new",
  "updated",
] as const;

/** Emotional trigger words (high arousal). */
export const EMOTIONAL_TRIGGERS = [
  "shocking",
  "amazing",
  "incredible",
  "unbelievable",
  "insane",
  "crazy",
  "mind-blowing",
  "mind blowing",
  "epic",
  "brilliant",
  "genius",
  "outrageous",
  "stunning",
  "breathtaking",
  "terrifying",
  "hilarious",
  "beautiful",
  "devastating",
  "dangerous",
  "forbidden",
  "hidden",
  "banned",
  "exposed",
  "revealed",
  "truth",
  "warning",
  "scary",
  "wild",
  "unreal",
] as const;

/** Curiosity-gap phrases that hint at withheld information. */
export const CURIOSITY_PHRASES = [
  "you won't believe",
  "you wont believe",
  "nobody talks about",
  "nobody tells you",
  "what happens next",
  "the truth about",
  "what they don't tell you",
  "what they dont tell you",
  "this is why",
  "the reason why",
  "here's why",
  "heres why",
  "this one trick",
  "secret",
  "hidden",
  "revealed",
  "exposed",
  "no one is talking about",
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

/** Section header used inside tool bodies. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}

/** Label/value pair used in result panels. */
export function Row({
  label,
  value,
  hint,
  highlight,
  muted,
  icon,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  highlight?: boolean;
  muted?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={cn(
          "text-sm",
          highlight
            ? "font-medium text-primary"
            : muted
              ? "text-muted-foreground/80"
              : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "flex items-center gap-1.5 font-mono tabular-nums",
          highlight
            ? "text-base font-semibold text-primary"
            : muted
              ? "text-sm text-muted-foreground"
              : "text-base text-foreground",
        )}
      >
        {icon}
        {value}
        {hint && (
          <span className="ml-1 text-[11px] font-sans text-muted-foreground/70">
            {hint}
          </span>
        )}
      </span>
    </div>
  );
}

/** Small stat card. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "primary" | "emerald" | "rose" | "amber" | "sky";
}) {
  const toneClass = {
    default: "bg-background",
    primary: "bg-primary/5 border-primary/30",
    emerald: "bg-emerald-500/5 border-emerald-500/30",
    rose: "bg-rose-500/5 border-rose-500/30",
    amber: "bg-amber-500/5 border-amber-500/30",
    sky: "bg-sky-500/5 border-sky-500/30",
  }[tone];
  return (
    <div className={cn("rounded-lg border p-3", toneClass)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** A small horizontal score bar 0–100 with optional colour by range. */
export function ScoreBar({
  value,
  max = 100,
  tone,
}: {
  value: number;
  max?: number;
  tone?: "auto" | "emerald" | "amber" | "rose" | "primary";
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const resolvedTone =
    tone === "auto"
      ? pct >= 75
        ? "emerald"
        : pct >= 50
          ? "amber"
          : "rose"
      : tone ?? "primary";
  const barClass = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    primary: "bg-primary",
  }[resolvedTone];
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={cn("h-full rounded-full transition-all", barClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** A pill badge for showing a yes/no feature flag. */
export function TriggerBadge({
  label,
  fired,
  description,
}: {
  label: string;
  fired: boolean;
  description?: string;
}) {
  return (
    <span
      title={description}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        fired
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          fired ? "bg-emerald-500" : "bg-muted-foreground/40",
        )}
      />
      {label}
    </span>
  );
}
