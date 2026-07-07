"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, BookOpen, Mic, Clock, FileText } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_INPUT_BYTES,
  INPUT_TOO_LARGE_MSG,
  byteLength,
  formatInt,
  formatDuration,
  countWords,
} from "./_text-helpers";

const SAMPLE =
  "Reading and speaking speeds differ. Silent readers typically scan 200–300 words per minute, " +
  "while a clear presenter speaks at around 130 words per minute. Paste your script below to " +
  "estimate how long it takes to read silently and to deliver out loud.";

interface TimeBlock {
  label: string;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  wpm: number;
  icon: React.ReactNode;
}

function buildTimeBlock(words: number, wpm: number, label: string, icon: React.ReactNode): TimeBlock {
  const totalSeconds = wpm > 0 ? (words / wpm) * 60 : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds - minutes * 60);
  return { label, minutes, seconds, totalSeconds, wpm, icon };
}

export function ReadingTimeCalculator({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [readingWpm, setReadingWpm] = React.useState(200);
  const [speakingWpm, setSpeakingWpm] = React.useState(130);

  const words = React.useMemo(() => countWords(input), [input]);
  const tooLarge = byteLength(input) > MAX_INPUT_BYTES;

  const reading = React.useMemo(
    () => buildTimeBlock(words, readingWpm, "Reading time", <BookOpen className="h-4 w-4" />),
    [words, readingWpm]
  );
  const speaking = React.useMemo(
    () => buildTimeBlock(words, speakingWpm, "Speaking time", <Mic className="h-4 w-4" />),
    [words, speakingWpm]
  );

  const reset = () => {
    setInput("");
    setReadingWpm(200);
    setSpeakingWpm(130);
    toast.message("Cleared.");
  };
  const loadSample = () => setInput(SAMPLE);

  const summary =
    `Words: ${words}\n` +
    `Reading time @ ${readingWpm} wpm: ${formatDuration(reading.totalSeconds)}\n` +
    `Speaking time @ ${speakingWpm} wpm: ${formatDuration(speaking.totalSeconds)}`;

  const blocks = [reading, speaking];

  const content: ToolContent = {
    intro:
      "Estimate how long it takes to read a passage silently and to deliver it as a speech. Adjust the reading and speaking speeds to match your audience — defaults are 200 wpm for reading and 130 wpm for clear presenting.",
    tool: (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="rt-input">Your text</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
              <CopyButton value={summary} size="sm" label="Copy summary" />
            </div>
          </div>
          <Textarea
            id="rt-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your article, script or speech here…"
            className="min-h-[200px]"
            aria-label="Text to time"
          />
          {tooLarge && (
            <p className="text-xs text-destructive" role="status">
              {INPUT_TOO_LARGE_MSG}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <Label htmlFor="rt-read" className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" /> Reading speed
              </Label>
              <span className="tabular-nums font-medium">{readingWpm} wpm</span>
            </div>
            <Slider
              id="rt-read"
              value={[readingWpm]}
              min={50}
              max={500}
              step={5}
              onValueChange={(v) => setReadingWpm(v[0] ?? 200)}
              className="mt-3"
              aria-label="Reading speed slider"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Average adult silent reader: ~250 wpm. Skim reader: ~400 wpm.
            </p>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <Label htmlFor="rt-speak" className="flex items-center gap-1.5">
                <Mic className="h-4 w-4" /> Speaking speed
              </Label>
              <span className="tabular-nums font-medium">{speakingWpm} wpm</span>
            </div>
            <Slider
              id="rt-speak"
              value={[speakingWpm]}
              min={50}
              max={300}
              step={5}
              onValueChange={(v) => setSpeakingWpm(v[0] ?? 130)}
              className="mt-3"
              aria-label="Speaking speed slider"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Clear presenter: ~130 wpm. Fast talker: ~180 wpm. Audiobook: ~150 wpm.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-4 w-4" /> Words
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{formatInt(words)}</div>
          </div>
          {blocks.map((b) => (
            <div key={b.label} className="rounded-xl border p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {b.icon} {b.label} @ {b.wpm} wpm
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums">
                  {b.minutes > 0 ? `${b.minutes}m` : "0m"}
                </span>
                <span className="text-2xl font-semibold tabular-nums">{b.seconds}s</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDuration(b.totalSeconds)} total
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
        title: "Paste your text",
        description:
          "Drop an article, speech, script or any passage into the box. The word count updates instantly.",
      },
      {
        title: "Tune the speeds",
        description:
          "Adjust the reading-speed and speaking-speed sliders to match your audience. Defaults are 200 wpm reading and 130 wpm speaking.",
      },
      {
        title: "Read off the times",
        description:
          "Reading time and speaking time appear in minutes and seconds, with a total-seconds line for easy comparison.",
      },
      {
        title: "Copy the summary",
        description:
          "Click Copy summary to put a plain-text summary of the word count and both times onto your clipboard.",
      },
    ],
    useCases: [
      "Estimate the runtime of a podcast or YouTube script before recording.",
      "Plan a 5-minute lightning talk by trimming until the speaking time fits.",
      "Decide whether a blog post is short enough for a quick commute read.",
      "Set reading-time expectations for an email newsletter.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Times assume a steady pace; pausing, emphasis and visual aids are not modelled.</li>
        <li>Word counts use whitespace splitting; ideographic scripts that do not use spaces may undercount.</li>
        <li>Inputs larger than 1 MB are flagged but still processed on the main thread.</li>
      </ul>
    ),
    faq: [
      {
        q: "What is a normal reading speed?",
        a: "An average adult silently reads prose at around 250 wpm. Skim readers reach 400 wpm or more, while dense technical material often slows readers to 150 wpm. The default of 200 wpm is intentionally conservative.",
      },
      {
        q: "What is a normal speaking speed?",
        a: "A clear presenter speaks at roughly 130 wpm. Audiobook narrators average 150 wpm. Fast talkers can hit 180 wpm, but audiences struggle to follow above that. 130 wpm is a safe default for a planned speech.",
      },
      {
        q: "Does it account for pauses or slide changes?",
        a: "No. Times are pure word-count ÷ rate. Add 10–15% to the speaking time to allow for pauses, emphasis and slide transitions.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. All calculations run in your browser with built-in string operations. Your text never leaves the tab.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
