"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  RotateCcw,
  Plus,
  Trash2,
  Package,
  Tags,
  TrendingUp,
  Percent,
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
import { useCurrency, CurrencySelector, money } from "@/components/dueneo/currency-selector";

interface BundleItem {
  id: string;
  name: string;
  price: string;
  cost: string;
}

const SAMPLE_ITEMS: BundleItem[] = [
  { id: "b1", name: "Cleanser", price: "18.00", cost: "5.00" },
  { id: "b2", name: "Toner", price: "22.00", cost: "6.50" },
  { id: "b3", name: "Moisturiser", price: "32.00", cost: "9.00" },
];

let itemCounter = 100;
function makeId(): string {
  itemCounter += 1;
  return `b${itemCounter}_${Date.now()}`;
}

export function BundlePricingCalculator({ tool }: { tool: ToolDefinition }) {
  const [items, setItems] = React.useState<BundleItem[]>(SAMPLE_ITEMS);
  const [discountPct, setDiscountPct] = React.useState<number>(15);
  const [customMode, setCustomMode] = React.useState<boolean>(false);
  const [customBundlePrice, setCustomBundlePrice] = React.useState<string>("60.00");
  const { code: currency, setCode: setCurrency } = useCurrency();
  const fmt = (v: number) => money(v, currency);

  const parsed = items.map((i) => ({
    ...i,
    priceNum: Math.max(0, parseNumber(i.price)),
    costNum: Math.max(0, parseNumber(i.cost)),
  }));

  const totalIndividualPrice = parsed.reduce((a, i) => a + i.priceNum, 0);
  const totalIndividualCost = parsed.reduce((a, i) => a + i.costNum, 0);

  const autoBundlePrice = Math.max(
    0,
    totalIndividualPrice * (1 - discountPct / 100),
  );
  const customBundleNum = Math.max(0, parseNumber(customBundlePrice));
  const bundlePrice = customMode ? customBundleNum : autoBundlePrice;

  const savings = Math.max(0, totalIndividualPrice - bundlePrice);
  const effectiveDiscountPct =
    totalIndividualPrice > 0 ? (savings / totalIndividualPrice) * 100 : 0;

  // Bundle margin if cost entered.
  const bundleCost = totalIndividualCost;
  const bundleProfit = bundlePrice - bundleCost;
  const bundleMargin = bundlePrice > 0 ? (bundleProfit / bundlePrice) * 100 : 0;

  const updateItem = (id: string, patch: Partial<BundleItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { id: makeId(), name: "", price: "", cost: "" }]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const reset = () => {
    setItems(SAMPLE_ITEMS);
    setDiscountPct(15);
    setCustomMode(false);
    setCustomBundlePrice("60.00");
    toast.info("Reset.");
  };

  const summary = `Bundle pricing summary
${parsed.length} item(s) in bundle:
${parsed
  .map(
    (i) =>
      `  ${i.name || "Untitled"}: price ${fmt(i.priceNum)}, cost ${fmt(i.costNum)}`,
  )
  .join("\n")}

Total individual price:  ${fmt(totalIndividualPrice)}
Total individual cost:   ${fmt(totalIndividualCost)}
Bundle mode:             ${customMode ? "Custom price" : `Auto (−${discountPct.toFixed(0)}%)`}
Bundle price:            ${fmt(bundlePrice)}
Savings vs individual:   ${fmt(savings)} (${formatPercent(effectiveDiscountPct)})
Bundle cost:             ${fmt(bundleCost)}
Bundle profit:           ${fmt(bundleProfit)}
Bundle margin:           ${formatPercent(bundleMargin)}`;

  const toolBody = (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Individual total"
          value={fmt(totalIndividualPrice)}
          tone="default"
          icon={<Package className="h-3.5 w-3.5 text-primary" />}
          hint={`${items.length} item(s)`}
        />
        <StatCard
          label="Bundle price"
          value={fmt(bundlePrice)}
          tone="primary"
          icon={<Tags className="h-3.5 w-3.5 text-primary" />}
          hint={customMode ? "Custom" : `Auto −${discountPct.toFixed(0)}%`}
        />
        <StatCard
          label="Buyer savings"
          value={fmt(savings)}
          tone="emerald"
          icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
          hint={`${formatPercent(effectiveDiscountPct)} off`}
        />
        <StatCard
          label="Bundle margin"
          value={formatPercent(bundleMargin)}
          tone={bundleMargin < 0 ? "rose" : "emerald"}
          icon={<Percent className="h-3.5 w-3.5 text-primary" />}
          hint={`Profit ${fmt(bundleProfit)}`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* LEFT: Bundle items + cost ------------------------------------- */}
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Bundle items</SectionLabel>
            <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 text-xs">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
          <CurrencySelector value={currency} onChange={setCurrency} id="bp-currency" />

          <div className="space-y-2">
            {parsed.map((i) => (
              <div key={i.id} className="rounded-lg border bg-background p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={i.name}
                    onChange={(e) => updateItem(i.id, { name: e.target.value })}
                    placeholder="Product name"
                    className="h-8 flex-1"
                    aria-label="Product name"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(i.id)}
                    aria-label="Remove product"
                    className="h-8 w-8 flex-none text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor={`bp-price-${i.id}`}
                      className="text-[11px] text-muted-foreground"
                    >
                      Price
                    </Label>
                    <Input
                      id={`bp-price-${i.id}`}
                      inputMode="decimal"
                      value={i.price}
                      onChange={(e) => updateItem(i.id, { price: e.target.value })}
                      placeholder="0.00"
                      className="h-8 text-right font-mono tabular-nums"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor={`bp-cost-${i.id}`}
                      className="text-[11px] text-muted-foreground"
                    >
                      Cost (optional)
                    </Label>
                    <Input
                      id={`bp-cost-${i.id}`}
                      inputMode="decimal"
                      value={i.cost}
                      onChange={(e) => updateItem(i.id, { cost: e.target.value })}
                      placeholder="0.00"
                      className="h-8 text-right font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>
            ))}
            {parsed.length === 0 && (
              <p className="rounded-md border border-dashed bg-muted/30 px-3 py-3 text-center text-xs text-muted-foreground">
                No items in the bundle yet — add at least two to make a bundle.
              </p>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={addItem} className="w-full">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add product
          </Button>
        </div>

        {/* RIGHT: Bundle pricing --------------------------------------- */}
        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Bundle pricing</SectionLabel>
            <CopyButton value={summary} size="sm" />
          </div>

          {/* Bundle mode toggle */}
          <label
            htmlFor="bp-custom"
            className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3"
          >
            <Switch
              id="bp-custom"
              checked={customMode}
              onCheckedChange={setCustomMode}
            />
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Custom bundle price</div>
              <p className="text-xs text-muted-foreground">
                Toggle off to auto-calculate from a discount percentage. Toggle
                on to set the bundle price manually and back-calculate the
                effective discount.
              </p>
            </div>
          </label>

          {!customMode && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="bp-disc">Bundle discount</Label>
                <span className="font-mono text-sm tabular-nums text-primary">
                  {discountPct.toFixed(0)}%
                </span>
              </div>
              <Slider
                id="bp-disc"
                min={0}
                max={80}
                step={1}
                value={[discountPct]}
                onValueChange={(v) => setDiscountPct(v[0])}
                aria-label="Bundle discount percentage"
              />
              <div className="flex items-center gap-2">
                <Input
                  inputMode="decimal"
                  value={String(discountPct)}
                  onChange={(e) => {
                    const n = parseNumber(e.target.value);
                    setDiscountPct(Math.min(80, Math.max(0, n)));
                  }}
                  className="w-24"
                  aria-label="Bundle discount percentage value"
                />
                <span className="text-xs text-muted-foreground">
                  Applied to the individual-price total.
                </span>
              </div>
            </div>
          )}

          {customMode && (
            <div className="space-y-2">
              <Label htmlFor="bp-custom-price">Custom bundle price</Label>
              <Input
                id="bp-custom-price"
                inputMode="decimal"
                value={customBundlePrice}
                onChange={(e) => setCustomBundlePrice(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Enter the price you'll charge for the bundle. The effective
                discount is calculated against the sum of individual prices.
              </p>
            </div>
          )}

          {/* Computed breakdown */}
          <div className="space-y-2 rounded-lg border bg-background p-4">
            <Row
              label="Total individual price"
              value={fmt(totalIndividualPrice)}
              hint={`${items.length} item(s)`}
            />
            <Row
              label="Total individual cost"
              value={fmt(totalIndividualCost)}
              muted
            />
            <div className="border-t pt-2">
              <Row
                label={customMode ? "Custom bundle price" : `Bundle price (−${discountPct.toFixed(0)}%)`}
                value={fmt(bundlePrice)}
                highlight
              />
              <Row
                label="Buyer savings"
                value={fmt(savings)}
                hint={`${formatPercent(effectiveDiscountPct)} off`}
              />
            </div>
            <div className="border-t pt-2">
              <Row label="Bundle cost" value={fmt(bundleCost)} muted />
              <Row
                label="Bundle profit"
                value={fmt(bundleProfit)}
                highlight={bundleProfit >= 0}
              />
              <Row
                label="Bundle margin"
                value={formatPercent(bundleMargin)}
                large
                highlight={bundleMargin >= 0}
              />
            </div>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">Auto mode</strong>: bundle
              price = total × (1 − discount%).{" "}
              <strong className="text-foreground">Custom mode</strong>: enter
              the bundle price and the effective discount is back-calculated.{" "}
              <strong className="text-foreground">Margin</strong> requires cost
              on every item — leave cost blank to ignore margin calculations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Build a product bundle and watch the bundle price, buyer savings and bundle margin update live. Add as many products as you like with their individual prices and (optionally) costs. Choose auto mode to apply a discount percentage to the individual-price total, or switch to custom mode to set the bundle price yourself and back-calculate the effective discount.",
    tool: toolBody,
    howTo: [
      {
        title: "Add products to the bundle",
        description:
          "Each product has a name, an individual price and an optional cost. Cost is needed to compute bundle margin — leave it blank to skip margin calculations.",
      },
      {
        title: "Choose a pricing mode",
        description:
          "Auto mode applies a discount percentage to the total of individual prices. Custom mode lets you type the bundle price directly and back-calculates the effective discount.",
      },
      {
        title: "Adjust the discount or custom price",
        description:
          "In auto mode drag the slider or type a percentage (0–80%). In custom mode type the bundle price — the effective discount updates against the individual total.",
      },
      {
        title: "Read the breakdown",
        description:
          "The result panel shows individual total, bundle price, buyer savings (absolute and effective %), bundle cost, bundle profit and bundle margin.",
      },
    ],
    useCases: [
      "Bundle a cleanser + toner + moisturiser at 15% off to lift average order value in a skincare store.",
      "Back-calculate the effective discount when you've already committed to a $49 bundle price.",
      "Confirm bundle margin stays positive after factoring in per-item costs.",
      "A/B test different bundle discount levels (10% vs 20% vs 30%) to find the profit-maximising price.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{ECOMMERCE_DISCLAIMER}</li>
        <li>
          Per-item cost is optional — leave it blank to ignore bundle margin
          calculations and focus on bundle price and savings only. If any items
          have cost entered and others don't, the bundle margin is calculated
          on the items that do (understating true cost).
        </li>
        <li>
          The discount slider is capped at 80% to prevent negative bundle
          prices. Above 100% the bundle would pay the buyer — not realistic.
        </li>
        <li>
          This tool models gross bundle margin only — it does not deduct
          marketplace fees, payment processing, shipping, or taxes. Use the
          Shopify / Etsy / eBay calculators on top of the bundle price to get
          net per-order profit.
        </li>
        <li>
          Quantity per item is always 1 — for bundles with multiple units of the
          same SKU (e.g. \"3-pack of cleanser\"), either add the SKU three times
          or use a unit price × 3 in the price field.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What's the difference between auto and custom mode?",
        a: "Auto mode calculates the bundle price as total individual price × (1 − discount%). Custom mode lets you type the bundle price directly and back-calculates the effective discount percentage. Use custom mode when you've already committed to a price (e.g. $49.99) and want to see what discount that represents.",
      },
      {
        q: "Why do I need to enter per-item cost?",
        a: "Bundle margin (profit ÷ bundle price) requires knowing the bundle's total cost. We sum the cost of every item to get the bundle cost. If you leave cost blank, the calculator can only show price and savings — not margin or profit.",
      },
      {
        q: "Can the discount exceed 100%?",
        a: "No — the slider is capped at 80% to keep the bundle price positive. If you need to give the bundle away for free (100% off) or as a loss-leader, switch to custom mode and enter $0.00 as the bundle price.",
      },
      {
        q: "How does this interact with marketplace fees?",
        a: "The bundle price is what you charge the buyer. To see your net profit after Shopify/Amazon/Etsy fees, take the bundle price and run it through the relevant fee calculator — that's a separate calculation layered on top of this one.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}
