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
import { RotateCcw, Wand2, Download, ArrowDownAZ, ArrowUpAZ, ArrowDownNarrowWide, ArrowUpNarrowWide, ArrowLeftRight, Shuffle, Ruler } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, byteLength, downloadText } from "./_text-helpers";

type SortMode =
  | "asc"
  | "desc"
  | "num-asc"
  | "num-desc"
  | "reverse"
  | "shuffle"
  | "length";

interface ModeOption {
  key: SortMode;
  label: string;
  icon: React.ReactNode;
  help: string;
}

const OPTIONS: ModeOption[] = [
  { key: "asc", label: "A → Z", icon: <ArrowDownAZ className="h-4 w-4" />, help: "Alphabetical, ascending" },
  { key: "desc", label: "Z → A", icon: <ArrowUpAZ className="h-4 w-4" />, help: "Alphabetical, descending" },
  { key: "num-asc", label: "Numeric ↑", icon: <ArrowDownNarrowWide className="h-4 w-4" />, help: "Smallest number first" },
  { key: "num-desc", label: "Numeric ↓", icon: <ArrowUpNarrowWide className="h-4 w-4" />, help: "Largest number first" },
  { key: "reverse", label: "Reverse", icon: <ArrowLeftRight className="h-4 w-4" />, help: "Mirror the line order" },
  { key: "shuffle", label: "Shuffle", icon: <Shuffle className="h-4 w-4" />, help: "Random order" },
  { key: "length", label: "By length", icon: <Ruler className="h-4 w-4" />, help: "Shortest line first" },
];

const SAMPLE = `banana\ncherry\napple\ndate\nelderberry\nfig\ngrape`;

function compareLines(a: string, b: string, caseInsensitive: boolean): number {
  const A = caseInsensitive ? a.toLowerCase() : a;
  const B = caseInsensitive ? b.toLowerCase() : b;
  if (A < B) return -1;
  if (A > B) return 1;
  return 0;
}

function leadingNumber(line: string): number {
  const m = line.trim().match(/^[-+]?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}

export function SortLines({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [mode, setMode] = React.useState<SortMode>("asc");
  const [caseInsensitive, setCaseInsensitive] = React.useState(false);

  const tooLarge = byteLength(input) > MAX_INPUT_BYTES;

  const run = React.useCallback(() => {
    if (!input) {
      setOutput("");
      toast.message("Paste some lines first.");
      return;
    }
    if (tooLarge) {
      toast.error(INPUT_TOO_LARGE_MSG);
      return;
    }
    const lines = input.replace(/\r\n/g, "\n").split("\n");
    let result: string[] = lines.slice();
    switch (mode) {
      case "asc":
        result.sort((a, b) => compareLines(a, b, caseInsensitive));
        break;
      case "desc":
        result.sort((a, b) => -compareLines(a, b, caseInsensitive));
        break;
      case "num-asc":
        result.sort((a, b) => {
          const na = leadingNumber(a);
          const nb = leadingNumber(b);
          if (Number.isNaN(na) && Number.isNaN(nb)) return compareLines(a, b, caseInsensitive);
          if (Number.isNaN(na)) return 1;
          if (Number.isNaN(nb)) return -1;
          return na - nb;
        });
        break;
      case "num-desc":
        result.sort((a, b) => {
          const na = leadingNumber(a);
          const nb = leadingNumber(b);
          if (Number.isNaN(na) && Number.isNaN(nb)) return -compareLines(a, b, caseInsensitive);
          if (Number.isNaN(na)) return 1;
          if (Number.isNaN(nb)) return -1;
          return nb - na;
        });
        break;
      case "reverse":
        result.reverse();
        break;
      case "shuffle": {
        // Fisher-Yates shuffle.
        for (let i = result.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [result[i], result[j]] = [result[j], result[i]];
        }
        break;
      }
      case "length":
        result.sort((a, b) => a.length - b.length || compareLines(a, b, caseInsensitive));
        break;
    }
    setOutput(result.join("\n"));
    toast.success(`Sorted: ${OPTIONS.find((o) => o.key === mode)?.label}.`);
  }, [input, tooLarge, mode, caseInsensitive]);

  const reset = () => {
    setInput("");
    setOutput("");
  };

  const loadSample = () => {
    setInput(SAMPLE.replace(/\\n/g, "\n"));
    setOutput("");
  };

  const beforeLines = input === "" ? 0 : input.replace(/\r\n/g, "\n").split("\n").length;
  const afterLines = output === "" ? 0 : output.split("\n").length;

  const content: ToolContent = {
    intro:
      "Sort lines alphabetically (A→Z or Z→A), numerically (ascending or descending), by length, in reverse, or shuffled. Toggle case-insensitive comparison to put \"apple\" and \"Apple\" next to each other.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sl-input">Input</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="sl-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"Paste one line per row…\nbanana\ncherry\napple"}
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
              <Label htmlFor="sl-output">Output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("sorted-lines.txt", output);
                    toast.success("Downloaded sorted-lines.txt");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="sl-output"
              value={output}
              readOnly
              placeholder="Sorted lines will appear here."
              className="min-h-[240px] font-mono text-xs"
              spellCheck={false}
              aria-label="Sorted output"
            />
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <Label className="text-sm font-medium">Sort mode</Label>
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as SortMode)}
            className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4"
          >
            {OPTIONS.map((opt) => (
              <Label
                key={opt.key}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition hover:border-primary hover:bg-primary/5 ${
                  mode === opt.key ? "border-primary ring-1 ring-primary/30" : ""
                }`}
              >
                <RadioGroupItem value={opt.key} id={`sl-${opt.key}`} className="mt-0.5" />
                <span className="flex flex-col">
                  <span className="flex items-center gap-1.5 font-medium">
                    {opt.icon}
                    {opt.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{opt.help}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>

          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="sl-ci"
                checked={caseInsensitive}
                onCheckedChange={setCaseInsensitive}
                aria-label="Case insensitive"
              />
              <Label htmlFor="sl-ci" className="text-sm font-normal">
                Case-insensitive
              </Label>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
              <Button onClick={run}>
                <Wand2 className="mr-1.5 h-4 w-4" /> Sort lines
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="text-xs text-muted-foreground">Input</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{beforeLines}</div>
            <div className="text-[10px] text-muted-foreground">lines</div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="text-xs text-muted-foreground">Output</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{afterLines}</div>
            <div className="text-[10px] text-muted-foreground">lines</div>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Paste your lines",
        description:
          "Drop one item per line — names, numbers, file paths, anything.",
      },
      {
        title: "Pick a sort mode",
        description:
          "Choose alphabetical, numeric, reverse, shuffle or by length. Toggle case-insensitive if you want \"Apple\" and \"apple\" adjacent.",
      },
      {
        title: "Sort",
        description:
          "Click Sort lines. The result replaces the output box on the right.",
      },
      {
        title: "Copy or save",
        description:
          "Use Copy to put the result on your clipboard, or Save to download sorted-lines.txt.",
      },
    ],
    useCases: [
      "Alphabetise a list of names for a directory or attendee list.",
      "Sort numeric IDs in ascending order before joining a database table.",
      "Reverse a list of git commits so the latest appears at the bottom.",
      "Shuffle a list of participants for a random presentation order.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Numeric sort extracts the leading number from each line; lines without a leading number sort after numeric lines.</li>
        <li>Shuffle uses <code>Math.random</code> and is not cryptographically secure.</li>
        <li>Sorting uses the default Unicode code-point comparison, which sorts uppercase before lowercase when case-sensitive.</li>
        <li>Inputs larger than 1 MB are flagged but still processed on the main thread.</li>
      </ul>
    ),
    faq: [
      {
        q: "How does numeric sort work?",
        a: "Each line's leading number (integer or decimal, optional sign) is extracted. Lines that begin with a number sort numerically; lines without a leading number appear after the numeric lines, sorted alphabetically.",
      },
      {
        q: "What does case-insensitive do?",
        a: "It lower-cases both lines before comparing, so \"Apple\" sorts next to \"apple\". With case sensitivity on, all uppercase letters come before lowercase because of Unicode code points.",
      },
      {
        q: "Is my list uploaded anywhere?",
        a: "No. Sorting runs in your browser with built-in array methods. Your text never leaves the tab.",
      },
      {
        q: "Does it remove duplicates?",
        a: "No — sorting preserves every line. Use the Remove Duplicate Lines tool to dedupe before or after sorting.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
