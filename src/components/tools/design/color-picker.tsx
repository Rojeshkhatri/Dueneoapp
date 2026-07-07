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
  rgbToHsl,
  hslToRgb,
  rgbToCss,
  hslToCss,
  parseRgbString,
  parseHslString,
  isValidHex,
  contrastRatio,
  formatRatio,
  relativeLuminance,
  type RGB,
  type HSL,
} from "./_color-helpers";

const DEFAULT_HEX = "#2563eb";

export function ColorPicker({ tool }: { tool: ToolDefinition }) {
  const [hex, setHex] = React.useState(DEFAULT_HEX);
  const [rgbText, setRgbText] = React.useState("");
  const [hslText, setHslText] = React.useState("");

  // Sync derived text fields whenever the canonical hex changes.
  const syncFromHex = React.useCallback((nextHex: string) => {
    const rgb = hexToRgb(nextHex);
    const hsl = rgbToHsl(rgb);
    setHex(nextHex);
    setRgbText(rgbToCss(rgb));
    setHslText(hslToCss(hsl));
  }, []);

  React.useEffect(() => {
    syncFromHex(DEFAULT_HEX);
  }, [syncFromHex]);

  const onColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    syncFromHex(e.target.value);
  };

  const onHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Keep raw text in the field so users can type freely.
    setHex(raw);
    if (isValidHex(raw)) {
      const rgb = hexToRgb(raw);
      const hsl = rgbToHsl(rgb);
      setRgbText(rgbToCss(rgb));
      setHslText(hslToCss(hsl));
    }
  };

  const onHexBlur = () => {
    if (isValidHex(hex)) {
      syncFromHex(hex);
    } else {
      toast.error("Invalid hex colour — reverting.");
      syncFromHex(DEFAULT_HEX);
    }
  };

  const onRgbInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setRgbText(raw);
    const parsed = parseRgbString(raw);
    if (parsed) {
      applyRgb(parsed);
    }
  };

  const onRgbBlur = () => {
    const parsed = parseRgbString(rgbText);
    if (parsed) {
      applyRgb(parsed);
    } else {
      toast.error("Invalid RGB — reverting.");
      syncFromHex(hex);
    }
  };

  const onHslInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setHslText(raw);
    const parsed = parseHslString(raw);
    if (parsed) {
      applyHsl(parsed);
    }
  };

  const onHslBlur = () => {
    const parsed = parseHslString(hslText);
    if (parsed) {
      applyHsl(parsed);
    } else {
      toast.error("Invalid HSL — reverting.");
      syncFromHex(hex);
    }
  };

  const applyRgb = (rgb: RGB) => {
    const next = rgbToHex(rgb);
    setHex(next);
    setRgbText(rgbToCss(rgb));
    setHslText(hslToCss(rgbToHsl(rgb)));
  };

  const applyHsl = (hsl: HSL) => {
    const rgb = hslToRgb(hsl);
    const next = rgbToHex(rgb);
    setHex(next);
    setRgbText(rgbToCss(rgb));
    setHslText(hslToCss(hsl));
  };

  const reset = () => {
    syncFromHex(DEFAULT_HEX);
    toast.info("Reset to default colour.");
  };

  // Contrast checks against white & black.
  const rgb = hexToRgb(hex);
  const white: RGB = { r: 255, g: 255, b: 255 };
  const black: RGB = { r: 0, g: 0, b: 0 };
  const onWhite = contrastRatio(rgb, white);
  const onBlack = contrastRatio(rgb, black);

  const content: ToolContent = {
    intro:
      "Pick a colour with the native colour picker or type a value in HEX, RGB or HSL — every field stays in sync. See contrast ratios against white and black, and copy any format with one click.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Picker + swatch */}
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="cp-color">Visual picker</Label>
              <div className="flex items-center gap-3">
                <input
                  id="cp-color"
                  type="color"
                  value={isValidHex(hex) ? hex : DEFAULT_HEX}
                  onChange={onColorInput}
                  className="h-12 w-16 cursor-pointer rounded-md border bg-background p-1"
                  aria-label="Colour picker"
                />
                <div
                  className="flex h-12 flex-1 items-center justify-center rounded-md border font-mono text-sm font-medium"
                  style={{
                    backgroundColor: isValidHex(hex) ? hex : DEFAULT_HEX,
                    color: onWhite >= onBlack ? "#000" : "#fff",
                  }}
                >
                  {isValidHex(hex) ? hex.toUpperCase() : DEFAULT_HEX.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cp-hex">HEX</Label>
              <div className="flex gap-2">
                <Input
                  id="cp-hex"
                  value={hex}
                  onChange={onHexInput}
                  onBlur={onHexBlur}
                  placeholder="#2563eb"
                  spellCheck={false}
                  className="font-mono"
                />
                <CopyButton value={isValidHex(hex) ? hex : ""} size="default" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cp-rgb">RGB</Label>
              <div className="flex gap-2">
                <Input
                  id="cp-rgb"
                  value={rgbText}
                  onChange={onRgbInput}
                  onBlur={onRgbBlur}
                  placeholder="rgb(37, 99, 235)"
                  spellCheck={false}
                  className="font-mono"
                />
                <CopyButton value={rgbText} size="default" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cp-hsl">HSL</Label>
              <div className="flex gap-2">
                <Input
                  id="cp-hsl"
                  value={hslText}
                  onChange={onHslInput}
                  onBlur={onHslBlur}
                  placeholder="hsl(221, 83%, 53%)"
                  spellCheck={false}
                  className="font-mono"
                />
                <CopyButton value={hslText} size="default" />
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          {/* Contrast + preview */}
          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <h3 className="text-sm font-semibold">Contrast against</h3>

            <ContrastRow
              label="On white"
              bg="#ffffff"
              fg={isValidHex(hex) ? hex : DEFAULT_HEX}
              ratio={onWhite}
              sampleText="Aa"
            />
            <ContrastRow
              label="On black"
              bg="#000000"
              fg={isValidHex(hex) ? hex : DEFAULT_HEX}
              ratio={onBlack}
              sampleText="Aa"
            />

            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold">Live preview</h3>
              <div
                className="flex h-24 items-center justify-center rounded-lg border text-2xl font-bold"
                style={{
                  backgroundColor: isValidHex(hex) ? hex : DEFAULT_HEX,
                  color: onWhite >= onBlack ? "#000" : "#fff",
                }}
              >
                The quick brown fox
              </div>
            </div>

            <div className="space-y-2 pt-1 text-xs text-muted-foreground">
              <p>
                Luminance: {relativeLuminance(rgb).toFixed(4)} · RGB({Math.round(rgb.r)},{" "}
                {Math.round(rgb.g)}, {Math.round(rgb.b)})
              </p>
              <p>Tap a swatch above to copy its value, or use Copy next to any field.</p>
            </div>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Pick a starting colour",
        description:
          "Click the colour square on the left to open the browser's native colour picker, or type a HEX, RGB or HSL value into the matching field.",
      },
      {
        title: "Edit any field",
        description:
          "Every field stays in sync. Type into RGB and HSL updates; type into HSL and HEX updates. Invalid input is highlighted and reverted on blur.",
      },
      {
        title: "Check contrast",
        description:
          "The right panel shows the WCAG contrast ratio of your colour against pure white and pure black, with a sample swatch.",
      },
      {
        title: "Copy any format",
        description:
          "Use the Copy button next to HEX, RGB or HSL to put the value on your clipboard in a single click.",
      },
    ],
    useCases: [
      "Grab a HEX value from a brand guideline to share with a designer.",
      "Convert a HEX colour to HSL so you can tweak lightness in a CSS variable.",
      "Check whether a chosen accent colour is readable on white before shipping.",
      "Sample a colour from a screenshot using the native picker to reuse in code.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The native picker does not support alpha — use solid HEX, RGB or HSL values only.</li>
        <li>HEX shorthand (#abc) is supported and normalised to #aabbcc on copy.</li>
        <li>Contrast ratios use the WCAG 2.1 sRGB formula and ignore gamma correction differences across displays.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my colour sent to a server?",
        a: "No. All conversion happens in your browser with simple math. Nothing is uploaded.",
      },
      {
        q: "Why does my HEX revert on blur?",
        a: "If the value is not a valid 3- or 6-digit hex colour, it cannot be parsed. The field reverts to the last valid colour and shows a toast.",
      },
      {
        q: "What is the difference between HSL and RGB?",
        a: "RGB mixes red, green and blue light. HSL describes the same colour as hue, saturation and lightness, which is usually more intuitive when you want to brighten or darken a shade.",
      },
      {
        q: "Does the picker support transparency?",
        a: "No — the native <input type=color> control is opaque. Use an RGBA / HSLA value directly in your CSS if you need alpha.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function ContrastRow({
  label,
  bg,
  fg,
  ratio,
  sampleText,
}: {
  label: string;
  bg: string;
  fg: string;
  ratio: number;
  sampleText: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
      <div
        className="flex h-12 w-12 flex-none items-center justify-center rounded-md text-xl font-bold"
        style={{ backgroundColor: bg, color: fg }}
        aria-hidden
      >
        {sampleText}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{fg}</p>
      </div>
      <span className="font-mono text-sm tabular-nums text-muted-foreground">
        {formatRatio(ratio)}
      </span>
    </div>
  );
}
