"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  Download,
  RotateCcw,
  Wand2,
  FileText,
  Eraser,
  Type,
  Pilcrow,
  Mic,
  Clock,
  Hash,
  CheckCircle2,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  removeFillerWords,
  capitaliseSentences,
  addParagraphBreaks,
  removeSpeakerLabels,
  removeTimestamps,
  countWords,
  byteLength,
  downloadText,
  SectionLabel,
  StatCard,
} from "./_content-helpers";

const SAMPLE = `um, so today I want to talk about, like, why most landing pages basically don't convert. you know, the, uh, the issue is that, you know, people kind of think that, like, more sections equals more conversions, but, I mean, that's actually not true.

[00:12] Speaker 1: so, like, the first thing you want to do is, like, remove the clutter, you know? um, just look at the page and, uh, ask yourself, like, does this section actually help the user decide? if not, like, kill it.

[01:45] Speaker 2: right, and, I mean, the second thing is, basically, the hero section. like, it has to have, you know, one promise, one CTA. not, like, five different things fighting for attention.

Speaker 1: exactly. and, uh, the third thing is, like, your social proof. you know, don't just, like, throw logos at people. like, actually tell them, you know, what the result was.`;

interface Options {
  removeFillers: boolean;
  fixCapitalisation: boolean;
  addParagraphs: boolean;
  paragraphEvery: number;
  removeSpeakers: boolean;
  removeTimestampsFlag: boolean;
}

export function TranscriptCleaner({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState<string>(SAMPLE);
  const [opts, setOpts] = React.useState<Options>({
    removeFillers: true,
    fixCapitalisation: true,
    addParagraphs: true,
    paragraphEvery: 3,
    removeSpeakers: true,
    removeTimestampsFlag: true,
  });

  const result = React.useMemo(() => {
    let text = input;
    let fillersRemoved = 0;
    let speakersRemoved = 0;
    let timestampsRemoved = 0;
    let paragraphsAdded = 0;

    if (opts.removeTimestampsFlag) {
      const before = text.length;
      text = removeTimestamps(text);
      timestampsRemoved = before - text.length;
    }

    if (opts.removeSpeakers) {
      const before = text.length;
      text = removeSpeakerLabels(text);
      speakersRemoved = before - text.length;
    }

    if (opts.removeFillers) {
      const r = removeFillerWords(text);
      text = r.cleaned;
      fillersRemoved = r.removed;
    }

    if (opts.fixCapitalisation) {
      text = capitaliseSentences(text);
    }

    if (opts.addParagraphs) {
      const before = text.split(/\n\s*\n/).length;
      text = addParagraphBreaks(text, opts.paragraphEvery);
      const after = text.split(/\n\s*\n/).length;
      paragraphsAdded = Math.max(0, after - before);
    }

    // Final tidy: collapse 3+ newlines, strip leading/trailing whitespace.
    text = text.replace(/\n{3,}/g, "\n\n").trim();

    return {
      text,
      fillersRemoved,
      speakersRemoved,
      timestampsRemoved,
      paragraphsAdded,
    };
  }, [input, opts]);

  const stats = React.useMemo(() => {
    const inWords = countWords(input);
    const outWords = countWords(result.text);
    return {
      inWords,
      outWords,
      wordsRemoved: Math.max(0, inWords - outWords),
      inChars: input.length,
      outChars: result.text.length,
      inBytes: byteLength(input),
      outBytes: byteLength(result.text),
    };
  }, [input, result]);

  const setOpt = <K extends keyof Options>(k: K, v: Options[K]) =>
    setOpts((o) => ({ ...o, [k]: v }));

  const reset = () => {
    setInput(SAMPLE);
    setOpts({
      removeFillers: true,
      fixCapitalisation: true,
      addParagraphs: true,
      paragraphEvery: 3,
      removeSpeakers: true,
      removeTimestampsFlag: true,
    });
    toast.info("Reset to sample.");
  };

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Input + options */}
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Transcript</SectionLabel>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tc-input">Paste auto-generated transcript</Label>
            <Textarea
              id="tc-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your transcript here..."
              className="min-h-[260px] font-mono text-xs"
              spellCheck={false}
              aria-label="Transcript input"
            />
            <p className="text-xs text-muted-foreground">
              {stats.inWords} words · {stats.inChars} chars · {stats.inBytes} B
            </p>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <SectionLabel>Cleanup options</SectionLabel>

            <ToggleRow
              icon={<Eraser className="h-4 w-4 text-primary" />}
              label="Remove filler words"
              description="um, uh, like, you know, I mean, basically, literally…"
              checked={opts.removeFillers}
              onChange={(v) => setOpt("removeFillers", v)}
            />
            <ToggleRow
              icon={<Type className="h-4 w-4 text-primary" />}
              label="Fix capitalization"
              description="Capitalise the first letter of every sentence."
              checked={opts.fixCapitalisation}
              onChange={(v) => setOpt("fixCapitalisation", v)}
            />
            <ToggleRow
              icon={<Pilcrow className="h-4 w-4 text-primary" />}
              label="Add paragraph breaks"
              description="Insert a blank line every N sentences."
              checked={opts.addParagraphs}
              onChange={(v) => setOpt("addParagraphs", v)}
            />
            {opts.addParagraphs && (
              <div className="pl-8">
                <div className="flex items-center justify-between text-xs">
                  <Label htmlFor="tc-paragraphs" className="text-muted-foreground">
                    Sentences per paragraph
                  </Label>
                  <span className="font-mono font-medium">
                    {opts.paragraphEvery}
                  </span>
                </div>
                <Slider
                  id="tc-paragraphs"
                  value={[opts.paragraphEvery]}
                  onValueChange={(v) => setOpt("paragraphEvery", v[0] ?? 3)}
                  min={1}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>
            )}
            <ToggleRow
              icon={<Mic className="h-4 w-4 text-primary" />}
              label="Remove speaker labels"
              description="Strip 'Speaker 1:', 'John:', '[Host]:' etc."
              checked={opts.removeSpeakers}
              onChange={(v) => setOpt("removeSpeakers", v)}
            />
            <ToggleRow
              icon={<Clock className="h-4 w-4 text-primary" />}
              label="Remove timestamps"
              description="Strip [00:12], (01:23), and bare 12:34 markers."
              checked={opts.removeTimestampsFlag}
              onChange={(v) => setOpt("removeTimestampsFlag", v)}
            />
          </div>
        </div>

        {/* Output */}
        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>
              <span className="inline-flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5" /> Cleaned transcript
              </span>
            </SectionLabel>
            <div className="flex gap-1">
              <CopyButton value={result.text} size="sm" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  downloadText("transcript-cleaned.txt", result.text);
                  toast.success("Downloaded transcript-cleaned.txt");
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Save
              </Button>
            </div>
          </div>

          {result.text ? (
            <pre className="min-h-[260px] max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md border bg-background p-4 text-sm leading-relaxed">
              {result.text}
            </pre>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Paste a transcript on the left to see the cleaned version here.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatCard
              label="Fillers removed"
              value={result.fillersRemoved}
              icon={<Eraser className="h-3.5 w-3.5 text-primary" />}
              tone="primary"
            />
            <StatCard
              label="Words removed"
              value={stats.wordsRemoved}
              icon={<Hash className="h-3.5 w-3.5 text-primary" />}
              tone="amber"
            />
            <StatCard
              label="Paragraphs added"
              value={result.paragraphsAdded}
              icon={<Pilcrow className="h-3.5 w-3.5 text-primary" />}
              tone="sky"
            />
            <StatCard
              label="Speaker bytes stripped"
              value={result.speakersRemoved}
              icon={<Mic className="h-3.5 w-3.5 text-primary" />}
            />
            <StatCard
              label="Timestamp bytes stripped"
              value={result.timestampsRemoved}
              icon={<Clock className="h-3.5 w-3.5 text-primary" />}
            />
            <StatCard
              label="Final word count"
              value={stats.outWords}
              icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
              tone="emerald"
              hint={`From ${stats.inWords}`}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Output: {stats.outChars} chars · {stats.outBytes} B ·{" "}
            {stats.outWords > 0 && stats.inWords > 0
              ? Math.round(
                  ((stats.inWords - stats.outWords) / stats.inWords) * 100,
                )
              : 0}
            % shorter than the original
          </p>
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Paste an auto-generated transcript and clean it up in one click. Remove filler words (um, uh, like, you know), fix sentence capitalization, add paragraph breaks every N sentences, and strip speaker labels and timestamps. See exactly how much was removed before you copy or download the cleaned text.",
    tool: toolBody,
    howTo: [
      {
        title: "Paste your transcript",
        description:
          "Drop in raw text from YouTube, Otter.ai, Descript or any auto-transcription service. Speaker labels, timestamps and filler words are all fine.",
      },
      {
        title: "Toggle cleanup options",
        description:
          "Pick which transformations to apply — filler removal, capitalization, paragraph breaks, speaker label removal, and timestamp removal. All are on by default.",
      },
      {
        title: "Adjust paragraph length",
        description:
          "When paragraph breaks are on, use the slider to choose how many sentences go in each paragraph (1–10). 3 is a good default for readability.",
      },
      {
        title: "Review the stats and copy",
        description:
          "See how many fillers, words, and bytes were removed. Copy the cleaned transcript or save it as a .txt file.",
      },
    ],
    useCases: [
      "Turn a raw podcast transcript into a clean blog post draft.",
      "Prepare a YouTube auto-transcript for use as an article.",
      "Strip filler words before feeding a transcript to an LLM for summarising.",
      "Clean up speaker-labelled interview transcripts for publication.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Filler-word removal is based on a fixed list of ~20 English phrases.
          It may miss uncommon fillers (e.g. &quot;right&quot; as a filler) and
          could over-strip the word &quot;like&quot; in legitimate uses.
        </li>
        <li>
          Capitalization is sentence-based — it capitalises the first letter
          after a period, exclamation or question mark. It does not fix proper
          nouns or correct ALL-CAPS shouting.
        </li>
        <li>
          Speaker-label removal uses a regex that matches common patterns like
          &quot;Name:&quot;, &quot;[Name]:&quot; or &quot;&gt;&gt; Name:&quot;
          at the start of a line. Unusual formats may slip through.
        </li>
        <li>
          Timestamp removal strips bracketed timestamps and bare{" "}
          <code>MM:SS</code> tokens. It does not touch ISO-format dates or
          durations inside running prose.
        </li>
        <li>
          No punctuation is added — the tool only cleans existing text. For
          auto-punctuation, use an LLM-powered transcription service.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Which filler words are removed?",
        a: "The default list includes um, uh, er, ah, like, you know, I mean, basically, literally, actually, sort of, kind of, kinda, sorta, and a few discourse markers (okay so, so yeah). Phrases like 'you know' are matched as a unit so they're removed cleanly.",
      },
      {
        q: "Will it remove 'like' when I'm using it correctly?",
        a: "Possibly. The tool matches 'like' as a whole word regardless of context, so 'I like pizza' would lose the word 'like'. If that's a problem, disable filler removal and edit by hand, or pre-edit your transcript to replace legitimate 'like' with a synonym.",
      },
      {
        q: "How are paragraphs created?",
        a: "We split the cleaned text into sentences (naive split on .!?) and group every N sentences into a paragraph, separated by a blank line. Set N=1 for one sentence per line, N=5 for longer paragraphs.",
      },
      {
        q: "Can I clean multiple speakers' lines separately?",
        a: "Not in this tool — speaker labels are stripped by design so the output reads as a single narrator. For per-speaker cleanup, keep speaker labels off and process each speaker's text in a separate pass.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md border bg-background">
        {icon}
      </div>
      <div className="flex-1">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
