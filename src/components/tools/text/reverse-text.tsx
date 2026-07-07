"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Wand2, Download, Repeat, FlipHorizontal2, FlipVertical2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, byteLength, downloadText } from "./_text-helpers";

type ReverseMode = "characters" | "words" | "lines";

interface ModeOption {
  key: ReverseMode;
  label: string;
  icon: React.ReactNode;
  help: string;
}

const OPTIONS: ModeOption[] = [
  {
    key: "characters",
    label: "Reverse characters",
    icon: <FlipHorizontal2 className="h-4 w-4" />,
    help: "Mirror every character — \"hello\" → \"olleh\"",
  },
  {
    key: "words",
    label: "Reverse words",
    icon: <FlipVertical2 className="h-4 w-4" />,
    help: "Reverse word order — \"hello world\" → \"world hello\"",
  },
  {
    key: "lines",
    label: "Reverse lines",
    icon: <Repeat className="h-4 w-4" />,
    help: "Reverse line order — last line becomes first",
  },
];

const SAMPLE = "Dueneo runs entirely in your browser.\nNo uploads, no signups, no tracking.";

function reverseChars(text: string): string {
  // Use Array.from to handle surrogate pairs and combining marks more gracefully.
  return Array.from(text).reverse().join("");
}

function reverseWords(text: string): string {
  // Preserve line structure: reverse words within each line.
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.match(/\S+/g);
      if (!trimmed) return line;
      return trimmed.reverse().join(" ");
    })
    .join("\n");
}

function reverseLines(text: string): string {
  return text.split(/\r?\n/).reverse().join("\n");
}

export function ReverseText({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [mode, setMode] = React.useState<ReverseMode>("characters");

  const tooLarge = byteLength(input) > MAX_INPUT_BYTES;

  const run = React.useCallback(() => {
    if (!input) {
      setOutput("");
      toast.message("Type some text first.");
      return;
    }
    if (tooLarge) {
      toast.error(INPUT_TOO_LARGE_MSG);
      return;
    }
    let result = "";
    if (mode === "characters") result = reverseChars(input);
    else if (mode === "words") result = reverseWords(input);
    else result = reverseLines(input);
    setOutput(result);
    toast.success(`Reversed: ${OPTIONS.find((o) => o.key === mode)?.label}.`);
  }, [input, tooLarge, mode]);

  const reset = () => {
    setInput("");
    setOutput("");
  };

  const loadSample = () => {
    setInput(SAMPLE);
    setOutput("");
  };

  const content: ToolContent = {
    intro:
      "Reverse text in three ways: mirror every character, swap word order within each line, or flip the order of the lines themselves. Handy for puzzles, right-to-left language experiments, formatting tricks and testing edge cases.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rv-input">Input</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="rv-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or paste text here…"
              className="min-h-[220px]"
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
              <Label htmlFor="rv-output">Output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("reversed.txt", output);
                    toast.success("Downloaded reversed.txt");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="rv-output"
              value={output}
              readOnly
              placeholder="Reversed text will appear here."
              className="min-h-[220px] font-mono text-sm"
              aria-label="Reversed output"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <Label className="text-sm font-medium">Mode</Label>
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as ReverseMode)}
            className="mt-3 grid gap-2 sm:grid-cols-3"
          >
            {OPTIONS.map((opt) => (
              <Label
                key={opt.key}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition hover:border-primary hover:bg-primary/5 ${
                  mode === opt.key ? "border-primary ring-1 ring-primary/30" : ""
                }`}
              >
                <RadioGroupItem value={opt.key} id={`rv-${opt.key}`} className="mt-0.5" />
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

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={run}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Reverse
            </Button>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Paste your text",
        description:
          "Drop a sentence, paragraph or list into the input box.",
      },
      {
        title: "Choose a mode",
        description:
          "Reverse characters to mirror every glyph, reverse words to swap word order within each line, or reverse lines to flip the order of whole lines.",
      },
      {
        title: "Reverse",
        description:
          "Click Reverse. The result appears in the output box and stays until you reverse again or reset.",
      },
      {
        title: "Copy or save",
        description:
          "Use Copy to put the result on your clipboard, or Save to download reversed.txt.",
      },
    ],
    useCases: [
      "Create a palindrome-style puzzle or social media post.",
      "Reverse the order of a numbered list so the latest item appears first.",
      "Inspect how a string reads right-to-left for Arabic or Hebrew testing.",
      "Mirror a paragraph for fun in messages or screenshots.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Character reversal uses <code>Array.from</code> so surrogate pairs (emoji) stay together, but combining marks may end up on the wrong base character.</li>
        <li>Word reversal joins words with a single space; original spacing between words is not preserved.</li>
        <li>Line reversal treats <code>\\r\\n</code> and <code>\\n</code> as line separators and emits <code>\\n</code> in the output.</li>
        <li>Inputs larger than 1 MB are flagged but still processed on the main thread.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why do emoji sometimes look broken when I reverse characters?",
        a: "Some emoji are made of multiple code points (for example, a family emoji built from joined individual emoji). Reversing the code units can put combining marks on the wrong base, which may render oddly. Word or line reversal does not have this problem.",
      },
      {
        q: "Does it preserve my line breaks?",
        a: "Character reversal keeps every newline in place, just reversed. Word reversal preserves line structure and reverses words within each line. Line reversal reorders whole lines.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. Reversal runs in your browser with built-in string operations. Your text never leaves the tab.",
      },
      {
        q: "Can I undo a reversal?",
        a: "Yes — reversing again restores the original. Click Reverse twice with the same mode selected.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
