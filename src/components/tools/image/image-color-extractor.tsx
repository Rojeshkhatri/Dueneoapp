"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, RotateCcw, Pipette, Check } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_IMAGE_BYTES,
  formatBytes,
  getCanvas2D,
  loadImageFromFile,
} from "./_image-helpers";

interface Swatch {
  hex: string;
  r: number;
  g: number;
  b: number;
  h: number;
  s: number;
  l: number;
  population: number;
  /** Fraction of sampled pixels (0-1). */
  fraction: number;
}

type QuantizeAlgo = "median-cut" | "frequency";

/**
 * Image Color Extractor — loads the image to a canvas, downscales to keep
 * pixel-count manageable, then runs a median-cut (or frequency-bucket)
 * quantizer to produce a palette of 6-10 dominant colours.
 *
 * All processing is local — no backend, no upload.
 */
export function ImageColorExtractor({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [palette, setPalette] = React.useState<Swatch[]>([]);
  const [count, setCount] = React.useState<number>(8);
  const [algo, setAlgo] = React.useState<QuantizeAlgo>("median-cut");
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onFiles = (files: { file: File }[]) => {
    const f = files[0]?.file;
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      toast.error("Please choose an image file.");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      toast.error(
        `File is too large (${formatBytes(f.size)}). The maximum supported size is ${formatBytes(MAX_IMAGE_BYTES)}.`
      );
      return;
    }
    setFile(f);
    setPalette([]);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
    // Run extraction automatically on upload.
    void extract(f, count, algo);
  };

  const extract = React.useCallback(
    async (f: File, n: number, algorithm: QuantizeAlgo) => {
      setBusy(true);
      try {
        const img = await loadImageFromFile(f);
        // Downscale to keep the pixel count manageable — at most 256x256
        // for sampling purposes. Aspect-ratio is preserved.
        const maxSide = 256;
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = getCanvas2D(canvas);
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        const pixels: number[][] = [];
        // Stride every pixel (we already downscaled). Skip fully transparent ones.
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 16) continue;
          pixels.push([data[i], data[i + 1], data[i + 2]]);
        }
        if (pixels.length === 0) {
          throw new Error("No visible pixels found — image may be fully transparent.");
        }

        const swatches =
          algorithm === "median-cut"
            ? medianCut(pixels, n)
            : frequencyBucket(pixels, n);

        setPalette(swatches);
        toast.success(`Extracted ${swatches.length} colours.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Colour extraction failed.");
        setPalette([]);
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const reExtract = () => {
    if (file) void extract(file, count, algo);
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setPalette([]);
  };

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      toast.success(`Copied ${value}`);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      toast.error("Clipboard not available in this browser.");
    }
  };

  const downloadJson = () => {
    if (palette.length === 0) {
      toast.error("Extract a palette first.");
      return;
    }
    const payload = {
      source: file?.name ?? "image",
      algorithm: algo,
      count: palette.length,
      palette: palette.map((s) => ({
        hex: s.hex,
        rgb: { r: s.r, g: s.g, b: s.b },
        hsl: { h: Math.round(s.h), s: Math.round(s.s * 100), l: Math.round(s.l * 100) },
        population: s.population,
        fraction: Number(s.fraction.toFixed(4)),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "palette.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Palette JSON downloaded.");
  };

  const content: ToolContent = {
    intro:
      "Pull a colour palette out of any photo. The image is downscaled and sampled pixel-by-pixel, then a median-cut (or frequency-bucket) algorithm clusters similar colours to find the most dominant ones. Click any swatch to copy its HEX, RGB or HSL value — download the full palette as JSON.",
    tool: (
      <div className="space-y-5">
        {!file ? (
          <Dropzone
            accept="image/jpeg,image/png,image/webp,image/bmp,image/gif"
            onFiles={onFiles}
            hint="JPG, PNG, WebP, BMP or GIF · up to 50 MB"
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
                <Label>Algorithm</Label>
                <Select value={algo} onValueChange={(v) => setAlgo(v as QuantizeAlgo)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="median-cut">Median cut (balanced)</SelectItem>
                    <SelectItem value="frequency">Frequency bucket (fast)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ice-count">Number of colours</Label>
                  <span className="text-xs font-medium text-muted-foreground">{count}</span>
                </div>
                <input
                  id="ice-count"
                  type="range"
                  min={6}
                  max={10}
                  step={1}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <p className="text-xs text-muted-foreground">6 to 10 dominant colours.</p>
              </div>
            </div>

            <Button onClick={reExtract} disabled={busy} className="w-full sm:w-auto">
              <Pipette className="mr-1.5 h-4 w-4" />
              {busy ? "Extracting…" : "Re-extract palette"}
            </Button>

            {previewUrl && (
              <div className="overflow-hidden rounded-lg border">
                <img
                  src={previewUrl}
                  alt="Source"
                  className="max-h-[280px] w-full object-contain bg-muted/40"
                />
              </div>
            )}

            {palette.length > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {palette.map((s, i) => (
                    <div
                      key={`${s.hex}-${i}`}
                      className="overflow-hidden rounded-lg border bg-card"
                    >
                      <div
                        className="flex h-20 items-end justify-end p-2"
                        style={{ backgroundColor: s.hex }}
                      >
                        <span
                          className="rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                          aria-hidden
                        >
                          {Math.round(s.fraction * 100)}%
                        </span>
                      </div>
                      <div className="space-y-1 p-2">
                        <button
                          type="button"
                          onClick={() => copyValue(s.hex)}
                          className="flex w-full items-center justify-between gap-1 rounded px-1 py-0.5 text-left text-xs font-semibold hover:bg-muted"
                          aria-label={`Copy HEX ${s.hex}`}
                        >
                          <span className="uppercase">{s.hex}</span>
                          {copied === s.hex ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyValue(`rgb(${s.r}, ${s.g}, ${s.b})`)}
                          className="block w-full rounded px-1 py-0.5 text-left text-[11px] text-muted-foreground hover:bg-muted"
                          aria-label={`Copy RGB ${s.r}, ${s.g}, ${s.b}`}
                        >
                          rgb({s.r}, {s.g}, {s.b})
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            copyValue(
                              `hsl(${Math.round(s.h)}, ${Math.round(s.s * 100)}%, ${Math.round(s.l * 100)}%)`
                            )
                          }
                          className="block w-full rounded px-1 py-0.5 text-left text-[11px] text-muted-foreground hover:bg-muted"
                          aria-label={`Copy HSL`}
                        >
                          hsl({Math.round(s.h)}, {Math.round(s.s * 100)}%, {Math.round(s.l * 100)}%)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={downloadJson} variant="outline" size="sm">
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download JSON
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click any value to copy. Percentage reflects how much of the sampled
                  image is closest to that swatch.
                </p>
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
          "Drag and drop a JPG, PNG, WebP, BMP or GIF. The image is downscaled to 256px on its longest side before sampling, so even huge files are processed instantly.",
      },
      {
        title: "Tune the algorithm",
        description:
          "Choose between median-cut (balanced, merges perceptually similar colours) or frequency-bucket (faster, favours large flat colour areas). Pick 6 to 10 output colours.",
      },
      {
        title: "Copy any colour",
        description:
          "Each swatch shows HEX, RGB and HSL. Click any value to copy it to your clipboard.",
      },
      {
        title: "Download the palette",
        description:
          "Export the full palette as a JSON file with HEX, RGB, HSL and population data for use in code or design tools.",
      },
    ],
    useCases: [
      "Build a brand palette from a hero photo or product shot.",
      "Find accent colours that complement a featured image.",
      "Generate consistent UI theming from a designer's mockup.",
      "Analyse the colour make-up of a competitor's screenshot.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The image is downscaled to 256px before sampling — tiny details may be missed.</li>
        <li>Fully transparent pixels are skipped, so palettes from PNGs with alpha may shift.</li>
        <li>
          Median-cut returns up to N colours, but very flat images may yield fewer distinct
          clusters.
        </li>
        <li>Animated GIFs use only the first frame.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my image uploaded?",
        a: "No. The image is loaded into a Canvas in your browser, sampled pixel-by-pixel, and processed locally. Nothing is transmitted to a server.",
      },
      {
        q: "Which algorithm should I pick?",
        a: "Median-cut gives a balanced palette that reflects perceptual colour groupings. Frequency-bucket is faster and biased toward large solid colour regions (good for logos, bad for photos).",
      },
      {
        q: "Why does the percentage not add up to 100%?",
        a: "It does — each percentage is the share of sampled pixels that are closest to that swatch. We round for display, so the sum may be 99% or 101%.",
      },
      {
        q: "Can I extract more than 10 colours?",
        a: "Use the slider up to 10. For larger palettes, run the tool twice with different algorithms and combine the results.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

// ───────────────────────── Quantization algorithms ──────────────────────────

interface Box {
  pixels: number[][];
  rMin: number; rMax: number;
  gMin: number; gMax: number;
  bMin: number; bMax: number;
}

function boxFromPixels(pixels: number[][]): Box {
  let rMin = 255, gMin = 255, bMin = 255;
  let rMax = 0, gMax = 0, bMax = 0;
  for (const p of pixels) {
    if (p[0] < rMin) rMin = p[0];
    if (p[0] > rMax) rMax = p[0];
    if (p[1] < gMin) gMin = p[1];
    if (p[1] > gMax) gMax = p[1];
    if (p[2] < bMin) bMin = p[2];
    if (p[2] > bMax) bMax = p[2];
  }
  return { pixels, rMin, rMax, gMin, gMax, bMin, bMax };
}

function boxVolume(box: Box): { axis: 0 | 1 | 2; len: number } {
  const rLen = box.rMax - box.rMin;
  const gLen = box.gMax - box.gMin;
  const bLen = box.bMax - box.bMin;
  if (rLen >= gLen && rLen >= bLen) return { axis: 0, len: rLen };
  if (gLen >= rLen && gLen >= bLen) return { axis: 1, len: gLen };
  return { axis: 2, len: bLen };
}

function splitBox(box: Box): [Box, Box] {
  const { axis } = boxVolume(box);
  const sorted = [...box.pixels].sort((a, b) => a[axis] - b[axis]);
  const mid = Math.floor(sorted.length / 2);
  const left = sorted.slice(0, mid);
  const right = sorted.slice(mid);
  return [boxFromPixels(left), boxFromPixels(right)];
}

/** Median-cut quantization — classic Paul Heckbert algorithm. */
function medianCut(pixels: number[][], n: number): Swatch[] {
  if (pixels.length === 0) return [];
  let boxes: Box[] = [boxFromPixels(pixels)];

  while (boxes.length < n) {
    // Pick the box with the largest range along any axis AND with >1 pixel.
    let targetIdx = -1;
    let targetLen = -1;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.pixels.length < 2) continue;
      const { len } = boxVolume(b);
      if (len > targetLen) {
        targetLen = len;
        targetIdx = i;
      }
    }
    if (targetIdx === -1) break; // No box can be split further.
    const target = boxes[targetIdx];
    const [a, b] = splitBox(target);
    boxes = [...boxes.slice(0, targetIdx), a, b, ...boxes.slice(targetIdx + 1)];
  }

  const total = pixels.length;
  return boxes
    .map((box) => swatchFromBox(box, total))
    .sort((a, b) => b.population - a.population);
}

function swatchFromBox(box: Box, totalPixels: number): Swatch {
  let r = 0, g = 0, b = 0;
  for (const p of box.pixels) {
    r += p[0]; g += p[1]; b += p[2];
  }
  const n = box.pixels.length || 1;
  const ar = Math.round(r / n);
  const ag = Math.round(g / n);
  const ab = Math.round(b / n);
  const { h, s, l } = rgbToHsl(ar, ag, ab);
  return {
    hex: rgbToHex(ar, ag, ab),
    r: ar, g: ag, b: ab,
    h, s, l,
    population: n,
    fraction: n / totalPixels,
  };
}

/** Frequency-bucket quantization — fast, biased to large colour regions. */
function frequencyBucket(pixels: number[][], n: number): Swatch[] {
  // Quantize each channel to 4 bits (16 levels) → 4096 buckets.
  const buckets = new Map<number, { sum: number[]; count: number }>();
  for (const p of pixels) {
    const r = p[0] >> 4;
    const g = p[1] >> 4;
    const b = p[2] >> 4;
    const key = (r << 8) | (g << 4) | b;
    const entry = buckets.get(key);
    if (entry) {
      entry.sum[0] += p[0];
      entry.sum[1] += p[1];
      entry.sum[2] += p[2];
      entry.count += 1;
    } else {
      buckets.set(key, { sum: [p[0], p[1], p[2]], count: 1 });
    }
  }
  const total = pixels.length;
  return Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map((entry) => {
      const c = entry.count || 1;
      const ar = Math.round(entry.sum[0] / c);
      const ag = Math.round(entry.sum[1] / c);
      const ab = Math.round(entry.sum[2] / c);
      const { h, s, l } = rgbToHsl(ar, ag, ab);
      return {
        hex: rgbToHex(ar, ag, ab),
        r: ar, g: ag, b: ab,
        h, s, l,
        population: entry.count,
        fraction: entry.count / total,
      };
    });
}

// ───────────────────────── Colour helpers ───────────────────────────────────

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}
