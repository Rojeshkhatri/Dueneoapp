"use client";

import * as React from "react";
import yaml from "js-yaml";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCheck2,
  RotateCcw,
  Wand2,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_INPUT_BYTES,
  INPUT_TOO_LARGE_MSG,
  byteLength,
  formatBytes,
  downloadText,
} from "./_dev-helpers";

type Indent = "2" | "4";

const SAMPLE = `# Sample YAML — click Load sample, then Format
name: Dueneo
version: 1.0.0
tags:
  - tools
  - browser-only
  - private
features:
  formatting: true
  validation: true
  multi-document: true
stats:
  tools: 100
  games: 15
  monthlyUsers: 50000
description: |
  A multi-line
  description string.`;

interface YamlErrorInfo {
  message: string;
  line: number | null;
  column: number | null;
  excerpt: string | null;
}

function describeYamlError(err: unknown, source?: string): YamlErrorInfo {
  if (err instanceof yaml.YAMLException) {
    const mark = err.mark;
    const line = mark && typeof mark.line === "number" ? mark.line + 1 : null;
    const column =
      mark && typeof mark.column === "number" ? mark.column + 1 : null;
    let excerpt: string | null = null;
    if (line !== null && source) {
      const srcLine = source.split(/\r?\n/)[line - 1];
      if (srcLine !== undefined) excerpt = srcLine;
    } else if (mark && typeof mark.snippet === "string") {
      excerpt = mark.snippet;
    }
    return {
      message: err.reason || err.message,
      line,
      column,
      excerpt,
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { message, line: null, column: null, excerpt: null };
}

export function YamlFormatter({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [indent, setIndent] = React.useState<Indent>("2");
  const [validateOnly, setValidateOnly] = React.useState(false);
  const [error, setError] = React.useState<YamlErrorInfo | null>(null);
  const [validInfo, setValidInfo] = React.useState<{
    docs: number;
    bytes: number;
  } | null>(null);

  const indentStr = React.useMemo(
    () => " ".repeat(Number(indent)),
    [indent]
  );

  const format = React.useCallback(() => {
    if (!input.trim()) {
      setError({ message: "Please paste some YAML first.", line: null, column: null, excerpt: null });
      setOutput("");
      setValidInfo(null);
      return;
    }
    if (byteLength(input) > MAX_INPUT_BYTES) {
      setError({ message: INPUT_TOO_LARGE_MSG, line: null, column: null, excerpt: null });
      setOutput("");
      setValidInfo(null);
      return;
    }

    setError(null);
    setValidInfo(null);

    try {
      const docs: unknown[] = [];
      yaml.loadAll(input, (doc) => {
        docs.push(doc);
      });

      if (validateOnly) {
        setOutput("");
        setValidInfo({ docs: docs.length, bytes: byteLength(input) });
        toast.success(
          `Valid YAML — ${docs.length} document${docs.length === 1 ? "" : "s"} parsed.`
        );
        return;
      }

      const parts: string[] = [];
      for (const doc of docs) {
        if (doc === undefined) {
          // Empty document in a multi-doc stream — preserve it as a separator.
          parts.push("");
          continue;
        }
        parts.push(
          yaml.dump(doc, {
            indent: Number(indent),
            lineWidth: 100,
            noRefs: true,
            sortKeys: false,
            quotingType: '"',
          })
        );
      }
      const joined = parts.join("---\n");
      setOutput(joined);
      setValidInfo({ docs: docs.length, bytes: byteLength(joined) });
      toast.success(
        `Formatted ${docs.length} document${docs.length === 1 ? "" : "s"}.`
      );
    } catch (e) {
      const info = describeYamlError(e, input);
      setError(info);
      setOutput("");
      setValidInfo(null);
      toast.error("Invalid YAML — see the error message.");
    }
  }, [input, indent, indentStr, validateOnly]);

  const reset = () => {
    setInput("");
    setOutput("");
    setError(null);
    setValidInfo(null);
  };

  const loadSample = () => {
    setInput(SAMPLE);
    setError(null);
    setOutput("");
    setValidInfo(null);
  };

  const content: ToolContent = {
    intro:
      "Beautify and validate YAML configuration files in your browser. Supports multi-document streams separated by `---`, optional 2- or 4-space indentation, and a validate-only mode that reports parse errors with the exact line and column. Nothing ever leaves your device.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="yf-input">Input YAML</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="yf-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"name: example\nitems:\n  - one\n  - two"}
              className="min-h-[300px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input YAML"
            />
            <p className="text-xs text-muted-foreground">
              Input size: {formatBytes(byteLength(input))}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="yf-output">
                {validateOnly ? "Validation result" : "Formatted output"}
              </Label>
              <div className="flex gap-1.5">
                {!validateOnly && (
                  <CopyButton value={output} size="sm" label="Copy" />
                )}
                {!validateOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!output}
                    onClick={() => {
                      downloadText("formatted.yaml", output, "application/yaml");
                      toast.success("Downloaded formatted.yaml");
                    }}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              id="yf-output"
              value={output}
              readOnly
              placeholder={
                validateOnly
                  ? "Press Validate YAML to check the input."
                  : "Formatted YAML will appear here."
              }
              className="min-h-[300px] font-mono text-xs"
              spellCheck={false}
              aria-label="Formatted output"
            />
            {output && (
              <p className="text-xs text-muted-foreground">
                Output size: {formatBytes(byteLength(output))} ·{" "}
                {output.split("\n").length} lines
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label>Indent size</Label>
            <RadioGroup
              value={indent}
              onValueChange={(v) => setIndent(v as Indent)}
              className="flex flex-row gap-4"
              disabled={validateOnly}
            >
              <Label
                className={`flex items-center gap-1.5 text-sm font-normal ${
                  validateOnly ? "opacity-50" : ""
                }`}
              >
                <RadioGroupItem value="2" id="yf-2" /> 2 spaces
              </Label>
              <Label
                className={`flex items-center gap-1.5 text-sm font-normal ${
                  validateOnly ? "opacity-50" : ""
                }`}
              >
                <RadioGroupItem value="4" id="yf-4" /> 4 spaces
              </Label>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="yf-validate"
              checked={validateOnly}
              onCheckedChange={setValidateOnly}
            />
            <Label htmlFor="yf-validate" className="text-sm font-normal">
              Validate only
            </Label>
          </div>

          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={format}>
              {validateOnly ? (
                <>
                  <FileCheck2 className="mr-1.5 h-4 w-4" /> Validate YAML
                </>
              ) : (
                <>
                  <Wand2 className="mr-1.5 h-4 w-4" /> Format YAML
                </>
              )}
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
                <p className="font-medium">Invalid YAML</p>
                <p>{error.message}</p>
                {error.line !== null && (
                  <p className="text-xs">
                    Around line {error.line}
                    {error.column !== null ? `, column ${error.column}` : ""}
                    {error.excerpt
                      ? `: ${error.excerpt.trim().slice(0, 140)}`
                      : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!error && validInfo && (
          <div
            role="status"
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
              <div className="space-y-1">
                <p className="font-medium">
                  Valid YAML — {validInfo.docs} document
                  {validInfo.docs === 1 ? "" : "s"} parsed
                </p>
                <p className="text-xs">
                  {validateOnly
                    ? `Input size: ${formatBytes(validInfo.bytes)}`
                    : `Output size: ${formatBytes(validInfo.bytes)}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {input && !output && !error && !validInfo && (
          <p className="text-xs text-muted-foreground">
            Input size: {formatBytes(byteLength(input))} ·{" "}
            {input.split("\n").length} lines
          </p>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste your YAML",
        description:
          "Drop raw YAML into the left-hand editor. Multi-document streams (separated by `---`) are supported — each document is parsed and re-emitted independently.",
      },
      {
        title: "Pick indent size or validate-only",
        description:
          "Choose 2 or 4 spaces for indentation. Toggle Validate only to skip formatting and just check that the YAML parses.",
      },
      {
        title: "Format or validate",
        description:
          "Click Format YAML (or Validate YAML). Parse errors include the line and column where the parser failed, plus a short excerpt.",
      },
      {
        title: "Copy or download",
        description:
          "Use Copy to put the result on your clipboard, or Save to download it as formatted.yaml.",
      },
    ],
    useCases: [
      "Tidy a hand-written docker-compose.yml or CI config before committing.",
      "Validate that a Kubernetes manifest has correct indentation before applying it.",
      "Normalise indentation across a team's YAML files (2 vs 4 spaces).",
      "Check a multi-document YAML stream (e.g. a Helm chart) parses correctly.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Inputs larger than 1 MB are rejected to keep the tab responsive.</li>
        <li>
          YAML aliases and anchors are resolved on dump (
          <code>noRefs: true</code>) — the output is fully expanded.
        </li>
        <li>
          The formatter uses <code>js-yaml</code>'s default schema, which
          supports the JSON, core and some extended types. Custom tags may not
          round-trip.
        </li>
        <li>
          Line and column numbers come from <code>js-yaml</code>'s parser and
          may point one line beyond the actual issue when the error is at the
          end of the document.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Is my YAML sent to a server?",
        a: "No. Parsing and formatting happen entirely in your browser with the js-yaml library. Nothing is transmitted or stored.",
      },
      {
        q: "Does this support multi-document YAML?",
        a: "Yes. Documents separated by `---` are parsed individually with `yaml.loadAll`. Each document is re-emitted in order, with `---` between them.",
      },
      {
        q: "Why are my anchors and aliases gone in the output?",
        a: "The formatter resolves all references and writes the expanded form. This avoids subtle bugs when anchors cross document boundaries. If you need to preserve anchors, use a YAML editor instead.",
      },
      {
        q: "What does 'Validate only' do?",
        a: "It parses the YAML without re-emitting it. You get a success message with the document count, or an error with the line and column. Useful when you only want to check syntax.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
