"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Wand2, GitCompare } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_INPUT_BYTES,
  INPUT_TOO_LARGE_MSG,
  byteLength,
} from "./_dev-helpers";

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  text: string;
  oldNum?: number;
  newNum?: number;
}

/**
 * Compute an LCS-based line diff between two texts. Returns a flat list
 * of unchanged, removed and added lines in display order.
 */
function diffLines(a: string, b: string): DiffLine[] {
  const aLines = a.length === 0 ? [] : a.split(/\r?\n/);
  const bLines = b.length === 0 ? [] : b.split(/\r?\n/);
  const n = aLines.length;
  const m = bLines.length;

  // Build the LCS-length table.
  // dp[i][j] = length of LCS of aLines[i..] and bLines[j..]
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        aLines[i] === bLines[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let oldNum = 1;
  let newNum = 1;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      out.push({ type: "unchanged", text: aLines[i], oldNum, newNum });
      i++;
      j++;
      oldNum++;
      newNum++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "removed", text: aLines[i], oldNum });
      i++;
      oldNum++;
    } else {
      out.push({ type: "added", text: bLines[j], newNum });
      j++;
      newNum++;
    }
  }
  while (i < n) {
    out.push({ type: "removed", text: aLines[i], oldNum });
    i++;
    oldNum++;
  }
  while (j < m) {
    out.push({ type: "added", text: bLines[j], newNum });
    j++;
    newNum++;
  }
  return out;
}

const SAMPLE_A = `The quick brown fox
jumps over the lazy dog.
Line three is here.
Line four stays.
Line five is the end.`;

const SAMPLE_B = `The quick brown fox
leaps over the lazy dog.
Line three is here.
A new line in the middle.
Line four stays.
Line five is the end.`;

export function DiffChecker({ tool }: { tool: ToolDefinition }) {
  const [left, setLeft] = React.useState("");
  const [right, setRight] = React.useState("");
  const [diff, setDiff] = React.useState<DiffLine[]>([]);
  const [ignoreCase, setIgnoreCase] = React.useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const run = React.useCallback(() => {
    if (!left && !right) {
      setError("Please paste text into both boxes first.");
      setDiff([]);
      return;
    }
    if (byteLength(left) > MAX_INPUT_BYTES || byteLength(right) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setDiff([]);
      return;
    }
    let a = left;
    let b = right;
    if (ignoreCase) {
      a = a.toLowerCase();
      b = b.toLowerCase();
    }
    if (ignoreWhitespace) {
      a = a.replace(/[ \t]+$/gm, "").replace(/[ \t]{2,}/g, " ");
      b = b.replace(/[ \t]+$/gm, "").replace(/[ \t]{2,}/g, " ");
    }
    setDiff(diffLines(a, b));
    setError(null);
    toast.success("Diff computed.");
  }, [left, right, ignoreCase, ignoreWhitespace]);

  const loadSample = () => {
    setLeft(SAMPLE_A);
    setRight(SAMPLE_B);
    setDiff([]);
    setError(null);
  };

  const reset = () => {
    setLeft("");
    setRight("");
    setDiff([]);
    setError(null);
  };

  const stats = React.useMemo(() => {
    let added = 0;
    let removed = 0;
    let unchanged = 0;
    for (const d of diff) {
      if (d.type === "added") added++;
      else if (d.type === "removed") removed++;
      else unchanged++;
    }
    return { added, removed, unchanged };
  }, [diff]);

  const content: ToolContent = {
    intro:
      "Compare two blocks of text line-by-line and see exactly what was added, removed or kept. The diff is computed with a classic LCS algorithm — no libraries, no backend. Toggle case-sensitivity and whitespace normalisation to suit your workflow.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="dc-left">Original (left)</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="dc-left"
              value={left}
              onChange={(e) => setLeft(e.target.value)}
              placeholder="Paste the original text..."
              className="min-h-[200px] font-mono text-xs"
              spellCheck={false}
              aria-label="Original text"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dc-right">Changed (right)</Label>
            <Textarea
              id="dc-right"
              value={right}
              onChange={(e) => setRight(e.target.value)}
              placeholder="Paste the modified text..."
              className="min-h-[200px] font-mono text-xs"
              spellCheck={false}
              aria-label="Modified text"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <Switch id="dc-case" checked={ignoreCase} onCheckedChange={setIgnoreCase} />
            <Label htmlFor="dc-case" className="text-sm font-normal">
              Ignore case
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="dc-ws"
              checked={ignoreWhitespace}
              onCheckedChange={setIgnoreWhitespace}
            />
            <Label htmlFor="dc-ws" className="text-sm font-normal">
              Normalise whitespace
            </Label>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={run}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Compare
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <p>{error}</p>
          </div>
        )}

        {diff.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-emerald-700 dark:text-emerald-300">
                +{stats.added} added
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-0.5 text-destructive">
                −{stats.removed} removed
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                ={stats.unchanged} unchanged
              </span>
              <CopyButton
                size="sm"
                value={() =>
                  diff
                    .map((d) =>
                      d.type === "added"
                        ? `+ ${d.text}`
                        : d.type === "removed"
                        ? `- ${d.text}`
                        : `  ${d.text}`
                    )
                    .join("\n")
                }
                label="Copy diff"
              />
            </div>
            <div className="max-h-[460px] overflow-auto rounded-lg border bg-muted/30 font-mono text-xs">
              <table className="w-full border-collapse">
                <tbody>
                  {diff.map((d, i) => (
                    <tr
                      key={i}
                      className={
                        d.type === "added"
                          ? "bg-emerald-500/15"
                          : d.type === "removed"
                          ? "bg-destructive/15"
                          : ""
                      }
                    >
                      <td className="w-10 select-none border-r px-2 py-0.5 text-right text-muted-foreground">
                        {d.oldNum ?? ""}
                      </td>
                      <td className="w-10 select-none border-r px-2 py-0.5 text-right text-muted-foreground">
                        {d.newNum ?? ""}
                      </td>
                      <td className="whitespace-pre-wrap px-3 py-0.5">
                        <span
                          className={
                            d.type === "added"
                              ? "text-emerald-700 dark:text-emerald-300"
                              : d.type === "removed"
                              ? "text-destructive"
                              : ""
                          }
                        >
                          {d.type === "added" ? "+ " : d.type === "removed" ? "− " : "  "}
                          {d.text}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!diff.length && !error && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
            <GitCompare className="mb-2 h-8 w-8 opacity-50" />
            <p>Paste two text blocks and click Compare to see the line-by-line diff.</p>
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste the original text",
        description:
          "Drop the before version of your text into the left-hand editor (for example, a draft commit message or an old API response).",
      },
      {
        title: "Paste the changed text",
        description:
          "Drop the after version into the right-hand editor. Anything you change will appear as a removed + added pair.",
      },
      {
        title: "Tweak the options",
        description:
          "Toggle Ignore case to treat Foo and foo as identical, or Normalise whitespace to collapse runs of spaces and trim trailing whitespace before comparing.",
      },
      {
        title: "Compare and copy",
        description:
          "Click Compare. Use the badges to see the number of additions and removals, and Copy diff to grab a unified-text version for a PR or chat.",
      },
    ],
    useCases: [
      "Review a config file change before committing it.",
      "Compare two API responses to spot what changed between deploys.",
      "Check whether a refactored function still produces the same output.",
      "Verify that two large text files are identical or see exactly where they differ.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The diff is line-based — intra-line character diffs are not highlighted.</li>
        <li>Inputs larger than 1 MB per side are rejected to keep the tab responsive.</li>
        <li>The LCS algorithm runs in O(n·m) time and memory, so very large files (tens of thousands of lines) will be slow.</li>
      </ul>
    ),
    faq: [
      {
        q: "How is the diff computed?",
        a: "With a classic longest-common-subsequence dynamic-programming algorithm. Lines that appear in both texts in the same order are marked unchanged; everything else is marked as added or removed.",
      },
      {
        q: "Why does my move look like a delete + add?",
        a: "Line-based diffs do not detect moves. If you cut a block of text and paste it elsewhere, the diff shows it as removed from the original position and added at the new one.",
      },
      {
        q: "Can I compare files with different line endings?",
        a: "Yes. The diff splits on either LF or CRLF, so mixed line endings are handled. Whitespace-only differences can be hidden with the Normalise whitespace toggle.",
      },
      {
        q: "Is my text sent anywhere?",
        a: "No. The diff is computed entirely in your browser tab. Neither side ever leaves your device.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
