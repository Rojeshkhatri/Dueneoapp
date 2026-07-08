"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  RotateCcw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Music2,
  CreditCard,
  Truck,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatPercent,
  ECOMMERCE_DISCLAIMER,
  Row,
  StatCard,
} from "./_ecommerce-helpers";

// TikTok Shop 2025 fee schedule (US, embedded as constants).
const TIKTOK_COMMISSION_DEFAULT_PCT = 8; // default 8%; user can adjust 5–8%
const TIKTOK_PAYMENT_PCT = 2.5; // 2.5% payment processing
const TIKTOK_PAYMENT_FIXED = 0.3; // + $0.30 per order
const TIKTOK_COMMISSION_MIN = 0;
const TIKTOK_COMMISSION_MAX = 30;

export function TikTokShopProfitCalculator({ tool }: { tool: ToolDefinition }) {
  const [sellingPrice, setSellingPrice] = React.useState<string>("39.99");
  const [cogs, setCogs] = React.useState<string>("12.00");
  const [shipping, setShipping] = React.useState<string>("4.95");
  const [commissionPct, setCommissionPct] = React.useState<number>(TIKTOK_COMMISSION_DEFAULT_PCT);

  const price = Math.max(0, parseNumber(sellingPrice));
  const cogsNum = Math.max(0, parseNumber(cogs));
  const shipNum = Math.max(0, parseNumber(shipping));

  // TikTok commission applies to the selling price (item only).
  const commission = (price * commissionPct) / 100;
  // Payment processing fee applies to the order total.
  const paymentFee = (price * TIKTOK_PAYMENT_PCT) / 100 + TIKTOK_PAYMENT_FIXED;

  const totalFees = commission + paymentFee;
  const totalCosts = cogsNum + shipNum + totalFees;
  const profit = price - totalCosts;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  const isLoss = profit < 0 && price > 0;

  const reset = () => {
    setSellingPrice("39.99");
    setCogs("12.00");
    setShipping("4.95");
    setCommissionPct(TIKTOK_COMMISSION_DEFAULT_PCT);
    toast.info("Reset.");
  };

  const summary = `TikTok Shop profit summary
Selling price:        ${formatCurrency(price)}
COGS:                 ${formatCurrency(cogsNum)}
Shipping:             ${formatCurrency(shipNum)}
Commission:           ${formatPercent(commissionPct)} → ${formatCurrency(commission)}
Payment processing:   ${formatCurrency(paymentFee)} (${TIKTOK_PAYMENT_PCT}% + $${TIKTOK_PAYMENT_FIXED.toFixed(2)})

Total fees:           ${formatCurrency(totalFees)}
Total costs:          ${formatCurrency(totalCosts)}
Profit per sale:      ${formatCurrency(profit)}
Margin:               ${formatPercent(margin)}`;

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <SectionLabel>Sale details</SectionLabel>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tt-price">Selling price</Label>
              <Input
                id="tt-price"
                inputMode="decimal"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tt-cogs">Cost of goods (COGS)</Label>
              <Input
                id="tt-cogs"
                inputMode="decimal"
                value={cogs}
                onChange={(e) => setCogs(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tt-ship">Shipping cost (per order)</Label>
              <Input
                id="tt-ship"
                inputMode="decimal"
                value={shipping}
                onChange={(e) => setShipping(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="tt-commission">TikTok commission</Label>
              <span className="font-mono text-sm tabular-nums text-primary">
                {commissionPct.toFixed(1)}%
              </span>
            </div>
            <Slider
              id="tt-commission"
              min={TIKTOK_COMMISSION_MIN}
              max={TIKTOK_COMMISSION_MAX}
              step={0.5}
              value={[commissionPct]}
              onValueChange={(v) => setCommissionPct(v[0])}
              aria-label="TikTok commission percentage"
            />
            <div className="flex items-center gap-2">
              <Input
                inputMode="decimal"
                value={String(commissionPct)}
                onChange={(e) => {
                  const n = parseNumber(e.target.value);
                  setCommissionPct(
                    Math.min(TIKTOK_COMMISSION_MAX, Math.max(TIKTOK_COMMISSION_MIN, n)),
                  );
                }}
                className="w-24"
                aria-label="TikTok commission percentage value"
              />
              <span className="text-xs text-muted-foreground">
                Typical range 5–8% for most categories. Some promotional
                categories run at 2–3%.
              </span>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Result</SectionLabel>
            <CopyButton value={summary} size="sm" />
          </div>

          {price === 0 && (
            <p className="text-sm text-muted-foreground">
              Enter a selling price to see your per-sale profit.
            </p>
          )}

          {price > 0 && (
            <>
              {isLoss && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                  <p>
                    Costs exceed revenue — you're losing {formatCurrency(Math.abs(profit))} per
                    sale. Raise price, cut COGS, or reduce commission.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Profit / sale"
                  value={formatCurrency(profit)}
                  tone={isLoss ? "rose" : "emerald"}
                  icon={
                    isLoss ? (
                      <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                    ) : (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    )
                  }
                  hint={`After ${formatCurrency(totalCosts)} in costs`}
                />
                <StatCard
                  label="Margin"
                  value={formatPercent(margin)}
                  icon={<Music2 className="h-3.5 w-3.5 text-primary" />}
                  hint="Profit ÷ selling price"
                />
              </div>

              <div className="space-y-2 rounded-lg border bg-background p-4">
                <Row label="Selling price" value={formatCurrency(price)} />
                <Row
                  label="COGS"
                  value={formatCurrency(cogsNum)}
                  muted
                />
                <Row
                  label="Shipping cost"
                  value={formatCurrency(shipNum)}
                  muted
                  icon={<Truck className="h-3.5 w-3.5 text-muted-foreground/70" />}
                />
                <div className="border-t pt-2">
                  <Row
                    label={`TikTok commission (${commissionPct.toFixed(1)}%)`}
                    value={formatCurrency(commission)}
                    icon={<Music2 className="h-3.5 w-3.5 text-muted-foreground/70" />}
                  />
                  <Row
                    label={`Payment processing (${TIKTOK_PAYMENT_PCT}% + $${TIKTOK_PAYMENT_FIXED.toFixed(2)})`}
                    value={formatCurrency(paymentFee)}
                    icon={<CreditCard className="h-3.5 w-3.5 text-muted-foreground/70" />}
                  />
                </div>
                <div className="border-t pt-2">
                  <Row label="Total fees" value={formatCurrency(totalFees)} />
                  <Row label="Total costs" value={formatCurrency(totalCosts)} />
                </div>
                <div className="border-t pt-2">
                  <Row
                    label="Profit / sale"
                    value={formatCurrency(profit)}
                    large
                    highlight
                  />
                  <Row
                    label="Margin"
                    value={formatPercent(margin)}
                    highlight={!isLoss}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                <p>
                  <strong className="text-foreground">Commission</strong> = {commissionPct.toFixed(1)}%
                  × selling price. <strong className="text-foreground">Payment processing</strong> ={" "}
                  {TIKTOK_PAYMENT_PCT}% + ${TIKTOK_PAYMENT_FIXED.toFixed(2)} per order. Commission
                  is typically 5–8% but varies by category, region and promotional
                  program — adjust the slider to match your seller dashboard.
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
      "Estimate the profit on each TikTok Shop sale after TikTok's seller commission, the 2.5% + $0.30 payment processing fee, COGS and shipping. Drag the commission slider to match your seller dashboard — typical rates fall in the 5–8% range — and watch your per-sale profit and margin update live.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter your selling price and COGS",
        description:
          "Selling price is what the buyer pays on TikTok Shop. COGS is the direct cost of sourcing or producing one unit.",
      },
      {
        title: "Enter your shipping cost per order",
        description:
          "What you pay the carrier to ship one order — not what the buyer pays for shipping (TikTok's shipping subsidies vary by program).",
      },
      {
        title: "Adjust the commission percentage",
        description:
          "TikTok's commission typically falls between 5% and 8%, but varies by category and promotional program. Drag the slider or type the exact rate from your seller dashboard.",
      },
      {
        title: "Read the profit breakdown",
        description:
          "The result panel shows commission, payment processing, total fees, total costs and per-sale profit with the margin percentage.",
      },
    ],
    useCases: [
      "Price a new TikTok Shop listing to keep a target margin after commission and fees.",
      "Model how a commission increase from 5% to 8% (e.g. exiting a promotional program) impacts profit.",
      "Decide whether to absorb shipping costs or pass them to the buyer at different price points.",
      "Compare TikTok Shop net proceeds to Amazon FBA or Shopify for the same SKU.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{ECOMMERCE_DISCLAIMER}</li>
        <li>
          TikTok's commission rate varies by category, sub-category, region and
          promotional program. The 5–8% typical range reflects common rates but
          some categories may charge 3% or as much as 12% — always confirm with
          your seller dashboard.
        </li>
        <li>
          Payment processing of 2.5% + $0.30 reflects TikTok Shop's standard
          US rate via Stripe. Rates in other markets may differ.
        </li>
        <li>
          Affiliate commissions, creator funds, return shipping, restocking
          fees, and TikTok Shop ads spend are not modelled. Sales tax is
          collected and remitted by TikTok and excluded from this calc.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What is TikTok Shop's commission rate?",
        a: "It varies by category, region and promotional program. Most categories sit in the 5–8% range as of 2025. TikTok sometimes runs promotional periods with reduced commission (e.g. 2–3%) to attract sellers. Check your seller dashboard under \"Fees and Charges\" for your exact rate.",
      },
      {
        q: "Is the payment processing fee in addition to the commission?",
        a: "Yes. TikTok Shop charges both a commission on the item price AND a payment processing fee (2.5% + $0.30 in the US) for handling the transaction. This calculator adds both.",
      },
      {
        q: "Does the commission apply to shipping?",
        a: "Usually no — TikTok's commission applies to the item price only. Payment processing applies to the order total (item + shipping + tax). This calculator follows that convention.",
      },
      {
        q: "Can I model affiliate commissions for creator-led sales?",
        a: "Not directly. If you're running an affiliate program, add the affiliate payout percentage (typically 10–25%) as an additional cost line — bump the commission slider up by that amount, or model it separately as part of COGS for the affected units.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}
