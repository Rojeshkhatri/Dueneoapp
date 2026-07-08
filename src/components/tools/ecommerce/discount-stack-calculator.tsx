"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  RotateCcw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Percent,
  DollarSign,
  Tag,
  TrendingDown,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatPercent,
  ECOMMERCE_DISCLAIMER,
  StatCard,
} from "./_ecommerce-helpers";

type DiscountType = "percent" | "fixed";

interface DiscountStep {
  id: string;
  type: DiscountType;
  /** For percent: 0–100. For fixed: positive USD amount. */
  value: string;
  label: string;
}

const SAMPLE_STEPS: DiscountStep[] = [
  { id: "d1", type: "percent", value: "20", label: "Loyalty 20% off" },
  { id: "d2", type: "percent", value: "10", label: "Newsletter 10% off" },
  { id: "d3", type: "fixed", value: "5", label: "$5 refer-a-friend credit" },
];

let stepCounter = 100;
function makeId(): string {
  stepCounter += 1;
  return `d${stepCounter}_${Date.now()}`;
}

interface ComputedStep {
  step: DiscountStep;
  /** Price after this discount is applied to the running subtotal. */
  priceAfter: number;
  /** Absolute amount subtracted by this step. */
  amountOff: number;
  /** Running total discount from original price up to & incl. this step. */
  cumulativeSaved: number;
}

function computeSteps(
  originalPrice: number,
  steps: DiscountStep[],
): { steps: ComputedStep[]; finalPrice: number; totalSaved: number; effectivePct: number } {
  let running = originalPrice;
  const out: ComputedStep[] = [];
  let cumulativeSaved = 0;
  for (const step of steps) {
    const valueNum = parseNumber(step.value);
    let amountOff = 0;
    if (step.type === "percent") {
      amountOff = (running * Math.max(0, valueNum)) / 100;
    } else {
      amountOff = Math.max(0, valueNum);
    }
    // Don't allow price to go below zero.
    if (amountOff > running) amountOff = running;
    running -= amountOff;
    cumulativeSaved += amountOff;
    out.push({
      step,
      priceAfter: running,
      amountOff,
      cumulativeSaved,
    });
  }
  const totalSaved = originalPrice - running;
  const effectivePct =
    originalPrice > 0 ? (totalSaved / originalPrice) * 100 : 0;
  return { steps: out, finalPrice: running, totalSaved, effectivePct };
}

export function DiscountStackCalculator({ tool }: { tool: ToolDefinition }) {
  const [originalPrice, setOriginalPrice] = React.useState<string>("199.99");
  const [steps, setSteps] = React.useState<DiscountStep[]>(SAMPLE_STEPS);

  const priceNum = Math.max(0, parseNumber(originalPrice));
  const result = computeSteps(priceNum, steps);

  const updateStep = (id: string, patch: Partial<DiscountStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const addStep = (type: DiscountType) => {
    setSteps((prev) => [
      ...prev,
      { id: makeId(), type, value: type === "percent" ? "10" : "5", label: "" },
    ]);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const moveStep = (idx: number, direction: -1 | 1) => {
    setSteps((prev) => {
      const next = [...prev];
      const target = idx + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const reset = () => {
    setOriginalPrice("199.99");
    setSteps(SAMPLE_STEPS);
    toast.info("Reset.");
  };

  const summary = `Discount stack summary
Original price:        ${formatCurrency(priceNum)}

${result.steps.length === 0 ? "(no discounts applied)" : result.steps
    .map((s, i) => {
      const v =
        s.step.type === "percent"
          ? `${parseNumber(s.step.value).toFixed(0)}%`
          : `$${parseNumber(s.step.value).toFixed(2)}`;
      const lbl = s.step.label ? ` — ${s.step.label}` : "";
      return `  ${i + 1}. ${s.step.type === "percent" ? "Percent" : "Fixed"} ${v}${lbl}: −${formatCurrency(s.amountOff)}, price after = ${formatCurrency(s.priceAfter)}`;
    })
    .join("\n")}

Final price:           ${formatCurrency(result.finalPrice)}
Total savings:         ${formatCurrency(result.totalSaved)}
Effective discount:    ${formatPercent(result.effectivePct)}`;

  const toolBody = (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Original price"
          value={formatCurrency(priceNum)}
          tone="default"
          icon={<Tag className="h-3.5 w-3.5 text-primary" />}
        />
        <StatCard
          label="Final price"
          value={formatCurrency(result.finalPrice)}
          tone="emerald"
          icon={<TrendingDown className="h-3.5 w-3.5 text-emerald-500" />}
        />
        <StatCard
          label="Total savings"
          value={formatCurrency(result.totalSaved)}
          tone="primary"
          icon={<DollarSign className="h-3.5 w-3.5 text-primary" />}
          hint={`${result.steps.length} discount(s)`}
        />
        <StatCard
          label="Effective discount"
          value={formatPercent(result.effectivePct)}
          tone="primary"
          icon={<Percent className="h-3.5 w-3.5 text-primary" />}
          hint="Off original price"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* LEFT: Original price + add buttons ------------------------------ */}
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <SectionLabel>Original price & discounts</SectionLabel>

          <div className="space-y-2">
            <Label htmlFor="ds-price">Original price</Label>
            <Input
              id="ds-price"
              inputMode="decimal"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Discounts (applied top to bottom)</Label>
              <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 text-xs">
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Order matters — discounts apply to the running subtotal, so 20%
              then 10% off is not the same as 10% then 20% off the original
              (although the totals happen to match for pure percent discounts,
              they differ when mixed with fixed amounts).
            </p>

            <div className="space-y-2">
              {result.steps.length === 0 && (
                <p className="rounded-md border border-dashed bg-muted/30 px-3 py-3 text-center text-xs text-muted-foreground">
                  No discounts yet — add a percent or fixed discount below.
                </p>
              )}
              {result.steps.map((s, idx) => (
                <div key={s.step.id} className="rounded-lg border bg-background p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-none flex-col">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveStep(idx, -1)}
                        disabled={idx === 0}
                        aria-label="Move up"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveStep(idx, 1)}
                        disabled={idx === result.steps.length - 1}
                        aria-label="Move down"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Select
                          value={s.step.type}
                          onValueChange={(v) =>
                            updateStep(s.step.id, { type: v as DiscountType })
                          }
                        >
                          <SelectTrigger className="h-8 w-32 flex-none" aria-label="Discount type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">Percent (%)</SelectItem>
                            <SelectItem value="fixed">Fixed ($)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          inputMode="decimal"
                          value={s.step.value}
                          onChange={(e) => updateStep(s.step.id, { value: e.target.value })}
                          placeholder={s.step.type === "percent" ? "10" : "5.00"}
                          className="h-8 flex-1 text-right font-mono tabular-nums"
                          aria-label="Discount value"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStep(s.step.id)}
                          aria-label="Remove discount"
                          className="h-8 w-8 flex-none text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Input
                        value={s.step.label}
                        onChange={(e) => updateStep(s.step.id, { label: e.target.value })}
                        placeholder="Label (optional)"
                        className="h-8 text-xs"
                        aria-label="Discount label"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => addStep("percent")}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add % discount
              </Button>
              <Button variant="outline" size="sm" onClick={() => addStep("fixed")}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add $ discount
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT: Step-by-step breakdown ----------------------------------- */}
        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Step-by-step breakdown</SectionLabel>
            <CopyButton value={summary} size="sm" />
          </div>

          {priceNum === 0 && (
            <p className="text-sm text-muted-foreground">
              Enter an original price to see the discount breakdown.
            </p>
          )}

          {priceNum > 0 && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-md bg-background px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Starting price</span>
                  <span className="font-mono tabular-nums">{formatCurrency(priceNum)}</span>
                </div>

                {result.steps.map((s, idx) => (
                  <div
                    key={s.step.id}
                    className="rounded-lg border bg-background p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-medium">
                          {s.step.label || (s.step.type === "percent" ? "Percent discount" : "Fixed discount")}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400">
                        −{formatCurrency(s.amountOff)}
                      </span>
                    </div>
                    <div className="mt-1.5 pl-7 text-xs text-muted-foreground">
                      {s.step.type === "percent"
                        ? `${parseNumber(s.step.value).toFixed(0)}% of ${formatCurrency(priceNum - s.cumulativeSaved + s.amountOff)}`
                        : `$${parseNumber(s.step.value).toFixed(2)} off`}
                      {" · "}
                      price after = <span className="font-mono text-foreground">{formatCurrency(s.priceAfter)}</span>
                      {" · "}
                      cumulative saved = <span className="font-mono text-foreground">{formatCurrency(s.cumulativeSaved)}</span>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold">
                  <span>Final price</span>
                  <span className="font-mono tabular-nums text-primary">
                    {formatCurrency(result.finalPrice)}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Original price</span>
                  <span className="font-mono tabular-nums">{formatCurrency(priceNum)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total savings</span>
                  <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400">
                    −{formatCurrency(result.totalSaved)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t pt-2 text-base font-semibold">
                  <span>Effective discount</span>
                  <span className="font-mono tabular-nums text-primary">
                    {formatPercent(result.effectivePct)}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                <p>
                  <strong className="text-foreground">Effective discount</strong>{" "}
                  = total savings ÷ original price. Two stacked 20% discounts
                  do <em>not</em> equal 40% off — they equal 36% off (1 − 0.8 ×
                  0.8 = 0.36). Use this calculator to see the real combined
                  discount.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Stack any combination of percentage and fixed-amount discounts in the order they apply, and see exactly what the customer pays after each step. Add a 20% loyalty discount, then a 10% newsletter code, then a $5 refer-a-friend credit — the calculator walks through each discount against the running subtotal and reports the final price plus the effective combined discount percentage.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter the original price",
        description:
          "The full undiscounted price of the product or basket. All subsequent discounts apply to the running subtotal.",
      },
      {
        title: "Add discounts in the order they apply",
        description:
          "Each discount can be a percentage or a fixed amount. Order matters when mixing percent and fixed discounts — reorder with the up/down arrows to compare scenarios.",
      },
      {
        title: "Read the step-by-step breakdown",
        description:
          "Each step shows the amount subtracted, the price after the discount and the cumulative savings so far. The final price is highlighted at the bottom of the list.",
      },
      {
        title: "Compare to a flat discount",
        description:
          "The effective discount percentage shows what single flat discount would produce the same final price — useful for sanity-checking promo combinations.",
      },
    ],
    useCases: [
      "Model a Black Friday stack: 30% site-wide + extra 15% with code BLACK15 + $10 email signup credit.",
      "Verify that two stacked 20% discounts yield 36% off, not 40% — important for finance margin checks.",
      "Calculate the effective discount when a fixed-dollar promo (e.g. $25 gift card) combines with a percentage sale.",
      "Compare different discount orderings (percent-then-fixed vs fixed-then-percent) to find the most customer-friendly stack.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{ECOMMERCE_DISCLAIMER}</li>
        <li>
          Discounts apply strictly in the listed order. With pure percentage
          discounts order doesn't matter (multiplication is commutative), but
          with a mix of percent and fixed it does — a $5 off applied first
          reduces the base for a subsequent 20%, while 20% first reduces the
          base for the $5.
        </li>
        <li>
          The running subtotal never goes below $0 — any discount amount that
          exceeds the remaining subtotal is clamped to the running total. A
          $100 fixed discount on a $50 item applies $50 (not $100, no
          store-credit carryover).
        </li>
        <li>
          This tool calculates the customer-facing price only — it does not
          deduct seller-side marketplace fees, payment processing, COGS or
          shipping. Use the Shopify / Etsy / eBay calculators for net profit
          on the discounted price.
        </li>
        <li>
          Tax is not modelled. In most US jurisdictions discounts are applied
          before tax, so the tax base equals the final price after discounts —
          run the final price through a sales tax calculator separately.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why don't two 20% discounts equal 40% off?",
        a: "Because the second 20% applies to the already-discounted price, not the original. $100 → 20% off → $80 → 20% off → $64. Total savings: $36, which is 36% off — not 40%. The effective discount is always less than the sum of the percentages (unless one of them is 0%).",
      },
      {
        q: "Does order matter for stacked discounts?",
        a: "For two pure percentage discounts, no — they multiply commutatively. But mixing percentages with fixed amounts makes order matter: $5 off then 20% off $100 = ($100 − $5) × 0.8 = $76. 20% off then $5 off = $100 × 0.8 − $5 = $75. The customer saves $1 more when the percentage comes second.",
      },
      {
        q: "What happens if discounts exceed the price?",
        a: "The subtotal never goes below $0 — any discount that would push it negative is clamped to bring the subtotal to exactly $0. The remaining discount value is lost (no store-credit carryover is modelled).",
      },
      {
        q: "Can I model buy-one-get-one (BOGO) offers?",
        a: "Not directly — BOGO is a quantity-based offer, not a price-stack. Approximate BOGO-50% by adding a 25% discount on a 2-unit basket (since one unit at full price + one at half = 1.5 ÷ 2 = 75% of full price, a 25% blended discount).",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}
