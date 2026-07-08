"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  hexToRgb,
  rgbToHex,
  isValidHex,
  normaliseHex,
  contrastRatio,
  formatRatio,
  readableTextOn,
} from "./_color-helpers";
import {
  CVD_DEFS,
  simulateCvd,
  evaluateWcag,
  type CvdType,
} from "./_accessibility-helpers";

interface PaletteItem {
  id: string;
  hex: string;
  label: string;
}

const DEFAULT_PALETTE: PaletteItem[] = [
  { id: "p1", hex: "#2563eb", label: "Primary" },
  { id: "p2", hex: "#16a34a", label: "Success" },
  { id: "p3", hex: "#dc2626", label: "Danger" },
  { id: "p4", hex: "#f59e0b", label: "Warning" },
  { id: "p5", hex: "#0f172a", label: "Ink" },
  { id: "p6", hex: "#f8fafc", label: "Paper" },
];

const newId = () => Math.random().toString(36).slice(2, 10);

export function ColorAccessibilityTester({ tool }: { tool: ToolDefinition }) {
  const [palette, setPalette] = React.useState<PaletteItem[]>(DEFAULT_PALETTE);
  const [view, setView] = React.useState<CvdType | "original">("original");

  const safePalette = React.useMemo(
    () =>
      palette.map((p) => ({
        ...p,
        hex: isValidHex(p.hex) ? normaliseHex(p.hex) : "#000000",
      })),
    [palette],
  );

  const addColour = () => {
    setPalette((prev) => [
      ...prev,
      { id: newId(), hex: "#64748b", label: `Colour ${prev.length + 1}` },
    ]);
  };

  const removeColour = (id: string) => {
    setPalette((prev) => (prev.length <= 2 ? prev : prev.filter((p) => p.id !== id)));
  };

  const updateColour = (id: string, patch: Partial<PaletteItem>) => {
    setPalette((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const reset = () => {
    setPalette(DEFAULT_PALETTE);
    setView("original");
    toast.info("Reset to defaults.");
  };

  // Active simulation matrix (if any).
  const activeDef =
    view === "original" ? null : CVD_DEFS.find((d) => d.id === view) ?? null;

  const simulatedPalette = React.useMemo(() => {
    if (!activeDef) return safePalette;
    return safePalette.map((p) => {
      const sim = simulateCvd(hexToRgb(p.hex), activeDef);
      return { ...p, hex: rgbToHex(sim) };
    });
  }, [safePalette, activeDef]);

  // Pairwise contrast matrix (computed on the ORIGINAL palette, not simulated,
  // because accessibility compliance is measured on the real colours).
  const pairs = React.useMemo(() => {
    const out: { i: number; j: number; ratio: number; wcag: ReturnType<typeof evaluateWcag> }[] = [];
    for (let i = 0; i < safePalette.length; i++) {
      for (let j = i + 1; j < safePalette.length; j++) {
        const ratio = contrastRatio(
          hexToRgb(safePalette[i].hex),
          hexToRgb(safePalette[j].hex),
        );
        out.push({ i, j, ratio, wcag: evaluateWcag(ratio) });
      }
    }
    return out;
  }, [safePalette]);

  const matrixReport = React.useMemo(() => {
    const lines: string[] = ["Color Accessibility Tester — contrast matrix", ""];
    for (const p of pairs) {
      const a = safePalette[p.i];
      const b = safePalette[p.j];
      lines.push(
        `${a.label} (${a.hex}) vs ${b.label} (${b.hex}): ${formatRatio(p.ratio)} — ${p.wcag.bestLabel}`,
      );
    }
    return lines.join("\n");
  }, [pairs, safePalette]);

  const content: ToolContent = {
    intro:
      "Add a palette of colours, then preview exactly how they appear to users with protanopia, deuteranopia, tritanopia and achromatopsia. A live contrast matrix shows every colour pair with WCAG AA/AAA pass/fail badges.",
    tool: (
      <div className="space-y-5">
        {/* Palette editor */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Palette</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addColour}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add colour
              </Button>
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
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
                      value={p.hex}
                      onChange={(e) => updateColour(p.id, { hex: e.target.value })}
                      onBlur={() => {
                        if (!isValidHex(p.hex)) {
                          toast.error(`Invalid hex for ${p.label || `colour ${idx + 1}`}.`);
                          updateColour(p.id, { hex: "#000000" });
                        }
                      }}
                      className="h-8 font-mono text-xs"
                      spellCheck={false}
                    />
                    <Input
                      value={p.label}
                      onChange={(e) => updateColour(p.id, { label: e.target.value })}
                      className="h-7 text-xs"
                      placeholder="Label"
                      aria-label="Colour label"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeColour(p.id)}
                    disabled={palette.length <= 2}
                    aria-label="Remove colour"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Simulation tabs */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Simulation</h2>
            <Tabs value={view} onValueChange={(v) => setView(v as CvdType | "original")}>
              <TabsList className="flex flex-wrap h-auto p-1">
                <TabsTrigger value="original" className="text-xs">Original</TabsTrigger>
                {CVD_DEFS.map((d) => (
                  <TabsTrigger key={d.id} value={d.id} className="text-xs">
                    {d.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {activeDef && (
            <p className="mb-3 text-xs text-muted-foreground">{activeDef.description}</p>
          )}

          {/* Palette swatches rendered for current view */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {simulatedPalette.map((p, i) => {
              const fg = readableTextOn(hexToRgb(p.hex));
              return (
                <div
                  key={`sim-${p.id}-${i}`}
                  className="overflow-hidden rounded-lg border"
                  title={`${p.label} — ${p.hex}`}
                >
                  <div
                    className="flex h-20 items-end px-3 py-2"
                    style={{ backgroundColor: p.hex, color: fg }}
                  >
                    <span className="text-xs font-medium opacity-90">{p.label}</span>
                  </div>
                  <div className="bg-background px-3 py-1.5 font-mono text-[11px] uppercase">
                    {p.hex}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Side-by-side comparison strip for all conditions */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[520px] border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th className="w-28 border-b bg-muted/40 px-2 py-2 text-left font-medium">
                    Condition
                  </th>
                  {safePalette.map((p) => (
                    <th
                      key={`th-${p.id}`}
                      className="border-b bg-muted/40 px-2 py-2 text-left font-medium"
                    >
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-b px-2 py-1.5 font-medium">Original</td>
                  {safePalette.map((p) => (
                    <td key={`orig-${p.id}`} className="border-b p-0">
                      <div
                        className="h-9 w-full"
                        style={{ backgroundColor: p.hex }}
                        title={p.hex}
                      />
                    </td>
                  ))}
                </tr>
                {CVD_DEFS.map((d) => (
                  <tr key={d.id}>
                    <td className="border-b px-2 py-1.5 font-medium">{d.label}</td>
                    {safePalette.map((p) => {
                      const sim = rgbToHex(simulateCvd(hexToRgb(p.hex), d));
                      return (
                        <td key={`${d.id}-${p.id}`} className="border-b p-0">
                          <div
                            className="h-9 w-full"
                            style={{ backgroundColor: sim }}
                            title={sim}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Contrast matrix */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Contrast matrix (WCAG 2.1)</h2>
            <CopyButton value={matrixReport} label="Copy report" size="sm" />
          </div>

          {safePalette.length >= 2 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-separate border-spacing-0 text-xs">
                  <thead>
                    <tr>
                      <th className="border-b bg-muted/40 px-2 py-2 text-left font-medium">
                        Pair
                      </th>
                      <th className="border-b bg-muted/40 px-2 py-2 text-left font-medium">
                        Swatch
                      </th>
                      <th className="border-b bg-muted/40 px-2 py-2 text-right font-medium">
                        Ratio
                      </th>
                      <th className="border-b bg-muted/40 px-2 py-2 text-center font-medium">
                        AA
                      </th>
                      <th className="border-b bg-muted/40 px-2 py-2 text-center font-medium">
                        AA Large
                      </th>
                      <th className="border-b bg-muted/40 px-2 py-2 text-center font-medium">
                        AAA
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pairs.map((p) => {
                      const a = safePalette[p.i];
                      const b = safePalette[p.j];
                      return (
                        <tr key={`${p.i}-${p.j}`}>
                          <td className="border-b px-2 py-1.5">
                            {a.label} / {b.label}
                          </td>
                          <td className="border-b px-2 py-1.5">
                            <div className="flex h-6 overflow-hidden rounded border">
                              <div className="flex-1" style={{ backgroundColor: a.hex }} />
                              <div className="flex-1" style={{ backgroundColor: b.hex }} />
                            </div>
                          </td>
                          <td className="border-b px-2 py-1.5 text-right font-mono">
                            {formatRatio(p.ratio)}
                          </td>
                          <td className="border-b px-2 py-1.5 text-center">
                            <PassBadge pass={p.wcag.aaNormal} />
                          </td>
                          <td className="border-b px-2 py-1.5 text-center">
                            <PassBadge pass={p.wcag.aaLarge} />
                          </td>
                          <td className="border-b px-2 py-1.5 text-center">
                            <PassBadge pass={p.wcag.aaaNormal} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Thresholds: AA normal text ≥ 4.5:1 · AA large text (≥ 18 pt or 14 pt bold) ≥ 3:1 · AAA normal text ≥ 7:1.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Add at least two colours to see the matrix.</p>
          )}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Build your palette",
        description:
          "Click “Add colour” to add as many colours as you need. Use the colour square or type a HEX value, and give each colour a label like Primary, Success, Danger.",
      },
      {
        title: "Simulate colour-blindness",
        description:
          "Switch the simulation tabs to preview the palette as a protanope, deuteranope, tritanope or achromatope would see it. The comparison table shows every condition side-by-side.",
      },
      {
        title: "Read the contrast matrix",
        description:
          "The matrix lists every colour pair, the WCAG contrast ratio and pass/fail badges for AA normal, AA large and AAA normal text.",
      },
      {
        title: "Copy the report",
        description:
          "Use “Copy report” to copy a plain-text summary of every pair and its verdict — handy for pasting into a PR or design review.",
      },
    ],
    useCases: [
      "Check whether a data-visualisation palette is still distinguishable to colour-blind users.",
      "Verify text/background contrast for AA and AAA WCAG compliance.",
      "Pick accessible semantic colours (success, warning, danger, info) for a design system.",
      "Audit an existing brand palette for accessibility gaps before a redesign.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Simulation matrices are the standard Vienot/Brettel approximations — they approximate, not perfectly match, each condition.</li>
        <li>Anomalous trichromacy (e.g. deuteranomaly) is a milder form and is not modelled separately.</li>
        <li>The contrast matrix uses the original palette, not the simulated one — WCAG compliance is always measured on real colours.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why does the matrix stay the same when I switch simulations?",
        a: "WCAG contrast is measured on the real colours that ship to users. Simulations only help you spot visual confusion (two colours that look identical to a colour-blind user); they don’t change the formal contrast verdict.",
      },
      {
        q: "What do AA and AAA mean?",
        a: "They are WCAG 2.1 conformance levels. AA requires 4.5:1 for normal text and 3:1 for large text. AAA is stricter: 7:1 for normal text and 4.5:1 for large text.",
      },
      {
        q: "Is the achromatopsia simulation just greyscale?",
        a: "Yes — achromatopsia (complete colour blindness) collapses all hues to a luminance value, so the simulation renders each colour as a grey of equivalent luminance.",
      },
      {
        q: "How many colours can I add?",
        a: "As many as you like. The contrast matrix grows quadratically (n × (n−1) / 2 pairs), so very large palettes become hard to scan — keep it under ~12 colours.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function PassBadge({ pass }: { pass: boolean }) {
  return (
    <span
      className={
        pass
          ? "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 bg-emerald-500/10"
          : "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-rose-700 bg-rose-500/10"
      }
    >
      {pass ? "Pass" : "Fail"}
    </span>
  );
}
