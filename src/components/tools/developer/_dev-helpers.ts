/**
 * Shared helpers for Dueneo developer tools.
 *
 * Everything here is browser-only, framework-agnostic, and tree-shakeable.
 * No JSX in this file so it can stay a `.ts` module.
 */

/** Maximum input size accepted by developer tools (1 MB of UTF-8 text). */
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
  // Fallback: Blob is also available in all modern browsers.
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

/** Trigger a download of a Blob with a chosen filename. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ─────────────────────────────── Base64 ────────────────────────────── */

/** Encode an arbitrary Unicode string into standard Base64. */
export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Decode a standard Base64 string back into a Unicode string. */
export function decodeBase64ToText(input: string): string {
  const bin = atob(input);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Decode base64 (standard or URL-safe) into raw bytes. */
export function decodeBase64ToBytes(input: string): Uint8Array {
  // Normalise URL-safe variants and strip whitespace / padding.
  let s = input.trim().replace(/\s+/g, "");
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  // Re-pad.
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Convert raw bytes to a standard Base64 string. */
export function bytesToBase64(bytes: Uint8Array, urlSafe = false): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  let out = btoa(bin);
  if (urlSafe) {
    out = out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return out;
}

/** Read a File as a data URL via FileReader. */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error ?? new Error("File read failed"));
    fr.readAsDataURL(file);
  });
}

/* ──────────────────────────── JSON errors ─────────────────────────── */

export interface JsonErrorInfo {
  message: string;
  line?: number;
  column?: number;
  excerpt?: string;
}

/**
 * Extract a line/column and short excerpt from a `JSON.parse` error message.
 * V8 (Chrome/Node) and SpiderMonkey (Firefox) put a position in the message;
 * this helper tries both formats and falls back gracefully.
 */
export function describeJsonError(err: unknown, source?: string): JsonErrorInfo {
  const message = err instanceof Error ? err.message : String(err);

  // V8: "Unexpected token X in JSON at position N"
  // SpiderMonkey: "JSON.parse: expected property name '}' at line N column M"
  let line: number | undefined;
  let column: number | undefined;
  let pos: number | undefined;

  const posMatch = message.match(/position\s+(\d+)/i);
  if (posMatch) pos = Number(posMatch[1]);

  const lineMatch = message.match(/line\s+(\d+)/i);
  const colMatch = message.match(/column\s+(\d+)/i);
  if (lineMatch) line = Number(lineMatch[1]);
  if (colMatch) column = Number(colMatch[1]);

  if (typeof pos === "number" && typeof source === "string") {
    const upto = source.slice(0, pos);
    const nlCount = (upto.match(/\n/g) ?? []).length;
    if (typeof line !== "number") line = nlCount + 1;
    if (typeof column !== "number") column = pos - upto.lastIndexOf("\n");
  }

  let excerpt: string | undefined;
  if (typeof line === "number" && source) {
    const srcLine = source.split(/\r?\n/)[line - 1];
    if (srcLine !== undefined) {
      excerpt = srcLine;
    }
  }

  return { message, line, column, excerpt };
}

/* ──────────────────────────── HTML escape ─────────────────────────── */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const HTML_UNESCAPE_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&#x2f;": "/",
  "&#47;": "/",
  "&apos;": "'",
  "&nbsp;": "\u00a0",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

export function unescapeHtml(input: string): string {
  // Handle named + numeric entities.
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => safeFromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeFromCharCode(Number(dec)))
    .replace(
      /&[a-zA-Z]+;|&#x[0-9a-fA-F]+;|&#\d+;/g,
      (ent) => HTML_UNESCAPE_MAP[ent.toLowerCase()] ?? ent
    );
}

function safeFromCharCode(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/* ─────────────────────────────── XML ──────────────────────────────── */

/**
 * Hand-rolled XML pretty-printer. Tokenises the input into tags, text,
 * comments, CDATA and processing instructions, then re-emits with
 * indentation. Does not require a parser library.
 */
export function formatXml(input: string, indent = "  "): string {
  const src = input.trim();
  if (!src) return "";
  // Normalise existing whitespace between tags so we can re-indent cleanly.
  const compact = src.replace(/>\s+</g, "><").trim();

  const tokens: { type: string; value: string }[] = [];
  let i = 0;
  while (i < compact.length) {
    const rest = compact.slice(i);
    if (rest.startsWith("<!--")) {
      const end = compact.indexOf("-->", i + 4);
      const stop = end === -1 ? compact.length : end + 3;
      tokens.push({ type: "comment", value: compact.slice(i, stop) });
      i = stop;
      continue;
    }
    if (rest.startsWith("<![CDATA[")) {
      const end = compact.indexOf("]]>", i + 9);
      const stop = end === -1 ? compact.length : end + 3;
      tokens.push({ type: "cdata", value: compact.slice(i, stop) });
      i = stop;
      continue;
    }
    if (rest.startsWith("<?")) {
      const end = compact.indexOf("?>", i + 2);
      const stop = end === -1 ? compact.length : end + 2;
      tokens.push({ type: "pi", value: compact.slice(i, stop) });
      i = stop;
      continue;
    }
    if (rest.startsWith("</")) {
      const end = compact.indexOf(">", i + 2);
      const stop = end === -1 ? compact.length : end + 1;
      tokens.push({ type: "close", value: compact.slice(i, stop) });
      i = stop;
      continue;
    }
    if (rest.startsWith("<")) {
      const end = findTagEnd(compact, i);
      const stop = end === -1 ? compact.length : end + 1;
      const raw = compact.slice(i, stop);
      const isSelfClose = raw.endsWith("/>");
      const isDecl = /^<\?/.test(raw) || /^<!/.test(raw);
      tokens.push({
        type: isSelfClose ? "self" : isDecl ? "decl" : "open",
        value: raw,
      });
      i = stop;
      continue;
    }
    // Text node: read until next `<`.
    const next = compact.indexOf("<", i);
    const stop = next === -1 ? compact.length : next;
    const text = compact.slice(i, stop);
    if (text.length > 0) tokens.push({ type: "text", value: text });
    i = stop;
  }

  let depth = 0;
  const out: string[] = [];
  const pad = () => indent.repeat(Math.max(0, depth));

  for (const t of tokens) {
    switch (t.type) {
      case "open":
        out.push(`${pad()}${t.value}`);
        depth++;
        break;
      case "close":
        depth = Math.max(0, depth - 1);
        out.push(`${pad()}${t.value}`);
        break;
      case "self":
      case "decl":
      case "comment":
      case "cdata":
      case "pi":
        out.push(`${pad()}${t.value}`);
        break;
      case "text": {
        const trimmed = t.value.trim();
        if (trimmed) out.push(`${pad()}${trimmed}`);
        break;
      }
    }
  }
  return out.join("\n");
}

/** Find the index of `>` that closes the tag starting at `start`. */
function findTagEnd(src: string, start: number): number {
  let i = start + 1;
  let inSingle = false;
  let inDouble = false;
  while (i < src.length) {
    const ch = src[i];
    if (inSingle) {
      if (ch === "'") inSingle = false;
    } else if (inDouble) {
      if (ch === '"') inDouble = false;
    } else if (ch === "'") {
      inSingle = true;
    } else if (ch === '"') {
      inDouble = true;
    } else if (ch === ">") {
      return i;
    }
    i++;
  }
  return -1;
}

/* ─────────────────────────────── CSV ──────────────────────────────── */

/**
 * Parse a CSV (or any delimited) string into rows of string fields.
 * Supports quoted fields with embedded delimiters, newlines and
 * escaped quotes (`""` → `"`).
 */
export function parseCsv(
  input: string,
  delimiter: string,
  options: { trim?: boolean } = {}
): string[][] {
  const trim = options.trim ?? false;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === delimiter) {
      row.push(trim ? field.trim() : field);
      field = "";
      i++;
      continue;
    }

    if (ch === "\r") {
      // Handle CRLF as a single newline.
      if (input[i + 1] === "\n") i++;
      row.push(trim ? field.trim() : field);
      field = "";
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }

    if (ch === "\n") {
      row.push(trim ? field.trim() : field);
      field = "";
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // Flush the trailing field/row (only if there's actual content).
  if (field.length > 0 || row.length > 0) {
    row.push(trim ? field.trim() : field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

/** Quote a CSV field if it contains delimiter, quote or newline. */
export function csvField(value: string, delimiter: string): string {
  if (value === "") return "";
  const needsQuote = /[",\r\n]/.test(value) || value.includes(delimiter);
  if (!needsQuote) return value;
  return `"${value.replace(/"/g, '""')}"`;
}
