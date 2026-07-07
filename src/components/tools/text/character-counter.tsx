"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Hash, Type, Binary, Asterisk, AlignLeft } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, byteLength, formatInt } from "./_text-helpers";

const SAMPLE =
  "Dueneo has 100 browser-only tools & 15 classic games!\n" +
  "Type here to count characters, letters, digits, symbols and lines — instantly.";

interface Stat {
  label: string;
  value: string;
  icon: React.ReactNode;
  help?: string;
}

export function CharacterCounter({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");

  const stats = React.useMemo(() => {
    const chars = input.length;
    const charsNoSpaces = input.replace(/\s/g, "").length;
    const letters = (input.match(/[A-Za-z\u00C0-\u024F]/g) ?? []).length;
    const digits = (input.match(/[0-9]/g) ?? []).length;
    // Symbols: anything that is not whitespace, letter or digit.
    const symbols = input.replace(/[\sA-Za-z0-9\u00C0-\u024F]/g, "").length;
    const lines = input === "" ? 0 : input.split(/\r\n|\r|\n/).length;
    return { chars, charsNoSpaces, letters, digits, symbols, lines };
  }, [input]);

  const tooLarge = byteLength(input) > MAX_INPUT_BYTES;

  const reset = () => {
    setInput("");
    toast.message("Cleared.");
  };

  const loadSample = () => setInput(SAMPLE);

  const cards: Stat[] = [
    { label: "Total characters", value: formatInt(stats.chars), icon: <Hash className="h-4 w-4" /> },
    {
      label: "Without spaces",
      value: formatInt(stats.charsNoSpaces),
      icon: <Hash className="h-4 w-4" />,
      help: "All whitespace removed",
    },
    { label: "Letters", value: formatInt(stats.letters), icon: <Type className="h-4 w-4" /> },
    { label: "Digits", value: formatInt(stats.digits), icon: <Binary className="h-4 w-4" /> },
    { label: "Symbols", value: formatInt(stats.symbols), icon: <Asterisk className="h-4 w-4" /> },
    { label: "Lines", value: formatInt(stats.lines), icon: <AlignLeft className="h-4 w-4" /> },
  ];

  const statsText =
    `Total characters: ${stats.chars}\n` +
    `Without spaces: ${stats.charsNoSpaces}\n` +
    `Letters: ${stats.letters}\n` +
    `Digits: ${stats.digits}\n` +
    `Symbols: ${stats.symbols}\n` +
    `Lines: ${stats.lines}`;

  const content: ToolContent = {
    intro:
      "Count characters with and without spaces, plus letters, digits, symbols and lines. Counts update live as you type — perfect for hitting tweet limits, SMS limits, meta-description lengths and code-point budgets.",
    tool: (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="cc-input">Your text</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
              <CopyButton value={statsText} size="sm" label="Copy stats" />
            </div>
          </div>
          <Textarea
            id="cc-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Start typing or paste text here…"
            className="min-h-[220px] font-mono text-sm"
            aria-label="Text to count"
            spellCheck={false}
          />
          {tooLarge && (
            <p className="text-xs text-destructive" role="status">
              {INPUT_TOO_LARGE_MSG}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {c.icon}
                <span>{c.label}</span>
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{c.value}</div>
              {c.help && (
                <div className="mt-0.5 text-[10px] text-muted-foreground">{c.help}</div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Type or paste your text",
        description:
          "Anything goes — code, prose, emoji or symbols. Counts recalculate on every keystroke.",
      },
      {
        title: "Read off the six counts",
        description:
          "Total characters, characters without spaces, letters, digits, symbols and lines all update live.",
      },
      {
        title: "Copy the breakdown",
        description:
          "Click Copy stats to put a plain-text summary of every count onto your clipboard.",
      },
    ],
    useCases: [
      "Stay under Twitter's 280-character limit per tweet.",
      "Check that a meta description fits inside 160 characters.",
      "Make sure an SMS draft is under 160 characters per segment.",
      "Verify how many bytes a string will occupy before storing it.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Counts are based on UTF-16 code units (the JavaScript <code>String.length</code> convention); supplementary-plane characters such as some emoji count as 2.</li>
        <li>Symbols include punctuation, emoji and any character that is not whitespace, an ASCII letter or a digit.</li>
        <li>Inputs larger than 1 MB are flagged but still processed on the main thread.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why does an emoji count as 2 characters?",
        a: "JavaScript strings use UTF-16, where supplementary-plane characters like 😀 are stored as a surrogate pair. The counter reports UTF-16 code units, matching String.length, so you see the same number a form field would enforce.",
      },
      {
        q: "Does it count spaces?",
        a: "Yes — Total characters includes spaces, tabs and newlines. The Without spaces card subtracts all whitespace.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. Counting is done with built-in string operations in your browser. Your text stays in the tab.",
      },
      {
        q: "Does it support other alphabets?",
        a: "Yes. Latin extended letters (À–ɏ) are recognised as letters; other scripts such as Cyrillic, Greek or CJK count as symbols here because we use a narrow letter range to keep the count predictable.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
