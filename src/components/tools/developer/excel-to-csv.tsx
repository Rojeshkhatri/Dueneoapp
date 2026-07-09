"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dropzone,
  FileChip,
  formatBytes,
  type DropzoneFile,
} from "@/components/dueneo/dropzone";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Layers,
  RotateCcw,
  Wand2,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  byteLength,
  formatBytes as formatBytesDev,
  downloadText,
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

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB cap for spreadsheet parsing
const MAX_PREVIEW_ROWS = 200;
const MAX_PREVIEW_COLS = 50;

interface LoadedWorkbook {
  file: File;
  workbook: XLSX.WorkBook;
  sheetNames: string[];
}

export function ExcelToCsv({ tool }: { tool: ToolDefinition }) {
  const [loaded, setLoaded] = React.useState<LoadedWorkbook | null>(null);
  const [activeSheet, setActiveSheet] = React.useState<string>("");
  const [delimiter, setDelimiter] = React.useState<Delimiter>(",");
  const [output, setOutput] = React.useState("");
  const [preview, setPreview] = React.useState<string[][] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const handleFiles = async (incoming: DropzoneFile[]) => {
    const file = incoming[0]?.file;
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error(
        `"${file.name}" is ${formatBytes(file.size)}. The limit is 25 MB — please split the file first.`
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      if (!wb.SheetNames.length) {
        throw new Error("The workbook contains no sheets.");
      }
      setLoaded({ file, workbook: wb, sheetNames: wb.SheetNames });
      setActiveSheet(wb.SheetNames[0]);
      setOutput("");
      setPreview(null);
      toast.success(
        `Loaded "${file.name}" — ${wb.SheetNames.length} sheet(s).`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not read that file.";
      setError(msg);
      toast.error(msg);
      setLoaded(null);
    } finally {
      setBusy(false);
    }
  };

  const convertSheet = React.useCallback(
    (sheetName: string) => {
      if (!loaded) return;
      try {
        const ws = loaded.workbook.Sheets[sheetName];
        if (!ws) throw new Error(`Sheet "${sheetName}" not found.`);
        const csv = XLSX.utils.sheet_to_csv(ws, {
          FS: DELIMITER_CHAR[delimiter],
          RS: "\n",
          forceQuotes: false,
          blankrows: false,
        });
        setOutput(csv);

        // Build a preview from the first rows.
        const rows = parseCsvForPreview(csv, DELIMITER_CHAR[delimiter]);
        setPreview(
          rows.slice(0, MAX_PREVIEW_ROWS).map((r) => r.slice(0, MAX_PREVIEW_COLS))
        );
        setError(null);
        toast.success(
          `Converted sheet "${sheetName}" — ${csv.length ? csv.split("\n").length - 1 : 0} row(s).`
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Conversion failed.";
        setError(msg);
        setOutput("");
        setPreview(null);
        toast.error(msg);
      }
    },
    [loaded, delimiter]
  );

  const onConvertClick = () => {
    if (!loaded) {
      toast.error("Upload an Excel file first.");
      return;
    }
    convertSheet(activeSheet);
  };

  const downloadCsv = () => {
    if (!output) {
      toast.error("Nothing to download yet — convert a sheet first.");
      return;
    }
    const base = loaded?.file.name.replace(/\.(xlsx|xls|xlsm|csv)$/i, "") ?? "sheet";
    const sheetSlug = activeSheet.replace(/[^\w.-]/g, "_").slice(0, 40) || "sheet";
    downloadText(`${base}-${sheetSlug}.csv`, output, "text/csv");
    toast.success(`Downloaded ${base}-${sheetSlug}.csv`);
  };

  const reset = () => {
    setLoaded(null);
    setActiveSheet("");
    setOutput("");
    setPreview(null);
    setError(null);
  };

  const content: ToolContent = {
    intro:
      "Convert Excel spreadsheets (.xlsx, .xls, .xlsm) into CSV directly in your browser. Drag a file in, pick the sheet you want (workbooks with multiple sheets are fully supported), choose a delimiter and download the CSV — or copy it to your clipboard. A live preview shows the parsed data. Your file never leaves your device.",
    tool: (
      <div className="space-y-5">
        {!loaded ? (
          <Dropzone
            accept=".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onFiles={handleFiles}
            label="Drop an Excel file here or click to browse"
            hint="Supports .xlsx, .xls and .xlsm. Max 25 MB. All processing is browser-only."
            maxSizeLabel="25 MB"
            className="py-12"
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <FileChip name={loaded.file.name} size={loaded.file.size} onRemove={reset} />
              <span className="ml-auto text-xs text-muted-foreground">
                {loaded.sheetNames.length} sheet
                {loaded.sheetNames.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-2">
                <Label htmlFor="e2c-sheet">Active sheet</Label>
                <Select
                  value={activeSheet}
                  onValueChange={(v) => {
                    setActiveSheet(v);
                    setOutput("");
                    setPreview(null);
                  }}
                >
                  <SelectTrigger id="e2c-sheet">
                    <span className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Pick a sheet" />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {loaded.sheetNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Each sheet is converted separately — switch and click Convert
                  again for the next one.
                </p>
              </div>

              <div className="space-y-2">
                <Label>CSV delimiter</Label>
                <RadioGroup
                  value={delimiter}
                  onValueChange={(v) => setDelimiter(v as Delimiter)}
                  className="flex flex-row flex-wrap gap-4 pt-2"
                >
                  {(Object.keys(DELIMITER_LABEL) as Delimiter[]).map((d) => (
                    <Label
                      key={d}
                      className="flex items-center gap-1.5 text-sm font-normal"
                    >
                      <RadioGroupItem value={d} id={`e2c-d-${d}`} />{" "}
                      {DELIMITER_LABEL[d]}
                    </Label>
                  ))}
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  Pick a delimiter that does not appear inside your cell values
                  to avoid quoting.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-muted/30 p-4">
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> New file
              </Button>
              <Button variant="outline" onClick={onConvertClick}>
                <Wand2 className="mr-1.5 h-4 w-4" /> Convert sheet
              </Button>
              <Button onClick={downloadCsv} disabled={!output}>
                <Download className="mr-1.5 h-4 w-4" /> Download .csv
              </Button>
            </div>
          </div>
        )}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Reading spreadsheet…
          </div>
        )}

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

        {output && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="e2c-output">CSV output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" label="Copy" />
                <Button variant="outline" size="sm" onClick={downloadCsv}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="e2c-output"
              value={output}
              readOnly
              placeholder="CSV output will appear here."
              className="min-h-[260px] font-mono text-xs"
              spellCheck={false}
              aria-label="CSV output"
            />
            <p className="text-xs text-muted-foreground">
              Output size: {formatBytesDev(byteLength(output))} ·{" "}
              {output ? output.split("\n").length : 0} lines
            </p>
          </div>
        )}

        {preview && preview.length > 0 && (
          <div className="space-y-2">
            <Label>Preview (first {preview.length} rows)</Label>
            <div className="max-h-96 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 bg-muted/50 text-right">#</TableHead>
                    {Array.from({
                      length: Math.max(...preview.map((r) => r.length), 0),
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
                        <TableCell key={ci} className="whitespace-nowrap text-xs">
                          {row[ci] ?? ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {output && !error && (
          <div
            role="status"
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
              <div className="space-y-1">
                <p className="font-medium">
                  Converted sheet “{activeSheet}” to CSV
                </p>
                <p className="text-xs">
                  Output size: {formatBytesDev(byteLength(output))}. Use the
                  sheet selector above to convert another sheet.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Upload your spreadsheet",
        description:
          "Drag an .xlsx, .xls or .xlsm file onto the dropzone, or click to browse. The file is parsed entirely in your browser — it is never uploaded.",
      },
      {
        title: "Pick a sheet",
        description:
          "If the workbook has multiple sheets, use the dropdown to switch between them. Each sheet is converted separately so you can download each as its own CSV.",
      },
      {
        title: "Choose a delimiter",
        description:
          "Comma (default), semicolon, tab or pipe. Pick a character that does not appear inside your cell values to avoid quoting issues in downstream tools.",
      },
      {
        title: "Convert, copy or download",
        description:
          "Click Convert sheet, then use Copy to put the CSV on your clipboard or Download .csv to save it. The preview shows the first 200 rows of the parsed data.",
      },
    ],
    useCases: [
      "Export a single sheet from a multi-sheet workbook to a flat CSV for ingestion by another tool.",
      "Convert an old .xls file to a modern CSV without installing desktop software.",
      "Quickly inspect the contents of a spreadsheet without opening Excel.",
      "Produce tab- or pipe-delimited files for pipelines that do not handle quoted CSV well.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Files are capped at 25 MB to keep the browser tab responsive. For
          very large workbooks, split the file or export sheets individually
          from Excel first.
        </li>
        <li>
          Formulas are resolved to their cached values. If a formula has never
          been opened in Excel (so no cached value exists), the cell will be
          empty in the CSV.
        </li>
        <li>
          Cell formatting, colours, merged cells, charts, images and pivot
          tables are not preserved — CSV has no concept of these.
        </li>
        <li>
          Multi-line cell contents are quoted per RFC-4180 when needed. Some
          older tools may not handle embedded newlines correctly.
        </li>
        <li>
          The sheet name is appended to the downloaded filename. Long or
          Unicode names are truncated and stripped of unsafe characters.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Is my spreadsheet uploaded to a server?",
        a: "No. The file is read with the browser's FileReader API and parsed with the SheetJS (xlsx) library entirely in your tab. Nothing is transmitted or stored.",
      },
      {
        q: "How are multiple sheets handled?",
        a: "All sheet names are listed in a dropdown. Pick one, click Convert, then download or copy that sheet's CSV. Switch to another sheet and repeat to export each one.",
      },
      {
        q: "Why are my formulas showing as static values?",
        a: "CSV is a plain-text format with no formula support. SheetJS reads the last cached value Excel stored for each cell. If you never opened the file in Excel, some formula cells may be empty.",
      },
      {
        q: "Which delimiter should I pick?",
        a: "Comma is the most widely supported. Use semicolon if your data contains commas (common in European locales where the comma is the decimal separator). Tab is good for piping into terminal tools; pipe is useful for logs.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

/* ─── local helpers ─────────────────────────────────────────────────── */

/**
 * Lightweight CSV parser used only for the preview pane in this tool.
 * Mirrors the behaviour of _dev-helpers.parseCsv without importing it,
 * because parseCsv already exists for general use and we want a stable,
 * self-contained preview here.
 */
function parseCsvForPreview(input: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      if (input[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}
