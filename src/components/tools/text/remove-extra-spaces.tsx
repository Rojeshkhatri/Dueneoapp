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

const SAMPLE =
  "Dueneo    runs    entirely    in    your   browser.   \n" +
  "   No uploads,   no signups,   no tracking.  \n" +
  "  Just   open   the   page   and   go.   ";

export function RemoveExtraSpaces({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [collapse, setCollapse] = React.useState(true);
  const [trimEdges, setTrimEdges] = React.useState(true);
  const [removeAll, setRemoveAll] = React.useState(false);

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
    let result = input;
    if (removeAll) {
      // Remove every whitespace character.
      result = result.replace(/\s+/g, "");
    } else {
      if (collapse) {
        // Collapse runs of whitespace to a single space, but preserve newlines.
        result = result.replace(/[^\S\r\n]+/g, " ");
      }
      if (trimEdges) {
        // Trim each line's leading and trailing whitespace.
        result = result
          .split(/\r?\n/)
          .map((line) => line.replace(/^\s+|\s+$/g, ""))
          .join("\n");
        // Trim the overall string as well.
        result = result.replace(/^\s+|\s+$/g, "");
      }
    }
    setOutput(result);
    toast.success("Cleaned whitespace.");
  }, [input, tooLarge, collapse, trimEdges, removeAll]);

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
      "Collapse multiple spaces and tabs down to a single space, trim leading and trailing whitespace from each line, or strip every whitespace character outright. Toggle each behaviour to match what your text needs.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rs-input">Input</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="rs-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste text with extra spaces, tabs or trailing whitespace…"
              className="min-h-[220px] font-mono text-sm"
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
              <Label htmlFor="rs-output">Output</Label>
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
              id="rs-output"
              value={output}
              readOnly
              placeholder="Cleaned text will appear here."
              className="min-h-[220px] font-mono text-sm"
              spellCheck={false}
              aria-label="Cleaned output"
            />
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="rs-collapse"
                checked={collapse}
                onCheckedChange={setCollapse}
                disabled={removeAll}
                aria-label="Collapse multiple spaces"
              />
              <Label htmlFor="rs-collapse" className="text-sm font-normal">
                Collapse runs of spaces/tabs to one space
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="rs-trim"
                checked={trimEdges}
                onCheckedChange={setTrimEdges}
                disabled={removeAll}
                aria-label="Trim line edges"
              />
              <Label htmlFor="rs-trim" className="text-sm font-normal">
                Trim each line's edges
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="rs-all"
                checked={removeAll}
                onCheckedChange={setRemoveAll}
                aria-label="Remove all whitespace"
              />
              <Label htmlFor="rs-all" className="text-sm font-normal">
                Remove all whitespace
              </Label>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
              <Button onClick={run}>
                <Wand2 className="mr-1.5 h-4 w-4" /> Clean spaces
              </Button>
            </div>
          </div>
          {removeAll && (
            <p className="mt-3 text-xs text-muted-foreground">
              Remove all whitespace is on — newlines, spaces and tabs will all be stripped, ignoring the other toggles.
            </p>
          )}
        </div>

        {output && (
          <p className="text-xs text-muted-foreground">
            <Eraser className="mr-1 inline h-3.5 w-3.5" />
            Output: {output.length} characters · {output === "" ? 0 : output.split(/\r?\n/).length} lines
          </p>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste your text",
        description:
          "Drop text with double spaces, tab indentation, or trailing whitespace.",
      },
      {
        title: "Pick the toggles",
        description:
          "Collapse runs of whitespace to a single space, trim each line's edges, or go nuclear and remove every whitespace character.",
      },
      {
        title: "Clean",
        description:
          "Click Clean spaces. The result appears in the output box and stays until you clean again or reset.",
      },
      {
        title: "Copy or save",
        description:
          "Use Copy to put the result on your clipboard, or Save to download cleaned.txt.",
      },
    ],
    useCases: [
      "Tidy text pasted from a PDF that introduced double spaces between every word.",
      "Strip trailing whitespace from code before committing.",
      "Prepare a slug-like compact string by removing all whitespace.",
      "Normalise space-separated tokens in a CSV before import.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Collapse preserves newlines so paragraph breaks survive — only horizontal whitespace is collapsed.</li>
        <li>Trim each line's edges removes leading and trailing whitespace on every line, including tab indentation.</li>
        <li>Remove all whitespace ignores the other toggles and strips every space, tab and newline.</li>
        <li>Inputs larger than 1 MB are flagged but still processed on the main thread.</li>
      </ul>
    ),
    faq: [
      {
        q: "Will collapse preserve my line breaks?",
        a: "Yes. Collapse only affects runs of horizontal whitespace (spaces and tabs). Newlines are preserved so paragraph structure stays intact.",
      },
      {
        q: "What does Remove all whitespace do?",
        a: "It strips every space, tab and newline from the input. This is useful for making a compact token (for example, a phone number) but destroys readability, so it overrides the other toggles.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. Cleaning runs in your browser with built-in regular expressions. Your text never leaves the tab.",
      },
      {
        q: "Does it remove blank lines too?",
        a: "Not on its own — that is the job of the Remove Empty Lines tool. Use Text Cleaner to combine both operations in one click.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
