"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, ArrowRight } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatPercent,
  FINANCE_DISCLAIMER,
} from "./_finance-helpers";
import { useCurrency, CurrencySelector } from "@/components/dueneo/currency-selector";

type SolveMode = "price" | "markup";

export function MarkupCalculator({ tool }: { tool: ToolDefinition }) {
  const [mode, setMode] = React.useState<SolveMode>("price");
  const [cost, setCost] = React.useState<string>("");
  const [price, setPrice] = React.useState<string>("");
  const [markup, setMarkup] = React.useState<string>("50");
  const { code: currency, setCode: setCurrency } = useCurrency();

  const costNum = Math.max(0, parseNumber(cost));
  const priceNum = Math.max(0, parseNumber(price));
  const markupNum = parseNumber(markup);

  // Computed values depend on the solve mode.
  const { finalPrice, finalMarkup, grossProfit, grossMargin } = React.useMemo(() => {
    if (mode === "price") {
      const p = costNum * (1 + markupNum / 100);
      const profit = p - costNum;
      const margin = p > 0 ? (profit / p) * 100 : 0;
      return {
        finalPrice: p,
        finalMarkup: markupNum,
        grossProfit: profit,
        grossMargin: margin,
      };
    }
    // Solve markup from cost + selling price.
    const profit = priceNum - costNum;
    const m = costNum > 0 ? (profit / costNum) * 100 : 0;
    const margin = priceNum > 0 ? (profit / priceNum) * 100 : 0;
    return {
      finalPrice: priceNum,
      finalMarkup: m,
      grossProfit: profit,
      grossMargin: margin,
    };
  }, [mode, costNum, markupNum, priceNum]);

  const reset = () => {
    setCost("");
    setPrice("");
    setMarkup("50");
    setMode("price");
    toast.info("Reset.");
  };

  const summary = `Markup summary
Cost: ${formatCurrency(costNum, { currency })}
${mode === "price" ? `Markup applied: ${formatPercent(finalMarkup)}` : `Selling price: ${formatCurrency(finalPrice, { currency })}`}
Selling price: ${formatCurrency(finalPrice, { currency })}
Markup on cost: ${formatPercent(finalMarkup)}
Gross profit: ${formatCurrency(grossProfit, { currency })}
Gross margin: ${formatPercent(grossMargin)}`;

  const content: ToolContent = {
    intro:
      "Solve pricing problems from either direction. Enter a cost plus a markup % to compute the selling price, or enter a cost plus the selling price to back-solve the markup %. Gross profit and gross margin update alongside.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as SolveMode)}
              className="grid gap-2 sm:grid-cols-2"
            >
              <Label
                htmlFor="mk-mode-price"
                className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem value="price" id="mk-mode-price" className="mt-0.5" />
                <span>
                  <span className="block font-medium">Cost + Markup → Price</span>
                  <span className="block text-xs text-muted-foreground">
                    Find the selling price
                  </span>
                </span>
              </Label>
              <Label
                htmlFor="mk-mode-markup"
                className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem value="markup" id="mk-mode-markup" className="mt-0.5" />
                <span>
                  <span className="block font-medium">Cost + Price → Markup</span>
                  <span className="block text-xs text-muted-foreground">
                    Find the markup %
                  </span>
                </span>
              </Label>
            </RadioGroup>

            <div className="space-y-2">
              <Label htmlFor="mk-cost">Cost</Label>
              <Input
                id="mk-cost"
                inputMode="decimal"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {mode === "price" ? (
              <div className="space-y-2">
                <Label htmlFor="mk-markup">Markup (%)</Label>
                <Input
                  id="mk-markup"
                  inputMode="decimal"
                  value={markup}
                  onChange={(e) => setMarkup(e.target.value)}
                  placeholder="50"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[25, 50, 75, 100, 150, 200].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setMarkup(String(p))}
                      className={
                        "rounded-full border px-2.5 py-1 text-xs transition-colors " +
                        (markupNum === p
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted")
                      }
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="mk-price">Selling price</Label>
                <Input
                  id="mk-price"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}

            <CurrencySelector value={currency} onChange={setCurrency} id="mk-currency" />

            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Result</h3>
              <CopyButton value={summary} size="sm" />
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm">
              <span className="text-muted-foreground">Cost</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono tabular-nums">
                {formatCurrency(costNum, { currency })}
              </span>
            </div>

            <div className="grid gap-2">
              <Row
                label="Selling price"
                value={formatCurrency(finalPrice, { currency })}
                large
              />
              <Row label="Markup on cost" value={formatPercent(finalMarkup)} highlight />
              <Row label="Gross profit" value={formatCurrency(grossProfit, { currency })} />
              <Row label="Gross margin" value={formatPercent(grossMargin)} muted />
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
              <p>
                <strong className="text-foreground">Markup</strong> is profit relative to{" "}
                <em>cost</em>; <strong className="text-foreground">margin</strong> is profit
                relative to <em>price</em>. A 50% markup equals a 33% margin.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Pick what to solve for",
        description:
          "Choose Cost + Markup → Price when you know the cost and the markup you want. Choose Cost + Price → Markup when you want to back-solve the markup from a known price.",
      },
      {
        title: "Enter the cost",
        description:
          "Type the unit cost — what you pay to produce or buy the product. This is always required.",
      },
      {
        title: "Enter the other input",
        description:
          "Enter either the markup percentage (when solving for price) or the selling price (when solving for markup).",
      },
      {
        title: "Read and copy the breakdown",
        description:
          "Selling price, markup %, gross profit and gross margin update live. Copy puts the summary on your clipboard.",
      },
    ],
    useCases: [
      "Set a retail price using a target markup that preserves a healthy margin.",
      "Audit a competitor's pricing by back-solving their likely markup from list prices.",
      "Educate a sales team on the difference between markup and margin before discounting.",
      "Quote wholesale prices using a keystone (100%) markup rule of thumb.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          Markup is profit ÷ cost; margin is profit ÷ price. A 50% markup equals a 33%
          margin — do not conflate the two.
        </li>
        <li>
          The model assumes a single cost per unit. Volume discounts, tiered pricing and
          bundling are not modelled.
        </li>
        <li>Selling-price mode returns a negative markup if price is below cost.</li>
      </ul>
    ),
    faq: [
      {
        q: "What is keystone markup?",
        a: "Keystone is doubling the cost — a 100% markup — to set the retail price. Many retailers use it as a simple starting rule of thumb.",
      },
      {
        q: "Why are markup and margin different numbers?",
        a: "They use different denominators. Markup divides profit by cost; margin divides profit by price. A $50 cost with $100 price gives a 100% markup but only a 50% margin.",
      },
      {
        q: "Can I use a negative markup?",
        a: "Yes — entering a negative markup models a below-cost sale, and selling-price mode will report a negative markup if price is below cost. Useful for clearance analysis.",
      },
      {
        q: "Is this pricing advice?",
        a: "No. It is a simple percentage calculator. Always confirm pricing strategy with a qualified accountant or business advisor.",
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
}: {
  label: string;
  value: string;
  highlight?: boolean;
  large?: boolean;
  muted?: boolean;
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
          "font-mono tabular-nums " +
          (large
            ? "text-2xl font-semibold text-foreground"
            : highlight
              ? "text-base font-semibold text-primary"
              : muted
                ? "text-sm text-muted-foreground"
                : "text-base text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}
