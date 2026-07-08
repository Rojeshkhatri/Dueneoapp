"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { ArrowRightLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ToolDefinition } from "@/data/tools";

const COMMON_PX = [8, 12, 14, 16, 18, 20, 24, 32, 48, 64];

function round(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Number(value.toFixed(digits));
  // Strip trailing zeros for clean output.
  return String(rounded);
}

function parseNumber(s: string): number | null {
  const v = Number(s.trim());
  if (!Number.isFinite(v) || v < 0) return null;
  return v;
}

export function PxRemConverter({ tool }: { tool: ToolDefinition }) {
  const [rootSize, setRootSize] = React.useState(16);

  // Single-value converter state.
  const [pxValue, setPxValue] = React.useState("16");
  const [remValue, setRemValue] = React.useState("1");

  // Batch converter state.
  const [batchInput, setBatchInput] = React.useState("16\n24\n32px\n1.5rem\n2em");

  const root = Math.max(1, Number(rootSize) || 16);

  /* ────────────── Single-value: keep PX ↔ REM in sync ────────────── */

  const onPxChange = (v: string) => {
    setPxValue(v);
    const n = parseNumber(v);
    if (n === null) {
      setRemValue("");
      return;
    }
    setRemValue(round(n / root));
  };

  const onRemChange = (v: string) => {
    setRemValue(v);
    const n = parseNumber(v);
    if (n === null) {
      setPxValue("");
      return;
    }
    setPxValue(round(n * root));
  };

  const swap = () => {
    const px = pxValue;
    const rem = remValue;
    setPxValue(rem);
    setRemValue(px);
    toast.info("Swapped PX ↔ REM.");
  };

  /* ────────────────────── Batch conversion ────────────────────── */

  interface BatchRow {
    input: string;
    px: string;
    rem: string;
    em: string;
    valid: boolean;
  }

  const batchRows: BatchRow[] = React.useMemo(() => {
    const lines = batchInput.split(/\r?\n/);
    return lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return { input: line, px: "", rem: "", em: "", valid: false };
      }
      // Detect unit suffix.
      const m = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*(px|rem|em)?$/i);
      if (!m) {
        return { input: line, px: "—", rem: "—", em: "—", valid: false };
      }
      const num = Number(m[1]);
      const unit = (m[2] ?? "px").toLowerCase();
      let px: number;
      if (unit === "px") px = num;
      else if (unit === "rem") px = num * root;
      else if (unit === "em") px = num * root; // EM is contextual — assume root here.
      else px = num;
      const rem = px / root;
      return {
        input: line,
        px: round(px),
        rem: round(rem),
        em: round(rem),
        valid: true,
      };
    });
  }, [batchInput, root]);

  const reset = () => {
    setRootSize(16);
    setPxValue("16");
    setRemValue("1");
    setBatchInput("16\n24\n32px\n1.5rem\n2em");
    toast.info("Reset to defaults.");
  };

  const content: ToolContent = {
    intro:
      "Convert pixels to REM and EM units (and back) with a custom root font size. Includes a two-way single-value converter and a batch mode for pasting multiple values at once. All calculations happen in your browser.",
    tool: (
      <div className="space-y-5">
        {/* Root font size */}
        <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="prc-root">Root font size</Label>
            <div className="flex items-center gap-2">
              <Input
                id="prc-root"
                type="number"
                min={1}
                value={rootSize}
                onChange={(e) => setRootSize(Math.max(1, Number(e.target.value) || 1))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">px</span>
            </div>
          </div>
          <p className="pb-2 text-xs text-muted-foreground">
            The default browser root size is <code>16px</code>. Adjust to match your
            <code> html &#123; font-size: … &#125;</code> rule.
          </p>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        <Tabs defaultValue="single">
          <TabsList>
            <TabsTrigger value="single">Single value</TabsTrigger>
            <TabsTrigger value="batch">Batch</TabsTrigger>
            <TabsTrigger value="reference">Quick reference</TabsTrigger>
          </TabsList>

          {/* Single value ────────────────────────────────────────── */}
          <TabsContent value="single" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="prc-px">Pixels (px)</Label>
                <Input
                  id="prc-px"
                  value={pxValue}
                  onChange={(e) => onPxChange(e.target.value)}
                  inputMode="decimal"
                  className="font-mono text-base"
                  placeholder="16"
                  aria-label="Pixels value"
                />
              </div>

              <div className="flex justify-center pb-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={swap}
                  aria-label="Swap PX and REM"
                  title="Swap"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prc-rem">REM</Label>
                <Input
                  id="prc-rem"
                  value={remValue}
                  onChange={(e) => onRemChange(e.target.value)}
                  inputMode="decimal"
                  className="font-mono text-base"
                  placeholder="1"
                  aria-label="REM value"
                />
              </div>
            </div>

            {/* Live readouts */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-card p-3 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">PX</p>
                <p className="mt-1 text-lg font-semibold font-mono">
                  {parseNumber(pxValue) !== null ? round(parseNumber(pxValue) ?? 0, 2) : "—"}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">REM</p>
                <p className="mt-1 text-lg font-semibold font-mono">
                  {parseNumber(pxValue) !== null ? round((parseNumber(pxValue) ?? 0) / root, 4) : "—"}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">EM*</p>
                <p className="mt-1 text-lg font-semibold font-mono">
                  {parseNumber(pxValue) !== null ? round((parseNumber(pxValue) ?? 0) / root, 4) : "—"}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              * EM is contextual — it's relative to the parent element's font size. The EM value
              shown here assumes the parent's font size equals the root ({root}px), which is the
              common case for top-level typography.
            </p>
          </TabsContent>

          {/* Batch ───────────────────────────────────────────────── */}
          <TabsContent value="batch" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prc-batch">Input — one value per line</Label>
                <Textarea
                  id="prc-batch"
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  placeholder={"16\n24\n32px\n1.5rem"}
                  className="min-h-[260px] font-mono text-xs"
                  spellCheck={false}
                  aria-label="Batch input"
                />
                <p className="text-xs text-muted-foreground">
                  Bare numbers are treated as px. You can suffix with <code>px</code>,
                  <code> rem</code> or <code>em</code>.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prc-batch-out">Conversion results</Label>
                  <CopyButton
                    value={() =>
                      batchRows
                        .filter((r) => r.valid)
                        .map((r) => `${r.px}px\t${r.rem}rem\t${r.em}em`)
                        .join("\n")
                    }
                    size="sm"
                    label="Copy"
                  />
                </div>
                <div className="min-h-[260px] overflow-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                      <tr className="text-left">
                        <th className="px-2 py-1.5 font-medium">Input</th>
                        <th className="px-2 py-1.5 font-medium">PX</th>
                        <th className="px-2 py-1.5 font-medium">REM</th>
                        <th className="px-2 py-1.5 font-medium">EM*</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {batchRows.map((r, i) => (
                        <tr
                          key={i}
                          className={
                            "border-t " +
                            (r.valid
                              ? "bg-background"
                              : "bg-destructive/5 text-destructive")
                          }
                        >
                          <td className="px-2 py-1.5">
                            {r.input || <span className="text-muted-foreground">(blank)</span>}
                          </td>
                          <td className="px-2 py-1.5">{r.px}</td>
                          <td className="px-2 py-1.5">{r.rem}</td>
                          <td className="px-2 py-1.5">{r.em}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Quick reference ─────────────────────────────────────── */}
          <TabsContent value="reference" className="space-y-4">
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/80">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">PX</th>
                    <th className="px-3 py-2 font-medium">REM</th>
                    <th className="px-3 py-2 font-medium">EM*</th>
                    <th className="px-3 py-2 font-medium">Common use</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {COMMON_PX.map((px) => (
                    <tr key={px} className="border-t">
                      <td className="px-3 py-2 font-semibold">{px}px</td>
                      <td className="px-3 py-2">{round(px / root, 4)}rem</td>
                      <td className="px-3 py-2">{round(px / root, 4)}em</td>
                      <td className="px-3 py-2 font-sans text-muted-foreground">
                        {commonUseFor(px)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Values are computed for a root font size of <strong>{root}px</strong>. Change the
              root size at the top of the tool to recompute the entire table.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    ),
    howTo: [
      {
        title: "Set your root font size",
        description:
          "Enter your html element's font-size (default 16px). All conversions update against this value.",
      },
      {
        title: "Single value — two-way",
        description:
          "Type in either the PX or REM field — the other updates instantly. Use the swap button to flip values between fields. EM is shown as a read-only reference.",
      },
      {
        title: "Batch — paste many values",
        description:
          "Switch to the Batch tab and paste one value per line. Bare numbers are treated as px; suffix with px, rem or em to be explicit. Results appear in a sortable table.",
      },
      {
        title: "Quick reference — common sizes",
        description:
          "Switch to the Quick reference tab for a pre-computed table of 8, 12, 14, 16, 18, 20, 24, 32, 48 and 64 px — the sizes most commonly used in design systems.",
      },
    ],
    useCases: [
      "Convert a Figma pixel spec to REM units for an accessible, scalable stylesheet.",
      "Audit a CSS file to confirm type-scale values land on sensible REM increments.",
      "Quickly look up the REM equivalent of common pixel sizes (16, 24, 32) without breaking out a calculator.",
      "Migrate a legacy px-based stylesheet to REM units in bulk via the batch converter.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          EM is contextual — it's relative to the <em>parent</em> element's font size, not the
          root. This tool assumes the parent's font size equals the root, which is true for
          top-level typography but not for nested elements. Always verify EM values in context.
        </li>
        <li>
          The batch converter only accepts a single numeric value per line (optionally suffixed
          with <code>px</code>, <code>rem</code> or <code>em</code>). Compound values like
          <code> 16px 24px</code> are not supported.
        </li>
        <li>Root font sizes below 1px are clamped to 1px to avoid division-by-zero nonsense.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why does the EM column equal the REM column?",
        a: "EM is relative to the parent element's font size, while REM is relative to the root. When the parent's font size equals the root (the common top-level case), EM and REM are identical. The tool assumes this case — for nested elements, compute EM manually against the parent's actual font size.",
      },
      {
        q: "What root size should I use?",
        a: "16px is the browser default and the most common choice. If your design system sets html { font-size: 10px } (for easy math), use 10. If you're using Tailwind's default, it's 16px.",
      },
      {
        q: "Is my input sent to a server?",
        a: "No. All conversion math runs in your browser. Nothing is uploaded.",
      },
      {
        q: "Why use REM instead of PX?",
        a: "REM scales with the user's browser font-size setting, so your design respects their accessibility preference. PX does not. Most modern design systems express type, spacing and breakpoints in REM (or a unit that maps to REM).",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function commonUseFor(px: number): string {
  const map: Record<number, string> = {
    8: "Tiny spacing, icon padding",
    12: "Compact UI padding, small chips",
    14: "Small text, secondary labels",
    16: "Body text, default base size",
    18: "Subheadings, lead paragraphs",
    20: "H4 / H5 headings",
    24: "H3 headings, card padding",
    32: "H2 headings, section spacing",
    48: "H1 hero text, large gaps",
    64: "Page section dividers, hero spacing",
  };
  return map[px] ?? "—";
}
