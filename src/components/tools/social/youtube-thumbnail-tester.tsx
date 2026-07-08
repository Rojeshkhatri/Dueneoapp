"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Image as ImageIcon,
  Moon,
  RotateCcw,
  Sun,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { loadImageFromFile } from "./_social-helpers";

interface Size {
  id: string;
  label: string;
  w: number;
  h: number;
  use: string;
}

const SIZES: Size[] = [
  { id: "full", label: "Full size", w: 1280, h: 720, use: "Desktop watch page & TV apps" },
  { id: "medium", label: "Medium (320 × 180)", w: 320, h: 180, use: "Sidebar related-video card" },
  { id: "small", label: "Small (168 × 94)", w: 168, h: 94, use: "Mobile search results & end screens" },
  { id: "tiny", label: "Tiny (120 × 68)", w: 120, h: 68, use: "Compact mobile rows" },
];

export function YoutubeThumbnailTester({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [naturalSize, setNaturalSize] = React.useState<{ w: number; h: number } | null>(null);
  const [dark, setDark] = React.useState<boolean>(true);
  const [titleOverlay, setTitleOverlay] = React.useState<string>("");
  const [showOverlay, setShowOverlay] = React.useState<boolean>(true);

  React.useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const onFiles = async (files: { file: File }[]) => {
    const f = files[0]?.file;
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      toast.error("Please choose an image file.");
      return;
    }
    setFile(f);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    const url = URL.createObjectURL(f);
    setImageUrl(url);
    try {
      const img = await loadImageFromFile(f);
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      const ratio = img.naturalWidth / img.naturalHeight;
      if (Math.abs(ratio - 16 / 9) > 0.05) {
        toast.warning(
          `Aspect ratio is ${ratio.toFixed(2)}:1 — YouTube recommends 16:9 (1.78:1).`
        );
      } else {
        toast.success(`Loaded ${f.name} (${img.naturalWidth} × ${img.naturalHeight}px).`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load the image.");
    }
  };

  const reset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setFile(null);
    setImageUrl(null);
    setNaturalSize(null);
  };

  const isIdeal = naturalSize
    ? naturalSize.w === 1280 && naturalSize.h === 720
    : false;

  const bgClass = dark ? "bg-zinc-950" : "bg-zinc-100";

  const toolBody = (
    <div className="space-y-5">
      {!file ? (
        <Dropzone
          accept="image/*"
          onFiles={onFiles}
          hint="Recommended size: 1280 × 720px (16:9). JPG, PNG or WebP."
          maxSizeLabel="50 MB"
        />
      ) : (
        <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FileChip name={file.name} size={file.size} onRemove={reset} />
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Replace
            </Button>
          </div>

          {naturalSize && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5">
                <ImageIcon className="h-3 w-3" />
                {naturalSize.w} × {naturalSize.h}px
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 ${
                  isIdeal
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                }`}
              >
                {isIdeal
                  ? "Ideal 1280 × 720"
                  : "Off-spec — YouTube will resize/crop"}
              </span>
              <span className="text-muted-foreground">
                Aspect ratio {(naturalSize.w / naturalSize.h).toFixed(2)}:1 (target 1.78:1)
              </span>
            </div>
          )}

          {/* Title overlay editor */}
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="yt-title">Title overlay text (as YouTube shows it)</Label>
              <Input
                id="yt-title"
                value={titleOverlay}
                onChange={(e) => setTitleOverlay(e.target.value)}
                placeholder="e.g. I tried this for 30 days and it changed my life"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                YouTube truncates titles after roughly 70 characters on most cards and 100 on the watch page.
              </p>
            </div>
            <div className="flex flex-col items-start justify-end gap-2 sm:items-end">
              <Label htmlFor="yt-toggle-overlay" className="text-xs">
                Show overlay
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="yt-toggle-overlay"
                  checked={showOverlay}
                  onCheckedChange={setShowOverlay}
                />
                <span className="text-xs text-muted-foreground">
                  {showOverlay ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </span>
              </div>
            </div>
          </div>

          {/* Background toggle */}
          <div className="flex items-center gap-3">
            <Label className="text-xs">Preview background</Label>
            <div className="inline-flex overflow-hidden rounded-md border">
              <button
                type="button"
                onClick={() => setDark(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  dark ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                }`}
              >
                <Moon className="h-3.5 w-3.5" /> Dark
              </button>
              <button
                type="button"
                onClick={() => setDark(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  !dark ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                }`}
              >
                <Sun className="h-3.5 w-3.5" /> Light
              </button>
            </div>
            <span className="text-xs text-muted-foreground">
              Test legibility on both YouTube themes.
            </span>
          </div>

          {/* Size previews */}
          <div className="space-y-4">
            {SIZES.map((size) => (
              <div key={size.id} className={`rounded-lg ${bgClass} p-4 sm:p-6`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className={`text-sm font-semibold ${dark ? "text-white" : "text-zinc-900"}`}>
                      {size.label}
                    </span>
                    <span className={`ml-2 text-xs ${dark ? "text-zinc-400" : "text-zinc-500"}`}>
                      {size.use}
                    </span>
                  </div>
                  <span className={`text-xs ${dark ? "text-zinc-500" : "text-zinc-500"}`}>
                    {size.w} × {size.h}px
                  </span>
                </div>
                <div
                  className="relative mx-auto overflow-hidden rounded-md shadow-lg"
                  style={{
                    width: size.w,
                    height: size.h,
                    maxWidth: "100%",
                  }}
                >
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={`Thumbnail preview at ${size.label}`}
                      className="block h-full w-full object-cover"
                    />
                  )}
                  {showOverlay && titleOverlay && (
                    <div
                      className="absolute inset-0 flex items-end bg-gradient-to-t from-black/85 via-black/30 to-transparent p-2"
                      style={{ fontSize: Math.max(8, size.h * 0.12) }}
                    >
                      <p
                        className="line-clamp-2 font-semibold leading-tight text-white"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {titleOverlay}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Upload your YouTube thumbnail and instantly see how it looks at four real-world sizes — from the full 1280 × 720 watch page down to the tiny 120 × 68 row used on mobile. Toggle between dark and light backgrounds to make sure your thumbnail works on both YouTube themes, and add a title overlay to preview how YouTube’s gradient and text will sit on top of your image.",
    tool: toolBody,
    howTo: [
      {
        title: "Upload your thumbnail",
        description:
          "Drop a JPG, PNG or WebP. The recommended size is 1280 × 720px (16:9 aspect ratio). Other sizes will load but YouTube will resize or crop them.",
      },
      {
        title: "Enter a title overlay",
        description:
          "Type the video title exactly as it will appear on YouTube. The overlay uses the same dark-to-transparent gradient and bottom-left alignment YouTube uses for video cards.",
      },
      {
        title: "Switch background theme",
        description:
          "Use the Dark / Light toggle to see your thumbnail on both YouTube themes. A thumbnail that pops on dark may disappear on light, and vice versa.",
      },
      {
        title: "Inspect every size",
        description:
          "Scroll through the full, medium, small and tiny previews to confirm that key text and faces stay legible at the smallest size — that’s where most clicks are decided.",
      },
    ],
    useCases: [
      "Verify your thumbnail text is readable at 120 × 68 before publishing.",
      "Check whether your thumbnail still pops on YouTube’s light theme.",
      "Test how the YouTube title gradient affects legibility of your image.",
      "Confirm your image is the ideal 1280 × 720 before upload so YouTube doesn’t crop it.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The title overlay mimics YouTube’s standard card style; the actual watch-page placement and font may differ slightly.</li>
        <li>YouTube sometimes A/B-tests thumbnail crops (especially the very small mobile rows), so always verify on a real device after publishing.</li>
        <li>The character counts at which YouTube truncates titles vary by language, device and layout — the tool uses the common English thresholds.</li>
        <li>Custom thumbnails must be uploaded separately in YouTube Studio after your channel reaches the verification threshold.</li>
      </ul>
    ),
    faq: [
      {
        q: "What is the ideal YouTube thumbnail size?",
        a: "1280 × 720 pixels (16:9 aspect ratio), under 2 MB, in JPG, PNG or WebP. This tool flags any image that does not match those dimensions.",
      },
      {
        q: "Why does my title look different on the real YouTube?",
        a: "YouTube varies font, truncation point and gradient by device, language and layout. This tool reproduces the common dark-gradient card style; treat it as a planning aid, not a pixel-perfect preview.",
      },
      {
        q: "Why test on dark and light backgrounds?",
        a: "YouTube users can switch between dark and light themes. A thumbnail that looks great on one theme can disappear on the other — especially thumbnails with dark borders or low-contrast text.",
      },
      {
        q: "Is my image uploaded anywhere?",
        a: "No. The image is loaded into your browser via URL.createObjectURL. It never leaves your device.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
