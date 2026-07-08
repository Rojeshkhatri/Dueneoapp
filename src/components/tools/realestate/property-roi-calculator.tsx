"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, TrendingUp, Wallet, Home, Hammer, Receipt } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { parseNumber, formatCurrency, formatPercent, RE_DISCLAIMER } from "./_re-helpers";
import { useCurrency, CurrencySelector } from "@/components/dueneo/currency-selector";

export function PropertyRoiCalculator({ tool }: { tool: ToolDefinition }) {
  const [purchasePrice, setPurchasePrice] = React.useState<string>("300000");
  const [purchaseCosts, setPurchaseCosts] = React.useState<string>("9000");
  const [renovationCosts, setRenovationCosts] = React.useState<string>("15000");
  const [monthlyRent, setMonthlyRent] = React.useState<string>("2100");
  const [monthlyExpenses, setMonthlyExpenses] = React.useState<string>("450");
  const [holdingYears, setHoldingYears] = React.useState<string>("5");
  const [salePrice, setSalePrice] = React.useState<string>("380000");
  const [sellingCosts, setSellingCosts] = React.useState<string>("28000");
  const { code: currency, setCode: setCurrency } = useCurrency();

  const nums = {
    purchase: Math.max(0, parseNumber(purchasePrice)),
    purchaseCosts: Math.max(0, parseNumber(purchaseCosts)),
    reno: Math.max(0, parseNumber(renovationCosts)),
    rentMo: Math.max(0, parseNumber(monthlyRent)),
    expMo: Math.max(0, parseNumber(monthlyExpenses)),
    years: Math.max(0, parseNumber(holdingYears)),
    sale: Math.max(0, parseNumber(salePrice)),
    selling: Math.max(0, parseNumber(sellingCosts)),
  };

  const totalInvestment = nums.purchase + nums.purchaseCosts + nums.reno;
  const netMonthlyCash = nums.rentMo - nums.expMo;
  const totalRentalIncome = netMonthlyCash * 12 * nums.years;
  const totalReturns = nums.sale - nums.selling + totalRentalIncome;
  const profit = totalReturns - totalInvestment;
  const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0;
  const annualizedRoi = nums.years > 0 && totalInvestment > 0
    ? (Math.pow(1 + profit / totalInvestment, 1 / nums.years) - 1) * 100
    : 0;

  const reset = () => {
    setPurchasePrice("300000");
    setPurchaseCosts("9000");
    setRenovationCosts("15000");
    setMonthlyRent("2100");
    setMonthlyExpenses("450");
    setHoldingYears("5");
    setSalePrice("380000");
    setSellingCosts("28000");
    toast.info("Reset.");
  };

  const summary = `Property ROI summary
Purchase price: ${formatCurrency(nums.purchase, { currency })}
Purchase costs: ${formatCurrency(nums.purchaseCosts, { currency })}
Renovation costs: ${formatCurrency(nums.reno, { currency })}
Total investment: ${formatCurrency(totalInvestment, { currency })}

Net monthly cash flow: ${formatCurrency(netMonthlyCash, { currency })}
Holding period: ${nums.years} years
Total rental income (net): ${formatCurrency(totalRentalIncome, { currency })}

Sale price: ${formatCurrency(nums.sale, { currency })}
Selling costs: ${formatCurrency(nums.selling, { currency })}
Net sale proceeds: ${formatCurrency(nums.sale - nums.selling, { currency })}

Total returns: ${formatCurrency(totalReturns, { currency })}
Profit: ${formatCurrency(profit, { currency })}
ROI: ${formatPercent(roi)}
Annualised ROI: ${formatPercent(annualizedRoi)}`;

  const content: ToolContent = {
    intro:
      "Calculate the total return on investment for a rental property over a holding period. Factor in purchase price, closing costs, renovation, monthly cash flow, holding years, sale price and selling costs to get total profit, ROI % and annualised ROI.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Purchase & renovation</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <Field label="Purchase price" value={purchasePrice} onChange={setPurchasePrice} icon={<Home className="h-3.5 w-3.5" />} />
              <Field label="Purchase costs" value={purchaseCosts} onChange={setPurchaseCosts} icon={<Receipt className="h-3.5 w-3.5" />} />
              <Field label="Renovation" value={renovationCosts} onChange={setRenovationCosts} icon={<Hammer className="h-3.5 w-3.5" />} />
              <Field label="Monthly rent" value={monthlyRent} onChange={setMonthlyRent} />
              <Field label="Monthly expenses" value={monthlyExpenses} onChange={setMonthlyExpenses} />
              <Field label="Holding (years)" value={holdingYears} onChange={setHoldingYears} />
              <Field label="Sale price" value={salePrice} onChange={setSalePrice} />
              <Field label="Selling costs" value={sellingCosts} onChange={setSellingCosts} />
              <div className="flex items-end">
                <Button size="sm" variant="ghost" onClick={reset} className="w-full">
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
                </Button>
              </div>
              <CurrencySelector value={currency} onChange={setCurrency} id="pr-currency" className="sm:col-span-1" />
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Returns</CardTitle>
                <CopyButton value={summary} size="sm" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Big label="Total profit" value={formatCurrency(profit, { currency })} icon={<Wallet className="h-4 w-4" />} tone={profit >= 0 ? "good" : "bad"} />
              <div className="grid grid-cols-2 gap-3">
                <Tile label="ROI" value={formatPercent(roi)} tone={roi >= 0 ? "good" : "bad"} />
                <Tile label="Annualised ROI" value={formatPercent(annualizedRoi)} tone={annualizedRoi >= 0 ? "good" : "bad"} />
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <Row label="Total investment" value={formatCurrency(totalInvestment, { currency })} muted />
                <Row label="Net monthly cash flow" value={formatCurrency(netMonthlyCash, { currency })} />
                <Row label="Total rental income (net)" value={formatCurrency(totalRentalIncome, { currency })} icon={<Receipt className="h-3.5 w-3.5" />} />
                <Row label="Net sale proceeds" value={formatCurrency(nums.sale - nums.selling, { currency })} />
                <Row label="Total returns" value={formatCurrency(totalReturns, { currency })} highlight icon={<TrendingUp className="h-3.5 w-3.5" />} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">How ROI is calculated</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="font-semibold">Total ROI</p>
              <p className="mt-1 text-xs text-muted-foreground">
                (Total returns − Total investment) ÷ Total investment × 100. Includes rental income and sale proceeds net of costs.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="font-semibold">Annualised ROI</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Geometric mean — ((1 + ROI)<sup>1/years</sup> − 1) × 100. Useful for comparing investments held over different periods.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {RE_DISCLAIMER}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter purchase details",
        description: "Purchase price, closing costs (stamp duty, legal, inspection) and any renovation needed before renting.",
      },
      {
        title: "Enter rental income and expenses",
        description: "Monthly rent minus monthly expenses (taxes, insurance, management, maintenance, vacancy reserve).",
      },
      {
        title: "Enter sale assumptions",
        description: "Holding period in years, expected sale price and selling costs (agent commission, closing costs, staging).",
      },
      {
        title: "Read profit and ROI",
        description: "Total profit, total ROI %, and annualised ROI for comparison with other investments.",
      },
    ],
    useCases: [
      "Compare two investment properties by their projected annualised ROI.",
      "Decide whether to hold or sell based on projected ROI over the next 5 years.",
      "Stress-test a flip-vs-hold decision by modelling both scenarios.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{RE_DISCLAIMER}</li>
        <li>This is a nominal calculation — it doesn't discount future cash flows or model inflation, tax, or mortgage interest. Use NPV/IRR in a spreadsheet for those.</li>
        <li>Property appreciation, vacancy and rent growth are not modelled — enter your best single-point estimates for the whole holding period.</li>
      </ul>
    ),
    faq: [
      {
        q: "ROI vs annualised ROI — which should I use?",
        a: "Use total ROI to see the whole-project return. Use annualised ROI to compare against other investments (stocks, bonds, savings) held over different periods — it normalises to a per-year return.",
      },
      {
        q: "Does this include mortgage interest?",
        a: "No. The model uses net monthly cash flow (rent − expenses) — if you have a mortgage, subtract principal + interest from the monthly expenses field to see leveraged ROI on your cash invested.",
      },
      {
        q: "How do I model property appreciation?",
        a: "Set the sale price to your projected value at the end of the holding period. The tool doesn't compute appreciation — you enter the expected sale price directly.",
      },
      {
        q: "What's a 'good' ROI for rental property?",
        a: "Many investors target an annualised ROI of 8–12% on unleveraged rentals, or 12–20%+ with leverage. Compare against your opportunity cost (index funds, REITs) and risk tolerance.",
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
