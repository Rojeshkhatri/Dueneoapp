"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, RotateCcw, Smartphone } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  downloadBlob,
  getCanvas2D,
  readableTextOn,
  wrapText,
} from "./_social-helpers";

type BgMode = "solid" | "gradient";
type TextPos = "top" | "center" | "bottom";

const CANVAS_W = 1080;
const CANVAS_H = 1920;

interface Settings {
  bgMode: BgMode;
  bgColor: string;
  gradFrom: string;
  gradTo: string;
  gradAngle: number;
  title: string;
  subtitle: string;
  fontSize: number; // in canvas px
  position: TextPos;
  textColor: string;
  autoText: boolean;
  align: "left" | "center" | "right";
  overlay: boolean; // dim background slightly for legibility
  overlayStrength: number; // 0..0.8
}

function drawBackground(ctx: CanvasRenderingContext2D, s: Settings) {
  if (s.bgMode === "solid") {
    ctx.fillStyle = s.bgColor;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  } else {
    const angle = ((s.gradAngle % 360) + 360) % 360;
    const rad = (angle * Math.PI) / 180;
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    const halfDiag = Math.sqrt(CANVAS_W * CANVAS_W + CANVAS_H * CANVAS_H) / 2;
    const dx = Math.cos(rad) * halfDiag;
    const dy = Math.sin(rad) * halfDiag;
    const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    grad.addColorStop(0, s.gradFrom);
    grad.addColorStop(1, s.gradTo);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  if (s.overlay && s.overlayStrength > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${s.overlayStrength})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
}

function renderCover(canvas: HTMLCanvasElement, s: Settings) {
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = getCanvas2D(canvas);
  drawBackground(ctx, s);

  const margin = Math.round(CANVAS_W * 0.1);
  const contentW = CANVAS_W - margin * 2;

  const txtColor = s.autoText
    ? readableTextOn(s.bgMode === "solid" ? s.bgColor : s.gradFrom)
    : s.textColor;

  // Title
  ctx.font = `bold ${s.fontSize}px Inter, "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = txtColor;
  ctx.textBaseline = "alphabetic";

  const titleLines = wrapText(ctx, s.title, contentW);
  const subtitleFont = Math.round(s.fontSize * 0.42);
  ctx.font = `400 ${subtitleFont}px Inter, "Segoe UI", system-ui, sans-serif`;
  const subtitleLines = s.subtitle ? wrapText(ctx, s.subtitle, contentW) : [];
  const titleLineH = Math.round(s.fontSize * 1.15);
  const subtitleLineH = Math.round(subtitleFont * 1.3);
  const gap = Math.round(s.fontSize * 0.4);
  const totalH =
    titleLines.length * titleLineH +
    (subtitleLines.length > 0 ? gap + subtitleLines.length * subtitleLineH : 0);

  let startY: number;
  if (s.position === "top") {
    startY = margin + s.fontSize;
  } else if (s.position === "bottom") {
    startY = CANVAS_H - margin - totalH + s.fontSize;
  } else {
    startY = (CANVAS_H - totalH) / 2 + s.fontSize;
  }

  const x =
    s.align === "left"
      ? margin
      : s.align === "right"
      ? CANVAS_W - margin
      : CANVAS_W / 2;
  ctx.textAlign = s.align;

  // Title
  ctx.font = `bold ${s.fontSize}px Inter, "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = txtColor;
  let cy = startY;
  for (const line of titleLines) {
    ctx.fillText(line, x, cy);
    cy += titleLineH;
  }

  // Subtitle
  if (subtitleLines.length > 0) {
    cy += gap - titleLineH + subtitleLineH * 0.85;
    ctx.font = `400 ${subtitleFont}px Inter, "Segoe UI", system-ui, sans-serif`;
    ctx.globalAlpha = 0.85;
    for (const line of subtitleLines) {
      ctx.fillText(line, x, cy);
      cy += subtitleLineH;
    }
    ctx.globalAlpha = 1;
  }
}

export function ReelCoverGenerator({ tool }: { tool: ToolDefinition }) {
  const [settings, setSettings] = React.useState<Settings>({
    bgMode: "gradient",
    bgColor: "#7c3aed",
    gradFrom: "#ec4899",
    gradTo: "#7c3aed",
    gradAngle: 165,
    title: "5 Productivity Hacks\nThat Actually Work",
    subtitle: "Swipe up to learn how I doubled my focus",
    fontSize: 96,
    position: "center",
    textColor: "#ffffff",
    autoText: false,
    align: "center",
    overlay: false,
    overlayStrength: 0.25,
  });

  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!canvasRef.current) return;
    renderCover(canvasRef.current, settings);
  }, [settings]);

  const download = async () => {
    if (!canvasRef.current) return;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvasRef.current!.toBlob(resolve, "image/png")
    );
    if (!blob) {
      toast.error("Could not render the cover image.");
      return;
    }
    const safeName =
      (settings.title || "reel-cover")
        .replace(/\s+/g, "-")
        .toLowerCase()
        .slice(0, 40) || "reel-cover";
    downloadBlob(blob, `${safeName}.png`);
    toast.success("Reel cover downloaded.");
  };

  const reset = () => {
    setSettings({
      bgMode: "solid",
      bgColor: "#0f172a",
      gradFrom: "#ec4899",
      gradTo: "#7c3aed",
      gradAngle: 165,
      title: "Your reel title",
      subtitle: "",
      fontSize: 96,
      position: "center",
      textColor: "#ffffff",
      autoText: false,
      align: "center",
      overlay: false,
      overlayStrength: 0.25,
    });
    toast.info("Reset to defaults.");
  };

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        {/* Preview */}
        <div className="space-y-3 rounded-xl border bg-muted/30 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">9:16 Reel cover preview</h3>
            </div>
            <Badge variant="secondary">1080 × 1920</Badge>
          </div>
          <div className="flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="h-auto max-h-[560px] w-auto rounded-xl border shadow-sm"
              style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
              aria-label="Reel cover preview"
            />
          </div>
          <Button onClick={download} className="w-full">
            <Download className="mr-1.5 h-4 w-4" /> Download PNG (1080 × 1920)
          </Button>
        </div>

        {/* Controls */}
        <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Design</h3>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rc-title">Title text</Label>
            <Textarea
              id="rc-title"
              value={settings.title}
              onChange={(e) => setSettings((s) => ({ ...s, title: e.target.value }))}
              placeholder="Your reel headline"
              className="min-h-[72px] resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rc-sub">Subtitle (optional)</Label>
            <Input
              id="rc-sub"
              value={settings.subtitle}
              onChange={(e) => setSettings((s) => ({ ...s, subtitle: e.target.value }))}
              placeholder="A short supporting line"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Font size</Label>
              <span className="font-mono text-xs">{settings.fontSize}px</span>
            </div>
            <Slider
              value={[settings.fontSize]}
              onValueChange={([v]) => setSettings((s) => ({ ...s, fontSize: v }))}
              min={48}
              max={180}
              step={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Vertical position</Label>
              <div className="flex gap-1.5">
                {(["top", "center", "bottom"] as TextPos[]).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={settings.position === p ? "default" : "outline"}
                    onClick={() => setSettings((s) => ({ ...s, position: p }))}
                    className="flex-1"
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alignment</Label>
              <div className="flex gap-1.5">
                {(["left", "center", "right"] as const).map((a) => (
                  <Button
                    key={a}
                    size="sm"
                    variant={settings.align === a ? "default" : "outline"}
                    onClick={() => setSettings((s) => ({ ...s, align: a }))}
                    className="flex-1"
                  >
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Background</Label>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant={settings.bgMode === "solid" ? "default" : "outline"}
                onClick={() => setSettings((s) => ({ ...s, bgMode: "solid" }))}
                className="flex-1"
              >
                Solid
              </Button>
              <Button
                size="sm"
                variant={settings.bgMode === "gradient" ? "default" : "outline"}
                onClick={() => setSettings((s) => ({ ...s, bgMode: "gradient" }))}
                className="flex-1"
              >
                Gradient
              </Button>
            </div>
            {settings.bgMode === "solid" ? (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.bgColor}
                  onChange={(e) => setSettings((s) => ({ ...s, bgColor: e.target.value }))}
                  className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1"
                  aria-label="Background colour"
                />
                <Input
                  value={settings.bgColor}
                  onChange={(e) => setSettings((s) => ({ ...s, bgColor: e.target.value }))}
                  className="font-mono"
                  aria-label="Background colour hex"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">From</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.gradFrom}
                        onChange={(e) => setSettings((s) => ({ ...s, gradFrom: e.target.value }))}
                        className="h-9 w-9 cursor-pointer rounded-md border bg-background p-1"
                        aria-label="Gradient start colour"
                      />
                      <Input
                        value={settings.gradFrom}
                        onChange={(e) => setSettings((s) => ({ ...s, gradFrom: e.target.value }))}
                        className="font-mono text-xs"
                        aria-label="Gradient start hex"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">To</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.gradTo}
                        onChange={(e) => setSettings((s) => ({ ...s, gradTo: e.target.value }))}
                        className="h-9 w-9 cursor-pointer rounded-md border bg-background p-1"
                        aria-label="Gradient end colour"
                      />
                      <Input
                        value={settings.gradTo}
                        onChange={(e) => setSettings((s) => ({ ...s, gradTo: e.target.value }))}
                        className="font-mono text-xs"
                        aria-label="Gradient end hex"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Angle</Label>
                    <span className="font-mono text-xs">{settings.gradAngle}°</span>
                  </div>
                  <Slider
                    value={[settings.gradAngle]}
                    onValueChange={([v]) => setSettings((s) => ({ ...s, gradAngle: v }))}
                    min={0}
                    max={360}
                    step={5}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Text colour</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={settings.autoText}
                  onChange={(e) => setSettings((s) => ({ ...s, autoText: e.target.checked }))}
                  className="h-3.5 w-3.5"
                />
                Auto-contrast
              </label>
            </div>
            {settings.autoText ? (
              <p className="text-xs text-muted-foreground">
                Text colour will be picked automatically.
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.textColor}
                  onChange={(e) => setSettings((s) => ({ ...s, textColor: e.target.value }))}
                  className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1"
                  aria-label="Text colour"
                />
                <Input
                  value={settings.textColor}
                  onChange={(e) => setSettings((s) => ({ ...s, textColor: e.target.value }))}
                  className="font-mono"
                  aria-label="Text colour hex"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={settings.overlay}
                onChange={(e) => setSettings((s) => ({ ...s, overlay: e.target.checked }))}
                className="h-3.5 w-3.5"
              />
              Dark overlay for legibility
            </label>
            {settings.overlay && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Overlay strength</Label>
                  <span className="font-mono text-xs">
                    {Math.round(settings.overlayStrength * 100)}%
                  </span>
                </div>
                <Slider
                  value={[Math.round(settings.overlayStrength * 100)]}
                  onValueChange={([v]) =>
                    setSettings((s) => ({ ...s, overlayStrength: v / 100 }))
                  }
                  min={5}
                  max={80}
                  step={5}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Generate a 1080 × 1920 Instagram Reel cover image with a title overlay. Pick a solid colour or two-stop gradient background at any angle, type a headline and optional subtitle, choose a font size, vertical position and alignment, and download a full-resolution PNG ready to upload as your reel cover. An optional dark overlay helps text pop on busy backgrounds.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter your title text",
        description:
          "Type the headline you want on the cover. Multi-line titles wrap automatically. An optional subtitle appears below in a smaller weight.",
      },
      {
        title: "Pick a background",
        description:
          "Choose a solid colour or a two-stop gradient at any angle. Use the auto-contrast toggle to let the tool pick black or white text automatically, or set the text colour manually.",
      },
      {
        title: "Position and size the text",
        description:
          "Use the font-size slider and the top/center/bottom + left/center/right buttons to place the title. Toggle a dark overlay for legibility on busy backgrounds.",
      },
      {
        title: "Download the PNG",
        description:
          "Click Download to save a 1080 × 1920 PNG, ready to upload as your Instagram Reel cover.",
      },
    ],
    useCases: [
      "Create a branded cover for an Instagram Reel so it stands out in the profile grid.",
      "Generate a series of reel covers with a consistent gradient and font for a campaign.",
      "Add a punchy headline to a reel that has no in-video text.",
      "Make a YouTube Short thumbnail with a 9:16 aspect ratio.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The cover is rendered with the Inter font (or your system fallback). Instagram does not embed fonts in uploaded images, so the published cover will look identical everywhere.</li>
        <li>Long titles may overflow the canvas at large font sizes — reduce the font size or split into multiple lines with Enter / Return.</li>
        <li>The 1080 × 1920 size matches Instagram’s recommended Reel cover dimensions. Instagram may still crop the visible area depending on the viewer’s device.</li>
        <li>This tool produces a static PNG. To add motion or animated text, export the cover here and import it into a video editor.</li>
      </ul>
    ),
    faq: [
      {
        q: "What size is an Instagram Reel cover?",
        a: "1080 × 1920 pixels (9:16 aspect ratio) is the recommended size — the same as the reel video itself. Instagram displays the cover in a 1:1 cropped view on profile grids, so keep important text away from the extreme edges.",
      },
      {
        q: "How do I upload the cover to my reel?",
        a: "After downloading the PNG, open Instagram, start uploading your reel, and on the final screen tap “Cover” → “From Camera Roll” (or the equivalent option on your device). Pick the PNG you just downloaded.",
      },
      {
        q: "Why does my title look different from the preview?",
        a: "The tool uses the Inter font. If your system does not have Inter installed, the browser falls back to a similar sans-serif. The downloaded PNG always uses whatever font was available at render time.",
      },
      {
        q: "Can I add my own background image?",
        a: "Not in this version — the tool supports solid colours and gradients only. For an image background, generate a gradient cover here as a starting point and composite an image behind it in any image editor.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
