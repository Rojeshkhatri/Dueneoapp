"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, TrendingUp, AlertCircle } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatPercent,
  FINANCE_DISCLAIMER,
} from "./_finance-helpers";
import { useCurrency, CurrencySelector } from "@/components/dueneo/currency-selector";

export function ProfitMarginCalculator({ tool }: { tool: ToolDefinition }) {
  const [revenue, setRevenue] = React.useState<string>("");
  const [cost, setCost] = React.useState<string>("");
  const { code: currency, setCode: setCurrency } = useCurrency();

  const revenueNum = Math.max(0, parseNumber(revenue));
  const costNum = Math.max(0, parseNumber(cost));

  const grossProfit = revenueNum - costNum;
  const grossMargin = revenueNum > 0 ? (grossProfit / revenueNum) * 100 : 0;
  const markup = costNum > 0 ? (grossProfit / costNum) * 100 : 0;

  const isLoss = grossProfit < 0;

  const reset = () => {
    setRevenue("");
    setCost("");
    toast.info("Reset.");
  };

  const summary = `Profit margin summary
Revenue: ${formatCurrency(revenueNum, { currency })}
Cost of goods sold: ${formatCurrency(costNum, { currency })}
Gross profit: ${formatCurrency(grossProfit, { currency })}
Gross margin: ${formatPercent(grossMargin)}
Markup on cost: ${formatPercent(markup)}`;

  const content: ToolContent = {
    intro:
      "Compute gross profit and gross margin from your revenue and cost of goods sold. Enter the two numbers and instantly see profit in absolute terms and as a percentage of revenue — plus the markup on cost for comparison.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="pm-revenue">Revenue (selling price)</Label>
              <Input
                id="pm-revenue"
                inputMode="decimal"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Total amount you charge the customer for the product or service.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-cost">Cost of goods sold (COGS)</Label>
              <Input
                id="pm-cost"
                inputMode="decimal"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Direct costs to produce or buy the goods you sold.
              </p>
            </div>
            <CurrencySelector value={currency} onChange={setCurrency} id="pm-currency" />
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Result</h3>
              <CopyButton value={summary} size="sm" />
            </div>

            {isLoss && revenueNum > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                <p>Costs exceed revenue — you are making a loss on this sale.</p>
              </div>
            )}

            <div className="grid gap-2">
              <Row label="Revenue" value={formatCurrency(revenueNum, { currency })} />
              <Row label="Cost of goods sold" value={formatCurrency(costNum, { currency })} />
              <Row
                label="Gross profit"
                value={formatCurrency(grossProfit, { currency })}
                highlight={grossProfit > 0}
                hint={<TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
              />
              <div className="border-t pt-2">
                <Row
                  label="Gross margin"
                  value={formatPercent(grossMargin)}
                  large
                />
                <Row label="Markup on cost" value={formatPercent(markup)} muted />
              </div>
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
              <p>
                <strong className="text-foreground">Margin</strong> = profit ÷ revenue.{" "}
                <strong className="text-foreground">Markup</strong> = profit ÷ cost. A 25%
                margin equals a 33% markup on cost.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter revenue",
        description:
          "Type the total selling price — what your customer pays you for the product or service.",
      },
      {
        title: "Enter cost of goods sold",
        description:
          "Enter only the direct costs of producing or buying the goods. Exclude overheads, salaries and rent — this is gross margin, not net margin.",
      },
      {
        title: "Read the result",
        description:
          "Gross profit, gross margin % and markup on cost update instantly. A loss warning appears if cost exceeds revenue.",
      },
      {
        title: "Copy the breakdown",
        description:
          "Click Copy to put the full summary on your clipboard for your notes or your business plan.",
      },
    ],
    useCases: [
      "Set a profitable price for a new product by modelling the required margin.",
      "Compare the profitability of two SKUs with different cost structures.",
      "Audit a quarter's gross margin by feeding in revenue and COGS totals.",
      "Communicate pricing rationale to a co-founder using margin + markup side by side.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          This is <strong>gross</strong> margin — it excludes operating expenses,
          depreciation, interest and tax. Use a full P&L for net profitability.
        </li>
        <li>Cost of goods sold should include only direct production costs.</li>
      </ul>
    ),
    faq: [
      {
        q: "What is the difference between margin and markup?",
        a: "Margin divides profit by revenue (selling price); markup divides profit by cost. A product that costs $75 and sells for $100 has a 25% margin but a 33% markup.",
      },
      {
        q: "What counts as cost of goods sold?",
        a: "Direct materials, direct labour and direct manufacturing overhead. Exclude marketing, salaries of admin staff, rent and software subscriptions — those are operating expenses, not COGS.",
      },
      {
        q: "Can I use this for services?",
        a: "Yes — treat the labour hours directly billable to the engagement as the “cost of goods sold”. Software subscriptions shared across clients should be excluded.",
      },
      {
        q: "Is this financial advice?",
        a: "No. The numbers are estimates only and do not replace a proper accounting system or professional advice from a CPA.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Row({
  label,
  value,
  highlight,
  large,
  muted,
  hint,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  large?: boolean;
  muted?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          "text-sm " +
          (highlight
            ? "font-medium text-primary"
            : muted
              ? "text-muted-foreground/80"
              : "text-muted-foreground")
        }
      >
        {label}
      </span>
      <span
        className={
          "flex items-center gap-1.5 font-mono tabular-nums " +
          (large
            ? "text-2xl font-semibold text-foreground"
            : highlight
              ? "text-base font-semibold text-primary"
              : muted
                ? "text-sm text-muted-foreground"
                : "text-base text-foreground")
        }
      >
        {hint}
        {value}
      </span>
    </div>
  );
}
