"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

const SAMPLE = `{
  "name": "Dueneo",
  "tools": ["json", "csv", "base64"],
  "stats": { "users": 1200, "tools": 100 },
  "live": true
}`;

export function JsonMinifier({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [errorLine, setErrorLine] = React.useState<number | null>(null);

  const minify = React.useCallback(() => {
    if (!input.trim()) {
      setError("Please paste some JSON first.");
      setOutput("");
      setErrorLine(null);
      return;
    }
    if (byteLength(input) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setOutput("");
      setErrorLine(null);
      return;
    }
    try {
      const parsed = JSON.parse(input);
      // No-space minified form (compact JSON).
      setOutput(JSON.stringify(parsed));
      setError(null);
      setErrorLine(null);
      toast.success("JSON minified.");
    } catch (e) {
      const info = describeJsonError(e, input);
      setError(info.message);
      setErrorLine(info.line ?? null);
      setOutput("");
      toast.error("Invalid JSON — see the error message.");
    }
  }, [input]);

  const reset = () => {
    setInput("");
    setOutput("");
    setError(null);
    setErrorLine(null);
  };

  const beforeBytes = input ? byteLength(input) : 0;
  const afterBytes = output ? byteLength(output) : 0;
  const savings =
    beforeBytes > 0 && afterBytes > 0
      ? Math.max(0, Math.round((1 - afterBytes / beforeBytes) * 100))
      : 0;

  const content: ToolContent = {
    intro:
      "Shrink JSON by removing all whitespace, line breaks and indentation. The minified output is still valid JSON, just smaller — perfect for HTTP responses, embedded payloads and storage. See the before/after byte size at a glance.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="jm-input">Input JSON</Label>
              <button
                type="button"
                onClick={() => setInput(SAMPLE)}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="jm-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='{\n  "hello": "world"\n}'
              className="min-h-[280px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input JSON"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="jm-output">Minified output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("minified.json", output, "application/json");
                    toast.success("Downloaded minified.json");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="jm-output"
              value={output}
              readOnly
              placeholder='{"hello":"world"}'
              className="min-h-[280px] font-mono text-xs"
              spellCheck={false}
              aria-label="Minified output"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-muted/30 p-4">
          {output && (
            <div className="text-sm">
              <p className="text-muted-foreground">
                Before: <strong className="text-foreground">{formatBytes(beforeBytes)}</strong> ·{" "}
                After: <strong className="text-foreground">{formatBytes(afterBytes)}</strong> ·{" "}
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {savings}% smaller
                </span>
              </p>
            </div>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={minify}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Minify JSON
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
                  <p className="text-xs">Around line {errorLine}.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste your JSON",
        description:
          "Drop pretty-printed or minified JSON into the left-hand editor — both work because the input is parsed first.",
      },
      {
        title: "Click Minify JSON",
        description:
          "The parser runs first to ensure validity, then the value is re-serialised with no spaces between tokens.",
      },
      {
        title: "Check the byte savings",
        description:
          "Below the action button you will see the before and after byte size and the percentage saved.",
      },
      {
        title: "Copy or download",
        description:
          "Use Copy for the clipboard or Save to download minified.json to your device.",
      },
    ],
    useCases: [
      "Shrink an API response payload before shipping to production.",
      "Embed JSON inside an HTML attribute without breaking the layout.",
      "Reduce the size of cached configuration files.",
      "Prepare a JSON payload for a binary transfer or storage layer.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Minification does not rename keys or shorten values — only whitespace is removed.</li>
        <li>Inputs larger than 1 MB are rejected to keep the tab responsive.</li>
        <li>Escaped Unicode characters (e.g. <code>\u00e9</code>) are preserved as-is, not converted.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is minified JSON still valid?",
        a: "Yes. Minification only removes whitespace, which is not significant in JSON. The output parses identically to the input.",
      },
      {
        q: "Why are key names not shortened?",
        a: "Shortening keys would change the meaning of the data and break consumers. This tool only strips whitespace so the result remains a drop-in replacement.",
      },
      {
        q: "Can I minify JSON with comments?",
        a: "No. Standard JSON does not allow comments. Remove them first or use a JSON5-aware minifier.",
      },
      {
        q: "How much can I expect to save?",
        a: "For pretty-printed JSON with 2-space indent, expect 20–50% size reduction depending on the depth of nesting and the amount of whitespace.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
