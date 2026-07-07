"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Download, Type } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_INPUT_BYTES,
  INPUT_TOO_LARGE_MSG,
  byteLength,
  downloadText,
  toUpperCase,
  toLowerCase,
  toTitleCase,
  toSentenceCase,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
  toKebabCase,
  toConstantCase,
} from "./_text-helpers";

type CaseKey =
  | "upper"
  | "lower"
  | "title"
  | "sentence"
  | "camel"
  | "pascal"
  | "snake"
  | "kebab"
  | "constant";

interface CaseOption {
  key: CaseKey;
  label: string;
  sample: string;
  fn: (text: string) => string;
}

const SAMPLE_INPUT = "Dueneo has 100 browser-only tools and 15 classic games.";

const OPTIONS: CaseOption[] = [
  { key: "upper", label: "UPPERCASE", sample: "DUENEO HAS 100 BROWSER-ONLY TOOLS.", fn: toUpperCase },
  { key: "lower", label: "lowercase", sample: "dueneo has 100 browser-only tools.", fn: toLowerCase },
  { key: "title", label: "Title Case", sample: "Dueneo Has 100 Browser-Only Tools.", fn: toTitleCase },
  { key: "sentence", label: "Sentence case", sample: "Dueneo has 100 browser-only tools.", fn: toSentenceCase },
  { key: "camel", label: "camelCase", sample: "dueneoHas100BrowserOnlyTools", fn: toCamelCase },
  { key: "pascal", label: "PascalCase", sample: "DueneoHas100BrowserOnlyTools", fn: toPascalCase },
  { key: "snake", label: "snake_case", sample: "dueneo_has_100_browser_only_tools", fn: toSnakeCase },
  { key: "kebab", label: "kebab-case", sample: "dueneo-has-100-browser-only-tools", fn: toKebabCase },
  { key: "constant", label: "CONSTANT_CASE", sample: "DUENEO_HAS_100_BROWSER_ONLY_TOOLS", fn: toConstantCase },
];

export function CaseConverter({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [lastMode, setLastMode] = React.useState<CaseKey | null>(null);

  const tooLarge = byteLength(input) > MAX_INPUT_BYTES;

  const apply = React.useCallback(
    (opt: CaseOption) => {
      if (!input) {
        setOutput("");
        setLastMode(null);
        toast.message("Type some text first.");
        return;
      }
      if (tooLarge) {
        toast.error(INPUT_TOO_LARGE_MSG);
        return;
      }
      setOutput(opt.fn(input));
      setLastMode(opt.key);
      toast.success(`Converted to ${opt.label}.`);
    },
    [input, tooLarge]
  );

  const reset = () => {
    setInput("");
    setOutput("");
    setLastMode(null);
  };

  const loadSample = () => {
    setInput(SAMPLE_INPUT);
    setOutput("");
    setLastMode(null);
  };

  const content: ToolContent = {
    intro:
      "Convert text between nine case styles in one click — UPPERCASE, lowercase, Title Case, Sentence case, camelCase, PascalCase, snake_case, kebab-case and CONSTANT_CASE. Useful for renaming code identifiers, formatting headings and tidying copy.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cv-input">Input</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="cv-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or paste text here…"
              className="min-h-[200px]"
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
              <Label htmlFor="cv-output">Output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("converted.txt", output);
                    toast.success("Downloaded converted.txt");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="cv-output"
              value={output}
              readOnly
              placeholder="Pick a case style below to convert your text."
              className="min-h-[200px] font-mono text-sm"
              aria-label="Output text"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Type className="h-4 w-4" /> Case styles
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => apply(opt)}
                className={`flex flex-col items-start rounded-lg border bg-background px-3 py-2 text-left text-sm transition hover:border-primary hover:bg-primary/5 ${
                  lastMode === opt.key ? "border-primary ring-1 ring-primary/30" : ""
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="mt-0.5 font-mono text-[11px] text-muted-foreground line-clamp-1">
                  {opt.sample}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        {output && (
          <p className="text-xs text-muted-foreground">
            {output.length} characters · applied:{" "}
            <span className="font-medium">{OPTIONS.find((o) => o.key === lastMode)?.label}</span>
          </p>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste your text",
        description:
          "Drop identifiers, headings or any text into the input box.",
      },
      {
        title: "Pick a case style",
        description:
          "Click any of the nine buttons. The output updates immediately and shows the same style applied to a sample.",
      },
      {
        title: "Copy or save",
        description:
          "Use Copy to put the result on your clipboard, or Save to download converted.txt.",
      },
      {
        title: "Try another style",
        description:
          "Click another button to re-convert the same input — no need to retype.",
      },
    ],
    useCases: [
      "Rename JavaScript identifiers between camelCase and snake_case when porting code between languages.",
      "Turn a heading into CONSTANT_CASE for an environment variable name.",
      "Convert ALL CAPS text pasted from a PDF back to readable Sentence case.",
      "Generate kebab-case slugs from Title Case blog post titles.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Title Case capitalises the first letter of every word, including short words like \"a\" and \"the\".</li>
        <li>Sentence case uses a heuristic for sentence boundaries; abbreviations like \"e.g.\" may stay lower-cased.</li>
        <li>camelCase and PascalCase strip non-alphanumeric characters, which can lose information from the source text.</li>
        <li>Inputs larger than 1 MB are flagged but still processed on the main thread.</li>
      </ul>
    ),
    faq: [
      {
        q: "What is the difference between Title Case and Sentence case?",
        a: "Title Case capitalises the first letter of every word. Sentence case lower-cases everything except the first letter of each sentence.",
      },
      {
        q: "How do camelCase and PascalCase handle punctuation?",
        a: "Punctuation and spaces are treated as word separators and removed. \"hello world!\" becomes \"helloWorld\" in camelCase and \"HelloWorld\" in PascalCase.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. Conversion runs in your browser with built-in string operations. Your text never leaves the tab.",
      },
      {
        q: "Can I convert multiple files at once?",
        a: "Not yet — this tool works on a single text area. For batch conversion, paste each block in turn or use a script outside Dueneo.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
