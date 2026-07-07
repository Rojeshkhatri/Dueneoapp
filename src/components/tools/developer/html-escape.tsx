"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Wand2, ArrowRightLeft } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_INPUT_BYTES,
  INPUT_TOO_LARGE_MSG,
  byteLength,
  formatBytes,
  escapeHtml,
  unescapeHtml,
} from "./_dev-helpers";

type Direction = "escape" | "unescape";

const SAMPLE = `<a href="/search?q=dueneo&lang=en">Search "Dueneo" & enjoy</a>`;

export function HtmlEscape({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [direction, setDirection] = React.useState<Direction>("escape");
  const [escapeQuotes, setEscapeQuotes] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const run = React.useCallback(() => {
    if (!input) {
      setError("Please type or paste some text first.");
      setOutput("");
      return;
    }
    if (byteLength(input) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setOutput("");
      return;
    }
    try {
      if (direction === "escape") {
        let out = input.replace(/[&<>]/g, (ch) =>
          ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : "&gt;"
        );
        if (escapeQuotes) {
          out = out.replace(/["']/g, (ch) => (ch === '"' ? "&quot;" : "&#39;"));
        }
        setOutput(out);
      } else {
        setOutput(unescapeHtml(input));
      }
      setError(null);
      toast.success(direction === "escape" ? "Escaped HTML entities." : "Unescaped HTML entities.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
      setOutput("");
    }
  }, [input, direction, escapeQuotes]);

  const swap = () => {
    if (!output) return;
    setInput(output);
    setOutput("");
    setDirection((d) => (d === "escape" ? "unescape" : "escape"));
  };

  const reset = () => {
    setInput("");
    setOutput("");
    setError(null);
  };

  const content: ToolContent = {
    intro:
      "Escape or unescape HTML special characters in your browser. Convert <, >, &, \" and ' into their entity equivalents so text can be safely embedded inside HTML — and convert them back again. Two-way toggle, no server involved.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="he-input">Input</Label>
              <button
                type="button"
                onClick={() => setInput(SAMPLE)}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="he-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={direction === "escape" ? `<a href="/">Tom & Jerry</a>` : `&lt;a href=&quot;/&quot;&gt;Tom &amp; Jerry&lt;/a&gt;`}
              className="min-h-[220px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="he-output">Output</Label>
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={swap}
                  disabled={!output}
                  title="Use output as new input and flip direction"
                >
                  <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" /> Flip
                </Button>
                <CopyButton value={output} size="sm" />
              </div>
            </div>
            <Textarea
              id="he-output"
              value={output}
              readOnly
              placeholder="Output will appear here."
              className="min-h-[220px] font-mono text-xs"
              spellCheck={false}
              aria-label="Output"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-6 rounded-xl border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label>Direction</Label>
            <ToggleGroup
              type="single"
              value={direction}
              onValueChange={(v) => v && setDirection(v as Direction)}
              variant="outline"
            >
              <ToggleGroupItem value="escape">Escape → entities</ToggleGroupItem>
              <ToggleGroupItem value="unescape">Unescape → text</ToggleGroupItem>
            </ToggleGroup>
          </div>
          {direction === "escape" && (
            <div className="flex items-center gap-2">
              <Switch
                id="he-quotes"
                checked={escapeQuotes}
                onCheckedChange={setEscapeQuotes}
              />
              <Label htmlFor="he-quotes" className="text-sm font-normal">
                Also escape <code>"</code> and <code>'</code>
              </Label>
            </div>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={run}>
              <Wand2 className="mr-1.5 h-4 w-4" />
              {direction === "escape" ? "Escape" : "Unescape"}
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <p>{error}</p>
          </div>
        )}

        {output && (
          <p className="text-xs text-muted-foreground">
            Output size: {formatBytes(byteLength(output))} · {output.length} characters
          </p>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Pick a direction",
        description:
          "Choose Escape → entities to encode <, >, &, \" and ' as HTML entities, or Unescape → text to convert them back.",
      },
      {
        title: "Optionally toggle quote escaping",
        description:
          "When escaping, you can choose whether to also escape double and single quotes. This is useful for embedding text inside HTML attributes.",
      },
      {
        title: "Run the conversion",
        description:
          "Click Escape or Unescape. The result appears instantly in the output box.",
      },
      {
        title: "Flip and re-run",
        description:
          "Use the Flip button to push the output back into the input and switch direction — handy for round-tripping.",
      },
    ],
    useCases: [
      "Make user-supplied text safe to embed inside HTML.",
      "Prepare code samples for display inside <pre> and <code> blocks.",
      "Recover readable text from HTML-entity-encoded content.",
      "Escape characters in a string before placing it inside an HTML attribute.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The escaper covers the five characters significant in HTML (
          <code>&lt;</code>, <code>&gt;</code>, <code>&amp;</code>,{" "}
          <code>&quot;</code>, <code>&#39;</code>); it does not encode all
          Unicode.
        </li>
        <li>The unescaper handles named entities and numeric entities but does not resolve rare entity names from a DTD.</li>
        <li>Inputs larger than 1 MB are rejected to keep the tab responsive.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why do I need to escape HTML?",
        a: "If you insert user input or text containing <, >, & or quotes directly into HTML, the browser will interpret it as markup. Escaping converts those characters to entities so they are displayed literally.",
      },
      {
        q: "Should I escape single quotes too?",
        a: "Yes, when the text will be placed inside a single-quoted HTML attribute. The toggle lets you include or exclude single and double quotes from the escape set.",
      },
      {
        q: "Can this tool unescape entities like &copy;?",
        a: "It handles a fixed set of common named entities (amp, lt, gt, quot, apos, nbsp) plus numeric entities like &#169; and &#xa9;. Rare entity names are passed through unchanged.",
      },
      {
        q: "Is my input sent anywhere?",
        a: "No. Escaping and unescaping happen entirely in your browser with string replacement.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
