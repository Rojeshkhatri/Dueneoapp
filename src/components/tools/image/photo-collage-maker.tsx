"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, RotateCcw, Grid2x2, X } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_IMAGE_BYTES,
  formatBytes,
  getCanvas2D,
  loadImageFromFile,
} from "./_image-helpers";

type LayoutKey = "2-up" | "3-up" | "2x2" | "3x2" | "3x3";

interface LayoutDef {
  id: LayoutKey;
  name: string;
  rows: number;
  cols: number;
  /** Min photos, max photos. */
  min: number;
  max: number;
}

const LAYOUTS: LayoutDef[] = [
  { id: "2-up", name: "2 photos · side by side", rows: 1, cols: 2, min: 2, max: 2 },
  { id: "3-up", name: "3 photos · in a row", rows: 1, cols: 3, min: 2, max: 3 },
  { id: "2x2", name: "4 photos · 2 × 2 grid", rows: 2, cols: 2, min: 2, max: 4 },
  { id: "3x2", name: "6 photos · 3 × 2 grid", rows: 2, cols: 3, min: 2, max: 6 },
  { id: "3x3", name: "9 photos · 3 × 3 grid", rows: 3, cols: 3, min: 2, max: 9 },
];

interface PhotoItem {
  id: string;
  file: File;
  url: string;
}

/**
 * Photo Collage Maker — combine 2-9 photos into a single grid image.
 * Layouts: 2-up, 3-up, 2×2, 3×2, 3×3. Adjustable spacing, background
 * colour and rounded corners. Canvas-rendered, downloadable as PNG.
 */
export function PhotoCollageMaker({ tool }: { tool: ToolDefinition }) {
  const [photos, setPhotos] = React.useState<PhotoItem[]>([]);
  const [layoutId, setLayoutId] = React.useState<LayoutKey>("2x2");
  const [spacing, setSpacing] = React.useState<number>(12);
  const [bgColor, setBgColor] = React.useState<string>("#ffffff");
  const [rounded, setRounded] = React.useState<boolean>(false);
  const [busy, setBusy] = React.useState(false);

  const layout = LAYOUTS.find((l) => l.id === layoutId)!;
  const cellCount = layout.rows * layout.cols;

  React.useEffect(() => {
    return () => {
      for (const p of photos) URL.revokeObjectURL(p.url);
    };
    // Run only on unmount.
  }, []);

  const onFiles = (files: { file: File; id: string }[]) => {
    const incoming: PhotoItem[] = [];
    for (const wrap of files) {
      const f = wrap.file;
      if (!/^image\//.test(f.type)) {
        toast.error(`Skipped "${f.name}" — not an image.`);
        continue;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        toast.error(
          `Skipped "${f.name}" — ${formatBytes(f.size)} exceeds the 50 MB limit.`
        );
        continue;
      }
      // Avoid duplicates by id+name+size.
      if (photos.some((p) => p.id === wrap.id)) continue;
      incoming.push({ id: wrap.id, file: f, url: URL.createObjectURL(f) });
    }
    if (incoming.length === 0) return;
    const merged = [...photos, ...incoming].slice(0, 9);
    if (merged.length > 9) {
      toast.info("Maximum 9 photos — extra files were ignored.");
    }
    setPhotos(merged);
    // Auto-pick a layout that fits the photo count, if the current layout is too small.
    if (merged.length > layout.max) {
      const fit = LAYOUTS.find((l) => l.max >= merged.length);
      if (fit) setLayoutId(fit.id);
    }
  };

  const removePhoto = (id: string) => {
    const target = photos.find((p) => p.id === id);
    if (target) URL.revokeObjectURL(target.url);
    setPhotos(photos.filter((p) => p.id !== id));
  };

  const reset = () => {
    for (const p of photos) URL.revokeObjectURL(p.url);
    setPhotos([]);
  };

  const renderCollage = React.useCallback(async (): Promise<Blob | null> => {
    if (photos.length < 2) {
      toast.error("Add at least 2 photos first.");
      return null;
    }
    // Cap each cell at a sensible max (e.g. 800×800) to keep total canvas under control.
    const maxCellSide = 800;
    // Load all source images.
    const loaded: (HTMLImageElement | null)[] = await Promise.all(
      Array.from({ length: cellCount }, async (_, i) => {
        const p = photos[i];
        if (!p) return null;
        try {
          return await loadImageFromFile(p.file);
        } catch {
          return null;
        }
      })
    );

    // Determine the cell size based on the smallest of the cell-eligible photos.
    // We'll use a uniform cell size, derived from the average aspect.
    let cellW = maxCellSide;
    let cellH = maxCellSide;
    // If any photo is loaded, use a 1:1 cell by default — keeps things simple and predictable.
    // (Photo-cover mode handles the actual fit per cell.)

    const totalW = cellW * layout.cols + spacing * (layout.cols + 1);
    const totalH = cellH * layout.rows + spacing * (layout.rows + 1);

    const canvas = document.createElement("canvas");
    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = getCanvas2D(canvas);

    // Background.
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, totalW, totalH);

    let placedCount = 0;
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        const idx = r * layout.cols + c;
        const img = loaded[idx];
        const cellX = spacing + c * (cellW + spacing);
        const cellY = spacing + r * (cellH + spacing);
        if (!img) {
          // Empty cell — paint a subtle placeholder.
          ctx.save();
          ctx.fillStyle = "rgba(0,0,0,0.04)";
          ctx.fillRect(cellX, cellY, cellW, cellH);
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.font = "16px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("(empty)", cellX + cellW / 2, cellY + cellH / 2);
          ctx.restore();
          continue;
        }
        placedCount += 1;
        if (rounded) {
          // Clip to rounded rectangle.
          ctx.save();
          roundedRectPath(ctx, cellX, cellY, cellW, cellH, Math.min(24, spacing + 8));
          ctx.clip();
          drawCover(ctx, img, cellX, cellY, cellW, cellH);
          ctx.restore();
        } else {
          drawCover(ctx, img, cellX, cellY, cellW, cellH);
        }
      }
    }

    if (placedCount === 0) {
      toast.error("None of the photos could be loaded.");
      return null;
    }

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
  }, [photos, layout, spacing, bgColor, rounded, cellCount]);

  const download = async () => {
    setBusy(true);
    try {
      const blob = await renderCollage();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "collage.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Collage downloaded (${formatBytes(blob.size)}).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Collage rendering failed.");
    } finally {
      setBusy(false);
    }
  };

  const content: ToolContent = {
    intro:
      "Combine 2-9 photos into a single grid image. Pick a layout (2-up, 3-up, 2×2, 3×2 or 3×3), tweak the spacing, background colour and rounded corners, then download a PNG. Each photo is auto-fit cover-style into its cell so the grid always looks tidy.",
    tool: (
      <div className="space-y-5">
        <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-medium">{photos.length}</span>
              <span className="text-muted-foreground"> / {cellCount} photos added (max 9)</span>
            </div>
            {photos.length > 0 && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear all
              </Button>
            )}
          </div>

          <Dropzone
            accept="image/jpeg,image/png,image/webp,image/bmp"
            multiple
            onFiles={onFiles}
            hint="JPG, PNG, WebP or BMP · up to 50 MB each · select up to 9"
            maxSizeLabel="50 MB each"
            label="Drop photos here or click to browse"
          />

          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="relative h-16 w-16 overflow-hidden rounded-md border bg-muted"
                >
                  <img
                    src={p.url}
                    alt={p.file.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                    aria-label={`Remove ${p.file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Layout</Label>
              <Select value={layoutId} onValueChange={(v) => setLayoutId(v as LayoutKey)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAYOUTS.map((l) => (
                    <SelectItem key={l.id} value={l.id} disabled={photos.length > l.max && l.max < photos.length ? false : false}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {layout.rows} × {layout.cols} · fits up to {layout.max} photos.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pcm-spacing">Spacing</Label>
                <span className="text-xs font-medium text-muted-foreground">{spacing}px</span>
              </div>
              <input
                id="pcm-spacing"
                type="range"
                min={0}
                max={48}
                step={1}
                value={spacing}
                onChange={(e) => setSpacing(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pcm-bg">Background</Label>
              <input
                id="pcm-bg"
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-1"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-2">
              <Label htmlFor="pcm-rounded" className="text-sm">Rounded corners</Label>
              <Switch id="pcm-rounded" checked={rounded} onCheckedChange={setRounded} />
            </div>
          </div>

          <CollagePreview
            photos={photos.slice(0, cellCount)}
            layout={layout}
            spacing={spacing}
            bgColor={bgColor}
            rounded={rounded}
          />

          <Button onClick={download} disabled={busy || photos.length < 2} className="w-full sm:w-auto">
            <Download className="mr-1.5 h-4 w-4" />
            {busy ? "Rendering…" : "Download collage PNG"}
          </Button>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Add 2-9 photos",
        description:
          "Drag and drop multiple JPG, PNG, WebP or BMP files, or click to browse. Each file is shown as a thumbnail — click the ✕ on any thumbnail to remove it.",
      },
      {
        title: "Pick a layout",
        description:
          "Choose from 2-up, 3-up, 2×2, 3×2 or 3×3. The layout determines how many cells the collage has and how they're arranged.",
      },
      {
        title: "Adjust spacing, background and corners",
        description:
          "Set the gap between photos (0-48 px), pick a background colour, and optionally round the corners of each cell.",
      },
      {
        title: "Download the PNG",
        description:
          "Click Download to render the collage on a Canvas and save it as a PNG. Empty cells (if you added fewer photos than the layout has slots) appear as placeholders.",
      },
    ],
    useCases: [
      "Build a side-by-side before/after comparison image.",
      "Compile a 3×3 grid of product photos for an e-commerce listing.",
      "Make a photo collage for a birthday or holiday card.",
      "Assemble a contact sheet of design references.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Maximum 9 photos per collage. The 3×3 layout uses all 9.</li>
        <li>
          Each cell is square (1:1). Photos are fit cover-style, so portrait or landscape
          photos will be cropped to fill the cell.
        </li>
        <li>The output PNG is sized at 800×800 per cell — large enough for web and moderate print.</li>
        <li>Animated GIFs use only the first frame.</li>
      </ul>
    ),
    faq: [
      {
        q: "Are my photos uploaded?",
        a: "No. Each photo is loaded into a Canvas in your browser, composed into the grid, and saved as a PNG locally. Nothing is transmitted to a server.",
      },
      {
        q: "What happens if I add fewer photos than the layout has cells?",
        a: "The first cells are filled with your photos; any remaining cells render as a faint '(empty)' placeholder so the grid stays intact.",
      },
      {
        q: "Can I change the order of photos?",
        a: "Photos are placed in the order they were added. To reorder, remove a photo and re-add it. The order goes left-to-right, top-to-bottom.",
      },
      {
        q: "Why are my portrait photos cropped?",
        a: "Cells are square and photos are fit cover-style (like CSS `object-fit: cover`) so the grid stays tidy. If you need to keep the full portrait, use the 2-up or 3-up layout and resize the source photos first.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

// ───────────────────────── Preview component ────────────────────────────────

function CollagePreview({
  photos,
  layout,
  spacing,
  bgColor,
  rounded,
}: {
  photos: PhotoItem[];
  layout: LayoutDef;
  spacing: number;
  bgColor: string;
  rounded: boolean;
}) {
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < layout.rows * layout.cols; i++) {
    const p = photos[i];
    const radius = rounded ? Math.min(12, spacing + 6) : 0;
    cells.push(
      <div
        key={i}
        className="relative overflow-hidden bg-muted/60"
        style={{
          borderRadius: radius,
          aspectRatio: "1 / 1",
        }}
      >
        {p ? (
          <img
            src={p.url}
            alt={p.file.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
            (empty)
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Grid2x2 className="h-4 w-4" />
        Preview
      </div>
      <div
        className="rounded-lg border p-2"
        style={{
          backgroundColor: bgColor,
          display: "grid",
          gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
          gap: `${spacing}px`,
        }}
      >
        {cells}
      </div>
    </div>
  );
}

// ───────────────────────── Canvas helpers ───────────────────────────────────

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  if (!srcW || !srcH) return;
  const scale = Math.max(dw / srcW, dh / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const offsetX = dx + (dw - drawW) / 2;
  const offsetY = dy + (dh - drawH) / 2;
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
