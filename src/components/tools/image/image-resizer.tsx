"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Link2, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  PreviewTile,
  downloadBlob,
  formatBytes,
  getCanvas2D,
  loadImageFromFile,
  replaceExtension,
} from "./_image-helpers";

type Mode = "pixels" | "percent" | "preset";

const PRESETS: { label: string; w: number; h: number }[] = [
  { label: "1920 × 1080 (Full HD)", w: 1920, h: 1080 },
  { label: "1280 × 720 (HD)", w: 1280, h: 720 },
  { label: "800 × 600", w: 800, h: 600 },
  { label: "640 × 480", w: 640, h: 480 },
  { label: "500 × 500 (square)", w: 500, h: 500 },
  { label: "256 × 256", w: 256, h: 256 },
  { label: "128 × 128 (thumbnail)", w: 128, h: 128 },
  { label: "64 × 64 (favicon)", w: 64, h: 64 },
];

export function ImageResizer({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [mode, setMode] = React.useState<Mode>("pixels");
  const [width, setWidth] = React.useState<number>(1280);
  const [height, setHeight] = React.useState<number>(720);
  const [percent, setPercent] = React.useState<number>(50);
  const [presetIdx, setPresetIdx] = React.useState<number>(0);
  const [lockAspect, setLockAspect] = React.useState<boolean>(true);
  const [naturalSize, setNaturalSize] = React.useState<{ w: number; h: number } | null>(null);
  const [aspect, setAspect] = React.useState<number>(16 / 9);
  const [originalUrl, setOriginalUrl] = React.useState<string | null>(null);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputBlob, setOutputBlob] = React.useState<Blob | null>(null);
  const [busy, setBusy] = React.useState(false);
  const processGen = React.useRef(0);

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
    loadImageFromFile(f)
      .then((img) => {
        setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
        setWidth(img.naturalWidth);
        setHeight(img.naturalHeight);
        setAspect(img.naturalWidth / img.naturalHeight);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Load failed."));
  };

  const targetDimensions = React.useMemo<{ w: number; h: number }>(() => {
    if (!naturalSize) return { w: width, h: height };
    if (mode === "percent") {
      return {
        w: Math.max(1, Math.round((naturalSize.w * percent) / 100)),
        h: Math.max(1, Math.round((naturalSize.h * percent) / 100)),
      };
    }
    if (mode === "preset") {
      const p = PRESETS[presetIdx];
      return { w: p.w, h: p.h };
    }
    return { w: Math.max(1, Math.round(width)), h: Math.max(1, Math.round(height)) };
  }, [mode, naturalSize, percent, presetIdx, width, height]);

  const onWidthChange = (v: number) => {
    setWidth(v);
    if (lockAspect && aspect > 0 && v > 0) {
      setHeight(Math.round(v / aspect));
    }
  };
  const onHeightChange = (v: number) => {
    setHeight(v);
    if (lockAspect && aspect > 0 && v > 0) {
      setWidth(Math.round(v * aspect));
    }
  };

  // Auto-resize when file or target dimensions change (debounced).
  React.useEffect(() => {
    if (!file) return;
    const gen = ++processGen.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const img = await loadImageFromFile(file);
        if (processGen.current !== gen) return;
        const { w, h } = targetDimensions;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = getCanvas2D(canvas);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);
        const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, outType, 0.92)
        );
        if (processGen.current !== gen) return;
        if (!blob) throw new Error("Resize failed.");
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(URL.createObjectURL(blob));
        setOutputBlob(blob);
      } catch (err) {
        if (processGen.current === gen) {
          toast.error(err instanceof Error ? err.message : "Resize failed.");
        }
      } finally {
        if (processGen.current === gen) setBusy(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [file, targetDimensions]);

  const reset = () => {
    setFile(null);
    setOriginalUrl(null);
    setOutputUrl(null);
    setOutputBlob(null);
    setNaturalSize(null);
  };

  const downloadName = file
    ? replaceExtension(file.name, file.type === "image/png" ? "png" : "jpg")
    : "resized.png";

  const content: ToolContent = {
    intro:
      "Resize images by exact pixels, percentage, or a popular preset. Lock the aspect ratio to avoid distortion, then download the result — all processing happens locally in your browser.",
    tool: (
      <div className="space-y-5">
        {!file ? (
          <Dropzone
            accept="image/*"
            onFiles={onFiles}
            hint="JPG, PNG, WebP · up to 50 MB"
            maxSizeLabel="50 MB"
          />
        ) : (
          <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FileChip name={file.name} size={file.size} onRemove={reset} />
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>

            {naturalSize && (
              <p className="text-xs text-muted-foreground">
                Original: {naturalSize.w} × {naturalSize.h}px · aspect{" "}
                {(naturalSize.w / naturalSize.h).toFixed(2)}
              </p>
            )}

            <div className="space-y-2">
              <Label>Resize mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pixels">By pixels</SelectItem>
                  <SelectItem value="percent">By percentage</SelectItem>
                  <SelectItem value="preset">By preset</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "pixels" && (
              <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="ir-w">Width (px)</Label>
                  <Input
                    id="ir-w"
                    type="number"
                    min={1}
                    value={width}
                    onChange={(e) => onWidthChange(Math.max(1, parseInt(e.target.value || "0", 10)))}
                  />
                </div>
                <label className="flex items-center gap-2 pb-2 text-xs text-muted-foreground sm:justify-center">
                  <Checkbox
                    checked={lockAspect}
                    onCheckedChange={(v) => setLockAspect(v === true)}
                    id="ir-lock"
                  />
                  <Link2 className="h-3.5 w-3.5" />
                  Lock ratio
                </label>
                <div className="space-y-2">
                  <Label htmlFor="ir-h">Height (px)</Label>
                  <Input
                    id="ir-h"
                    type="number"
                    min={1}
                    value={height}
                    onChange={(e) => onHeightChange(Math.max(1, parseInt(e.target.value || "0", 10)))}
                  />
                </div>
              </div>
            )}

            {mode === "percent" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ir-pct">Scale</Label>
                  <span className="text-xs font-medium text-muted-foreground">{percent}%</span>
                </div>
                <Slider
                  id="ir-pct"
                  value={[percent]}
                  min={1}
                  max={200}
                  step={1}
                  onValueChange={(v) => setPercent(v[0] ?? 50)}
                />
                <p className="text-xs text-muted-foreground">
                  Target: {targetDimensions.w} × {targetDimensions.h}px
                </p>
              </div>
            )}

            {mode === "preset" && (
              <div className="space-y-2">
                <Label>Preset size</Label>
                <Select
                  value={String(presetIdx)}
                  onValueChange={(v) => setPresetIdx(parseInt(v, 10))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESETS.map((p, i) => (
                      <SelectItem key={p.label} value={String(i)}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {busy && (
              <p className="text-xs text-muted-foreground animate-pulse">Resizing…</p>
            )}

            {outputUrl && (
              <div className="grid gap-4 sm:grid-cols-2">
                <PreviewTile src={originalUrl} label="Original" />
                <PreviewTile
                  src={outputUrl}
                  label="Resized"
                  caption={`${targetDimensions.w} × ${targetDimensions.h}px`}
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
                    <Download className="mr-1.5 h-4 w-4" /> Download resized image
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
        description: "Drag and drop or browse for a JPG, PNG or WebP file.",
      },
      {
        title: "Choose a resize mode",
        description:
          "Use pixels for exact dimensions, percentage to scale up or down, or a preset like 1920×1080.",
      },
      {
        title: "Lock aspect ratio (optional)",
        description:
          "When resizing by pixels, keep the lock on to prevent stretching. Adjust either field and the other updates automatically.",
      },
      {
        title: "Resize and download",
        description:
          "Click resize to render the new dimensions on a canvas, preview the result, then download it.",
      },
    ],
    useCases: [
      "Shrink a 4K photo to 1920×1080 for a website hero image.",
      "Make a square 500×500 thumbnail for a product grid.",
      "Reduce image dimensions by 50% for faster email attachments.",
      "Generate a 64×64 favicon-sized version of a logo.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Upscaling small images beyond 2–3× will produce blurry results — Canvas uses bilinear smoothing.</li>
        <li>Animated GIF/WebP frames are not supported; only the first frame is resized.</li>
        <li>The output is re-encoded as JPG or PNG. Repeatedly re-encoding JPGs degrades quality.</li>
      </ul>
    ),
    faq: [
      {
        q: "Will my image be uploaded?",
        a: "No. The image is loaded into your browser only and processed with the Canvas API. It never leaves your device.",
      },
      {
        q: "What happens when I lock the aspect ratio?",
        a: "When you change one dimension, the other is updated automatically based on the original aspect ratio so the image is not stretched.",
      },
      {
        q: "Can I resize to a custom size not in the presets?",
        a: "Yes — choose the “By pixels” mode and enter any width and height in pixels.",
      },
      {
        q: "Why is my resized PNG larger than the original?",
        a: "PNGs are lossless and pixel-count sensitive. Reducing dimensions usually shrinks them, but resizing sometimes produces a less efficiently compressible image. Try JPG output for photos.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
