"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, type DropzoneFile } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Download,
  RotateCcw,
  Loader2,
  FileImage,
  Files,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_PDF_BYTES,
  LARGE_PDF_WARN_BYTES,
  downloadBlob,
  formatBytes,
  isPdfFile,
  readFileAsArrayBuffer,
} from "./_pdf-helpers";

type PageStatus = "pending" | "rendering" | "done" | "error";

interface PageItem {
  /** 1-indexed page number in the source PDF. */
  pageNumber: number;
  status: PageStatus;
  blob: Blob | null;
  previewUrl: string | null;
  error: string | null;
}

const DPI_OPTIONS = [
  { value: "72", label: "72 DPI (screen)" },
  { value: "150", label: "150 DPI (draft print)" },
  { value: "300", label: "300 DPI (print)" },
];

let idCounter = 0;

export function PdfToJpg({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [pageCount, setPageCount] = React.useState<number | null>(null);
  const [pages, setPages] = React.useState<PageItem[]>([]);
  const [dpi, setDpi] = React.useState<number>(150);
  const [quality, setQuality] = React.useState<number>(90); // 0-100
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [zipping, setZipping] = React.useState(false);

  // Cleanup all preview URLs on unmount.
  React.useEffect(() => {
    return () => {
      for (const p of pages) {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      }
    };
    // We intentionally run this only on unmount.
  }, []);

  const handleFiles = async (incoming: DropzoneFile[]) => {
    const f = incoming[0]?.file;
    if (!f) return;
    if (!isPdfFile(f)) {
      toast.error(`"${f.name}" is not a PDF. Skipped.`);
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      toast.error(
        `"${f.name}" is ${formatBytes(f.size)}. The maximum supported size is ${formatBytes(MAX_PDF_BYTES)}.`
      );
      return;
    }
    if (f.size > LARGE_PDF_WARN_BYTES) {
      toast.warning(
        `"${f.name}" is ${formatBytes(f.size)}. Large PDFs may take a while to render.`
      );
    }

    // Reset previous state.
    for (const p of pages) {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    }
    setFile(f);
    setPages([]);
    setProgress(0);

    // Read the page count up-front for a friendlier UI.
    try {
      const pdfjsLib = await import("pdfjs-dist");
      setWorkerSrc(pdfjsLib);
      const data = await readFileAsArrayBuffer(f);
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      setPageCount(pdf.numPages);
      setPages(
        Array.from({ length: pdf.numPages }, (_, i) => ({
          pageNumber: i + 1,
          status: "pending" as PageStatus,
          blob: null,
          previewUrl: null,
          error: null,
        }))
      );
      // Free the document — we'll re-open it during render to avoid keeping
      // two copies of the ArrayBuffer alive.
      pdf.cleanup();
      await (pdf as unknown as { destroy?: () => Promise<void> }).destroy?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not read this PDF.";
      toast.error(`Could not open PDF: ${msg}`);
      setFile(null);
      setPageCount(null);
    }
  };

  const reset = () => {
    for (const p of pages) {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    }
    setFile(null);
    setPageCount(null);
    setPages([]);
    setProgress(0);
  };

  const updatePage = (pageNumber: number, patch: Partial<PageItem>) => {
    setPages((prev) =>
      prev.map((p) => (p.pageNumber === pageNumber ? { ...p, ...patch } : p))
    );
  };

  /** Configure the pdf.js worker source. Idempotent. */
  const setWorkerSrc = (pdfjsLib: typeof import("pdfjs-dist")) => {
    if (pdfjsLib.GlobalWorkerOptions.workerSrc) return;
    try {
      // Use the bundled worker via a URL resolved by the bundler.
      // `import.meta.url` is supported in modern bundlers (Next.js 16 / Turbopack).
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
    } catch {
      // Fallback: CDN worker matching the installed version.
      const version = (pdfjsLib as unknown as { version?: string }).version ?? "6.0.0";
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
    }
  };

  const renderAll = async () => {
    if (!file || pages.length === 0) return;
    setBusy(true);
    setProgress(0);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      setWorkerSrc(pdfjsLib);
      const data = await readFileAsArrayBuffer(file);
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      const scale = dpi / 72; // PDF default user-space unit is 1/72 inch.

      let done = 0;
      for (let i = 1; i <= pdf.numPages; i++) {
        updatePage(i, { status: "rendering", error: null });
        try {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          // Cap canvas dimensions to avoid memory blowups at 300 DPI on
          // very large pages — ~12 megapixels is a sane ceiling.
          const MAX_EDGE = 5000;
          let w = Math.ceil(viewport.width);
          let h = Math.ceil(viewport.height);
          if (w > MAX_EDGE || h > MAX_EDGE) {
            const k = MAX_EDGE / Math.max(w, h);
            w = Math.ceil(w * k);
            h = Math.ceil(h * k);
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas 2D context is unavailable in this browser.");
          // White background so transparent regions don't go black in JPG.
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          // Render at the (possibly capped) scale by re-deriving viewport.
          const renderViewport =
            w === Math.ceil(viewport.width) && h === Math.ceil(viewport.height)
              ? viewport
              : page.getViewport({ scale: (w / viewport.width) * scale });
          await page.render({
            canvasContext: ctx,
            viewport: renderViewport,
            // pdf.js v6 accepts a background colour hint for transparent regions.
            background: "#ffffff",
          } as Parameters<typeof page.render>[0]).promise;

          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", quality / 100)
          );
          if (!blob) throw new Error("Could not encode the JPG.");

          // Replace any previous preview URL for this page.
          setPages((prev) => {
            const existing = prev.find((p) => p.pageNumber === i);
            if (existing?.previewUrl) URL.revokeObjectURL(existing.previewUrl);
            return prev.map((p) =>
              p.pageNumber === i
                ? {
                    ...p,
                    status: "done" as PageStatus,
                    blob,
                    previewUrl: URL.createObjectURL(blob),
                    error: null,
                  }
                : p
            );
          });
          // Free page resources.
          page.cleanup();
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : `Could not render page ${i}.`;
          updatePage(i, { status: "error", error: msg });
        }
        done += 1;
        setProgress(Math.round((done / pdf.numPages) * 100));
        // Yield so the progress bar can repaint.
        await new Promise((r) => setTimeout(r, 0));
      }
      // Free the document.
      pdf.cleanup();
      await (pdf as unknown as { destroy?: () => Promise<void> }).destroy?.();
      const okCount = pages.filter((p) => p.status === "done").length;
      void okCount;
      toast.success(
        `Rendered ${done} page${done === 1 ? "" : "s"} at ${dpi} DPI.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Rendering failed.";
      toast.error(`PDF rendering failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const downloadOne = (page: PageItem) => {
    if (!page.blob || !file) {
      toast.error("This page has not been rendered yet.");
      return;
    }
    const base = file.name.replace(/\.pdf$/i, "");
    const name = `${base}-page-${String(page.pageNumber).padStart(3, "0")}.jpg`;
    if (!downloadBlob(page.blob, name)) {
      toast.error("Download failed.");
    }
  };

  const downloadAllAsZip = async () => {
    const done = pages.filter((p) => p.status === "done" && p.blob);
    if (done.length === 0 || !file) {
      toast.error("No rendered pages to download yet.");
      return;
    }
    setZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const base = file.name.replace(/\.pdf$/i, "");
      for (const p of done) {
        const name = `${base}-page-${String(p.pageNumber).padStart(3, "0")}.jpg`;
        zip.file(name, p.blob!);
      }
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      const zipName = `${base}-pages.zip`;
      if (!downloadBlob(blob, zipName)) {
        toast.error("ZIP download failed.");
      } else {
        toast.success(`Downloaded ${done.length} page${done.length === 1 ? "" : "s"} as ZIP.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not build the ZIP.";
      toast.error(`ZIP build failed: ${msg}`);
    } finally {
      setZipping(false);
    }
  };

  const doneCount = pages.filter((p) => p.status === "done").length;
  const errCount = pages.filter((p) => p.status === "error").length;

  const content: ToolContent = {
    intro:
      "Turn every page of a PDF into a high-resolution JPG image — entirely in your browser. Drop in a PDF, choose a DPI (72 for screen, 150 for draft, 300 for print), and download each page individually or all at once as a ZIP archive. Your document never leaves your device.",
    tool: (
      <div className="space-y-5">
        <Dropzone
          accept="application/pdf,.pdf"
          onFiles={handleFiles}
          hint="PDF files only · up to 250 MB"
          maxSizeLabel="250 MB"
          label="Drop a PDF here or click to browse"
        />

        {file && (
          <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                  {pageCount !== null && ` · ${pageCount} page${pageCount === 1 ? "" : "s"}`}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>

            {/* Settings */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-background p-4">
                <Label htmlFor="pdf-dpi" className="text-sm font-medium">
                  Resolution (DPI)
                </Label>
                <Select
                  value={String(dpi)}
                  onValueChange={(v) => setDpi(parseInt(v, 10))}
                  disabled={busy}
                >
                  <SelectTrigger id="pdf-dpi" className="mt-2 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DPI_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs text-muted-foreground">
                  Higher DPI = sharper images but larger files and slower rendering.
                </p>
              </div>

              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="pdf-quality" className="text-sm font-medium">
                    JPG quality
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {quality}%
                  </span>
                </div>
                <Slider
                  id="pdf-quality"
                  min={30}
                  max={100}
                  step={5}
                  value={[quality]}
                  onValueChange={(v) => setQuality(v[0] ?? 90)}
                  disabled={busy}
                  className="mt-3"
                  aria-label="JPG quality"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  90% is a good balance of size and quality for most documents.
                </p>
              </div>
            </div>

            {/* Convert button */}
            <Button
              onClick={renderAll}
              disabled={busy || pages.length === 0}
              className="w-full sm:w-auto"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Rendering… {progress}%
                </>
              ) : (
                <>
                  <FileImage className="mr-1.5 h-4 w-4" />
                  Render {pages.length} page{pages.length === 1 ? "" : "s"} at {dpi} DPI
                </>
              )}
            </Button>

            {/* Progress bar */}
            {busy && (
              <div className="space-y-1.5">
                <Progress value={progress} />
              </div>
            )}

            {/* Summary chips */}
            {(doneCount > 0 || errCount > 0) && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {doneCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> {doneCount} rendered
                  </span>
                )}
                {errCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                    <AlertTriangle className="h-3 w-3" /> {errCount} failed
                  </span>
                )}
              </div>
            )}

            {/* Page grid */}
            {pages.length > 0 && (
              <div className="max-h-[28rem] overflow-y-auto rounded-lg border bg-background p-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {pages.map((page) => (
                    <div
                      key={page.pageNumber}
                      className="group relative flex flex-col overflow-hidden rounded-md border bg-muted"
                    >
                      <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-[repeating-conic-gradient(hsl(0_0%_90%)_0_25%,transparent_0_50%)] bg-[length:16px_16px] dark:bg-[repeating-conic-gradient(hsl(0_0%_22%)_0_25%,transparent_0_50%)]">
                        {page.previewUrl ? (
                          <img
                            src={page.previewUrl}
                            alt={`Page ${page.pageNumber}`}
                            className="h-full w-full object-contain"
                          />
                        ) : page.status === "rendering" ? (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : page.status === "error" ? (
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        ) : (
                          <FileImage className="h-5 w-5 text-muted-foreground" />
                        )}

                        {/* Hover overlay with download */}
                        {page.status === "done" && (
                          <button
                            type="button"
                            onClick={() => downloadOne(page)}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label={`Download page ${page.pageNumber} as JPG`}
                          >
                            <Download className="h-5 w-5 text-white" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t bg-background px-2 py-1.5 text-xs">
                        <span className="font-medium">P{page.pageNumber}</span>
                        {page.blob && (
                          <span className="text-muted-foreground">
                            {formatBytes(page.blob.size)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bulk actions */}
            {doneCount > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={downloadAllAsZip}
                  disabled={busy || zipping}
                >
                  {zipping ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Zipping…
                    </>
                  ) : (
                    <>
                      <Files className="mr-1.5 h-4 w-4" />
                      Download all as ZIP ({doneCount})
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    for (const p of pages.filter((p) => p.status === "done")) {
                      downloadOne(p);
                    }
                  }}
                  disabled={busy}
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Download individually
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Add your PDF",
        description:
          "Drag and drop a PDF onto the dropzone, or click to browse. The page count is read immediately so you know exactly how many images you'll get.",
      },
      {
        title: "Choose DPI and quality",
        description:
          "Pick a resolution: 72 DPI for quick screen previews, 150 DPI for draft printing, or 300 DPI for high-quality print. Use the slider to set the JPG quality.",
      },
      {
        title: "Render",
        description:
          "Click the Render button. The pdf.js library opens the PDF directly in your browser and rasterises each page onto a Canvas, then encodes it as a JPG at your chosen quality. A progress bar shows how far along the batch is.",
      },
      {
        title: "Download",
        description:
          "Hover any page thumbnail and click the download icon to grab a single JPG, or use Download all as ZIP to save every page in one archive. The original PDF never leaves your device.",
      },
    ],
    useCases: [
      "Extract individual pages from a scanned PDF for use in a presentation or website.",
      "Convert a contract or invoice PDF into images you can attach to an email.",
      "Create thumbnail previews of every page of an e-book or report.",
      "Rasterise a vector PDF for archival or for tools that don't accept PDF input.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>PDFs larger than 250 MB are rejected to avoid exhausting browser memory.</li>
        <li>
          At 300 DPI, large pages (A3 or bigger) can produce very large canvases; rendering is
          capped at a 5000-pixel edge to prevent crashes, which may slightly reduce the effective
          DPI for unusually large pages.
        </li>
        <li>
          Encrypted or password-protected PDFs cannot be rendered — remove the password first.
        </li>
        <li>
          Embedded fonts, form fields, annotations and JavaScript in the PDF are flattened into the
          raster output — interactive features are not preserved.
        </li>
        <li>
          The ZIP download uses JSZip with default compression; very large multi-page PDFs may take
          several seconds to zip.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Are my PDFs uploaded to a server?",
        a: "No. The pdf.js library runs entirely inside your browser. Your PDF is read into memory on your device, rendered to Canvas, and encoded as JPG — nothing is ever transmitted.",
      },
      {
        q: "Which DPI should I choose?",
        a: "Use 72 DPI for screen-only previews and quick sharing, 150 DPI for draft printing or thumbnails, and 300 DPI for high-quality print output. Higher DPI produces sharper images but much larger files and slower rendering.",
      },
      {
        q: "Why does rendering take so long at 300 DPI?",
        a: "A single A4 page at 300 DPI is about 8.7 megapixels — multiple pages add up fast. Rendering, rasterising and JPEG-encoding each page is CPU-intensive. For long PDFs, consider 150 DPI unless you genuinely need print quality.",
      },
      {
        q: "Can I download all pages in a single file?",
        a: "Yes — click Download all as ZIP to receive a single .zip archive containing every page as a separate JPG. You can also download pages individually by hovering over each thumbnail.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
