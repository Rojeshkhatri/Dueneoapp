"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Wand2, Download, Sparkles } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, byteLength, downloadText } from "./_text-helpers";

interface Ops {
  extraSpaces: boolean;
  emptyLines: boolean;
  duplicateLines: boolean;
  trimEachLine: boolean;
  removeNonAscii: boolean;
  removeSpecialChars: boolean;
}

const SAMPLE =
  "  Dueneo   runs   entirely   in   your   browser.  \n\n" +
  "No uploads,   no signups,   no tracking.\n\n" +
  "Dueneo runs entirely in your browser.\n" +
  "Just open the page & go — it's that easy!";

const DEFAULT_OPS: Ops = {
  extraSpaces: true,
  emptyLines: true,
  duplicateLines: false,
  trimEachLine: true,
  removeNonAscii: false,
  removeSpecialChars: false,
};

function cleanText(input: string, ops: Ops): string {
  let text = input.replace(/\r\n/g, "\n");

  // 1. Remove non-ASCII characters first (so later steps work on clean text).
  if (ops.removeNonAscii) {
    text = text.replace(/[^\x00-\x7F]/g, "");
  }

  // 2. Remove special characters — keep alphanumerics, basic punctuation,
  //    whitespace and newlines.
  if (ops.removeSpecialChars) {
    // Allow letters, digits, whitespace, newline, period, comma, apostrophe,
    // hyphen, question mark, exclamation mark, colon, semicolon.
    text = text.replace(/[^A-Za-z0-9\s.,'?!:;-]/g, "");
  }

  // 3. Trim each line's edges.
  if (ops.trimEachLine) {
    text = text
      .split("\n")
      .map((line) => line.replace(/^\s+|\s+$/g, ""))
      .join("\n");
  }

  // 4. Collapse runs of horizontal whitespace to a single space.
  if (ops.extraSpaces) {
    text = text.replace(/[^\S\r\n]+/g, " ");
    // After collapse, trim each line again to drop the single space that
    // might remain at the start/end of each line.
    text = text
      .split("\n")
      .map((line) => line.replace(/^\s+|\s+$/g, ""))
      .join("\n");
    // Trim the overall string as well.
    text = text.replace(/^\s+|\s+$/g, "");
  }

  // 5. Remove empty (and whitespace-only) lines.
  if (ops.emptyLines) {
    text = text
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .join("\n");
  }

  // 6. Remove duplicate lines, preserving order.
  if (ops.duplicateLines) {
    const seen = new Set<string>();
    text = text
      .split("\n")
      .filter((line) => {
        if (seen.has(line)) return false;
        seen.add(line);
        return true;
      })
      .join("\n");
  }

  return text;
}

export function TextCleaner({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [ops, setOps] = React.useState<Ops>(DEFAULT_OPS);

  const tooLarge = byteLength(input) > MAX_INPUT_BYTES;

  const toggleOp = (key: keyof Ops) => (checked: boolean) => {
    setOps((prev) => ({ ...prev, [key]: checked }));
  };

  const run = React.useCallback(() => {
    if (!input) {
      setOutput("");
      toast.message("Paste some text first.");
      return;
    }
    if (tooLarge) {
      toast.error(INPUT_TOO_LARGE_MSG);
      return;
    }
    const result = cleanText(input, ops);
    setOutput(result);
    const beforeLen = input.length;
    const afterLen = result.length;
    toast.success(
      `Cleaned (${beforeLen} → ${afterLen} chars${beforeLen > 0 ? `, ${Math.max(0, beforeLen - afterLen)} removed` : ""}).`
    );
  }, [input, tooLarge, ops]);

  const reset = () => {
    setInput("");
    setOutput("");
    setOps(DEFAULT_OPS);
  };

  const loadSample = () => {
    setInput(SAMPLE);
    setOutput("");
  };

  const opList: { key: keyof Ops; label: string; help: string }[] = [
    {
      key: "extraSpaces",
      label: "Collapse extra spaces",
      help: "Runs of spaces and tabs → a single space",
    },
    {
      key: "trimEachLine",
      label: "Trim each line",
      help: "Remove leading and trailing whitespace per line",
    },
    {
      key: "emptyLines",
      label: "Remove empty lines",
      help: "Drop lines that are empty or whitespace-only",
    },
    {
      key: "duplicateLines",
      label: "Remove duplicate lines",
      help: "Keep only the first occurrence of each line",
    },
    {
      key: "removeNonAscii",
      label: "Remove non-ASCII characters",
      help: "Strip characters outside U+0000–U+007F",
    },
    {
      key: "removeSpecialChars",
      label: "Remove special characters",
      help: "Keep letters, digits, basic punctuation and spaces",
    },
  ];

  const beforeChars = input.length;
  const beforeLines = input === "" ? 0 : input.replace(/\r\n/g, "\n").split("\n").length;
  const afterChars = output.length;
  const afterLines = output === "" ? 0 : output.split("\n").length;

  const content: ToolContent = {
    intro:
      "Clean messy text in one click by combining common tidying operations: collapse extra spaces, trim each line, remove empty lines, deduplicate lines, strip non-ASCII characters and remove special characters. Toggle the operations you want, apply, and copy the result.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tc-input">Input</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="tc-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste messy text here — extra spaces, blank lines, duplicates, accents, special characters…"
              className="min-h-[240px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input text"
            />
            {tooLarge && (
              <p className="text-xs text-destructive" role="status">
                {INPUT_TOO_LARGE_MSG}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tc-output">Output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("cleaned.txt", output);
                    toast.success("Downloaded cleaned.txt");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="tc-output"
              value={output}
              readOnly
              placeholder="Cleaned text will appear here."
              className="min-h-[240px] font-mono text-xs"
              spellCheck={false}
              aria-label="Cleaned output"
            />
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Operations
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {opList.map((op) => (
              <label
                key={op.key}
                htmlFor={`tc-${op.key}`}
                className="flex cursor-pointer items-start gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition hover:border-primary hover:bg-primary/5"
              >
                <Checkbox
                  id={`tc-${op.key}`}
                  checked={ops[op.key]}
                  onCheckedChange={(v) => toggleOp(op.key)(v === true)}
                  className="mt-0.5"
                />
                <span className="flex flex-col">
                  <span className="font-medium">{op.label}</span>
                  <span className="text-[11px] text-muted-foreground">{op.help}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={run}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Clean text
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="text-xs text-muted-foreground">Before</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{beforeChars}</div>
            <div className="text-[10px] text-muted-foreground">characters</div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="text-xs text-muted-foreground">Before</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{beforeLines}</div>
            <div className="text-[10px] text-muted-foreground">lines</div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="text-xs text-muted-foreground">After</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{afterChars}</div>
            <div className="text-[10px] text-muted-foreground">characters</div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="text-xs text-muted-foreground">After</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{afterLines}</div>
            <div className="text-[10px] text-muted-foreground">lines</div>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Paste your text",
        description:
          "Drop in the messy block of text — code, copy from a PDF, a log file, anything that needs tidying.",
      },
      {
        title: "Tick the operations",
        description:
          "Choose any combination: collapse extra spaces, trim each line, remove empty lines, deduplicate lines, strip non-ASCII, remove special characters.",
      },
      {
        title: "Clean",
        description:
          "Click Clean text. Operations run in the listed order, and the before/after counters show how much was removed.",
      },
      {
        title: "Copy or save",
        description:
          "Use Copy to put the result on your clipboard, or Save to download cleaned.txt.",
      },
    ],
    useCases: [
      "Tidy text pasted from a PDF before importing into a CMS.",
      "Normalise log output before sharing in a bug report.",
      "Strip emoji and special characters from a CSV before import.",
      "Deduplicate and clean a list of tags exported from a tool.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Operations run in a fixed order: non-ASCII strip → special-char strip → trim → collapse spaces → remove empty lines → deduplicate. Toggling later operations does not change earlier steps.</li>
        <li>Remove special characters keeps a small set of punctuation (period, comma, apostrophe, hyphen, question mark, exclamation mark, colon, semicolon). Other punctuation is removed.</li>
        <li>Remove duplicate lines compares exact text after cleaning — case-sensitive and whitespace-sensitive.</li>
        <li>Inputs larger than 1 MB are flagged but still processed on the main thread.</li>
      </ul>
    ),
    faq: [
      {
        q: "Which operations run, and in what order?",
        a: "If ticked, operations run in this order: strip non-ASCII, strip special characters, trim each line, collapse extra spaces, remove empty lines, remove duplicate lines. Earlier steps affect what later steps see.",
      },
      {
        q: "What are special characters?",
        a: "Anything that is not a letter, digit, whitespace or one of: . , ' ? ! : ; -. Emoji, decorative symbols and most punctuation are removed when this option is on.",
      },
      {
        q: "Does Remove duplicate lines ignore case?",
        a: "No — it compares the cleaned text exactly. Lines that differ only by case are kept. Run Case Converter first if you want to normalise case before deduplicating.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. Cleaning runs entirely in your browser with built-in string operations. Your text never leaves the tab.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
