"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw, Tag, TrendingDown } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatPercent,
  FINANCE_DISCLAIMER,
} from "./_finance-helpers";
import { useCurrency, CurrencySelector } from "@/components/dueneo/currency-selector";

interface DiscountTier {
  id: string;
  rate: string;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function DiscountCalculator({ tool }: { tool: ToolDefinition }) {
  const [price, setPrice] = React.useState<string>("");
  const [tiers, setTiers] = React.useState<DiscountTier[]>([
    { id: makeId(), rate: "20" },
  ]);
  const [stacked, setStacked] = React.useState<boolean>(true);
  const { code: currency, setCode: setCurrency } = useCurrency();

  const originalPrice = Math.max(0, parseNumber(price));

  // Compute either a single effective discount or stacked sequential discounts.
  const { effectiveRate, discountAmount, finalPrice, runningPrices } =
    React.useMemo(() => {
      const rates = tiers
        .map((t) => Math.max(0, Math.min(100, parseNumber(t.rate))))
        .filter((r) => r > 0);

      if (rates.length === 0 || originalPrice === 0) {
        return {
          effectiveRate: 0,
          discountAmount: 0,
          finalPrice: originalPrice,
          runningPrices: [] as { rate: number; price: number; saved: number }[],
        };
      }

      if (stacked) {
        let price = originalPrice;
        let totalSaved = 0;
        const running: { rate: number; price: number; saved: number }[] = [];
        for (const r of rates) {
          const saved = price * (r / 100);
          price -= saved;
          totalSaved += saved;
          running.push({ rate: r, price, saved });
        }
        return {
          effectiveRate: (totalSaved / originalPrice) * 100,
          discountAmount: totalSaved,
          finalPrice: price,
          runningPrices: running,
        };
      }

      // Non-stacked: simply add the rates together (clamped at 100%).
      const sum = Math.min(100, rates.reduce((a, b) => a + b, 0));
      const saved = originalPrice * (sum / 100);
      return {
        effectiveRate: sum,
        discountAmount: saved,
        finalPrice: originalPrice - saved,
        runningPrices: rates.map((r) => ({
          rate: r,
          price: originalPrice * (1 - r / 100),
          saved: originalPrice * (r / 100),
        })),
      };
    }, [tiers, originalPrice, stacked]);

  const addTier = () => {
    if (tiers.length >= 6) {
      toast.error("Up to 6 discount tiers are supported.");
      return;
    }
    setTiers((prev) => [...prev, { id: makeId(), rate: "10" }]);
  };

  const removeTier = (id: string) => {
    setTiers((prev) => (prev.length === 1 ? prev : prev.filter((t) => t.id !== id)));
  };

  const updateTier = (id: string, value: string) => {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, rate: value } : t)));
  };

  const reset = () => {
    setPrice("");
    setTiers([{ id: makeId(), rate: "20" }]);
    setStacked(true);
    toast.info("Reset.");
  };

  const summary = `Discount summary
Original price: ${formatCurrency(originalPrice, { currency })}
${
  tiers.length > 1
    ? stacked
      ? `Stacked discounts: ${tiers
          .map((t) => `${parseNumber(t.rate)}%`)
          .filter((p) => p !== "0%")
          .join(" + ")}`
      : `Combined discount: ${formatPercent(effectiveRate)}`
    : `Discount: ${formatPercent(effectiveRate)}`
}
You save: ${formatCurrency(discountAmount, { currency })}
Final price: ${formatCurrency(finalPrice, { currency })}`;

  const content: ToolContent = {
    intro:
      "Compute the final price after one or more percentage discounts. Add stacked coupons (each applied to the already-discounted price) or merge them into a single combined discount — perfect for sale events where you have a 20%-off-everything coupon plus an extra 10% at checkout.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="dc-price">Original price</Label>
              <Input
                id="dc-price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <CurrencySelector value={currency} onChange={setCurrency} id="dc-currency" />

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="dc-stacked" className="text-sm font-medium">
                  Stack discounts sequentially
                </Label>
                <p className="text-xs text-muted-foreground">
                  {stacked
                    ? "Each discount applies to the already-reduced price."
                    : "Discounts are added together and applied once."}
                </p>
              </div>
              <Switch id="dc-stacked" checked={stacked} onCheckedChange={setStacked} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Discount tiers</Label>
                <Button variant="ghost" size="sm" onClick={addTier}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add tier
                </Button>
              </div>
              <div className="space-y-2">
                {tiers.map((tier, idx) => (
                  <div key={tier.id} className="flex items-center gap-2">
                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md border bg-muted text-xs font-medium text-muted-foreground">
                      {idx + 1}
                    </div>
                    <div className="relative flex-1">
                      <Input
                        inputMode="decimal"
                        value={tier.rate}
                        onChange={(e) => updateTier(tier.id, e.target.value)}
                        placeholder="0"
                        className="pr-9"
                        aria-label={`Discount tier ${idx + 1} percentage`}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTier(tier.id)}
                      disabled={tiers.length === 1}
                      aria-label="Remove tier"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: enter 20 then 10 for “20% off, then an extra 10% off”.
              </p>
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

            <div className="grid gap-2">
              <Row label="Original price" value={formatCurrency(originalPrice, { currency })} />
              <Row
                label={tiers.length > 1 ? "Effective discount" : "Discount"}
                value={formatPercent(effectiveRate)}
                highlight
              />
              <Row
                label="You save"
                value={formatCurrency(discountAmount, { currency })}
                hint={<TrendingDown className="h-3.5 w-3.5 text-emerald-500" />}
              />
              <div className="border-t pt-2">
                <Row
                  label="Final price"
                  value={formatCurrency(finalPrice, { currency })}
                  large
                />
              </div>
            </div>

            {runningPrices.length > 1 && (
              <div className="space-y-2 rounded-lg border bg-background p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Stacked breakdown
                </div>
                <ul className="space-y-1.5 text-xs">
                  {runningPrices.map((row, idx) => (
                    <li key={idx} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Tag className="h-3 w-3" /> −{row.rate}%
                      </span>
                      <span className="font-mono tabular-nums text-foreground">
                        {formatCurrency(row.price, { currency })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter the original price",
        description:
          "Type the sticker price before any discount. Decimals and thousands separators are accepted.",
      },
      {
        title: "Choose stacked vs combined",
        description:
          "Stacked applies each discount to the already-reduced price (e.g. 20% then 10% → 28% effective). Combined simply adds the percentages.",
      },
      {
        title: "Add your discount tiers",
        description:
          "Start with one tier — add up to six. Each tier is a percentage between 0 and 100.",
      },
      {
        title: "Read and copy the result",
        description:
          "The effective discount, amount saved and final price update live. Click Copy to put the breakdown on your clipboard.",
      },
    ],
    useCases: [
      "Stack a store-wide 20%-off coupon with a 10%-off newsletter code at checkout.",
      "Compare a 30%-off single discount vs 20% + 15% stacked to see which is better.",
      "Quickly work out the final price of a Black-Friday deal with multiple layered offers.",
      "Plan a clearance promotion by modelling different tier combinations.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          Each tier is clamped to 0–100%. A tier over 100% would imply a negative price
          and is rejected.
        </li>
        <li>
          The calculator models percentage discounts only — buy-one-get-one, fixed-amount
          and conditional offers are not supported.
        </li>
        <li>
          Cent-level rounding is applied by your payment processor at checkout; this tool
          shows the unrounded result.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Are 20% + 10% the same as 30%?",
        a: "No — only when the second discount is applied to the original price. Stacked (sequential) application of 20% then 10% gives an effective 28% discount. Toggle the Stack switch to compare both interpretations.",
      },
      {
        q: "Can I model a fixed-amount discount?",
        a: "Not in this tool. Fixed-amount discounts (e.g. $5 off) need a different formula; this calculator focuses on percentage discounts only.",
      },
      {
        q: "Is my pricing data sent anywhere?",
        a: "No. The whole calculation runs in your browser with plain arithmetic.",
      },
      {
        q: "Why is the maximum tier count 6?",
        a: "Six tiers cover virtually every real-world coupon-stacking scenario while keeping the UI readable. Get in touch if you have a use case that needs more.",
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
  hint,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  large?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          "text-sm " + (highlight ? "font-medium text-primary" : "text-muted-foreground")
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
              : "text-base text-foreground")
        }
      >
        {hint}
        {value}
      </span>
    </div>
  );
}
