"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Percent, ArrowUpRight, ArrowDownRight, Equal } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatNumber,
  formatPercent,
  FINANCE_DISCLAIMER,
} from "./_finance-helpers";

type Mode = "of" | "isWhat" | "change";

export function PercentageCalculator({ tool }: { tool: ToolDefinition }) {
  const [mode, setMode] = React.useState<Mode>("of");

  // Mode 1: X% of Y
  const [xOf, setXOf] = React.useState<string>("15");
  const [yOf, setYOf] = React.useState<string>("200");
  const xOfNum = parseNumber(xOf);
  const yOfNum = parseNumber(yOf);
  const resultOf = (xOfNum / 100) * yOfNum;

  // Mode 2: X is what % of Y
  const [xIs, setXIs] = React.useState<string>("30");
  const [yIs, setYIs] = React.useState<string>("200");
  const xIsNum = parseNumber(xIs);
  const yIsNum = parseNumber(yIs);
  const resultIsWhat = yIsNum !== 0 ? (xIsNum / yIsNum) * 100 : 0;

  // Mode 3: % increase/decrease from X to Y
  const [xFrom, setXFrom] = React.useState<string>("150");
  const [yTo, setYTo] = React.useState<string>("180");
  const xFromNum = parseNumber(xFrom);
  const yToNum = parseNumber(yTo);
  const change = yToNum - xFromNum;
  const changePct = xFromNum !== 0 ? (change / Math.abs(xFromNum)) * 100 : 0;
  const isIncrease = change > 0;
  const isDecrease = change < 0;

  const reset = () => {
    setMode("of");
    setXOf("15");
    setYOf("200");
    setXIs("30");
    setYIs("200");
    setXFrom("150");
    setYTo("180");
    toast.info("Reset.");
  };

  const summaryOf = `${formatNumber(xOfNum)}% of ${formatNumber(yOfNum)} = ${formatNumber(resultOf)}`;
  const summaryIsWhat = `${formatNumber(xIsNum)} is ${formatPercent(resultIsWhat)} of ${formatNumber(yIsNum)}`;
  const summaryChange = `Change from ${formatNumber(xFromNum)} to ${formatNumber(
    yToNum
  )}: ${change >= 0 ? "+" : ""}${formatNumber(change)} (${change >= 0 ? "+" : ""}${formatPercent(
    changePct
  )})`;

  const content: ToolContent = {
    intro:
      "Three percentage calculators in one. Find X% of Y, work out what percentage X is of Y, or compute the percentage increase / decrease between two values. Switch tabs to pick the calculation you need.",
    tool: (
      <div className="space-y-5">
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:grid-cols-3">
            <TabsTrigger value="of">X% of Y</TabsTrigger>
            <TabsTrigger value="isWhat">X is what % of Y</TabsTrigger>
            <TabsTrigger value="change">% change</TabsTrigger>
          </TabsList>

          <TabsContent value="of" className="mt-4">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border bg-card p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pc-x-of">Percentage (X)</Label>
                    <Input
                      id="pc-x-of"
                      inputMode="decimal"
                      value={xOf}
                      onChange={(e) => setXOf(e.target.value)}
                      placeholder="0"
                      className="pr-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pc-y-of">Of value (Y)</Label>
                    <Input
                      id="pc-y-of"
                      inputMode="decimal"
                      value={yOf}
                      onChange={(e) => setYOf(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
                </Button>
              </div>

              <ResultPanel
                label={`${formatNumber(xOfNum)}% of ${formatNumber(yOfNum)}`}
                value={formatNumber(resultOf)}
                hint={<Percent className="h-4 w-4 text-primary" />}
                summary={summaryOf}
              />
            </div>
          </TabsContent>

          <TabsContent value="isWhat" className="mt-4">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border bg-card p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pc-x-is">Value (X)</Label>
                    <Input
                      id="pc-x-is"
                      inputMode="decimal"
                      value={xIs}
                      onChange={(e) => setXIs(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pc-y-is">Is what % of (Y)</Label>
                    <Input
                      id="pc-y-is"
                      inputMode="decimal"
                      value={yIs}
                      onChange={(e) => setYIs(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
                </Button>
              </div>

              <ResultPanel
                label={`${formatNumber(xIsNum)} is what % of ${formatNumber(yIsNum)}`}
                value={formatPercent(resultIsWhat)}
                hint={<Percent className="h-4 w-4 text-primary" />}
                summary={summaryIsWhat}
              />
            </div>
          </TabsContent>

          <TabsContent value="change" className="mt-4">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border bg-card p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pc-x-from">From (X)</Label>
                    <Input
                      id="pc-x-from"
                      inputMode="decimal"
                      value={xFrom}
                      onChange={(e) => setXFrom(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pc-y-to">To (Y)</Label>
                    <Input
                      id="pc-y-to"
                      inputMode="decimal"
                      value={yTo}
                      onChange={(e) => setYTo(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
                </Button>
              </div>

              <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Result</h3>
                  <CopyButton value={summaryChange} size="sm" />
                </div>

                <div
                  className={
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium " +
                    (isIncrease
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : isDecrease
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                        : "bg-muted text-muted-foreground")
                  }
                >
                  {isIncrease ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : isDecrease ? (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  ) : (
                    <Equal className="h-3.5 w-3.5" />
                  )}
                  {isIncrease ? "Increase" : isDecrease ? "Decrease" : "No change"}
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Change</span>
                  <span className="font-mono text-xl font-semibold tabular-nums text-foreground">
                    {change >= 0 ? "+" : ""}
                    {formatNumber(change)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Percentage change</span>
                  <span
                    className={
                      "font-mono text-3xl font-bold tabular-nums " +
                      (isIncrease
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isDecrease
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-foreground")
                    }
                  >
                    {changePct >= 0 ? "+" : ""}
                    {formatPercent(changePct)}
                  </span>
                </div>

                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                  Formula: <code className="rounded bg-background px-1 py-0.5">(Y − X) ÷ |X| × 100</code>
                  . The denominator uses the absolute value of X so the sign reflects the
                  direction of change correctly.
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    ),
    howTo: [
      {
        title: "Pick the right tab",
        description:
          "Use X% of Y to find a portion of a value, X is what % of Y to express one value as a percentage of another, or % change for the relative change between two numbers.",
      },
      {
        title: "Enter the inputs",
        description:
          "Each tab has two inputs. Decimals, negatives and thousands separators are accepted.",
      },
      {
        title: "Read the result",
        description:
          "The result updates live as you type. The % change tab also shows the absolute change and a coloured Increase / Decrease badge.",
      },
      {
        title: "Copy the answer",
        description:
          "Each tab has a Copy button that puts a one-line summary on your clipboard.",
      },
    ],
    useCases: [
      "Work out a 15% tip on a $86 bill.",
      "Express 30 out of 200 survey responses as a percentage.",
      "Calculate the year-over-year revenue growth from $1.2M to $1.5M.",
      "Quantify a price drop from $89.99 to $74.99 as a percentage decrease.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          The % change tab divides by the absolute value of X. If X is zero the result is
          undefined and shows 0%.
        </li>
        <li>Negative inputs are allowed but may produce surprising results — read the formula note.</li>
        <li>
          The tool does not compute percentage points (a change from 10% to 12% is a 2
          percentage-point change, not 20%).
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What is the difference between % change and percentage points?",
        a: "Percentage change is relative to the starting value (e.g. going from 10% to 12% is a 20% increase). Percentage points measure the absolute difference (a 2 pp change). This tool computes percentage change.",
      },
      {
        q: "How is the % change calculated when X is negative?",
        a: "We divide by the absolute value of X so the sign reflects the direction. Going from −10 to +10 is a 200% increase; going from −10 to −20 is a 100% increase (more negative).",
      },
      {
        q: "Can this compute compound percentage changes?",
        a: "No — for chained changes (e.g. up 10% then down 5%), use the Discount Calculator in stacked mode.",
      },
      {
        q: "Is my data sent anywhere?",
        a: "No. The maths runs entirely in your browser. Nothing you type leaves your device.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function ResultPanel({
  label,
  value,
  hint,
  summary,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  summary: string;
}) {
  return (
    <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Result</h3>
        <CopyButton value={summary} size="sm" />
      </div>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-center gap-2 font-mono text-3xl font-bold tabular-nums text-foreground">
          {hint}
          {value}
        </div>
      </div>
    </div>
  );
}
