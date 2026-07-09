"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dropzone, type DropzoneFile } from "@/components/dueneo/dropzone";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RotateCcw,
  Wand2,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_INPUT_BYTES,
  INPUT_TOO_LARGE_MSG,
  byteLength,
  formatBytes,
  parseCsv,
} from "./_dev-helpers";

type Delimiter = "," | ";" | "\t" | "|";

const DELIMITER_LABEL: Record<Delimiter, string> = {
  ",": "Comma",
  ";": "Semicolon",
  "\t": "Tab",
  "|": "Pipe",
};

const DELIMITER_CHAR: Record<Delimiter, string> = {
  ",": ",",
  ";": ";",
  "\t": "\t",
  "|": "|",
};

const SAMPLE = `name,email,role,joined
Ada Lovelace,ada@example.com,admin,2024-01-15
Linus Torvalds,linus@example.com,"editor, maintainer",2024-02-20
Grace Hopper,grace@example.com,admin,2024-03-10
"Smith, John",john@example.com,viewer,2024-04-05`;

const MAX_PREVIEW_ROWS = 200;
const MAX_PREVIEW_COLS = 50;

export function CsvToExcel({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [delimiter, setDelimiter] = React.useState<Delimiter>(",");
  const [trim, setTrim] = React.useState(true);
  const [sheetName, setSheetName] = React.useState("Sheet1");
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<string[][] | null>(null);
  const [stats, setStats] = React.useState<{ rows: number; cols: number } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const handleFiles = async (incoming: DropzoneFile[]) => {
    const file = incoming[0]?.file;
    if (!file) return;
    if (file.size > MAX_INPUT_BYTES) {
      toast.error(INPUT_TOO_LARGE_MSG);
      return;
    }
    try {
      const text = await file.text();
      setInput(text);
      setError(null);
      setPreview(null);
      setStats(null);
      toast.success(`Loaded "${file.name}" (${formatBytes(file.size)}).`);
    } catch {
      toast.error("Could not read that file.");
    }
  };

  const convert = React.useCallback(() => {
    if (!input.trim()) {
      setError("Please paste some CSV data first.");
      setPreview(null);
      setStats(null);
      return;
    }
    if (byteLength(input) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setPreview(null);
      setStats(null);
      return;
    }
    try {
      const rows = parseCsv(input, DELIMITER_CHAR[delimiter], { trim });
      if (rows.length === 0) {
        setError("No rows detected.");
        setPreview(null);
        setStats(null);
        return;
      }
      const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
      setPreview(rows.slice(0, MAX_PREVIEW_ROWS).map((r) => r.slice(0, MAX_PREVIEW_COLS)));
      setStats({ rows: rows.length, cols });
      setError(null);
      toast.success(
        `Parsed ${rows.length} row(s) × ${cols} column(s). Click "Convert & download" to save as .xlsx.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
      setPreview(null);
      setStats(null);
      toast.error("CSV parsing failed.");
    }
  }, [input, delimiter, trim]);

  const download = React.useCallback(async () => {
    if (!preview && !stats) {
      toast.error("Parse the CSV first.");
      return;
    }
    setBusy(true);
    try {
      // Re-parse from input to get the full dataset (preview may be truncated).
      const rows = parseCsv(input, DELIMITER_CHAR[delimiter], { trim });
      if (rows.length === 0) {
        toast.error("No rows to write.");
        return;
      }
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const name = (sheetName.trim() || "Sheet1").slice(0, 31);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, name);
      // Sanitize filename — strip any path separators.
      const safeSheet = name.replace(/[\\/?*[\]:]/g, "_");
      XLSX.writeFile(wb, `${safeSheet || "spreadsheet"}.xlsx`);
      toast.success(
        `Saved ${rows.length} row(s) × ${ws["!ref"]?.split(":")[1] ?? "?"} as ${safeSheet}.xlsx.`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Excel export failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }, [input, delimiter, trim, sheetName, preview, stats]);

  const reset = () => {
    setInput("");
    setError(null);
    setPreview(null);
    setStats(null);
    setSheetName("Sheet1");
  };

  const loadSample = () => {
    setInput(SAMPLE);
    setError(null);
    setPreview(null);
    setStats(null);
  };

  const content: ToolContent = {
    intro:
      "Convert CSV data into an Excel-compatible .xlsx file right in your browser. Paste your CSV or upload a .csv file, choose the delimiter, set the sheet name and download a ready-to-open spreadsheet. A live preview shows the parsed data before you export. No upload — your data stays on your device.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="c2x-input">Input CSV</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="c2x-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"name,email,role\nAda Lovelace,ada@example.com,admin"}
              className="min-h-[280px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input CSV"
            />
            <p className="text-xs text-muted-foreground">
              Input size: {formatBytes(byteLength(input))} ·{" "}
              {input ? input.split("\n").length : 0} lines
            </p>
          </div>

          <div className="space-y-4">
            <Dropzone
              accept=".csv,text/csv,text/plain"
              onFiles={handleFiles}
              label="Upload a .csv file"
              hint="Optional — paste into the textarea or upload a file. Max 1 MB."
              maxSizeLabel="1 MB"
              className="py-8"
            />

            <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
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
                      <RadioGroupItem value={d} id={`c2x-d-${d}`} />{" "}
                      {DELIMITER_LABEL[d]}
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="c2x-trim"
                  checked={trim}
                  onCheckedChange={setTrim}
                />
                <Label htmlFor="c2x-trim" className="text-sm font-normal">
                  Trim whitespace in fields
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="c2x-sheet">Sheet name</Label>
                <Input
                  id="c2x-sheet"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder="Sheet1"
                  maxLength={31}
                />
                <p className="text-xs text-muted-foreground">
                  Excel limits sheet names to 31 characters. Invalid characters
                  are stripped on export.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-muted/30 p-4">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
          <Button variant="outline" onClick={convert}>
            <Wand2 className="mr-1.5 h-4 w-4" /> Parse &amp; preview
          </Button>
          <Button onClick={download} disabled={busy || !preview}>
            {busy ? (
              <>
                <span className="mr-1.5 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Converting…
              </>
            ) : (
              <>
                <Download className="mr-1.5 h-4 w-4" /> Convert &amp; download
              </>
            )}
          </Button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <div className="space-y-1">
                <p className="font-medium">Conversion failed</p>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        {stats && !error && (
          <div
            role="status"
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
              <div className="space-y-1">
                <p className="font-medium">
                  Parsed {stats.rows} row(s) × {stats.cols} column(s)
                </p>
                <p className="text-xs">
                  Showing the first {Math.min(MAX_PREVIEW_ROWS, stats.rows)}{" "}
                  rows below. Click “Convert &amp; download” to save the full
                  dataset as .xlsx.
                </p>
              </div>
            </div>
          </div>
        )}

        {preview && preview.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Preview ({preview.length} rows shown)</Label>
              <span className="text-xs text-muted-foreground">
                <FileSpreadsheet className="mr-1 inline h-3 w-3" />
                {preview[0]?.length ?? 0} columns
              </span>
            </div>
            <div className="max-h-96 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 bg-muted/50 text-right">#</TableHead>
                    {Array.from({
                      length: Math.max(
                        ...preview.map((r) => r.length),
                        0
                      ),
                    }).map((_, i) => (
                      <TableHead key={i} className="bg-muted/50 whitespace-nowrap">
                        {preview[0]?.[i] ?? `Col ${i + 1}`}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(1).map((row, ri) => (
                    <TableRow key={ri}>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {ri + 2}
                      </TableCell>
                      {Array.from({
                        length: Math.max(...preview.map((r) => r.length), 0),
                      }).map((_, ci) => (
                        <TableCell
                          key={ci}
                          className="whitespace-nowrap text-xs"
                        >
                          {row[ci] ?? ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: the first row of your CSV is used as column headers in the
              preview. Excel will treat all rows as plain cells — headers are
              not styled differently in the exported file.
            </p>
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste or upload your CSV",
        description:
          "Drop raw CSV text into the textarea, or click the dropzone to upload a .csv file (max 1 MB). Quoted fields with embedded delimiters or newlines are handled correctly.",
      },
      {
        title: "Pick the delimiter",
        description:
          "Choose comma (default), semicolon, tab or pipe. The parser is RFC-4180-style and supports quoted fields and escaped quotes (`\"\"` → `\"`).",
      },
      {
        title: "Set the sheet name",
        description:
          "Enter a sheet name (max 31 characters — Excel's limit). Invalid characters are stripped on export. The default is “Sheet1”.",
      },
      {
        title: "Parse, preview and download",
        description:
          "Click Parse & preview to see the table, then Convert & download to save it as a .xlsx file. All processing happens locally in your browser.",
      },
    ],
    useCases: [
      "Convert a CSV export from a database or analytics tool into a spreadsheet for non-technical colleagues.",
      "Quickly preview a CSV file's contents before importing it elsewhere.",
      "Convert semicolon-delimited European CSV exports (where commas are decimal separators) into proper Excel files.",
      "Pipe-delimited log data → .xlsx for filtering and pivoting.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Input is capped at 1 MB to keep the browser tab responsive. For
          larger files, use a desktop tool or split the file first.
        </li>
        <li>
          All cells are written as text. Numeric, date and currency values
          from your CSV are not auto-typed — Excel may show a green triangle
          warning. Apply cell formatting in Excel afterwards.
        </li>
        <li>
          Only a single sheet is created. To build multi-sheet workbooks, run
          the tool once per CSV and combine the results in Excel.
        </li>
        <li>
          Sheet names are truncated to 31 characters and stripped of{" "}
          <code>\ / ? * [ ] :</code> per Excel's rules.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Is my CSV data uploaded anywhere?",
        a: "No. Parsing and the .xlsx export both happen in your browser using the SheetJS (xlsx) library. Nothing is transmitted or stored.",
      },
      {
        q: "Why are my numbers stored as text?",
        a: "The tool writes every cell as a string. Excel's auto-typing of CSV imports can be locale-dependent and error-prone, so we play it safe. Select the columns in Excel and use Data → Text to Columns or Format Cells to convert them.",
      },
      {
        q: "What delimiters are supported?",
        a: "Comma, semicolon, tab and pipe. The parser correctly handles quoted fields, embedded newlines, and escaped quotes (`\"\"`).",
      },
      {
        q: "Can I convert multiple CSVs into one workbook?",
        a: "Not in a single pass — this tool creates one sheet per run. Convert each CSV separately, then copy the sheets into a single workbook in Excel, or use the Excel to CSV tool's reverse direction to start from an existing .xlsx.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
