"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, RotateCcw, RotateCw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  PreviewTile,
  downloadBlob,
  getCanvas2D,
  loadImageFromFile,
  replaceExtension,
} from "./_image-helpers";

export function RotateImage({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = React.useState<string | null>(null);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputBlob, setOutputBlob] = React.useState<Blob | null>(null);
  const [angle, setAngle] = React.useState<number>(0);
  const [busy, setBusy] = React.useState(false);
  const processGen = React.useRef(0);

  React.useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [originalUrl, outputUrl]);

  // Auto-process when angle changes (debounced).
  React.useEffect(() => {
    if (!file || angle === 0) {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(null);
      setOutputBlob(null);
      return;
    }
    const gen = ++processGen.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const img = await loadImageFromFile(file);
        const rad = (angle * Math.PI) / 180;
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const newW = Math.round(w * cos + h * sin);
        const newH = Math.round(w * sin + h * cos);
        const canvas = document.createElement("canvas");
        canvas.width = newW;
        canvas.height = newH;
        const ctx = getCanvas2D(canvas);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, newW, newH);
        ctx.translate(newW / 2, newH / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -w / 2, -h / 2);
        if (gen !== processGen.current) return;
        const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, outType, 0.92)
        );
        if (gen !== processGen.current) return;
        if (!blob) throw new Error("Rotation failed.");
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(URL.createObjectURL(blob));
        setOutputBlob(blob);
      } catch (err) {
        if (gen === processGen.current) {
          toast.error(err instanceof Error ? err.message : "Rotation failed.");
        }
      } finally {
        if (gen === processGen.current) setBusy(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [file, angle]);

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
    setAngle(0);
  };

  const reset = () => {
    setFile(null);
    setOriginalUrl(null);
    setOutputUrl(null);
    setOutputBlob(null);
    setAngle(0);
  };

  const downloadName = file
    ? replaceExtension(file.name, file.type === "image/png" ? "png" : "jpg")
    : "rotated.png";

  const content: ToolContent = {
    intro:
      "Rotate images 90°, 180° or 270° with one click, or apply a custom angle between 0° and 360°. Rotations render on a Canvas in your browser — your image is never uploaded.",
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
              <Button variant="outline" onClick={() => setAngle(90)}>
                <RotateCw className="mr-1.5 h-4 w-4" /> 90°
              </Button>
              <Button variant="outline" onClick={() => setAngle(180)}>
                <RotateCw className="mr-1.5 h-4 w-4" /> 180°
              </Button>
              <Button variant="outline" onClick={() => setAngle(270)}>
                <RotateCw className="mr-1.5 h-4 w-4" /> 270°
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="rt-angle">Custom angle</Label>
                <span className="text-xs font-medium text-muted-foreground">{angle}°</span>
              </div>
              <Slider
                id="rt-angle"
                value={[angle]}
                min={0}
                max={360}
                step={1}
                onValueChange={(v) => setAngle(v[0] ?? 0)}
              />
              <p className="text-xs text-muted-foreground">
                Custom angles pad the canvas with a white background so no part of the image is cut off.
              </p>
              {busy && (
                <p className="text-xs text-muted-foreground animate-pulse">Processing…</p>
              )}
            </div>

            {originalUrl && (
              <div className="grid gap-4 sm:grid-cols-2">
                <PreviewTile src={originalUrl} label="Original" />
                <PreviewTile
                  src={outputUrl}
                  label={outputUrl ? "Rotated" : "Result"}
                  caption={outputUrl ? `${angle}°` : undefined}
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
                      <Download className="mr-1.5 h-4 w-4" /> Download rotated image
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
        title: "Pick a rotation",
        description:
          "Click 90°, 180° or 270° for a quick orthogonal rotation, or drag the slider for any angle between 0° and 360°.",
      },
      {
        title: "Apply and preview",
        description:
          "Click Apply to render the rotated image. Orthogonal rotations preserve the canvas size; custom angles pad the canvas with white.",
      },
      {
        title: "Download",
        description: "Save the rotated image to your device.",
      },
    ],
    useCases: [
      "Fix a phone photo that was saved sideways.",
      "Rotate a landscape logo 90° for a vertical banner layout.",
      "Apply a slight tilt for a creative composition.",
      "Correct a scanned document that came in upside down.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Custom angles (not multiples of 90°) pad the canvas with a white background, which enlarges the output dimensions.</li>
        <li>Rotations re-encode the image, so JPG quality may degrade slightly.</li>
        <li>Animated images are not supported.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my image uploaded?",
        a: "No. Rotation happens in your browser via the Canvas API. Your image never leaves your device.",
      },
      {
        q: "Why does my custom-rotated image have white corners?",
        a: "When you rotate by an angle that is not a multiple of 90°, the canvas must grow to contain the rotated image. The empty triangular areas are filled with white.",
      },
      {
        q: "Can I rotate multiple images at once?",
        a: "This tool processes one image at a time so you can preview the result. Repeat for additional images.",
      },
      {
        q: "What is the difference between rotate and flip?",
        a: "Rotation turns the image around its centre, while flipping mirrors it across a horizontal or vertical axis.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
