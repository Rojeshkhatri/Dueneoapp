"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Download, RotateCcw, Wand2, AlertTriangle } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_INPUT_BYTES,
  INPUT_TOO_LARGE_MSG,
  byteLength,
  formatBytes,
  downloadText,
  describeJsonError,
} from "./_dev-helpers";

type Indent = "2" | "4" | "tab";

const SAMPLE = `{"name":"Dueneo","tools":["json","csv","base64"],"stats":{"users":1200,"tools":100},"live":true}`;

export function JsonFormatter({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [indent, setIndent] = React.useState<Indent>("2");
  const [error, setError] = React.useState<string | null>(null);
  const [errorLine, setErrorLine] = React.useState<number | null>(null);
  const [errorColumn, setErrorColumn] = React.useState<number | null>(null);
  const [errorExcerpt, setErrorExcerpt] = React.useState<string | null>(null);

  const indentStr = React.useMemo(
    () => (indent === "tab" ? "\t" : " ".repeat(Number(indent))),
    [indent]
  );

  const format = React.useCallback(() => {
    if (!input.trim()) {
      setError("Please paste some JSON first.");
      setOutput("");
      setErrorLine(null);
      setErrorColumn(null);
      setErrorExcerpt(null);
      return;
    }
    if (byteLength(input) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setOutput("");
      setErrorLine(null);
      setErrorColumn(null);
      setErrorExcerpt(null);
      return;
    }
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indentStr));
      setError(null);
      setErrorLine(null);
      setErrorColumn(null);
      setErrorExcerpt(null);
      toast.success("JSON formatted.");
    } catch (e) {
      const info = describeJsonError(e, input);
      setError(info.message);
      setErrorLine(info.line ?? null);
      setErrorColumn(info.column ?? null);
      setErrorExcerpt(info.excerpt ?? null);
      setOutput("");
      toast.error("Invalid JSON — see the error message.");
    }
  }, [input, indentStr]);

  const reset = () => {
    setInput("");
    setOutput("");
    setError(null);
    setErrorLine(null);
    setErrorColumn(null);
    setErrorExcerpt(null);
  };

  const loadSample = () => {
    setInput(SAMPLE);
    setError(null);
    setErrorLine(null);
    setErrorColumn(null);
    setErrorExcerpt(null);
    setOutput("");
  };

  const content: ToolContent = {
    intro:
      "Beautify JSON with two or four spaces, or a tab character. Paste your JSON, pick an indent style and format it in one click. Parse errors include the line and column so you can fix typos fast.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="jf-input">Input JSON</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="jf-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='{"hello":"world","numbers":[1,2,3]}'
              className="min-h-[280px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input JSON"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="jf-output">Formatted output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" label="Copy" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("formatted.json", output, "application/json");
                    toast.success("Downloaded formatted.json");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="jf-output"
              value={output}
              readOnly
              placeholder="Formatted JSON will appear here."
              className="min-h-[280px] font-mono text-xs"
              spellCheck={false}
              aria-label="Formatted output"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label>Indent style</Label>
            <RadioGroup
              value={indent}
              onValueChange={(v) => setIndent(v as Indent)}
              className="flex flex-row gap-4"
            >
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="2" id="jf-2" /> 2 spaces
              </Label>
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="4" id="jf-4" /> 4 spaces
              </Label>
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="tab" id="jf-tab" /> Tab
              </Label>
            </RadioGroup>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={format}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Format JSON
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <div className="space-y-1">
                <p className="font-medium">Invalid JSON</p>
                <p>{error}</p>
                {errorLine !== null && (
                  <p className="text-xs">
                    Line {errorLine}{errorColumn !== null ? `, column ${errorColumn}` : ""}
                    {errorExcerpt ? `: ${errorExcerpt.trim().slice(0, 120)}` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {output && (
          <p className="text-xs text-muted-foreground">
            Output size: {formatBytes(byteLength(output))} ·{" "}
            {output.split("\n").length} lines
          </p>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste your JSON",
        description:
          "Drop raw JSON into the left-hand editor. The textarea preserves whitespace and never autosaves — your input stays in your browser tab.",
      },
      {
        title: "Pick an indent style",
        description:
          "Choose 2 spaces (the most common convention), 4 spaces for readability, or a tab character for compact editors.",
      },
      {
        title: "Format and review",
        description:
          "Click Format JSON. The pretty-printed result appears on the right; if your input is invalid you get the exact line and a snippet so you can fix it.",
      },
      {
        title: "Copy or download",
        description:
          "Use Copy to put the result on your clipboard, or Save to download it as formatted.json.",
      },
    ],
    useCases: [
      "Make a minified API response readable before debugging.",
      "Standardise indentation across a team before committing a config file.",
      "Validate that hand-written JSON has balanced braces and quotes.",
      "Prepare a JSON payload for a code review or documentation snippet.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Inputs larger than 1 MB are rejected to keep the tab responsive.</li>
        <li>Trailing commas are not valid JSON and will be flagged as errors.</li>
        <li>
          JSON with circular references cannot be serialised — this tool follows
          the standard <code>JSON.stringify</code> behaviour.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Is my JSON sent to a server?",
        a: "No. The string stays in your browser. Parsing and formatting happen with the built-in JSON object, and nothing is transmitted.",
      },
      {
        q: "Why does my JSON show an error about a token?",
        a: "Most often it is a missing comma, a trailing comma, or single quotes instead of double quotes. The error message reports the line and a short excerpt to help you locate it.",
      },
      {
        q: "Can I minify JSON here too?",
        a: "This tool beautifies. Use the related JSON Minifier to remove all whitespace and shrink the file size.",
      },
      {
        q: "Which indent style should I use?",
        a: "Two spaces is the most popular convention for JSON in modern projects. Use tabs if your team's editor config prefers them.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
