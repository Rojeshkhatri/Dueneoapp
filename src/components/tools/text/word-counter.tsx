"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, FileText, Clock, Hash, AlignLeft, Pilcrow } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_INPUT_BYTES,
  INPUT_TOO_LARGE_MSG,
  byteLength,
  formatInt,
  formatDuration,
  countWords,
  countSentences,
  countParagraphs,
  countLines,
} from "./_text-helpers";

const DEFAULT_WPM = 200;

const SAMPLE =
  "Dueneo is a collection of one hundred browser-only tools and fifteen classic games. " +
  "Everything runs locally in your browser, so your text never leaves your device. " +
  "Type or paste your content here to see live counts of words, characters, sentences, paragraphs and an estimated reading time.";

interface StatCard {
  label: string;
  value: string;
  icon: React.ReactNode;
}

export function WordCounter({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");

  const stats = React.useMemo(() => {
    const words = countWords(input);
    const chars = input.length;
    const charsNoSpaces = input.replace(/\s/g, "").length;
    const sentences = countSentences(input);
    const paragraphs = countParagraphs(input);
    const lines = countLines(input);
    const readingSeconds = (words / DEFAULT_WPM) * 60;
    return {
      words,
      chars,
      charsNoSpaces,
      sentences,
      paragraphs,
      lines,
      readingSeconds,
    };
  }, [input]);

  const tooLarge = byteLength(input) > MAX_INPUT_BYTES;

  const reset = () => {
    setInput("");
    toast.message("Cleared.");
  };

  const loadSample = () => setInput(SAMPLE);

  const cards: StatCard[] = [
    { label: "Words", value: formatInt(stats.words), icon: <FileText className="h-4 w-4" /> },
    { label: "Characters", value: formatInt(stats.chars), icon: <Hash className="h-4 w-4" /> },
    {
      label: "Characters (no spaces)",
      value: formatInt(stats.charsNoSpaces),
      icon: <Hash className="h-4 w-4" />,
    },
    { label: "Sentences", value: formatInt(stats.sentences), icon: <AlignLeft className="h-4 w-4" /> },
    { label: "Paragraphs", value: formatInt(stats.paragraphs), icon: <Pilcrow className="h-4 w-4" /> },
    { label: "Lines", value: formatInt(stats.lines), icon: <AlignLeft className="h-4 w-4" /> },
    {
      label: `Reading time @ ${DEFAULT_WPM} wpm`,
      value: formatDuration(stats.readingSeconds),
      icon: <Clock className="h-4 w-4" />,
    },
  ];

  const statsText =
    `Words: ${stats.words}\n` +
    `Characters: ${stats.chars}\n` +
    `Characters (no spaces): ${stats.charsNoSpaces}\n` +
    `Sentences: ${stats.sentences}\n` +
    `Paragraphs: ${stats.paragraphs}\n` +
    `Lines: ${stats.lines}\n` +
    `Reading time: ${formatDuration(stats.readingSeconds)}`;

  const content: ToolContent = {
    intro:
      "Count words, characters, sentences, paragraphs and lines as you type. Dueneo's word counter also estimates reading time at 200 words per minute so you can hit a target length for an article, post or essay.",
    tool: (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="wc-input">Your text</Label>
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
            id="wc-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Start typing or paste your text here…"
            className="min-h-[220px]"
            aria-label="Text to count"
          />
          {tooLarge && (
            <p className="text-xs text-destructive" role="status">
              {INPUT_TOO_LARGE_MSG}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-xl border bg-muted/30 p-4"
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {c.icon}
                <span>{c.label}</span>
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {c.value}
              </div>
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
          "Drop your draft into the text area. Counts update instantly — there is nothing to click.",
      },
      {
        title: "Read off the stats",
        description:
          "Words, characters (with and without spaces), sentences, paragraphs, lines and reading time update on every keystroke.",
      },
      {
        title: "Copy the breakdown",
        description:
          "Click Copy stats to put a plain-text summary of every count onto your clipboard.",
      },
      {
        title: "Reset to start over",
        description:
          "Use Reset to clear the field. Your text is never stored or transmitted.",
      },
    ],
    useCases: [
      "Hit a minimum word count for an essay or scholarship application.",
      "Check that a meta description stays under 160 characters for SEO.",
      "Estimate how long an article will take to read aloud.",
      "Confirm that a tweet draft fits the character limit.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Reading time uses a fixed 200 wpm estimate — your actual pace may differ.</li>
        <li>Sentences are detected with `.`, `!` and `?` punctuation; abbreviations may inflate the count.</li>
        <li>Inputs larger than 1 MB are flagged but still processed on the main thread.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my text sent to a server?",
        a: "No. Counting happens entirely in your browser with built-in string operations. Your text never leaves the tab.",
      },
      {
        q: "How is reading time calculated?",
        a: "Words are counted and divided by 200 words per minute (a typical adult silent reading speed). For speaking time, use the dedicated Reading Time Calculator with adjustable speed.",
      },
      {
        q: "Does it count words in other languages?",
        a: "Yes. Any run of non-whitespace characters counts as one word, so Chinese, Japanese, Korean, Arabic and Cyrillic text all work.",
      },
      {
        q: "Why does the sentence count seem off?",
        a: "Sentences are split on `.`, `!` and `?`. Abbreviations like \"e.g.\" or numbers like \"3.14\" can inflate the count — for precise analysis, expand abbreviations first.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
