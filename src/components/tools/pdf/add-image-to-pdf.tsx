"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import type { ToolDefinition } from "@/data/tools";
import {
  formatBytes,
  downloadBlob,
  readFileAsArrayBuffer,
  isPdfFile,
  derivedPdfName,
} from "./_pdf-helpers";

interface ImageOverlay {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  /** The embedded image bytes (PNG or JPG) */
  imageBytes: Uint8Array;
  imageType: "png" | "jpg";
  /** Object URL for preview */
  previewUrl: string;
}

let overlayIdCounter = 0;

export function AddImageToPdf({ tool }: { tool: ToolDefinition }) {
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [overlays, setOverlays] = React.useState<ImageOverlay[]>([]);
  const [processing, setProcessing] = React.useState(false);

  // Image to place
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string>("");
  const [imageWidth, setImageWidth] = React.useState(200);
  const [imageHeight, setImageHeight] = React.useState(150);
  const [rotation, setRotation] = React.useState(0);
  const [opacity, setOpacity] = React.useState(1);

  const onPdfFiles = React.useCallback(async (files: { file: File }[]) => {
    if (!files.length) return;
    const f = files[0].file;
    if (!isPdfFile(f)) {
      toast.error("Please choose a PDF file.");
      return;
    }
    setPdfFile(f);
    setOverlays([]);
    try {
      const buf = await readFileAsArrayBuffer(f);
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      setPageCount(doc.getPageCount());
      setCurrentPage(0);
      toast.success(`Loaded ${doc.getPageCount()}-page PDF`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read this PDF.");
      setPdfFile(null);
    }
  }, []);

  const onImageFiles = React.useCallback(async (files: { file: File }[]) => {
    if (!files.length) return;
    const f = files[0].file;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG or JPG).");
      return;
    }
    setImageFile(f);
    const url = URL.createObjectURL(f);
    setImagePreview(url);
    toast.success(`Image loaded: ${f.name}`);
  }, []);

  React.useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleClick = React.useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      if (!imageFile) {
        toast.error("Upload an image first.");
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const containerWidth = rect.width;
      const containerHeight = rect.height;
      const pdfWidth = 612;
      const pdfHeight = 792;
      const scaleX = pdfWidth / containerWidth;
      const scaleY = pdfHeight / containerHeight;
      const pdfX = (clickX - imageWidth * scaleX / 2) * scaleX;
      const pdfY = (containerHeight - clickY - imageHeight * scaleY / 2) * scaleY;

      // Read image bytes
      const buf = await readFileAsArrayBuffer(imageFile);
      const imageBytes = new Uint8Array(buf);
      const isPng = imageFile.type === "image/png" || imageFile.name.toLowerCase().endsWith(".png");
      const isJpg = imageFile.type === "image/jpeg" || imageFile.name.toLowerCase().endsWith(".jpg") || imageFile.name.toLowerCase().endsWith(".jpeg");
      if (!isPng && !isJpg) {
        toast.error("Only PNG and JPG images are supported.");
        return;
      }

      setOverlays((prev) => [
        ...prev,
        {
          id: `img-${++overlayIdCounter}`,
          pageIndex: currentPage,
          x: pdfX,
          y: pdfY,
          width: imageWidth * scaleX,
          height: imageHeight * scaleY,
          rotation,
          opacity,
          imageBytes,
          imageType: isPng ? "png" : "jpg",
          previewUrl: imagePreview,
        },
      ]);
      toast.success("Image placed. Click again to add more, or download the PDF.");
    },
    [imageFile, imageWidth, imageHeight, rotation, opacity, currentPage, imagePreview]
  );

  const removeOverlay = (id: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
  };

  const applyAndDownload = async () => {
    if (!pdfFile) return;
    setProcessing(true);
    try {
      const buf = await readFileAsArrayBuffer(pdfFile);
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = doc.getPages();

      for (const overlay of overlays) {
        const page = pages[overlay.pageIndex];
        if (!page) continue;
        const img = overlay.imageType === "png"
          ? await doc.embedPng(overlay.imageBytes)
          : await doc.embedJpg(overlay.imageBytes);
        page.drawImage(img, {
          x: overlay.x,
          y: overlay.y,
          width: overlay.width,
          height: overlay.height,
          opacity: overlay.opacity,
          rotate: degrees(overlay.rotation),
        });
      }

      const out = await doc.save();
      downloadBlob(new Blob([out as BlobPart], { type: "application/pdf" }), derivedPdfName(pdfFile.name, "-image-added"));
      toast.success(`PDF saved with ${overlays.length} image overlay(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to process PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setPdfFile(null);
    setOverlays([]);
    setPageCount(0);
    setCurrentPage(0);
  };

  const currentOverlays = overlays.filter((o) => o.pageIndex === currentPage);

  const content: ToolContent = {
    intro:
      "Place an image (logo, photo, signature, stamp) on any page of an existing PDF. Click on the page to position the image. Adjust size, rotation and opacity. All processing happens in your browser — your files are never uploaded.",
    tool: (
      <div className="space-y-5">
        {!pdfFile ? (
          <Dropzone
            accept="application/pdf,.pdf"
            onFiles={onPdfFiles}
            hint="Drop a PDF here or click to browse"
            maxSizeLabel="250 MB"
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
              <div>
                <p className="text-sm font-medium">{pdfFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(pdfFile.size)} · {pageCount} page{pageCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={reset}>Reset</Button>
                <Button
                  size="sm"
                  onClick={applyAndDownload}
                  disabled={overlays.length === 0 || processing}
                >
                  {processing ? "Processing…" : `Download PDF (${overlays.length})`}
                </Button>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
              {/* Settings */}
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium">Image to place</Label>
                  <div className="mt-1">
                    {!imageFile ? (
                      <Dropzone
                        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                        onFiles={onImageFiles}
                        hint="PNG or JPG"
                        maxSizeLabel="50 MB"
                      />
                    ) : (
                      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                        <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{imageFile.name}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(imageFile.size)}</p>
                          <button
                            onClick={() => { setImageFile(null); setImagePreview(""); }}
                            className="mt-1 text-xs text-destructive hover:underline"
                          >
                            Change image
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium">Page</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}>← Prev</Button>
                    <span className="text-sm">Page {currentPage + 1} of {pageCount}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(pageCount - 1, p + 1))} disabled={currentPage >= pageCount - 1}>Next →</Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium">Width: {imageWidth}px</Label>
                  <Slider className="mt-2" min={20} max={500} step={1} value={[imageWidth]} onValueChange={(v) => setImageWidth(v[0])} />
                </div>
                <div>
                  <Label className="text-xs font-medium">Height: {imageHeight}px</Label>
                  <Slider className="mt-2" min={20} max={500} step={1} value={[imageHeight]} onValueChange={(v) => setImageHeight(v[0])} />
                </div>
                <div>
                  <Label className="text-xs font-medium">Rotation: {rotation}°</Label>
                  <Slider className="mt-2" min={0} max={359} step={1} value={[rotation]} onValueChange={(v) => setRotation(v[0])} />
                </div>
                <div>
                  <Label className="text-xs font-medium">Opacity: {Math.round(opacity * 100)}%</Label>
                  <Slider className="mt-2" min={0} max={100} step={1} value={[Math.round(opacity * 100)]} onValueChange={(v) => setOpacity(v[0] / 100)} />
                </div>

                {currentOverlays.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="mb-2 text-xs font-medium">Images on this page ({currentOverlays.length})</p>
                    <div className="max-h-40 space-y-1 overflow-y-auto scrollbar-thin">
                      {currentOverlays.map((o, i) => (
                        <div key={o.id} className="flex items-center justify-between gap-2 rounded bg-background px-2 py-1 text-xs">
                          <span>Image {i + 1}</span>
                          <button onClick={() => removeOverlay(o.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Click on the page to place the image.</p>
                <div
                  onClick={handleClick}
                  className="relative mx-auto flex cursor-crosshair items-center justify-center rounded-lg border-2 border-dashed bg-slate-200 p-4"
                  style={{ aspectRatio: "612 / 792", maxWidth: "500px" }}
                >
                  <div className="absolute inset-4 rounded bg-white shadow-inner">
                    {currentOverlays.map((o) => {
                      const containerWidth = 468;
                      const containerHeight = 744;
                      const scaleX = containerWidth / 612;
                      const scaleY = containerHeight / 792;
                      const left = o.x * scaleX;
                      const top = (792 - o.y - o.height) * scaleY;
                      return (
                        <div
                          key={o.id}
                          className="absolute"
                          style={{
                            left: `${left}px`,
                            top: `${top}px`,
                            width: `${o.width * scaleX}px`,
                            height: `${o.height * scaleY}px`,
                            transform: `rotate(${o.rotation}deg)`,
                            transformOrigin: "top left",
                            opacity: o.opacity,
                          }}
                        >
                          <img src={o.previewUrl} alt="Overlay" className="h-full w-full object-contain" />
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
      { title: "Upload a PDF", description: "Drag and drop a PDF file, or click to browse." },
      { title: "Upload an image", description: "Choose a PNG or JPG image to place on the PDF." },
      { title: "Adjust size, rotation and opacity", description: "Use the sliders to set the image dimensions, rotation and opacity." },
      { title: "Click on the page", description: "Click on the page preview where you want the image to appear. Add as many images as you need." },
      { title: "Download the PDF", description: "Click 'Download PDF' to save the modified PDF with all your image overlays." },
    ],
    useCases: [
      "Add a logo or watermark to a PDF.",
      "Place a signature image on a contract or form.",
      "Add a stamp or seal to an official document.",
      "Insert a photo into a PDF report.",
      "Overlay a QR code on a PDF.",
    ],
    limitations: (
      <p>
        This tool supports PNG and JPG images only. The image is placed on top
        of existing PDF content — it cannot replace images already in the PDF.
        For transparency, use PNG with an alpha channel. Very large images may
        increase the final PDF size significantly.
      </p>
    ),
    faq: [
      { q: "Is my PDF or image uploaded?", a: "No. All processing happens in your browser. Your PDF and image files never leave your device." },
      { q: "What image formats are supported?", a: "PNG and JPG. PNG supports transparency (alpha channel) so you can place logos with transparent backgrounds." },
      { q: "Can I place multiple images?", a: "Yes. Click on the page multiple times to place the same image in different positions. You can also change pages and place images on each page." },
      { q: "Can I rotate or fade the image?", a: "Yes. Use the rotation slider (0-359°) and opacity slider (0-100%) before clicking to place the image." },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
