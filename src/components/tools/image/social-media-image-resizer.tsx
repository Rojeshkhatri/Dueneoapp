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
import { Download, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  PreviewTile,
  downloadBlob,
  formatBytes,
  getCanvas2D,
  hexToRgba,
  loadImageFromFile,
} from "./_image-helpers";

type FitMode = "cover" | "contain";

interface Preset {
  id: string;
  label: string;
  w: number;
  h: number;
}

const PRESETS: Preset[] = [
  { id: "facebook-cover", label: "Facebook cover (1200 × 630)", w: 1200, h: 630 },
  { id: "twitter-header", label: "Twitter / X header (1500 × 500)", w: 1500, h: 500 },
  { id: "instagram-square", label: "Instagram square (1080 × 1080)", w: 1080, h: 1080 },
  { id: "instagram-story", label: "Instagram story (1080 × 1920)", w: 1080, h: 1920 },
  { id: "linkedin-cover", label: "LinkedIn cover (1584 × 396)", w: 1584, h: 396 },
  { id: "youtube-thumbnail", label: "YouTube thumbnail (1280 × 720)", w: 1280, h: 720 },
  { id: "facebook-post", label: "Facebook post (1200 × 1200)", w: 1200, h: 1200 },
  { id: "twitter-post", label: "Twitter / X post (1200 × 675)", w: 1200, h: 675 },
];

export function SocialMediaImageResizer({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = React.useState<string | null>(null);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputBlob, setOutputBlob] = React.useState<Blob | null>(null);
  const [presetId, setPresetId] = React.useState<string>(PRESETS[0].id);
  const [fit, setFit] = React.useState<FitMode>("cover");
  const [bg, setBg] = React.useState<string>("#ffffff");
  const [busy, setBusy] = React.useState(false);
  const processGen = React.useRef(0);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [originalUrl, outputUrl]);

  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];

  const runResize = async () => {
    if (!file) return;
    const gen = ++processGen.current;
    setBusy(true);
    try {
      const img = await loadImageFromFile(file);
      if (gen !== processGen.current) return;
      const canvas = document.createElement("canvas");
      canvas.width = preset.w;
      canvas.height = preset.h;
      const ctx = getCanvas2D(canvas);

      ctx.fillStyle = hexToRgba(bg, 1);
      ctx.fillRect(0, 0, preset.w, preset.h);

      const targetAspect = preset.w / preset.h;
      const sourceAspect = img.naturalWidth / img.naturalHeight;
      let dw: number, dh: number, dx: number, dy: number;

      if (fit === "cover") {
        if (sourceAspect > targetAspect) {
          dh = preset.h;
          dw = dh * sourceAspect;
        } else {
          dw = preset.w;
          dh = dw / sourceAspect;
        }
        dx = (preset.w - dw) / 2;
        dy = (preset.h - dh) / 2;
      } else {
        if (sourceAspect > targetAspect) {
          dw = preset.w;
          dh = dw / sourceAspect;
        } else {
          dh = preset.h;
          dw = dh * sourceAspect;
        }
        dx = (preset.w - dw) / 2;
        dy = (preset.h - dh) / 2;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, dx, dy, dw, dh);

      const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, outType, 0.92)
      );
      if (gen !== processGen.current) return;
      if (!blob) throw new Error("Resize failed.");
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(URL.createObjectURL(blob));
      setOutputBlob(blob);
      toast.success(`Resized to ${preset.w} × ${preset.h}px (${formatBytes(blob.size)}).`);
    } catch (err) {
      if (gen !== processGen.current) return;
      toast.error(err instanceof Error ? err.message : "Resize failed.");
    } finally {
      if (gen === processGen.current) setBusy(false);
    }
  };

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

  // Auto-resize when settings change.
  React.useEffect(() => {
    if (!file) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runResize();
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [file, presetId, fit, bg]);

  const reset = () => {
    setFile(null);
    setOriginalUrl(null);
    setOutputUrl(null);
    setOutputBlob(null);
  };

  const downloadName = `social-${preset.id}.png`;

  const content: ToolContent = {
    intro:
      "Resize images for every major social media platform — Facebook covers and posts, Twitter/X headers and posts, Instagram squares and stories, LinkedIn covers, and YouTube thumbnails. Choose cover (centre-crop) or contain (letterbox) fit, then download — all locally in your browser.",
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
              <Label>Platform preset</Label>
              <Select value={presetId} onValueChange={setPresetId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Target: {preset.w} × {preset.h}px
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fit mode</Label>
                <Select value={fit} onValueChange={(v) => setFit(v as FitMode)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Cover (centre-crop, fills the frame)</SelectItem>
                    <SelectItem value="contain">Contain (letterbox, preserves whole image)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sm-bg">Background (for contain)</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="sm-bg"
                    type="color"
                    value={bg}
                    onChange={(e) => setBg(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1"
                    aria-label="Background colour"
                  />
                  <Input value={bg} onChange={(e) => setBg(e.target.value)} className="font-mono" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PreviewTile src={originalUrl} label="Original" />
              <PreviewTile
                src={outputUrl}
                label={busy ? "Processing…" : "Resized"}
                caption={outputUrl ? `${preset.w} × ${preset.h}px` : undefined}
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
                    <Download className="mr-1.5 h-4 w-4" /> Download resized image
                  </Button>
                </div>
              )}
            </div>
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
        title: "Pick a platform preset",
        description:
          "Choose from Facebook cover, Twitter/X header, Instagram square or story, LinkedIn cover, YouTube thumbnail and more. Each preset matches the platform's recommended dimensions.",
      },
      {
        title: "Choose fit mode",
        description:
          "Cover centre-crops the image to fill the frame; contain fits the whole image inside the frame with letterbox bars in your chosen background colour.",
      },
      {
        title: "Preview and download",
        description: "The preview updates automatically as you change settings. Download when you're happy with the result.",
      },
    ],
    useCases: [
      "Create a Facebook cover photo that fits without cropping.",
      "Make a YouTube thumbnail at 1280×720.",
      "Resize a portrait photo into an Instagram story (1080×1920).",
      "Generate a LinkedIn cover banner at 1584×396.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Only one image can be resized at a time.</li>
        <li>Some platforms occasionally change their recommended dimensions; the presets reflect common values at the time of writing.</li>
        <li>Cover mode crops the image; if your subject is near an edge it may be cut off. Use contain mode if you need the whole image.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my image uploaded?",
        a: "No. The image is processed locally with the Canvas API. It never leaves your device.",
      },
      {
        q: "What is the difference between cover and contain?",
        a: "Cover fills the entire target frame by cropping the overflow. Contain fits the whole image inside the frame and fills the remaining area with a background colour (letterbox).",
      },
      {
        q: "Are these the official platform dimensions?",
        a: "The presets match common recommendations at the time of writing. Platforms occasionally change their guidelines, so always verify against the latest official documentation for critical work.",
      },
      {
        q: "Can I resize multiple images at once?",
        a: "This tool processes one image at a time so you can preview the result. Repeat for each additional image.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
