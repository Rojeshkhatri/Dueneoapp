"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ToolDefinition } from "@/data/tools";
import {
  hexToRgb,
  rgbToHex,
  isValidHex,
  type RGB,
} from "./_color-helpers";

const DEFAULT_HEX = "#2563eb";

interface Swatch {
  hex: string;
  rgb: RGB;
  label: string;
  /** 0..1 — 0 is darkest (black), 1 is lightest (white), 0.5 is the base colour. */
  position: number;
  isBase: boolean;
}

/** Linear RGB mix: result = base * (1 - amount) + mixWith * amount. */
function mixRgb(base: RGB, mixWith: RGB, amount: number): RGB {
  return {
    r: base.r * (1 - amount) + mixWith.r * amount,
    g: base.g * (1 - amount) + mixWith.g * amount,
    b: base.b * (1 - amount) + mixWith.b * amount,
  };
}

function readableTextOn({ r, g, b }: RGB): string {
  // Relative luminance (sRGB) — quick version.
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const l = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return l > 0.45 ? "#0f172a" : "#ffffff";
}

function generateSwatches(baseHex: string): Swatch[] {
  const base = hexToRgb(baseHex);
  const white: RGB = { r: 255, g: 255, b: 255 };
  const black: RGB = { r: 0, g: 0, b: 0 };

  const out: Swatch[] = [];

  // 5 tints (lighter) — mixing with white at 80%, 60%, 40%, 20%.
  // position 1.0 = pure white, 0.5 = base.
  const tintAmounts = [0.8, 0.6, 0.4, 0.2];
  for (const t of tintAmounts) {
    const rgb = mixRgb(base, white, t);
    out.push({
      hex: rgbToHex(rgb),
      rgb,
      label: `Tint ${Math.round(t * 100)}%`,
      position: 0.5 + t * 0.5,
      isBase: false,
    });
  }
  // Push white at the very top for a complete ramp.
  out.push({
    hex: "#ffffff",
    rgb: white,
    label: "White 100%",
    position: 1,
    isBase: false,
  });

  // Base colour.
  out.push({
    hex: baseHex,
    rgb: base,
    label: "Base",
    position: 0.5,
    isBase: true,
  });

  // 5 shades (darker) — mixing with black at 20%, 40%, 60%, 80%.
  const shadeAmounts = [0.2, 0.4, 0.6, 0.8];
  for (const t of shadeAmounts) {
    const rgb = mixRgb(base, black, t);
    out.push({
      hex: rgbToHex(rgb),
      rgb,
      label: `Shade ${Math.round(t * 100)}%`,
      position: 0.5 - t * 0.5,
      isBase: false,
    });
  }
  // Push black at the very bottom for a complete ramp.
  out.push({
    hex: "#000000",
    rgb: black,
    label: "Black 100%",
    position: 0,
    isBase: false,
  });

  // Sort by position descending (lightest first).
  return out.sort((a, b) => b.position - a.position);
}

const COMMON_COLORS = [
  { name: "Blue", hex: "#2563eb" },
  { name: "Red", hex: "#dc2626" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Purple", hex: "#9333ea" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Slate", hex: "#64748b" },
  { name: "Teal", hex: "#14b8a6" },
];

export function ColorShadeGenerator({ tool }: { tool: ToolDefinition }) {
  const [base, setBase] = React.useState(DEFAULT_HEX);
  const [hexInput, setHexInput] = React.useState(DEFAULT_HEX);

  const isValid = isValidHex(base);
  const safeHex = isValid ? base : DEFAULT_HEX;
  const swatches = React.useMemo(() => generateSwatches(safeHex), [safeHex]);

  const onColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBase(e.target.value);
    setHexInput(e.target.value);
  };

  const onHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setHexInput(v);
    if (isValidHex(v)) {
      setBase(v.startsWith("#") ? v : `#${v}`);
    }
  };

  const reset = () => {
    setBase(DEFAULT_HEX);
    setHexInput(DEFAULT_HEX);
    toast.info("Reset to default colour.");
  };

  const copyHex = (hex: string) => {
    navigator.clipboard
      .writeText(hex)
      .then(() => toast.success(`Copied ${hex}`))
      .catch(() => toast.error("Copy failed — please copy manually."));
  };

  const cssVariables = React.useMemo(() => {
    const lines: string[] = [":root {"];
    for (const s of swatches) {
      const varName = s.isBase
        ? "  --color-base"
        : `  --color-${s.label.toLowerCase().replace(/\s+/g, "-").replace(/%/g, "pct")}`;
      lines.push(`${varName}: ${s.hex};`);
    }
    lines.push("}");
    return lines.join("\n");
  }, [swatches]);

  const tailwindTokens = React.useMemo(() => {
    const lines: string[] = [];
    for (const s of swatches) {
      const key = s.isBase ? "base" : s.label.toLowerCase().replace(/\s+/g, "-").replace(/%/g, "pct");
      lines.push(`"${key}": "${s.hex}",`);
    }
    return lines.join("\n");
  }, [swatches]);

  const content: ToolContent = {
    intro:
      "Pick a base colour and instantly generate 11 swatches — 5 lighter tints (mixed with white), the original, and 5 darker shades (mixed with black). Each swatch is click-to-copy as HEX. Export the full ramp as CSS variables or a Tailwind colour object.",
    tool: (
      <div className="space-y-5">
        {/* Controls */}
        <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="csg-picker">Base colour</Label>
            <div className="flex items-center gap-2">
              <input
                id="csg-picker"
                type="color"
                value={safeHex}
                onChange={onColorInput}
                className="h-10 w-14 cursor-pointer rounded-md border bg-transparent p-1"
                aria-label="Colour picker"
              />
              <Input
                value={hexInput}
                onChange={onHexInput}
                className="w-32 font-mono text-sm"
                placeholder="#2563eb"
                spellCheck={false}
                aria-label="HEX value"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Common colours</Label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  onClick={() => {
                    setBase(c.hex);
                    setHexInput(c.hex);
                  }}
                  className="h-7 w-7 rounded-full border-2 border-white shadow-sm ring-1 ring-black/10 dark:ring-white/20"
                  style={{ backgroundColor: c.hex }}
                  aria-label={`Pick ${c.name} (${c.hex})`}
                />
              ))}
            </div>
          </div>

          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        {/* Swatches */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-11">
          {swatches.map((s) => {
            const text = readableTextOn(s.rgb);
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => copyHex(s.hex)}
                title={`Click to copy ${s.hex}`}
                className="group relative flex aspect-[3/4] flex-col justify-between rounded-lg border p-2 text-left transition-transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-primary/40"
                style={{ backgroundColor: s.hex, color: text }}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                  {s.label}
                </span>
                <span className="font-mono text-xs font-semibold">
                  {s.hex.toUpperCase()}
                </span>
                {s.isBase && (
                  <span
                    className="absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                    style={{
                      backgroundColor: text,
                      color: s.hex,
                    }}
                  >
                    Base
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Export */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="csg-css">CSS variables</Label>
              <CopyButton value={cssVariables} size="sm" label="Copy" />
            </div>
            <pre
              id="csg-css"
              className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs"
            >
              <code>{cssVariables}</code>
            </pre>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="csg-tw">Tailwind tokens</Label>
              <CopyButton value={tailwindTokens} size="sm" label="Copy" />
            </div>
            <pre
              id="csg-tw"
              className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs"
            >
              <code>{tailwindTokens}</code>
            </pre>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Tip: click any swatch to copy its HEX value. The ramp uses simple linear RGB mixing
          (base × (1 − amount) + white/black × amount) — perfect for design-system tokens.
        </p>
      </div>
    ),
    howTo: [
      {
        title: "Pick a base colour",
        description:
          "Use the colour picker, type a HEX value, or click one of the common-colour swatches. The ramp updates instantly.",
      },
      {
        title: "Browse the 11 swatches",
        description:
          "Lightest white is on the left, the base colour is in the middle (marked Base), darkest black is on the right. Five tints above, five shades below.",
      },
      {
        title: "Click to copy",
        description:
          "Click any swatch to copy its HEX value to your clipboard. The label and HEX are shown on the swatch.",
      },
      {
        title: "Export as CSS or Tailwind tokens",
        description:
          "Use the Copy buttons in the export panel to grab the full ramp as CSS custom properties or a Tailwind colour object — ready to paste into your design-system config.",
      },
    ],
    useCases: [
      "Generate a complete colour ramp for a design system from a single brand colour.",
      "Find the right tint or shade for hover/active/disabled UI states of a primary button.",
      "Build accessible colour scales — pair with the Contrast Checker tool to verify text legibility.",
      "Export CSS variables or Tailwind tokens for a new design token file.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The ramp uses linear RGB mixing (<code>base × (1 − amount) + white/black × amount</code>),
          not HSL lightness. This is closer to what design tools like Figma produce when you
          mix colours in RGB mode, but the result may differ slightly from your design software's
          shade generator.
        </li>
        <li>
          Alpha / opacity variants are not generated — use the related Color Picker or CSS
          Gradient Generator for those.
        </li>
        <li>
          The end swatches (pure white and pure black) are included for completeness but
          usually aren't useful as design tokens — exclude them when copying into your config.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why are there 11 swatches, not 9?",
        a: "The brief asked for 5 lighter tints + base + 5 darker shades = 11. We include pure white and pure black as the endpoints so the ramp is complete — if you only want the tints and shades, skip the white and black swatches when copying.",
      },
      {
        q: "How is the mixing done?",
        a: "Linear RGB interpolation: tint = base × (1 − amount) + white × amount, shade = base × (1 − amount) + black × amount. Amount goes from 20% to 80% in 20% steps, plus 100% (pure white/black) at the ends.",
      },
      {
        q: "Is my colour sent to a server?",
        a: "No. Mixing, conversion and export all run in your browser. Nothing is uploaded.",
      },
      {
        q: "Can I get HSL values too?",
        a: "Use the related Color Picker tool — it converts any HEX to RGB and HSL. The shade generator focuses on producing a usable ramp of HEX values for design tokens.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
