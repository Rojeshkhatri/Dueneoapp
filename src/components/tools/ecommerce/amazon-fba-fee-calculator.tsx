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
  Package,
  Ruler,
  Weight,
  TrendingUp,
  Boxes,
  Warehouse,
  Tag,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatPercent,
  formatNumber,
  ECOMMERCE_DISCLAIMER,
  AMAZON_CATEGORIES,
  AMAZON_STORAGE_FEES,
  amazonSizeTier,
  amazonFulfilmentFee,
  cubicFeetFromInches,
  type AmazonCategory,
  type AmazonSizeTier,
  Row,
  StatCard,
} from "./_ecommerce-helpers";

const SEASONS = [
  { key: "jan-sep", label: "Jan–Sep (off-peak)" },
  { key: "oct-dec", label: "Oct–Dec (peak season)" },
] as const;
type SeasonKey = (typeof SEASONS)[number]["key"];

export function AmazonFbaFeeCalculator({ tool }: { tool: ToolDefinition }) {
  const [categoryKey, setCategoryKey] = React.useState<string>(AMAZON_CATEGORIES[8].key);
  const [price, setPrice] = React.useState<string>("29.99");
  const [weightLb, setWeightLb] = React.useState<string>("1.5");
  const [lengthIn, setLengthIn] = React.useState<string>("10");
  const [widthIn, setWidthIn] = React.useState<string>("8");
  const [heightIn, setHeightIn] = React.useState<string>("3");
  const [season, setSeason] = React.useState<SeasonKey>("jan-sep");

  const category = React.useMemo<AmazonCategory>(
    () => AMAZON_CATEGORIES.find((c) => c.key === categoryKey) ?? AMAZON_CATEGORIES[0],
    [categoryKey],
  );

  const priceNum = Math.max(0, parseNumber(price));
  const weight = Math.max(0, parseNumber(weightLb));
  const length = Math.max(0, parseNumber(lengthIn));
  const width = Math.max(0, parseNumber(widthIn));
  const height = Math.max(0, parseNumber(heightIn));

  const dims = { lengthIn: length, widthIn: width, heightIn: height, weightLb: weight };
  const tier = amazonSizeTier(dims);
  const cf = cubicFeetFromInches(length, width, height);

  // Referral fee: max(pct × price, minReferral). Some categories (e.g. books)
  // have no minimum, hence the minReferral=0 handling.
  const referralByPct = (priceNum * category.referralPct) / 100;
  const referralFee = Math.max(referralByPct, category.minReferral);

  const fulfilmentFee = amazonFulfilmentFee(tier, weight);

  const storageRatePerCf =
    season === "jan-sep"
      ? AMAZON_STORAGE_FEES[tier].janSep
      : AMAZON_STORAGE_FEES[tier].octDec;
  const monthlyStorage = cf * storageRatePerCf;

  const totalFbaFees = referralFee + fulfilmentFee + monthlyStorage;
  const netProceeds = priceNum - totalFbaFees;
  const feePctOfPrice = priceNum > 0 ? (totalFbaFees / priceNum) * 100 : 0;

  const reset = () => {
    setCategoryKey(AMAZON_CATEGORIES[8].key);
    setPrice("29.99");
    setWeightLb("1.5");
    setLengthIn("10");
    setWidthIn("8");
    setHeightIn("3");
    setSeason("jan-sep");
    toast.info("Reset.");
  };

  const summary = `Amazon FBA fee breakdown
Product price:        ${formatCurrency(priceNum)}
Category:             ${category.label}
Size tier:            ${tier === "standard" ? "Standard-Size" : "Large Bulky"}
Dimensions:           ${length}" × ${width}" × ${height}" (${formatNumber(cf, { maximumFractionDigits: 3 })} cu ft)
Weight:               ${formatNumber(weight, { maximumFractionDigits: 2 })} lb
Season:               ${season === "jan-sep" ? "Jan–Sep" : "Oct–Dec"}

Referral fee:         ${formatCurrency(referralFee)} (${category.referralPct}%${category.minReferral > 0 ? `, min $${category.minReferral}` : ""})
Fulfilment fee:       ${formatCurrency(fulfilmentFee)} (by ${tier} tier + weight)
Monthly storage:      ${formatCurrency(monthlyStorage)} ($${storageRatePerCf.toFixed(2)}/cu ft × ${formatNumber(cf, { maximumFractionDigits: 3 })} cu ft)

Total FBA fees:       ${formatCurrency(totalFbaFees)} (${formatPercent(feePctOfPrice)} of price)
Net proceeds:         ${formatCurrency(netProceeds)}`;

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <SectionLabel>Product details</SectionLabel>

          <div className="space-y-2">
            <Label htmlFor="am-cat">Category</Label>
            <Select value={categoryKey} onValueChange={setCategoryKey}>
              <SelectTrigger id="am-cat" className="w-full">
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {AMAZON_CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label} ({c.referralPct}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Referral fee is the higher of {category.referralPct}% of price
              {category.minReferral > 0 ? ` or $${category.minReferral.toFixed(2)}` : " (no minimum)"}.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="am-price">Product price</Label>
              <Input
                id="am-price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="am-weight">Weight (lb)</Label>
              <Input
                id="am-weight"
                inputMode="decimal"
                value={weightLb}
                onChange={(e) => setWeightLb(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dimensions (inches)</Label>
            <p className="text-xs text-muted-foreground">
              Longest, median and shortest side — order doesn't matter, the size
              tier is computed automatically.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Input
                inputMode="decimal"
                value={lengthIn}
                onChange={(e) => setLengthIn(e.target.value)}
                aria-label="Length in inches"
                placeholder="L"
              />
              <Input
                inputMode="decimal"
                value={widthIn}
                onChange={(e) => setWidthIn(e.target.value)}
                aria-label="Width in inches"
                placeholder="W"
              />
              <Input
                inputMode="decimal"
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                aria-label="Height in inches"
                placeholder="H"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="am-season">Storage season</Label>
            <Select
              value={season}
              onValueChange={(v) => setSeason(v as SeasonKey)}
            >
              <SelectTrigger id="am-season" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEASONS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {priceNum === 0 && (
            <p className="text-sm text-muted-foreground">
              Enter a product price to see the FBA fee breakdown.
            </p>
          )}

          {priceNum > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Net proceeds"
                  value={formatCurrency(netProceeds)}
                  tone={netProceeds < 0 ? "rose" : "emerald"}
                  icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                  hint={`After ${formatCurrency(totalFbaFees)} in fees`}
                />
                <StatCard
                  label="Total FBA fees"
                  value={formatCurrency(totalFbaFees)}
                  tone="primary"
                  icon={<Boxes className="h-3.5 w-3.5 text-primary" />}
                  hint={`${formatPercent(feePctOfPrice)} of price`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Size tier"
                  value={tier === "standard" ? "Standard" : "Large Bulky"}
                  icon={<Package className="h-3.5 w-3.5 text-primary" />}
                  hint={`${formatNumber(cf, { maximumFractionDigits: 3 })} cu ft`}
                />
                <StatCard
                  label="Referral fee"
                  value={formatCurrency(referralFee)}
                  icon={<Tag className="h-3.5 w-3.5 text-primary" />}
                  hint={`${category.referralPct}% of price`}
                />
              </div>

              <div className="space-y-2 rounded-lg border bg-background p-4">
                <Row label="Product price" value={formatCurrency(priceNum)} />
                <div className="border-t pt-2">
                  <Row
                    label="Referral fee"
                    value={formatCurrency(referralFee)}
                    hint={`${category.referralPct}%${category.minReferral > 0 ? `, min $${category.minReferral.toFixed(2)}` : ""}`}
                  />
                  <Row
                    label="Fulfilment fee"
                    value={formatCurrency(fulfilmentFee)}
                    hint={`${tier === "standard" ? "Standard" : "Large"} · ${formatNumber(weight, { maximumFractionDigits: 2 })} lb`}
                  />
                  <Row
                    label="Monthly storage"
                    value={formatCurrency(monthlyStorage)}
                    hint={`$${storageRatePerCf.toFixed(2)}/cf × ${formatNumber(cf, { maximumFractionDigits: 3 })} cf`}
                  />
                </div>
                <div className="border-t pt-2">
                  <Row label="Total FBA fees" value={formatCurrency(totalFbaFees)} highlight />
                  <Row
                    label="Net proceeds"
                    value={formatCurrency(netProceeds)}
                    large
                    highlight={netProceeds >= 0}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1">
                    <Ruler className="h-3.5 w-3.5 text-primary" />
                    {length}" × {width}" × {height}"
                  </span>
                  <span className="flex items-center gap-1">
                    <Weight className="h-3.5 w-3.5 text-primary" />
                    {formatNumber(weight, { maximumFractionDigits: 2 })} lb
                  </span>
                  <span className="flex items-center gap-1">
                    <Warehouse className="h-3.5 w-3.5 text-primary" />
                    {formatNumber(cf, { maximumFractionDigits: 3 })} cu ft
                  </span>
                  <span>
                    Standard: ≤ 18" longest / ≤ 14" median / ≤ 8" shortest /
                    ≤ 20 lb. Anything larger is Large Bulky.
                  </span>
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
      "Estimate the Amazon FBA fees on a single SKU: referral fee by category, fulfilment fee by size tier and weight, and monthly storage fee by tier and season. Enter the price, dimensions and weight and the calculator auto-detects whether your product is Standard-Size or Large Bulky, then breaks down every fee Amazon will deduct from your sale.",
    tool: toolBody,
    howTo: [
      {
        title: "Pick your product's category",
        description:
          "Referral fees range from 6% on Personal Computers to 20% on Jewelry. Each category has its own rate — pick the closest match.",
      },
      {
        title: "Enter price, weight and dimensions",
        description:
          "Dimensions are in inches, weight in pounds. Order of L/W/H doesn't matter — the size tier is computed from the longest, median and shortest sides.",
      },
      {
        title: "Choose the storage season",
        description:
          "Amazon charges peak-season storage rates Oct–Dec — switch the dropdown to see how Q4 storage affects your net proceeds.",
      },
      {
        title: "Read the breakdown",
        description:
          "The result shows referral fee, fulfilment fee, monthly storage fee, total FBA fees as a percentage of price, and net proceeds.",
      },
    ],
    useCases: [
      "Decide whether a low-margin product is worth listing on Amazon FBA vs. fulfilled by merchant.",
      "Compare Standard-Size vs. Large Bulky fees before changing your packaging dimensions.",
      "Forecast Q4 net proceeds by switching to the Oct–Dec storage season.",
      "Set a minimum advertised price that keeps your margin positive after referral + fulfilment.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{ECOMMERCE_DISCLAIMER}</li>
        <li>
          Referral fee minimums ($0.30 on most categories, $0 on books/music)
          are applied where applicable. Some categories have tiered rates (e.g.
          8% above $10, 15% below $10 for Health & Beauty) — this calculator
          uses a single rate per category for simplicity.
        </li>
        <li>
          Size tier uses the simplified Standard-Size rule (longest ≤ 18",
          median ≤ 14", shortest ≤ 8", weight ≤ 20 lb). Real Amazon tiers also
          include Small/Light, Small Oversize, Medium Oversize, Large Oversize
          and Special Oversize — those finer tiers are not modelled.
        </li>
        <li>
          Monthly storage is the Jan–Sep or Oct–Dec rate × cubic feet. Long-term
          storage fees (aged inventory &gt; 271 days), removal fees, returns
          processing fees, and inbound transportation are not included.
        </li>
        <li>
          FBA fulfilment fee brackets are US 2024 rates and approximate. Rates
          for hazardous materials, apparel, shoes and small-and-light programs
          may differ.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "How is the size tier determined?",
        a: "Standard-Size means: longest side ≤ 18\", median side ≤ 14\", shortest side ≤ 8\", and weight ≤ 20 lb. If your product exceeds any of those, it's Large Bulky. The calculator auto-sorts your three dimensions to find the longest, median and shortest side.",
      },
      {
        q: "What's the referral fee minimum?",
        a: "Most categories have a $0.30 minimum referral fee — if the percentage calc results in less than $0.30, Amazon charges $0.30 instead. Books and Music have no minimum, so a $1 book pays just $0.15.",
      },
      {
        q: "Why does storage cost more in Q4?",
        a: "Amazon charges peak-season storage rates Oct–Dec to discourage sellers from hoarding inventory during the holiday rush. Standard-Size jumps from $0.87/cu ft (Jan–Sep) to $2.40/cu ft (Oct–Dec) — nearly 3× higher.",
      },
      {
        q: "Does this include FBA inbound shipping?",
        a: "No. The inbound transportation cost (shipping your inventory from your warehouse to Amazon's fulfilment centre) is separate. Budget an extra $0.30–$1.00 per unit depending on weight and distance.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}
