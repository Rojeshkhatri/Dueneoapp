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
  csvField,
  describeJsonError,
} from "./_dev-helpers";

type Delimiter = "," | ";" | "\t" | "|";

const DELIMITER_LABEL: Record<Delimiter, string> = {
  ",": "Comma",
  ";": "Semicolon",
  "\t": "Tab",
  "|": "Pipe",
};

const SAMPLE = `[
  {"name":"Ada","email":"ada@example.com","roles":["admin"]},
  {"name":"Linus","email":"linus@example.com","roles":["editor","maintainer"]}
]`;

export function JsonToCsv({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [delimiter, setDelimiter] = React.useState<Delimiter>(",");
  const [error, setError] = React.useState<string | null>(null);
  const [rowCount, setRowCount] = React.useState<number>(0);
  const [colCount, setColCount] = React.useState<number>(0);

  const convert = React.useCallback(() => {
    if (!input.trim()) {
      setError("Please paste a JSON array first.");
      setOutput("");
      setRowCount(0);
      setColCount(0);
      return;
    }
    if (byteLength(input) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setOutput("");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      const info = describeJsonError(e, input);
      setError(`Invalid JSON: ${info.message}`);
      setOutput("");
      toast.error("Invalid JSON input.");
      return;
    }

    if (!Array.isArray(parsed)) {
      setError("The top-level JSON must be an array of objects.");
      setOutput("");
      return;
    }
    if (parsed.length === 0) {
      setError("The JSON array is empty — nothing to convert.");
      setOutput("");
      return;
    }

    // Auto-detect keys from the union of every object's keys (preserving first-seen order).
    const keyOrder: string[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        for (const k of Object.keys(item as Record<string, unknown>)) {
          if (!seen.has(k)) {
            seen.add(k);
            keyOrder.push(k);
          }
        }
      }
    }
    if (keyOrder.length === 0) {
      setError("No objects with keys were found in the array.");
      setOutput("");
      return;
    }

    const lines: string[] = [];
    lines.push(keyOrder.map((k) => csvField(k, delimiter)).join(delimiter));

    for (const item of parsed) {
      const obj =
        item !== null && typeof item === "object" && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : {};
      const cells = keyOrder.map((k) => {
        const value = obj[k];
        return csvField(valueToCell(value), delimiter);
      });
      lines.push(cells.join(delimiter));
    }

    setOutput(lines.join("\n"));
    setRowCount(parsed.length);
    setColCount(keyOrder.length);
    setError(null);
    toast.success(`Converted ${parsed.length} row(s) to CSV.`);
  }, [input, delimiter]);

  const reset = () => {
    setInput("");
    setOutput("");
    setError(null);
    setRowCount(0);
    setColCount(0);
  };

  const content: ToolContent = {
    intro:
      "Convert a JSON array of objects into CSV with a header row. Keys are auto-detected from the union of every object — missing fields become empty cells. Nested objects and arrays are JSON-stringified so nothing is lost.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="jc-input">Input JSON array</Label>
              <button
                type="button"
                onClick={() => setInput(SAMPLE)}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="jc-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='[{"name":"Ada","email":"ada@example.com"}]'
              className="min-h-[280px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input JSON array"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="jc-output">CSV output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("data.csv", output, "text/csv");
                    toast.success("Downloaded data.csv");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="jc-output"
              value={output}
              readOnly
              placeholder={"name,email\nAda,ada@example.com"}
              className="min-h-[280px] font-mono text-xs"
              spellCheck={false}
              aria-label="CSV output"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-6 rounded-xl border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label>Delimiter</Label>
            <RadioGroup
              value={delimiter}
              onValueChange={(v) => setDelimiter(v as Delimiter)}
              className="flex flex-row flex-wrap gap-4"
            >
              {(Object.keys(DELIMITER_LABEL) as Delimiter[]).map((d) => (
                <Label
                  key={d}
                  className="flex items-center gap-1.5 text-sm font-normal"
                >
                  <RadioGroupItem value={d} id={`jc-${d}`} /> {DELIMITER_LABEL[d]}
                </Label>
              ))}
            </RadioGroup>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={convert}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Convert to CSV
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
                <p className="font-medium">Conversion problem</p>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        {output && (
          <p className="text-xs text-muted-foreground">
            {rowCount} row(s) · {colCount} column(s) ·{" "}
            {formatBytes(byteLength(output))}
          </p>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste a JSON array",
        description:
          "The top-level value must be an array of objects. Each object becomes one CSV row.",
      },
      {
        title: "Pick a delimiter",
        description:
          "Comma is the default; choose semicolon for European locales, tab for TSV exports, or pipe for legacy systems.",
      },
      {
        title: "Convert to CSV",
        description:
          "Keys are collected from every object in first-seen order. The first row of the output is the header.",
      },
      {
        title: "Copy or save",
        description:
          "Use Copy for the clipboard or Save to download data.csv. Fields with commas or newlines are automatically quoted.",
      },
    ],
    useCases: [
      "Export API results for a spreadsheet user.",
      "Generate a CSV download from a JSON-backed admin panel.",
      "Snapshot a NoSQL collection into a single CSV for inspection.",
      "Convert a JSON fixture into CSV for a legacy importer.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The input must be a JSON array of objects — single objects or nested arrays are not supported.</li>
        <li>Nested objects and arrays are JSON-stringified into a single cell rather than flattened.</li>
        <li>Inputs larger than 1 MB are rejected to keep the tab responsive.</li>
      </ul>
    ),
    faq: [
      {
        q: "How are the column names picked?",
        a: "They are the union of every key found in every object, in the order they were first seen. Missing keys become empty cells.",
      },
      {
        q: "What happens to nested objects or arrays?",
        a: "They are serialised back to a compact JSON string and placed in a single CSV cell, so no information is lost when the CSV is re-imported.",
      },
      {
        q: "Are fields always quoted?",
        a: "Only when they contain the delimiter, a double quote or a newline. Otherwise the field is left unquoted for readability.",
      },
      {
        q: "Can I convert a single JSON object instead of an array?",
        a: "Wrap it in square brackets, e.g. <code>[{`{...}`}]</code>, and run the converter again.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function valueToCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  // Objects and arrays are JSON-stringified (compact).
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
