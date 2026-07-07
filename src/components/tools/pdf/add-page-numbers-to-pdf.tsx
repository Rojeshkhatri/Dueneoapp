"use client";

import * as React from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Download, Hash, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  isPdfFile,
  LARGE_PDF_WARN_BYTES,
  loadPdfDocument,
  MAX_PDF_BYTES,
  POSITION_OPTIONS,
  positionForPdfPoint,
  readFileAsArrayBuffer,
  type Position,
} from "./_pdf-helpers";

type Format = "num" | "num-of-n" | "page-num" | "page-num-of-n" | "dash-num";

const FORMAT_OPTIONS: { value: Format; label: string; sample: (n: number, total: number) => string }[] = [
  { value: "num", label: "1", sample: (n) => String(n) },
  { value: "num-of-n", label: "1 of N", sample: (n, total) => `${n} of ${total}` },
  { value: "page-num", label: "Page 1", sample: (n) => `Page ${n}` },
  { value: "page-num-of-n", label: "Page 1 of N", sample: (n, total) => `Page ${n} of ${total}` },
  { value: "dash-num", label: "- 1 -", sample: (n) => `- ${n} -` },
];

export function AddPageNumbersToPdf({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [pageCount, setPageCount] = React.useState<number>(0);
  const [position, setPosition] = React.useState<Position>("bottom-center");
  const [format, setFormat] = React.useState<Format>("num");
  const [fontSize, setFontSize] = React.useState<number>(12);
  const [startAt, setStartAt] = React.useState<number>(1);
  const [margin, setMargin] = React.useState<number>(36); // 0.5 inch in PDF points
  const [busy, setBusy] = React.useState(false);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputSize, setOutputSize] = React.useState<number>(0);
  const [outputName, setOutputName] = React.useState<string>("numbered.pdf");

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
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputSize(0);
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
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputSize(0);
  };

  const baseName = (file?.name ?? "document.pdf").replace(/\.pdf$/i, "");

  const doNumber = async () => {
    if (!file) {
      toast.error("Please upload a PDF first.");
      return;
    }
    if (pageCount === 0) {
      toast.error("The PDF has no pages.");
      return;
    }
    setBusy(true);
    try {
      const buf = await readFileAsArrayBuffer(file);
      const doc = await loadPdfDocument(buf, { PDFDocument });
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      const total = pages.length;
      const formatter = FORMAT_OPTIONS.find((f) => f.value === format)!;
      const startNum = Math.max(1, Math.floor(startAt));

      pages.forEach((page, idx) => {
        const displayNum = startNum + idx;
        const text = formatter.sample(displayNum, total);
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);
        const pageW = page.getWidth();
        const pageH = page.getHeight();
        const [x, y] = positionForPdfPoint(
          position,
          pageW,
          pageH,
          textWidth,
          textHeight,
          margin
        );
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      });

      const out = await doc.save();
      const blob = new Blob([out], { type: "application/pdf" });
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(URL.createObjectURL(blob));
      setOutputSize(blob.size);
      setOutputName(`${baseName}-numbered.pdf`);
      toast.success(`Added page numbers to ${total} pages (${formatBytes(blob.size)}).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add page numbers.");
    } finally {
      setBusy(false);
    }
  };

  // Live preview of the format on a sample page.
  const previewN = Math.max(1, Math.floor(startAt));
  const previewText = FORMAT_OPTIONS.find((f) => f.value === format)!.sample(
    previewN,
    pageCount > 0 ? pageCount : 5
  );

  const content: ToolContent = {
    intro:
      "Add page numbers to every page of a PDF — entirely in your browser. Pick from nine positions, five number formats, adjust the font size and margin, set a starting page number, then download the result. Your file never leaves your device.",
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

            {pageCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {pageCount} page{pageCount === 1 ? "" : "s"} detected
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pn-position">Position</Label>
                <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                  <SelectTrigger id="pn-position" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pn-format">Format</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
                  <SelectTrigger id="pn-format" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pn-fontsize">Font size</Label>
                  <span className="text-xs font-medium text-muted-foreground">{fontSize}pt</span>
                </div>
                <Slider
                  id="pn-fontsize"
                  value={[fontSize]}
                  min={6}
                  max={36}
                  step={1}
                  onValueChange={(v) => setFontSize(v[0] ?? 12)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pn-margin">Margin</Label>
                  <span className="text-xs font-medium text-muted-foreground">
                    {margin}pt ({(margin / 72).toFixed(2)}″)
                  </span>
                </div>
                <Slider
                  id="pn-margin"
                  value={[margin]}
                  min={0}
                  max={108}
                  step={1}
                  onValueChange={(v) => setMargin(v[0] ?? 36)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pn-start">Starting page number</Label>
                <Input
                  id="pn-start"
                  type="number"
                  min={1}
                  value={startAt}
                  onChange={(e) => setStartAt(parseInt(e.target.value, 10) || 1)}
                />
                <p className="text-xs text-muted-foreground">
                  Use this to continue numbering across a multi-volume set.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Live preview</Label>
                <div className="flex h-10 items-center justify-center rounded-md border bg-background text-sm">
                  {previewText}
                </div>
                <p className="text-xs text-muted-foreground">
                  Shown for page {previewN}.
                </p>
              </div>
            </div>

            <Button onClick={doNumber} disabled={busy || pageCount === 0} className="w-full sm:w-auto">
              <Hash className="mr-1.5 h-4 w-4" />
              {busy ? "Adding page numbers…" : "Add page numbers"}
            </Button>

            {outputUrl && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{outputName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(outputSize)} · ready to download
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      if (!outputUrl) {
                        toast.error("Nothing to download yet.");
                        return;
                      }
                      const a = document.createElement("a");
                      a.href = outputUrl;
                      a.download = outputName;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Download numbered PDF
                  </Button>
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
          "Drag and drop a PDF onto the dropzone. The page count is read in the background so you can confirm it before numbering.",
      },
      {
        title: "Pick position, format and font",
        description:
          "Choose one of nine positions on the page, one of five number formats (1, 1 of N, Page 1, Page 1 of N, - 1 -), a font size and a margin.",
      },
      {
        title: "Set a starting number (optional)",
        description:
          "If this PDF is part of a larger set, set the starting number to continue from where the previous document left off.",
      },
      {
        title: "Add and download",
        description:
          "Click the Add page numbers button — pdf-lib draws the text on every page locally. Download the result; your file never leaves your device.",
      },
    ],
    useCases: [
      "Number the pages of a scanned contract before printing and signing.",
      "Continue page numbers across a multi-volume report so cross-references line up.",
      "Add “Page X of Y” footers to a slide-deck PDF exported from a presentation tool.",
      "Stamp bottom-centre numbers on a print-ready manuscript.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Numbers are drawn as plain text in Helvetica — the original page content is otherwise unchanged.</li>
        <li>Existing page numbers in the source PDF are not detected or removed; this tool only adds new ones.</li>
        <li>Very small margins may push numbers off the edge of pages with non-standard crop boxes; use 0.25″ or larger for safety.</li>
        <li>Encrypted or password-protected PDFs cannot be processed — remove the password first.</li>
      </ul>
    ),
    faq: [
      {
        q: "Can I number only some of the pages?",
        a: "This tool numbers every page. To skip pages (e.g. cover or back matter), split the PDF first, number the relevant part, then merge the pieces back together.",
      },
      {
        q: "Is my PDF uploaded somewhere?",
        a: "No. The PDF is read into browser memory only and edited with the pdf-lib library. Page numbers are drawn locally; the file never leaves your device.",
      },
      {
        q: "Why are my numbers cut off at the edge?",
        a: "Increase the Margin setting. The default 0.5″ margin works for most pages, but pages with unusual crop boxes may need a larger value.",
      },
      {
        q: "Can I use a different font or colour?",
        a: "The current build uses Helvetica in black for maximum compatibility. Custom fonts require embedding a TTF/OTF file, which is not yet exposed in the UI.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
