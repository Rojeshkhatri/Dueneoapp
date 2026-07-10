"use client";

import * as React from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip, formatBytes } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, RotateCcw, Scissors } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  downloadBlob,
  isPdfFile,
  LARGE_PDF_WARN_BYTES,
  loadPdfDocument,
  MAX_PDF_BYTES,
  parsePageRanges,
  readFileAsArrayBuffer,
} from "./_pdf-helpers";

type SplitMode = "each-page" | "ranges";

interface OutputPiece {
  name: string;
  blob: Blob;
  size: number;
}

export function PdfSplit({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [pageCount, setPageCount] = React.useState<number>(0);
  const [mode, setMode] = React.useState<SplitMode>("each-page");
  const [rangesSpec, setRangesSpec] = React.useState<string>("");
  const [zipOutput, setZipOutput] = React.useState<boolean>(true);
  const [busy, setBusy] = React.useState(false);
  const [outputs, setOutputs] = React.useState<OutputPiece[]>([]);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputName, setOutputName] = React.useState<string>("split.zip");

  React.useEffect(() => {
    return () => {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [outputUrl]);

  const onFiles = async (incoming: { file: File }[]) => {
    const f = incoming[0]?.file;
    if (!f) return;
    if (!isPdfFile(f)) {
      toast.error("Please choose a PDF file.");
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      toast.error(`"${f.name}" is larger than ${formatBytes(MAX_PDF_BYTES)}.`);
      return;
    }
    if (f.size > LARGE_PDF_WARN_BYTES) {
      toast.warning(`"${f.name}" is ${formatBytes(f.size)}. Large PDFs may take a while to process.`);
    }
    setFile(f);
    setOutputs([]);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    try {
      const buf = await readFileAsArrayBuffer(f);
      const doc = await loadPdfDocument(buf, { PDFDocument });
      setPageCount(doc.getPageCount());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read this PDF.");
      setFile(null);
      setPageCount(0);
    }
  };

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setRangesSpec("");
    setOutputs([]);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
  };

  const baseName = (file?.name ?? "document.pdf").replace(/\.pdf$/i, "");

  const doSplit = async () => {
    if (!file) {
      toast.error("Please upload a PDF first.");
      return;
    }
    if (pageCount === 0) {
      toast.error("The PDF has no pages to split.");
      return;
    }
    setBusy(true);
    try {
      const buf = await readFileAsArrayBuffer(file);
      const src = await loadPdfDocument(buf, { PDFDocument });

      // Build the list of pieces to produce.
      let pieces: { name: string; indices: number[] }[] = [];
      if (mode === "each-page") {
        for (let i = 0; i < pageCount; i++) {
          pieces.push({
            name: `${baseName}-page-${String(i + 1).padStart(3, "0")}.pdf`,
            indices: [i],
          });
        }
      } else {
        // Validate the spec first; parsePageRanges throws on syntax errors.
        parsePageRanges(rangesSpec, pageCount);
        // Each range in the spec becomes one output file. Re-parse the spec
        // to preserve grouping (e.g. "1-3, 5, 7-9" → 3 files).
        const groups = rangesSpec
          .replace(/\s+/g, "")
          .split(",")
          .filter(Boolean);
        pieces = groups.map((g, gi) => {
          const m = g.match(/^(\d+)(?:-(\d+))?$/);
          const start = parseInt(m![1], 10);
          const end = m![2] ? parseInt(m![2], 10) : start;
          const lo = Math.min(start, end);
          const hi = Math.max(start, end);
          const indices: number[] = [];
          for (let i = lo; i <= hi; i++) {
            if (i >= 1 && i <= pageCount) indices.push(i - 1);
          }
          return { name: `${baseName}-part-${gi + 1}.pdf`, indices };
        });
        pieces = pieces.filter((p) => p.indices.length > 0);
        if (pieces.length === 0) throw new Error("No pages selected.");
      }

      // Render each piece as a fresh PDF.
      const out: OutputPiece[] = [];
      for (const piece of pieces) {
        const outDoc = await PDFDocument.create();
        const copied = await outDoc.copyPages(src, piece.indices);
        for (const p of copied) outDoc.addPage(p);
        const bytes = await outDoc.save();
        const blob = new Blob([bytes], { type: "application/pdf" });
        out.push({ name: piece.name, blob, size: blob.size });
      }

      if (out.length === 0) throw new Error("No output produced.");

      setOutputs(out);

      if (zipOutput && out.length > 1) {
        const zip = new JSZip();
        for (const piece of out) {
          zip.file(piece.name, piece.blob);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(URL.createObjectURL(zipBlob));
        setOutputName(`${baseName}-split.zip`);
        toast.success(`Split into ${out.length} PDFs and bundled into a ZIP (${formatBytes(zipBlob.size)}).`);
      } else if (out.length === 1) {
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(URL.createObjectURL(out[0].blob));
        setOutputName(out[0].name);
        toast.success(`Split into 1 PDF (${formatBytes(out[0].size)}).`);
      } else {
        // Multiple pieces, no zip — auto-download each (browser will prompt once).
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(null);
        toast.success(`Split into ${out.length} PDFs. Use the download buttons below.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Split failed.");
    } finally {
      setBusy(false);
    }
  };

  const content: ToolContent = {
    intro:
      "Split a PDF into individual pages or custom page ranges, right in your browser. Choose one page per file or group ranges like “1-3, 5, 7-9”, then download a single ZIP or separate PDFs. Your file never leaves your device.",
    tool: (
      <div className="space-y-5">
        {!file ? (
          <Dropzone
            accept="application/pdf,.pdf"
            onFiles={onFiles}
            hint="PDF file · up to 100 MB recommended"
            maxSizeLabel="100 MB"
            label="Drop a PDF here or click to browse"
          />
        ) : (
          <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FileChip name={file.name} size={file.size} onRemove={reset} />
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {pageCount > 0
                ? `${pageCount} page${pageCount === 1 ? "" : "s"} detected`
                : "Reading page count…"}
            </p>

            <Tabs value={mode} onValueChange={(v) => setMode(v as SplitMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="each-page">Each page → separate PDF</TabsTrigger>
                <TabsTrigger value="ranges">Custom ranges</TabsTrigger>
              </TabsList>
              <TabsContent value="each-page" className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Every page becomes its own single-page PDF. Great for extracting individual
                  pages or sharing one page from a long document.
                </p>
              </TabsContent>
              <TabsContent value="ranges" className="mt-4 space-y-3">
                <Label htmlFor="split-ranges">Page ranges</Label>
                <Input
                  id="split-ranges"
                  value={rangesSpec}
                  onChange={(e) => setRangesSpec(e.target.value)}
                  placeholder="e.g. 1-3, 5, 7-9"
                  spellCheck={false}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Each comma-separated group becomes one output PDF. Use a single number for a
                  one-page group, or <code>start-end</code> for a range. Pages are 1-indexed.
                </p>
              </TabsContent>
            </Tabs>

            {mode === "each-page" && pageCount > 1 && (
              <div className="space-y-2">
                <Label htmlFor="split-zip">Output</Label>
                <Select
                  value={zipOutput ? "zip" : "separate"}
                  onValueChange={(v) => setZipOutput(v === "zip")}
                >
                  <SelectTrigger id="split-zip" className="w-full sm:w-72">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zip">Single ZIP file</SelectItem>
                    <SelectItem value="separate">Separate download buttons</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  A ZIP is the easiest way to grab {pageCount} files at once.
                </p>
              </div>
            )}

            <Button onClick={doSplit} disabled={busy || pageCount === 0} className="w-full sm:w-auto">
              <Scissors className="mr-1.5 h-4 w-4" />
              {busy ? "Splitting…" : "Split PDF"}
            </Button>

            {outputUrl && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{outputName}</p>
                    <p className="text-xs text-muted-foreground">
                      {outputs.length} piece{outputs.length === 1 ? "" : "s"} · ready to download
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      if (outputUrl) {
                        const a = document.createElement("a");
                        a.href = outputUrl;
                        a.download = outputName;
                        a.style.display = "none";
                        document.body.appendChild(a);
                        requestAnimationFrame(() => { a.click(); setTimeout(() => a.remove(), 100); });
                      } else {
                        toast.error("Nothing to download yet.");
                      }
                    }}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    {outputs.length === 1 ? "Download PDF" : "Download ZIP"}
                  </Button>
                </div>
              </div>
            )}

            {outputs.length > 1 && !zipOutput && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Download individual PDFs</p>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {outputs.map((p) => (
                    <div
                      key={p.name}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(p.size)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadBlob(p.blob, p.name)}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Upload a PDF",
        description:
          "Drag and drop a PDF onto the dropzone. The page count is read in the background so you can split confidently.",
      },
      {
        title: "Pick a split mode",
        description:
          "Use “Each page” to produce one single-page PDF per page, or “Custom ranges” to group pages (e.g. 1-3, 5, 7-9) into one file per group.",
      },
      {
        title: "Choose output",
        description:
          "When splitting every page, choose between a single ZIP file or individual download buttons. Range splits always produce one file per group.",
      },
      {
        title: "Split and download",
        description:
          "Click Split PDF — pdf-lib creates each piece locally and jszip bundles them if needed. Download the result; your file never leaves your device.",
      },
    ],
    useCases: [
      "Email a single page from a 100-page contract instead of the whole file.",
      "Break a multi-section report into chapter PDFs for separate distribution.",
      "Extract pages 5–12 of a scanned book for a focused reading set.",
      "Prepare per-student worksheets from a master PDF by splitting at known page ranges.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Encrypted or password-protected PDFs cannot be split — remove the password first.</li>
        <li>Annotations, form fields and bookmarks on the source pages are not always preserved on the extracted copies.</li>
        <li>Very large PDFs (&gt;100 MB) may take several seconds and use significant memory; consider the PDF Compress tool first.</li>
        <li>When downloading separate files, browsers may prompt for permission on each download — use the ZIP option for one-click bulk download.</li>
      </ul>
    ),
    faq: [
      {
        q: "What is the difference between Each page and Custom ranges?",
        a: "“Each page” produces N single-page PDFs from an N-page document. “Custom ranges” lets you define groups like “1-3, 5, 7-9” and produces one PDF per group — useful when you want to keep related pages together.",
      },
      {
        q: "Is my PDF uploaded somewhere?",
        a: "No. The PDF is read into browser memory only and processed with the pdf-lib library. Splitting never transmits your file to Dueneo or any third party.",
      },
      {
        q: "Why do I get a ZIP instead of individual PDFs?",
        a: "Browsers block automatic multiple downloads to prevent abuse. Bundling into a ZIP gives you all the pieces in one click. You can switch to separate download buttons in the Output selector if you prefer to grab them one by one.",
      },
      {
        q: "Can I split a PDF that has a password?",
        a: "No. pdf-lib cannot decrypt password-protected PDFs. Remove the password in your PDF viewer (or with the Password Protect PDF tool's reverse workflow) and split the unlocked copy.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
