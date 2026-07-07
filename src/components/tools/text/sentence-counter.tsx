"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, AlignLeft, Pilcrow, FileText, Gauge } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_INPUT_BYTES,
  INPUT_TOO_LARGE_MSG,
  byteLength,
  formatInt,
  countWords,
  countSentences,
  countParagraphs,
} from "./_text-helpers";

const SAMPLE =
  "Dueneo runs entirely in your browser. There is nothing to install!\n\n" +
  "Counting sentences is as easy as pasting your text. Try it now.\n\n" +
  "Each paragraph is separated by a blank line. How many do you see?";

interface Stat {
  label: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
}

export function SentenceCounter({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");

  const stats = React.useMemo(() => {
    const sentences = countSentences(input);
    const paragraphs = countParagraphs(input);
    const words = countWords(input);
    const avgWordsPerSentence = sentences > 0 ? words / sentences : 0;
    const avgSentencesPerParagraph = paragraphs > 0 ? sentences / paragraphs : 0;
    return {
      sentences,
      paragraphs,
      words,
      avgWordsPerSentence,
      avgSentencesPerParagraph,
    };
  }, [input]);

  const tooLarge = byteLength(input) > MAX_INPUT_BYTES;

  const reset = () => {
    setInput("");
    toast.message("Cleared.");
  };

  const loadSample = () => setInput(SAMPLE);

  const cards: Stat[] = [
    { label: "Sentences", value: formatInt(stats.sentences), icon: <AlignLeft className="h-4 w-4" /> },
    { label: "Paragraphs", value: formatInt(stats.paragraphs), icon: <Pilcrow className="h-4 w-4" /> },
    { label: "Words", value: formatInt(stats.words), icon: <FileText className="h-4 w-4" /> },
    {
      label: "Avg words / sentence",
      value: stats.avgWordsPerSentence.toFixed(1),
      icon: <Gauge className="h-4 w-4" />,
      hint: "Aim for 15–20 for clear writing",
    },
    {
      label: "Avg sentences / paragraph",
      value: stats.avgSentencesPerParagraph.toFixed(1),
      icon: <Gauge className="h-4 w-4" />,
    },
  ];

  const statsText =
    `Sentences: ${stats.sentences}\n` +
    `Paragraphs: ${stats.paragraphs}\n` +
    `Words: ${stats.words}\n` +
    `Average words per sentence: ${stats.avgWordsPerSentence.toFixed(1)}\n` +
    `Average sentences per paragraph: ${stats.avgSentencesPerParagraph.toFixed(1)}`;

  const content: ToolContent = {
    intro:
      "Count sentences and paragraphs in your text, with bonus stats for average sentence length and paragraph density. Sentences split on `.`, `!` and `?`; paragraphs split on blank lines — both update live as you type.",
    tool: (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="sc-input">Your text</Label>
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
            id="sc-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your text here. Separate paragraphs with a blank line."
            className="min-h-[220px]"
            aria-label="Text to count"
          />
          {tooLarge && (
            <p className="text-xs text-destructive" role="status">
              {INPUT_TOO_LARGE_MSG}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {c.icon}
                <span>{c.label}</span>
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{c.value}</div>
              {c.hint && (
                <div className="mt-0.5 text-[10px] text-muted-foreground">{c.hint}</div>
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
        title: "Paste your text",
        description:
          "Drop an essay, blog post or article into the box. Separate paragraphs with one or more blank lines.",
      },
      {
        title: "Watch the counts",
        description:
          "Sentences (split on `.`, `!`, `?`), paragraphs (split on blank lines) and words update instantly. Average sentence length helps you spot run-ons.",
      },
      {
        title: "Copy the breakdown",
        description:
          "Click Copy stats to put a plain-text summary of every count onto your clipboard.",
      },
    ],
    useCases: [
      "Check that a paragraph has 3–5 sentences for web readability.",
      "Keep average sentence length under 20 words for plain-language guidelines.",
      "Verify that an essay has the required number of paragraphs.",
      "Audit a sales page for paragraph density and pacing.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Sentences are detected with `.`, `!` and `?`; abbreviations like \"Dr.\" or numbers like \"3.14\" inflate the count.</li>
        <li>Average sentence length is words ÷ sentences; very short inputs may give a misleading average.</li>
        <li>Inputs larger than 1 MB are flagged but still processed on the main thread.</li>
      </ul>
    ),
    faq: [
      {
        q: "How are sentences detected?",
        a: "We split on `.`, `!` and `?` followed by whitespace or end-of-text. Runs of only punctuation or whitespace are ignored. Abbreviations such as \"e.g.\" will be counted as separate sentences.",
      },
      {
        q: "What counts as a paragraph?",
        a: "Any block of text separated from the next by one or more blank lines. A single newline inside a block does not start a new paragraph.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. Counting happens in your browser with built-in string operations. Your text never leaves the tab.",
      },
      {
        q: "Why is my average sentence length so high?",
        a: "Long, multi-clause sentences push the average up. Try splitting sentences at conjunctions like \"and\" or \"but\" to bring the average closer to 15–20 words.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
