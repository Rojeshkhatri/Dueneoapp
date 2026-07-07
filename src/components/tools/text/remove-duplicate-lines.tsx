"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Wand2, Download, Filter } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, byteLength, downloadText } from "./_text-helpers";

type KeepMode = "first" | "last";

const SAMPLE = `apple
banana
apple
cherry
banana
date
cherry
apple`;

export function RemoveDuplicateLines({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [caseSensitive, setCaseSensitive] = React.useState(true);
  const [trimWhitespace, setTrimWhitespace] = React.useState(false);
  const [keep, setKeep] = React.useState<KeepMode>("first");
  const [removedCount, setRemovedCount] = React.useState(0);

  const tooLarge = byteLength(input) > MAX_INPUT_BYTES;

  const run = React.useCallback(() => {
    if (!input) {
      setOutput("");
      setRemovedCount(0);
      toast.message("Paste some lines first.");
      return;
    }
    if (tooLarge) {
      toast.error(INPUT_TOO_LARGE_MSG);
      return;
    }
    const lines = input.replace(/\r\n/g, "\n").split("\n");
    const seen = new Set<string>();
    const result: string[] = [];
    let removed = 0;

    if (keep === "first") {
      for (const line of lines) {
        const key = trimWhitespace ? line.trim() : line;
        const cmp = caseSensitive ? key : key.toLowerCase();
        if (seen.has(cmp)) {
          removed++;
        } else {
          seen.add(cmp);
          result.push(line);
        }
      }
    } else {
      // keep last: iterate from the right, remember which lines to keep
      const keepIdx = new Set<number>();
      const reverseSeen = new Set<string>();
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const key = trimWhitespace ? line.trim() : line;
        const cmp = caseSensitive ? key : key.toLowerCase();
        if (reverseSeen.has(cmp)) {
          removed++;
        } else {
          reverseSeen.add(cmp);
          keepIdx.add(i);
        }
      }
      for (let i = 0; i < lines.length; i++) {
        if (keepIdx.has(i)) result.push(lines[i]);
      }
    }

    setOutput(result.join("\n"));
    setRemovedCount(removed);
    toast.success(`Removed ${removed} duplicate line${removed === 1 ? "" : "s"}.`);
  }, [input, tooLarge, caseSensitive, trimWhitespace, keep]);

  const reset = () => {
    setInput("");
    setOutput("");
    setRemovedCount(0);
  };

  const loadSample = () => {
    setInput(SAMPLE);
    setOutput("");
    setRemovedCount(0);
  };

  const beforeLines = input === "" ? 0 : input.replace(/\r\n/g, "\n").split("\n").length;
  const afterLines = output === "" ? 0 : output.split("\n").length;

  const content: ToolContent = {
    intro:
      "Strip duplicate lines from a list while preserving order. Toggle case sensitivity, trim leading and trailing whitespace before comparing, and choose whether to keep the first or last occurrence of each duplicate.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rd-input">Input</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="rd-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"Paste one item per line…\napple\nbanana\napple"}
              className="min-h-[240px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input lines"
            />
            {tooLarge && (
              <p className="text-xs text-destructive" role="status">
                {INPUT_TOO_LARGE_MSG}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rd-output">Output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("unique-lines.txt", output);
                    toast.success("Downloaded unique-lines.txt");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="rd-output"
              value={output}
              readOnly
              placeholder="Unique lines will appear here."
              className="min-h-[240px] font-mono text-xs"
              spellCheck={false}
              aria-label="Output lines"
            />
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="rd-case"
                checked={caseSensitive}
                onCheckedChange={setCaseSensitive}
                aria-label="Case sensitive"
              />
              <Label htmlFor="rd-case" className="text-sm font-normal">
                Case-sensitive
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="rd-trim"
                checked={trimWhitespace}
                onCheckedChange={setTrimWhitespace}
                aria-label="Trim whitespace"
              />
              <Label htmlFor="rd-trim" className="text-sm font-normal">
                Trim whitespace before comparing
              </Label>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Keep</Label>
              <RadioGroup
                value={keep}
                onValueChange={(v) => setKeep(v as KeepMode)}
                className="flex flex-row gap-4"
              >
                <Label className="flex items-center gap-1.5 text-sm font-normal">
                  <RadioGroupItem value="first" id="rd-first" /> First
                </Label>
                <Label className="flex items-center gap-1.5 text-sm font-normal">
                  <RadioGroupItem value="last" id="rd-last" /> Last
                </Label>
              </RadioGroup>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
              <Button onClick={run}>
                <Wand2 className="mr-1.5 h-4 w-4" /> Remove duplicates
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-4 w-4" /> Before
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{beforeLines}</div>
            <div className="text-[10px] text-muted-foreground">lines</div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-4 w-4" /> After
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{afterLines}</div>
            <div className="text-[10px] text-muted-foreground">unique lines</div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-4 w-4" /> Removed
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{removedCount}</div>
            <div className="text-[10px] text-muted-foreground">duplicates</div>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Paste your list",
        description:
          "Drop one item per line. Works for URLs, emails, IDs, keywords or any list where duplicates should be removed.",
      },
      {
        title: "Pick options",
        description:
          "Toggle case sensitivity, choose whether to trim whitespace before comparing, and pick whether to keep the first or last occurrence of each duplicate.",
      },
      {
        title: "Remove duplicates",
        description:
          "Click Remove duplicates. The before/after/removed counters update so you can see how many lines were stripped.",
      },
      {
        title: "Copy or save",
        description:
          "Use Copy to put the result on your clipboard, or Save to download unique-lines.txt.",
      },
    ],
    useCases: [
      "Deduplicate a list of email addresses before importing to a CRM.",
      "Remove duplicate URLs from a sitemap before submitting to search engines.",
      "Tidy a list of keywords exported from a research tool.",
      "Strip duplicate lines from a log file before sharing.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Order is preserved — the output order matches the order of first (or last) occurrence in the input.</li>
        <li>Trim whitespace only affects comparison; original lines are kept verbatim in the output.</li>
        <li>Inputs larger than 1 MB are flagged but still processed on the main thread.</li>
      </ul>
    ),
    faq: [
      {
        q: "What is the difference between keeping first and keeping last?",
        a: "Keeping first preserves the order in which each unique value first appears. Keeping last preserves the order in which each unique value last appears, dropping earlier duplicates instead.",
      },
      {
        q: "Does case sensitivity matter?",
        a: "Yes. With case sensitivity on, \"Apple\" and \"apple\" are treated as different lines. Turn it off to treat them as the same.",
      },
      {
        q: "Is my list uploaded anywhere?",
        a: "No. Deduplication runs in your browser with built-in string operations. Your text never leaves the tab.",
      },
      {
        q: "Does it sort the output?",
        a: "No — the original order is preserved. Use the Sort Lines tool to alphabetise the deduplicated list.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
