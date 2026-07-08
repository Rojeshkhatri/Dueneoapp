"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Play, RotateCcw, AlertTriangle, Search } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, byteLength, describeJsonError } from "./_dev-helpers";

const SAMPLE_JSON = `{
  "store": {
    "name": "Dueneo Books",
    "open": true,
    "books": [
      { "title": "Clean Code", "author": "Robert C. Martin", "price": 32, "tags": ["programming", "best-practices"] },
      { "title": "The Pragmatic Programmer", "author": "Hunt & Thomas", "price": 28, "tags": ["programming"] },
      { "title": "Refactoring", "author": "Martin Fowler", "price": 45, "tags": ["programming", "patterns"] }
    ],
    "address": {
      "city": "Berlin",
      "country": "DE"
    }
  }
}`;

const SAMPLE_PATHS = [
  "$.store.books[0].title",
  "$.store.books[*].title",
  "$..author",
  "$.store.books[?(@.price > 30)].title",
  "$.store..country",
];

/* ─────────────────────────── JSONPath parser ───────────────────────────── */

type Segment =
  | { kind: "root" }
  | { kind: "child"; name: string }
  | { kind: "index"; n: number }
  | { kind: "wildcard" }
  | { kind: "recursive" }
  | { kind: "filter"; body: string };

interface ParseOk {
  ok: true;
  segments: Segment[];
}
interface ParseErr {
  ok: false;
  error: string;
}
type ParseResult = ParseOk | ParseErr;

function parsePath(path: string): ParseResult {
  const trimmed = path.trim();
  if (!trimmed) return { ok: false, error: "Path is empty." };
  if (trimmed[0] !== "$" && trimmed[0] !== "@") {
    return { ok: false, error: "Path must start with $ (root) or @ (current)." };
  }

  const segments: Segment[] = [{ kind: "root" }];
  let i = 1;
  const n = trimmed.length;

  while (i < n) {
    // Recursive descent `..`
    if (trimmed[i] === "." && trimmed[i + 1] === ".") {
      segments.push({ kind: "recursive" });
      i += 2;
      // After .., expect a name, `*`, or `[`.
      if (i >= n) return { ok: false, error: "Unexpected end of path after `..`." };
      if (trimmed[i] === "[") {
        const r = parseBracket(trimmed, i);
        if (!r.ok) return r;
        segments.push(r.segment);
        i = r.next;
        continue;
      }
      if (trimmed[i] === "*") {
        segments.push({ kind: "wildcard" });
        i++;
        continue;
      }
      const name = readName(trimmed, i);
      if (!name.value) {
        return { ok: false, error: `Expected a name after \`..\` at position ${i}.` };
      }
      segments.push({ kind: "child", name: name.value });
      i = name.next;
      continue;
    }

    // Child access `.`
    if (trimmed[i] === ".") {
      i++;
      if (i < n && trimmed[i] === "*") {
        segments.push({ kind: "wildcard" });
        i++;
        continue;
      }
      const name = readName(trimmed, i);
      if (!name.value) {
        return { ok: false, error: `Expected a name after \`.\` at position ${i}.` };
      }
      segments.push({ kind: "child", name: name.value });
      i = name.next;
      continue;
    }

    // Bracket `[...]`
    if (trimmed[i] === "[") {
      const r = parseBracket(trimmed, i);
      if (!r.ok) return r;
      segments.push(r.segment);
      i = r.next;
      continue;
    }

    return {
      ok: false,
      error: `Unexpected character \`${trimmed[i]}\` at position ${i}.`,
    };
  }

  return { ok: true, segments };
}

function readName(src: string, start: number): { value: string; next: number } {
  let i = start;
  let value = "";
  while (i < src.length && /[A-Za-z0-9_$]/.test(src[i])) {
    value += src[i];
    i++;
  }
  return { value, next: i };
}

function parseBracket(
  src: string,
  start: number
): { ok: true; segment: Segment; next: number } | ParseErr {
  let i = start + 1; // skip `[`
  const n = src.length;
  while (i < n && /\s/.test(src[i])) i++;

  // `[*]` wildcard
  if (src[i] === "*") {
    i++;
    while (i < n && /\s/.test(src[i])) i++;
    if (src[i] !== "]") {
      return { ok: false, error: `Expected \`]\` after \`*\` at position ${i}.` };
    }
    return { ok: true, segment: { kind: "wildcard" }, next: i + 1 };
  }

  // `['name']` or `["name"]` quoted child
  if (src[i] === "'" || src[i] === '"') {
    const quote = src[i];
    i++;
    let name = "";
    while (i < n && src[i] !== quote) {
      if (src[i] === "\\" && i + 1 < n) {
        name += src[i + 1];
        i += 2;
        continue;
      }
      name += src[i];
      i++;
    }
    if (src[i] !== quote) {
      return { ok: false, error: `Unterminated quoted name in \`[\` at position ${i}.` };
    }
    i++;
    while (i < n && /\s/.test(src[i])) i++;
    if (src[i] !== "]") {
      return { ok: false, error: `Expected \`]\` after quoted name at position ${i}.` };
    }
    return { ok: true, segment: { kind: "child", name }, next: i + 1 };
  }

  // `[?(body)]` filter
  if (src[i] === "?") {
    i++;
    while (i < n && /\s/.test(src[i])) i++;
    if (src[i] !== "(") {
      return { ok: false, error: `Expected \`(\` after \`?\` at position ${i}.` };
    }
    i++;
    let depth = 1;
    let body = "";
    while (i < n && depth > 0) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")") {
        depth--;
        if (depth === 0) break;
      }
      body += src[i];
      i++;
    }
    if (depth !== 0) {
      return { ok: false, error: "Unterminated filter expression — missing `)`." };
    }
    i++; // skip `)`
    while (i < n && /\s/.test(src[i])) i++;
    if (src[i] !== "]") {
      return { ok: false, error: `Expected \`]\` after filter expression at position ${i}.` };
    }
    return { ok: true, segment: { kind: "filter", body: body.trim() }, next: i + 1 };
  }

  // `[N]` numeric index (including negative)
  if (/[0-9-]/.test(src[i])) {
    let numStr = "";
    while (i < n && /[0-9-]/.test(src[i])) {
      numStr += src[i];
      i++;
    }
    while (i < n && /\s/.test(src[i])) i++;
    if (src[i] !== "]") {
      return { ok: false, error: `Expected \`]\` after index at position ${i}.` };
    }
    const idx = Number(numStr);
    if (!Number.isFinite(idx)) {
      return { ok: false, error: `Invalid index: \`${numStr}\`.` };
    }
    return { ok: true, segment: { kind: "index", n: idx }, next: i + 1 };
  }

  return {
    ok: false,
    error: `Unexpected character in \`[\` at position ${i}: \`${src[i]}\`.`,
  };
}

/* ─────────────────────────── JSONPath evaluator ────────────────────────── */

function evaluate(segments: Segment[], root: unknown): unknown[] {
  let current: unknown[] = [root];
  let i = 0;
  while (i < segments.length) {
    const seg = segments[i];
    if (seg.kind === "root") {
      current = [root];
      i++;
      continue;
    }
    if (seg.kind === "recursive") {
      const next = segments[i + 1];
      // Collect every descendant (including self) of current.
      const descendants: unknown[] = [];
      for (const node of current) collectAll(node, descendants);
      if (!next) {
        current = descendants;
        i++;
        continue;
      }
      current = applySegment(next, descendants);
      i += 2;
      continue;
    }
    current = applySegment(seg, current);
    i++;
  }
  return current;
}

function collectAll(node: unknown, out: unknown[]): void {
  out.push(node);
  if (Array.isArray(node)) {
    for (const el of node) collectAll(el, out);
  } else if (node !== null && typeof node === "object") {
    for (const v of Object.values(node as Record<string, unknown>)) {
      collectAll(v, out);
    }
  }
}

function applySegment(seg: Segment, nodes: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const node of nodes) {
    if (seg.kind === "child") {
      if (node !== null && typeof node === "object" && !Array.isArray(node)) {
        const v = (node as Record<string, unknown>)[seg.name];
        if (v !== undefined) out.push(v);
      }
    } else if (seg.kind === "index") {
      if (Array.isArray(node)) {
        const len = node.length;
        const idx = seg.n < 0 ? len + seg.n : seg.n;
        if (idx >= 0 && idx < len) out.push(node[idx]);
      }
    } else if (seg.kind === "wildcard") {
      if (Array.isArray(node)) {
        out.push(...node);
      } else if (node !== null && typeof node === "object") {
        out.push(...Object.values(node as Record<string, unknown>));
      }
    } else if (seg.kind === "filter") {
      if (Array.isArray(node)) {
        for (const el of node) if (evalFilter(seg.body, el)) out.push(el);
      } else if (node !== null && typeof node === "object") {
        for (const v of Object.values(node as Record<string, unknown>)) {
          if (evalFilter(seg.body, v)) out.push(v);
        }
      }
    }
  }
  return out;
}

/* ──────────────────────────── Filter parser ────────────────────────────── */

/**
 * Evaluates a small subset of JSONPath filter expressions:
 *   @                  — current element (truthy check)
 *   @.foo              — element.foo is truthy
 *   @.foo.bar          — nested path truthy check
 *   @.foo OP value     — comparison, OP ∈ {==, !=, >, >=, <, <=}
 *   value ∈ {number, 'string', "string", true, false, null}
 */
function evalFilter(body: string, element: unknown): boolean {
  const b = body.trim();
  if (!b) return false;

  // Comparison: @.path OP value
  const cmp = b.match(/^@\.?([A-Za-z0-9_.]*)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (cmp) {
    const [, pathStr, op, valueStr] = cmp;
    const lhs = getPath(element, pathStr);
    const rhs = parseValue(valueStr.trim());
    return compare(lhs, op, rhs);
  }

  // Truthy: @.path or @
  const truthy = b.match(/^@\.?([A-Za-z0-9_.]*)$/);
  if (truthy) {
    const [, pathStr] = truthy;
    if (!pathStr) return !!element;
    const v = getPath(element, pathStr);
    return v !== undefined && v !== null && v !== false && v !== 0 && v !== "";
  }

  return false;
}

function getPath(element: unknown, path: string): unknown {
  if (!path) return element;
  let cur: unknown = element;
  for (const part of path.split(".")) {
    if (!part) continue;
    if (cur !== null && typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
    if (cur === undefined) return undefined;
  }
  return cur;
}

function parseValue(s: string): unknown {
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null") return null;
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  const num = Number(s);
  if (s.trim() !== "" && !Number.isNaN(num)) return num;
  return s;
}

function compare(lhs: unknown, op: string, rhs: unknown): boolean {
  // Loose equality for numbers vs numeric strings.
  const bothNumeric =
    (typeof lhs === "number" || (typeof lhs === "string" && !Number.isNaN(Number(lhs)))) &&
    (typeof rhs === "number" || (typeof rhs === "string" && !Number.isNaN(Number(rhs))));
  switch (op) {
    case "==":
      if (bothNumeric && lhs !== "" && rhs !== "") return Number(lhs) === Number(rhs);
      return lhs === rhs;
    case "!=":
      if (bothNumeric && lhs !== "" && rhs !== "") return Number(lhs) !== Number(rhs);
      return lhs !== rhs;
    case ">":
      return bothNumeric ? Number(lhs) > Number(rhs) : false;
    case ">=":
      return bothNumeric ? Number(lhs) >= Number(rhs) : false;
    case "<":
      return bothNumeric ? Number(lhs) < Number(rhs) : false;
    case "<=":
      return bothNumeric ? Number(lhs) <= Number(rhs) : false;
    default:
      return false;
  }
}

/* ────────────────────────────── Component ──────────────────────────────── */

export function JSONPathTester({ tool }: { tool: ToolDefinition }) {
  const [json, setJson] = React.useState("");
  const [path, setPath] = React.useState("");
  const [results, setResults] = React.useState<unknown[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [parseWarning, setParseWarning] = React.useState<string | null>(null);

  const run = React.useCallback(() => {
    setError(null);
    setParseWarning(null);
    setResults(null);

    if (!json.trim()) {
      setError("Please paste some JSON first.");
      return;
    }
    if (byteLength(json) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      return;
    }
    if (!path.trim()) {
      setError("Please enter a JSONPath expression.");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      const info = describeJsonError(e, json);
      setError(
        `Invalid JSON: ${info.message}${
          info.line ? ` (around line ${info.line})` : ""
        }`
      );
      return;
    }

    const parsedPath = parsePath(path);
    if (!parsedPath.ok) {
      setError(`Invalid JSONPath: ${parsedPath.error}`);
      return;
    }

    // Warn on unsupported filter features.
    for (const seg of parsedPath.segments) {
      if (seg.kind === "filter") {
        const supported = /^@\.?[A-Za-z0-9_.]*\s*(?:(?:==|!=|>=|<=|>|<)\s*(?:[0-9.]+|'[^']*'|"[^"]*"|true|false|null))?$/.test(
          seg.body.trim()
        );
        if (!supported) {
          setParseWarning(
            `Filter \`${seg.body}\` uses syntax this tool doesn't fully support. Only @.path and @.path OP value (with number, quoted string, true, false, null) are recognised.`
          );
        }
      }
    }

    try {
      const out = evaluate(parsedPath.segments, parsed);
      setResults(out);
      toast.success(`Matched ${out.length} value${out.length === 1 ? "" : "s"}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to evaluate JSONPath.");
    }
  }, [json, path]);

  const reset = () => {
    setJson("");
    setPath("");
    setResults(null);
    setError(null);
    setParseWarning(null);
  };

  const loadSample = () => {
    setJson(SAMPLE_JSON);
    setPath(SAMPLE_PATHS[0]);
    setResults(null);
    setError(null);
    setParseWarning(null);
  };

  const outputText = React.useMemo(() => {
    if (!results) return "";
    return JSON.stringify(results, null, 2);
  }, [results]);

  const content: ToolContent = {
    intro:
      "Test JSONPath expressions against your JSON data — entirely in the browser. Supports $ (root), $.foo.bar, $.foo[0], $.foo[*] (wildcard), $..foo (recursive descent) and basic @.path filters like $.books[?(@.price > 30)].",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="jp-json">JSON input</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="jp-json"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              placeholder={'{"users":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]}'}
              className="min-h-[280px] font-mono text-xs"
              spellCheck={false}
              aria-label="JSON input"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="jp-output">Matched results</Label>
              <CopyButton value={outputText} size="sm" label="Copy" />
            </div>
            <Textarea
              id="jp-output"
              value={outputText}
              readOnly
              placeholder="Matched values will appear here as JSON."
              className="min-h-[280px] font-mono text-xs"
              spellCheck={false}
              aria-label="Matched results"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/30 p-4">
          <div className="flex-1 min-w-[280px] space-y-2">
            <Label htmlFor="jp-path">JSONPath expression</Label>
            <div className="flex gap-2">
              <Input
                id="jp-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="$.users[*].name"
                className="font-mono text-sm"
                spellCheck={false}
                aria-label="JSONPath expression"
              />
              <Button onClick={run}>
                <Play className="mr-1.5 h-4 w-4" /> Run
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>

        {/* Quick-pick sample paths */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Try these paths</p>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_PATHS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPath(p)}
                className="rounded-full border bg-background px-2.5 py-1 font-mono text-xs hover:bg-muted"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {parseWarning && (
          <div
            role="alert"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <div>{parseWarning}</div>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {results && (
          <p className="text-xs text-muted-foreground">
            <Search className="mr-1 inline h-3 w-3" />
            {results.length} match{results.length === 1 ? "" : "es"} ·{" "}
            {byteLength(outputText)} bytes
          </p>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste your JSON",
        description:
          "Drop any JSON — an API response, a fixture, a config file — into the left-hand editor. If the JSON is invalid, you'll see the parse error with a line number.",
      },
      {
        title: "Enter a JSONPath expression",
        description:
          "Type a JSONPath starting with $. Use . for child access, [N] for array index, [*] for wildcard, .. for recursive descent, and [?(...)] for filters.",
      },
      {
        title: "Run and inspect matches",
        description:
          "Click Run. All matched values are collected and pretty-printed as a JSON array on the right. The match count and byte size are shown below.",
      },
      {
        title: "Try the sample paths",
        description:
          "Click any of the sample path chips to load it into the input — handy for exploring the supported syntax.",
      },
    ],
    useCases: [
      "Verify a JSONPath before using it in jq, Jayway, jsonpath-plus, AWS Step Paths or Kubernetes selectors.",
      "Extract every occurrence of a key from a deeply nested API response (recursive descent).",
      "Filter an array of objects by a numeric or string field without writing a script.",
      "Teach and learn JSONPath syntax interactively, with immediate feedback on each expression.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Supported subset: <code>$</code>, <code>@</code>, <code>.name</code>,
          <code> [N]</code>, <code>[*]</code>, <code>..name</code>, <code>[?(...)]</code> with
          <code> @.path</code> truthy checks and <code>@.path OP value</code> comparisons
          (OP ∈ <code>==, !=, &gt;, &gt;=, &lt;, &lt;=</code>).
        </li>
        <li>
          Not supported: script expressions (<code>[?(...)]</code> with arbitrary JS), slice
          notation <code>[1:3]</code>, comma operators, parent references, regex filters and
          the in-operator <code>[?(@.foo in [...])]</code>.
        </li>
        <li>Inputs larger than 1 MB are rejected to keep the tab responsive.</li>
        <li>
          Recursive descent <code>$..foo</code> walks every descendant of every current node —
          on very deep JSON this can be slow.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Is my JSON sent to a server?",
        a: "No. Parsing, path evaluation and filtering all run in your browser. Nothing is uploaded.",
      },
      {
        q: "What's the difference between $ and @?",
        a: "$ refers to the root of the JSON document. @ refers to the current element inside a filter expression — for example, $.books[?(@.price > 30)] iterates books and checks each book's own price.",
      },
      {
        q: "How does $..foo work?",
        a: "$..foo is recursive descent — it visits every descendant of the root and returns the value of any 'foo' property it finds, at any depth. It's handy for pulling every occurrence of a key out of a nested structure.",
      },
      {
        q: "Why doesn't my filter syntax work?",
        a: "This tool supports @.path (truthy) and @.path OP value where OP is ==, !=, >, >=, <, <= and value is a number, quoted string, true, false or null. For anything fancier (script expressions, regex matching, in-operators), use a full library like jsonpath-plus.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
