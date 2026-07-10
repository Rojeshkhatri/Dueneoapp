"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  GripVertical,
  ImageIcon,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  downloadBlob,
  getCanvas2D,
  hexToRgba,
  readableTextOn,
  uid,
  wrapText,
} from "./_social-helpers";

type Layout = "title-top" | "title-bottom" | "centered" | "split";
type Aspect = "square" | "portrait";
type BgMode = "solid" | "gradient";

interface Slide {
  id: string;
  title: string;
  body: string;
}

interface Settings {
  layout: Layout;
  aspect: Aspect;
  bgMode: BgMode;
  bgColor: string;
  gradFrom: string;
  gradTo: string;
  gradAngle: number;
  textColor: string;
  autoText: boolean;
}

const ASPECT_DIMS: Record<Aspect, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: "Square 1080 × 1080" },
  portrait: { w: 1208, h: 1520, label: "Portrait 1208 × 1520" },
};

const LAYOUT_OPTIONS: { value: Layout; label: string }[] = [
  { value: "title-top", label: "Title on top" },
  { value: "title-bottom", label: "Title at bottom" },
  { value: "centered", label: "Centred" },
  { value: "split", label: "Split (title left · body right)" },
];

const PAGE_NUMBER_OPTIONS = ["bottom-right", "bottom-center", "top-right", "none"] as const;
type PageNumberPos = (typeof PAGE_NUMBER_OPTIONS)[number];

function buildBackgroundFill(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: Settings
) {
  if (s.bgMode === "solid") {
    ctx.fillStyle = s.bgColor;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const angle = ((s.gradAngle % 360) + 360) % 360;
  const rad = (angle * Math.PI) / 180;
  const cx = w / 2;
  const cy = h / 2;
  const halfDiag = Math.sqrt(w * w + h * h) / 2;
  const dx = Math.cos(rad) * halfDiag;
  const dy = Math.sin(rad) * halfDiag;
  const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  grad.addColorStop(0, s.gradFrom);
  grad.addColorStop(1, s.gradTo);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function effectiveTextColors(s: Settings): { title: string; body: string } {
  if (s.autoText) {
    const base =
      s.bgMode === "solid" ? s.bgColor : s.gradFrom; // approximate from start colour
    const txt = readableTextOn(base);
    return { title: txt, body: txt };
  }
  return { title: s.textColor, body: s.textColor };
}

function renderSlide(
  canvas: HTMLCanvasElement,
  slide: Slide,
  settings: Settings,
  pageNumber?: { current: number; total: number; pos: PageNumberPos }
) {
  const dims = ASPECT_DIMS[settings.aspect];
  canvas.width = dims.w;
  canvas.height = dims.h;
  const ctx = getCanvas2D(canvas);

  // Background
  buildBackgroundFill(ctx, dims.w, dims.h, settings);

  const margin = Math.round(dims.w * 0.08);
  const contentW = dims.w - margin * 2;
  const { title: titleColor, body: bodyColor } = effectiveTextColors(settings);

  const titleFont = `bold ${Math.round(dims.w * 0.075)}px Inter, "Segoe UI", system-ui, sans-serif`;
  const bodyFont = `400 ${Math.round(dims.w * 0.04)}px Inter, "Segoe UI", system-ui, sans-serif`;

  ctx.textBaseline = "top";

  switch (settings.layout) {
    case "title-top": {
      // Title block
      ctx.font = titleFont;
      ctx.fillStyle = titleColor;
      ctx.textAlign = "left";
      const titleLines = wrapText(ctx, slide.title, contentW);
      let cy = margin;
      const titleLineHeight = Math.round(dims.w * 0.095);
      for (const line of titleLines) {
        ctx.fillText(line, margin, cy);
        cy += titleLineHeight;
      }
      // Body block under title
      cy += Math.round(dims.w * 0.04);
      ctx.font = bodyFont;
      ctx.fillStyle = bodyColor;
      const bodyLineHeight = Math.round(dims.w * 0.058);
      drawParagraph(ctx, slide.body, margin, cy, contentW, bodyLineHeight, dims.h - margin);
      break;
    }
    case "title-bottom": {
      // Body first
      ctx.font = bodyFont;
      ctx.fillStyle = bodyColor;
      ctx.textAlign = "left";
      const bodyLineHeight = Math.round(dims.w * 0.058);
      const titleLineHeight = Math.round(dims.w * 0.095);
      // Measure title height
      ctx.font = titleFont;
      const titleLines = wrapText(ctx, slide.title, contentW);
      const titleH = titleLines.length * titleLineHeight;
      const bodyMaxY = dims.h - margin - titleH - Math.round(dims.w * 0.05);
      const bodyEndY = drawParagraph(ctx, slide.body, margin, margin, contentW, bodyLineHeight, bodyMaxY);
      // Title below
      ctx.font = titleFont;
      ctx.fillStyle = titleColor;
      let cy = Math.max(bodyEndY + Math.round(dims.w * 0.05), dims.h - margin - titleH);
      for (const line of titleLines) {
        ctx.fillText(line, margin, cy);
        cy += titleLineHeight;
      }
      break;
    }
    case "centered": {
      ctx.textAlign = "center";
      // Title
      ctx.font = titleFont;
      ctx.fillStyle = titleColor;
      const titleLineHeight = Math.round(dims.w * 0.095);
      const bodyLineHeight = Math.round(dims.w * 0.058);
      const titleLines = wrapText(ctx, slide.title, contentW);
      const bodyLines = wrapText(ctx, slide.body, contentW);
      const totalH =
        titleLines.length * titleLineHeight +
        Math.round(dims.w * 0.04) +
        bodyLines.length * bodyLineHeight;
      let cy = (dims.h - totalH) / 2;
      for (const line of titleLines) {
        ctx.fillText(line, dims.w / 2, cy);
        cy += titleLineHeight;
      }
      cy += Math.round(dims.w * 0.04);
      ctx.font = bodyFont;
      ctx.fillStyle = bodyColor;
      for (const line of bodyLines) {
        ctx.fillText(line, dims.w / 2, cy);
        cy += bodyLineHeight;
      }
      break;
    }
    case "split": {
      // Vertical divider
      ctx.fillStyle = titleColor;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(dims.w / 2 - 1, margin, 2, dims.h - margin * 2);
      ctx.globalAlpha = 1;
      // Title left
      ctx.font = titleFont;
      ctx.fillStyle = titleColor;
      ctx.textAlign = "left";
      const leftW = contentW / 2 - margin / 2;
      const titleLineHeight = Math.round(dims.w * 0.085);
      const titleLines = wrapText(ctx, slide.title, leftW);
      let cy = margin;
      for (const line of titleLines) {
        ctx.fillText(line, margin, cy);
        cy += titleLineHeight;
      }
      // Body right
      ctx.font = bodyFont;
      ctx.fillStyle = bodyColor;
      const bodyLineHeight = Math.round(dims.w * 0.052);
      drawParagraph(
        ctx,
        slide.body,
        dims.w / 2 + margin / 2,
        margin,
        leftW,
        bodyLineHeight,
        dims.h - margin
      );
      break;
    }
  }

  // Page number
  if (pageNumber && pageNumber.pos !== "none") {
    ctx.font = `600 ${Math.round(dims.w * 0.03)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = bodyColor;
    ctx.globalAlpha = 0.7;
    const label = `${pageNumber.current} / ${pageNumber.total}`;
    ctx.textBaseline = "alphabetic";
    if (pageNumber.pos === "bottom-right") {
      ctx.textAlign = "right";
      ctx.fillText(label, dims.w - margin, dims.h - margin / 2);
    } else if (pageNumber.pos === "bottom-center") {
      ctx.textAlign = "center";
      ctx.fillText(label, dims.w / 2, dims.h - margin / 2);
    } else if (pageNumber.pos === "top-right") {
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText(label, dims.w - margin, margin / 2);
    }
    ctx.globalAlpha = 1;
  }
}

/** Draw a paragraph that wraps and clamps to a maximum y. Returns the y after the last line drawn. */
function drawParagraph(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxY: number
): number {
  const paragraphs = text.replace(/\r/g, "").split("\n");
  let cy = y;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  for (const para of paragraphs) {
    if (cy >= maxY) break;
    if (para.trim() === "") {
      cy += lineHeight / 2;
      continue;
    }
    const words = para.split(/\s+/);
    let current = "";
    for (const word of words) {
      if (cy >= maxY) break;
      const test = current ? `${current} ${word}` : word;
      const w = ctx.measureText(test).width;
      if (w > maxWidth && current) {
        ctx.fillText(current, x, cy);
        cy += lineHeight;
        current = word;
      } else {
        current = test;
      }
    }
    if (current && cy < maxY) {
      ctx.fillText(current, x, cy);
      cy += lineHeight;
    }
  }
  return cy;
}

export function LinkedinCarouselCreator({ tool }: { tool: ToolDefinition }) {
  const [slides, setSlides] = React.useState<Slide[]>([
    {
      id: uid("slide"),
      title: "5 Habits of Highly Effective Remote Workers",
      body: "Swipe through to learn the routines that top remote professionals use to stay focused, productive and balanced — without burning out.",
    },
    {
      id: uid("slide"),
      title: "1. Protect your morning",
      body: "Start the day with a non-work ritual — a walk, journaling, or simply coffee without screens. It sets the tone for focused work.",
    },
    {
      id: uid("slide"),
      title: "2. Time-block your deep work",
      body: "Schedule 90-minute focus blocks on your calendar. Mute notifications and treat them as meetings with yourself.",
    },
  ]);
  const [settings, setSettings] = React.useState<Settings>({
    layout: "title-top",
    aspect: "square",
    bgMode: "gradient",
    bgColor: "#0a66c2",
    gradFrom: "#0a66c2",
    gradTo: "#004182",
    gradAngle: 135,
    textColor: "#ffffff",
    autoText: false,
  });
  const [pagePos, setPagePos] = React.useState<PageNumberPos>("bottom-right");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const activeSlide = slides[activeIndex] ?? slides[0];

  // Re-render the active slide whenever something changes.
  React.useEffect(() => {
    if (!canvasRef.current || !activeSlide) return;
    renderSlide(canvasRef.current, activeSlide, settings, {
      current: activeIndex + 1,
      total: slides.length,
      pos: pagePos,
    });
  }, [activeSlide, activeIndex, slides.length, settings, pagePos]);

  const updateSlide = (id: string, patch: Partial<Slide>) => {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const addSlide = () => {
    const next: Slide = { id: uid("slide"), title: "New slide", body: "Write your body text here." };
    setSlides((prev) => [...prev, next]);
    setActiveIndex(slides.length);
    toast.success("Slide added.");
  };

  const duplicateSlide = (idx: number) => {
    setSlides((prev) => {
      const original = prev[idx];
      if (!original) return prev;
      const copy: Slide = {
        id: uid("slide"),
        title: original.title,
        body: original.body,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    toast.success("Slide duplicated.");
  };

  const removeSlide = (idx: number) => {
    if (slides.length <= 1) {
      toast.error("A carousel needs at least one slide.");
      return;
    }
    setSlides((prev) => prev.filter((_, i) => i !== idx));
    setActiveIndex((i) => Math.max(0, i >= idx ? i - 1 : i));
    toast.success("Slide removed.");
  };

  const moveSlide = (from: number, to: number) => {
    if (to < 0 || to >= slides.length || from === to) return;
    setSlides((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setActiveIndex(to);
  };

  const onThumbDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(idx));
    } catch {
      /* ignore */
    }
  };
  const onThumbDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onThumbDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== idx) {
      moveSlide(dragIndex, idx);
    }
    setDragIndex(null);
  };

  const downloadActive = async () => {
    if (!canvasRef.current || !activeSlide) return;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvasRef.current!.toBlob(resolve, "image/png")
    );
    if (!blob) {
      toast.error("Could not render the slide.");
      return;
    }
    downloadBlob(blob, `linkedin-slide-${String(activeIndex + 1).padStart(2, "0")}.png`);
    toast.success(`Slide ${activeIndex + 1} downloaded.`);
  };

  const downloadAll = async () => {
    if (slides.length === 0) return;
    const offscreen = document.createElement("canvas");
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      renderSlide(offscreen, slide, settings, {
        current: i + 1,
        total: slides.length,
        pos: pagePos,
      });
      const blob = await new Promise<Blob | null>((resolve) =>
        offscreen.toBlob(resolve, "image/png")
      );
      if (blob) {
        downloadBlob(blob, `linkedin-slide-${String(i + 1).padStart(2, "0")}.png`);
      }
      // Small pause so browsers don't block multi-download.
      await new Promise((r) => setTimeout(r, 250));
    }
    toast.success(`Downloaded ${slides.length} slide${slides.length === 1 ? "" : "s"}.`);
  };

  const reset = () => {
    setSlides([
      { id: uid("slide"), title: "Slide title", body: "Slide body text." },
    ]);
    setActiveIndex(0);
    toast.info("Carousel reset.");
  };

  const dims = ASPECT_DIMS[settings.aspect];

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(0,420px)]">
        {/* Editor column */}
        <div className="space-y-4">
          {/* Slide editor */}
          <div className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Editing slide {activeIndex + 1} of {slides.length}
              </h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => duplicateSlide(activeIndex)}>
                  Duplicate
                </Button>
                <Button size="sm" variant="outline" onClick={addSlide}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add slide
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="li-title">Slide title</Label>
              <Input
                id="li-title"
                value={activeSlide?.title ?? ""}
                onChange={(e) =>
                  activeSlide && updateSlide(activeSlide.id, { title: e.target.value })
                }
                placeholder="A punchy headline"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="li-body">Slide body</Label>
              <Textarea
                id="li-body"
                value={activeSlide?.body ?? ""}
                onChange={(e) =>
                  activeSlide && updateSlide(activeSlide.id, { body: e.target.value })
                }
                placeholder="Supporting text, bullet points, or a single key idea."
                className="min-h-[140px] resize-y"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                disabled={activeIndex === 0}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setActiveIndex((i) => Math.min(slides.length - 1, i + 1))}
                disabled={activeIndex >= slides.length - 1}
              >
                Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-rose-600 hover:text-rose-700"
                onClick={() => removeSlide(activeIndex)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Design</h3>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Layout</Label>
                <Select
                  value={settings.layout}
                  onValueChange={(v) => setSettings((s) => ({ ...s, layout: v as Layout }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Aspect ratio</Label>
                <Select
                  value={settings.aspect}
                  onValueChange={(v) => setSettings((s) => ({ ...s, aspect: v as Aspect }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">{ASPECT_DIMS.square.label}</SelectItem>
                    <SelectItem value="portrait">{ASPECT_DIMS.portrait.label}</SelectItem>
                  </SelectContent>
                </Select>
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
                      <Label className="text-xs">Gradient start</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.gradFrom}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, gradFrom: e.target.value }))
                          }
                          className="h-9 w-9 cursor-pointer rounded-md border bg-background p-1"
                          aria-label="Gradient start colour"
                        />
                        <Input
                          value={settings.gradFrom}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, gradFrom: e.target.value }))
                          }
                          className="font-mono text-xs"
                          aria-label="Gradient start hex"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Gradient end</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.gradTo}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, gradTo: e.target.value }))
                          }
                          className="h-9 w-9 cursor-pointer rounded-md border bg-background p-1"
                          aria-label="Gradient end colour"
                        />
                        <Input
                          value={settings.gradTo}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, gradTo: e.target.value }))
                          }
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
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, autoText: e.target.checked }))
                    }
                    className="h-3.5 w-3.5"
                  />
                  Auto (pick black or white)
                </label>
              </div>
              {settings.autoText ? (
                <p className="text-xs text-muted-foreground">
                  Text colour will be picked automatically for legibility against the background.
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.textColor}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, textColor: e.target.value }))
                    }
                    className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1"
                    aria-label="Text colour"
                  />
                  <Input
                    value={settings.textColor}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, textColor: e.target.value }))
                    }
                    className="font-mono"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Page number</Label>
              <Select
                value={pagePos}
                onValueChange={(v) => setPagePos(v as PageNumberPos)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom right</SelectItem>
                  <SelectItem value="bottom-center">Bottom centre</SelectItem>
                  <SelectItem value="top-right">Top right</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Preview column */}
        <div className="space-y-3 rounded-xl border bg-muted/30 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Preview</h3>
            <Badge variant="secondary">{dims.label}</Badge>
          </div>
          <div className="flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="h-auto max-h-[440px] w-auto max-w-full rounded-lg border shadow-sm"
              style={{ aspectRatio: `${dims.w} / ${dims.h}` }}
              aria-label={`Slide ${activeIndex + 1} preview`}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={downloadActive}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> This slide
            </Button>
            <Button size="sm" variant="secondary" className="flex-1" onClick={downloadAll}>
              <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> All {slides.length} as PNG
            </Button>
          </div>
        </div>
      </div>

      {/* Slide thumbnails */}
      <div className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">All slides · drag to reorder</h3>
          <span className="text-xs text-muted-foreground">
            Click a slide to edit it
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              draggable
              onDragStart={onThumbDragStart(idx)}
              onDragOver={onThumbDragOver(idx)}
              onDrop={onThumbDrop(idx)}
              onClick={() => setActiveIndex(idx)}
              className={`group relative w-32 shrink-0 overflow-hidden rounded-lg border-2 bg-background text-left transition-all ${
                activeIndex === idx
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            >
              <ThumbPreview slide={slide} settings={settings} pagePos={pagePos} current={idx + 1} total={slides.length} />
              <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                <GripVertical className="h-2.5 w-2.5 cursor-grab" /> {idx + 1}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={addSlide}
            className="flex w-32 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border p-4 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Plus className="h-5 w-5" />
            Add slide
          </button>
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Build a swipeable LinkedIn carousel slide-by-slide. Add a title and body for each slide, choose a layout (title on top, title at bottom, centred, or split), pick a solid colour or two-stop gradient background, and render each slide at the recommended 1080 × 1080 square or 1208 × 1520 portrait size. Download a single slide or all of them as PNGs — every render is full-resolution and happens locally in your browser.",
    tool: toolBody,
    howTo: [
      {
        title: "Add your slides",
        description:
          "Type a title and body for each slide. Use the Add slide button to grow your carousel and Duplicate to reuse a layout.",
      },
      {
        title: "Choose a layout and background",
        description:
          "Pick from title-top, title-bottom, centred, or split layouts. Use a solid colour or a two-stop gradient at any angle. Toggle auto text-colour to always pick a readable contrast.",
      },
      {
        title: "Pick an aspect ratio",
        description:
          "Square (1080 × 1080) is the classic LinkedIn carousel size. Portrait (1208 × 1520) gives you more vertical room and matches LinkedIn document posts.",
      },
      {
        title: "Download your PNGs",
        description:
          "Download just the current slide or every slide at once. Each PNG is rendered at full resolution and named slide-01.png, slide-02.png, … so they upload in order.",
      },
    ],
    useCases: [
      "Turn a long LinkedIn post into a swipeable carousel for higher engagement.",
      "Repurpose a blog post into 5–10 slide takeaways.",
      "Create a numbered listicle carousel with consistent branding.",
      "Generate branded quote slides for a campaign launch.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Slides are rendered with the Inter font (or your system fallback). LinkedIn does not embed fonts, so the published slides will be raster PNGs that look identical everywhere.</li>
        <li>The split layout can clip long titles on the left half — keep titles short or switch to title-top for long headlines.</li>
        <li>Multi-download triggers several files in quick succession. Some browsers may prompt you to allow multiple downloads — click “Allow”.</li>
        <li>The page number is rendered as part of the PNG. If you want clean slides for re-use, set Page number to None.</li>
      </ul>
    ),
    faq: [
      {
        q: "What size should LinkedIn carousel slides be?",
        a: "1080 × 1080 pixels (square) is the most common size and works on both mobile and desktop. 1208 × 1520 pixels (portrait) gives you more vertical real estate and matches the LinkedIn document-post format. Both options are available in the aspect-ratio dropdown.",
      },
      {
        q: "How many slides should a LinkedIn carousel have?",
        a: "LinkedIn allows up to 10 slides per carousel post. The sweet spot for engagement is usually 5–8 slides — enough to tell a story without losing the reader.",
      },
      {
        q: "Can I add my own fonts or images?",
        a: "Not in this version. The tool uses the Inter font and solid/gradient backgrounds to keep things fast and private. For custom fonts and brand imagery, export your slides here as a starting point and polish them in Figma or Canva.",
      },
      {
        q: "Why are my slides blurry when I upload them to LinkedIn?",
        a: "They shouldn’t be — every PNG is exported at full resolution (1080 × 1080 or 1208 × 1520). If LinkedIn re-encodes them, make sure each file is under LinkedIn’s 5 MB limit per image.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

/** A small thumbnail preview that re-renders the slide on a tiny canvas. */
function ThumbPreview({
  slide,
  settings,
  pagePos,
  current,
  total,
}: {
  slide: Slide;
  settings: Settings;
  pagePos: PageNumberPos;
  current: number;
  total: number;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    if (!ref.current) return;
    renderSlide(ref.current, slide, settings, { current, total, pos: pagePos });
  }, [slide, settings, pagePos, current, total]);
  return (
    <canvas
      ref={ref}
      className="block h-32 w-32"
      aria-hidden
    />
  );
}
