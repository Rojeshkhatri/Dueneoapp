"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ToolDefinition } from "@/data/tools";
import {
  hexToRgb,
  isValidHex,
  complementaryPalette,
  analogousPalette,
  triadicPalette,
  tetradicPalette,
  monochromaticPalette,
  shadeScale,
  contrastRatio,
  type PaletteSwatch,
  type RGB,
} from "./_color-helpers";

const DEFAULT_HEX = "#2563eb";

type SchemeId =
  | "complementary"
  | "analogous"
  | "triadic"
  | "tetradic"
  | "monochromatic"
  | "shades";

const SCHEMES: { id: SchemeId; label: string; description: string }[] = [
  { id: "complementary", label: "Complementary", description: "Base + 180° opposite" },
  { id: "analogous", label: "Analogous", description: "Base + ±30° neighbours" },
  { id: "triadic", label: "Triadic", description: "Three colours 120° apart" },
  { id: "tetradic", label: "Tetradic", description: "Rectangle, four colours" },
  { id: "monochromatic", label: "Monochromatic", description: "Same hue, 5 lightnesses" },
  { id: "shades", label: "Shades", description: "9 shades, light → dark" },
];

export function ColorPaletteGenerator({ tool }: { tool: ToolDefinition }) {
  const [base, setBase] = React.useState(DEFAULT_HEX);
  const [scheme, setScheme] = React.useState<SchemeId>("complementary");

  const isValid = isValidHex(base);
  const safeHex = isValid ? base : DEFAULT_HEX;

  const swatches: PaletteSwatch[] = React.useMemo(() => {
    switch (scheme) {
      case "complementary":
        return complementaryPalette(safeHex);
      case "analogous":
        return analogousPalette(safeHex);
      case "triadic":
        return triadicPalette(safeHex);
      case "tetradic":
        return tetradicPalette(safeHex);
      case "monochromatic":
        return monochromaticPalette(safeHex);
      case "shades":
        return shadeScale(safeHex, 9);
      default:
        return [];
    }
  }, [scheme, safeHex]);

  const copySwatch = (hex: string) => {
    navigator.clipboard
      .writeText(hex)
      .then(() => {
        toast.success(`Copied ${hex}`);
      })
      .catch(() => toast.error("Copy failed — please copy manually."));
  };

  const reset = () => {
    setBase(DEFAULT_HEX);
    setScheme("complementary");
    toast.info("Reset to defaults.");
  };

  const allHex = swatches.map((s) => s.hex).join(", ");

  const content: ToolContent = {
    intro:
      "Pick a base colour and instantly generate harmonious palettes — complementary, analogous, triadic, tetradic, monochromatic and a 9-step shade ramp. Click any swatch to copy its HEX value.",
    tool: (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="pg-base">Base colour</Label>
            <div className="flex items-center gap-2">
              <input
                id="pg-base-picker"
                type="color"
                value={safeHex}
                onChange={(e) => setBase(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded-md border bg-background p-1"
                aria-label="Base colour picker"
              />
              <Input
                id="pg-base"
                value={base}
                onChange={(e) => setBase(e.target.value)}
                onBlur={() => {
                  if (!isValidHex(base)) {
                    toast.error("Invalid hex — reverting.");
                    setBase(DEFAULT_HEX);
                  }
                }}
                placeholder="#2563eb"
                className="w-32 font-mono"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <CopyButton value={allHex} size="sm" label="Copy all HEX" />
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        <Tabs value={scheme} onValueChange={(v) => setScheme(v as SchemeId)}>
          <TabsList className="flex w-full flex-wrap justify-start gap-1 h-auto p-1">
            {SCHEMES.map((s) => (
              <TabsTrigger key={s.id} value={s.id} className="text-xs sm:text-sm">
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {SCHEMES.map((s) => (
            <TabsContent key={s.id} value={s.id} className="mt-4">
              <p className="mb-3 text-xs text-muted-foreground">{s.description}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {swatches.map((sw, i) => (
                  <SwatchCard key={`${sw.hex}-${i}`} swatch={sw} onCopy={copySwatch} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    ),
    howTo: [
      {
        title: "Pick a base colour",
        description:
          "Use the colour square or type a HEX value. This colour anchors every palette the tool generates.",
      },
      {
        title: "Switch schemes",
        description:
          "Use the tabs to switch between complementary, analogous, triadic, tetradic, monochromatic and shades.",
      },
      {
        title: "Click a swatch to copy",
        description:
          "Each swatch shows the HEX value, name and an editable hint. Click it (or the Copy button) to put the HEX on your clipboard.",
      },
      {
        title: "Copy the whole palette",
        description:
          "Use the “Copy all HEX” button at the top right to copy a comma-separated list of every swatch in the current scheme.",
      },
    ],
    useCases: [
      "Build a brand colour system around a single signature colour.",
      "Find an accent colour that contrasts well with a primary brand colour.",
      "Generate a 9-step shade ramp for use as CSS custom properties on a design system.",
      "Pick a triadic palette for a data visualisation that needs three distinguishable series.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Palette math runs in the HSL colour space. Very saturated bases can produce visually uneven lightness ramps.</li>
        <li>The tool only outputs solid HEX values — gradients and alpha colours are not generated.</li>
        <li>Accessibility is not checked automatically. Use the Contrast Checker tool to verify text colour pairings.</li>
      </ul>
    ),
    faq: [
      {
        q: "Which scheme should I use?",
        a: "Complementary gives a high-contrast pair, analogous gives a calm neighbouring palette, triadic and tetradic give vibrant multi-colour schemes, monochromatic gives five lightnesses of the same hue, and shades gives a nine-step ramp from black to white.",
      },
      {
        q: "Can I copy all the colours at once?",
        a: "Yes — use the “Copy all HEX” button at the top right. It copies a comma-separated list of every swatch in the current scheme.",
      },
      {
        q: "How are palettes generated?",
        a: "The base HEX is converted to HSL, then the hue is rotated by fixed angles (e.g. 180° for complementary, ±30° for analogous). Monochromatic and shades vary lightness while keeping hue and saturation constant.",
      },
      {
        q: "Is the palette accessible?",
        a: "Not necessarily — high-contrast palettes can still produce poor text contrast. Run the chosen foreground/background pair through the Contrast Checker tool before shipping.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function SwatchCard({
  swatch,
  onCopy,
}: {
  swatch: PaletteSwatch;
  onCopy: (hex: string) => void;
}) {
  const fg = bestTextOn(hexToRgb(swatch.hex));
  return (
    <button
      type="button"
      onClick={() => onCopy(swatch.hex)}
      className="group overflow-hidden rounded-lg border text-left transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      title={`Click to copy ${swatch.hex}`}
    >
      <div
        className="flex h-20 items-end justify-between px-3 py-2"
        style={{ backgroundColor: swatch.hex, color: fg }}
      >
        <span className="text-xs font-medium uppercase opacity-80">{swatch.name}</span>
      </div>
      <div className="flex items-center justify-between bg-background px-3 py-2">
        <span className="font-mono text-xs uppercase">{swatch.hex}</span>
        <span className="text-[10px] text-muted-foreground">click → copy</span>
      </div>
    </button>
  );
}

function bestTextOn(rgb: RGB): string {
  return contrastRatio(rgb, { r: 0, g: 0, b: 0 }) >=
    contrastRatio(rgb, { r: 255, g: 255, b: 255 })
    ? "#000000"
    : "#ffffff";
}
