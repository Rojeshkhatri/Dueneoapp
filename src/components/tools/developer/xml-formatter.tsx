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
  formatXml,
} from "./_dev-helpers";

type Indent = "2" | "4" | "tab";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?><catalog><book id="1"><title>Dueneo</title><tags><tag>tools</tag><tag>browser</tag></tags></book><book id="2"><title>JSON</title></book></catalog>`;

export function XmlFormatter({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [indent, setIndent] = React.useState<Indent>("2");
  const [error, setError] = React.useState<string | null>(null);

  const indentStr = React.useMemo(
    () => (indent === "tab" ? "\t" : " ".repeat(Number(indent))),
    [indent]
  );

  const format = React.useCallback(() => {
    if (!input.trim()) {
      setError("Please paste some XML first.");
      setOutput("");
      return;
    }
    if (byteLength(input) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setOutput("");
      return;
    }
    if (!/^\s*</.test(input)) {
      setError("The input does not start with a `<` character. Is it really XML?");
      setOutput("");
      return;
    }
    // Lightweight well-formedness check: tag balance.
    const openMatches = input.match(/<([a-zA-Z_][\w.\-]*)[^/>]*>/g) ?? [];
    const closeMatches = input.match(/<\/([a-zA-Z_][\w.\-]*)\s*>/g) ?? [];
    const openCount = openMatches.length;
    const closeCount = closeMatches.length;
    // Self-closing tags do not need a closing tag.
    const selfClose = (input.match(/<[a-zA-Z_][^>]*\/>/g) ?? []).length;
    const expectedClose = openCount - selfClose;
    if (expectedClose !== closeCount) {
      setError(
        `Tags look unbalanced — ${openCount} opening tag(s), ${closeCount} closing tag(s), ${selfClose} self-closing. The formatter will still attempt to run.`
      );
    } else {
      setError(null);
    }
    try {
      const out = formatXml(input, indentStr);
      if (!out) {
        setError("Could not parse any XML tokens. Check the input.");
        setOutput("");
        return;
      }
      setOutput(out);
      toast.success("XML formatted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to format XML.");
      setOutput("");
    }
  }, [input, indentStr]);

  const reset = () => {
    setInput("");
    setOutput("");
    setError(null);
  };

  const content: ToolContent = {
    intro:
      "Pretty-print XML with two or four spaces, or a tab character. Paste minified or messy XML, pick an indent and click Format. The formatter runs entirely in your browser — no parser library, no network call.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="xf-input">Input XML</Label>
              <button
                type="button"
                onClick={() => setInput(SAMPLE)}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="xf-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'<?xml version="1.0"?><root><item/></root>'}
              className="min-h-[280px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input XML"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="xf-output">Formatted output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("formatted.xml", output, "application/xml");
                    toast.success("Downloaded formatted.xml");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="xf-output"
              value={output}
              readOnly
              placeholder={"<root>\n  <item/>\n</root>"}
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
                <RadioGroupItem value="2" id="xf-2" /> 2 spaces
              </Label>
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="4" id="xf-4" /> 4 spaces
              </Label>
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="tab" id="xf-tab" /> Tab
              </Label>
            </RadioGroup>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={format}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Format XML
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <div className="space-y-1">
                <p className="font-medium">Notice</p>
                <p>{error}</p>
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
        title: "Paste your XML",
        description:
          "Drop a single-line API response, an SVG with no breaks, or a messy document into the left editor.",
      },
      {
        title: "Pick an indent style",
        description:
          "Choose 2 spaces, 4 spaces or a tab character to match your project's convention.",
      },
      {
        title: "Format the XML",
        description:
          "Click Format XML. Tags, attributes, comments, CDATA blocks and processing instructions are all preserved.",
      },
      {
        title: "Copy or save",
        description:
          "Use Copy for the clipboard or Save to download formatted.xml to your device.",
      },
    ],
    useCases: [
      "Make a minified SOAP or REST response readable before debugging.",
      "Tidy an SVG exported by a design tool so the source is reviewable.",
      "Indent a Maven, Ant or Spring XML configuration file before commit.",
      "Prepare an RSS or Atom feed snippet for documentation.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>This is a token-based pretty-printer, not a validating XML parser. Malformed input may still produce output.</li>
        <li>DTD entities, namespaces and schema references are passed through untouched.</li>
        <li>Inputs larger than 1 MB are rejected to keep the page responsive.</li>
      </ul>
    ),
    faq: [
      {
        q: "Will the formatter validate my XML?",
        a: "It performs a lightweight tag-balance check and warns when counts mismatch, but it does not run a full schema validation. Treat the output as pretty-printed, not verified.",
      },
      {
        q: "Does it support SVG?",
        a: "Yes. SVG is XML, so the same pretty-printer works for SVG files. Comments and self-closing tags are preserved.",
      },
      {
        q: "Why are attributes on one line?",
        a: "The formatter keeps each tag on its own line but does not wrap individual attributes. This keeps diffs stable when a single attribute changes.",
      },
      {
        q: "Is my XML sent anywhere?",
        a: "No. Parsing and formatting happen entirely in your browser tab — nothing is transmitted.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
