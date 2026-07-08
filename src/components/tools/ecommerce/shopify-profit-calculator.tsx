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
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ShoppingBag,
  Wallet,
  Receipt,
  Truck,
  Megaphone,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatPercent,
  ECOMMERCE_DISCLAIMER,
  SHOPIFY_PLANS,
  type ShopifyPlan,
  Row,
  StatCard,
} from "./_ecommerce-helpers";

/** Payment processor selector — affects whether the external-gateway
 *  surcharge applies. Shopify Payments is the default and uses only the
 *  plan-determined credit-card rate; an external gateway also incurs the
 *  Shopify transaction fee (2%/1%/0.5% by plan). */
const PROCESSORS = [
  { key: "shopify-payments", label: "Shopify Payments (no surcharge)" },
  { key: "external", label: "External gateway (PayPal/Stripe/etc.)" },
] as const;

type ProcessorKey = (typeof PROCESSORS)[number]["key"];

export function ShopifyProfitCalculator({ tool }: { tool: ToolDefinition }) {
  const [sellingPrice, setSellingPrice] = React.useState<string>("49.99");
  const [cogs, setCogs] = React.useState<string>("15.00");
  const [shippingCost, setShippingCost] = React.useState<string>("6.50");
  const [adCost, setAdCost] = React.useState<string>("5.00");
  const [planKey, setPlanKey] = React.useState<string>(SHOPIFY_PLANS[0].key);
  const [processorKey, setProcessorKey] = React.useState<ProcessorKey>("shopify-payments");
  const [ordersPerMonth, setOrdersPerMonth] = React.useState<string>("100");

  const plan = React.useMemo<ShopifyPlan>(
    () => SHOPIFY_PLANS.find((p) => p.key === planKey) ?? SHOPIFY_PLANS[0],
    [planKey],
  );

  const price = Math.max(0, parseNumber(sellingPrice));
  const cogsNum = Math.max(0, parseNumber(cogs));
  const shipNum = Math.max(0, parseNumber(shippingCost));
  const adNum = Math.max(0, parseNumber(adCost));
  const orders = Math.max(1, parseNumber(ordersPerMonth));
  const usesExternal = processorKey === "external";

  // Credit-card processing fee (Shopify Payments rate determined by plan).
  const ccFee = (price * plan.ccRatePct) / 100 + plan.ccFixed;
  // Additional Shopify transaction fee when using an external gateway.
  const surcharge = usesExternal ? (price * plan.externalSurchargePct) / 100 : 0;
  // Allocated monthly subscription fee per order.
  const planAllocated = plan.monthlyFee / orders;

  const totalFees = ccFee + surcharge + planAllocated;
  const totalCosts = cogsNum + shipNum + adNum + totalFees;
  const profit = price - totalCosts;
  const margin = price > 0 ? (profit / price) * 100 : 0;

  const isLoss = profit < 0 && price > 0;

  const reset = () => {
    setSellingPrice("49.99");
    setCogs("15.00");
    setShippingCost("6.50");
    setAdCost("5.00");
    setPlanKey(SHOPIFY_PLANS[0].key);
    setProcessorKey("shopify-payments");
    setOrdersPerMonth("100");
    toast.info("Reset.");
  };

  const summary = `Shopify profit summary
Selling price:        ${formatCurrency(price)}
COGS:                 ${formatCurrency(cogsNum)}
Shipping cost:        ${formatCurrency(shipNum)}
Ad cost per sale:     ${formatCurrency(adNum)}
Plan:                 ${plan.label}
Processor:            ${usesExternal ? "External gateway" : "Shopify Payments"}
CC processing fee:    ${formatCurrency(ccFee)} (${plan.ccRatePct}% + $${plan.ccFixed.toFixed(2)})
${usesExternal ? `External surcharge:   ${formatCurrency(surcharge)} (${plan.externalSurchargePct}%)\n` : ""}Plan fee allocated:   ${formatCurrency(planAllocated)} ($${plan.monthlyFee}/mo ÷ ${orders} orders)
Total fees:           ${formatCurrency(totalFees)}
Total costs:          ${formatCurrency(totalCosts)}
Profit per order:     ${formatCurrency(profit)}
Margin:               ${formatPercent(margin)}`;

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <SectionLabel>Order details</SectionLabel>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sp-price">Selling price</Label>
              <Input
                id="sp-price"
                inputMode="decimal"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-cogs">Cost of goods (COGS)</Label>
              <Input
                id="sp-cogs"
                inputMode="decimal"
                value={cogs}
                onChange={(e) => setCogs(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-ship">Shipping cost (per order)</Label>
              <Input
                id="sp-ship"
                inputMode="decimal"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-ad">Ad cost (per sale)</Label>
              <Input
                id="sp-ad"
                inputMode="decimal"
                value={adCost}
                onChange={(e) => setAdCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sp-plan">Shopify plan</Label>
              <Select value={planKey} onValueChange={setPlanKey}>
                <SelectTrigger id="sp-plan" className="w-full">
                  <SelectValue placeholder="Pick a plan" />
                </SelectTrigger>
                <SelectContent>
                  {SHOPIFY_PLANS.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-processor">Payment processor</Label>
              <Select
                value={processorKey}
                onValueChange={(v) => setProcessorKey(v as ProcessorKey)}
              >
                <SelectTrigger id="sp-processor" className="w-full">
                  <SelectValue placeholder="Pick a processor" />
                </SelectTrigger>
                <SelectContent>
                  {PROCESSORS.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sp-orders">Orders per month</Label>
            <Input
              id="sp-orders"
              inputMode="numeric"
              value={ordersPerMonth}
              onChange={(e) => setOrdersPerMonth(e.target.value)}
              placeholder="100"
            />
            <p className="text-xs text-muted-foreground">
              Used to allocate your monthly Shopify subscription fee across each
              order. Higher volume = lower per-order subscription cost.
            </p>
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
              Enter a selling price to see your per-order profit.
            </p>
          )}

          {price > 0 && (
            <>
              {isLoss ? (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                  <p>
                    Costs exceed revenue — you are losing {formatCurrency(Math.abs(profit))} per
                    order. Raise price or cut costs to break even.
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Profit / order"
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
                  icon={<ShoppingBag className="h-3.5 w-3.5 text-primary" />}
                  hint="Profit ÷ selling price"
                />
              </div>

              <div className="space-y-2 rounded-lg border bg-background p-4">
                <Row label="Selling price" value={formatCurrency(price)} />
                <Row
                  label="COGS"
                  value={formatCurrency(cogsNum)}
                  muted
                  icon={<Receipt className="h-3.5 w-3.5 text-muted-foreground/70" />}
                />
                <Row
                  label="Shipping cost"
                  value={formatCurrency(shipNum)}
                  muted
                  icon={<Truck className="h-3.5 w-3.5 text-muted-foreground/70" />}
                />
                <Row
                  label="Ad cost"
                  value={formatCurrency(adNum)}
                  muted
                  icon={<Megaphone className="h-3.5 w-3.5 text-muted-foreground/70" />}
                />
                <div className="border-t pt-2">
                  <Row
                    label={`CC processing (${plan.ccRatePct}% + $${plan.ccFixed.toFixed(2)})`}
                    value={formatCurrency(ccFee)}
                    icon={<Wallet className="h-3.5 w-3.5 text-muted-foreground/70" />}
                  />
                  {usesExternal && (
                    <Row
                      label={`External gateway surcharge (${plan.externalSurchargePct}%)`}
                      value={formatCurrency(surcharge)}
                    />
                  )}
                  <Row
                    label={`Plan allocation ($${plan.monthlyFee}/mo ÷ ${orders} orders)`}
                    value={formatCurrency(planAllocated)}
                  />
                </div>
                <div className="border-t pt-2">
                  <Row label="Total fees" value={formatCurrency(totalFees)} />
                  <Row label="Total costs" value={formatCurrency(totalCosts)} />
                </div>
                <div className="border-t pt-2">
                  <Row
                    label="Profit / order"
                    value={formatCurrency(profit)}
                    highlight
                    large
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
                  <strong className="text-foreground">Plan:</strong> {plan.label} ·{" "}
                  <strong className="text-foreground">CC rate:</strong> {plan.ccRatePct}% +
                  ${plan.ccFixed.toFixed(2)} ·{" "}
                  <strong className="text-foreground">Subscription:</strong> $
                  {plan.monthlyFee}/mo
                  {usesExternal && (
                    <>
                      {" "}· <strong className="text-foreground">External surcharge:</strong>{" "}
                      {plan.externalSurchargePct}% (avoids Shopify Payments)
                    </>
                  )}
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
      "Estimate the profit on each Shopify order after the credit-card processing fee, plan subscription allocation, COGS, shipping and ad spend. Choose your plan, payment processor and monthly order volume, then watch the per-order profit and margin update live as you type.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter your selling price and COGS",
        description:
          "Selling price is what the customer pays. COGS is the direct cost of producing or sourcing one unit — not your overheads.",
      },
      {
        title: "Add shipping and ad cost per sale",
        description:
          "Shipping cost is what you pay to ship one order. Ad cost per sale is your marketing spend divided by orders — useful when running paid ads.",
      },
      {
        title: "Pick your Shopify plan and processor",
        description:
          "Basic ($39/mo), Shopify ($105/mo) and Advanced ($399/mo) each have different credit-card rates. Switching to an external gateway like PayPal or Stripe adds Shopify's transaction surcharge (2%/1%/0.5% by plan).",
      },
      {
        title: "Enter monthly order volume",
        description:
          "Your monthly plan subscription is allocated across the number of orders you ship in a month — more orders means a smaller slice per sale.",
      },
    ],
    useCases: [
      "Price a new product so it stays profitable after Shopify Payments and plan fees.",
      "Decide whether upgrading from Basic to Shopify pays off at your current volume.",
      "Compare the all-in cost of using Shopify Payments vs. routing through an external gateway.",
      "Project per-order profit when scaling ad spend from $2 to $8 per sale.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{ECOMMERCE_DISCLAIMER}</li>
        <li>
          The Shopify Payments credit-card rate depends on the plan: 2.9%+$0.30
          on Basic, 2.6%+$0.30 on Shopify, 2.4%+$0.30 on Advanced. American
          Express and some international cards may carry a higher rate.
        </li>
        <li>
          If you use an external gateway (e.g. PayPal Express) instead of Shopify
          Payments, Shopify still charges an additional transaction fee of
          2%/1%/0.5% (Basic/Shopify/Advanced) on top of the gateway's own fee.
          The external surcharge toggle adds only the Shopify portion here.
        </li>
        <li>
          Sales tax, returns, chargebacks, refunds and currency-conversion fees
          are not modelled. Plan subscription is allocated evenly across the
          orders-per-month figure you enter.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why does my per-order plan allocation change with volume?",
        a: "Shopify charges the monthly subscription as a flat fee, not per transaction. Dividing it by your monthly order count approximates the slice each sale bears — at 10 orders/month a $39 plan costs $3.90 per order; at 1,000 orders it's $0.04.",
      },
      {
        q: "When should I switch from Basic to Shopify?",
        a: "The higher plans reduce the credit-card rate (Basic 2.9% → Shopify 2.6% → Advanced 2.4%). The break-even point is when the per-order processing savings covers the difference in monthly subscription. At $50 average order value, the 0.3% savings on Shopify vs Basic is $0.15/order — so ~440 orders/month covers the $66/month upgrade gap.",
      },
      {
        q: "Does this include Shopify Shipping insurance or app fees?",
        a: "No. Only COGS, shipping cost, ad cost per sale, the credit-card fee and the plan subscription allocation are deducted. App subscriptions, theme costs, shipping insurance and payment-authorisation holds are extra.",
      },
      {
        q: "How accurate are these fee rates?",
        a: "The rates reflect Shopify's US pricing as published in early 2025. Regional pricing, custom Plus contracts and promotional rates may differ — confirm on shopify.com/pricing before relying on the figures for pricing decisions.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}
