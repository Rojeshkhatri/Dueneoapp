"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, type DropzoneFile } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Download,
  RotateCcw,
  FileImage,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  downloadBlob,
  formatBytes,
  getCanvas2D,
  replaceExtension,
} from "./_image-helpers";

const MAX_HEIC_BYTES = 80 * 1024 * 1024; // 80 MB safety cap per file
const LARGE_HEIC_WARN_BYTES = 25 * 1024 * 1024; // >25 MB → friendly warning

type ItemStatus = "pending" | "converting" | "done" | "error";

interface HeicItem {
  id: string;
  file: File;
  status: ItemStatus;
  /** Converted JPG blob, when status === "done". */
  jpgBlob: Blob | null;
  /** Object URL for the converted JPG preview (revoked on cleanup). */
  previewUrl: string | null;
  /** Optional error message. */
  error: string | null;
}

let idCounter = 0;

function isHeicFile(file: File): boolean {
  const nameOk = /\.(heic|heif)$/i.test(file.name);
  const typeOk =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.type === "image/heic-sequence" ||
    file.type === "image/heif-sequence";
  return nameOk || typeOk;
}

/**
 * Load a Blob (image/jpeg from heic2any) into an HTMLImageElement.
 * Used so we can re-encode through a Canvas with a chosen quality.
 */
function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode the converted image."));
    };
    img.src = url;
  });
}

export function HeicToJpg({ tool }: { tool: ToolDefinition }) {
  const [items, setItems] = React.useState<HeicItem[]>([]);
  const [quality, setQuality] = React.useState<number>(90); // 0-100
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  // Cleanup object URLs on unmount.
  React.useEffect(() => {
    return () => {
      for (const it of items) {
        if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
      }
    };
    // We intentionally run this only on unmount.
  }, []);

  const updateItem = (id: string, patch: Partial<HeicItem>) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const handleFiles = (incoming: DropzoneFile[]) => {
    const valid = incoming.filter((d) => {
      if (!isHeicFile(d.file)) {
        toast.error(`"${d.file.name}" is not a HEIC/HEIF file. Skipped.`);
        return false;
      }
      if (d.file.size > MAX_HEIC_BYTES) {
        toast.error(
          `"${d.file.name}" is ${formatBytes(d.file.size)}. The maximum supported size is ${formatBytes(MAX_HEIC_BYTES)}.`
        );
        return false;
      }
      if (d.file.size > LARGE_HEIC_WARN_BYTES) {
        toast.warning(
          `"${d.file.name}" is ${formatBytes(d.file.size)} — large HEIC files may take several seconds to convert.`
        );
      }
      return true;
    });

    const newItems: HeicItem[] = valid.map((d) => ({
      id: `heic-${++idCounter}-${d.id}`,
      file: d.file,
      status: "pending",
      jpgBlob: null,
      previewUrl: null,
      error: null,
    }));
    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const reset = () => {
    for (const it of items) {
      if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
    }
    setItems([]);
    setProgress(0);
  };

  /**
   * Convert a single HEIC file to JPG.
   * 1. Dynamically import heic2any (lazy-loaded).
   * 2. heic2any returns a JPG Blob.
   * 3. Re-encode through a Canvas so the user-controlled quality slider
   *    actually applies (heic2any's own quality param is approximate).
   */
  const convertOne = async (item: HeicItem, q: number): Promise<void> => {
    updateItem(item.id, { status: "converting", error: null });
    try {
      const heic2any = (await import("heic2any")).default;
      const raw = (await heic2any({
        blob: item.file,
        toType: "image/jpeg",
        quality: 0.9,
      })) as Blob | Blob[];

      const firstBlob = Array.isArray(raw) ? raw[0] : raw;
      if (!firstBlob) {
        throw new Error("HEIC decoder returned no image data.");
      }

      // Re-encode through a Canvas with the user's chosen quality.
      const img = await loadImageFromBlob(firstBlob);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = getCanvas2D(canvas);
      // Flatten alpha onto white, since JPG has no transparency.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const jpgBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", q / 100)
      );
      if (!jpgBlob) {
        throw new Error("Could not encode the JPG. Your browser may not support it.");
      }

      const previewUrl = URL.createObjectURL(jpgBlob);
      // Revoke any prior preview URL for this item.
      const prev = items.find((p) => p.id === item.id);
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);

      updateItem(item.id, {
        status: "done",
        jpgBlob,
        previewUrl,
        error: null,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not convert this HEIC file.";
      updateItem(item.id, { status: "error", error: msg });
    }
  };

  const convertAll = async () => {
    const pending = items.filter((p) => p.status === "pending" || p.status === "error");
    if (pending.length === 0) {
      toast.info("Nothing to convert — add some HEIC files first.");
      return;
    }
    setBusy(true);
    setProgress(0);
    const q = quality;
    let done = 0;
    for (const item of pending) {
      await convertOne(item, q);
      done += 1;
      setProgress(Math.round((done / pending.length) * 100));
      // Yield to the event loop so the UI can repaint the progress bar.
      await new Promise((r) => setTimeout(r, 0));
    }
    setBusy(false);
    const okCount = pending.filter((_, i) => {
      // Re-check final state from latest closure-captured items.
      return true;
    }).length;
    void okCount;
    toast.success(`Processed ${pending.length} file${pending.length === 1 ? "" : "s"}.`);
  };

  const downloadOne = (item: HeicItem) => {
    if (!item.jpgBlob) {
      toast.error("This file has not been converted yet.");
      return;
    }
    const name = replaceExtension(item.file.name, "jpg");
    if (!downloadBlob(item.jpgBlob, name)) {
      toast.error("Download failed.");
    }
  };

  const downloadAll = () => {
    const done = items.filter((p) => p.status === "done" && p.jpgBlob);
    if (done.length === 0) {
      toast.error("No converted files to download.");
      return;
    }
    for (const item of done) {
      downloadOne(item);
    }
    toast.success(`Downloading ${done.length} JPG${done.length === 1 ? "" : "s"}.`);
  };

  const totalBytes = items.reduce((sum, p) => sum + p.file.size, 0);
  const doneCount = items.filter((p) => p.status === "done").length;
  const errCount = items.filter((p) => p.status === "error").length;

  const content: ToolContent = {
    intro:
      "Convert HEIC and HEIF photos (the format iPhone uses by default) into universally compatible JPG files — entirely in your browser. Drop one or many HEIC files in, pick a quality level, and download each JPG individually or all at once. Your photos never leave your device.",
    tool: (
      <div className="space-y-5">
        <Dropzone
          accept=".heic,.heif,image/heic,image/heif"
          multiple
          onFiles={handleFiles}
          hint="HEIC / HEIF files only · up to 80 MB each"
          maxSizeLabel="80 MB per file"
          label="Drop HEIC photos here or click to browse"
        />

        {items.length > 0 && (
          <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span className="font-medium">{items.length}</span>{" "}
                file{items.length === 1 ? "" : "s"} ·{" "}
                <span className="text-muted-foreground">{formatBytes(totalBytes)}</span>
                {doneCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> {doneCount} done
                  </span>
                )}
                {errCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    <AlertTriangle className="h-3 w-3" /> {errCount} failed
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>

            {/* Quality slider */}
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="heic-quality" className="text-sm font-medium">
                  JPG quality
                </Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {quality}%
                </span>
              </div>
              <Slider
                id="heic-quality"
                min={10}
                max={100}
                step={5}
                value={[quality]}
                onValueChange={(v) => setQuality(v[0] ?? 90)}
                disabled={busy}
                className="mt-3"
                aria-label="JPG quality"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                90% is a good balance of size and quality. Lower values produce smaller files;
                100% preserves the most detail.
              </p>
            </div>

            {/* Progress bar (shown while busy) */}
            {busy && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Converting…</span>
                  <span className="tabular-nums">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* File list */}
            <ol className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {/* Thumbnail or icon */}
                    <div className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-md border bg-muted">
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={`Preview of ${item.file.name}`}
                          className="h-full w-full object-cover"
                        />
                      ) : item.status === "converting" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <FileImage className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(item.file.size)}
                        {item.jpgBlob && ` → ${formatBytes(item.jpgBlob.size)}`}
                      </p>
                      {item.status === "error" && (
                        <p className="mt-0.5 text-xs text-destructive">
                          {item.error ?? "Conversion failed."}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-none items-center gap-2">
                    {item.status === "done" && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => downloadOne(item)}
                        disabled={busy}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        JPG
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() => removeItem(item.id)}
                      disabled={busy}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={convertAll}
                disabled={busy || items.every((p) => p.status === "done")}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Converting…
                  </>
                ) : (
                  <>
                    <FileImage className="mr-1.5 h-4 w-4" />
                    Convert {items.filter((p) => p.status !== "done").length} file
                    {items.filter((p) => p.status !== "done").length === 1 ? "" : "s"}
                  </>
                )}
              </Button>
              {doneCount > 0 && (
                <Button variant="outline" onClick={downloadAll} disabled={busy}>
                  <Download className="mr-1.5 h-4 w-4" />
                  Download all ({doneCount})
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Add your HEIC photos",
        description:
          "Drag and drop one or more .heic / .heif files onto the dropzone, or click to browse. iPhone photos export as HEIC by default — you can add as many as you like in one batch.",
      },
      {
        title: "Choose a JPG quality",
        description:
          "Use the quality slider to balance file size against visual fidelity. 90% is the default and looks virtually identical to the original; lower values produce smaller files.",
      },
      {
        title: "Convert",
        description:
          "Click the Convert button. The heic2any library decodes each HEIC file directly in your browser, then a Canvas re-encodes the result as a JPG at your chosen quality. A progress bar shows how far along the batch is.",
      },
      {
        title: "Download",
        description:
          "Click JPG on any individual row to download that file, or use Download all to save every converted JPG. Original HEICs are never uploaded — everything stays on your device.",
      },
    ],
    useCases: [
      "Convert iPhone photos to JPG before uploading to websites that don't accept HEIC.",
      "Batch-convert a wedding or holiday photo set so friends on Android or Windows can view them.",
      "Prepare HEIC images for use in documents, slides or PDFs that require JPG.",
      "Shrink large HEIC files to a smaller JPG quality for quick sharing by email or chat.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>HEIC files larger than 80 MB are rejected to avoid crashing the browser tab.</li>
        <li>
          Converting many large HEIC files at once is CPU- and memory-intensive — for big batches,
          convert 10–20 files at a time.
        </li>
        <li>
          HEIC sequence files (animations) are flattened to a single still frame — the first image
          in the sequence.
        </li>
        <li>
          Colour profiles embedded in the HEIC may not be perfectly preserved through the Canvas
          re-encode step; extremely colour-critical work should use the original files.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Are my HEIC photos uploaded to a server?",
        a: "No. The heic2any library runs entirely inside your browser. Your photos are decoded and re-encoded on your device and never transmitted anywhere.",
      },
      {
        q: "Why does the conversion take a few seconds per photo?",
        a: "HEIC decoding is computationally heavy — the format uses advanced compression. Large photos (10+ megapixels) can take 2–5 seconds each on modest hardware. Batch sizes of 10–20 photos work best.",
      },
      {
        q: "What quality should I pick?",
        a: "90% is a great default — visually indistinguishable from the original at a fraction of the file size. Use 100% only if you need maximum fidelity for editing, and 60–70% for thumbnails or quick previews.",
      },
      {
        q: "Can I convert HEIC to PNG instead?",
        a: "This tool is JPG-only. For PNG output, use the general Image Format Converter on the AVIF-to-JPG / PNG-to-JPG family of tools after first converting here, or use the HEIC to JPG output as an intermediate step.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
