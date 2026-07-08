"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { isValidHex, normaliseHex, hexToRgb, type RGB } from "./_color-helpers";

interface ShadowLayer {
  id: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
}

const newId = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_LAYERS: ShadowLayer[] = [
  {
    id: newId(),
    offsetX: 0,
    offsetY: 1,
    blur: 2,
    spread: 0,
    color: "rgba(0, 0, 0, 0.06)",
    inset: false,
  },
  {
    id: newId(),
    offsetX: 0,
    offsetY: 1,
    blur: 3,
    spread: 0,
    color: "rgba(0, 0, 0, 0.10)",
    inset: false,
  },
];

type PresetId =
  | "elevation-0"
  | "elevation-1"
  | "elevation-2"
  | "elevation-3"
  | "elevation-4"
  | "elevation-5"
  | "neumorphic"
  | "glow";

interface Preset {
  id: PresetId;
  label: string;
  layers: ShadowLayer[];
}

// Material elevation presets (dp → px approximated).
const MAT: ShadowLayer[] = [
  { id: newId(), offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: "rgba(0, 0, 0, 0.06)", inset: false },
  { id: newId(), offsetX: 0, offsetY: 1, blur: 3, spread: 0, color: "rgba(0, 0, 0, 0.10)", inset: false },
];

function materialLayers(
  pairs: [number, number, number, number][],
  alpha = 0.1,
): ShadowLayer[] {
  return pairs.map(([x, y, b, s]) => ({
    id: newId(),
    offsetX: x,
    offsetY: y,
    blur: b,
    spread: s,
    color: `rgba(0, 0, 0, ${alpha})`,
    inset: false,
  }));
}

const PRESETS: Preset[] = [
  { id: "elevation-0", label: "Elevation 0", layers: [] },
  {
    id: "elevation-1",
    label: "Elevation 1",
    layers: materialLayers([[0, 1, 3, 0], [0, 1, 2, 0]]),
  },
  {
    id: "elevation-2",
    label: "Elevation 2",
    layers: materialLayers([[0, 1, 5, 0], [0, 2, 8, 0]]),
  },
  {
    id: "elevation-3",
    label: "Elevation 3",
    layers: materialLayers([[0, 1, 8, 0], [0, 3, 14, 1]]),
  },
  {
    id: "elevation-4",
    label: "Elevation 4",
    layers: materialLayers([[0, 2, 12, 0], [0, 6, 20, 1]]),
  },
  {
    id: "elevation-5",
    label: "Elevation 5",
    layers: materialLayers([[0, 4, 18, 0], [0, 10, 28, 2]]),
  },
  {
    id: "neumorphic",
    label: "Neumorphic",
    layers: [
      { id: newId(), offsetX: 8, offsetY: 8, blur: 16, spread: 0, color: "rgba(0, 0, 0, 0.15)", inset: false },
      { id: newId(), offsetX: -8, offsetY: -8, blur: 16, spread: 0, color: "rgba(255, 255, 255, 0.8)", inset: false },
    ],
  },
  {
    id: "glow",
    label: "Glow",
    layers: [
      { id: newId(), offsetX: 0, offsetY: 0, blur: 20, spread: 0, color: "rgba(37, 99, 235, 0.5)", inset: false },
      { id: newId(), offsetX: 0, offsetY: 0, blur: 40, spread: 0, color: "rgba(37, 99, 235, 0.3)", inset: false },
    ],
  },
];

/** Normalise a colour string into a usable CSS colour. Falls back to black. */
function safeColour(input: string): string {
  const v = input.trim();
  if (!v) return "rgba(0, 0, 0, 0.1)";
  // Accept rgb(), rgba(), hsl(), hsla(), named colours, hex.
  if (/^(rgb|rgba|hsl|hsla)\(/i.test(v)) return v;
  if (isValidHex(v)) {
    const rgb: RGB = hexToRgb(v);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
  }
  // Last-resort: pass through (named colours like "red").
  return v;
}

function buildLayerCss(layer: ShadowLayer): string {
  const colour = safeColour(layer.color);
  const parts = [
    layer.inset ? "inset" : "",
    `${layer.offsetX}px`,
    `${layer.offsetY}px`,
    `${layer.blur}px`,
    `${layer.spread}px`,
    colour,
  ].filter(Boolean);
  return parts.join(" ");
}

function buildBoxShadow(layers: ShadowLayer[]): string {
  if (layers.length === 0) return "none";
  return layers.map(buildLayerCss).join(", ");
}

const SLIDER_DEFS: { key: keyof Pick<ShadowLayer, "offsetX" | "offsetY" | "blur" | "spread">; label: string; min: number; max: number }[] = [
  { key: "offsetX", label: "Offset X", min: -50, max: 50 },
  { key: "offsetY", label: "Offset Y", min: -50, max: 50 },
  { key: "blur", label: "Blur", min: 0, max: 100 },
  { key: "spread", label: "Spread", min: -50, max: 50 },
];

export function ShadowGenerator({ tool }: { tool: ToolDefinition }) {
  const [layers, setLayers] = React.useState<ShadowLayer[]>(DEFAULT_LAYERS);
  const [activePreset, setActivePreset] = React.useState<PresetId | "custom">("custom");
  const [previewBg, setPreviewBg] = React.useState("#ffffff");

  const updateLayer = (id: string, patch: Partial<ShadowLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setActivePreset("custom");
  };

  const addLayer = () => {
    setLayers((prev) => [
      ...prev,
      {
        id: newId(),
        offsetX: 0,
        offsetY: 4,
        blur: 8,
        spread: 0,
        color: "rgba(0, 0, 0, 0.15)",
        inset: false,
      },
    ]);
    setActivePreset("custom");
  };

  const removeLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    setActivePreset("custom");
  };

  const moveLayer = (id: string, dir: -1 | 1) => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx === -1) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = prev.slice();
      const [item] = copy.splice(idx, 1);
      copy.splice(next, 0, item);
      return copy;
    });
    setActivePreset("custom");
  };

  const applyPreset = (id: PresetId) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    // Deep-clone layers (with fresh ids) so they’re independently editable.
    setLayers(preset.layers.map((l) => ({ ...l, id: newId() })));
    setActivePreset(id);
  };

  const reset = () => {
    setLayers(DEFAULT_LAYERS.map((l) => ({ ...l, id: newId() })));
    setPreviewBg("#ffffff");
    setActivePreset("custom");
    toast.info("Reset to defaults.");
  };

  const boxShadow = React.useMemo(() => buildBoxShadow(layers), [layers]);
  const cssRule = React.useMemo(() => `box-shadow: ${boxShadow};`, [boxShadow]);

  const content: ToolContent = {
    intro:
      "Compose multi-layer CSS box-shadows visually. Each layer has independent offset X/Y, blur, spread, colour and an inset toggle. Apply Material elevation 0–5, neumorphic or glow presets, preview on a box, then copy the `box-shadow` declaration.",
    tool: (
      <div className="space-y-5">
        {/* Presets + preview */}
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Presets</h2>
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

            <div className="mt-5 space-y-3">
              <Label htmlFor="sg-bg" className="text-xs">Preview background</Label>
              <div className="flex items-center gap-2">
                <input
                  id="sg-bg-picker"
                  type="color"
                  value={isValidHex(previewBg) ? normaliseHex(previewBg) : "#ffffff"}
                  onChange={(e) => setPreviewBg(e.target.value)}
                  aria-label="Preview background colour"
                  className="h-9 w-9 cursor-pointer rounded border bg-background p-0.5"
                />
                <Input
                  id="sg-bg"
                  value={previewBg}
                  onChange={(e) => setPreviewBg(e.target.value)}
                  className="h-9 w-32 font-mono text-xs"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Preview</h2>
            <div
              className="flex min-h-[200px] items-center justify-center rounded-lg p-6"
              style={{ backgroundColor: previewBg }}
            >
              <div
                className="h-32 w-32 rounded-xl bg-primary"
                style={{ boxShadow }}
                aria-label="Box-shadow preview"
                role="img"
              />
            </div>
          </div>
        </div>

        {/* Layer editor */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Layers</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addLayer}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add layer
              </Button>
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {layers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No layers — the box-shadow is “none”. Add a layer or pick a preset above.
              </p>
            )}
            {layers.map((layer, idx) => (
              <LayerCard
                key={layer.id}
                layer={layer}
                index={idx}
                total={layers.length}
                onChange={(patch) => updateLayer(layer.id, patch)}
                onRemove={() => removeLayer(layer.id)}
                onMove={(dir) => moveLayer(layer.id, dir)}
              />
            ))}
          </div>
        </div>

        {/* Output */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">CSS</h2>
            <CopyButton value={cssRule} label="Copy CSS" />
          </div>
          <pre className="overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs">
            <code>{cssRule}</code>
          </pre>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Layers are stacked top-to-bottom in the CSS in the same order as the cards above.
            Use the up/down arrows on each card to reorder.
          </p>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Pick a preset",
        description:
          "Start from a Material elevation (0–5), neumorphic or glow preset to get a sensible baseline, then fine-tune.",
      },
      {
        title: "Add or edit layers",
        description:
          "Each layer has independent sliders for offset X/Y, blur and spread, plus a colour picker, alpha input and inset toggle. Add as many layers as you need.",
      },
      {
        title: "Reorder layers",
        description:
          "Use the up/down arrows on each card to reorder. The first layer in the list is the topmost in the CSS `box-shadow` stack.",
      },
      {
        title: "Copy the CSS",
        description:
          "Click “Copy CSS” to put the full `box-shadow` declaration on your clipboard, ready to paste into your stylesheet or inline style.",
      },
    ],
    useCases: [
      "Design Material-style elevation for cards, modals and popovers.",
      "Build neumorphic UI elements with paired light/dark shadows.",
      "Create glowing buttons and focus rings.",
      "Prototype multi-layer shadows for a component library.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Drop-shadows on text (the CSS `text-shadow` property) are not supported — only `box-shadow`.</li>
        <li>Colour alpha must be encoded in the colour value (rgba/hsla) — the colour picker outputs solid hex; use the colour text field for alpha.</li>
        <li>Material elevation presets are approximate translations from dp to px and may need tweaking for your density.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why are my shadows too harsh?",
        a: "Lower the alpha of the colour, increase the blur, or stack two layers (a tight one for definition and a soft one for ambient spread). The Material elevation presets are good reference points.",
      },
      {
        q: "How do I make an inset shadow?",
        a: "Toggle the “Inset” switch on a layer. Inset shadows render inside the element’s box — useful for pressed buttons, wells and inputs.",
      },
      {
        q: "What’s the order of layers in the CSS?",
        a: "Layers are stacked in the order shown: the first card is the first (topmost) layer in the `box-shadow` value. Use the up/down arrows on each card to reorder.",
      },
      {
        q: "Can I use rgba colours?",
        a: "Yes — type any valid CSS colour (rgba, hsla, named, hex) in the colour field. The colour picker outputs solid hex; for alpha colours, edit the text field directly.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function LayerCard({
  layer,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  layer: ShadowLayer;
  index: number;
  total: number;
  onChange: (patch: Partial<ShadowLayer>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Layer {index + 1} of {total}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move layer up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move layer down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onRemove}
            aria-label="Remove layer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SLIDER_DEFS.map((def) => (
          <div key={def.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={`sh-${layer.id}-${def.key}`} className="text-xs">
                {def.label}
              </Label>
              <span className="font-mono text-[11px]">{layer[def.key]}px</span>
            </div>
            <Slider
              id={`sh-${layer.id}-${def.key}`}
              value={[layer[def.key]]}
              min={def.min}
              max={def.max}
              step={1}
              onValueChange={(v) => onChange({ [def.key]: v[0] ?? 0 } as Partial<ShadowLayer>)}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`sh-${layer.id}-color`} className="text-xs">
            Colour
          </Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={isValidHex(layer.color) ? normaliseHex(layer.color) : "#000000"}
              onChange={(e) => onChange({ color: e.target.value })}
              aria-label="Layer colour picker"
              className="h-9 w-9 cursor-pointer rounded border bg-background p-0.5"
            />
            <Input
              id={`sh-${layer.id}-color`}
              value={layer.color}
              onChange={(e) => onChange({ color: e.target.value })}
              className="h-9 font-mono text-xs"
              spellCheck={false}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Accepts hex, rgb, rgba, hsl, hsla, named colours.
          </p>
        </div>
        <div className="flex items-end justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <Switch
              checked={layer.inset}
              onCheckedChange={(v) => onChange({ inset: v })}
              aria-label="Inset shadow"
            />
            <span>Inset</span>
          </label>
          <code className="rounded bg-muted px-2 py-1 font-mono text-[11px]">
            {buildLayerCss(layer)}
          </code>
        </div>
      </div>
    </div>
  );
}
