"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { CopyButton } from "@/components/dueneo/copy-button";
import { Users, RotateCcw, Receipt, PiggyBank } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { parseNumber, formatCurrency, FINANCE_DISCLAIMER } from "../finance/_finance-helpers";

const QUICK_TIPS = [10, 15, 18, 20, 25];
const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "CAD", symbol: "$" },
  { code: "AUD", symbol: "$" },
  { code: "JPY", symbol: "¥" },
  { code: "INR", symbol: "₹" },
  { code: "CNY", symbol: "¥" },
];

export function TipCalculator({ tool }: { tool: ToolDefinition }) {
  const [bill, setBill] = React.useState<string>("86.50");
  const [tipPct, setTipPct] = React.useState<number>(18);
  const [people, setPeople] = React.useState<string>("2");
  const [roundUp, setRoundUp] = React.useState<boolean>(false);
  const [currency, setCurrency] = React.useState<string>("USD");

  const billNum = Math.max(0, parseNumber(bill));
  const peopleNum = Math.max(1, Math.floor(parseNumber(people)));
  const tipPctClamped = Math.max(0, Math.min(30, tipPct));

  const tipAmount = billNum * (tipPctClamped / 100);
  let total = billNum + tipAmount;
  let perPerson = total / peopleNum;
  if (roundUp) {
    perPerson = Math.ceil(perPerson);
    total = perPerson * peopleNum;
  }

  const fmt = (v: number) => formatCurrency(v, { currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const reset = () => {
    setBill("86.50");
    setTipPct(18);
    setPeople("2");
    setRoundUp(false);
    setCurrency("USD");
  };

  const summary = `Bill ${fmt(billNum)} · ${tipPctClamped}% tip · ${peopleNum} ${
    peopleNum === 1 ? "person" : "people"
  }${roundUp ? " · rounded up" : ""}
Tip: ${fmt(tipAmount)}
Total: ${fmt(total)}
Per person: ${fmt(perPerson)}`;

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="tip-bill">Bill amount</Label>
              <Input
                id="tip-bill"
                inputMode="decimal"
                value={bill}
                onChange={(e) => setBill(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="tip-currency">Currency</Label>
              <select
                id="tip-currency"
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
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="tip-slider">Tip percentage</Label>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {tipPctClamped.toFixed(0)}%
              </span>
            </div>
            <Slider
              id="tip-slider"
              min={0}
              max={30}
              step={1}
              value={[tipPctClamped]}
              onValueChange={(v) => setTipPct(v[0])}
              aria-label="Tip percentage"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_TIPS.map((q) => (
                <Button
                  key={q}
                  type="button"
                  size="sm"
                  variant={tipPctClamped === q ? "default" : "outline"}
                  onClick={() => setTipPct(q)}
                >
                  {q}%
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tip-people" className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" /> Number of people
              </Label>
              <Input
                id="tip-people"
                inputMode="numeric"
                value={people}
                onChange={(e) => setPeople(e.target.value)}
                placeholder="1"
              />
            </div>
            <Label
              htmlFor="tip-roundup"
              className="flex cursor-pointer items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
            >
              <span>Round up per person</span>
              <Switch id="tip-roundup" checked={roundUp} onCheckedChange={setRoundUp} />
            </Label>
          </div>

          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Result</h3>
            <CopyButton value={summary} size="sm" />
          </div>

          <div className="grid gap-3">
            <div className="rounded-lg border bg-background p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <PiggyBank className="h-3.5 w-3.5" /> Tip amount
              </div>
              <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">
                {fmt(tipAmount)}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {tipPctClamped.toFixed(0)}% of {fmt(billNum)}
              </div>
            </div>

            <div className="rounded-lg border bg-background p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Receipt className="h-3.5 w-3.5" /> Total bill
              </div>
              <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">
                {fmt(total)}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Bill + tip{roundUp ? " · rounded per person" : ""}
              </div>
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="text-xs font-medium text-muted-foreground">Per person</div>
              <div className="mt-1 font-mono text-4xl font-black tabular-nums text-primary sm:text-5xl">
                {fmt(perPerson)}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Split between {peopleNum} {peopleNum === 1 ? "person" : "people"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Split a restaurant bill, calculate the tip and divide the total fairly among your group. Drag the slider to set the tip percentage, tap a quick-button for common rates (10/15/18/20/25%), and toggle round-up so each person pays a whole-unit amount. Works with eight major currencies.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter the bill",
        description:
          "Type the pre-tip total shown on your receipt. Choose the currency from the dropdown — the symbol updates throughout the results.",
      },
      {
        title: "Pick the tip percentage",
        description:
          "Drag the slider 0–30% or tap a quick button. The default of 18% reflects a common North American restaurant tip.",
      },
      {
        title: "Set the party size",
        description:
          "Enter how many people are splitting the bill. The per-person amount updates instantly.",
      },
      {
        title: "Optional: round up",
        description:
          "Toggle “Round up per person” so each diner pays a whole currency unit — handy when settling up with cash.",
      },
    ],
    useCases: [
      "Split a dinner bill between friends without doing mental maths.",
      "Decide on a fair tip percentage based on service quality.",
      "Settle a group lunch by calculating each person’s share to the nearest dollar.",
      "Compare tipping customs across currencies when travelling abroad.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          Tipping customs vary widely by country. In many places a service charge is already
          included — adjust the percentage to 0% in that case.
        </li>
        <li>
          The calculator does not add sales tax or alcohol-specific surcharges. Enter the
          after-tax total in the bill field if you want the tip to apply to it.
        </li>
        <li>
          Rounding up applies to the per-person total only, not to the tip itself — the tip
          amount shown is always the exact percentage.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Is 18% the right tip?",
        a: "18% is a common default in North America for good service. Custom varies dramatically: 10–15% in much of Europe, no tip expected in Japan, and a 10% service charge often already added in Australia. Use the slider to match local custom.",
      },
      {
        q: "Does the tip apply before or after tax?",
        a: "By convention, the tip is calculated on the pre-tax subtotal. Enter that amount in the bill field. If you only have the after-tax total, subtract the tax first.",
      },
      {
        q: "How does round-up work?",
        a: "When enabled, each person’s share is rounded up to the next whole currency unit. The total is then recomputed as per-person × people, so the rounded-up amount is collected.",
      },
      {
        q: "Can I split unevenly (e.g. one person paid for drinks)?",
        a: "Not in this tool. For uneven splits, calculate the totals here and settle the difference manually outside the app.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
