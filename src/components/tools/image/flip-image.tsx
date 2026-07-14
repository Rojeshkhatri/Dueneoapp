"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, FlipHorizontal, FlipVertical, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  PreviewTile,
  downloadBlob,
  getCanvas2D,
  loadImageFromFile,
  replaceExtension,
} from "./_image-helpers";

type FlipDir = "horizontal" | "vertical";

export function FlipImage({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = React.useState<string | null>(null);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputBlob, setOutputBlob] = React.useState<Blob | null>(null);
  const [flipDir, setFlipDir] = React.useState<FlipDir | null>(null);
  const [busy, setBusy] = React.useState(false);
  const processGen = React.useRef(0);

  React.useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [originalUrl, outputUrl]);

  // Auto-process when flip direction changes (debounced).
  React.useEffect(() => {
    if (!file || !flipDir) {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(null);
      setOutputBlob(null);
      return;
    }
    const gen = ++processGen.current;
    const dir = flipDir;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const img = await loadImageFromFile(file);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = getCanvas2D(canvas);
        if (dir === "horizontal") {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        } else {
          ctx.translate(0, canvas.height);
          ctx.scale(1, -1);
        }
        ctx.drawImage(img, 0, 0);
        if (gen !== processGen.current) return;
        const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, outType, 0.92)
        );
        if (gen !== processGen.current) return;
        if (!blob) throw new Error("Flip failed.");
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(URL.createObjectURL(blob));
        setOutputBlob(blob);
      } catch (err) {
        if (gen === processGen.current) {
          toast.error(err instanceof Error ? err.message : "Flip failed.");
        }
      } finally {
        if (gen === processGen.current) setBusy(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [file, flipDir]);

  const onFiles = (files: { file: File }[]) => {
    const f = files[0]?.file;
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      toast.error("Please choose an image file.");
      return;
    }
    setFile(f);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    setOriginalUrl(URL.createObjectURL(f));
    setOutputUrl(null);
    setOutputBlob(null);
    setFlipDir(null);
  };

  const reset = () => {
    setFile(null);
    setOriginalUrl(null);
    setOutputUrl(null);
    setOutputBlob(null);
    setFlipDir(null);
  };

  const downloadName = file
    ? replaceExtension(file.name, file.type === "image/png" ? "png" : "jpg")
    : "flipped.png";

  const content: ToolContent = {
    intro:
      "Flip images horizontally or vertically to mirror them along either axis. Useful for correcting mirrored selfies, creating symmetrical designs or producing reflections. All processing happens locally in your browser.",
    tool: (
      <div className="space-y-5">
        {!file ? (
          <Dropzone accept="image/*" onFiles={onFiles} hint="JPG, PNG, WebP · up to 50 MB" maxSizeLabel="50 MB" />
        ) : (
          <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FileChip name={file.name} size={file.size} onRemove={reset} />
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setFlipDir("horizontal")} variant={flipDir === "horizontal" ? "default" : "outline"}>
                <FlipHorizontal className="mr-1.5 h-4 w-4" /> Flip horizontal
              </Button>
              <Button onClick={() => setFlipDir("vertical")} variant={flipDir === "vertical" ? "default" : "outline"}>
                <FlipVertical className="mr-1.5 h-4 w-4" /> Flip vertical
              </Button>
              {busy && (
                <p className="text-xs text-muted-foreground animate-pulse">Processing…</p>
              )}
            </div>

            {originalUrl && (
              <div className="grid gap-4 sm:grid-cols-2">
                <PreviewTile src={originalUrl} label="Original" />
                <PreviewTile
                  src={outputUrl}
                  label={outputUrl ? "Flipped" : "Result"}
                  caption={outputUrl && flipDir ? (flipDir === "horizontal" ? "Mirrored horizontally" : "Mirrored vertically") : undefined}
                />
                {outputBlob && (
                  <div className="sm:col-span-2">
                    <Button
                      onClick={() => {
                        if (!downloadBlob(outputBlob, downloadName)) {
                          toast.error("Nothing to download yet.");
                        }
                      }}
                      className="w-full sm:w-auto"
                    >
                      <Download className="mr-1.5 h-4 w-4" /> Download flipped image
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Upload an image",
        description: "Drag and drop or browse for an image file.",
      },
      {
        title: "Choose a flip direction",
        description:
          "Click “Flip horizontal” to mirror left-to-right, or “Flip vertical” to mirror top-to-bottom.",
      },
      {
        title: "Preview and download",
        description:
          "See the mirrored result next to the original, then download it to your device.",
      },
    ],
    useCases: [
      "Correct a selfie that came out mirrored from the front camera.",
      "Create a symmetrical design by mirroring one half of an image.",
      "Produce a reflection effect for graphic design layouts.",
      "Flip a scanned document that was loaded face-down.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Flipping re-encodes the image; JPG quality may degrade slightly with repeated flips.</li>
        <li>Animated images are not supported; only the first frame is flipped.</li>
        <li>This tool only flips the whole image — it cannot mirror a region.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my image uploaded?",
        a: "No. The flip is rendered on a Canvas in your browser. The image never leaves your device.",
      },
      {
        q: "What is the difference between flip and rotate?",
        a: "Flipping mirrors the image across an axis, while rotation turns the image around its centre. A horizontal flip is the same as a mirror image.",
      },
      {
        q: "Will the dimensions change?",
        a: "No. Flipping preserves the original width and height — only the pixel arrangement is mirrored.",
      },
      {
        q: "Can I flip and rotate in one step?",
        a: "Use this tool to flip, then open the result in the Rotate Image tool (or vice-versa). Combining both in one click is not supported in this build.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
