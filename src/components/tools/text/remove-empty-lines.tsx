"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Wand2, Download, Eraser } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, byteLength, downloadText } from "./_text-helpers";

const SAMPLE = `First line.

Second line.

Third line.

Fourth line.`;

export function RemoveEmptyLines({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [stripWhitespaceOnly, setStripWhitespaceOnly] = React.useState(true);

  const tooLarge = byteLength(input) > MAX_INPUT_BYTES;

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
    const lines = input.replace(/\r\n/g, "\n").split("\n");
    const result = lines.filter((line) =>
      stripWhitespaceOnly ? line.trim().length > 0 : line.length > 0
    );
    setOutput(result.join("\n"));
    const removed = lines.length - result.length;
    toast.success(`Removed ${removed} blank line${removed === 1 ? "" : "s"}.`);
  }, [input, tooLarge, stripWhitespaceOnly]);

  const reset = () => {
    setInput("");
    setOutput("");
  };

  const loadSample = () => {
    setInput(SAMPLE);
    setOutput("");
  };

  const beforeLines = input === "" ? 0 : input.replace(/\r\n/g, "\n").split("\n").length;
  const afterLines = output === "" ? 0 : output.split("\n").length;

  const content: ToolContent = {
    intro:
      "Strip blank lines from text instantly. Toggle whether to also remove lines that contain only spaces and tabs — useful for cleaning up copied code, log files and copy that picked up stray whitespace from a PDF.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="re-input">Input</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="re-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste text with blank lines here…"
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
              <Label htmlFor="re-output">Output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("no-blank-lines.txt", output);
                    toast.success("Downloaded no-blank-lines.txt");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="re-output"
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
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="re-ws"
                checked={stripWhitespaceOnly}
                onCheckedChange={setStripWhitespaceOnly}
                aria-label="Also strip whitespace-only lines"
              />
              <Label htmlFor="re-ws" className="text-sm font-normal">
                Also strip lines that are only whitespace
              </Label>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
              <Button onClick={run}>
                <Wand2 className="mr-1.5 h-4 w-4" /> Remove empty lines
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Eraser className="h-4 w-4" /> Before
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{beforeLines}</div>
            <div className="text-[10px] text-muted-foreground">lines</div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Eraser className="h-4 w-4" /> After
            </div>
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
          "Drop a block of text with blank lines scattered through it.",
      },
      {
        title: "Pick the strictness",
        description:
          "Turn on Also strip lines that are only whitespace to remove lines that contain only spaces and tabs. Turn it off to keep those and remove only truly empty lines.",
      },
      {
        title: "Remove empty lines",
        description:
          "Click the button. The before/after counters show how many lines were stripped.",
      },
      {
        title: "Copy or save",
        description:
          "Use Copy to put the result on your clipboard, or Save to download no-blank-lines.txt.",
      },
    ],
    useCases: [
      "Tidy code copied from a web page that picked up stray blank lines.",
      "Compress a log file by removing blank lines between entries.",
      "Prepare CSV data for import by stripping blank rows that break parsers.",
      "Clean a transcript exported from a subtitle tool before reformatting.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Paragraph breaks (one blank line between paragraphs) are removed too. To preserve paragraph structure, run the tool on each paragraph separately.</li>
        <li>Trailing whitespace inside a non-blank line is not removed — use Remove Extra Spaces for that.</li>
        <li>Inputs larger than 1 MB are flagged but still processed on the main thread.</li>
      </ul>
    ),
    faq: [
      {
        q: "What counts as an empty line?",
        a: "A truly empty line is one with no characters at all. With the Also strip whitespace-only toggle on, lines that contain only spaces, tabs or other whitespace are also removed.",
      },
      {
        q: "Are paragraph breaks preserved?",
        a: "No. Every blank line is removed. If you want to keep paragraph breaks, separate your paragraphs with a single space instead of a blank line before running the tool, or run it on each paragraph individually.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. Stripping runs in your browser with built-in string operations. Your text never leaves the tab.",
      },
      {
        q: "Does it normalise line endings?",
        a: "Yes — CRLF (\\r\\n) is normalised to LF (\\n) in the output for consistency across platforms.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
