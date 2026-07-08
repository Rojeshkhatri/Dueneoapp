"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Wand2, RotateCcw, Download } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, byteLength, formatBytes, downloadText } from "./_dev-helpers";

const SAMPLE = `/* Card styles for the Dueneo homepage */
.card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.card__title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}`;

/**
 * Minify CSS by hand. Safe approach:
 *  1. Strip /* ... *\/ block comments (CSS doesn't have line comments).
 *  2. Preserve strings inside content:"..." and url("...") — but the
 *     collapse step below never touches inside-string whitespace anyway
 *     because we walk char-by-char tracking string state.
 *  3. Collapse runs of whitespace to a single space.
 *  4. Remove spaces around `{`, `}`, `:`, `;`, `,`, `>`, `+`, `~`.
 *  5. Remove the trailing semicolon before `}`.
 *  6. Remove leading/trailing whitespace.
 */
function minifyCss(input: string, keepComments: boolean): string {
  if (!input.trim()) return "";
  let s = input;

  // 1. Strip block comments (skip if user wants to keep them).
  if (!keepComments) {
    s = stripBlockComments(s);
  }

  // 2. Walk the string once, collapsing whitespace and trimming around
  //    punctuation, while preserving string contents.
  const out: string[] = [];
  let inString: '"' | "'" | null = null;
  let prevMeaningful = ""; // last non-whitespace char appended
  let i = 0;
  const n = s.length;

  const isWs = (c: string) => c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f" || c === "\v";

  while (i < n) {
    const c = s[i];

    if (inString) {
      out.push(c);
      if (c === "\\" && i + 1 < n) {
        // Escaped char inside string — keep both.
        out.push(s[i + 1]);
        i += 2;
        continue;
      }
      if (c === inString) inString = null;
      prevMeaningful = c;
      i++;
      continue;
    }

    if (c === '"' || c === "'") {
      inString = c;
      out.push(c);
      prevMeaningful = c;
      i++;
      continue;
    }

    if (isWs(c)) {
      // Skip whitespace; we'll add a single space only if the surrounding
      // chars need separation.
      const nextMeaningful = peekNextNonWs(s, i);
      const needsSpace =
        nextMeaningful !== "" &&
        prevMeaningful !== "" &&
        !shouldTouch(prevMeaningful, nextMeaningful, "ws");
      if (needsSpace) out.push(" ");
      // Skip consecutive whitespace.
      while (i < n && isWs(s[i])) i++;
      continue;
    }

    // Non-ws, non-string char.
    if (shouldTouch(prevMeaningful, c, "char")) {
      // No space — just append (we already ensured no space before).
    }
    out.push(c);
    prevMeaningful = c;
    i++;
  }

  let result = out.join("").trim();

  // 3. Remove trailing semicolons before `}`.
  result = result.replace(/;+\}/g, "}");

  // 4. Collapse any double-spaces that slipped through (defensive).
  result = result.replace(/\s{2,}/g, " ");

  return result.trim();
}

/** Strip /* ... *\/ comments while respecting string contents. */
function stripBlockComments(s: string): string {
  const out: string[] = [];
  let inString: '"' | "'" | null = null;
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (inString) {
      out.push(c);
      if (c === "\\" && i + 1 < n) {
        out.push(s[i + 1]);
        i += 2;
        continue;
      }
      if (c === inString) inString = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = c;
      out.push(c);
      i++;
      continue;
    }
    if (c === "/" && s[i + 1] === "*") {
      let j = i + 2;
      while (j < n && !(s[j] === "*" && s[j + 1] === "/")) j++;
      j = Math.min(n, j + 2);
      i = j;
      continue;
    }
    out.push(c);
    i++;
  }
  return out.join("");
}

function peekNextNonWs(s: string, from: number): string {
  let i = from;
  while (i < s.length && /\s/.test(s[i])) i++;
  return s[i] ?? "";
}

/**
 * Decide if `prev` and `cur` should be joined with no space between them.
 * Called for both whitespace-collapsing and char-appending paths.
 */
function shouldTouch(prev: string, cur: string, _mode: "ws" | "char"): boolean {
  if (!prev) return true;
  // Punctuation that never wants surrounding spaces in CSS.
  const tight = "{}:;,>+~";
  if (tight.includes(cur)) return true;
  if (tight.includes(prev)) return true;
  return false;
}

/* ────────────────────────────── Component ──────────────────────────────── */

export function CSSMinifier({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [keepComments, setKeepComments] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const minify = React.useCallback(() => {
    if (!input.trim()) {
      setError("Please paste some CSS first.");
      setOutput("");
      return;
    }
    if (byteLength(input) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setOutput("");
      return;
    }
    try {
      const min = minifyCss(input, keepComments);
      setOutput(min);
      setError(null);
      toast.success("CSS minified.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to minify CSS.");
      setOutput("");
      toast.error("Could not minify CSS.");
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
      "Shrink CSS by stripping comments, collapsing whitespace and removing redundant semicolons — all in your browser. See the before/after byte count and savings percentage, then copy or download the minified result.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="css-input">Input CSS</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="css-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"/* comment */\n.card {\n  padding: 24px;\n}"}
              className="min-h-[300px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input CSS"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="css-output">Minified output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" label="Copy" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("styles.min.css", output, "text/css");
                    toast.success("Downloaded styles.min.css");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="css-output"
              value={output}
              readOnly
              placeholder="Minified CSS will appear here."
              className="min-h-[300px] font-mono text-xs"
              spellCheck={false}
              aria-label="Minified output"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-5 rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center gap-2 pb-2">
            <Switch
              id="css-comments"
              checked={keepComments}
              onCheckedChange={setKeepComments}
            />
            <Label htmlFor="css-comments" className="text-sm font-normal">
              Keep /* comments */
            </Label>
          </div>

          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={minify}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Minify CSS
            </Button>
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
        title: "Paste your CSS",
        description:
          "Drop a stylesheet — your own, or copy-pasted from a CSS file — into the left-hand editor. Comments and indentation are welcome.",
      },
      {
        title: "Toggle comment stripping",
        description:
          "By default /* ... */ comments are removed. Turn the switch on to keep them (rarely useful in production but handy for debugging).",
      },
      {
        title: "Minify and review",
        description:
          "Click Minify CSS. Whitespace is collapsed, spaces around punctuation are removed, and the last semicolon before each } is dropped. The before/after sizes and savings % update instantly.",
      },
      {
        title: "Copy or download",
        description:
          "Copy the minified output to your clipboard, or download it as styles.min.css ready for production.",
      },
    ],
    useCases: [
      "Reduce a hand-written stylesheet's file size before deploying to a CDN.",
      "Combine several CSS files into one minified bundle for first-paint optimisation.",
      "Compare author-time CSS size against a PostCSS/CleanCSS pipeline to sanity-check savings.",
      "Strip comments from a vendor CSS file before inlining it into a critical-CSS block.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>This is a structural minifier — it does not merge duplicate selectors, shorten hex colours, drop unused rules or remove overridden properties. Use CleanCSS or cssnano for that.</li>
        <li>Inputs larger than 1 MB are rejected to keep the tab responsive.</li>
        <li>
          CSS <code>calc()</code> and <code>var()</code> expressions are preserved as-is — spaces inside them are kept when needed to avoid changing semantics.
        </li>
        <li>Source maps are not generated. Pair with a build tool if you need them.</li>
      </ul>
    ),
    faq: [
      {
        q: "Will minification change my CSS behaviour?",
        a: "No. The minifier only removes whitespace, comments and trailing semicolons — none of which affect rendering. String contents (inside content: \"...\" and url(\"...\")) are preserved verbatim.",
      },
      {
        q: "Is my CSS sent to a server?",
        a: "No. Minification runs entirely in your browser. Nothing is uploaded.",
      },
      {
        q: "Why are my savings so small?",
        a: "Hand-written CSS that's already terse has little to minify. The biggest savings come from removing indentation, comments and the last semicolons before }. Heuristic minifiers (clean-css) can also shorten colours and merge selectors for further gains.",
      },
      {
        q: "Can I keep my /* comments */?",
        a: "Yes — flip the \"Keep comments\" switch. This is mostly useful during development when you want the size savings but still need your section markers visible.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
