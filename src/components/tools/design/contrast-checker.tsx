"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, ArrowLeftRight, Check, X } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  hexToRgb,
  isValidHex,
  contrastRatio,
  formatRatio,
} from "./_color-helpers";

const DEFAULT_FG = "#0f172a";
const DEFAULT_BG = "#f8fafc";

interface CheckResult {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
}

function evaluate(fg: string, bg: string): CheckResult | null {
  if (!isValidHex(fg) || !isValidHex(bg)) return null;
  const a = hexToRgb(fg);
  const b = hexToRgb(bg);
  const ratio = contrastRatio(a, b);
  return {
    ratio,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

export function ContrastChecker({ tool }: { tool: ToolDefinition }) {
  const [fg, setFg] = React.useState(DEFAULT_FG);
  const [bg, setBg] = React.useState(DEFAULT_BG);

  const result = evaluate(fg, bg);

  const swap = () => {
    setFg(bg);
    setBg(fg);
    toast.info("Swapped foreground and background.");
  };

  const reset = () => {
    setFg(DEFAULT_FG);
    setBg(DEFAULT_BG);
    toast.info("Reset to defaults.");
  };

  const summary = result
    ? `WCAG contrast check
Foreground: ${fg}
Background: ${bg}
Ratio: ${formatRatio(result.ratio)}
AA normal text (4.5:1): ${result.aaNormal ? "PASS" : "FAIL"}
AA large text (3:1): ${result.aaLarge ? "PASS" : "FAIL"}
AAA normal text (7:1): ${result.aaaNormal ? "PASS" : "FAIL"}
AAA large text (4.5:1): ${result.aaaLarge ? "PASS" : "FAIL"}`
    : "";

  const content: ToolContent = {
    intro:
      "Pick a foreground and background colour and instantly see the WCAG 2.1 contrast ratio plus pass/fail badges for AA (normal and large text) and AAA (normal and large text). Swap colours with one click and copy the verdict.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Inputs */}
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="cc-fg">Foreground (text)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={isValidHex(fg) ? fg : DEFAULT_FG}
                  onChange={(e) => setFg(e.target.value)}
                  className="h-10 w-12 flex-none cursor-pointer rounded-md border bg-background p-1"
                  aria-label="Foreground colour picker"
                />
                <Input
                  id="cc-fg"
                  value={fg}
                  onChange={(e) => setFg(e.target.value)}
                  onBlur={() => {
                    if (!isValidHex(fg)) {
                      toast.error("Invalid hex — reverting.");
                      setFg(DEFAULT_FG);
                    }
                  }}
                  placeholder="#0f172a"
                  className="font-mono"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cc-bg">Background</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={isValidHex(bg) ? bg : DEFAULT_BG}
                  onChange={(e) => setBg(e.target.value)}
                  className="h-10 w-12 flex-none cursor-pointer rounded-md border bg-background p-1"
                  aria-label="Background colour picker"
                />
                <Input
                  id="cc-bg"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  onBlur={() => {
                    if (!isValidHex(bg)) {
                      toast.error("Invalid hex — reverting.");
                      setBg(DEFAULT_BG);
                    }
                  }}
                  placeholder="#f8fafc"
                  className="font-mono"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={swap}>
                <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" /> Swap
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Tip: large text is defined by WCAG as ≥ 18pt (24px) regular or ≥ 14pt (18.5px) bold.
            </p>
          </div>

          {/* Result */}
          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Contrast ratio</h3>
              <CopyButton value={summary} size="sm" />
            </div>

            <div
              className="rounded-lg border p-4"
              style={{
                backgroundColor: isValidHex(bg) ? bg : DEFAULT_BG,
                color: isValidHex(fg) ? fg : DEFAULT_FG,
              }}
            >
              <p className="text-2xl font-bold leading-tight">
                The quick brown fox jumps over the lazy dog.
              </p>
              <p className="mt-2 text-sm">
                0123456789 — sample body text for visual check.
              </p>
            </div>

            {result ? (
              <>
                <div className="rounded-lg border bg-background p-3 text-center">
                  <span className="font-mono text-3xl font-bold tabular-nums">
                    {formatRatio(result.ratio)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Verdict label="AA normal" pass={result.aaNormal} threshold="4.5:1" />
                  <Verdict label="AA large" pass={result.aaLarge} threshold="3:1" />
                  <Verdict label="AAA normal" pass={result.aaaNormal} threshold="7:1" />
                  <Verdict label="AAA large" pass={result.aaaLarge} threshold="4.5:1" />
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                Enter valid HEX colours for both foreground and background to see the verdict.
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Pick a foreground colour",
        description:
          "Use the colour square or type a HEX value. This is the text colour you want to test.",
      },
      {
        title: "Pick a background colour",
        description:
          "Use the second colour square or HEX field. This is the surface the text sits on.",
      },
      {
        title: "Read the ratio and verdicts",
        description:
          "The right panel shows the live contrast ratio and four pass/fail badges: AA normal, AA large, AAA normal and AAA large.",
      },
      {
        title: "Swap or copy",
        description:
          "Use Swap to flip foreground and background (handy when iterating on a palette). Use Copy to copy a text summary of the verdict.",
      },
    ],
    useCases: [
      "Verify that body text meets AA (4.5:1) against a coloured background before shipping.",
      "Check whether large display headings meet AAA (7:1) on a hero section.",
      "Audit a brand colour palette for accessible text pairings.",
      "Test button text against hover-state backgrounds to avoid losing contrast on interaction.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Only solid HEX colours are supported. Semi-transparent foregrounds and backgrounds are not evaluated.</li>
        <li>WCAG large-text thresholds assume 18pt regular or 14pt bold. The tool does not measure font size — it only reports whether the ratio meets the threshold.</li>
        <li>The ratio uses the WCAG 2.1 sRGB formula. HDR or wide-gamut displays are not accounted for.</li>
        <li>This tool checks text contrast only — non-text contrast (icons, borders) has separate WCAG 1.4.11 thresholds that are not evaluated here.</li>
      </ul>
    ),
    faq: [
      {
        q: "What is the difference between AA and AAA?",
        a: "AA is the WCAG conformance level required for most public-sector and enterprise sites (4.5:1 for normal text, 3:1 for large text). AAA is a stricter level (7:1 normal, 4.5:1 large) recommended for content where readability is critical.",
      },
      {
        q: "What counts as large text?",
        a: "WCAG defines large text as 18pt (24px) regular or 14pt (18.5px) bold. The large-text thresholds are more lenient because larger characters are easier to read at lower contrast.",
      },
      {
        q: "Why does my colour fail when it looks fine to me?",
        a: "Perceived contrast depends on the display, ambient light and the viewer's vision. The WCAG formula is a mathematical approximation designed to be conservative — when in doubt, trust the ratio, not the eye.",
      },
      {
        q: "Does this check icon and border contrast?",
        a: "No. WCAG 1.4.11 (non-text contrast) requires 3:1 for UI components but is evaluated separately. This tool only reports text-contrast thresholds (1.4.3 and 1.4.6).",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Verdict({
  label,
  pass,
  threshold,
}: {
  label: string;
  pass: boolean;
  threshold: string;
}) {
  return (
    <div
      className={
        "flex items-center justify-between rounded-lg border p-2.5 " +
        (pass
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-destructive/40 bg-destructive/10")
      }
    >
      <div className="flex items-center gap-2">
        {pass ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <X className="h-4 w-4 text-destructive" />
        )}
        <div>
          <p className="text-xs font-medium">{label}</p>
          <p className="text-[10px] text-muted-foreground">needs {threshold}</p>
        </div>
      </div>
      <span
        className={
          "text-xs font-bold " + (pass ? "text-emerald-600" : "text-destructive")
        }
      >
        {pass ? "PASS" : "FAIL"}
      </span>
    </div>
  );
}
