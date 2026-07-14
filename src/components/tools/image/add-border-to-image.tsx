"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  PreviewTile,
  downloadBlob,
  getCanvas2D,
  hexToRgba,
  loadImageFromFile,
  replaceExtension,
} from "./_image-helpers";

export function AddBorderToImage({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = React.useState<string | null>(null);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputBlob, setOutputBlob] = React.useState<Blob | null>(null);
  const [width, setWidth] = React.useState<number>(20);
  const [color, setColor] = React.useState<string>("#000000");
  const [busy, setBusy] = React.useState(false);
  const processGen = React.useRef(0);

  React.useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [originalUrl, outputUrl]);

  // Auto-process when border settings change (debounced).
  React.useEffect(() => {
    if (!file) return;
    const gen = ++processGen.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const img = await loadImageFromFile(file);
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const scaleFactor = Math.max(0.5, w / 1000);
        const scaledBorder = Math.max(1, Math.round(width * scaleFactor));
        const canvas = document.createElement("canvas");
        canvas.width = w + scaledBorder * 2;
        canvas.height = h + scaledBorder * 2;
        const ctx = getCanvas2D(canvas);
        ctx.fillStyle = hexToRgba(color, 1);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, scaledBorder, scaledBorder, w, h);
        if (gen !== processGen.current) return;
        const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, outType, 0.92)
        );
        if (gen !== processGen.current) return;
        if (!blob) throw new Error("Could not add border.");
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(URL.createObjectURL(blob));
        setOutputBlob(blob);
      } catch (err) {
        if (gen === processGen.current) {
          toast.error(err instanceof Error ? err.message : "Border failed.");
        }
      } finally {
        if (gen === processGen.current) setBusy(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [file, width, color]);

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
    setWidth(20);
    setColor("#000000");
  };

  const downloadName = file
    ? replaceExtension(file.name, file.type === "image/png" ? "png" : "jpg")
    : "bordered.png";

  const content: ToolContent = {
    intro:
      "Add a coloured border to images with full control over width and colour. The border is auto-scaled relative to the image so it looks proportional on any resolution. All processing happens locally in your browser.",
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bd-width">Border width</Label>
                  <span className="text-xs font-medium text-muted-foreground">{width}px</span>
                </div>
                <Slider
                  id="bd-width"
                  value={[width]}
                  min={1}
                  max={200}
                  step={1}
                  onValueChange={(v) => setWidth(v[0] ?? 20)}
                />
                <p className="text-xs text-muted-foreground">
                  Border width auto-scales with the image dimensions.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bd-color">Border colour</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="bd-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1"
                    aria-label="Border colour"
                  />
                  <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
                </div>
              </div>
            </div>

            {busy && (
              <p className="text-xs text-muted-foreground animate-pulse">Processing…</p>
            )}

            {originalUrl && (
              <div className="grid gap-4 sm:grid-cols-2">
                <PreviewTile src={originalUrl} label="Original" />
                <PreviewTile src={outputUrl} label={outputUrl ? "With border" : "Result"} />
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
                      <Download className="mr-1.5 h-4 w-4" /> Download image
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
        description: "Drag and drop or browse for an image file. A border is applied automatically.",
      },
      {
        title: "Adjust width and colour",
        description:
          "Drag the width slider to set the border thickness, and use the colour picker to choose a colour. The preview updates automatically.",
      },
      {
        title: "Download the result",
        description: "Save the bordered image to your device.",
      },
    ],
    useCases: [
      "Frame a photo for a gallery or portfolio display.",
      "Add a coloured mat around an image for print layouts.",
      "Create a polaroid-style border for social media posts.",
      "Give screenshots a visible edge for documentation.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The border is uniform on all four sides; per-side widths are not supported in this build.</li>
        <li>Border styles are limited to solid colours — no gradients, patterns or rounded corners.</li>
        <li>The border increases the canvas dimensions, so the output image is larger than the original.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my image uploaded?",
        a: "No. The border is rendered on a canvas in your browser. Your image never leaves your device.",
      },
      {
        q: "Why does the border look thicker on some images?",
        a: "The border width is auto-scaled relative to the image width so it looks proportional. A 20px border on a 500px image looks like a 40px border on a 1000px image.",
      },
      {
        q: "Can I add a different colour on each side?",
        a: "This build supports a single uniform colour. For per-side colours, you would need to composite multiple bordered versions manually.",
      },
      {
        q: "Can I round the corners of the image?",
        a: "Not in this build — borders are strictly rectangular.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
