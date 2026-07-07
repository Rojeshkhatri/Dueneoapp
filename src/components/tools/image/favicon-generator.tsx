"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, RotateCcw, Wand2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  downloadBlob,
  getCanvas2D,
  hexToRgba,
  loadImageFromFile,
} from "./_image-helpers";

const SIZES = [16, 32, 48, 64, 180, 192, 512];

type Mode = "text" | "emoji" | "image";

interface Generated {
  size: number;
  url: string;
  blob: Blob;
}

export function FaviconGenerator({ tool }: { tool: ToolDefinition }) {
  const [mode, setMode] = React.useState<Mode>("text");
  const [text, setText] = React.useState<string>("D");
  const [fontSize, setFontSize] = React.useState<number>(120);
  const [bgColor, setBgColor] = React.useState<string>("#2563eb");
  const [fgColor, setFgColor] = React.useState<string>("#ffffff");
  const [sourceImage, setSourceImage] = React.useState<File | null>(null);
  const [results, setResults] = React.useState<Generated[]>([]);
  const [busy, setBusy] = React.useState(false);

  const onFiles = (files: { file: File }[]) => {
    const f = files[0]?.file;
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      toast.error("Please choose an image file.");
      return;
    }
    setSourceImage(f);
  };

  const drawTextOrEmoji = (
    ctx: CanvasRenderingContext2D,
    size: number,
    content: string,
    fs: number,
    bg: string,
    fg: string
  ) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    // Scale font relative to canvas size.
    const scaled = (fs / 200) * size;
    ctx.font = `bold ${scaled}px Inter, "Apple Color Emoji", "Segoe UI Emoji", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = fg;
    ctx.fillText(content, size / 2, size / 2 + scaled * 0.04);
  };

  const runGenerate = async () => {
    setBusy(true);
    try {
      const out: Generated[] = [];
      if (mode === "image") {
        if (!sourceImage) {
          toast.error("Please upload a source image first.");
          setBusy(false);
          return;
        }
        const img = await loadImageFromFile(sourceImage);
        for (const size of SIZES) {
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = getCanvas2D(canvas);
          // Cover-fit the source image into the square canvas.
          const sourceAspect = img.naturalWidth / img.naturalHeight;
          let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
          if (sourceAspect > 1) {
            sw = img.naturalHeight;
            sx = (img.naturalWidth - sw) / 2;
          } else if (sourceAspect < 1) {
            sh = img.naturalWidth;
            sy = (img.naturalHeight - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png")
          );
          if (!blob) throw new Error("Could not generate favicon.");
          out.push({ size, url: URL.createObjectURL(blob), blob });
        }
      } else {
        const content = text.trim() || "D";
        for (const size of SIZES) {
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = getCanvas2D(canvas);
          drawTextOrEmoji(ctx, size, content, fontSize, hexToRgba(bgColor, 1), hexToRgba(fgColor, 1));
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png")
          );
          if (!blob) throw new Error("Could not generate favicon.");
          out.push({ size, url: URL.createObjectURL(blob), blob });
        }
      }
      // Revoke previous results.
      results.forEach((r) => URL.revokeObjectURL(r.url));
      setResults(out);
      toast.success(`Generated ${out.length} favicon sizes.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setSourceImage(null);
    setResults([]);
    setText("D");
    setFontSize(120);
    setBgColor("#2563eb");
    setFgColor("#ffffff");
  };

  const content: ToolContent = {
    intro:
      "Generate favicons in all common sizes — 16, 32, 48, 64, 180, 192 and 512px — from text, an emoji or an uploaded image. Each PNG is rendered locally in your browser; nothing is uploaded.",
    tool: (
      <div className="space-y-5">
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:grid-cols-none">
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="emoji">Emoji</TabsTrigger>
            <TabsTrigger value="image">Upload image</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="space-y-2">
              <Label htmlFor="fv-text">Text (1–3 characters)</Label>
              <Input
                id="fv-text"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 3))}
                placeholder="D"
                maxLength={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="fv-size">Font size</Label>
                  <span className="text-xs font-medium text-muted-foreground">{fontSize}</span>
                </div>
                <Slider
                  id="fv-size"
                  value={[fontSize]}
                  min={40}
                  max={200}
                  step={1}
                  onValueChange={(v) => setFontSize(v[0] ?? 120)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="fv-bg">Background</Label>
                  <input
                    id="fv-bg"
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-9 w-full cursor-pointer rounded-md border bg-background p-1"
                    aria-label="Background colour"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fv-fg">Text colour</Label>
                  <input
                    id="fv-fg"
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="h-9 w-full cursor-pointer rounded-md border bg-background p-1"
                    aria-label="Text colour"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="emoji" className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="space-y-2">
              <Label htmlFor="fv-emoji">Emoji</Label>
              <Input
                id="fv-emoji"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 2))}
                placeholder="🦊"
                maxLength={2}
              />
              <p className="text-xs text-muted-foreground">
                Emoji rendering depends on your operating system. The favicon will look the same on devices with the same emoji set.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="fv-esize">Emoji size</Label>
                  <span className="text-xs font-medium text-muted-foreground">{fontSize}</span>
                </div>
                <Slider
                  id="fv-esize"
                  value={[fontSize]}
                  min={40}
                  max={200}
                  step={1}
                  onValueChange={(v) => setFontSize(v[0] ?? 120)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fv-ebg">Background (optional)</Label>
                <input
                  id="fv-ebg"
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-md border bg-background p-1"
                  aria-label="Background colour"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            {!sourceImage ? (
              <Dropzone
                accept="image/*"
                onFiles={onFiles}
                hint="PNG or square image works best · up to 50 MB"
                maxSizeLabel="50 MB"
              />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <FileChip
                    name={sourceImage.name}
                    size={sourceImage.size}
                    onRemove={() => setSourceImage(null)}
                  />
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The image is cover-fitted into a square, so non-square sources will be centre-cropped.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Button onClick={runGenerate} disabled={busy} className="w-full sm:w-auto">
          <Wand2 className="mr-1.5 h-4 w-4" />
          {busy ? "Generating…" : "Generate favicons"}
        </Button>

        {results.length > 0 && (
          <div className="rounded-xl border bg-card p-4 sm:p-6">
            <h3 className="text-sm font-semibold">Generated favicons</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Download any size below. For a complete favicon set, also add the 180×180 (Apple touch icon) and 192×192 / 512×512 (Android) sizes to your site manifest.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((r) => (
                <div
                  key={r.size}
                  className="flex flex-col items-center gap-2 rounded-lg border bg-background p-3"
                >
                  <div className="flex h-20 items-center justify-center rounded-md bg-[repeating-conic-gradient(hsl(0_0%_90%)_0_25%,transparent_0_50%)] bg-[length:12px_12px] p-2 dark:bg-[repeating-conic-gradient(hsl(0_0%_22%)_0_25%,transparent_0_50%)]">
                    <img
                      src={r.url}
                      alt={`${r.size}×${r.size} favicon preview`}
                      style={{ width: Math.min(r.size, 56), height: Math.min(r.size, 56) }}
                      className="object-contain"
                    />
                  </div>
                  <p className="text-xs font-medium">{r.size} × {r.size}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      downloadBlob(r.blob, `favicon-${r.size}.png`);
                    }}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> PNG
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Pick a source",
        description:
          "Choose between text (1–3 letters), a single emoji, or an uploaded image. Text and emoji let you set background and foreground colours.",
      },
      {
        title: "Generate the favicons",
        description:
          "Click Generate to render PNG favicons at 16, 32, 48, 64, 180, 192 and 512px on a canvas in your browser.",
      },
      {
        title: "Download the sizes you need",
        description:
          "Download any individual size. For a complete setup, use 16×16 and 32×32 as the basic favicon, 180×180 as the Apple touch icon, and 192×192 + 512×512 in your web manifest.",
      },
    ],
    useCases: [
      "Generate a complete favicon set for a new website.",
      "Create an Apple touch icon (180×180) for iOS home screen bookmarks.",
      "Produce 192×192 and 512×512 icons for a PWA manifest.",
      "Quickly mock up a favicon from your brand initials.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>This tool exports PNGs only. Modern browsers also support SVG favicons and the legacy .ico format, which are not generated here.</li>
        <li>Emoji rendering depends on the operating system; favicons may look different on Windows, macOS, Android and iOS.</li>
        <li>For uploaded images, non-square sources are centre-cropped to fit a square canvas.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my source image uploaded?",
        a: "No. The image is loaded into your browser only and rendered to a canvas. It never leaves your device.",
      },
      {
        q: "Why PNG and not .ico?",
        a: "PNG favicons work in all modern browsers. The legacy .ico format requires a dedicated encoder; if you need .ico, you can convert one of the PNGs with a separate tool.",
      },
      {
        q: "Which sizes do I actually need?",
        a: "For most sites: 16×16 and 32×32 for browser tabs, 180×180 for Apple touch icons, and 192×192 + 512×512 for Android/PWA manifests. The 48×48 and 64×64 sizes are useful for older platforms.",
      },
      {
        q: "Can I generate favicons from SVG?",
        a: "Use the SVG to PNG tool to rasterise your SVG at 512×512, then upload that PNG here to generate the full set.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
