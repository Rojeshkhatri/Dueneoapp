"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Plus, Trash2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { isValidHex, normaliseHex } from "./_color-helpers";

type GradientType = "linear" | "radial";
type RadialShape = "circle" | "ellipse";
type RadialPosition = "center" | "top" | "bottom" | "left" | "right" | "top left" | "top right" | "bottom left" | "bottom right";

interface Stop {
  id: string;
  color: string;
  position: number; // 0..100
}

const DEFAULT_STOPS: Stop[] = [
  { id: "s1", color: "#2563eb", position: 0 },
  { id: "s2", color: "#16a34a", position: 100 },
];

const POSITIONS: RadialPosition[] = [
  "center",
  "top",
  "bottom",
  "left",
  "right",
  "top left",
  "top right",
  "bottom left",
  "bottom right",
];

const newStopId = () => Math.random().toString(36).slice(2, 10);

export function CssGradientGenerator({ tool }: { tool: ToolDefinition }) {
  const [type, setType] = React.useState<GradientType>("linear");
  const [angle, setAngle] = React.useState(90);
  const [shape, setShape] = React.useState<RadialShape>("circle");
  const [position, setPosition] = React.useState<RadialPosition>("center");
  const [stops, setStops] = React.useState<Stop[]>(DEFAULT_STOPS);

  // Normalise stop colours so the CSS output is always valid.
  const safeStops = stops.map((s) => ({
    ...s,
    color: isValidHex(s.color) ? normaliseHex(s.color) : "#000000",
    position: Math.max(0, Math.min(100, s.position)),
  }));

  // Sort by position so the gradient renders in the right order.
  const sorted = [...safeStops].sort((a, b) => a.position - b.position);

  const css = React.useMemo(() => {
    const stopsStr = sorted
      .map((s) => `${s.color} ${Math.round(s.position)}%`)
      .join(", ");
    if (type === "linear") {
      return `linear-gradient(${angle}deg, ${stopsStr})`;
    }
    return `radial-gradient(${shape} at ${position}, ${stopsStr})`;
  }, [type, angle, shape, position, sorted]);

  const cssRule = `background: ${css};`;

  const addStop = () => {
    const last = stops[stops.length - 1];
    const newPos = last ? Math.min(100, last.position) : 100;
    setStops([
      ...stops,
      { id: newStopId(), color: "#f59e0b", position: newPos },
    ]);
  };

  const removeStop = (id: string) => {
    if (stops.length <= 2) {
      toast.error("A gradient needs at least two colour stops.");
      return;
    }
    setStops(stops.filter((s) => s.id !== id));
  };

  const updateStop = (id: string, patch: Partial<Stop>) => {
    setStops(stops.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const reset = () => {
    setType("linear");
    setAngle(90);
    setShape("circle");
    setPosition("center");
    setStops(DEFAULT_STOPS);
    toast.info("Reset to defaults.");
  };

  const content: ToolContent = {
    intro:
      "Build linear and radial CSS gradients visually. Add or remove colour stops, drag the angle slider for linear gradients, or pick a shape and position for radial ones. Copy the generated CSS in one click.",
    tool: (
      <div className="space-y-5">
        {/* Live preview */}
        <div className="space-y-2">
          <Label htmlFor="gg-preview">Live preview</Label>
          <div
            id="gg-preview"
            className="h-48 w-full rounded-xl border"
            style={{ background: css }}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Controls */}
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label>Gradient type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["linear", "radial"] as GradientType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={
                      "rounded-md border px-3 py-2 text-sm capitalize transition-colors " +
                      (type === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background hover:bg-muted")
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {type === "linear" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="gg-angle">Angle</Label>
                  <span className="font-mono text-xs text-muted-foreground">{angle}°</span>
                </div>
                <Slider
                  id="gg-angle"
                  value={[angle]}
                  min={0}
                  max={360}
                  step={1}
                  onValueChange={(v) => setAngle(v[0] ?? 0)}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="gg-shape">Shape</Label>
                  <Select
                    value={shape}
                    onValueChange={(v) => setShape(v as RadialShape)}
                  >
                    <SelectTrigger id="gg-shape">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="circle">circle</SelectItem>
                      <SelectItem value="ellipse">ellipse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gg-pos">Position</Label>
                  <Select
                    value={position}
                    onValueChange={(v) => setPosition(v as RadialPosition)}
                  >
                    <SelectTrigger id="gg-pos">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Colour stops ({stops.length})</Label>
                <Button variant="outline" size="sm" onClick={addStop}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add stop
                </Button>
              </div>
              <div className="space-y-2">
                {stops.map((s) => {
                  const safe = isValidHex(s.color) ? s.color : "#000000";
                  return (
                    <div key={s.id} className="flex items-center gap-2 rounded-md border bg-background p-2">
                      <input
                        type="color"
                        value={safe}
                        onChange={(e) => updateStop(s.id, { color: e.target.value })}
                        className="h-9 w-9 flex-none cursor-pointer rounded border bg-background p-0.5"
                        aria-label={`Colour for stop at ${s.position}%`}
                      />
                      <Input
                        value={s.color}
                        onChange={(e) => updateStop(s.id, { color: e.target.value })}
                        className="w-24 font-mono text-xs"
                        spellCheck={false}
                        aria-label="Stop colour hex"
                      />
                      <div className="flex flex-1 items-center gap-2">
                        <Slider
                          value={[s.position]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={(v) => updateStop(s.id, { position: v[0] ?? 0 })}
                          aria-label="Stop position"
                        />
                        <span className="w-10 text-right font-mono text-xs text-muted-foreground">
                          {Math.round(s.position)}%
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-none"
                        onClick={() => removeStop(s.id)}
                        aria-label="Remove stop"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          {/* CSS output */}
          <div className="space-y-3 rounded-xl border bg-muted/30 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Generated CSS</h3>
              <CopyButton value={cssRule} size="sm" />
            </div>
            <pre className="overflow-x-auto rounded-lg border bg-background p-3 font-mono text-xs">
              <code>{cssRule}</code>
            </pre>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                <strong className="text-foreground">Raw value:</strong>{" "}
                <code className="font-mono">{css}</code>
              </p>
              <p>Use it with <code className="font-mono">background</code> or <code className="font-mono">background-image</code>.</p>
            </div>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Pick a gradient type",
        description:
          "Switch between linear (a straight colour blend at an angle) and radial (a colour blend radiating from a point).",
      },
      {
        title: "Set direction",
        description:
          "For linear gradients, drag the angle slider. For radial gradients, pick a shape (circle or ellipse) and a centre position.",
      },
      {
        title: "Manage colour stops",
        description:
          "Add stops with the Add stop button, drag the position sliders to reorder them visually, change colours with the picker or HEX field, and remove a stop with the trash icon.",
      },
      {
        title: "Copy the CSS",
        description:
          "The generated `background:` rule appears on the right. Use Copy to put it on your clipboard and paste into your stylesheet.",
      },
    ],
    useCases: [
      "Build a hero-section background gradient for a landing page.",
      "Generate a button hover-state gradient that matches your brand palette.",
      "Prototype a radial vignette for a card or modal backdrop.",
      "Produce accessible multi-stop gradients for data visualisation legends.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Conic gradients are not supported — use linear or radial only.</li>
        <li>Stop positions are clamped to 0–100%. To extend a colour band beyond the box, edit the CSS by hand after copying.</li>
        <li>Only solid HEX colours are exposed in the UI. You can hand-edit the copied CSS to add alpha or HSL colours.</li>
        <li>A minimum of two colour stops is enforced; remove is disabled when only two remain.</li>
      </ul>
    ),
    faq: [
      {
        q: "Can I use transparency?",
        a: "The UI only exposes HEX, but you can paste the generated CSS into your editor and replace any colour with rgba(), hsla(), or an 8-digit #rrggbbaa hex.",
      },
      {
        q: "What angle should I use?",
        a: "0deg points straight up, 90deg points right, 180deg points down, 270deg points left. Most landing-page hero gradients use 90–135deg.",
      },
      {
        q: "Why are my stops reordered?",
        a: "The generated CSS sorts stops by position so the gradient renders correctly. The order in the UI does not matter — only the position value does.",
      },
      {
        q: "Can I copy just the gradient value (without `background:`)?",
        a: "Yes — the raw value is shown below the CSS block. Use the main Copy button to copy the full `background:` rule, or select the raw value to copy it manually.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
