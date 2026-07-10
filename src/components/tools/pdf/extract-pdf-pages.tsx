"use client";

import * as React from "react";
import { PDFDocument } from "pdf-lib";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip, formatBytes } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, FileOutput, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  derivedPdfName,
  downloadObjectUrl,
  isPdfFile,
  LARGE_PDF_WARN_BYTES,
  loadPdfDocument,
  MAX_PDF_BYTES,
  parsePageRanges,
  readFileAsArrayBuffer,
  replaceObjectUrl,
} from "./_pdf-helpers";

export function ExtractPdfPages({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [pageCount, setPageCount] = React.useState<number>(0);
  const [spec, setSpec] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputSize, setOutputSize] = React.useState<number>(0);
  const [outputName, setOutputName] = React.useState<string>("extracted.pdf");
  const [extractedCount, setExtractedCount] = React.useState<number>(0);

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
    setExtractedCount(0);
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
    setSpec("");
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputSize(0);
    setExtractedCount(0);
  };

  // Live preview of selected pages (without running the operation).
  const selectedPreview = React.useMemo(() => {
    if (!spec.trim() || pageCount === 0) return [] as number[];
    try {
      return parsePageRanges(spec, pageCount);
    } catch {
      return [];
    }
  }, [spec, pageCount]);

  const doExtract = async () => {
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
      const src = await loadPdfDocument(buf, { PDFDocument });

      const pageNumbers = parsePageRanges(spec, src.getPageCount());
      const indices = Array.from(new Set(pageNumbers.map((p) => p - 1)));
      if (indices.length === 0) {
        throw new Error("No pages selected for extraction.");
      }

      // Build a fresh PDF containing only the selected pages, in the
      // order they were specified (parsePageRanges preserves first-seen
      // order, so "5, 1-3" produces pages [5, 1, 2, 3]).
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, indices);
      for (const p of copied) out.addPage(p);

      const bytes = await out.save();
      const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
      setOutputUrl((prev) => replaceObjectUrl(prev, blob));
      setOutputSize(blob.size);
      setOutputName(derivedPdfName(file.name, "extracted"));
      setExtractedCount(copied.length);
      toast.success(
        `Extracted ${copied.length} page${copied.length === 1 ? "" : "s"} (${formatBytes(blob.size)}).`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setBusy(false);
    }
  };

  // Compact preview grid.
  const previewItems = React.useMemo(() => {
    if (pageCount === 0) return [];
    const selectedSet = new Set(selectedPreview);
    const items: { num: number; selected: boolean }[] = [];
    for (let i = 1; i <= pageCount; i++) {
      items.push({ num: i, selected: selectedSet.has(i) });
    }
    return items;
  }, [pageCount, selectedPreview]);

  const content: ToolContent = {
    intro:
      "Pull specific pages out of a PDF into a brand-new document — entirely in your browser. Type which pages you want (e.g. “1-3, 5, 7-9”), keep them in the order you typed, and download a clean single-PDF extract. Your original file stays untouched.",
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

            {pageCount > 0 && (
              <div className="space-y-2">
                <div className="max-h-44 overflow-y-auto rounded-md border bg-background p-2">
                  <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
                    {previewItems.map((item) => (
                      <span
                        key={item.num}
                        aria-label={`Page ${item.num}${item.selected ? " (selected)" : ""}`}
                        className={`flex h-7 items-center justify-center rounded text-[11px] font-medium ${
                          item.selected
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.num}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Highlighted pages will be extracted into the new PDF.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ext-spec">Pages to extract</Label>
              <Input
                id="ext-spec"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                placeholder={`e.g. 1-3, 5, 7-${Math.max(1, pageCount)}`}
                spellCheck={false}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Pages are 1-indexed. The extract preserves the order you type — for example,
                &ldquo;5, 1-3&rdquo; produces a PDF with pages [5, 1, 2, 3].
              </p>
            </div>

            <Button
              onClick={doExtract}
              disabled={busy || pageCount === 0 || selectedPreview.length === 0}
              className="w-full sm:w-auto"
            >
              <FileOutput className="mr-1.5 h-4 w-4" />
              {busy ? "Extracting…" : "Extract pages"}
            </Button>

            {outputUrl && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{outputName}</p>
                    <p className="text-xs text-muted-foreground">
                      {extractedCount} page{extractedCount === 1 ? "" : "s"} extracted ·{" "}
                      {formatBytes(outputSize)}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      if (!outputUrl) {
                        toast.error("Nothing to download yet.");
                        return;
                      }
                      downloadObjectUrl(outputUrl, outputName);
                    }}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Download extracted PDF
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
          "Drag and drop a PDF onto the dropzone. The page count is read in the background and a numbered grid shows every page so you can plan your extract.",
      },
      {
        title: "Enter pages to extract",
        description:
          "Type the page numbers you want to keep, like “1-3, 5, 7-9”. The grid highlights the selected pages so you can verify before extracting.",
      },
      {
        title: "Extract and download",
        description:
          "Click Extract pages — pdf-lib creates a brand-new PDF containing only the selected pages (in the order you typed them), via copyPages + addPage. Download the result; your file never leaves your device.",
      },
    ],
    useCases: [
      "Pull pages 12–18 of a long report into a focused handout for a meeting.",
      "Extract just the signature page from a multi-party contract for archival.",
      "Build a custom exam paper from a master question-bank PDF.",
      "Save the table-of-contents pages of a scanned book as a separate quick-reference file.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The extracted PDF is a fresh document — bookmarks, named destinations, form fields and
          some annotations from the source pages are not always carried over by pdf-lib&apos;s
          copyPages.
        </li>
        <li>Encrypted or password-protected PDFs cannot be extracted — remove the password first.</li>
        <li>Pages keep their original size and orientation; this tool does not resize or re-orient them.</li>
        <li>Very large PDFs (&gt;100 MB) may take several seconds to process and use significant memory.</li>
      </ul>
    ),
    faq: [
      {
        q: "What's the difference between Extract and Split?",
        a: "Split divides the entire PDF into many pieces (one per page, or one per range). Extract picks the specific pages you list and produces a single new PDF from them — leaving the rest of the document behind.",
      },
      {
        q: "Is my PDF uploaded somewhere?",
        a: "No. The PDF is read into browser memory only and processed with the pdf-lib library. Extraction happens locally; the file never leaves your device.",
      },
      {
        q: "Can I extract pages in a different order than they appear?",
        a: "Yes. The order you type is preserved — “5, 1-3” produces a PDF with pages [5, 1, 2, 3]. Useful for reordering on the fly when only a few pages are involved.",
      },
      {
        q: "Why don't my form fields work in the extracted PDF?",
        a: "pdf-lib's copyPages duplicates the page content and most annotations, but interactive AcroForm fields are tied to the document-level form dictionary. For working forms, use the merge tool on the whole source PDF instead.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
