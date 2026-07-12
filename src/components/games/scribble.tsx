"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { GameLayout, type GameContent } from "@/components/dueneo/game-layout";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Eraser,
  Pencil,
  Trash2,
  Undo2,
  Download,
} from "lucide-react";
import type { GameDefinition } from "@/data/games";

type Tool = "pen" | "eraser";

const COLORS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#a16207", "#64748b",
];

interface Stroke {
  tool: Tool;
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

export function Scribble({ game }: { game: GameDefinition }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [tool, setTool] = React.useState<Tool>("pen");
  const [color, setColor] = React.useState<string>("#000000");
  const [size, setSize] = React.useState<number>(6);
  const [strokes, setStrokes] = React.useState<Stroke[]>([]);
  const drawingRef = React.useRef<Stroke | null>(null);
  const canvasInitRef = React.useRef(false);
  // Full canvas state as data URL — persists between strokes without React.
  const canvasStateRef = React.useRef<string | null>(null);

  function getCanvas(): HTMLCanvasElement | null {
    return canvasRef.current ?? document.querySelector<HTMLCanvasElement>('canvas[aria-label="Drawing canvas"]');
  }

  function saveCanvas() {
    const canvas = getCanvas();
    if (canvas) canvasStateRef.current = canvas.toDataURL();
  }

  async function restoreCanvas() {
    const canvas = getCanvas();
    const state = canvasStateRef.current;
    if (!canvas || !state) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.src = state;
    await img.decode();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  }

  const initCanvas = React.useCallback((canvas: HTMLCanvasElement, container: HTMLDivElement) => {
    const rect = container.getBoundingClientRect();
    if (rect.width < 1) return;
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(320, rect.width);
    const height = Math.max(240, Math.round(width * 0.75));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    canvasInitRef.current = true;
  }, []);

  // Resize canvas to its container, preserving aspect ratio 4:3.
  const strokesRef = React.useRef<Stroke[]>([]);
  React.useEffect(() => { strokesRef.current = strokes; }, [strokes]);

  const redraw = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    const drawStroke = (stroke: Stroke) => {
      if (stroke.points.length === 0) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = stroke.size;
      ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
      ctx.beginPath();
      const pts = stroke.points;
      ctx.moveTo(pts[0].x, pts[0].y);
      if (pts.length === 1) {
        ctx.lineTo(pts[0].x + 0.5, pts[0].y + 0.5);
      } else {
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
      }
      ctx.stroke();
      ctx.restore();
    };

    // Draw committed strokes.
    for (const stroke of strokesRef.current) drawStroke(stroke);
    // Draw in-progress stroke (for resize during drawing).
    if (drawingRef.current) drawStroke(drawingRef.current);
  }, []);

  function redrawAll() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    for (const stroke of strokesRef.current) {
      if (stroke.points.length === 0) continue;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = stroke.size;
      ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
      ctx.beginPath();
      const pts = stroke.points;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
    saveCanvas();
  }

  // Initialize canvas — use querySelector to bypass ref issues.
  React.useEffect(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[aria-label="Drawing canvas"]');
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    const setup = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width < 1) return;
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(320, rect.width);
      const height = Math.max(240, Math.round(width * 0.75));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
      canvasInitRef.current = true;
    };

    // Try immediately, then on next frame.
    setup();
    const raf = requestAnimationFrame(setup);

    const onResize = () => { setup(); redrawAll(); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  type CanvasPointerEvent = React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>;

  function getPoint(e: CanvasPointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  // Lazy canvas initialization — runs on first interaction if useEffect didn't.
  function ensureCanvas() {
    if (canvasInitRef.current) return;
    // Try refs first, then fall back to DOM query.
    const canvas = canvasRef.current ?? document.querySelector<HTMLCanvasElement>('canvas[aria-label="Drawing canvas"]');
    const container = containerRef.current ?? canvas?.parentElement;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width < 1) return;
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(320, rect.width);
    const height = Math.max(240, Math.round(width * 0.75));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    // Store refs for subsequent calls.
    if (!canvasRef.current) canvasRef.current = canvas;
    if (!containerRef.current) containerRef.current = container as HTMLDivElement;
    canvasInitRef.current = true;
  }

  function startStroke(e: CanvasPointerEvent) {
    const canvas = e.currentTarget;
    const container = canvas.parentElement;
    if (!canvas || !container) return;

    // Initialize canvas if not done yet.
    if (!canvasInitRef.current) {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0) {
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(320, rect.width);
        const height = Math.max(240, Math.round(width * 0.75));
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
        }
        canvasInitRef.current = true;
        // Store refs for subsequent calls.
        canvasRef.current = canvas;
        containerRef.current = container as HTMLDivElement;
      }
    }

    // No restoreCanvas() — draw directly on top of existing canvas content.
    e.preventDefault();
    if ('pointerId' in e) (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const pt = getPoint(e);
    const stroke: Stroke = {
      tool,
      color,
      size,
      points: [pt],
    };
    drawingRef.current = stroke;
    // Draw the initial dot immediately.
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = stroke.size;
      ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, stroke.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
      ctx.fill();
      ctx.restore();
    }
  }

  function continueStroke(e: CanvasPointerEvent) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const pt = getPoint(e);
    drawingRef.current.points.push(pt);
    // Live-draw the new segment.
    const canvas = getCanvas();
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      const pts = drawingRef.current.points;
      const last = pts[pts.length - 2];
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = drawingRef.current.size;
      ctx.strokeStyle = drawingRef.current.tool === "eraser" ? "#ffffff" : drawingRef.current.color;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  function endStroke(e: CanvasPointerEvent) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const stroke = drawingRef.current;
    drawingRef.current = null;
    // Save canvas state — the stroke is already drawn on canvas by continueStroke.
    saveCanvas();
    flushSync(() => {
      setStrokes((prev) => [...prev, stroke]);
    });
  }

  function undo() {
    flushSync(() => { setStrokes((prev) => prev.slice(0, -1)); });
    redrawAll();
    toast.message("Undid last stroke.");
  }

  function clearAll() {
    flushSync(() => { setStrokes([]); });
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        ctx.restore();
      }
    }
    canvasStateRef.current = null;
    toast.message("Canvas cleared.");
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `dueneo-scribble-${Date.now()}.png`;
      a.click();
      toast.success("Image downloaded.");
    } catch {
      toast.error("Could not download image.");
    }
  }

  const content: GameContent = {
    intro:
      "A featherweight drawing pad. Sketch with the pen, erase mistakes, pick from 12 colours, adjust brush size, undo the last stroke, clear the canvas, or download your masterpiece as a PNG. Works with mouse, touch and stylus via Pointer Events.",
    game: (
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
            <button
              type="button"
              onClick={() => setTool("pen")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                tool === "pen" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Pencil className="h-3.5 w-3.5" /> Pen
            </button>
            <button
              type="button"
              onClick={() => setTool("eraser")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                tool === "eraser" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eraser className="h-3.5 w-3.5" /> Eraser
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  setTool("pen");
                }}
                aria-label={`Pick colour ${c}`}
                className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  color === c && tool === "pen" ? "border-primary ring-2 ring-primary/40" : "border-foreground/20"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="brush-size" className="text-xs text-muted-foreground">Size</Label>
            <Slider
              id="brush-size"
              value={[size]}
              min={1}
              max={40}
              step={1}
              onValueChange={(v) => setSize(v[0])}
              className="w-24"
              aria-label="Brush size"
            />
            <span className="w-6 text-xs tabular-nums text-muted-foreground">{size}</span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button onClick={undo} variant="outline" size="sm" disabled={strokes.length === 0}>
              <Undo2 className="h-4 w-4" /> Undo
            </Button>
            <Button onClick={clearAll} variant="outline" size="sm" disabled={strokes.length === 0}>
              <Trash2 className="h-4 w-4" /> Clear
            </Button>
            <Button onClick={download} variant="default" size="sm" disabled={strokes.length === 0}>
              <Download className="h-4 w-4" /> PNG
            </Button>
          </div>
        </div>

        <div ref={containerRef} className="mt-4 w-full">
          <canvas
            ref={canvasRef}
            onPointerDown={startStroke}
            onMouseDown={startStroke}
            onPointerMove={continueStroke}
            onMouseMove={continueStroke}
            onPointerUp={endStroke}
            onMouseUp={endStroke}
            onPointerCancel={endStroke}
            onPointerLeave={endStroke}
            className="block w-full touch-none rounded-lg border border-input bg-white"
            style={{ aspectRatio: "4 / 3" }}
            aria-label="Drawing canvas"
          />
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Drawing with <strong>{tool}</strong> · colour{" "}
          <span className="inline-block h-3 w-3 -translate-y-0.5 rounded-full border" style={{ backgroundColor: color }} />{" "}
          {color} · size {size}px
        </p>
      </div>
    ),
    rules: (
      <div className="space-y-3">
        <p>
          Scribble is a simple canvas: pick the <strong>Pen</strong> tool,
          choose a colour, set a brush size, then draw with your mouse,
          finger or stylus. The <strong>Eraser</strong> paints white pixels
          over your strokes to remove them.
        </p>
        <p>
          <strong>Undo</strong> removes the last stroke (you can press it
          repeatedly). <strong>Clear</strong> wipes the canvas completely.
          <strong> PNG</strong> exports the current canvas as a downloadable
          image file named with a timestamp.
        </p>
      </div>
    ),
    tips: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Use a small brush size for fine line work, large for filling backgrounds.</li>
        <li>The eraser respects the same brush size — bump it up for fast cleanup.</li>
        <li>Switch colours often and undo mistakes rather than erasing — it's faster.</li>
        <li>Download your sketch before clearing — there's no redo for a Clear.</li>
      </ul>
    ),
    controls: (
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Mouse:</strong> click and drag to draw.</li>
        <li><strong>Touch:</strong> drag with one finger.</li>
        <li><strong>Stylus:</strong> pressure-sensitive devices work natively via Pointer Events.</li>
        <li>Tap a colour swatch to switch the pen's colour, or tap the Eraser button to switch tools.</li>
      </ul>
    ),
    faq: [
      {
        q: "Where is my drawing saved?",
        a: "Only in the current browser tab. Closing or refreshing the page clears the canvas. If you want to keep a sketch, click PNG to download it.",
      },
      {
        q: "Does Undo have a limit?",
        a: "No — every stroke since the last Clear is in memory, so you can undo all the way back to a blank canvas.",
      },
      {
        q: "Can I use my own colour?",
        a: "The palette ships with 12 commonly-used colours. A custom hex picker isn't included in this lightweight build to keep the bundle small.",
      },
      {
        q: "Why is the canvas white in dark mode?",
        a: "Drawing on white is the most familiar paradigm and keeps the saved PNG legible. The card chrome around it adapts to the theme.",
      },
    ],
  };

  return <GameLayout game={game} content={content} />;
}
