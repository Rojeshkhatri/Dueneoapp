"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
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
import { Download, RotateCcw, Crop as CropIcon } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  PreviewTile,
  downloadBlob,
  getCanvas2D,
  loadImageFromFile,
  replaceExtension,
} from "./_image-helpers";

const ASPECT_PRESETS: { label: string; value: number | null }[] = [
  { label: "Free", value: null },
  { label: "1:1 (square)", value: 1 },
  { label: "16:9 (widescreen)", value: 16 / 9 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "2:3 (portrait)", value: 2 / 3 },
  { label: "9:16 (story)", value: 9 / 16 },
];

export function CropImage({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [natural, setNatural] = React.useState<{ w: number; h: number } | null>(null);
  const [originalUrl, setOriginalUrl] = React.useState<string | null>(null);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputBlob, setOutputBlob] = React.useState<Blob | null>(null);
  const [x, setX] = React.useState("0");
  const [y, setY] = React.useState("0");
  const [w, setW] = React.useState("0");
  const [h, setH] = React.useState("0");
  const [aspect, setAspect] = React.useState<number | null>(null);
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
    loadImageFromFile(f)
      .then((img) => {
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        setNatural({ w: nw, h: nh });
        // Default crop: centered 80% region.
        const cw = Math.round(nw * 0.8);
        const ch = Math.round(nh * 0.8);
        setX(String(Math.round((nw - cw) / 2)));
        setY(String(Math.round((nh - ch) / 2)));
        setW(String(cw));
        setH(String(ch));
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Load failed."));
  };

  const applyAspect = (nextAspect: number | null) => {
    setAspect(nextAspect);
    if (!natural || nextAspect === null) return;
    const curW = parseInt(w) || 0;
    const curY = parseInt(y) || 0;
    const newH = Math.max(1, Math.round(curW / nextAspect));
    const clampedH = Math.min(newH, natural.h - curY);
    setH(String(clampedH));
  };

  const onChangeX = (val: string) => {
    setX(val);
  };
  const onChangeY = (val: string) => {
    setY(val);
  };
  const onChangeW = (val: string) => {
    setW(val);
    if (natural && aspect) {
      const numW = parseInt(val) || 0;
      const curY = parseInt(y) || 0;
      const newH = Math.max(1, Math.min(Math.round(numW / aspect), natural.h - curY));
      setH(String(newH));
    }
  };
  const onChangeH = (val: string) => {
    setH(val);
    if (natural && aspect) {
      const numH = parseInt(val) || 0;
      const curX = parseInt(x) || 0;
      const newW = Math.max(1, Math.min(Math.round(numH * aspect), natural.w - curX));
      setW(String(newW));
    }
  };

  const runCrop = async () => {
    if (!file) {
      toast.error("Please upload an image first.");
      return;
    }
    const cx = parseInt(x) || 0;
    const cy = parseInt(y) || 0;
    const cw = parseInt(w) || 0;
    const ch = parseInt(h) || 0;
    if (cw <= 0 || ch <= 0) {
      toast.error("Crop region is too small.");
      return;
    }
    setBusy(true);
    try {
      const img = await loadImageFromFile(file);
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = getCanvas2D(canvas);
      ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
      const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, outType, 0.92)
      );
      if (!blob) throw new Error("Crop failed.");
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(URL.createObjectURL(blob));
      setOutputBlob(blob);
      toast.success(`Cropped to ${cw} × ${ch}px.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Crop failed.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setOriginalUrl(null);
    setOutputUrl(null);
    setOutputBlob(null);
    setNatural(null);
    setX("0"); setY("0"); setW("0"); setH("0");
  };

  const downloadName = file
    ? replaceExtension(file.name, file.type === "image/png" ? "png" : "jpg")
    : "cropped.png";

  // Visual overlay rectangle as percentages for the preview.
  const numX = parseInt(x) || 0;
  const numY = parseInt(y) || 0;
  const numW = parseInt(w) || 0;
  const numH = parseInt(h) || 0;
  const overlayStyle = natural
    ? {
        left: `${(numX / natural.w) * 100}%`,
        top: `${(numY / natural.h) * 100}%`,
        width: `${(numW / natural.w) * 100}%`,
        height: `${(numH / natural.h) * 100}%`,
      }
    : undefined;

  const content: ToolContent = {
    intro:
      "Crop images to a custom region or aspect ratio. Adjust the X, Y, width and height numerically, pick a preset aspect ratio, then download the cropped result — all locally in your browser.",
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

            {originalUrl && (
              <div className="relative overflow-hidden rounded-lg border bg-muted/30">
                <img
                  src={originalUrl}
                  alt="To crop"
                  className="block max-h-[420px] w-full object-contain"
                />
                {overlayStyle && (
                  <div
                    className="pointer-events-none absolute border-2 border-primary bg-primary/20"
                    style={overlayStyle}
                  />
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Aspect ratio</Label>
              <Select
                value={aspect === null ? "free" : String(aspect)}
                onValueChange={(v) => {
                  if (v === "free") applyAspect(null);
                  else applyAspect(parseFloat(v));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_PRESETS.map((p) => (
                    <SelectItem key={p.label} value={p.value === null ? "free" : String(p.value)}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="crop-x">X</Label>
                <Input
                  id="crop-x"
                  type="number"
                  min={0}
                  value={x}
                  onChange={(e) => onChangeX(e.target.value || "0")}
                  disabled={!natural}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crop-y">Y</Label>
                <Input
                  id="crop-y"
                  type="number"
                  min={0}
                  value={y}
                  onChange={(e) => onChangeY(e.target.value || "0")}
                  disabled={!natural}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crop-w">Width</Label>
                <Input
                  id="crop-w"
                  type="number"
                  min={1}
                  value={w}
                  onChange={(e) => onChangeW(e.target.value || "0")}
                  disabled={!natural}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crop-h">Height</Label>
                <Input
                  id="crop-h"
                  type="number"
                  min={1}
                  value={h}
                  onChange={(e) => onChangeH(e.target.value || "0")}
                  disabled={!natural}
                />
              </div>
            </div>

            <Button onClick={runCrop} disabled={busy} className="w-full sm:w-auto">
              <CropIcon className="mr-1.5 h-4 w-4" />
              {busy ? "Cropping…" : "Crop image"}
            </Button>

            {outputUrl && (
              <div className="grid gap-4 sm:grid-cols-2">
                <PreviewTile src={originalUrl} label="Original" />
                <PreviewTile src={outputUrl} label="Cropped" caption={`${numW} × ${numH}px`} />
                <div className="sm:col-span-2">
                  <Button
                    onClick={() => {
                      if (!downloadBlob(outputBlob, downloadName)) {
                        toast.error("Nothing to download yet.");
                      }
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Download className="mr-1.5 h-4 w-4" /> Download cropped image
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
        title: "Choose an aspect ratio (optional)",
        description:
          "Pick a preset like 1:1 or 16:9 to constrain the crop shape, or leave it on Free for arbitrary rectangles.",
      },
      {
        title: "Adjust the crop region",
        description:
          "Use the X, Y, width and height inputs to position the crop. A live overlay on the preview shows exactly what will be kept.",
      },
      {
        title: "Crop and download",
        description:
          "Click crop to extract the region with the Canvas API, preview the result, then download.",
      },
    ],
    useCases: [
      "Square a portrait photo for an Instagram post.",
      "Crop a 16:9 thumbnail from a wider screenshot.",
      "Trim away borders or unwanted edges of a scanned document.",
      "Cut a profile-picture-sized region out of a group photo.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The crop rectangle is numeric — there is no drag-to-resize handle in this build.</li>
        <li>Crop coordinates are in pixels relative to the original image resolution.</li>
        <li>Animated images are not supported; only the first frame is cropped.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my image uploaded?",
        a: "No. The image is processed locally with the Canvas API. It is never transmitted anywhere.",
      },
      {
        q: "How do I crop to a specific aspect ratio?",
        a: "Pick one of the preset aspect ratios (1:1, 16:9, 4:3, etc.) and the height will update automatically when you change the width.",
      },
      {
        q: "Can I drag the crop rectangle with the mouse?",
        a: "This version uses numeric inputs and a live overlay. Drag-to-resize may be added in a future update.",
      },
      {
        q: "What is the maximum crop size?",
        a: "The crop is bounded by the source image dimensions, so you cannot crop larger than the original image.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
