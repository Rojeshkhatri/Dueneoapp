"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import type { ToolDefinition } from "@/data/tools";
import {
  formatBytes,
  downloadBlob,
  readFileAsArrayBuffer,
  isPdfFile,
  derivedPdfName,
  hexToRgb01,
} from "./_pdf-helpers";

interface TextOverlay {
  id: string;
  text: string;
  pageIndex: number;
  /** X in PDF coordinates (from bottom-left) */
  x: number;
  /** Y in PDF coordinates (from bottom-left) */
  y: number;
  fontSize: number;
  color: string; // hex
  rotation: number; // degrees
}

let overlayIdCounter = 0;

export function AddTextToPdf({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [overlays, setOverlays] = React.useState<TextOverlay[]>([]);
  const [processing, setProcessing] = React.useState(false);

  // Settings for the next text overlay
  const [text, setText] = React.useState("Type your text here");
  const [fontSize, setFontSize] = React.useState(24);
  const [color, setColor] = React.useState("#dc2626");
  const [rotation, setRotation] = React.useState(0);

  const previewRef = React.useRef<HTMLDivElement>(null);

  const onFiles = React.useCallback(async (files: { file: File }[]) => {
    if (!files.length) return;
    const f = files[0].file;
    if (!isPdfFile(f)) {
      toast.error("Please choose a PDF file.");
      return;
    }
    setFile(f);
    setOverlays([]);
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

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!text.trim()) {
        toast.error("Type some text first.");
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      // Convert to PDF coordinates (bottom-left origin).
      // The preview is scaled to fit the container, so we need to convert
      // from display coordinates to PDF coordinates.
      // PDF pages are typically 612x792 points (US Letter) or 595x842 (A4).
      // We render at a scale where width = container width.
      const containerWidth = rect.width;
      const containerHeight = rect.height;
      // Assume the preview maintains the PDF's aspect ratio.
      // We'll use a standard US Letter size (612x792) as the reference.
      const pdfWidth = 612;
      const pdfHeight = 792;
      const scaleX = pdfWidth / containerWidth;
      const scaleY = pdfHeight / containerHeight;
      const pdfX = clickX * scaleX;
      const pdfY = (containerHeight - clickY) * scaleY; // flip Y
      // Adjust for text baseline (subtract font size so text appears above click)
      const adjustedY = pdfY - fontSize / 2;

      setOverlays((prev) => [
        ...prev,
        {
          id: `overlay-${++overlayIdCounter}`,
          text: text.trim(),
          pageIndex: currentPage,
          x: pdfX,
          y: adjustedY,
          fontSize,
          color,
          rotation,
        },
      ]);
      toast.success("Text added. Click again to add more, or download the PDF.");
    },
    [text, fontSize, color, rotation, currentPage]
  );

  const removeOverlay = (id: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
  };

  const applyAndDownload = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const buf = await readFileAsArrayBuffer(file);
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();

      for (const overlay of overlays) {
        const page = pages[overlay.pageIndex];
        if (!page) continue;
        const [r, g, b] = hexToRgb01(overlay.color);
        page.drawText(overlay.text, {
          x: overlay.x,
          y: overlay.y,
          size: overlay.fontSize,
          font,
          color: rgb(r, g, b),
          rotate: degrees(overlay.rotation),
        });
      }

      const out = await doc.save();
      downloadBlob(new Blob([out as BlobPart], { type: "application/pdf" }), derivedPdfName(file.name, "-text-added"));
      toast.success(`PDF saved with ${overlays.length} text overlay(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to process PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setOverlays([]);
    setPageCount(0);
    setCurrentPage(0);
  };

  const currentOverlays = overlays.filter((o) => o.pageIndex === currentPage);

  const content: ToolContent = {
    intro:
      "Add text to any page of an existing PDF. Click on the page where you want text to appear, then download the modified PDF. Choose font size, colour and rotation. All processing happens in your browser — your PDF is never uploaded.",
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
                  disabled={overlays.length === 0 || processing}
                >
                  {processing ? "Processing…" : `Download PDF (${overlays.length} overlay${overlays.length !== 1 ? "s" : ""})`}
                </Button>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
              {/* Settings */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="atp-text" className="text-xs font-medium">Text to add</Label>
                  <Textarea
                    id="atp-text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    className="mt-1 resize-none text-sm"
                    placeholder="Type the text you want to place on the PDF"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium">Page</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      ← Prev
                    </Button>
                    <span className="text-sm">
                      Page {currentPage + 1} of {pageCount}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(pageCount - 1, p + 1))}
                      disabled={currentPage >= pageCount - 1}
                    >
                      Next →
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium">Font size: {fontSize}px</Label>
                  <Slider
                    className="mt-2"
                    min={8}
                    max={72}
                    step={1}
                    value={[fontSize]}
                    onValueChange={(v) => setFontSize(v[0])}
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium">Colour</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border"
                    />
                    <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono text-xs" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium">Rotation: {rotation}°</Label>
                  <Slider
                    className="mt-2"
                    min={0}
                    max={359}
                    step={1}
                    value={[rotation]}
                    onValueChange={(v) => setRotation(v[0])}
                  />
                </div>

                {currentOverlays.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="mb-2 text-xs font-medium">Text on this page ({currentOverlays.length})</p>
                    <div className="max-h-40 space-y-1 overflow-y-auto scrollbar-thin">
                      {currentOverlays.map((o) => (
                        <div key={o.id} className="flex items-center justify-between gap-2 rounded bg-background px-2 py-1 text-xs">
                          <span className="truncate" style={{ color: o.color }}>“{o.text}”</span>
                          <button
                            onClick={() => removeOverlay(o.id)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div>
                <p className="mb-2 text-xs text-muted-foreground">
                  Click on the page to place the text. The text appears at the position you click.
                </p>
                <div
                  ref={previewRef}
                  onClick={handleClick}
                  className="relative mx-auto flex cursor-crosshair items-center justify-center rounded-lg border-2 border-dashed bg-slate-200 p-4"
                  style={{ aspectRatio: "612 / 792", maxWidth: "500px" }}
                >
                  <div className="absolute inset-4 rounded bg-white shadow-inner">
                    {/* Show overlays as positioned text */}
                    {currentOverlays.map((o) => {
                      const containerWidth = 468; // approx inner width
                      const containerHeight = 744;
                      const scaleX = containerWidth / 612;
                      const scaleY = containerHeight / 792;
                      const left = o.x * scaleX;
                      const top = (792 - o.y - o.fontSize) * scaleY;
                      return (
                        <div
                          key={o.id}
                          className="absolute select-none"
                          style={{
                            left: `${left}px`,
                            top: `${top}px`,
                            fontSize: `${o.fontSize * scaleX}px`,
                            color: o.color,
                            transform: `rotate(${o.rotation}deg)`,
                            transformOrigin: "top left",
                            fontFamily: "Helvetica, Arial, sans-serif",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {o.text}
                        </div>
                      );
                    })}
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <span className="text-sm">Page {currentPage + 1}</span>
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
      { title: "Type your text", description: "Enter the text you want to add in the text box on the left." },
      { title: "Choose font size and colour", description: "Adjust the font size slider and pick a colour. Set rotation if needed." },
      { title: "Click on the page", description: "Click on the page preview where you want the text to appear. Add as many text overlays as you need across multiple pages." },
      { title: "Download the PDF", description: "Click 'Download PDF' to save the modified PDF with all your text overlays." },
    ],
    useCases: [
      "Add annotations or notes to a PDF document.",
      "Fill in PDF forms that aren't true fillable forms.",
      "Add dates, signatures, or stamps to a PDF.",
      "Label or tag pages in a PDF.",
      "Write on a PDF without needing Adobe Acrobat.",
    ],
    limitations: (
      <p>
        This tool adds new text on top of existing PDF content — it cannot
        edit or replace text that is already in the PDF. The text uses the
        Helvetica font. For precise positioning, the preview is an
        approximation; the final PDF may differ slightly depending on the
        original page size. Very large PDFs (over 100MB) may be slow to process.
      </p>
    ),
    faq: [
      { q: "Is my PDF uploaded to a server?", a: "No. Your PDF is processed entirely in your browser using the pdf-lib library. It is never uploaded to Dueneo or any third party." },
      { q: "Can I edit existing text in the PDF?", a: "No. This tool adds new text on top of the existing content. It cannot find, modify, or delete text that is already in the PDF." },
      { q: "What font is used?", a: "Helvetica, which is one of the standard 14 PDF fonts. If you need a custom font, consider using the watermark tool instead." },
      { q: "Can I add text to multiple pages?", a: "Yes. Use the page navigation buttons to move between pages, then click to place text on each page. All overlays are saved when you download." },
      { q: "How accurate is the positioning?", a: "The preview is an approximation. The final position in the downloaded PDF should be very close, but may vary slightly if the original PDF uses a non-standard page size." },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
