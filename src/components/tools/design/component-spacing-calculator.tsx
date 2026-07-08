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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

// Standard Tailwind-style spacing multipliers — the canonical scale that
// starts 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16,
// 20, 24, 32, …
const TAILWIND_MULTIPLIERS = [
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96,
];

interface SpacingStep {
  name: string;
  multiplier: number;
  px: number;
}

function buildScale(base: number, count: number): SpacingStep[] {
  return TAILWIND_MULTIPLIERS.slice(0, Math.max(1, count)).map((m) => ({
    name: String(m),
    multiplier: m,
    px: m * base,
  }));
}

function formatPx(v: number): string {
  // 0.5 * 4 = 2 → "2px"; 1.5 * 4 = 6 → "6px"; 2.5 * 8 = 20 → "20px"
  const r = Math.round(v * 100) / 100;
  return `${String(r).replace(/\.?0+$/, "")}px`;
}

export function ComponentSpacingCalculator({ tool }: { tool: ToolDefinition }) {
  const [base, setBase] = React.useState<4 | 8>(4);
  const [steps, setSteps] = React.useState(8);

  const scale = React.useMemo(() => buildScale(base, steps), [base, steps]);

  const reset = () => {
    setBase(4);
    setSteps(8);
    toast.info("Reset to defaults.");
  };

  // ── Outputs ───────────────────────────────────────────────────────────────
  const cssVars = React.useMemo(() => {
    const lines = [":root {"];
    for (const s of scale) {
      lines.push(`  --space-${s.name}: ${formatPx(s.px)};`);
    }
    lines.push("}");
    return lines.join("\n");
  }, [scale]);

  const tailwindConfig = React.useMemo(() => {
    const entries = scale.map((s) => `        "${s.name}": "${formatPx(s.px)}",`);
    return [
      "// tailwind.config.js",
      "module.exports = {",
      "  theme: {",
      "    extend: {",
      "      spacing: {",
      ...entries,
      "      },",
      "    },",
      "  },",
      "};",
    ].join("\n");
  }, [scale]);

  const content: ToolContent = {
    intro:
      "Generate a consistent spacing system from a 4 px or 8 px base. The tool follows the Tailwind-style multiplier scale (0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 32…) so the names map cleanly to Tailwind utilities. Each step is shown as a visual swatch and can be copied as CSS variables or a Tailwind config snippet.",
    tool: (
      <div className="space-y-5">
        {/* Inputs */}
        <div className="rounded-xl border bg-card p-5">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cs-base">Base unit</Label>
              <Select
                value={String(base)}
                onValueChange={(v) => setBase(Number(v) as 4 | 8)}
              >
                <SelectTrigger id="cs-base" className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4" className="font-mono">4 px (Tailwind default)</SelectItem>
                  <SelectItem value="8" className="font-mono">8 px (Material / iOS)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">The atomic unit of your spacing system.</p>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="cs-steps">Number of steps</Label>
                <span className="font-mono text-xs">{steps}</span>
              </div>
              <Slider
                id="cs-steps"
                value={[steps]}
                min={1}
                max={TAILWIND_MULTIPLIERS.length}
                step={1}
                onValueChange={(v) => setSteps(v[0] ?? 8)}
              />
              <p className="text-[11px] text-muted-foreground">
                Max {TAILWIND_MULTIPLIERS.length} steps following the Tailwind multiplier scale.
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        {/* Swatches */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Scale</h2>
          <div className="space-y-2">
            {scale.map((s) => (
              <div
                key={s.name}
                className="flex flex-wrap items-center gap-3 border-b pb-2 last:border-0 last:pb-0"
              >
                <div className="flex w-16 flex-none items-baseline gap-1">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                    {s.name}
                  </span>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <div
                    className="h-6 bg-primary"
                    style={{ width: `${Math.min(s.px, 320)}px` }}
                    title={`${s.name} = ${formatPx(s.px)}`}
                  />
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {formatPx(s.px)}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Swatch width is capped at 320 px for readability. The actual token values are not capped.
          </p>
        </div>

        {/* Output */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Output</h2>
          <Tabs defaultValue="css">
            <TabsList className="mb-3">
              <TabsTrigger value="css" className="text-xs">CSS variables</TabsTrigger>
              <TabsTrigger value="tailwind" className="text-xs">Tailwind config</TabsTrigger>
            </TabsList>
            <TabsContent value="css" className="mt-0">
              <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
                <code>{cssVars}</code>
              </pre>
              <div className="mt-3 flex justify-end">
                <CopyButton value={cssVars} label="Copy CSS" />
              </div>
            </TabsContent>
            <TabsContent value="tailwind" className="mt-0">
              <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
                <code>{tailwindConfig}</code>
              </pre>
              <div className="mt-3 flex justify-end">
                <CopyButton value={tailwindConfig} label="Copy config" />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Pick a base unit",
        description:
          "Choose 4 px (Tailwind default, finer-grained) or 8 px (Material / iOS, fewer steps but bigger jumps).",
      },
      {
        title: "Set the number of steps",
        description:
          "Use the slider to grow or shrink the scale. Names follow the Tailwind multiplier set: 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8…",
      },
      {
        title: "Read the swatches",
        description:
          "Each step shows its name, a visual width swatch (capped at 320 px for readability) and the px value.",
      },
      {
        title: "Copy in your format",
        description:
          "Switch tabs to copy the scale as CSS custom properties or a Tailwind config snippet.",
      },
    ],
    useCases: [
      "Set up a consistent 4 px or 8 px spacing system for a design system.",
      "Document spacing tokens for engineers in CSS or Tailwind form.",
      "Migrate a Figma spacing scale to a Tailwind theme extension.",
      "Audit an existing spacing scale for redundant or off-system values.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The multiplier set follows Tailwind’s standard spacing scale — custom multipliers aren’t supported.</li>
        <li>Swatch widths are capped at 320 px so very large steps still fit on screen; the actual token values are not capped.</li>
        <li>The tool generates spacing tokens only; layout primitives like gaps, paddings and margins are up to your design system.</li>
      </ul>
    ),
    faq: [
      {
        q: "Should I use 4 px or 8 px as the base?",
        a: "4 px gives finer-grained control (matches Tailwind, allows 0.5 steps like 2 px). 8 px gives bigger jumps and fewer tokens to reason about (matches Material and iOS). Pick one and stick to it across your system.",
      },
      {
        q: "Why are some names like 0.5 and 1.5?",
        a: "They follow Tailwind’s naming convention, where the name is the multiplier applied to your base unit. So with a 4 px base, `2.5` is 10 px; with an 8 px base, `1.5` is 12 px.",
      },
      {
        q: "How many steps do I need?",
        a: "Eight steps (the default) covers most UI: 0, 1, 2, 3, 4, 5, 6, 8 (in 4 px units, 0–32 px). Larger apps typically need 16+ steps to cover page-level layout.",
      },
      {
        q: "Can I use this with a non-Tailwind setup?",
        a: "Yes — the CSS variables output works in any project. The Tailwind config tab is only relevant if you’re using Tailwind.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
