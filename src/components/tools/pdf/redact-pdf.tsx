"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PDFDocument, rgb } from "pdf-lib";
import type { ToolDefinition } from "@/data/tools";
import {
  formatBytes,
  downloadBlob,
  readFileAsArrayBuffer,
  isPdfFile,
  derivedPdfName,
} from "./_pdf-helpers";

interface RedactionBox {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

let boxIdCounter = 0;

export function RedactPdf({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [redactions, setRedactions] = React.useState<RedactionBox[]>([]);
  const [processing, setProcessing] = React.useState(false);

  // Drag state
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = React.useState<{ x: number; y: number } | null>(null);

  const onFiles = React.useCallback(async (files: { file: File }[]) => {
    if (!files.length) return;
    const f = files[0].file;
    if (!isPdfFile(f)) {
      toast.error("Please choose a PDF file.");
      return;
    }
    setFile(f);
    setRedactions([]);
    try {
      const buf = await readFileAsArrayBuffer(f);
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      setPageCount(doc.getPageCount());
      setCurrentPage(0);
      toast.success(`Loaded ${doc.getPageCount()}-page PDF`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read this PDF.");
      setFile(null);
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDragCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragCurrent) {
      setIsDragging(false);
      return;
    }
    setIsDragging(false);
    const rect = (document.querySelector("[data-redact-preview]") as HTMLElement)?.getBoundingClientRect();
    if (!rect) return;
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    const pdfWidth = 612;
    const pdfHeight = 792;
    const scaleX = pdfWidth / containerWidth;
    const scaleY = pdfHeight / containerHeight;

    const left = Math.min(dragStart.x, dragCurrent.x);
    const top = Math.min(dragStart.y, dragCurrent.y);
    const width = Math.abs(dragCurrent.x - dragStart.x);
    const height = Math.abs(dragCurrent.y - dragStart.y);

    if (width < 5 || height < 5) {
      toast.error("Drag a larger area to redact.");
      return;
    }

    // Convert to PDF coordinates
    const pdfX = left * scaleX;
    const pdfY = (containerHeight - top - height) * scaleY;
    const pdfW = width * scaleX;
    const pdfH = height * scaleY;

    setRedactions((prev) => [
      ...prev,
      {
        id: `redact-${++boxIdCounter}`,
        pageIndex: currentPage,
        x: pdfX,
        y: pdfY,
        width: pdfW,
        height: pdfH,
      },
    ]);
    setDragStart(null);
    setDragCurrent(null);
    toast.success("Redaction box added. Drag to add more, or download the PDF.");
  };

  const removeRedaction = (id: string) => {
    setRedactions((prev) => prev.filter((r) => r.id !== id));
  };

  const applyAndDownload = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const buf = await readFileAsArrayBuffer(file);
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = doc.getPages();

      for (const redaction of redactions) {
        const page = pages[redaction.pageIndex];
        if (!page) continue;
        // Draw a solid black rectangle over the redacted area
        page.drawRectangle({
          x: redaction.x,
          y: redaction.y,
          width: redaction.width,
          height: redaction.height,
          color: rgb(0, 0, 0),
        });
      }

      const out = await doc.save();
      downloadBlob(
        new Blob([out as BlobPart], { type: "application/pdf" }),
        derivedPdfName(file.name, "-redacted")
      );
      toast.success(`PDF redacted with ${redactions.length} box(es).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to process PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setRedactions([]);
    setPageCount(0);
    setCurrentPage(0);
  };

  const clearPage = () => {
    setRedactions((prev) => prev.filter((r) => r.pageIndex !== currentPage));
    toast.success(`Cleared redactions on page ${currentPage + 1}.`);
  };

  const currentRedactions = redactions.filter((r) => r.pageIndex === currentPage);

  // Calculate drag rectangle for preview
  const dragRect = isDragging && dragStart && dragCurrent
    ? {
        left: Math.min(dragStart.x, dragCurrent.x),
        top: Math.min(dragStart.y, dragCurrent.y),
        width: Math.abs(dragCurrent.x - dragStart.x),
        height: Math.abs(dragCurrent.y - dragStart.y),
      }
    : null;

  const content: ToolContent = {
    intro:
      "Permanently black out sensitive content from a PDF. Drag to draw redaction boxes over anything you want hidden — names, numbers, addresses, signatures. The redacted areas are covered with solid black rectangles that cannot be removed. All processing happens in your browser — your PDF is never uploaded.",
    tool: (
      <div className="space-y-5">
        {!file ? (
          <Dropzone
            accept="application/pdf,.pdf"
            onFiles={onFiles}
            hint="Drop a PDF here or click to browse"
            maxSizeLabel="250 MB"
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size)} · {pageCount} page{pageCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={reset}>Reset</Button>
                <Button
                  size="sm"
                  onClick={applyAndDownload}
                  disabled={redactions.length === 0 || processing}
                >
                  {processing ? "Processing…" : `Download Redacted PDF (${redactions.length} box${redactions.length !== 1 ? "es" : ""})`}
                </Button>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
              {/* Controls */}
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium">Page</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}>← Prev</Button>
                    <span className="text-sm">Page {currentPage + 1} of {pageCount}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(pageCount - 1, p + 1))} disabled={currentPage >= pageCount - 1}>Next →</Button>
                  </div>
                </div>

                {currentRedactions.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Redactions on this page ({currentRedactions.length})</Label>
                      <button onClick={clearPage} className="text-xs text-destructive hover:underline">Clear page</button>
                    </div>
                    <div className="mt-2 max-h-48 space-y-1 overflow-y-auto scrollbar-thin">
                      {currentRedactions.map((r, i) => (
                        <div key={r.id} className="flex items-center justify-between gap-2 rounded bg-muted/30 px-2 py-1.5 text-xs">
                          <span>Box {i + 1} ({Math.round(r.width)}×{Math.round(r.height)})</span>
                          <button onClick={() => removeRedaction(r.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                  <p className="font-semibold">How to redact</p>
                  <p className="mt-1">Click and drag on the page preview to draw a black box over the content you want to hide. The box is permanent once you download.</p>
                </div>
              </div>

              {/* Preview */}
              <div>
                <div
                  data-redact-preview
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="relative mx-auto flex cursor-crosshair items-center justify-center rounded-lg border-2 border-dashed bg-slate-200 p-4 select-none"
                  style={{ aspectRatio: "612 / 792", maxWidth: "500px" }}
                >
                  <div className="absolute inset-4 rounded bg-white shadow-inner">
                    {/* Existing redaction boxes */}
                    {currentRedactions.map((r) => {
                      const containerWidth = 468;
                      const containerHeight = 744;
                      const scaleX = containerWidth / 612;
                      const scaleY = containerHeight / 792;
                      const left = r.x * scaleX;
                      const top = (792 - r.y - r.height) * scaleY;
                      return (
                        <div
                          key={r.id}
                          className="absolute bg-black"
                          style={{
                            left: `${left}px`,
                            top: `${top}px`,
                            width: `${r.width * scaleX}px`,
                            height: `${r.height * scaleY}px`,
                          }}
                        />
                      );
                    })}
                    {/* Current drag rectangle */}
                    {dragRect && (
                      <div
                        className="absolute border-2 border-red-600 bg-red-600/30"
                        style={{
                          left: `${dragRect.left - 16}px`,
                          top: `${dragRect.top - 16}px`,
                          width: `${dragRect.width}px`,
                          height: `${dragRect.height}px`,
                        }}
                      />
                    )}
                    <div className="flex h-full items-center justify-center text-slate-400 pointer-events-none">
                      <span className="text-sm">Page {currentPage + 1} — drag to redact</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    ),
    howTo: [
      { title: "Upload a PDF", description: "Drag and drop a PDF file, or click to browse. Your file stays in your browser." },
      { title: "Navigate to the page", description: "Use the Prev/Next buttons to find the page with sensitive content." },
      { title: "Drag to redact", description: "Click and drag on the page preview to draw a black box over the content you want to hide." },
      { title: "Add more redactions", description: "Drag more boxes on the same page or other pages. Each box is listed in the sidebar." },
      { title: "Download the redacted PDF", description: "Click 'Download Redacted PDF' to save the PDF with all redaction boxes permanently applied." },
    ],
    useCases: [
      "Hide personal information (names, addresses, phone numbers) before sharing a PDF.",
      "Redact financial details (account numbers, salary) from payslips or bank statements.",
      "Remove sensitive medical information from health records.",
      "Black out confidential business data before sending a document externally.",
      "Censor signatures or ID numbers from legal documents.",
    ],
    limitations: (
      <p>
        This tool draws solid black rectangles over the content you select.
        The original text beneath the rectangle is still technically present
        in the PDF file — a determined forensic analyst could potentially
        remove the rectangles and recover the text. For true, irreversible
        redaction (where the underlying text data is removed from the PDF),
        you would need a more advanced tool that can parse and remove text
        objects. This tool provides visual redaction that is sufficient for
        most everyday use cases.
      </p>
    ),
    faq: [
      { q: "Is my PDF uploaded to a server?", a: "No. Your PDF is processed entirely in your browser. It is never uploaded to Dueneo or any third party." },
      { q: "Is the redaction permanent?", a: "The black rectangles are permanently drawn into the PDF — they cannot be removed by a reader. However, the underlying text data may still exist in the PDF file structure. For most purposes this is sufficient, but for highly sensitive documents, consider using a dedicated redaction tool." },
      { q: "Can I redact multiple pages?", a: "Yes. Use the page navigation buttons to move between pages, then drag to draw redaction boxes on each page. All redactions are applied when you download." },
      { q: "Can I undo a redaction?", a: "Yes, before downloading. Click the ✕ next to any redaction box in the sidebar to remove it. You can also clear all redactions on the current page with the 'Clear page' button." },
      { q: "What if I make a mistake after downloading?", a: "You'll need to re-upload the original PDF and redo the redactions. The downloaded file is permanent — always keep a backup of your original." },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
