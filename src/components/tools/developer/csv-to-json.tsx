"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  parseCsv,
} from "./_dev-helpers";

type Delimiter = "," | ";" | "\t" | "|";

const DELIMITER_LABEL: Record<Delimiter, string> = {
  ",": "Comma",
  ";": "Semicolon",
  "\t": "Tab",
  "|": "Pipe",
};

const SAMPLE = `name,email,role
Ada Lovelace,ada@example.com,admin
Linus Torvalds,linus@example.com,"editor, maintainer"
Grace Hopper,grace@example.com,admin`;

export function CsvToJson({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [delimiter, setDelimiter] = React.useState<Delimiter>(",");
  const [firstRowHeaders, setFirstRowHeaders] = React.useState(true);
  const [trim, setTrim] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const convert = React.useCallback(() => {
    if (!input.trim()) {
      setError("Please paste some CSV data first.");
      setOutput("");
      return;
    }
    if (byteLength(input) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setOutput("");
      return;
    }
    try {
      const rows = parseCsv(input, delimiter, { trim });
      if (rows.length === 0) {
        setError("No rows detected.");
        setOutput("");
        return;
      }

      let headers: string[];
      let dataRows: string[][];

      if (firstRowHeaders) {
        if (rows.length < 1) {
          setError("No header row found.");
          setOutput("");
          return;
        }
        headers = rows[0];
        dataRows = rows.slice(1);
      } else {
        const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
        headers = Array.from({ length: maxCols }, (_, i) => `column_${i + 1}`);
        dataRows = rows;
      }

      // Coerce values to numbers, booleans, null when possible.
      const json = dataRows.map((row) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => {
          const raw = row[i] ?? "";
          obj[h] = coerceValue(raw);
        });
        return obj;
      });

      setOutput(JSON.stringify(json, null, 2));
      setError(null);
      toast.success(`Converted ${dataRows.length} row(s) to JSON.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
      setOutput("");
      toast.error("CSV conversion failed.");
    }
  }, [input, delimiter, firstRowHeaders, trim]);

  const reset = () => {
    setInput("");
    setOutput("");
    setError(null);
  };

  const content: ToolContent = {
    intro:
      "Convert CSV data into a JSON array of objects, entirely in the browser. Pick a delimiter (comma, semicolon, tab or pipe), choose whether the first row holds the column names, and copy the resulting JSON.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cj-input">Input CSV</Label>
              <button
                type="button"
                onClick={() => setInput(SAMPLE)}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="cj-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"name,email\nAda,ada@example.com"}
              className="min-h-[280px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input CSV"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cj-output">JSON output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("data.json", output, "application/json");
                    toast.success("Downloaded data.json");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="cj-output"
              value={output}
              readOnly
              placeholder='[{"name":"Ada","email":"ada@example.com"}]'
              className="min-h-[280px] font-mono text-xs"
              spellCheck={false}
              aria-label="JSON output"
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
                  <RadioGroupItem value={d} id={`cj-${d}`} /> {DELIMITER_LABEL[d]}
                </Label>
              ))}
            </RadioGroup>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="cj-headers"
              checked={firstRowHeaders}
              onCheckedChange={setFirstRowHeaders}
            />
            <Label htmlFor="cj-headers" className="text-sm font-normal">
              First row is headers
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="cj-trim" checked={trim} onCheckedChange={setTrim} />
            <Label htmlFor="cj-trim" className="text-sm font-normal">
              Trim whitespace
            </Label>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={convert}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Convert to JSON
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
            Output size: {formatBytes(byteLength(output))} · numbers, booleans
            and null are coerced automatically.
          </p>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste your CSV",
        description:
          "Drop a tabular block into the input editor. Quoted fields with embedded newlines or commas are supported.",
      },
      {
        title: "Pick a delimiter",
        description:
          "Choose comma, semicolon, tab or pipe — useful for European locales that use a comma as the decimal separator.",
      },
      {
        title: "Toggle header row and trimming",
        description:
          "Enable First row is headers to use the first line as object keys. Trim whitespace strips spaces around each field.",
      },
      {
        title: "Convert and copy",
        description:
          "Click Convert to JSON. Numbers, booleans and null are coerced automatically; everything else stays a string.",
      },
    ],
    useCases: [
      "Import a spreadsheet export into a JavaScript app or API.",
      "Convert a CRM export into JSON for a one-off data migration.",
      "Generate fixtures or seed data from a CSV maintained by a non-developer.",
      "Inspect tabular data in a structured way before writing transformation code.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>All keys come from the header row (or auto-named <code>column_N</code>); duplicate headers will overwrite earlier values.</li>
        <li>Inputs larger than 1 MB are rejected to keep the tab responsive.</li>
        <li>Date strings are kept as strings — JSON has no native date type.</li>
      </ul>
    ),
    faq: [
      {
        q: "How are values converted?",
        a: "Quoted strings stay strings. Unquoted values that look like integers, decimals, true/false or null are coerced to the matching JSON type. Everything else stays a string.",
      },
      {
        q: "What happens with empty cells?",
        a: "Empty unquoted cells become empty strings. Use the value <code>null</code> (without quotes) in your CSV to get a JSON null.",
      },
      {
        q: "Can I convert TSV files?",
        a: "Yes — pick Tab as the delimiter. Tab-separated values from spreadsheets or logs work the same way as CSV.",
      },
      {
        q: "Is my CSV uploaded anywhere?",
        a: "No. Conversion happens entirely in your browser. Nothing is sent to Dueneo or any third party.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function coerceValue(raw: string): unknown {
  const v = raw.trim();
  if (v === "") return "";
  if (v.toLowerCase() === "null") return null;
  if (v.toLowerCase() === "true") return true;
  if (v.toLowerCase() === "false") return false;
  // Integer
  if (/^-?\d+$/.test(v) && v !== "-0") {
    const n = Number(v);
    if (Number.isSafeInteger(n)) return n;
  }
  // Decimal / scientific
  if (/^-?\d+\.\d+(?:e[+-]?\d+)?$/i.test(v) || /^-?\d+e[+-]?\d+$/i.test(v)) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return raw;
}
