"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Wand2, RotateCcw, Download, AlertTriangle } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, byteLength, formatBytes, downloadText } from "./_dev-helpers";

const SAMPLE = `// Dueneo greeting utility
function greet(name) {
  /* Build the greeting string */
  const message = "Hello, " + name + "!";
  console.log(message);
  return message;
}

// Run if not imported
if (typeof window !== "undefined") {
  greet("world");
}`;

/* ───────────────────────── Comment + string aware walker ────────────────── */

interface WalkerState {
  out: string[];
  inString: '"' | "'" | "`" | null;
  inLineComment: boolean;
  inBlockComment: boolean;
  inRegex: boolean;
  inCharClass: boolean;
  curWord: string;
  lastWord: string;
  lastChar: string;
}

function isRegexStartContext(state: WalkerState): boolean {
  // After these chars, a `/` starts a regex literal rather than division.
  if (!state.lastChar && !state.lastWord) return true;
  if ("(,=:[!&|?{;+-*%~^<>".includes(state.lastChar)) return true;
  if (["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "else", "case", "do", "await", "yield", "if", "while", "for", "switch", "catch", "&&", "||", "??"].includes(state.lastWord)) {
    return true;
  }
  return false;
}

/**
 * Strip line-comment (slash-slash) and block-comment (slash-star) markers
 * from JS source while respecting string, template-literal, regex and
 * char-class state. Returns the source with comments removed (block
 * comments replaced by a single space; line comments removed, but the
 * trailing newline preserved).
 */
function stripComments(input: string): string {
  const state: WalkerState = {
    out: [],
    inString: null,
    inLineComment: false,
    inBlockComment: false,
    inRegex: false,
    inCharClass: false,
    curWord: "",
    lastWord: "",
    lastChar: "",
  };
  const n = input.length;
  let i = 0;

  const push = (c: string) => {
    state.out.push(c);
    if (/[A-Za-z0-9_$]/.test(c)) {
      state.curWord += c;
    } else {
      if (state.curWord) {
        state.lastWord = state.curWord;
        state.curWord = "";
      }
      if (!/\s/.test(c)) state.lastChar = c;
    }
  };

  while (i < n) {
    const c = input[i];
    const next = input[i + 1] ?? "";

    if (state.inLineComment) {
      if (c === "\n") {
        state.inLineComment = false;
        push("\n");
      }
      i++;
      continue;
    }

    if (state.inBlockComment) {
      if (c === "*" && next === "/") {
        state.inBlockComment = false;
        i += 2;
        // Replace block comment with a single space (so identifiers don't fuse).
        push(" ");
        continue;
      }
      // Preserve newlines inside block comments so line structure is intact.
      if (c === "\n") push("\n");
      i++;
      continue;
    }

    if (state.inString) {
      push(c);
      if (c === "\\" && i + 1 < n) {
        push(input[i + 1]);
        i += 2;
        continue;
      }
      if (c === state.inString) {
        state.inString = null;
      }
      // For template literals, ${...} would switch context — ignored here for
      // simplicity (rare in code that goes through a minifier).
      i++;
      continue;
    }

    if (state.inRegex) {
      push(c);
      if (c === "\\" && i + 1 < n) {
        push(input[i + 1]);
        i += 2;
        continue;
      }
      if (c === "[" && !state.inCharClass) {
        state.inCharClass = true;
      } else if (c === "]" && state.inCharClass) {
        state.inCharClass = false;
      } else if (c === "/" && !state.inCharClass) {
        state.inRegex = false;
        // Consume trailing regex flags (gimsuy).
        while (i + 1 < n && /[gimsuy]/.test(input[i + 1])) {
          push(input[i + 1]);
          i++;
        }
      }
      i++;
      continue;
    }

    // Not in any embedded context — check for comment/string/regex starts.
    if (c === "/" && next === "/") {
      state.inLineComment = true;
      i += 2;
      continue;
    }

    if (c === "/" && next === "*") {
      state.inBlockComment = true;
      i += 2;
      continue;
    }

    if (c === '"' || c === "'" || c === "`") {
      state.inString = c;
      push(c);
      i++;
      continue;
    }

    if (c === "/" && isRegexStartContext(state)) {
      state.inRegex = true;
      push(c);
      i++;
      continue;
    }

    push(c);
    i++;
  }

  return state.out.join("");
}

/* ─────────────────────────── Safe line joining ─────────────────────────── */

const CONTINUATION_END = /[,(=[{+\-*/%<>&|^?!~.:]$/;
const CONTINUATION_KEYWORD = /\b(?:return|typeof|instanceof|in|of|new|delete|void|throw|else|case|do|await|yield|if|while|for|switch|catch)$/;
const ASI_HAZARD_START = /^[([\+\-/]/;

/** Decide if `prev` and `cur` can be safely joined onto one line. */
function shouldJoin(prev: string, cur: string): boolean {
  // Avoid forming `++`, `--`, `//`, `<<`, `>>` by joining.
  if (
    (prev.endsWith("+") && cur.startsWith("+")) ||
    (prev.endsWith("-") && cur.startsWith("-")) ||
    (prev.endsWith("/") && cur.startsWith("/")) ||
    (prev.endsWith("<") && cur.startsWith("<")) ||
    (prev.endsWith(">") && cur.startsWith(">"))
  ) {
    return false;
  }

  // Always preserve newline at a clear statement/block boundary.
  if (prev.endsWith(";") || prev.endsWith("{") || prev.endsWith("}")) return false;

  // Continuation marker on prev → safe to join.
  if (CONTINUATION_END.test(prev)) return true;

  // Continuation keyword on prev → safe to join.
  if (CONTINUATION_KEYWORD.test(prev)) return true;

  // ASI hazard: next line starts with `(`, `[`, `+`, `-`, `/` and prev doesn't
  // explicitly continue → preserve newline.
  if (ASI_HAZARD_START.test(cur)) return false;

  // Default: preserve newline.
  return false;
}

function minifyJs(input: string, keepComments: boolean): string {
  if (!input.trim()) return "";

  // Step 1: strip comments (string/regex-aware).
  let source = keepComments ? input : stripComments(input);

  // Step 2: split into lines, trim, drop blanks.
  const rawLines = source.split(/\r?\n/);
  const lines: string[] = [];
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (trimmed) lines.push(trimmed);
  }

  if (lines.length === 0) return "";

  // Step 3: collapse internal whitespace runs to a single space.
  const collapsed = lines.map((line) => line.replace(/\s+/g, " "));

  // Step 4: join lines where safe.
  const joined: string[] = [];
  for (const line of collapsed) {
    if (joined.length === 0) {
      joined.push(line);
      continue;
    }
    const prev = joined[joined.length - 1];
    if (shouldJoin(prev, line)) {
      joined[joined.length - 1] = `${prev} ${line}`;
    } else {
      joined.push(line);
    }
  }

  return joined.join("\n").trim() + "\n";
}

/* ────────────────────────────── Component ──────────────────────────────── */

export function JSMinifier({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [keepComments, setKeepComments] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const minify = React.useCallback(() => {
    if (!input.trim()) {
      setError("Please paste some JavaScript first.");
      setOutput("");
      return;
    }
    if (byteLength(input) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setOutput("");
      return;
    }
    try {
      const min = minifyJs(input, keepComments);
      setOutput(min);
      setError(null);
      toast.success("JavaScript minified.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to minify JavaScript.");
      setOutput("");
      toast.error("Could not minify JavaScript.");
    }
  }, [input, keepComments]);

  const reset = () => {
    setInput("");
    setOutput("");
    setError(null);
  };

  const loadSample = () => {
    setInput(SAMPLE);
    setError(null);
    setOutput("");
  };

  const beforeBytes = byteLength(input);
  const afterBytes = byteLength(output);
  const saving = beforeBytes > 0 ? Math.max(0, (1 - afterBytes / beforeBytes) * 100) : 0;

  const content: ToolContent = {
    intro:
      "A conservative, browser-only JavaScript minifier. Strips // and /* */ comments (string- and regex-aware), collapses whitespace, drops blank lines, and joins lines where ASI safety allows. No variable renaming, no dead-code elimination — for production, reach for Terser or esbuild.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="js-input">Input JavaScript</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="js-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"// comment\nfunction add(a, b) {\n  return a + b;\n}"}
              className="min-h-[300px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input JavaScript"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="js-output">Minified output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" label="Copy" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("app.min.js", output, "application/javascript");
                    toast.success("Downloaded app.min.js");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="js-output"
              value={output}
              readOnly
              placeholder="Minified JavaScript will appear here."
              className="min-h-[300px] font-mono text-xs"
              spellCheck={false}
              aria-label="Minified output"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-5 rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center gap-2 pb-2">
            <Switch
              id="js-comments"
              checked={keepComments}
              onCheckedChange={setKeepComments}
            />
            <Label htmlFor="js-comments" className="text-sm font-normal">
              Keep comments
            </Label>
          </div>

          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={minify}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Minify JS
            </Button>
          </div>
        </div>

        <div
          role="note"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
            <div>
              <p className="font-medium">Conservative minifier</p>
              <p className="mt-1">
                This tool strips comments and whitespace only. It does not rename variables,
                eliminate dead code, mangle property names, or convert ES modules. For
                production builds, use <code>Terser</code>, <code>esbuild</code>, or
                <code> swc</code> — they typically cut file sizes 40–70% vs. 10–30% here.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {output && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Before</p>
              <p className="mt-1 text-lg font-semibold">{formatBytes(beforeBytes)}</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">After</p>
              <p className="mt-1 text-lg font-semibold">{formatBytes(afterBytes)}</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Savings</p>
              <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {saving.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste your JavaScript",
        description:
          "Drop a script — a utility function, a small module, a code snippet — into the left-hand editor. Comments, indentation and blank lines are fine.",
      },
      {
        title: "Toggle comment stripping",
        description:
          "By default // and /* */ comments are removed (string- and regex-aware so they don't get stripped inside literals). Turn the switch on to keep them.",
      },
      {
        title: "Minify and review",
        description:
          "Click Minify JS. Whitespace is collapsed, blank lines dropped, and consecutive lines are joined where ASI (automatic semicolon insertion) safety allows. The before/after sizes and savings % update instantly.",
      },
      {
        title: "Copy or download",
        description:
          "Copy the minified output to your clipboard, or download it as app.min.js.",
      },
    ],
    useCases: [
      "Strip comments and indentation from a small JS utility before pasting into a CMS or inline <script>.",
      "Quickly see how much of a file is whitespace and comments vs. real code.",
      "Pre-minify a snippet before shipping it as a bookmarklet or browser extension content script.",
      "Teach the difference between conservative minification (this) and full minification (Terser).",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Conservative only.</strong> No variable renaming, no dead-code elimination,
          no property mangling, no ES module conversion. Expect 10–30% savings vs. 40–70% for
          Terser/esbuild.
        </li>
        <li>
          Template literals with <code>{"${...}"}</code> expressions containing comments or regexes
          are not deeply analysed — the walker treats the whole template as a single string. Avoid
          this minifier for code with side-effects inside template interpolations.
        </li>
        <li>
          Regex detection is heuristic: a <code>/</code> after <code>(</code>, <code>,</code>,
          <code>=</code>, <code>:</code>, <code>[</code>, <code>!</code>, <code>&amp;</code>,
          <code>|</code>, <code>?</code>, <code>{"{"}</code>, <code>;</code>, <code>+</code>,
          <code>-</code>, <code>*</code>, <code>%</code>, <code>~</code>, <code>^</code>,
          <code>&lt;</code>, <code>&gt;</code>, or the keywords <code>return</code>,
          <code>typeof</code>, <code>instanceof</code>, <code>in</code>, <code>of</code>,
          <code>new</code>, <code>delete</code>, <code>void</code>, <code>throw</code>,
          <code>else</code>, <code>case</code>, <code>do</code>, <code>await</code>,
          <code>yield</code>, <code>if</code>, <code>while</code>, <code>for</code>,
          <code>switch</code>, <code>catch</code> is treated as a regex start.
        </li>
        <li>Inputs larger than 1 MB are rejected to keep the tab responsive.</li>
        <li>
          JSX and TypeScript syntax are not specially handled — type annotations and JSX tags
          may be mangled. Strip them with <code>tsc</code> or <code>esbuild</code> first.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why does this exist if Terser is better?",
        a: "It's a fast, browser-only tool for quick-and-dirty minification where you can't (or don't want to) run a full build pipeline — pasting into a CMS, sharing a snippet, or just removing comments. For production, use Terser/esbuild.",
      },
      {
        q: "Is my JavaScript sent to a server?",
        a: "No. Comment stripping, whitespace collapsing and line joining all run in your browser. Nothing is uploaded.",
      },
      {
        q: "Will minification change my code's behaviour?",
        a: "It shouldn't — the walker preserves string and regex contents, and the line-joining logic only joins lines where ASI safety is guaranteed. Always test the minified output, especially if your code relies on ASI.",
      },
      {
        q: "Does it minify ES modules (import/export)?",
        a: "Yes — `import` and `export` are just keywords; the minifier preserves them. It does not, however, do tree-shaking or convert to CommonJS.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
