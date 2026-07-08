"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { CopyButton } from "@/components/dueneo/copy-button";
import { RotateCcw, TrendingUp, TrendingDown, Scale, ArrowRight } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatPercent,
  FINANCE_DISCLAIMER,
} from "./_finance-helpers";

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "CAD", symbol: "$" },
  { code: "AUD", symbol: "$" },
  { code: "INR", symbol: "₹" },
  { code: "JPY", symbol: "¥" },
  { code: "CNY", symbol: "¥" },
];

const HISTORICAL_RATES: { label: string; value: number; period: string }[] = [
  { label: "US avg 2000–2020", value: 2.4, period: "2000–2020" },
  { label: "US avg 1980–2020", value: 3.0, period: "1980–2020" },
  { label: "US 1970s (high)", value: 7.1, period: "1970–1979" },
  { label: "Euro area 2000–2020", value: 1.7, period: "2000–2020" },
  { label: "UK 2000–2020", value: 2.0, period: "2000–2020" },
];

type Direction = "future" | "past";

export function InflationCalculator({ tool }: { tool: ToolDefinition }) {
  const [amount, setAmount] = React.useState<string>("1000");
  const [years, setYears] = React.useState<string>("10");
  const [rate, setRate] = React.useState<string>("3");
  const [direction, setDirection] = React.useState<Direction>("future");
  const [currency, setCurrency] = React.useState<string>("USD");

  const a = Math.max(0, parseNumber(amount));
  const y = Math.max(0, parseNumber(years));
  const r = parseNumber(rate);
  const factor = Math.pow(1 + r / 100, y);

  // Future mode: today's $a will need to be $a*factor in y years to buy the same basket.
  // Past mode: today's $a is what $a/factor would have bought y years ago.
  const futureValue = direction === "future" ? a * factor : a;
  const purchasingPower = direction === "future" ? a : a / factor;
  const realLoss = direction === "future" ? futureValue - a : a - purchasingPower;

  const fmt = (v: number) =>
    formatCurrency(v, { currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const reset = () => {
    setAmount("1000");
    setYears("10");
    setRate("3");
    setDirection("future");
    setCurrency("USD");
  };

  const summary = `${direction === "future" ? "Future" : "Past"} inflation calc
Amount today: ${fmt(a)}
Years: ${y}
Annual inflation: ${formatPercent(r, 2)}
${
  direction === "future"
    ? `Equivalent future cost: ${fmt(futureValue)}\nReal value of ${fmt(a)} in ${y} yr: ${fmt(
        a / factor
      )}`
    : `Equivalent past value: ${fmt(purchasingPower)}\nEquivalent today of ${fmt(a)} from ${y} yr ago: ${fmt(
        a * factor
      )}`
}`;

  const toolBody = (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          value={direction}
          onValueChange={(v) => v && setDirection(v as Direction)}
          variant="outline"
        >
          <ToggleGroupItem value="future" aria-label="Future value">
            Future
          </ToggleGroupItem>
          <ToggleGroupItem value="past" aria-label="Past value">
            Past
          </ToggleGroupItem>
        </ToggleGroup>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inf-amount">
                {direction === "future" ? "Amount today" : "Amount today"}
              </Label>
              <Input
                id="inf-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inf-currency">Currency</Label>
              <select
                id="inf-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inf-years">
                {direction === "future" ? "Years into the future" : "Years into the past"}
              </Label>
              <Input
                id="inf-years"
                inputMode="decimal"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                placeholder="10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inf-rate">Annual inflation rate (%)</Label>
              <Input
                id="inf-rate"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="3"
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Quick presets (historical averages)
            </p>
            <div className="flex flex-wrap gap-2">
              {HISTORICAL_RATES.map((h) => (
                <Button
                  key={h.label}
                  type="button"
                  size="sm"
                  variant={parseNumber(rate) === h.value ? "default" : "outline"}
                  onClick={() => setRate(String(h.value))}
                  title={`Annual CPI inflation · ${h.period}`}
                >
                  {h.label} · {formatPercent(h.value, 1)}
                </Button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            <strong>Future</strong> mode: what will {fmt(a)} be worth in {y} year
            {y === 1 ? "" : "s"}, and how much will you need to match today’s buying power.{" "}
            <strong>Past</strong> mode: what was {fmt(a)} worth {y} year
            {y === 1 ? "" : "s"} ago, and what amount back then equals today’s{" "}
            {fmt(a)}.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Result</h3>
            <CopyButton value={summary} size="sm" />
          </div>

          {a <= 0 || y <= 0 ? (
            <p className="text-sm text-muted-foreground">
              Enter a positive amount and a positive number of years.
            </p>
          ) : (
            <>
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  {direction === "future" ? (
                    <>
                      <TrendingUp className="h-3.5 w-3.5 text-rose-500" /> Equivalent cost in {y}{" "}
                      year{y === 1 ? "" : "s"}
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3.5 w-3.5 text-emerald-500" /> Equivalent value{" "}
                      {y} year{y === 1 ? "" : "s"} ago
                    </>
                  )}
                </div>
                <div className="mt-1 font-mono text-4xl font-black tabular-nums text-foreground sm:text-5xl">
                  {fmt(direction === "future" ? futureValue : purchasingPower)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  At {formatPercent(r, 2)} annual inflation over {y} year{y === 1 ? "" : "s"}.
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Scale className="h-3.5 w-3.5" /> Purchasing power today of {fmt(a)}{" "}
                    {direction === "future" ? `in ${y} yr` : `from ${y} yr ago`}
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {fmt(direction === "future" ? a / factor : a * factor)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                  <span className="text-sm text-muted-foreground">
                    Inflation {direction === "future" ? "premium" : "discount"} on principal
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                    {direction === "future" ? "+" : "−"}
                    {fmt(Math.abs(realLoss))}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                  <span className="text-sm text-muted-foreground">Cumulative inflation factor</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    ×{factor.toFixed(4)}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                <p>
                  {direction === "future" ? (
                    <>
                      You’ll need <strong className="text-foreground">{fmt(futureValue)}</strong> in{" "}
                      {y} year{y === 1 ? "" : "s"} to buy what{" "}
                      <strong className="text-foreground">{fmt(a)}</strong> buys today. Conversely,
                      the real value of a fixed {fmt(a)} held under the mattress will fall to{" "}
                      <strong className="text-foreground">{fmt(a / factor)}</strong>.
                    </>
                  ) : (
                    <>
                      <strong className="text-foreground">{fmt(purchasingPower)}</strong> from{" "}
                      {y} year{y === 1 ? "" : "s"} ago has the same buying power as{" "}
                      <strong className="text-foreground">{fmt(a)}</strong> today. And{" "}
                      <strong className="text-foreground">{fmt(a)}</strong> back then would be worth{" "}
                      <strong className="text-foreground">{fmt(a * factor)}</strong> today.
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
                <span className="font-mono">{fmt(a)}</span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-mono">
                  {fmt(direction === "future" ? futureValue : purchasingPower)}
                </span>
                <span>· {y} yr · {formatPercent(r, 2)} / yr</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "See how inflation changes the value of money over time. Enter an amount, a number of years and an annual inflation rate (default 3%), then choose Future mode to project what today’s amount will be worth, or Past mode to find what a past amount equals today. Quick presets load historical average inflation rates for the US, Euro area and UK.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter the amount",
        description:
          "Type the amount of money you want to inflate or deflate. Pick the currency from the dropdown.",
      },
      {
        title: "Set the years and rate",
        description:
          "Enter the number of years and the annual inflation rate. Default is 3% — close to long-term US CPI averages. Use a quick preset for a historical rate.",
      },
      {
        title: "Pick Future or Past",
        description:
          "Future mode shows what today’s money will be worth going forward. Past mode shows what past money is worth today. Toggle at any time.",
      },
      {
        title: "Read the result",
        description:
          "The big number is the equivalent cost (future) or past value (past). The list below shows purchasing power, the inflation premium/discount and the cumulative factor.",
      },
    ],
    useCases: [
      "Compare a 1990 salary to today’s equivalent to see real wage growth.",
      "Project what $100k will be worth in 20 years to plan long-term savings.",
      "Stress-test a fixed pension against expected inflation over retirement.",
      "Understand why a 3% raise barely keeps up with 3% inflation.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          The calculator applies a constant annual inflation rate. Real inflation varies year to
          year and can be highly volatile (e.g. the 1970s in the US, or hyperinflation
          episodes).
        </li>
        <li>
          The historical rate presets are broad averages across multi-decade periods and may not
          reflect your country, basket of goods, or specific timeframe. Always verify against
          official CPI data for your jurisdiction.
        </li>
        <li>
          The model uses compound annual growth. For very long horizons, small rate differences
          produce large gaps — sanity-check the rate you choose.
        </li>
        <li>
          We do not account for taxes, investment returns, or salary growth — only the pure
          effect of inflation on purchasing power.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What inflation rate should I use?",
        a: "For long-term US planning, 2.5–3% is a common rule of thumb based on the Federal Reserve’s 2% target plus a margin. Use the historical presets to see how rates have differed across decades and regions. Always check your country’s official CPI for a precise figure.",
      },
      {
        q: "What’s the difference between Future and Past mode?",
        a: "Future mode projects today’s amount forward in time: $1000 today at 3% over 10 years becomes $1343.91 — that’s what you’d need to match today’s buying power. Past mode looks backward: $1000 today was equivalent to $744.09 ten years ago at 3% inflation.",
      },
      {
        q: "How is purchasing power calculated?",
        a: "Purchasing power = amount ÷ (1 + rate)^years. A 3% rate over 10 years divides today’s nominal amount by 1.344, so the real value falls to about 74% of nominal.",
      },
      {
        q: "Why does the result differ from another inflation calculator?",
        a: "Most calculators use the same compound-growth formula, so differences usually come down to the inflation rate (annual average vs year-by-year actual CPI) and rounding. For official figures, use your country’s central bank or statistics bureau calculator.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
