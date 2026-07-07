"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, RotateCcw, Wand2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  POSITION_OPTIONS,
  PreviewTile,
  downloadBlob,
  getCanvas2D,
  hexToRgba,
  loadImageFromFile,
  positionFor,
  replaceExtension,
  type Position,
} from "./_image-helpers";

export function WatermarkImage({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = React.useState<string | null>(null);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputBlob, setOutputBlob] = React.useState<Blob | null>(null);
  const [text, setText] = React.useState<string>("© Your Brand");
  const [fontSize, setFontSize] = React.useState<number>(48);
  const [color, setColor] = React.useState<string>("#ffffff");
  const [opacity, setOpacity] = React.useState<number>(70);
  const [position, setPosition] = React.useState<Position>("bottom-right");
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
  };

  const runWatermark = async () => {
    if (!file) {
      toast.error("Please upload an image first.");
      return;
    }
    if (!text.trim()) {
      toast.error("Please enter watermark text.");
      return;
    }
    setBusy(true);
    try {
      const img = await loadImageFromFile(file);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = getCanvas2D(canvas);
      ctx.drawImage(img, 0, 0);

      // Scale font relative to image width so it looks right on any size.
      const scaleFactor = img.naturalWidth / 1000;
      const fs = Math.max(8, fontSize * Math.max(0.5, scaleFactor));
      ctx.font = `bold ${fs}px Inter, Arial, sans-serif`;
      ctx.textBaseline = "top";
      const metrics = ctx.measureText(text);
      const boxW = metrics.width;
      const boxH = fs * 1.2;
      const padding = Math.max(8, fs * 0.5);
      const [px, py] = positionFor(
        position,
        canvas.width,
        canvas.height,
        boxW,
        boxH,
        padding
      );
      ctx.globalAlpha = opacity / 100;
      // Subtle shadow for legibility on bright images.
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = Math.max(2, fs * 0.08);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = hexToRgba(color, 1);
      ctx.fillText(text, px, py);

      const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, outType, 0.92)
      );
      if (!blob) throw new Error("Watermarking failed.");
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(URL.createObjectURL(blob));
      setOutputBlob(blob);
      toast.success("Watermark applied.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Watermarking failed.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setOriginalUrl(null);
    setOutputUrl(null);
    setOutputBlob(null);
  };

  const downloadName = file
    ? replaceExtension(file.name, file.type === "image/png" ? "png" : "jpg")
    : "watermarked.png";

  const content: ToolContent = {
    intro:
      "Add a text watermark to images with full control over position, font size, colour and opacity. Choose from nine placement positions and preview the result before downloading — all processing happens locally in your browser.",
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
              <Label htmlFor="wm-text">Watermark text</Label>
              <Input
                id="wm-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="© Your Brand"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITION_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wm-color">Colour</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="wm-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1"
                    aria-label="Watermark colour"
                  />
                  <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="wm-size">Font size</Label>
                  <span className="text-xs font-medium text-muted-foreground">{fontSize}px</span>
                </div>
                <Slider
                  id="wm-size"
                  value={[fontSize]}
                  min={12}
                  max={200}
                  step={1}
                  onValueChange={(v) => setFontSize(v[0] ?? 48)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="wm-op">Opacity</Label>
                  <span className="text-xs font-medium text-muted-foreground">{opacity}%</span>
                </div>
                <Slider
                  id="wm-op"
                  value={[opacity]}
                  min={5}
                  max={100}
                  step={1}
                  onValueChange={(v) => setOpacity(v[0] ?? 70)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Font size is auto-scaled relative to the image width so it looks proportional on any resolution.
            </p>

            <Button onClick={runWatermark} disabled={busy} className="w-full sm:w-auto">
              <Wand2 className="mr-1.5 h-4 w-4" />
              {busy ? "Applying…" : "Apply watermark"}
            </Button>

            {outputUrl && (
              <div className="grid gap-4 sm:grid-cols-2">
                <PreviewTile src={originalUrl} label="Original" />
                <PreviewTile src={outputUrl} label="Watermarked" />
                <div className="sm:col-span-2">
                  <Button
                    onClick={() => {
                      if (!downloadBlob(outputBlob, downloadName)) {
                        toast.error("Nothing to download yet.");
                      }
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Download className="mr-1.5 h-4 w-4" /> Download watermarked image
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
        description: "Drag and drop or browse for an image file.",
      },
      {
        title: "Enter watermark text",
        description: "Type your watermark text — typically a copyright notice, brand name or URL.",
      },
      {
        title: "Choose position, colour, size and opacity",
        description:
          "Pick from nine positions, set the text colour, font size and opacity. The font size auto-scales relative to the image width.",
      },
      {
        title: "Apply and download",
        description:
          "Click apply to render the watermark on the canvas, preview the result, then download.",
      },
    ],
    useCases: [
      "Brand your portfolio photos with a copyright notice.",
      "Add a logo-style text mark to social media graphics.",
      "Discourage unauthorised reuse of preview images.",
      "Stamp a URL or handle onto images before publishing.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Only text watermarks are supported in this build — image-based watermarks are not yet available.</li>
        <li>The font used depends on your system; we fall back to Inter, then Arial, then the default sans-serif.</li>
        <li>Watermarks are baked into the output image and cannot be removed later — keep your original.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my image uploaded?",
        a: "No. The watermark is rendered on a canvas in your browser. Your image never leaves your device.",
      },
      {
        q: "Can I use an image as a watermark instead of text?",
        a: "This build only supports text watermarks. You can paste a Unicode symbol or emoji into the text field for a logo-like effect.",
      },
      {
        q: "Why does the watermark look different on different image sizes?",
        a: "Font size is auto-scaled relative to image width so the watermark looks proportional. The pixel value you set is the size at a 1000px reference width.",
      },
      {
        q: "Can I add multiple watermarks?",
        a: "Apply the tool once, then upload the watermarked output and apply a second watermark. Multiple watermarks in one pass are not supported in this build.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
