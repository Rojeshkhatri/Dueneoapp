"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, RotateCcw, Wand2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  PreviewTile,
  downloadBlob,
  formatBytes,
  getCanvas2D,
  loadImageFromFile,
  replaceExtension,
} from "./_image-helpers";

export function PixelateImage({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = React.useState<string | null>(null);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputBlob, setOutputBlob] = React.useState<Blob | null>(null);
  const [blockSize, setBlockSize] = React.useState<number>(16);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [originalUrl, outputUrl]);

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
    applyPixelate(f, blockSize);
  };

  const applyPixelate = async (source: File, size: number) => {
    setBusy(true);
    try {
      const img = await loadImageFromFile(source);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = getCanvas2D(canvas);

      // Draw to a small canvas with image smoothing disabled, then scale back up.
      const smallW = Math.max(1, Math.floor(w / size));
      const smallH = Math.max(1, Math.floor(h / size));
      const small = document.createElement("canvas");
      small.width = smallW;
      small.height = smallH;
      const smallCtx = getCanvas2D(small);
      smallCtx.imageSmoothingEnabled = false;
      smallCtx.drawImage(img, 0, 0, smallW, smallH);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, smallW, smallH, 0, 0, w, h);

      const outType = source.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, outType, 0.92)
      );
      if (!blob) throw new Error("Pixelation failed.");
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(URL.createObjectURL(blob));
      setOutputBlob(blob);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pixelation failed.");
    } finally {
      setBusy(false);
    }
  };

  const onBlockSizeChange = (v: number) => {
    setBlockSize(v);
    if (file) applyPixelate(file, v);
  };

  const reset = () => {
    setFile(null);
    setOriginalUrl(null);
    setOutputUrl(null);
    setOutputBlob(null);
    setBlockSize(16);
  };

  const downloadName = file
    ? replaceExtension(file.name, file.type === "image/png" ? "png" : "jpg")
    : "pixelated.png";

  const content: ToolContent = {
    intro:
      "Pixelate images to censor faces, licence plates or sensitive text, or to create a retro blocky aesthetic. Drag the block-size slider and the preview updates instantly — all processing happens locally in your browser.",
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
                <Label htmlFor="px-block">Block size</Label>
                <span className="text-xs font-medium text-muted-foreground">{blockSize}px</span>
              </div>
              <Slider
                id="px-block"
                value={[blockSize]}
                min={2}
                max={64}
                step={1}
                onValueChange={(v) => onBlockSizeChange(v[0] ?? 16)}
              />
              <p className="text-xs text-muted-foreground">
                Larger blocks produce a more aggressive pixelation. The preview updates automatically.
              </p>
            </div>

            <Button onClick={() => file && applyPixelate(file, blockSize)} disabled={busy} className="w-full sm:w-auto">
              <Wand2 className="mr-1.5 h-4 w-4" />
              {busy ? "Pixelating…" : "Re-apply pixelate"}
            </Button>

            {outputUrl && (
              <div className="grid gap-4 sm:grid-cols-2">
                <PreviewTile src={originalUrl} label="Original" />
                <PreviewTile src={outputUrl} label="Pixelated" caption={outputBlob ? formatBytes(outputBlob.size) : undefined} />
                <div className="sm:col-span-2">
                  <Button
                    onClick={() => {
                      if (!downloadBlob(outputBlob, downloadName)) {
                        toast.error("Nothing to download yet.");
                      }
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Download className="mr-1.5 h-4 w-4" /> Download pixelated image
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
        title: "Upload an image",
        description: "Drag and drop or browse for an image file. Pixelation is applied automatically.",
      },
      {
        title: "Adjust the block size",
        description:
          "Drag the slider to change how large each pixel block is. Larger blocks hide more detail.",
      },
      {
        title: "Download the result",
        description: "Save the pixelated image to your device.",
      },
    ],
    useCases: [
      "Censor faces or personal information in screenshots.",
      "Hide licence plates, addresses or signatures in photos.",
      "Create a retro 8-bit aesthetic for graphics.",
      "Anonymise participants in event photography.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Pixelation is applied to the whole image — region-based pixelation is not available in this build.</li>
        <li>Pixelation is not a security measure: determined attackers may be able to recover some detail from low block sizes.</li>
        <li>Very large block sizes on small images can produce a near-uniform colour.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my image uploaded?",
        a: "No. Pixelation is rendered on a canvas in your browser. Your image never leaves your device.",
      },
      {
        q: "Is pixelation secure for censoring sensitive information?",
        a: "Pixelation can sometimes be reversed if the block size is small relative to the original detail. For maximum privacy, use a large block size (32px+) or combine with the Blur Image tool.",
      },
      {
        q: "Can I pixelate only part of the image?",
        a: "This build applies pixelation to the whole image. To pixelate a region, crop it first with the Crop Image tool.",
      },
      {
        q: "What is the difference between pixelate and blur?",
        a: "Pixelation produces visible blocky squares; blur produces a smooth gradient. Pixelation is more overt, blur is more subtle.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
