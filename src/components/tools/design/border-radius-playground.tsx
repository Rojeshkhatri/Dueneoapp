"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

interface Radii {
  // Per-corner X and Y radii in px.
  tlX: number; tlY: number;
  trX: number; trY: number;
  brX: number; brY: number;
  blX: number; blY: number;
}

type PresetId = "sharp" | "card" | "pill" | "circle" | "squircle";

const DEFAULT_RADII: Radii = {
  tlX: 12, tlY: 12,
  trX: 12, trY: 12,
  brX: 12, brY: 12,
  blX: 12, blY: 12,
};

const PRESETS: { id: PresetId; label: string; radii: Radii }[] = [
  { id: "sharp", label: "Sharp", radii: { tlX: 0, tlY: 0, trX: 0, trY: 0, brX: 0, brY: 0, blX: 0, blY: 0 } },
  { id: "card", label: "Card", radii: { tlX: 16, tlY: 16, trX: 16, trY: 16, brX: 16, brY: 16, blX: 16, blY: 16 } },
  { id: "pill", label: "Pill", radii: { tlX: 999, tlY: 999, trX: 999, trY: 999, brX: 999, brY: 999, blX: 999, blY: 999 } },
  { id: "circle", label: "Circle", radii: { tlX: 999, tlY: 999, trX: 999, trY: 999, brX: 999, brY: 999, blX: 999, blY: 999 } },
  // Squircle uses asymmetric X/Y on each corner to evoke the superellipse shape.
  { id: "squircle", label: "Squircle", radii: { tlX: 32, tlY: 28, trX: 32, trY: 28, brX: 32, brY: 28, blX: 32, blY: 28 } },
];

const SLIDER_DEFS: { key: keyof Radii; label: string }[] = [
  { key: "tlX", label: "Top-left X" },
  { key: "tlY", label: "Top-left Y" },
  { key: "trX", label: "Top-right X" },
  { key: "trY", label: "Top-right Y" },
  { key: "brX", label: "Bottom-right X" },
  { key: "brY", label: "Bottom-right Y" },
  { key: "blX", label: "Bottom-left X" },
  { key: "blY", label: "Bottom-left Y" },
];

/** Build a CSS border-radius string from the 8 radii. */
function buildBorderRadius(r: Radii): string {
  // If all 8 values match, fall back to the simple form.
  const all = [r.tlX, r.tlY, r.trX, r.trY, r.brX, r.brY, r.blX, r.blY];
  if (all.every((v) => v === r.tlX)) {
    return r.tlX >= 999 ? "9999px" : `${r.tlX}px`;
  }
  // Otherwise emit the per-corner syntax:
  // border-radius: <tlX> <trX> <brX> <blX> / <tlY> <trY> <brY> <blY>;
  const fmt = (n: number) => (n >= 999 ? "9999px" : `${n}px`);
  const xs = `${fmt(r.tlX)} ${fmt(r.trX)} ${fmt(r.brX)} ${fmt(r.blX)}`;
  const ys = `${fmt(r.tlY)} ${fmt(r.trY)} ${fmt(r.brY)} ${fmt(r.blY)}`;
  if (xs === ys) return xs;
  return `${xs} / ${ys}`;
}

export function BorderRadiusPlayground({ tool }: { tool: ToolDefinition }) {
  const [radii, setRadii] = React.useState<Radii>(DEFAULT_RADII);
  const [activePreset, setActivePreset] = React.useState<PresetId | "custom">("card");

  const update = (key: keyof Radii, value: number) => {
    setRadii((prev) => ({ ...prev, [key]: value }));
    setActivePreset("custom");
  };

  const applyPreset = (id: PresetId) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setRadii(preset.radii);
    setActivePreset(id);
  };

  const reset = () => {
    setRadii(DEFAULT_RADII);
    setActivePreset("card");
    toast.info("Reset to defaults.");
  };

  const cssValue = React.useMemo(() => buildBorderRadius(radii), [radii]);
  const cssRule = React.useMemo(() => `border-radius: ${cssValue};`, [cssValue]);

  const content: ToolContent = {
    intro:
      "Shape boxes with eight independent handles — one X and one Y radius per corner — and watch the preview update live. Copy the CSS `border-radius` value (including the per-corner `horizontal / vertical` syntax) or apply a preset like pill, circle, squircle or card.",
    tool: (
      <div className="space-y-5">
        {/* Preview + presets */}
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Preview</h2>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant={activePreset === p.id ? "default" : "outline"}
                    onClick={() => applyPreset(p.id)}
                    className="text-xs"
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex min-h-[260px] items-center justify-center rounded-lg bg-muted/40 p-6">
              <div
                className="h-44 w-44 bg-primary"
                style={{ borderRadius: cssValue }}
                aria-label="Border-radius preview"
                role="img"
              />
            </div>
          </div>

          {/* Sliders */}
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Corner radii</h2>
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {SLIDER_DEFS.map((def) => (
                <div key={def.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`br-${def.key}`} className="text-xs">
                      {def.label}
                    </Label>
                    <Input
                      id={`br-${def.key}-num`}
                      type="number"
                      min={0}
                      max={200}
                      value={radii[def.key] >= 999 ? 999 : radii[def.key]}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (Number.isFinite(n)) update(def.key, Math.max(0, Math.min(200, n)));
                      }}
                      className="h-7 w-16 font-mono text-xs"
                    />
                  </div>
                  <Slider
                    id={`br-${def.key}`}
                    value={[radii[def.key] >= 999 ? 200 : radii[def.key]]}
                    min={0}
                    max={200}
                    step={1}
                    onValueChange={(v) => update(def.key, v[0] ?? 0)}
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Tip: set a slider to 200 (max) to get a fully-rounded edge on that side. The “pill”
              preset uses 9999 px to force a perfect pill.
            </p>
          </div>
        </div>

        {/* Output */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">CSS</h2>
            <CopyButton value={cssRule} label="Copy CSS" />
          </div>
          <pre className="overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs">
            <code>{cssRule}</code>
          </pre>
          <p className="mt-3 text-[11px] text-muted-foreground">
            When X and Y radii differ, the output uses the <code>horizontal / vertical</code> shorthand,
            which applies each axis independently per corner.
          </p>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Drag the handles",
        description:
          "Use the eight sliders (or numeric inputs) to set the X and Y radius of each corner independently. The preview updates instantly.",
      },
      {
        title: "Apply a preset",
        description:
          "Use Sharp, Card, Pill, Circle or Squircle to jump to common shapes. Pill and Circle use 9999 px for fully-rounded corners.",
      },
      {
        title: "Read the CSS",
        description:
          "The output panel shows the exact CSS `border-radius` declaration. When X and Y differ, the per-corner `horizontal / vertical` shorthand is emitted.",
      },
      {
        title: "Copy",
        description:
          "Click “Copy CSS” to put the declaration on your clipboard, ready to paste into your stylesheet or inline style.",
      },
    ],
    useCases: [
      "Design squircle or asymmetric corner shapes for app icons and cards.",
      "Generate the per-corner `horizontal / vertical` border-radius syntax without typos.",
      "Match a Figma corner-radius spec exactly when porting it to CSS.",
      "Prototype pill, circle and card shapes for a component library.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The squircle preset approximates the superellipse using X/Y radii — true SVG squircles require a path, not a border-radius.</li>
        <li>Sliders cap at 200 px; use the numeric input to go higher (up to 999 for pill-style rounding).</li>
        <li>Border-radius is not animatable across all units — prefer transitioning between two values of the same unit.</li>
      </ul>
    ),
    faq: [
      {
        q: "What does the `/` in the CSS output mean?",
        a: "It separates the horizontal radii (before the slash) from the vertical radii (after the slash). Each side lists four values in clockwise order: top-left, top-right, bottom-right, bottom-left.",
      },
      {
        q: "Why is the output sometimes a single value?",
        a: "When all eight radii are equal, the optimiser collapses the value to the simple `Npx` form. That’s the shortest equivalent CSS.",
      },
      {
        q: "How do I make a perfect circle?",
        a: "Apply the Circle preset. It sets every radius to 9999 px, which forces any element with equal width and height into a circle (and any rectangle into a pill).",
      },
      {
        q: "What’s a squircle?",
        a: "A squircle is a superellipse — a shape between a square and a circle popularised by iOS app icons. This tool approximates it with asymmetric X/Y radii; for a true squircle you’d need an SVG path.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
