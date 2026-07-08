"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  RotateCcw,
  TrendingUp,
  Tag,
  ShoppingBag,
  CreditCard,
  Megaphone,
  AlertCircle,
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

// Etsy 2025 US fee schedule (embedded as constants per the brief).
const ETSY_LISTING_FEE = 0.2; // $0.20 per listing (charged at renewal every 4 months)
const ETSY_LISTING_RENEWAL_MONTHS = 4;
const ETSY_TRANSACTION_FEE_PCT = 6.5; // 6.5% of total order (item price + shipping)
const ETSY_PAYMENT_PCT = 3; // 3% on the order total
const ETSY_PAYMENT_FIXED = 0.25; // $0.25 per transaction (US, Etsy Payments)
const ETSY_OFFSITE_ADS_PCT = 15; // 15% of order total when offsite ad credit applies

export function EtsyFeeCalculator({ tool }: { tool: ToolDefinition }) {
  const [listingPrice, setListingPrice] = React.useState<string>("35.00");
  const [quantity, setQuantity] = React.useState<string>("1");
  const [shippingCharged, setShippingCharged] = React.useState<string>("5.50");
  const [offsiteAds, setOffsiteAds] = React.useState<boolean>(false);
  const { code: currency, setCode: setCurrency } = useCurrency();
  const fmt = (v: number) => money(v, currency);

  const pricePerItem = Math.max(0, parseNumber(listingPrice));
  const qty = Math.max(1, Math.floor(parseNumber(quantity)));
  const shipping = Math.max(0, parseNumber(shippingCharged));

  const itemsTotal = pricePerItem * qty;
  const orderTotal = itemsTotal + shipping; // Etsy fees apply to item price + shipping

  // Listing fee: $0.20 per item sold (each quantity is a separate listing renewal).
  const listingFee = ETSY_LISTING_FEE * qty;
  // Transaction fee: 6.5% of the entire order total (items + shipping).
  const transactionFee = (ETSY_TRANSACTION_FEE_PCT / 100) * orderTotal;
  // Payment processing: 3% + $0.25 per transaction (one transaction, not per item).
  const paymentFee = (ETSY_PAYMENT_PCT / 100) * orderTotal + ETSY_PAYMENT_FIXED;
  // Offsite Ads fee: 15% of order total when applicable.
  const offsiteAdsFee = offsiteAds ? (ETSY_OFFSITE_ADS_PCT / 100) * orderTotal : 0;

  const totalFees = listingFee + transactionFee + paymentFee + offsiteAdsFee;
  const netProfit = orderTotal - shipping - totalFees;
  const feePctOfOrder = orderTotal > 0 ? (totalFees / orderTotal) * 100 : 0;
  const profitPctOfItems = itemsTotal > 0 ? (netProfit / itemsTotal) * 100 : 0;

  const reset = () => {
    setListingPrice("35.00");
    setQuantity("1");
    setShippingCharged("5.50");
    setOffsiteAds(false);
    toast.info("Reset.");
  };

  const summary = `Etsy fee breakdown
Listing price:        ${fmt(pricePerItem)} each
Quantity sold:        ${qty}
Items subtotal:       ${fmt(itemsTotal)}
Shipping charged:     ${fmt(shipping)}
Order total:          ${fmt(orderTotal)}
Offsite ads:          ${offsiteAds ? "Enrolled (15%)" : "Not enrolled"}

Listing fee:          ${fmt(listingFee)} ($${ETSY_LISTING_FEE.toFixed(2)} × ${qty})
Transaction fee:      ${fmt(transactionFee)} (${ETSY_TRANSACTION_FEE_PCT}% of order)
Payment processing:   ${fmt(paymentFee)} (${ETSY_PAYMENT_PCT}% + $${ETSY_PAYMENT_FIXED.toFixed(2)})
Offsite ads fee:      ${fmt(offsiteAdsFee)}${offsiteAds ? ` (${ETSY_OFFSITE_ADS_PCT}% of order)` : ""}

Total fees:           ${fmt(totalFees)} (${formatPercent(feePctOfOrder)} of order)
Net profit:           ${fmt(netProfit)} (${formatPercent(profitPctOfItems)} of items)`;

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <SectionLabel>Order details</SectionLabel>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="et-price">Listing price (per item)</Label>
              <Input
                id="et-price"
                inputMode="decimal"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="et-qty">Quantity sold</Label>
              <Input
                id="et-qty"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="et-ship">Shipping charged to buyer</Label>
            <Input
              id="et-ship"
              inputMode="decimal"
              value={shippingCharged}
              onChange={(e) => setShippingCharged(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Etsy charges transaction and payment fees on the total of item
              price + shipping — enter what the buyer pays for shipping here.
            </p>
          </div>

          <label
            htmlFor="et-offsite"
            className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3"
          >
            <Switch
              id="et-offsite"
              checked={offsiteAds}
              onCheckedChange={setOffsiteAds}
            />
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Offsite ads enrolled</div>
              <p className="text-xs text-muted-foreground">
                Mandatory for sellers with &gt;$10k/yr in sales; opt-in for smaller
                shops. Adds a 15% fee on orders attributed to offsite ads.
              </p>
            </div>
          </label>

          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
          <CurrencySelector value={currency} onChange={setCurrency} id="et-currency" className="pt-2" />
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Result</SectionLabel>
            <CopyButton value={summary} size="sm" />
          </div>

          {pricePerItem === 0 && (
            <p className="text-sm text-muted-foreground">
              Enter a listing price to see your fee breakdown.
            </p>
          )}

          {pricePerItem > 0 && (
            <>
              {netProfit < 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                  <p>
                    Fees + shipping exceed the order total — net result is a
                    loss of {fmt(Math.abs(netProfit))}.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Net profit"
                  value={fmt(netProfit)}
                  tone={netProfit < 0 ? "rose" : "emerald"}
                  icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                  hint={`On ${qty} item(s) sold`}
                />
                <StatCard
                  label="Total fees"
                  value={fmt(totalFees)}
                  tone="primary"
                  icon={<ShoppingBag className="h-3.5 w-3.5 text-primary" />}
                  hint={`${formatPercent(feePctOfOrder)} of order`}
                />
              </div>

              <div className="space-y-2 rounded-lg border bg-background p-4">
                <Row label="Items subtotal" value={fmt(itemsTotal)} muted />
                <Row label="Shipping charged" value={fmt(shipping)} muted />
                <Row label="Order total" value={fmt(orderTotal)} />
                <div className="border-t pt-2">
                  <Row
                    label="Listing fee"
                    value={fmt(listingFee)}
                    hint={`$${ETSY_LISTING_FEE.toFixed(2)} × ${qty}`}
                    icon={<Tag className="h-3.5 w-3.5 text-muted-foreground/70" />}
                  />
                  <Row
                    label="Transaction fee"
                    value={fmt(transactionFee)}
                    hint={`${ETSY_TRANSACTION_FEE_PCT}% of order`}
                    icon={<ShoppingBag className="h-3.5 w-3.5 text-muted-foreground/70" />}
                  />
                  <Row
                    label="Payment processing"
                    value={fmt(paymentFee)}
                    hint={`${ETSY_PAYMENT_PCT}% + $${ETSY_PAYMENT_FIXED.toFixed(2)}`}
                    icon={<CreditCard className="h-3.5 w-3.5 text-muted-foreground/70" />}
                  />
                  {offsiteAds && (
                    <Row
                      label="Offsite ads fee"
                      value={fmt(offsiteAdsFee)}
                      hint={`${ETSY_OFFSITE_ADS_PCT}% of order`}
                      icon={<Megaphone className="h-3.5 w-3.5 text-muted-foreground/70" />}
                    />
                  )}
                </div>
                <div className="border-t pt-2">
                  <Row label="Total fees" value={fmt(totalFees)} highlight />
                  <Row
                    label="Net profit"
                    value={fmt(netProfit)}
                    large
                    highlight={netProfit >= 0}
                  />
                  <Row
                    label="Profit margin (of items)"
                    value={formatPercent(profitPctOfItems)}
                    muted
                  />
                </div>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                <p>
                  <strong className="text-foreground">Listing fee</strong> = $
                  {ETSY_LISTING_FEE.toFixed(2)} per item, auto-renews every{" "}
                  {ETSY_LISTING_RENEWAL_MONTHS} months until sold out. Each
                  quantity sold counts as one renewal. <strong className="text-foreground">
                  Transaction</strong> & <strong className="text-foreground">Payment</strong>{" "}
                  fees both apply to items + shipping.
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
      "Calculate the full Etsy fee stack on a sale: $0.20 listing fee per item, 6.5% transaction fee, 3% + $0.25 payment processing fee, and an optional 15% offsite-ads fee. Enter your listing price, quantity and shipping — the calculator breaks down every fee Etsy charges and shows your net profit per order.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter your listing price",
        description:
          "The price per item as listed on Etsy. Quantity multiplies both your revenue and the per-item listing fee.",
      },
      {
        title: "Add shipping charged to the buyer",
        description:
          "Etsy charges both the 6.5% transaction fee and the 3% payment fee on the order total (items + shipping), so what you charge for shipping also affects fees.",
      },
      {
        title: "Toggle offsite ads if applicable",
        description:
          "Sellers with >$10k/yr are auto-enrolled in offsite ads (15% fee on attributed orders). Smaller shops can opt in — toggle on to model that scenario.",
      },
      {
        title: "Read the breakdown",
        description:
          "Each fee is itemised and the total fees as a percentage of the order are shown alongside your net profit and profit margin on items.",
      },
    ],
    useCases: [
      "Price a new Etsy listing so you keep a target margin after all Etsy fees.",
      "Decide whether to opt into offsite ads as a small shop by modelling the 15% surcharge.",
      "Compare net proceeds of selling 1 large item vs. 5 smaller items at the same revenue.",
      "Quote a buyer accurately for a custom-order quantity before accepting payment.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{ECOMMERCE_DISCLAIMER}</li>
        <li>
          Rates are Etsy's US fee schedule (Etsy Payments). Payment processing
          fees vary by country — e.g. UK is 4% + £0.20, EU is 4% + €0.30.
        </li>
        <li>
          The listing fee assumes one renewal per quantity sold. If your listing
          auto-renews every 4 months without selling, you still pay $0.20 each
          renewal — not modelled here.
        </li>
        <li>
          Offsite ads fee is 15% if your shop earns over $10k/year (mandatory)
          or 12% if under $10k and opted in. The calculator uses the standard
          15% — adjust manually for the 12% opt-in rate.
        </li>
        <li>
          Sales tax, VAT (where applicable), Etsy Plus subscription ($10/mo,
          includes 5 listing credits), and pattern fees are not included.
          Refund/cancellation behaviour (listing fee non-refundable, transaction
          fee refunded on cancellation) is not modelled.
        </li>
        <li>
          Etsy&rsquo;s fee schedule is published in USD; this calculator displays
          amounts in your selected currency and treats the fixed USD fee
          components (e.g. $0.20 listing fee, $0.25 payment fee) as if
          denominated in your chosen currency &mdash; a display simplification,
          not a currency conversion.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Does Etsy charge the transaction fee on shipping?",
        a: "Yes. Etsy's 6.5% transaction fee applies to the total order amount — items + shipping + any gift wrap. The 3% payment processing fee also applies to the same total.",
      },
      {
        q: "What is the $0.20 listing fee and when is it charged?",
        a: "Etsy charges $0.20 to publish each listing, then auto-renews it every 4 months until all quantity sells or you delete the listing. Each quantity sold counts as one listing (so selling 5 of a quantity-5 listing is 5 × $0.20 = $1.00 in listing fees).",
      },
      {
        q: "Are offsite ads fees always 15%?",
        a: "No. They're 15% for sellers making over $10,000/year (mandatory participation) and 12% for smaller sellers who opt in. This calculator uses 15% — divide the offsite-ads fee by 1.25 to approximate the 12% rate.",
      },
      {
        q: "Does this calculator handle refunds?",
        a: "No. On a refund, Etsy refunds the transaction fee and the 3% portion of the payment fee but keeps the $0.25 fixed portion and the listing fee. Re-run the calculator with quantity=0 to see the irrecoverable cost.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}
