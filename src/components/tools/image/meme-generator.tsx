"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Download, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_IMAGE_BYTES,
  formatBytes,
  getCanvas2D,
  loadImageFromFile,
  replaceExtension,
} from "./_image-helpers";

interface Template {
  id: string;
  name: string;
  /** Canvas fill style — accepts any CSS colour/gradient string. */
  fill: string;
  width: number;
  height: number;
}

const TEMPLATES: Template[] = [
  {
    id: "dragneo",
    name: "DRAGNEO",
    fill: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
    width: 800,
    height: 600,
  },
  {
    id: "sky",
    name: "Sky Drama",
    fill: "linear-gradient(180deg, #0ea5e9 0%, #1e3a8a 100%)",
    width: 800,
    height: 600,
  },
  {
    id: "forest",
    name: "Forest",
    fill: "linear-gradient(135deg, #16a34a 0%, #064e3b 100%)",
    width: 800,
    height: 600,
  },
  {
    id: "midnight",
    name: "Midnight",
    fill: "linear-gradient(135deg, #1e1b4b 0%, #020617 100%)",
    width: 800,
    height: 600,
  },
  {
    id: "sunrise",
    name: "Sunrise",
    fill: "linear-gradient(180deg, #fde047 0%, #f97316 60%, #be123c 100%)",
    width: 800,
    height: 600,
  },
  {
    id: "concrete",
    name: "Concrete",
    fill: "#52525b",
    width: 800,
    height: 600,
  },
];

interface ImageSource {
  kind: "file";
  file: File;
  width: number;
  height: number;
  url: string;
}

/**
 * Meme Generator — classic top/bottom text on an image, rendered with the
 * Impact font, white fill and black outline. Canvas-only, no backend.
 */
export function MemeGenerator({ tool }: { tool: ToolDefinition }) {
  const [source, setSource] = React.useState<ImageSource | null>(null);
  const [template, setTemplate] = React.useState<Template | null>(null);
  const [topText, setTopText] = React.useState<string>("TOP TEXT");
  const [bottomText, setBottomText] = React.useState<string>("BOTTOM TEXT");
  const [fontSize, setFontSize] = React.useState<number>(48);
  const [textColor, setTextColor] = React.useState<string>("#ffffff");
  const [outline, setOutline] = React.useState<boolean>(true);
  const [uppercase, setUppercase] = React.useState<boolean>(true);
  const [busy, setBusy] = React.useState(false);

  const previewCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    return () => {
      if (source) URL.revokeObjectURL(source.url);
    };
  }, [source]);

  // Re-render the canvas preview whenever inputs change.
  React.useEffect(() => {
    void renderToCanvas(previewCanvasRef.current, {
      source,
      template,
      topText,
      bottomText,
      fontSize,
      textColor,
      outline,
      uppercase,
    });
  }, [source, template, topText, bottomText, fontSize, textColor, outline, uppercase]);

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
    setBusy(true);
    loadImageFromFile(f)
      .then((img) => {
        const url = URL.createObjectURL(f);
        setSource({
          kind: "file",
          file: f,
          width: img.naturalWidth,
          height: img.naturalHeight,
          url,
        });
        setTemplate(null);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load the image.");
      })
      .finally(() => setBusy(false));
  };

  const pickTemplate = (t: Template) => {
    if (source) URL.revokeObjectURL(source.url);
    setSource(null);
    setTemplate(t);
  };

  const reset = () => {
    if (source) URL.revokeObjectURL(source.url);
    setSource(null);
    setTemplate(null);
    setTopText("TOP TEXT");
    setBottomText("BOTTOM TEXT");
    setFontSize(48);
    setTextColor("#ffffff");
    setOutline(true);
    setUppercase(true);
  };

  const hasSource = source !== null || template !== null;

  const download = async () => {
    if (!hasSource) {
      toast.error("Upload an image or pick a template first.");
      return;
    }
    const canvas = document.createElement("canvas");
    await renderToCanvas(canvas, {
      source,
      template,
      topText,
      bottomText,
      fontSize,
      textColor,
      outline,
      uppercase,
      fullResolution: true,
    });
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error("Could not render the meme.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = source
        ? replaceExtension(source.file.name, "png")
        : template
        ? `${template.id}-meme.png`
        : "meme.png";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
      toast.success("Meme downloaded.");
    }, "image/png");
  };

  const content: ToolContent = {
    intro:
      "Add classic top-and-bottom Impact text to any image. Upload your own photo or pick a gradient template, then dial in the font size, colour and outline. Everything renders on a Canvas in your browser — your image never leaves your device.",
    tool: (
      <div className="space-y-5">
        {!hasSource ? (
          <div className="space-y-4">
            <Dropzone
              accept="image/jpeg,image/png,image/webp,image/bmp"
              onFiles={onFiles}
              hint="JPG, PNG, WebP or BMP · up to 50 MB"
              maxSizeLabel="50 MB"
              label="Drop an image here or click to browse"
            />
            <div className="space-y-2">
              <p className="text-sm font-medium">…or pick a template</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pickTemplate(t)}
                    className="group relative h-20 overflow-hidden rounded-lg border text-left transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ background: t.fill }}
                    aria-label={`Use ${t.name} template`}
                  >
                    <span className="absolute inset-x-0 bottom-0 bg-black/45 px-2 py-1 text-[11px] font-semibold text-white">
                      {t.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {source ? (
                <FileChip name={source.file.name} size={source.file.size} onRemove={reset} />
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs">
                  Template: <strong>{template?.name}</strong>
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Start over
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,360px)]">
              {/* Preview */}
              <div className="order-2 lg:order-1">
                <p className="mb-2 text-sm font-medium text-foreground">Preview</p>
                <div className="overflow-hidden rounded-lg border bg-muted/40">
                  <canvas
                    ref={previewCanvasRef}
                    className="block h-auto w-full max-w-full"
                    aria-label="Meme preview"
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Live preview — adjusts as you type. Download for full resolution.
                </p>
              </div>

              {/* Controls */}
              <div className="order-1 space-y-3 lg:order-2">
                <div className="space-y-2">
                  <Label htmlFor="mg-top">Top text</Label>
                  <Input
                    id="mg-top"
                    value={topText}
                    onChange={(e) => setTopText(e.target.value)}
                    placeholder="(no top text)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mg-bottom">Bottom text</Label>
                  <Input
                    id="mg-bottom"
                    value={bottomText}
                    onChange={(e) => setBottomText(e.target.value)}
                    placeholder="(no bottom text)"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="mg-size">Font size</Label>
                    <span className="text-xs font-medium text-muted-foreground">
                      {fontSize}px
                    </span>
                  </div>
                  <input
                    id="mg-size"
                    type="range"
                    min={20}
                    max={120}
                    step={1}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="mg-color">Text colour</Label>
                    <input
                      id="mg-color"
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="h-9 w-full rounded-md border bg-background px-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <span className="text-[11px] text-muted-foreground">
                      Pair with outline for contrast.
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border p-2">
                  <Label htmlFor="mg-outline" className="text-sm">Black outline</Label>
                  <Switch
                    id="mg-outline"
                    checked={outline}
                    onCheckedChange={setOutline}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-2">
                  <Label htmlFor="mg-upper" className="text-sm">UPPERCASE</Label>
                  <Switch
                    id="mg-upper"
                    checked={uppercase}
                    onCheckedChange={setUppercase}
                  />
                </div>
              </div>
            </div>

            <Button onClick={download} disabled={busy} className="w-full sm:w-auto">
              <Download className="mr-1.5 h-4 w-4" />
              Download PNG
            </Button>
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Pick a source image",
        description:
          "Upload your own photo (JPG, PNG, WebP or BMP) or pick one of the six built-in gradient templates.",
      },
      {
        title: "Add top and bottom text",
        description:
          "Type your captions. They render in the classic Impact font, uppercased by default, with a black outline for readability on any image.",
      },
      {
        title: "Tune the look",
        description:
          "Adjust font size (20-120px), text colour, outline and UPPERCASE toggle. The preview updates instantly.",
      },
      {
        title: "Download the PNG",
        description:
          "Click Download to render at the source image's full resolution and save as a PNG.",
      },
    ],
    useCases: [
      "Make a quick reaction meme for a chat or social post.",
      "Add captions to screenshots for tutorials or presentations.",
      "Create motivational-style posters with bold top/bottom text.",
      "Generate placeholder graphics with branded text overlays.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The Impact font depends on your operating system. On systems without Impact,
          the browser substitutes a similar sans-serif (still bold + condensed).
        </li>
        <li>Very long captions may overflow the canvas edges — keep text short and punchy.</li>
        <li>Animated GIFs are not supported — only the first frame is rendered.</li>
        <li>Maximum supported file size is 50MB.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my image uploaded?",
        a: "No. The image is loaded into a Canvas in your browser, text is drawn over it, and the result is offered as a download. Nothing is transmitted to a server.",
      },
      {
        q: "Why does the text look different on my phone?",
        a: "Meme text uses the Impact font. If your device doesn't have Impact installed, the browser falls back to a similar system font. The outline and uppercase styling stay the same.",
      },
      {
        q: "Can I add text in the middle of the image?",
        a: "This tool focuses on the classic top/bottom meme layout. For arbitrary text placement, use the Watermark Image tool which lets you pick any of 9 positions.",
      },
      {
        q: "What resolution is the download?",
        a: "The full resolution of your source image. Templates render at 800×600. If you need a specific size, resize the source image first using Image Resizer.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

// ───────────────────────── Canvas renderer ──────────────────────────────────

interface RenderOptions {
  source: ImageSource | null;
  template: Template | null;
  topText: string;
  bottomText: string;
  fontSize: number;
  textColor: string;
  outline: boolean;
  uppercase: boolean;
  /** When false (default), preview-sized canvas is OK. */
  fullResolution?: boolean;
}

async function renderToCanvas(
  canvas: HTMLCanvasElement | null,
  opts: RenderOptions
): Promise<void> {
  if (!canvas) return;
  const ctx = getCanvas2D(canvas);

  // Determine canvas dimensions and base image.
  let width: number;
  let height: number;
  let drawImage: (ctx: CanvasRenderingContext2D) => Promise<void>;

  if (opts.source) {
    const img = await loadImageFromFile(opts.source.file);
    width = img.naturalWidth;
    height = img.naturalHeight;
    if (!opts.fullResolution) {
      // Cap preview width to 600 to keep the canvas light.
      const maxPreviewW = 600;
      if (width > maxPreviewW) {
        const scale = maxPreviewW / width;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const srcW = img.naturalWidth;
        const srcH = img.naturalHeight;
        drawImage = async (c) => c.drawImage(img, 0, 0, srcW, srcH, 0, 0, width, height);
      } else {
        drawImage = async (c) => c.drawImage(img, 0, 0, width, height);
      }
    } else {
      drawImage = async (c) => c.drawImage(img, 0, 0, width, height);
    }
  } else if (opts.template) {
    width = opts.template.width;
    height = opts.template.height;
    if (!opts.fullResolution) {
      const maxPreviewW = 600;
      const scale = Math.min(1, maxPreviewW / width);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    drawImage = async (c) => {
      const grad = parseGradient(c, opts.template!.fill, width, height);
      if (grad) {
        c.fillStyle = grad;
      } else {
        c.fillStyle = opts.template!.fill;
      }
      c.fillRect(0, 0, width, height);
    };
  } else {
    canvas.width = 1;
    canvas.height = 1;
    return;
  }

  canvas.width = width;
  canvas.height = height;

  await drawImage(ctx);

  // Draw text overlays.
  const scale = opts.fullResolution
    ? (opts.source ? opts.source.width / width : 1)
    : 1;
  // Font size is given in "preview px" — for full-res we scale up.
  // Actually we always interpret fontSize as relative to the rendered canvas size,
  // so scale is 1 when preview width == source width (small images),
  // and >1 when we scaled down for preview (then full-res needs bigger font).
  const effectiveSize = opts.fontSize * (opts.fullResolution ? (opts.source ? opts.source.width / width : 1) : 1);

  ctx.font = `bold ${Math.round(effectiveSize)}px Impact, "Arial Narrow Bold", "Helvetica Inserat", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, Math.round(effectiveSize / 8));

  const padding = Math.round(effectiveSize * 0.5);
  const maxLineWidth = width - padding * 2;

  const formatText = (t: string) => (opts.uppercase ? t.toUpperCase() : t);

  const top = formatText(opts.topText);
  const bottom = formatText(opts.bottomText);

  if (top.trim()) {
    const lines = wrapLines(ctx, top, maxLineWidth);
    let y = padding;
    for (const line of lines) {
      drawMemeLine(ctx, line, width / 2, y, opts.textColor, opts.outline);
      y += effectiveSize * 1.05;
    }
  }

  if (bottom.trim()) {
    const lines = wrapLines(ctx, bottom, maxLineWidth);
    let y = height - padding - effectiveSize * lines.length * 1.05;
    for (const line of lines) {
      drawMemeLine(ctx, line, width / 2, y, opts.textColor, opts.outline);
      y += effectiveSize * 1.05;
    }
  }
}

function drawMemeLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
  outline: boolean
) {
  if (outline) {
    ctx.strokeStyle = "#000000";
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  // Split on explicit newlines first.
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`;
      if (ctx.measureText(candidate).width > maxWidth) {
        lines.push(current);
        current = words[i];
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }
  return lines;
}

/** Parse a CSS "linear-gradient(...)" string into a CanvasGradient. */
function parseGradient(
  ctx: CanvasRenderingContext2D,
  css: string,
  width: number,
  height: number
): CanvasGradient | null {
  const m = css.match(/linear-gradient\(([^)]+(?:\([^)]*\))?[^)]*)\)/);
  if (!m) return null;
  const args = m[1].trim();
  // Split args on commas that are NOT inside parens.
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of args) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());

  // First part may be an angle or "to X" — we treat as 180deg default.
  let angle = 180;
  let colorStarts = 0;
  if (parts[0]?.startsWith("to ")) {
    // Very rough handling — pick common directions.
    const dir = parts[0].toLowerCase();
    if (dir.includes("right") && dir.includes("bottom")) angle = 135;
    else if (dir.includes("right") && dir.includes("top")) angle = 45;
    else if (dir.includes("left") && dir.includes("bottom")) angle = 225;
    else if (dir.includes("left") && dir.includes("top")) angle = 315;
    else if (dir.includes("right")) angle = 90;
    else if (dir.includes("left")) angle = 270;
    else if (dir.includes("bottom")) angle = 180;
    else if (dir.includes("top")) angle = 0;
    colorStarts = 1;
  } else if (parts[0]?.endsWith("deg")) {
    angle = parseFloat(parts[0]);
    colorStarts = 1;
  }

  const stops = parts.slice(colorStarts);
  if (stops.length < 2) return null;

  const rad = (angle - 90) * (Math.PI / 180);
  const cx = width / 2;
  const cy = height / 2;
  const len = Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad));
  const x0 = cx - (Math.cos(rad) * len) / 2;
  const y0 = cy - (Math.sin(rad) * len) / 2;
  const x1 = cx + (Math.cos(rad) * len) / 2;
  const y1 = cy + (Math.sin(rad) * len) / 2;

  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((stop, i) => {
    const sm = stop.match(/^(.+?)\s+(\d+(?:\.\d+)?)%$/);
    if (sm) {
      grad.addColorStop(parseFloat(sm[2]) / 100, sm[1].trim());
    } else {
      grad.addColorStop(i / Math.max(1, stops.length - 1), stop.trim());
    }
  });
  return grad;
}
