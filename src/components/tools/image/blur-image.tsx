"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  PreviewTile,
  downloadBlob,
  formatBytes,
  getCanvas2D,
  loadImageFromFile,
  replaceExtension,
} from "./_image-helpers";

export function BlurImage({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = React.useState<string | null>(null);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputBlob, setOutputBlob] = React.useState<Blob | null>(null);
  const [radius, setRadius] = React.useState<number>(8);
  const [busy, setBusy] = React.useState(false);
  const processGen = React.useRef(0);

  React.useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [originalUrl, outputUrl]);

  // Auto-process when radius changes (debounced).
  React.useEffect(() => {
    if (!file) return;
    const gen = ++processGen.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const img = await loadImageFromFile(file);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = getCanvas2D(canvas);
        ctx.filter = radius > 0 ? `blur(${radius}px)` : "none";
        ctx.drawImage(img, 0, 0);
        ctx.filter = "none";
        if (gen !== processGen.current) return;
        const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, outType, 0.92)
        );
        if (gen !== processGen.current) return;
        if (!blob) throw new Error("Blur failed.");
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(URL.createObjectURL(blob));
        setOutputBlob(blob);
      } catch (err) {
        if (gen === processGen.current) {
          toast.error(err instanceof Error ? err.message : "Blur failed.");
        }
      } finally {
        if (gen === processGen.current) setBusy(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [file, radius]);

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
  };

  const reset = () => {
    setFile(null);
    setOriginalUrl(null);
    setOutputUrl(null);
    setOutputBlob(null);
    setRadius(8);
  };

  const downloadName = file
    ? replaceExtension(file.name, file.type === "image/png" ? "png" : "jpg")
    : "blurred.png";

  const content: ToolContent = {
    intro:
      "Apply a Gaussian blur to images to soften detail, hide sensitive information or create depth. Drag the radius slider and the preview updates instantly — all processing happens locally in your browser using the Canvas filter API.",
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bl-radius">Blur radius</Label>
                <span className="text-xs font-medium text-muted-foreground">{radius}px</span>
              </div>
              <Slider
                id="bl-radius"
                value={[radius]}
                min={0}
                max={40}
                step={1}
                onValueChange={(v) => setRadius(v[0] ?? 8)}
              />
              <p className="text-xs text-muted-foreground">
                Larger values produce a stronger blur. The preview updates automatically.
              </p>
            </div>

            {busy && (
              <p className="text-xs text-muted-foreground animate-pulse">Processing…</p>
            )}

            {originalUrl && (
              <div className="grid gap-4 sm:grid-cols-2">
                <PreviewTile src={originalUrl} label="Original" />
                <PreviewTile src={outputUrl} label={outputUrl ? "Blurred" : "Result"} caption={outputBlob ? formatBytes(outputBlob.size) : undefined} />
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
                      <Download className="mr-1.5 h-4 w-4" /> Download blurred image
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
        description: "Drag and drop or browse for an image file. A blur is applied automatically.",
      },
      {
        title: "Adjust the blur radius",
        description:
          "Drag the slider to change the blur strength. The preview updates instantly as you drag.",
      },
      {
        title: "Download the result",
        description: "Save the blurred image to your device.",
      },
    ],
    useCases: [
      "Censor faces, licence plates or sensitive text in screenshots.",
      "Create a soft background for hero sections and overlays.",
      "Produce a depth-of-field effect for product photography.",
      "Soften skin or hide identifying details before sharing.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The Canvas filter API is required; very old browsers may not support it.</li>
        <li>Blurring is applied to the whole image — region-based blur is not available in this build.</li>
        <li>Strong blurs on large images may take a moment to render.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my image uploaded?",
        a: "No. The blur is rendered on a canvas in your browser via the Canvas filter API. Your image never leaves your device.",
      },
      {
        q: "Is the blur reversible?",
        a: "No. Once you download the blurred image, the original detail is permanently lost. Keep your original file if you may need it.",
      },
      {
        q: "Can I blur only part of the image?",
        a: "This build applies the blur to the whole image. To blur a region, crop the region with the Crop Image tool, blur it, then composite it back manually.",
      },
      {
        q: "Why does the blur look blocky on some images?",
        a: "That is typically a browser rendering issue at very high radii on large images. Try a slightly smaller radius for smoother results.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
