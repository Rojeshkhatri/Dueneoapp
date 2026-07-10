"use client";

import * as React from "react";
import { PDFDocument } from "pdf-lib";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, type DropzoneFile, FileChip, formatBytes } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, RotateCcw, FileImage } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  imageFileToPdfEmbeddable,
  LARGE_PDF_WARN_BYTES,
  MAX_PDF_BYTES,
} from "./_pdf-helpers";

type PageSize = "fit" | "a4" | "letter";

const PAGE_SIZE_OPTIONS: { value: PageSize; label: string; w: number; h: number }[] = [
  { value: "fit", label: "Fit to image (1 image per page)", w: 0, h: 0 },
  { value: "a4", label: "A4 portrait (595 × 842 pt)", w: 595, h: 842 },
  { value: "letter", label: "US Letter portrait (612 × 792 pt)", w: 612, h: 792 },
];

interface ImageItem {
  id: string;
  file: File;
  width: number;
  height: number;
}

const ACCEPT_BY_SLUG: Record<string, string> = {
  "image-to-pdf": "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
  "jpg-to-pdf": "image/jpeg,.jpg,.jpeg",
  "png-to-pdf": "image/png,.png",
};

const INTRO_BY_SLUG: Record<string, string> = {
  "image-to-pdf":
    "Convert one or more JPG, PNG or WebP images into a single PDF document — one image per page — entirely in your browser. Drag and drop your files, reorder them, and download the result. Your images never leave your device.",
  "jpg-to-pdf":
    "Convert JPG or JPEG images into a single PDF document — one image per page — entirely in your browser. Drag and drop your files, reorder them, and download the result. Your images never leave your device.",
  "png-to-pdf":
    "Convert PNG images into a single PDF document — one image per page — entirely in your browser. Drag and drop your files, reorder them, and download the result. Your images never leave your device.",
};

function isAcceptedImage(file: File, slug: string): boolean {
  const isJpg = /^image\/jpe?g$/i.test(file.type) || /\.jpe?g$/i.test(file.name);
  const isPng = file.type === "image/png" || /\.png$/i.test(file.name);
  if (slug === "jpg-to-pdf") return isJpg;
  if (slug === "png-to-pdf") return isPng;
  // image-to-pdf accepts any raster image the browser can decode.
  return (
    /^image\//.test(file.type) || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name)
  );
}

export function ImageToPdf({ tool }: { tool: ToolDefinition }) {
  const slug = tool.slug;
  const [items, setItems] = React.useState<ImageItem[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [pageSize, setPageSize] = React.useState<PageSize>("fit");
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputSize, setOutputSize] = React.useState<number>(0);
  const [outputName, setOutputName] = React.useState<string>("images.pdf");

  React.useEffect(() => {
    return () => {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [outputUrl]);

  const accept = ACCEPT_BY_SLUG[slug] ?? ACCEPT_BY_SLUG["image-to-pdf"];

  const handleFiles = async (incoming: DropzoneFile[]) => {
    const valid = incoming.filter((d) => {
      if (!isAcceptedImage(d.file, slug)) {
        toast.error(`"${d.file.name}" is not a supported image type. Skipped.`);
        return false;
      }
      if (d.file.size > MAX_PDF_BYTES) {
        toast.error(`"${d.file.name}" is larger than ${formatBytes(MAX_PDF_BYTES)}. Skipped.`);
        return false;
      }
      if (d.file.size > LARGE_PDF_WARN_BYTES) {
        toast.warning(
          `"${d.file.name}" is ${formatBytes(d.file.size)}. Large images may take a while to embed.`
        );
      }
      return true;
    });
    if (valid.length === 0) return;

    const newItems: ImageItem[] = [];
    for (const d of valid) {
      try {
        // We only need dimensions here; the actual bytes are read again at build time.
        const url = URL.createObjectURL(d.file);
        const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => reject(new Error(`Could not read "${d.file.name}".`));
          img.src = url;
        });
        URL.revokeObjectURL(url);
        newItems.push({ id: d.id, file: d.file, width: dims.w, height: dims.h });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Could not read "${d.file.name}".`);
      }
    }
    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(null);
      setOutputSize(0);
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  const moveItem = (id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const reset = () => {
    setItems([]);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputSize(0);
  };

  const doConvert = async () => {
    if (items.length === 0) {
      toast.error("Add at least one image first.");
      return;
    }
    setBusy(true);
    try {
      const doc = await PDFDocument.create();
      const sizeOpt = PAGE_SIZE_OPTIONS.find((s) => s.value === pageSize)!;

      for (const item of items) {
        const { kind, bytes, width, height } = await imageFileToPdfEmbeddable(item.file);
        const embed =
          kind === "jpg"
            ? await doc.embedJpg(bytes)
            : await doc.embedPng(bytes);

        let pageW: number;
        let pageH: number;
        if (pageSize === "fit") {
          pageW = width;
          pageH = height;
        } else {
          pageW = sizeOpt.w;
          pageH = sizeOpt.h;
        }
        const page = doc.addPage([pageW, pageH]);

        if (pageSize === "fit") {
          page.drawImage(embed, { x: 0, y: 0, width, height });
        } else {
          // Scale image to fit within the page while preserving aspect ratio.
          const margin = 36; // 0.5 inch
          const maxW = pageW - margin * 2;
          const maxH = pageH - margin * 2;
          const scale = Math.min(maxW / width, maxH / height, 1);
          const drawW = width * scale;
          const drawH = height * scale;
          const x = (pageW - drawW) / 2;
          const y = (pageH - drawH) / 2;
          page.drawImage(embed, { x, y, width: drawW, height: drawH });
        }
      }

      const out = await doc.save();
      const blob = new Blob([Uint8Array.from(out)], { type: "application/pdf" });
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(URL.createObjectURL(blob));
      setOutputSize(blob.size);
      const base = items[0].file.name.replace(/\.[^./\\]+$/, "");
      setOutputName(`${base}.pdf`);
      toast.success(`Created a ${formatBytes(blob.size)} PDF from ${items.length} image${items.length === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setBusy(false);
    }
  };

  const content: ToolContent = {
    intro:
      INTRO_BY_SLUG[slug] ?? INTRO_BY_SLUG["image-to-pdf"],
    tool: (
      <div className="space-y-5">
        <Dropzone
          accept={accept}
          multiple
          onFiles={handleFiles}
          hint={
            slug === "jpg-to-pdf"
              ? "JPG / JPEG files only"
              : slug === "png-to-pdf"
                ? "PNG files only"
                : "JPG, PNG or WebP · up to 100 MB each"
          }
          maxSizeLabel="100 MB recommended"
          label={
            slug === "jpg-to-pdf"
              ? "Drop JPG files here or click to browse"
              : slug === "png-to-pdf"
                ? "Drop PNG files here or click to browse"
                : "Drop images here or click to browse"
          }
        />

        {items.length > 0 && (
          <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span className="font-medium">{items.length}</span>{" "}
                image{items.length === 1 ? "" : "s"} queued
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>

            <ol className="space-y-2">
              {items.map((item, idx) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border bg-background p-3"
                >
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.width} × {item.height}px · {formatBytes(item.file.size)}
                    </p>
                  </div>
                  <div className="flex flex-none items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Move up"
                      disabled={idx === 0}
                      onClick={() => moveItem(item.id, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Move down"
                      disabled={idx === items.length - 1}
                      onClick={() => moveItem(item.id, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() => removeItem(item.id)}
                    >
                      ✕
                    </Button>
                  </div>
                </li>
              ))}
            </ol>

            <div className="space-y-2">
              <Label htmlFor="img2pdf-page-size">Page size</Label>
              <Select value={pageSize} onValueChange={(v) => setPageSize(v as PageSize)}>
                <SelectTrigger id="img2pdf-page-size" className="w-full sm:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                “Fit to image” makes each page exactly the size of its image — perfect for
                scanned documents. A4 / Letter centre the image on a standard page with a 0.5″
                margin.
              </p>
            </div>

            <Button onClick={doConvert} disabled={busy} className="w-full sm:w-auto">
              <FileImage className="mr-1.5 h-4 w-4" />
              {busy ? "Converting…" : `Create PDF from ${items.length} image${items.length === 1 ? "" : "s"}`}
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
                      a.style.display = "none";
                      document.body.appendChild(a);
                      a.click(); setTimeout(() => a.remove(), 100);
                    }}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Download PDF
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
        title: "Add your images",
        description:
          "Drag and drop one or more images onto the dropzone. You can add files in batches — they all queue up.",
      },
      {
        title: "Reorder and pick a page size",
        description:
          "Use the up and down arrows to set the order pages will appear. Choose “Fit to image” for pixel-perfect pages, or A4/Letter for standard paper sizes.",
      },
      {
        title: "Convert",
        description:
          "Click the Create PDF button. Each image is embedded into a new PDF page with pdf-lib — no upload, no server round-trip.",
      },
      {
        title: "Download",
        description:
          "Click the download button to save the PDF. The output filename is based on the first image; rename after download if you like.",
      },
    ],
    useCases: [
      "Combine a batch of scanned receipts into a single expense-report PDF.",
      "Turn a series of PNG screenshots into a printable documentation PDF.",
      "Bundle product photos into a single PDF catalog page.",
      "Convert a WebP photo album into a universally viewable PDF.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Animated GIFs and APNGs are not supported — only the first frame is embedded.</li>
        <li>“Fit to image” page size produces PDF pages with pixel = point dimensions; very large source images create very large PDF pages.</li>
        <li>Image colour profiles are not converted; CMYK JPEGs may render with shifted colours in some viewers.</li>
        <li>Files larger than 100 MB may take several seconds and use significant browser memory.</li>
      </ul>
    ),
    faq: [
      {
        q: "What image formats are supported?",
        a:
          slug === "jpg-to-pdf"
            ? "This tool accepts JPG and JPEG files. Use the Image to PDF tool for PNG and WebP."
            : slug === "png-to-pdf"
              ? "This tool accepts PNG files. Use the Image to PDF tool for JPG and WebP."
              : "JPG, PNG and WebP are supported directly. GIF, BMP and AVIF are rasterised to PNG via Canvas first.",
      },
      {
        q: "Are my images uploaded to a server?",
        a: "No. Images are read into browser memory only and embedded into a PDF with the pdf-lib library. They never leave your device.",
      },
      {
        q: "What is the difference between the three image-to-PDF tools?",
        a: "Image to PDF accepts any supported image format. JPG to PDF and PNG to PDF are dedicated shortcuts that only accept one format — handy if you want to prevent accidentally mixing types. All three share the same engine.",
      },
      {
        q: "Why is my PDF bigger than the source images?",
        a: "PDFs add overhead for page metadata, and pdf-lib does not re-compress embedded images. If file size matters, use the Image Compressor first to shrink the source images.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
