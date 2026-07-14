"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type Format = "image/jpeg" | "image/png" | "image/webp";

const FORMAT_LABEL: Record<Format, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

function detectFormat(file: File): Format {
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/webp") return "image/webp";
  return "image/jpeg";
}

export function ImageCompressor({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [quality, setQuality] = React.useState<number>(75);
  const [format, setFormat] = React.useState<Format>("image/jpeg");
  const [originalUrl, setOriginalUrl] = React.useState<string | null>(null);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputBlob, setOutputBlob] = React.useState<Blob | null>(null);
  const [originalSize, setOriginalSize] = React.useState<number>(0);
  const [outputSize, setOutputSize] = React.useState<number>(0);
  const [dimensions, setDimensions] = React.useState<{ w: number; h: number } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const processGen = React.useRef(0);

  // Revoke object URLs on cleanup / replace.
  React.useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
    };
  }, [originalUrl]);
  React.useEffect(() => {
    return () => {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [outputUrl]);

  const onFiles = (files: { file: File }[]) => {
    const f = files[0]?.file;
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      toast.error("Please choose an image file (JPG, PNG or WebP).");
      return;
    }
    setFile(f);
    setOutputUrl(null);
    setOutputBlob(null);
    setOutputSize(0);
    setOriginalSize(f.size);
    setFormat(detectFormat(f));
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    setOriginalUrl(URL.createObjectURL(f));
    loadImageFromFile(f)
      .then((img) => setDimensions({ w: img.naturalWidth, h: img.naturalHeight }))
      .catch(() => setDimensions(null));
  };

  // Auto-compress when file, quality, or format changes (debounced).
  React.useEffect(() => {
    if (!file) return;
    const gen = ++processGen.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const img = await loadImageFromFile(file);
        if (processGen.current !== gen) return;
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = getCanvas2D(canvas);
        if (format === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, format, quality / 100)
        );
        if (processGen.current !== gen) return;
        if (!blob) throw new Error("Compression failed.");
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(URL.createObjectURL(blob));
        setOutputBlob(blob);
        setOutputSize(blob.size);
      } catch (err) {
        if (processGen.current === gen) {
          toast.error(err instanceof Error ? err.message : "Compression failed.");
        }
      } finally {
        if (processGen.current === gen) setBusy(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [file, quality, format]);

  const reset = () => {
    setFile(null);
    setOriginalUrl(null);
    setOutputUrl(null);
    setOutputBlob(null);
    setOriginalSize(0);
    setOutputSize(0);
    setDimensions(null);
    setQuality(75);
  };

  const savingsPct =
    originalSize > 0 && outputSize > 0
      ? Math.max(0, Math.round((1 - outputSize / originalSize) * 100))
      : 0;

  const downloadName = file
    ? replaceExtension(file.name, FORMAT_LABEL[format].toLowerCase())
    : "compressed.png";

  const content: ToolContent = {
    intro:
      "Compress JPG, PNG and WebP images locally in your browser. Drag and drop your file, choose a quality level and download the smaller result — your image never leaves your device.",
    tool: (
      <div className="space-y-5">
        {!file ? (
          <Dropzone
            accept="image/jpeg,image/png,image/webp"
            onFiles={onFiles}
            hint="JPG, PNG or WebP · up to 50 MB"
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Output format</Label>
                <Select
                  value={format}
                  onValueChange={(v) => setFormat(v as Format)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image/jpeg">JPG (smallest)</SelectItem>
                    <SelectItem value="image/png">PNG (lossless)</SelectItem>
                    <SelectItem value="image/webp">WebP (modern)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ic-quality">Quality</Label>
                  <span className="text-xs font-medium text-muted-foreground">
                    {quality}%
                  </span>
                </div>
                <Slider
                  id="ic-quality"
                  value={[quality]}
                  min={5}
                  max={100}
                  step={1}
                  onValueChange={(v) => setQuality(v[0] ?? 75)}
                  disabled={format === "image/png"}
                />
                <p className="text-xs text-muted-foreground">
                  {format === "image/png"
                    ? "PNG is lossless — quality has no effect."
                    : "Lower = smaller file, lower visual quality."}
                </p>
              </div>
            </div>

            {dimensions && (
              <p className="text-xs text-muted-foreground">
                Original: {dimensions.w} × {dimensions.h}px · {formatBytes(originalSize)}
              </p>
            )}

            {busy && (
              <p className="text-xs text-muted-foreground animate-pulse">Compressing…</p>
            )}

            {outputUrl && (
              <div className="grid gap-4 sm:grid-cols-2">
                <PreviewTile
                  src={originalUrl}
                  label="Original"
                  caption={formatBytes(originalSize)}
                />
                <PreviewTile
                  src={outputUrl}
                  label="Compressed"
                  caption={
                    <>
                      {formatBytes(outputSize)} · {savingsPct}% smaller
                    </>
                  }
                />
                <div className="sm:col-span-2">
                  <Button
                    onClick={() => {
                      if (!downloadBlob(outputBlob, downloadName)) {
                        toast.error("Nothing to download yet.");
                      }
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Download compressed image
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
        description:
          "Drag and drop a JPG, PNG or WebP file onto the dropzone, or click to browse. Files up to 50 MB are supported.",
      },
      {
        title: "Pick a format and quality",
        description:
          "Keep the original format or switch. For JPG/WebP, drag the quality slider — lower values produce smaller files at the cost of visual fidelity.",
      },
      {
        title: "Compress and compare",
        description:
          "Click the compress button to render the new image with the Canvas API. You will see a before/after preview and the percentage saved.",
      },
      {
        title: "Download the result",
        description:
          "Click the download button to save the compressed image to your device. The original file is never uploaded.",
      },
    ],
    useCases: [
      "Shrink photos before attaching them to an email.",
      "Optimise product images for faster-loading e-commerce pages.",
      "Reduce banner images to fit a content management system size limit.",
      "Strip bulky PNG screenshots down to a more shareable WebP file.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Very large images (&gt;50 MB) may slow down or crash your browser tab.</li>
        <li>PNG output is lossless, so it will not get much smaller regardless of the quality setting.</li>
        <li>Animated WebP or GIF frames are not supported — only the first frame is processed.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my image uploaded to a server?",
        a: "No. The image is loaded into your browser memory and processed with the Canvas API. It is never transmitted to Dueneo or any third party.",
      },
      {
        q: "What quality should I choose?",
        a: "For most photographs, 70–80% produces a barely noticeable visual difference while cutting file size dramatically. Use 90%+ only when quality matters more than size.",
      },
      {
        q: "Why does my PNG not get smaller?",
        a: "PNG is a lossless format. The quality slider only affects lossy formats like JPG and WebP. To shrink a PNG, switch the output format to JPG or WebP.",
      },
      {
        q: "Can I batch-compress multiple images?",
        a: "This tool processes one image at a time so you can preview the result. Run it again for each additional file.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
