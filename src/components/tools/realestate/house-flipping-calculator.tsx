"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Wallet, Home, Hammer, CalendarClock, Receipt, TrendingUp } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { parseNumber, formatCurrency, formatPercent, RE_DISCLAIMER } from "./_re-helpers";

export function HouseFlippingCalculator({ tool }: { tool: ToolDefinition }) {
  const [purchasePrice, setPurchasePrice] = React.useState<string>("280000");
  const [renovationCosts, setRenovationCosts] = React.useState<string>("45000");
  const [holdingMonthly, setHoldingMonthly] = React.useState<string>("850");
  const [monthsToFlip, setMonthsToFlip] = React.useState<string>("6");
  const [sellingPrice, setSellingPrice] = React.useState<string>("410000");
  const [agentCommission, setAgentCommission] = React.useState<string>("6");
  const [closingCosts, setClosingCosts] = React.useState<string>("3");
  const currency = "USD";

  const nums = {
    purchase: Math.max(0, parseNumber(purchasePrice)),
    reno: Math.max(0, parseNumber(renovationCosts)),
    holdingMo: Math.max(0, parseNumber(holdingMonthly)),
    months: Math.max(0, parseNumber(monthsToFlip)),
    sale: Math.max(0, parseNumber(sellingPrice)),
    commission: Math.max(0, Math.min(100, parseNumber(agentCommission))),
    closingPct: Math.max(0, Math.min(100, parseNumber(closingCosts))),
  };

  const totalHolding = nums.holdingMo * nums.months;
  const commissionCost = nums.sale * (nums.commission / 100);
  const closingCost = nums.sale * (nums.closingPct / 100);
  const totalSellingCosts = commissionCost + closingCost;

  const totalCost = nums.purchase + nums.reno + totalHolding + totalSellingCosts;
  const profit = nums.sale - totalCost;
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const annualisedRoi = nums.months > 0 && totalCost > 0 ? (Math.pow(1 + profit / totalCost, 12 / nums.months) - 1) * 100 : 0;

  const reset = () => {
    setPurchasePrice("280000");
    setRenovationCosts("45000");
    setHoldingMonthly("850");
    setMonthsToFlip("6");
    setSellingPrice("410000");
    setAgentCommission("6");
    setClosingCosts("3");
    toast.info("Reset.");
  };

  const summary = `House flip estimate
Purchase price: ${formatCurrency(nums.purchase, { currency })}
Renovation costs: ${formatCurrency(nums.reno, { currency })}
Holding costs: ${formatCurrency(nums.holdingMo, { currency })}/mo × ${nums.months} mo = ${formatCurrency(totalHolding, { currency })}
Selling price: ${formatCurrency(nums.sale, { currency })}
Agent commission: ${formatPercent(nums.commission, 1)} = ${formatCurrency(commissionCost, { currency })}
Closing costs: ${formatPercent(nums.closingPct, 1)} = ${formatCurrency(closingCost, { currency })}

Total cost: ${formatCurrency(totalCost, { currency })}
Profit: ${formatCurrency(profit, { currency })}
ROI: ${formatPercent(roi)}
Annualised ROI: ${formatPercent(annualisedRoi)}`;

  const content: ToolContent = {
    intro:
      "Estimate the profit, ROI and annualised ROI on a house flip. Factor in purchase price, renovation, monthly holding costs (taxes, insurance, utilities), expected selling price, agent commission and closing costs — all in your browser.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Deal assumptions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="Purchase price" value={purchasePrice} onChange={setPurchasePrice} icon={<Home className="h-3.5 w-3.5" />} />
              <Field label="Renovation costs" value={renovationCosts} onChange={setRenovationCosts} icon={<Hammer className="h-3.5 w-3.5" />} />
              <Field label="Holding costs / month" value={holdingMonthly} onChange={setHoldingMonthly} icon={<CalendarClock className="h-3.5 w-3.5" />} />
              <Field label="Months to flip" value={monthsToFlip} onChange={setMonthsToFlip} />
              <Field label="Selling price" value={sellingPrice} onChange={setSellingPrice} icon={<TrendingUp className="h-3.5 w-3.5" />} />
              <Field label="Agent commission (%)" value={agentCommission} onChange={setAgentCommission} />
              <Field label="Closing costs (%)" value={closingCosts} onChange={setClosingCosts} icon={<Receipt className="h-3.5 w-3.5" />} />
              <div className="flex items-end">
                <Button size="sm" variant="ghost" onClick={reset} className="w-full">
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Outcome</CardTitle>
                <CopyButton value={summary} size="sm" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Big label="Profit" value={formatCurrency(profit, { currency })} icon={<Wallet className="h-4 w-4" />} tone={profit >= 0 ? "good" : "bad"} />
              <div className="grid grid-cols-2 gap-3">
                <Tile label="ROI" value={formatPercent(roi)} tone={roi >= 0 ? "good" : "bad"} />
                <Tile label="Annualised ROI" value={formatPercent(annualisedRoi)} tone={annualisedRoi >= 0 ? "good" : "bad"} />
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <Row label="Purchase price" value={formatCurrency(nums.purchase, { currency })} muted icon={<Home className="h-3.5 w-3.5" />} />
                <Row label="Renovation" value={formatCurrency(nums.reno, { currency })} muted icon={<Hammer className="h-3.5 w-3.5" />} />
                <Row label={`Holding (${nums.months} mo @ ${formatCurrency(nums.holdingMo, { currency })})`} value={formatCurrency(totalHolding, { currency })} muted />
                <Row label="Agent commission" value={formatCurrency(commissionCost, { currency })} muted />
                <Row label="Closing costs" value={formatCurrency(closingCost, { currency })} muted icon={<Receipt className="h-3.5 w-3.5" />} />
                <Row label="Total cost" value={formatCurrency(totalCost, { currency })} highlight />
                <Row label="Selling price" value={formatCurrency(nums.sale, { currency })} icon={<TrendingUp className="h-3.5 w-3.5" />} />
              </div>
            </CardContent>
          </Card>
        </div>

        {profit < 0 && (
          <div className="rounded-lg border border-rose-300/60 bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
            <strong>This flip loses money at the current assumptions.</strong> Try raising the selling price, cutting renovation scope, or shortening the holding period.
          </div>
        )}

        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {RE_DISCLAIMER}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter the purchase price",
        description: "What you'll pay to acquire the property, before any renovation.",
      },
      {
        title: "Estimate renovation and holding",
        description: "Total renovation budget, monthly holding costs (taxes, insurance, utilities, loan interest), and how many months until you sell.",
      },
      {
        title: "Enter sale assumptions",
        description: "Expected sale price (after repair value), agent commission percentage, and closing costs percentage.",
      },
      {
        title: "Read profit and ROI",
        description: "Total cost, profit, ROI % and annualised ROI (which normalises for the time your capital is tied up).",
      },
    ],
    useCases: [
      "Stress-test a flip deal before making an offer.",
      "Compare two flips with different holding periods by annualised ROI.",
      "See how a longer-than-expected renovation timeline eats into profit.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{RE_DISCLAIMER}</li>
        <li>Carrying costs like loan interest, capital-gains tax, and cost-overruns on renovation are not separately modelled — add them to holding or renovation as needed.</li>
        <li>Agent commission and closing costs are applied to the sale price as a percentage. The model doesn't account for seller-paid buyer concessions or staging costs.</li>
      </ul>
    ),
    faq: [
      {
        q: "What's a 'good' ROI on a house flip?",
        a: "Many investors target a gross profit of 20–30% of total cost (the '70% rule' suggests paying no more than 70% of ARV minus repairs). Net of all costs, 10–20% ROI per flip is common for active flippers.",
      },
      {
        q: "What counts as 'holding costs'?",
        a: "Anything you pay each month while owning the property: property tax, insurance, utilities, HOA, and interest on any loan or hard money. Multiply by months-to-flip for total holding.",
      },
      {
        q: "Why use annualised ROI?",
        a: "A 20% ROI in 6 months is much better than 20% in 18 months. Annualised ROI compounds the per-period return to a 12-month basis, making different deal lengths comparable.",
      },
      {
        q: "Does this include tax?",
        a: "No. Capital-gains tax, depreciation recapture, and state taxes are not modelled. Flips are typically taxed as ordinary income (dealer property) — consult a CPA.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Field({ label, value, onChange, icon }: { label: string; value: string; onChange: (v: string) => void; icon?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-xs">{icon}{label}</Label>
      <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Big({ label, value, icon, tone = "neutral" }: { label: string; value: string; icon?: React.ReactNode; tone?: "good" | "bad" | "neutral" }) {
  const color = tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "bad" ? "text-rose-600 dark:text-rose-400" : "text-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1.5 font-mono text-2xl font-bold tabular-nums ${color}`}>
        {icon}{value}
      </span>
    </div>
  );
}

function Tile({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "good" | "bad" | "neutral" }) {
  const color = tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "bad" ? "text-rose-600 dark:text-rose-400" : "text-foreground";
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-lg font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  muted,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={"text-sm " + (highlight ? "font-medium text-primary" : muted ? "text-muted-foreground/80" : "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={
          "flex items-center gap-1.5 font-mono tabular-nums " +
          (highlight ? "text-base font-semibold text-primary" : muted ? "text-sm text-muted-foreground" : "text-base text-foreground")
        }
      >
        {icon}{value}
      </span>
    </div>
  );
}
