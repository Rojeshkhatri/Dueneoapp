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

interface ScaleStep {
  /** Offset from base, e.g. -2, -1, 0, 1, 2... */
  offset: number;
  /** Tailwind-style name: xs, sm, base, lg, xl, 2xl... */
  name: string;
  /** Pixel value (e.g. 16). */
  px: number;
  /** REM value (e.g. 1). */
  rem: number;
}

const RATIOS = [
  { value: "1.125", label: "1.125 — Minor third" },
  { value: "1.2", label: "1.2 — Major second" },
  { value: "1.25", label: "1.25 — Major third" },
  { value: "1.333", label: "1.333 — Perfect fourth" },
  { value: "1.5", label: "1.5 — Perfect fifth" },
  { value: "1.618", label: "1.618 — Golden ratio" },
];

const ABOVE_NAMES = ["lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl", "10xl"];
const BELOW_NAMES = ["sm", "xs", "2xs", "3xs", "4xs", "5xs", "6xs"];

function stepName(offset: number): string {
  if (offset === 0) return "base";
  if (offset > 0) {
    return ABOVE_NAMES[offset - 1] ?? `${offset}xl`;
  }
  return BELOW_NAMES[-offset - 1] ?? `${offset}xs`;
}

function buildScale(base: number, ratio: number, stepsAbove: number, stepsBelow: number): ScaleStep[] {
  const out: ScaleStep[] = [];
  for (let s = -stepsBelow; s <= stepsAbove; s++) {
    const px = base * Math.pow(ratio, s);
    out.push({
      offset: s,
      name: stepName(s),
      px,
      rem: px / 16,
    });
  }
  return out;
}

function roundPx(v: number): number {
  // 2 decimals, trim trailing zeros for display elsewhere.
  return Math.round(v * 100) / 100;
}

function formatRem(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  // Drop trailing zeros: 1.500 -> 1.5, 1.000 -> 1
  return String(r).replace(/\.?0+$/, "") || "0";
}

export function TypographyScaleGenerator({ tool }: { tool: ToolDefinition }) {
  const [base, setBase] = React.useState(16);
  const [ratio, setRatio] = React.useState("1.25");
  const [stepsAbove, setStepsAbove] = React.useState(6);
  const [stepsBelow, setStepsBelow] = React.useState(3);

  const ratioNum = React.useMemo(() => {
    const n = parseFloat(ratio);
    return Number.isFinite(n) && n > 1 ? n : 1.25;
  }, [ratio]);

  const scale = React.useMemo(
    () => buildScale(base, ratioNum, stepsAbove, stepsBelow),
    [base, ratioNum, stepsAbove, stepsBelow],
  );

  const reset = () => {
    setBase(16);
    setRatio("1.25");
    setStepsAbove(6);
    setStepsBelow(3);
    toast.info("Reset to defaults.");
  };

  // ── Output formats ────────────────────────────────────────────────────────
  const cssVars = React.useMemo(() => {
    const lines = [":root {"];
    for (const s of scale) {
      lines.push(`  --text-${s.name}: ${roundPx(s.px).toFixed(2).replace(/\.?0+$/, "")}px; /* ${formatRem(s.rem)}rem */`);
    }
    lines.push("}");
    return lines.join("\n");
  }, [scale]);

  const scssVars = React.useMemo(() => {
    const lines: string[] = [];
    for (const s of scale) {
      lines.push(`$text-${s.name}: ${roundPx(s.px).toFixed(2).replace(/\.?0+$/, "")}px; // ${formatRem(s.rem)}rem`);
    }
    return lines.join("\n");
  }, [scale]);

  const tailwindConfig = React.useMemo(() => {
    const entries = scale.map((s) => {
      const remStr = formatRem(s.rem);
      return `        "${s.name}": "${remStr}rem",`;
    });
    return [
      "// tailwind.config.js",
      "module.exports = {",
      "  theme: {",
      "    extend: {",
      "      fontSize: {",
      ...entries,
      "      },",
      "    },",
      "  },",
      "};",
    ].join("\n");
  }, [scale]);

  const content: ToolContent = {
    intro:
      "Generate a modular typography scale from a base font size and a ratio. Pick a classic ratio (minor third, perfect fourth, golden ratio…) and the number of steps above and below base — then copy the scale as CSS variables, a Tailwind config snippet or SCSS variables.",
    tool: (
      <div className="space-y-5">
        {/* Inputs */}
        <div className="rounded-xl border bg-card p-5">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="ts-base">Base size (px)</Label>
              <Input
                id="ts-base"
                type="number"
                min={8}
                max={48}
                value={base}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 8 && n <= 48) setBase(n);
                }}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">8–48 px</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ts-ratio">Scale ratio</Label>
              <Select value={ratio} onValueChange={setRatio}>
                <SelectTrigger id="ts-ratio" className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RATIOS.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="font-mono">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Multiplied at each step</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="ts-above">Steps above base</Label>
                <span className="font-mono text-xs">{stepsAbove}</span>
              </div>
              <Slider
                id="ts-above"
                value={[stepsAbove]}
                min={0}
                max={11}
                step={1}
                onValueChange={(v) => setStepsAbove(v[0] ?? 0)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="ts-below">Steps below base</Label>
                <span className="font-mono text-xs">{stepsBelow}</span>
              </div>
              <Slider
                id="ts-below"
                value={[stepsBelow]}
                min={0}
                max={7}
                step={1}
                onValueChange={(v) => setStepsBelow(v[0] ?? 0)}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Preview</h2>
          <div className="space-y-3">
            {scale.map((s) => (
              <div
                key={`${s.offset}-${s.name}`}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b pb-3 last:border-0 last:pb-0"
              >
                <div className="flex w-28 flex-none items-baseline gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase">
                    {s.name}
                  </span>
                </div>
                <div
                  className="flex-1 min-w-0 truncate font-semibold"
                  style={{ fontSize: `${s.px}px`, lineHeight: 1.15 }}
                  title={`${s.name}: ${roundPx(s.px)}px / ${formatRem(s.rem)}rem`}
                >
                  The quick brown fox
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {roundPx(s.px)}px · {formatRem(s.rem)}rem
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Output formats */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Output</h2>
          <Tabs defaultValue="css">
            <TabsList className="mb-3">
              <TabsTrigger value="css" className="text-xs">CSS variables</TabsTrigger>
              <TabsTrigger value="tailwind" className="text-xs">Tailwind config</TabsTrigger>
              <TabsTrigger value="scss" className="text-xs">SCSS variables</TabsTrigger>
            </TabsList>
            <TabsContent value="css" className="mt-0">
              <CodeBlock code={cssVars} />
              <div className="mt-3 flex justify-end">
                <CopyButton value={cssVars} label="Copy CSS" />
              </div>
            </TabsContent>
            <TabsContent value="tailwind" className="mt-0">
              <CodeBlock code={tailwindConfig} />
              <div className="mt-3 flex justify-end">
                <CopyButton value={tailwindConfig} label="Copy config" />
              </div>
            </TabsContent>
            <TabsContent value="scss" className="mt-0">
              <CodeBlock code={scssVars} />
              <div className="mt-3 flex justify-end">
                <CopyButton value={scssVars} label="Copy SCSS" />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Set the base size",
        description:
          "Enter your body text size in pixels (typically 16 px). The scale is anchored to this value as the `base` step.",
      },
      {
        title: "Choose a ratio",
        description:
          "Pick a classic typographic ratio. The minor third (1.125) gives subtle steps for UI, the golden ratio (1.618) gives dramatic display sizes.",
      },
      {
        title: "Choose steps above and below",
        description:
          "Use the sliders to set how many scale steps you want above and below base. Names follow the Tailwind convention (xs, sm, base, lg, xl, 2xl…).",
      },
      {
        title: "Copy in your favourite format",
        description:
          "Switch tabs to view the scale as CSS custom properties, a Tailwind config snippet or SCSS variables, then copy.",
      },
    ],
    useCases: [
      "Build a design-system type scale anchored to a single ratio.",
      "Generate consistent heading sizes (h1–h6) from one base value.",
      "Ship a Tailwind theme extension without hand-typing every size.",
      "Document a typography system with both px and rem values.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Line-heights are not generated — pair each size with an appropriate line-height for body vs. display usage.</li>
        <li>The scale is purely multiplicative; fluid typography (clamp) is not generated here.</li>
        <li>Names follow Tailwind convention and stop at 10xl/6xs; requesting more steps produces numeric fallbacks.</li>
      </ul>
    ),
    faq: [
      {
        q: "Which ratio should I pick?",
        a: "For UI work, 1.125 (minor third) or 1.2 (major second) give subtle, harmonious steps. For editorial sites, 1.25 or 1.333 work well. The golden ratio (1.618) is dramatic and best for marketing pages with big hero sizes.",
      },
      {
        q: "Why are values shown in both px and rem?",
        a: "Pixels are easy to reason about; rem respects the user’s root font size and is the better choice for accessibility. The Tailwind config output uses rem for that reason.",
      },
      {
        q: "Can I change the step names?",
        a: "Names follow the Tailwind convention automatically. If you need custom names, copy the CSS variables output and rename the custom properties.",
      },
      {
        q: "Does the preview use my font?",
        a: "It uses the page font (Inter). Metrics will vary slightly in your real font, but the relative scale is what matters.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
      <code>{code}</code>
    </pre>
  );
}
