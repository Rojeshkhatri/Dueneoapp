"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertCircle,
  Gavel,
  Tag,
  TagIcon,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatPercent,
  ECOMMERCE_DISCLAIMER,
  EBAY_CATEGORIES,
  EBAY_UPGRADES,
  EBAY_RESERVE_FEE,
  type EbayCategory,
  type EbayListingType,
  Row,
  StatCard,
} from "./_ecommerce-helpers";
import { useCurrency, CurrencySelector, money } from "@/components/dueneo/currency-selector";

const LISTING_TYPES: { key: EbayListingType; label: string; hint: string }[] = [
  { key: "fixed", label: "Fixed-price", hint: "First 250 listings/mo are free; $0.35 after" },
  { key: "auction", label: "Auction", hint: "$0.35 insertion fee per listing" },
];

export function EbayFeeCalculator({ tool }: { tool: ToolDefinition }) {
  const [listingType, setListingType] = React.useState<EbayListingType>("fixed");
  const [categoryKey, setCategoryKey] = React.useState<string>(EBAY_CATEGORIES[0].key);
  const [finalPrice, setFinalPrice] = React.useState<string>("125.00");
  const [reservePrice, setReservePrice] = React.useState<string>("");
  const [upgrades, setUpgrades] = React.useState<Record<string, boolean>>({});
  const [freeListingsUsed, setFreeListingsUsed] = React.useState<string>("0");
  const { code: currency, setCode: setCurrency } = useCurrency();
  const fmt = (v: number) => money(v, currency);

  const category = React.useMemo<EbayCategory>(
    () => EBAY_CATEGORIES.find((c) => c.key === categoryKey) ?? EBAY_CATEGORIES[0],
    [categoryKey],
  );

  const price = Math.max(0, parseNumber(finalPrice));
  const reserve = Math.max(0, parseNumber(reservePrice));
  const freeUsed = Math.max(0, Math.floor(parseNumber(freeListingsUsed)));
  const isAuction = listingType === "auction";

  // Insertion fee logic.
  // Fixed-price: first 250 listings/mo are free, $0.35 thereafter.
  // Auction: $0.35 per insertion regardless (above free allotment).
  // We assume the listing falls beyond the free allotment when "free listings
  // already used this month" >= 250 for fixed-price (and always charged for auction).
  const FREE_ALLOTMENT_FIXED = 250;
  const INSERTION_FEE = 0.35;
  const insertionFee = (() => {
    if (isAuction) {
      // Auctions consume the free allotment too in real eBay, but per the
      // brief auctions are charged $0.35. Keep spec-faithful: always $0.35.
      return INSERTION_FEE;
    }
    // Fixed-price: free for first 250/month, then $0.35.
    return freeUsed >= FREE_ALLOTMENT_FIXED ? INSERTION_FEE : 0;
  })();

  // Final value fee: pct × price (+ per-order fee), capped at category feeCap.
  const fvByPct = (price * category.finalValuePct) / 100;
  const fvCapped = Math.min(fvByPct, category.feeCap);
  const finalValueFee = fvCapped + category.perOrderFee;

  // Reserve price fee: $5 charged when reserve is set (auction only).
  const reserveFee = isAuction && reserve > 0 ? EBAY_RESERVE_FEE : 0;

  // Upgrade fees (selected).
  const selectedUpgradeFees = EBAY_UPGRADES.filter((u) => upgrades[u.key]).map((u) => u.fee);
  const upgradesTotal = selectedUpgradeFees.reduce((a, b) => a + b, 0);

  const totalFees = insertionFee + finalValueFee + reserveFee + upgradesTotal;
  const netProceeds = price - totalFees;
  const feePctOfPrice = price > 0 ? (totalFees / price) * 100 : 0;

  const toggleUpgrade = (key: string, on: boolean) => {
    setUpgrades((prev) => ({ ...prev, [key]: on }));
  };

  const reset = () => {
    setListingType("fixed");
    setCategoryKey(EBAY_CATEGORIES[0].key);
    setFinalPrice("125.00");
    setReservePrice("");
    setUpgrades({});
    setFreeListingsUsed("0");
    toast.info("Reset.");
  };

  const summary = `eBay fee breakdown
Listing type:         ${isAuction ? "Auction" : "Fixed-price"}
Category:             ${category.label}
Final price:          ${fmt(price)}
Free listings used:   ${freeUsed} of ${FREE_ALLOTMENT_FIXED} (fixed-price)

Insertion fee:        ${fmt(insertionFee)}${!isAuction && insertionFee === 0 ? " (within free allotment)" : ` ($${INSERTION_FEE.toFixed(2)} per listing)`}
Final value fee:      ${fmt(finalValueFee)} (${category.finalValuePct}%${category.perOrderFee > 0 ? ` + $${category.perOrderFee.toFixed(2)}` : ""}, capped at $${category.feeCap})
Reserve fee:          ${fmt(reserveFee)}${reserveFee > 0 ? ` ($${EBAY_RESERVE_FEE} reserve)` : ""}
Upgrades:             ${fmt(upgradesTotal)}

Total fees:           ${fmt(totalFees)} (${formatPercent(feePctOfPrice)} of final price)
Net proceeds:         ${fmt(netProceeds)}`;

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <SectionLabel>Listing details</SectionLabel>

          <div className="grid gap-3">
            <Label>Listing type</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {LISTING_TYPES.map((lt) => (
                <button
                  key={lt.key}
                  type="button"
                  onClick={() => setListingType(lt.key)}
                  className={
                    "rounded-lg border p-3 text-left text-sm transition-colors " +
                    (listingType === lt.key
                      ? "border-primary bg-primary/5 text-foreground"
                      : "bg-background hover:bg-muted/50")
                  }
                >
                  <div className="flex items-center gap-2 font-medium">
                    {lt.key === "auction" ? (
                      <Gavel className="h-4 w-4 text-primary" />
                    ) : (
                      <TagIcon className="h-4 w-4 text-primary" />
                    )}
                    {lt.label}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{lt.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eb-cat">Category</Label>
            <Select value={categoryKey} onValueChange={setCategoryKey}>
              <SelectTrigger id="eb-cat" className="w-full">
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {EBAY_CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label} — {c.finalValuePct}%
                    {c.perOrderFee > 0 ? ` + $${c.perOrderFee.toFixed(2)}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Final value fee is {category.finalValuePct}% of the final price
              {category.perOrderFee > 0 ? ` plus $${category.perOrderFee.toFixed(2)} per order` : ""},
              capped at ${category.feeCap}.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eb-price">Final sale price</Label>
            <Input
              id="eb-price"
              inputMode="decimal"
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {isAuction && (
            <div className="space-y-2">
              <Label htmlFor="eb-reserve">Reserve price (optional)</Label>
              <Input
                id="eb-reserve"
                inputMode="decimal"
                value={reservePrice}
                onChange={(e) => setReservePrice(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Setting a reserve costs ${EBAY_RESERVE_FEE} — refunded if the
                item doesn't sell, kept if it does. Leave blank to skip.
              </p>
            </div>
          )}

          {!isAuction && (
            <div className="space-y-2">
              <Label htmlFor="eb-used">Free listings already used this month</Label>
              <Input
                id="eb-used"
                inputMode="numeric"
                value={freeListingsUsed}
                onChange={(e) => setFreeListingsUsed(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                eBay gives you {FREE_ALLOTMENT_FIXED} free fixed-price insertions
                per month. After that, each insertion is ${INSERTION_FEE.toFixed(2)}.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Optional listing upgrades</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {EBAY_UPGRADES.map((u) => (
                <label
                  key={u.key}
                  htmlFor={`eb-up-${u.key}`}
                  className="flex cursor-pointer items-start gap-2 rounded-md border bg-background px-2.5 py-2 text-xs"
                >
                  <Checkbox
                    id={`eb-up-${u.key}`}
                    checked={!!upgrades[u.key]}
                    onCheckedChange={(v) => toggleUpgrade(u.key, v === true)}
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 font-medium">
                      <Sparkles className="h-3 w-3 text-primary" />
                      {u.label}
                      <span className="font-mono text-muted-foreground">
                        ${u.fee.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-muted-foreground">{u.hint}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
          <CurrencySelector value={currency} onChange={setCurrency} id="eb-currency" className="pt-2" />
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Result</SectionLabel>
            <CopyButton value={summary} size="sm" />
          </div>

          {price === 0 && (
            <p className="text-sm text-muted-foreground">
              Enter a final sale price to see the fee breakdown.
            </p>
          )}

          {price > 0 && (
            <>
              {netProceeds < 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                  <p>
                    Fees exceed the sale price — net result is a loss of{" "}
                    {fmt(Math.abs(netProceeds))}.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Net proceeds"
                  value={fmt(netProceeds)}
                  tone={netProceeds < 0 ? "rose" : "emerald"}
                  icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                  hint={`After ${fmt(totalFees)} in fees`}
                />
                <StatCard
                  label="Total fees"
                  value={fmt(totalFees)}
                  tone="primary"
                  icon={<Tag className="h-3.5 w-3.5 text-primary" />}
                  hint={`${formatPercent(feePctOfPrice)} of price`}
                />
              </div>

              <div className="space-y-2 rounded-lg border bg-background p-4">
                <Row label="Final sale price" value={fmt(price)} />
                <div className="border-t pt-2">
                  <Row
                    label="Insertion fee"
                    value={fmt(insertionFee)}
                    hint={
                      !isAuction && insertionFee === 0
                        ? `Free (within ${FREE_ALLOTMENT_FIXED}/mo)`
                        : `$${INSERTION_FEE.toFixed(2)} per listing`
                    }
                  />
                  <Row
                    label="Final value fee"
                    value={fmt(finalValueFee)}
                    hint={`${category.finalValuePct}%${category.perOrderFee > 0 ? ` + $${category.perOrderFee.toFixed(2)}` : ""}, cap $${category.feeCap}`}
                  />
                  {reserveFee > 0 && (
                    <Row
                      label="Reserve fee"
                      value={fmt(reserveFee)}
                      hint={`$${EBAY_RESERVE_FEE} reserve`}
                    />
                  )}
                  {upgradesTotal > 0 && (
                    <Row
                      label="Listing upgrades"
                      value={fmt(upgradesTotal)}
                      hint={`${selectedUpgradeFees.length} upgrade(s)`}
                    />
                  )}
                </div>
                <div className="border-t pt-2">
                  <Row label="Total fees" value={fmt(totalFees)} highlight />
                  <Row
                    label="Net proceeds"
                    value={fmt(netProceeds)}
                    large
                    highlight={netProceeds >= 0}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                  <PlusCircle className="h-3.5 w-3.5 text-primary" />
                  <span>
                    <strong className="text-foreground">Insertion fee</strong> ={" "}
                    ${INSERTION_FEE.toFixed(2)} for auctions, free for first{" "}
                    {FREE_ALLOTMENT_FIXED} fixed-price listings per month.{" "}
                    <strong className="text-foreground">Final value fee</strong> ={" "}
                    {category.finalValuePct}% of price
                    {category.perOrderFee > 0
                      ? ` + $${category.perOrderFee.toFixed(2)} per order`
                      : ""}{" "}
                    capped at ${category.feeCap}.
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
      "Calculate the full eBay fee stack on a sale: insertion fee (free for the first 250 fixed-price listings per month, $0.35 thereafter and for auctions), final value fee by category (10–15% with $0.30 per-order surcharge, capped at $750), reserve price fee for auctions, and optional listing upgrade fees. Choose your listing type and category, enter the final price, and see your net proceeds instantly.",
    tool: toolBody,
    howTo: [
      {
        title: "Pick your listing type",
        description:
          "Auction listings are $0.35 to insert and can have a reserve price. Fixed-price listings are free for the first 250 per month, then $0.35 each.",
      },
      {
        title: "Choose your category",
        description:
          "Final value fee ranges from 11% (Motors Parts, Musical Instruments) to 15% (Jewelry). Most categories are 13% with a $0.30 per-order surcharge, capped at $750.",
      },
      {
        title: "Add auction reserve or upgrades",
        description:
          "Setting a reserve price on auctions costs $5. Optional upgrades like Subtitle, Bold title, Featured Plus etc. are charged per listing regardless of sale outcome.",
      },
      {
        title: "Read the breakdown",
        description:
          "Each fee is itemised with its cap. Net proceeds and total fees as a percentage of the sale price are highlighted in the result panel.",
      },
    ],
    useCases: [
      "Decide whether an auction with a reserve makes sense vs. a fixed-price listing for a $500 item.",
      "Compare net proceeds across categories (e.g. listing a vintage watch under Jewelry vs. Collectibles).",
      "Model the cost of paid upgrades (Subtitle + Gallery Plus + Featured Plus) on a high-value listing.",
      "Forecast how many free fixed-price listings you can burn this month before insertion fees kick in.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{ECOMMERCE_DISCLAIMER}</li>
        <li>
          eBay's actual final value fee for most US categories is 13.25% (with
          $0.30 per order, capped at $750) as of early 2025. The rates in this
          calculator are rounded to whole percentages (10–15%) per the brief —
          confirm the exact rate on eBay's seller fees page for your category.
        </li>
        <li>
          The 250 free fixed-price listings per month assumes a non-store
          subscription. Basic Store subscribers get 250 listings at $0 insertion;
          Premium 1,000; Anchor 10,000; Enterprise 100,000. Adjust your
          "free listings already used" accordingly.
        </li>
        <li>
          The reserve fee of $5 is refunded if the item doesn't sell. This
          calculator shows it as a deduction regardless — for unsold items,
          treat the reserve fee as the only cost.
        </li>
        <li>
          International fees, managed payments cross-border surcharges,
          promoted-listing ad fees (cost-per-click or percentage-on-sale), and
          eBay Stores subscription fees are not modelled.
        </li>
        <li>
          eBay&rsquo;s fee schedule is published in USD. This calculator displays
          amounts in your selected currency and treats the fixed USD fee
          components (e.g. $0.35 insertion, $0.30 per-order, $5 reserve, $750 cap)
          as if denominated in your chosen currency &mdash; a display
          simplification, not a currency conversion.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Is the final value fee capped at $750?",
        a: "Yes, for most categories. The percentage-based portion of the final value fee is capped at $750 per listing — so a $10,000 item pays the same fee as a $5,000 item in most categories. The $0.30 per-order surcharge is in addition to the cap.",
      },
      {
        q: "What's the difference between insertion and final value fee?",
        a: "Insertion fee is charged when you publish a listing (whether or not it sells). Final value fee is charged when the item sells — it's a percentage of the sale price. Fixed-price listings get 250 free insertions per month; auctions are always $0.35 to insert.",
      },
      {
        q: "What is a reserve price and what does it cost?",
        a: "A reserve price is a hidden minimum bid on an auction — the item won't sell unless bidding reaches that amount. Setting one costs $5 (refunded if the item doesn't sell). Reserves are typically used for high-value items where the seller can't risk selling below a known floor.",
      },
      {
        q: "Are listing upgrade fees charged even if the item doesn't sell?",
        a: "Yes. Subtitle, Bold, Featured Plus and other upgrades are non-refundable listing enhancements charged at insertion time. Only the insertion fee (when paid) and the reserve fee are refunded on unsold listings — the upgrades stay charged.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}
