/**
 * Shared helpers for the "Advanced Developer Tools" batch (Task 3-developer,
 * tool IDs 174-182). Browser-only, no backend.
 */

import yaml from "js-yaml";

export const MAX_INPUT_BYTES = 1 * 1024 * 1024;
export const INPUT_TOO_LARGE_MSG =
  "Input is larger than 1 MB. Please trim it down — these tools run on the main thread.";

/** UTF-8 byte length of a string. */
export function byteLength(input: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(input).length;
  }
  return new Blob([input]).size;
}

/** Human-readable byte size. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / Math.pow(1024, i);
  const rounded = i === 0 ? v : v.toFixed(v >= 100 ? 0 : 1);
  return `${rounded} ${units[i]}`;
}

/** Trigger a text-file download in the browser. */
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

/* ─────────────────────────── YAML parsing ─────────────────────────── */

export interface YamlParseResult {
  ok: boolean;
  /** Parsed documents (js-yaml loadAll supports multi-document streams). */
  docs: unknown[];
  /** Pretty error message with line reference, if parsing failed. */
  error?: string;
  errorLine?: number;
}

/**
 * Parse YAML (single or multi-document). Returns all documents plus a
 * friendly error string with line number on failure. Never throws.
 */
export function parseYamlAll(input: string): YamlParseResult {
  const docs: unknown[] = [];
  try {
    yaml.loadAll(input, (doc) => {
      docs.push(doc);
    }, { json: true });
    return { ok: true, docs };
  } catch (e) {
    const err = e as { mark?: { line?: number; column?: number }; message?: string; reason?: string };
    const line = err.mark && typeof err.mark.line === "number" ? err.mark.line + 1 : undefined;
    const reason = err.reason || err.message || "YAML parse error";
    const msg = line
      ? `${reason} (line ${line})`
      : reason;
    return { ok: false, docs, error: msg, errorLine: line };
  }
}

/** Parse a single YAML document. Returns null on error. */
export function parseYamlSingle<T = unknown>(input: string): T | null {
  try {
    return yaml.load(input) as T;
  } catch {
    return null;
  }
}

/**
 * Find the 1-based line number of the first occurrence of a literal string
 * inside the source. Used to attach line references to validation messages.
 */
export function findLine(source: string, needle: string): number | undefined {
  const idx = source.indexOf(needle);
  if (idx === -1) return undefined;
  return source.slice(0, idx).split(/\r?\n/).length;
}

/* ─────────────────────── JSON tree utilities ──────────────────────── */

export interface JsonNode {
  key: string;
  value: unknown;
  path: string;
  depth: number;
  type: "object" | "array" | "string" | "number" | "boolean" | "null" | "undefined";
  /** Children for object/array nodes. */
  children?: JsonNode[];
  /** Number of direct children. */
  count?: number;
}

function jsonTypeOf(v: unknown): JsonNode["type"] {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v === "object" ? "object" : (typeof v as JsonNode["type"]);
}

/** Build a tree of JsonNodes from a parsed JSON value. */
export function buildJsonTree(value: unknown, key = "root", path = "$", depth = 0): JsonNode {
  const type = jsonTypeOf(value);
  const node: JsonNode = { key, value, path, depth, type };
  if (type === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>);
    node.children = entries.map(([k, v]) =>
      buildJsonTree(v, k, `${path}.${k}`, depth + 1)
    );
    node.count = entries.length;
  } else if (type === "array") {
    const arr = value as unknown[];
    node.children = arr.map((v, i) =>
      buildJsonTree(v, String(i), `${path}[${i}]`, depth + 1)
    );
    node.count = arr.length;
  }
  return node;
}

/** Maximum nesting depth of a JSON value (root = 1). */
export function jsonDepth(value: unknown): number {
  if (Array.isArray(value)) {
    if (value.length === 0) return 1;
    return 1 + Math.max(...value.map(jsonDepth));
  }
  if (value && typeof value === "object") {
    const vals = Object.values(value as Record<string, unknown>);
    if (vals.length === 0) return 1;
    return 1 + Math.max(...vals.map(jsonDepth));
  }
  return 1;
}

/** Count distinct keys across an entire JSON value (recursive). */
export function jsonKeyCount(value: unknown): number {
  let count = 0;
  if (Array.isArray(value)) {
    for (const v of value) count += jsonKeyCount(v);
  } else if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    for (const k of Object.keys(rec)) {
      count++;
      count += jsonKeyCount(rec[k]);
    }
  }
  return count;
}

/* ─────────────────────────── Base64url ────────────────────────────── */

export function base64UrlToString(input: string): string {
  let s = input.trim().replace(/\s+/g, "");
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function tryParseJson(input: string): unknown | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

/* ──────────────────────────── JWT ─────────────────────────────────── */

export interface JwtParts {
  header: string;
  payload: string;
  signature: string;
}

/** Split a compact JWT into its three base64url parts. Returns null on bad shape. */
export function splitJwt(input: string): JwtParts | null {
  const s = input.trim();
  const parts = s.split(".");
  if (parts.length !== 3) return null;
  if (!parts[0] || !parts[1]) return null;
  return { header: parts[0], payload: parts[1], signature: parts[2] };
}

/* ────────────────────── CSS / selector helpers ────────────────────── */

/** Remove CSS comments and surrounding whitespace. */
export function stripCssComments(input: string): string {
  return input.replace(/\/\*[\s\S]*?\*\//g, "").trim();
}
