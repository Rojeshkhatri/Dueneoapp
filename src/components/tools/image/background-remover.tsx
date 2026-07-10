"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Download, RotateCcw, Wand2, Sparkles } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_IMAGE_BYTES,
  formatBytes,
  loadImageFromFile,
  replaceExtension,
} from "./_image-helpers";

interface ProgressInfo {
  key: string;
  current: number;
  total: number;
}

/**
 * Background Remover — runs the @imgly/background-removal U2Net model
 * entirely in the browser via ONNX Runtime Web. The first run downloads
 * ~30MB of model + WASM files (cached by the browser for subsequent runs).
 *
 * The library is imported dynamically so it never lands in the initial
 * JS bundle — it only loads when the user actually clicks "Remove background".
 */
export function BackgroundRemover({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = React.useState<string | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [resultBlob, setResultBlob] = React.useState<Blob | null>(null);
  const [dimensions, setDimensions] = React.useState<{ w: number; h: number } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<ProgressInfo | null>(null);
  const [phase, setPhase] = React.useState<"idle" | "loading-model" | "processing">("idle");
  const [usedOnce, setUsedOnce] = React.useState(false);

  // Revoke object URLs on cleanup / replace.
  React.useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
    };
  }, [originalUrl]);
  React.useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const onFiles = (files: { file: File }[]) => {
    const f = files[0]?.file;
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      toast.error("Please choose an image file (JPG, PNG or WebP).");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      toast.error(
        `File is too large (${formatBytes(f.size)}). The maximum supported size is ${formatBytes(MAX_IMAGE_BYTES)}.`
      );
      return;
    }
    setFile(f);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setResultBlob(null);
    setProgress(null);
    setPhase("idle");
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    setOriginalUrl(URL.createObjectURL(f));
    loadImageFromFile(f)
      .then((img) => setDimensions({ w: img.naturalWidth, h: img.naturalHeight }))
      .catch(() => setDimensions(null));
  };

  const runRemove = async () => {
    if (!file) {
      toast.error("Please upload an image first.");
      return;
    }
    setBusy(true);
    setProgress(null);
    setPhase("loading-model");
    try {
      // Dynamic import keeps the heavy ONNX runtime out of the initial bundle.
      const bgRemoval = await import("@imgly/background-removal");
      const removeBackground = bgRemoval.removeBackground ?? bgRemoval.default;

      setPhase("processing");
      const blob: Blob = await removeBackground(file, {
        // Use the small quantized model — much smaller download (~40MB)
        // and runs fast enough on CPU. Browser cache makes subsequent runs instant.
        model: "isnet_quint8",
        output: { format: "image/png", quality: 0.9 },
        progress: (key: string, current: number, total: number) => {
          setProgress({ key, current, total });
          if (current >= total && key.includes("compute")) {
            setProgress(null);
          }
        },
      });

      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultBlob(blob);
      setUsedOnce(true);
      setProgress(null);
      setPhase("idle");
      toast.success(
        `Background removed — ${formatBytes(blob.size)} PNG with transparency.`
      );
    } catch (err) {
      console.error("[background-remover]", err);
      toast.error(
        err instanceof Error
          ? `Background removal failed: ${err.message}`
          : "Background removal failed. Please try a different image."
      );
      setPhase("idle");
      setProgress(null);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setOriginalUrl(null);
    setResultUrl(null);
    setResultBlob(null);
    setDimensions(null);
    setProgress(null);
    setPhase("idle");
  };

  const downloadName = file
    ? replaceExtension(file.name, "png")
    : "background-removed.png";

  const progressPct = progress && progress.total > 0
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : 0;

  const phaseLabel =
    phase === "loading-model"
      ? usedOnce
        ? "Loading AI model…"
        : "Loading AI model (~30MB, one-time download)…"
      : phase === "processing"
      ? "Removing background…"
      : "";

  const progressLabel = progress
    ? prettyProgressKey(progress.key)
    : phaseLabel;

  const content: ToolContent = {
    intro:
      "Remove image backgrounds with on-device AI. A U2Net neural network runs entirely in your browser via ONNX Runtime Web — your photos never leave your device. The first run downloads a ~30MB model (cached for next time).",
    tool: (
      <div className="space-y-5">
        {!file ? (
          <Dropzone
            accept="image/jpeg,image/png,image/webp,image/bmp"
            onFiles={onFiles}
            hint="JPG, PNG, WebP or BMP · up to 50 MB · best with people or products"
            maxSizeLabel="50 MB"
            label="Drop an image here or click to browse"
          />
        ) : (
          <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FileChip name={file.name} size={file.size} onRemove={reset} />
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>

            {dimensions && (
              <p className="text-xs text-muted-foreground">
                Original: {dimensions.w} × {dimensions.h}px · {formatBytes(file.size)}
              </p>
            )}

            {!usedOnce && (
              <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
                <Sparkles className="mt-0.5 h-4 w-4 flex-none text-primary" />
                <p>
                  The first run downloads an AI model (~30MB) and WASM runtime. This
                  is a <strong>one-time download</strong> — the browser caches it so
                  every subsequent removal is much faster. Your image is processed
                  locally and never uploaded.
                </p>
              </div>
            )}

            <Button onClick={runRemove} disabled={busy} className="w-full sm:w-auto">
              <Wand2 className="mr-1.5 h-4 w-4" />
              {busy ? phaseLabel || "Working…" : "Remove background"}
            </Button>

            {busy && (
              <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{progressLabel}</span>
                  {progress && progress.total > 0 ? (
                    <span className="text-muted-foreground">
                      {formatBytes(progress.current)} / {formatBytes(progress.total)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Please wait…</span>
                  )}
                </div>
                {progress && progress.total > 0 ? (
                  <Progress value={progressPct} className="h-2" />
                ) : (
                  <Progress value={50} className="h-2 animate-pulse" />
                )}
                <p className="text-[11px] text-muted-foreground">
                  Keep this tab open — processing happens on your device using your CPU.
                </p>
              </div>
            )}

            {resultUrl && (
              <div className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground">Original</p>
                    <div className="flex min-h-[160px] items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
                      <img
                        src={originalUrl ?? undefined}
                        alt="Original"
                        className="max-h-[360px] w-auto max-w-full object-contain"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground">Background removed</p>
                    <div className="flex min-h-[160px] items-center justify-center overflow-hidden rounded-lg border bg-[repeating-conic-gradient(hsl(0_0%_90%)_0_25%,transparent_0_50%)] bg-[length:20px_20px] dark:bg-[repeating-conic-gradient(hsl(0_0%_22%)_0_25%,transparent_0_50%)]">
                      <img
                        src={resultUrl}
                        alt="Background removed"
                        className="max-h-[360px] w-auto max-w-full object-contain"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (!resultBlob) {
                      toast.error("Nothing to download yet.");
                      return;
                    }
                    const url = URL.createObjectURL(resultBlob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = downloadName;
                    a.style.display = "none";
                    document.body.appendChild(a);
                    a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
                  }}
                  className="w-full sm:w-auto"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Download PNG (transparent)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Upload an image",
        description:
          "Drag and drop a JPG, PNG, WebP or BMP file, or click to browse. Photos with clear foreground subjects (people, products, animals) work best.",
      },
      {
        title: "Remove the background",
        description:
          "Click the Remove background button. On first use, the browser downloads a ~30MB AI model — this is cached for instant subsequent runs.",
      },
      {
        title: "Preview the result",
        description:
          "See the original next to a transparent-background PNG rendered over a checkerboard so you can verify the cut-out.",
      },
      {
        title: "Download the PNG",
        description:
          "Save the result as a transparent PNG ready for compositing into any design or document.",
      },
    ],
    useCases: [
      "Create product cut-outs for e-commerce listings or marketplaces.",
      "Isolate a person for a profile picture or ID photo.",
      "Build transparent overlays for video editing or presentations.",
      "Quickly mask an object before compositing it onto a new backdrop.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The first run downloads a ~30MB AI model + WASM runtime. Subsequent runs are
          much faster because the browser caches these files.
        </li>
        <li>
          Very fine details (hair, fur, transparent objects, mesh) may not be perfectly
          cut — try the larger <code>isnet</code> model in code if you need higher fidelity.
        </li>
        <li>Processing time depends on your CPU and the image size — typically 5-30 seconds.</li>
        <li>Maximum supported file size is 50MB. Animated images are not supported.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my image uploaded to a server?",
        a: "No. The background-removal model (U2Net) runs entirely in your browser using ONNX Runtime Web. Your image is processed locally and is never transmitted to Dueneo or any third party.",
      },
      {
        q: "Why is the first run so slow?",
        a: "On first use, your browser downloads the AI model (~30MB) and the WASM runtime. These files are cached, so every subsequent removal is much faster — typically just a few seconds.",
      },
      {
        q: "What image formats can I use?",
        a: "You can upload JPG, PNG, WebP or BMP files. The result is always a transparent PNG so the alpha channel is preserved.",
      },
      {
        q: "Does it work on mobile?",
        a: "Yes — the model runs on the device's CPU. On low-end phones it may take longer and use significant memory, so very large images may fail. Try resizing the image first if needed.",
      },
      {
        q: "Can I batch-process multiple images?",
        a: "This tool processes one image at a time so you can preview the result. Run it again for each additional file.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

/** Turn internal asset keys like "isnet_quint8.onnx" into friendlier labels. */
function prettyProgressKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith(".onnx") || lower.includes("model")) {
    return "Downloading AI model…";
  }
  if (lower.endsWith(".wasm") || lower.includes("wasm")) {
    return "Loading WASM runtime…";
  }
  if (lower.includes("compute") || lower.includes("inference")) {
    return "Running neural network…";
  }
  if (lower.includes("decode") || lower.includes("encode")) {
    return "Encoding result…";
  }
  return "Working…";
}
