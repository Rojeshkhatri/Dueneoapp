"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Wand2, Download, Sparkles } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { downloadText, generateLorem, type LoremKind } from "./_text-helpers";

interface KindOption {
  key: LoremKind;
  label: string;
  help: string;
}

const OPTIONS: KindOption[] = [
  { key: "paragraphs", label: "Paragraphs", help: "3–6 sentences each, separated by a blank line" },
  { key: "sentences", label: "Sentences", help: "Individual sentences joined with a space" },
  { key: "words", label: "Words", help: "A run of N lorem-ipsum words" },
];

export function LoremIpsumGenerator({ tool }: { tool: ToolDefinition }) {
  const [kind, setKind] = React.useState<LoremKind>("paragraphs");
  const [count, setCount] = React.useState(5);
  const [output, setOutput] = React.useState("");
  const [seed, setSeed] = React.useState<number>(Date.now() & 0xffffffff);

  const generate = React.useCallback(() => {
    const text = generateLorem(kind, count, seed);
    setOutput(text);
    if (text) {
      toast.success(`Generated ${count} ${kind}.`);
    } else {
      toast.message("Set a count above 0 to generate text.");
    }
  }, [kind, count, seed]);

  const regenerate = () => {
    setSeed(Date.now() & 0xffffffff);
    const text = generateLorem(kind, count, Date.now() & 0xffffffff);
    setOutput(text);
    toast.success("Generated fresh text.");
  };

  const reset = () => {
    setOutput("");
    setCount(5);
    setKind("paragraphs");
  };

  // Auto-generate on first mount so the output isn't empty.
  React.useEffect(() => {
    setOutput(generateLorem("paragraphs", 5, seed));
    // Intentionally only run once on mount — regeneration is user-driven.
  }, []);

  const words = output ? output.trim().split(/\s+/).length : 0;

  const content: ToolContent = {
    intro:
      "Generate placeholder Lorem Ipsum text for mockups, prototypes, design reviews and print layout tests. Choose paragraphs, sentences or words, pick a count up to 1000, and copy the result with one click.",
    tool: (
      <div className="space-y-5">
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Output type</Label>
              <RadioGroup
                value={kind}
                onValueChange={(v) => setKind(v as LoremKind)}
                className="grid gap-2"
              >
                {OPTIONS.map((opt) => (
                  <Label
                    key={opt.key}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition hover:border-primary hover:bg-primary/5 ${
                      kind === opt.key ? "border-primary ring-1 ring-primary/30" : ""
                    }`}
                  >
                    <RadioGroupItem value={opt.key} id={`li-${opt.key}`} className="mt-0.5" />
                    <span className="flex flex-col">
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-[11px] text-muted-foreground">{opt.help}</span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="li-count">Count (1–1000)</Label>
                <Input
                  id="li-count"
                  type="number"
                  min={1}
                  max={1000}
                  value={count}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) setCount(Math.max(1, Math.min(1000, Math.trunc(n))));
                  }}
                  className="w-32"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={generate}>
                  <Wand2 className="mr-1.5 h-4 w-4" /> Generate
                </Button>
                <Button variant="outline" onClick={regenerate}>
                  <Sparkles className="mr-1.5 h-4 w-4" /> New variation
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Generate uses the current seed so the same count produces the same text. New variation reseeds for a different sample.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="li-output">Generated text</Label>
            <div className="flex gap-1.5">
              <CopyButton value={output} size="sm" />
              <Button
                variant="outline"
                size="sm"
                disabled={!output}
                onClick={() => {
                  downloadText("lorem-ipsum.txt", output);
                  toast.success("Downloaded lorem-ipsum.txt");
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Save
              </Button>
            </div>
          </div>
          <Textarea
            id="li-output"
            value={output}
            readOnly
            placeholder="Generated Lorem Ipsum will appear here."
            className="min-h-[260px]"
            aria-label="Generated Lorem Ipsum text"
          />
          {output && (
            <p className="text-xs text-muted-foreground">
              {words} words · {output.length} characters
            </p>
          )}
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
        title: "Pick an output type",
        description:
          "Choose paragraphs (3–6 sentences each, separated by a blank line), sentences (joined with a space) or words (a single run).",
      },
      {
        title: "Set the count",
        description:
          "Enter how many paragraphs, sentences or words you want — between 1 and 1000.",
      },
      {
        title: "Generate",
        description:
          "Click Generate to produce text. Click New variation for a fresh sample with the same settings.",
      },
      {
        title: "Copy or save",
        description:
          "Use Copy to put the text on your clipboard, or Save to download lorem-ipsum.txt.",
      },
    ],
    useCases: [
      "Fill empty states in design mockups with realistic-looking content.",
      "Test how a CMS rich-text editor renders long-form paragraphs.",
      "Populate a print layout to check pagination before final copy arrives.",
      "Generate filler for a presentation template so reviewers focus on layout, not words.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The word bank is a fixed set of ~80 classic Lorem Ipsum words; outputs eventually repeat combinations.</li>
        <li>Sentences are 6–16 words long with a capitalised first letter and trailing period — they are not grammatically meaningful.</li>
        <li>The maximum count is 1000 to keep the page responsive; for larger fills, run the tool several times.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is the generated text always the same?",
        a: "Generate uses a stored seed, so the same count and type produce the same text across clicks. Click New variation to reseed for a different sample.",
      },
      {
        q: "Is Lorem Ipsum real Latin?",
        a: "It is scrambled Latin from Cicero's De finibus bonorum et malorum, but the words are randomly rearranged so the output is not coherent Latin. It is the traditional printing and typesetting placeholder.",
      },
      {
        q: "Can I generate more than 1000 words?",
        a: "The count is capped at 1000 to keep the page snappy. Run the tool several times and concatenate the outputs if you need more.",
      },
      {
        q: "Is anything uploaded anywhere?",
        a: "No. Generation runs entirely in your browser from a built-in word bank. No network call is made.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
