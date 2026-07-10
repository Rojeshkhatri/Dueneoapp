"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { isValidHex, normaliseHex } from "./_color-helpers";

interface PaletteItem {
  id: string;
  name: string;
  hex: string;
}

const DEFAULT_PALETTE: PaletteItem[] = [
  { id: "p1", name: "primary", hex: "#2563eb" },
  { id: "p2", name: "secondary", hex: "#64748b" },
  { id: "p3", name: "success", hex: "#16a34a" },
  { id: "p4", name: "warning", hex: "#f59e0b" },
  { id: "p5", name: "danger", hex: "#dc2626" },
  { id: "p6", name: "background", hex: "#f8fafc" },
  { id: "p7", name: "foreground", hex: "#0f172a" },
];

const RATIOS = ["1.125", "1.2", "1.25", "1.333", "1.5", "1.618"];
const ABOVE_NAMES = ["lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl", "10xl"];
const BELOW_NAMES = ["sm", "xs", "2xs", "3xs", "4xs", "5xs", "6xs"];

function stepName(offset: number): string {
  if (offset === 0) return "base";
  if (offset > 0) return ABOVE_NAMES[offset - 1] ?? `${offset}xl`;
  return BELOW_NAMES[-offset - 1] ?? `${offset}xs`;
}

function buildTypeScale(base: number, ratio: number, above: number, below: number) {
  const out: { name: string; px: number; rem: number }[] = [];
  for (let s = -below; s <= above; s++) {
    const px = base * Math.pow(ratio, s);
    out.push({ name: stepName(s), px, rem: px / 16 });
  }
  return out;
}

function roundPx(v: number): string {
  return String(Math.round(v * 100) / 100).replace(/\.?0+$/, "");
}

function formatRem(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  return String(r).replace(/\.?0+$/, "") || "0";
}

// Standard Tailwind-style spacing multipliers (0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96)
const SPACING_MULTIPLIERS = [
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96,
];

function spacingName(m: number): string {
  // Tailwind uses "0", "0.5", "1", "1.5", "2", "2.5"… We mirror that.
  return String(m);
}

const newId = () => Math.random().toString(36).slice(2, 10);

export function DesignTokenGenerator({ tool }: { tool: ToolDefinition }) {
  const [palette, setPalette] = React.useState<PaletteItem[]>(DEFAULT_PALETTE);
  const [baseSize, setBaseSize] = React.useState(16);
  const [ratio, setRatio] = React.useState("1.25");
  const [stepsAbove, setStepsAbove] = React.useState(5);
  const [stepsBelow, setStepsBelow] = React.useState(2);
  const [spacingBase, setSpacingBase] = React.useState<4 | 8>(4);
  const [spacingSteps, setSpacingSteps] = React.useState(16);

  const ratioNum = React.useMemo(() => {
    const n = parseFloat(ratio);
    return Number.isFinite(n) && n > 1 ? n : 1.25;
  }, [ratio]);

  const safePalette = React.useMemo(
    () =>
      palette.map((p) => ({
        ...p,
        hex: isValidHex(p.hex) ? normaliseHex(p.hex) : "#000000",
        name: p.name.trim() || `colour${p.id}`,
      })),
    [palette],
  );

  const typeScale = React.useMemo(
    () => buildTypeScale(baseSize, ratioNum, stepsAbove, stepsBelow),
    [baseSize, ratioNum, stepsAbove, stepsBelow],
  );

  const spacingScale = React.useMemo(() => {
    const slice = SPACING_MULTIPLIERS.slice(0, Math.max(1, spacingSteps));
    return slice.map((m) => ({
      name: spacingName(m),
      px: m * spacingBase,
    }));
  }, [spacingBase, spacingSteps]);

  // ── Palette editors ──────────────────────────────────────────────────────
  const addColour = () => {
    setPalette((prev) => [
      ...prev,
      { id: newId(), name: `colour${prev.length + 1}`, hex: "#94a3b8" },
    ]);
  };
  const removeColour = (id: string) => {
    setPalette((prev) => prev.filter((p) => p.id !== id));
  };
  const updateColour = (id: string, patch: Partial<PaletteItem>) => {
    setPalette((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const reset = () => {
    setPalette(DEFAULT_PALETTE);
    setBaseSize(16);
    setRatio("1.25");
    setStepsAbove(5);
    setStepsBelow(2);
    setSpacingBase(4);
    setSpacingSteps(16);
    toast.info("Reset to defaults.");
  };

  // ── Output formats ────────────────────────────────────────────────────────
  const cssOutput = React.useMemo(() => {
    const lines: string[] = [":root {"];
    lines.push("  /* Colours */");
    for (const p of safePalette) {
      lines.push(`  --color-${p.name}: ${p.hex};`);
    }
    lines.push("");
    lines.push("  /* Typography */");
    for (const t of typeScale) {
      lines.push(`  --text-${t.name}: ${roundPx(t.px)}px; /* ${formatRem(t.rem)}rem */`);
    }
    lines.push("");
    lines.push("  /* Spacing */");
    for (const s of spacingScale) {
      lines.push(`  --space-${s.name}: ${roundPx(s.px)}px;`);
    }
    lines.push("}");
    return lines.join("\n");
  }, [safePalette, typeScale, spacingScale]);

  const tailwindOutput = React.useMemo(() => {
    const colors = safePalette
      .map((p) => `        "${p.name}": "${p.hex}",`)
      .join("\n");
    const fontSize = typeScale
      .map((t) => `        "${t.name}": "${formatRem(t.rem)}rem",`)
      .join("\n");
    const spacing = spacingScale
      .map((s) => `        "${s.name}": "${roundPx(s.px)}px",`)
      .join("\n");
    return [
      "// tailwind.config.js",
      "module.exports = {",
      "  theme: {",
      "    extend: {",
      "      colors: {",
      colors,
      "      },",
      "      fontSize: {",
      fontSize,
      "      },",
      "      spacing: {",
      spacing,
      "      },",
      "    },",
      "  },",
      "};",
    ].join("\n");
  }, [safePalette, typeScale, spacingScale]);

  const jsonOutput = React.useMemo(() => {
    return JSON.stringify(
      {
        color: Object.fromEntries(safePalette.map((p) => [p.name, p.hex])),
        fontSize: Object.fromEntries(
          typeScale.map((t) => [t.name, { px: t.px, rem: t.rem }]),
        ),
        spacing: Object.fromEntries(
          spacingScale.map((s) => [s.name, { px: s.px }]),
        ),
      },
      null,
      2,
    );
  }, [safePalette, typeScale, spacingScale]);

  const content: ToolContent = {
    intro:
      "Configure a colour palette, a modular type scale and a spacing system in one place. The tool emits design tokens as CSS custom properties, a Tailwind config snippet or a JSON file — copy whichever format your stack expects.",
    tool: (
      <div className="space-y-5">
        {/* Colour palette editor */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Colour palette</h2>
            <Button size="sm" variant="outline" onClick={addColour}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add colour
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {palette.map((p, idx) => {
              const safe = isValidHex(p.hex) ? normaliseHex(p.hex) : "#000000";
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg border bg-background p-2"
                >
                  <input
                    type="color"
                    value={safe}
                    onChange={(e) => updateColour(p.id, { hex: e.target.value })}
                    aria-label={`Colour ${idx + 1} picker`}
                    className="h-9 w-9 cursor-pointer rounded border bg-background p-0.5"
                  />
                  <div className="flex-1 space-y-1">
                    <Input
                      value={p.name}
                      onChange={(e) =>
                        updateColour(p.id, { name: e.target.value.replace(/[^a-zA-Z0-9-_]/g, "") })
                      }
                      className="h-7 text-xs"
                      placeholder="name"
                      spellCheck={false}
                      aria-label="Colour name"
                    />
                    <Input
                      value={p.hex}
                      onChange={(e) => updateColour(p.id, { hex: e.target.value })}
                      onBlur={() => {
                        if (!isValidHex(p.hex)) {
                          toast.error(`Invalid hex for ${p.name || `colour ${idx + 1}`}.`);
                          updateColour(p.id, { hex: "#000000" });
                        }
                      }}
                      className="h-7 font-mono text-xs"
                      spellCheck={false}
                      aria-label="Colour hex value"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeColour(p.id)}
                    aria-label="Remove colour"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Typography */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Typography scale</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="dt-base">Base size (px)</Label>
              <Input
                id="dt-base"
                type="number"
                min={8}
                max={48}
                value={baseSize}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 8 && n <= 48) setBaseSize(n);
                }}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dt-ratio">Ratio</Label>
              <Select value={ratio} onValueChange={setRatio}>
                <SelectTrigger id="dt-ratio" className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RATIOS.map((r) => (
                    <SelectItem key={r} value={r} className="font-mono">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dt-above">Steps above</Label>
              <Input
                id="dt-above"
                type="number"
                min={0}
                max={11}
                value={stepsAbove}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) setStepsAbove(Math.max(0, Math.min(11, n)));
                }}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dt-below">Steps below</Label>
              <Input
                id="dt-below"
                type="number"
                min={0}
                max={7}
                value={stepsBelow}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) setStepsBelow(Math.max(0, Math.min(7, n)));
                }}
                className="font-mono"
              />
            </div>
          </div>
        </div>

        {/* Spacing */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Spacing system</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dt-spacing-base">Base unit</Label>
              <Select
                value={String(spacingBase)}
                onValueChange={(v) => setSpacingBase(Number(v) as 4 | 8)}
              >
                <SelectTrigger id="dt-spacing-base" className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4" className="font-mono">4 px</SelectItem>
                  <SelectItem value="8" className="font-mono">8 px</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dt-spacing-steps">Number of steps</Label>
              <Input
                id="dt-spacing-steps"
                type="number"
                min={1}
                max={SPACING_MULTIPLIERS.length}
                value={spacingSteps}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) {
                    setSpacingSteps(
                      Math.max(1, Math.min(SPACING_MULTIPLIERS.length, n)),
                    );
                  }
                }}
                className="font-mono"
              />
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Tokens</h2>
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset all
            </Button>
          </div>
          <Tabs defaultValue="css">
            <TabsList className="mb-3">
              <TabsTrigger value="css" className="text-xs">CSS custom properties</TabsTrigger>
              <TabsTrigger value="tailwind" className="text-xs">Tailwind config</TabsTrigger>
              <TabsTrigger value="json" className="text-xs">JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="css" className="mt-0">
              <CodeBlock code={cssOutput} />
              <div className="mt-3 flex justify-end">
                <CopyButton value={cssOutput} label="Copy CSS" />
              </div>
            </TabsContent>
            <TabsContent value="tailwind" className="mt-0">
              <CodeBlock code={tailwindOutput} />
              <div className="mt-3 flex justify-end">
                <CopyButton value={tailwindOutput} label="Copy config" />
              </div>
            </TabsContent>
            <TabsContent value="json" className="mt-0">
              <CodeBlock code={jsonOutput} />
              <div className="mt-3 flex justify-end">
                <CopyButton value={jsonOutput} label="Copy JSON" />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Add your colours",
        description:
          "Use the colour squares and name fields to build a semantic palette (primary, success, danger…). Names are slugified for use as CSS variable and Tailwind keys.",
      },
      {
        title: "Configure typography",
        description:
          "Set the base size, ratio and number of steps above/below base. Names follow the Tailwind convention (xs, sm, base, lg, xl, 2xl…).",
      },
      {
        title: "Configure spacing",
        description:
          "Choose a 4 px or 8 px base and how many steps you want. The Tailwind-style multipliers (0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8…) are applied to your base unit.",
      },
      {
        title: "Copy in your format",
        description:
          "Switch tabs between CSS custom properties, Tailwind config and JSON. Each is ready to paste directly into your project.",
      },
    ],
    useCases: [
      "Bootstrap a new design system from a single source of truth.",
      "Hand off design tokens to engineers in CSS, Tailwind or JSON form.",
      "Document your colour, type and spacing decisions in one tool.",
      "Migrate a Figma palette to a Tailwind theme extension.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Only solid colours are supported — gradients and alpha colours are not generated.</li>
        <li>Typography tokens do not include line-heights or letter-spacing; pair them manually in your design system.</li>
        <li>Spacing uses Tailwind’s standard multiplier set; custom multipliers aren’t supported.</li>
      </ul>
    ),
    faq: [
      {
        q: "What’s the difference between this and the Typography Scale Generator?",
        a: "The Typography Scale Generator focuses on type alone and offers a richer preview. This tool bundles colours, type and spacing into one set of tokens, ready to copy as CSS, Tailwind config or JSON.",
      },
      {
        q: "Can I edit colour names?",
        a: "Yes — names are slugified on the fly (only letters, numbers, hyphens and underscores). The same name is used as the CSS variable suffix, Tailwind key and JSON property name.",
      },
      {
        q: "Which spacing base should I pick?",
        a: "4 px is the most common base (matches Tailwind and Material). 8 px is the second most common (matches Bootstrap and iOS). Pick one and stick to it across your system.",
      },
      {
        q: "How do I use the Tailwind output?",
        a: "Paste it into your `tailwind.config.js` under `theme.extend`. The generated keys merge with Tailwind’s defaults, so your utility classes like `bg-primary` and `text-2xl` will use the new values.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
      <code>{code}</code>
    </pre>
  );
}
