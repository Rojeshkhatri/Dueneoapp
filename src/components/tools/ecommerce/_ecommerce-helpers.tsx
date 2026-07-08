"use client";

/**
 * Shared helpers for Dueneo e-commerce tools (Task 3-ecommerce, IDs 146-155).
 *
 * Browser-only, framework-agnostic. Fee tables are embedded as constants so
 * each calculator runs 100% client-side with no API calls.
 *
 * Number / currency / percentage formatters are re-exported from the finance
 * helpers so every money tool across the site formats identically.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// Re-export shared formatters so each e-commerce tool has the same look as the
// finance tools (consistent thousands separators, currency, percent formatting).
export {
  parseNumber,
  formatCurrency,
  formatNumber,
  formatPercent,
  toRawNumberString,
  FINANCE_DISCLAIMER,
} from "../finance/_finance-helpers";

/**
 * E-commerce-specific estimate disclaimer. Layered on top of the generic
 * finance disclaimer — every marketplace and processor publishes rate sheets
 * that change frequently, so the user must always confirm with the source.
 */
export const ECOMMERCE_DISCLAIMER =
  "Marketplace and payment-processor fee schedules change frequently. The rates embedded in this calculator are illustrative and were last reviewed in early 2025 — always confirm the current fee schedule on the platform's seller documentation before pricing decisions.";

// ═══════════════════════════════════════════════════════════════════════════
// SHOPIFY — plan tiers, payment processing rates
// ═══════════════════════════════════════════════════════════════════════════

export interface ShopifyPlan {
  /** Component-internal key, e.g. "basic". */
  key: string;
  /** Display name, e.g. "Basic". */
  label: string;
  /** Monthly subscription fee in USD. */
  monthlyFee: number;
  /** Shopify Payments credit-card processing rate, percent (0–100). */
  ccRatePct: number;
  /** Shopify Payments per-transaction fixed fee in USD. */
  ccFixed: number;
  /** Additional transaction fee when an external (non-Shopify-Payments)
   *  gateway is used, percent (0–100). 0 when on Shopify Payments. */
  externalSurchargePct: number;
}

export const SHOPIFY_PLANS: ShopifyPlan[] = [
  {
    key: "basic",
    label: "Basic — $39/mo",
    monthlyFee: 39,
    ccRatePct: 2.9,
    ccFixed: 0.3,
    externalSurchargePct: 2.0,
  },
  {
    key: "shopify",
    label: "Shopify — $105/mo",
    monthlyFee: 105,
    ccRatePct: 2.6,
    ccFixed: 0.3,
    externalSurchargePct: 1.0,
  },
  {
    key: "advanced",
    label: "Advanced — $399/mo",
    monthlyFee: 399,
    ccRatePct: 2.4,
    ccFixed: 0.3,
    externalSurchargePct: 0.5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// AMAZON FBA — referral fees, fulfilment fees, storage fees
// ═══════════════════════════════════════════════════════════════════════════

export interface AmazonCategory {
  key: string;
  label: string;
  /** Referral fee as percent of price (0–100). */
  referralPct: number;
  /** Minimum referral fee in USD (typically $0.30). 0 = no minimum. */
  minReferral: number;
}

/**
 * Curated list of major Amazon referral-fee categories. Referral fee is the
 * higher of `referralPct × price` and `minReferral`.
 */
export const AMAZON_CATEGORIES: AmazonCategory[] = [
  { key: "baby", label: "Baby Products (excl. Baby Fashion)", referralPct: 8, minReferral: 0.3 },
  { key: "beauty", label: "Beauty", referralPct: 8, minReferral: 0.3 },
  { key: "books", label: "Books", referralPct: 15, minReferral: 0 },
  { key: "camera", label: "Camera & Photo", referralPct: 8, minReferral: 0.3 },
  { key: "clothing", label: "Clothing & Accessories", referralPct: 17, minReferral: 0.3 },
  { key: "electronics", label: "Consumer Electronics", referralPct: 8, minReferral: 0.3 },
  { key: "elec-accessories", label: "Electronics Accessories", referralPct: 15, minReferral: 0.3 },
  { key: "grocery", label: "Grocery & Gourmet", referralPct: 8, minReferral: 0.3 },
  { key: "health", label: "Health & Personal Care", referralPct: 8, minReferral: 0.3 },
  { key: "home", label: "Home & Kitchen", referralPct: 15, minReferral: 0.3 },
  { key: "industrial", label: "Industrial & Scientific", referralPct: 12, minReferral: 0.3 },
  { key: "jewelry", label: "Jewelry", referralPct: 20, minReferral: 0.3 },
  { key: "music", label: "Music (physical)", referralPct: 15, minReferral: 0 },
  { key: "office", label: "Office Products", referralPct: 15, minReferral: 0.3 },
  { key: "outdoors", label: "Outdoors & Sports", referralPct: 15, minReferral: 0.3 },
  { key: "pc", label: "Personal Computers", referralPct: 6, minReferral: 0.3 },
  { key: "pet", label: "Pet", referralPct: 15, minReferral: 0.3 },
  { key: "shoes", label: "Shoes", referralPct: 15, minReferral: 0.3 },
  { key: "toys", label: "Toys & Games", referralPct: 15, minReferral: 0.3 },
  { key: "watches", label: "Watches", referralPct: 13, minReferral: 0.3 },
  { key: "video-games", label: "Video Games", referralPct: 8, minReferral: 0.3 },
  { key: "everything-else", label: "Everything Else", referralPct: 15, minReferral: 0.3 },
];

/** Size tier computed from longest/median/shortest sides and weight. */
export type AmazonSizeTier = "standard" | "large";

export interface AmazonDimensions {
  /** Length, width, height in inches. */
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  /** Weight in pounds. */
  weightLb: number;
}

/**
 * Determine size tier per Amazon's simplified rules.
 * Standard-Size: longest ≤ 18", median ≤ 14", shortest ≤ 8", weight ≤ 20 lb.
 * Anything larger is "Large Bulky".
 */
export function amazonSizeTier(d: AmazonDimensions): AmazonSizeTier {
  const sides = [d.lengthIn, d.widthIn, d.heightIn].sort((a, b) => a - b);
  const [shortest, median, longest] = sides;
  if (longest <= 18 && median <= 14 && shortest <= 8 && d.weightLb <= 20) {
    return "standard";
  }
  return "large";
}

/**
 * Standard-Size FBA fulfilment fee schedule (USD, 2024 US rates, approximate).
 * Each bracket covers weight up to (and including) its `maxLb`.
 */
export const AMAZON_FBA_STANDARD: { maxLb: number; fee: number }[] = [
  { maxLb: 0.125, fee: 3.06 }, // ≤ 2 oz
  { maxLb: 0.25, fee: 3.1 }, // ≤ 4 oz
  { maxLb: 0.5, fee: 3.16 }, // ≤ 8 oz
  { maxLb: 0.75, fee: 3.27 }, // ≤ 12 oz
  { maxLb: 1.0, fee: 3.39 }, // ≤ 16 oz
  { maxLb: 2.0, fee: 4.95 }, // ≤ 2 lb
  { maxLb: 3.0, fee: 5.36 }, // ≤ 3 lb
];

/** Per-pound surcharge applied to Standard-Size items heavier than 3 lb. */
export const AMAZON_FBA_STANDARD_OVERSLOPE = 0.19; // $/lb above 3 lb
export const AMAZON_FBA_STANDARD_BASE_LB = 3;
export const AMAZON_FBA_STANDARD_BASE_FEE = 5.36;

/** Large Bulky FBA fulfilment fee schedule (USD, approximate). */
export const AMAZON_FBA_LARGE: { maxLb: number; fee: number }[] = [
  { maxLb: 2.0, fee: 8.46 },
  { maxLb: 4.0, fee: 9.79 },
  { maxLb: 6.0, fee: 10.79 },
  { maxLb: 10.0, fee: 12.73 },
];

/** Per-pound surcharge applied to Large Bulky items heavier than 10 lb. */
export const AMAZON_FBA_LARGE_OVERSLOPE = 0.32; // $/lb above 10 lb
export const AMAZON_FBA_LARGE_BASE_LB = 10;
export const AMAZON_FBA_LARGE_BASE_FEE = 12.73;

/**
 * Compute the FBA fulfilment fee for a given size tier + weight.
 * Returns 0 if weight is invalid.
 */
export function amazonFulfilmentFee(tier: AmazonSizeTier, weightLb: number): number {
  if (!Number.isFinite(weightLb) || weightLb <= 0) return 0;
  if (tier === "standard") {
    for (const bracket of AMAZON_FBA_STANDARD) {
      if (weightLb <= bracket.maxLb) return bracket.fee;
    }
    // Over the heaviest bracket: base + slope × (weight - base).
    return (
      AMAZON_FBA_STANDARD_BASE_FEE +
      AMAZON_FBA_STANDARD_OVERSLOPE * Math.max(0, weightLb - AMAZON_FBA_STANDARD_BASE_LB)
    );
  }
  // Large.
  for (const bracket of AMAZON_FBA_LARGE) {
    if (weightLb <= bracket.maxLb) return bracket.fee;
  }
  return (
    AMAZON_FBA_LARGE_BASE_FEE +
    AMAZON_FBA_LARGE_OVERSLOPE * Math.max(0, weightLb - AMAZON_FBA_LARGE_BASE_LB)
  );
}

/**
 * Monthly storage fee per cubic foot, by size tier and season. Amazon charges
 * higher rates Oct–Dec for peak-season storage. Rates in USD per cubic foot
 * per month.
 */
export const AMAZON_STORAGE_FEES = {
  standard: { janSep: 0.87, octDec: 2.4 },
  large: { janSep: 0.56, octDec: 1.4 },
} as const;

/** Compute cubic feet from inch dimensions. */
export function cubicFeetFromInches(lengthIn: number, widthIn: number, heightIn: number): number {
  return (lengthIn * widthIn * heightIn) / 1728;
}

// ═══════════════════════════════════════════════════════════════════════════
// EBAY — categories, listing-type rules, optional upgrade fees
// ═══════════════════════════════════════════════════════════════════════════

export interface EbayCategory {
  key: string;
  label: string;
  /** Final value fee as percent (0–100). */
  finalValuePct: number;
  /** Per-order surcharge in USD (e.g. $0.30 for Jewelry). 0 = none. */
  perOrderFee: number;
  /** Hard cap on the final-value-fee portion in USD. $750 for most. */
  feeCap: number;
}

export const EBAY_CATEGORIES: EbayCategory[] = [
  { key: "books-music-movies", label: "Books, Music, Movies", finalValuePct: 12, perOrderFee: 0.3, feeCap: 750 },
  { key: "cameras-photo", label: "Cameras & Photo", finalValuePct: 12, perOrderFee: 0.3, feeCap: 750 },
  { key: "clothing-shoes", label: "Clothing, Shoes & Accessories", finalValuePct: 13, perOrderFee: 0.3, feeCap: 750 },
  { key: "collectibles", label: "Collectibles", finalValuePct: 13, perOrderFee: 0.3, feeCap: 750 },
  { key: "everything-else", label: "Everything Else", finalValuePct: 13, perOrderFee: 0.3, feeCap: 750 },
  { key: "health-beauty", label: "Health & Beauty", finalValuePct: 13, perOrderFee: 0.3, feeCap: 750 },
  { key: "home-garden", label: "Home & Garden", finalValuePct: 13, perOrderFee: 0.3, feeCap: 750 },
  { key: "jewelry", label: "Jewelry & Watches", finalValuePct: 15, perOrderFee: 0.3, feeCap: 750 },
  { key: "motors-parts", label: "Motors Parts & Accessories", finalValuePct: 11, perOrderFee: 0.3, feeCap: 750 },
  { key: "musical-instruments", label: "Musical Instruments & Gear", finalValuePct: 11, perOrderFee: 0.3, feeCap: 750 },
  { key: "sporting-goods", label: "Sporting Goods", finalValuePct: 13, perOrderFee: 0.3, feeCap: 750 },
  { key: "toys-hobbies", label: "Toys & Hobbies", finalValuePct: 13, perOrderFee: 0.3, feeCap: 750 },
  { key: "video-games", label: "Video Games & Consoles", finalValuePct: 13, perOrderFee: 0.3, feeCap: 750 },
];

export type EbayListingType = "fixed" | "auction";

export interface EbayUpgrade {
  key: string;
  label: string;
  /** Flat fee in USD applied when the upgrade is selected. */
  fee: number;
  /** Short helper shown under the upgrade name. */
  hint: string;
}

export const EBAY_UPGRADES: EbayUpgrade[] = [
  { key: "subtitle", label: "Subtitle", fee: 0.5, hint: "50-character line under the title" },
  { key: "gallery-plus", label: "Gallery Plus", fee: 0.35, hint: "Larger search-results image" },
  { key: "bold", label: "Bold title", fee: 2.0, hint: "Bold formatting in search results" },
  { key: "listing-designer", label: "Listing Designer", fee: 0.1, hint: "Themed layout template" },
  { key: "highlight", label: "Highlight", fee: 5.0, hint: "Background highlight in search" },
  { key: "featured-plus", label: "Featured Plus", fee: 19.99, hint: "Top of search placement" },
];

/** Reserve-price fee for auctions: $5 charged at sale time, refunded if no bid
 *  meets reserve. Modelled here as $5 charged when a reserve is set. */
export const EBAY_RESERVE_FEE = 5;

// ═══════════════════════════════════════════════════════════════════════════
// STRIPE — payment-type rate table
// ═══════════════════════════════════════════════════════════════════════════

export interface StripePaymentType {
  key: string;
  label: string;
  /** Processing rate as percent (0–100). */
  ratePct: number;
  /** Per-transaction fixed fee in USD. */
  fixed: number;
  /** Optional cap on the percentage portion (USD). Used for ACH ($5 max). */
  cap?: number;
  /** Optional description for the rate. */
  hint: string;
}

export const STRIPE_PAYMENT_TYPES: StripePaymentType[] = [
  {
    key: "domestic-card",
    label: "Domestic card",
    ratePct: 2.9,
    fixed: 0.3,
    hint: "Cards issued in the US",
  },
  {
    key: "international-card",
    label: "International card",
    ratePct: 3.9,
    fixed: 0.3,
    hint: "Cards issued outside the US",
  },
  {
    key: "ach",
    label: "ACH debit",
    ratePct: 0.8,
    fixed: 0,
    cap: 5,
    hint: "US bank transfer, max $5",
  },
  {
    key: "in-person",
    label: "In-person (Terminal)",
    ratePct: 2.7,
    fixed: 0.05,
    hint: "Tap, dip or swipe on Stripe Reader",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// PAYPAL — transaction-type rate table
// ═══════════════════════════════════════════════════════════════════════════

export interface PaypalTransactionType {
  key: string;
  label: string;
  ratePct: number;
  fixed: number;
  hint: string;
}

export const PAYPAL_TRANSACTION_TYPES: PaypalTransactionType[] = [
  {
    key: "goods-services-domestic",
    label: "Goods & Services — Domestic",
    ratePct: 2.99,
    fixed: 0.49,
    hint: "Commercial sale, both parties in the US",
  },
  {
    key: "goods-services-international",
    label: "Goods & Services — International",
    ratePct: 4.99,
    fixed: 0.49,
    hint: "Commercial sale, cross-border",
  },
  {
    key: "friends-family-balance",
    label: "Friends & Family — Balance / Bank",
    ratePct: 0,
    fixed: 0,
    hint: "Personal transfer funded by PayPal balance or bank — no fee",
  },
  {
    key: "friends-family-card",
    label: "Friends & Family — Card funded",
    ratePct: 2.99,
    fixed: 0.49,
    hint: "Personal transfer funded by card",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Fee computation primitives — forward & reverse
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the processing fee for a charge amount under a rate+fixed schedule
 * with an optional cap on the percentage portion.
 *
 *   fee = min(amount × ratePct/100, cap) + fixed
 *
 * Used by both Stripe and PayPal calculators.
 */
export function computeProcessingFee(
  amount: number,
  ratePct: number,
  fixed: number,
  cap?: number,
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  let pct = (amount * ratePct) / 100;
  if (cap != null && pct > cap) pct = cap;
  return pct + fixed;
}

/**
 * Reverse calculator: given a desired net amount the seller wants to receive,
 * compute the gross amount they should charge so that, after applying the
 * processing fee, they end up with exactly `targetNet`.
 *
 * For an uncapped rate+fixed schedule:
 *   X = (targetNet + fixed) / (1 − ratePct/100)
 *
 * For a schedule with a cap on the percentage portion (e.g. ACH $5 max), we
 * first try the capped regime (X = targetNet + cap + fixed) when the
 * percentage at that X would hit the cap, otherwise fall back to the formula.
 */
export function computeReverseCharge(
  targetNet: number,
  ratePct: number,
  fixed: number,
  cap?: number,
): { gross: number; fee: number; net: number; capped: boolean } {
  if (!Number.isFinite(targetNet) || targetNet <= 0) {
    return { gross: 0, fee: 0, net: 0, capped: false };
  }
  // First, try the simple formula assuming no cap is hit.
  const denom = 1 - ratePct / 100;
  let gross = denom > 0 ? (targetNet + fixed) / denom : targetNet + fixed;
  let capped = false;
  if (cap != null) {
    // Check whether at this gross the percentage portion actually exceeds cap.
    let pct = (gross * ratePct) / 100;
    if (pct > cap) {
      // In the capped regime, fee = cap + fixed, so gross = net + cap + fixed.
      gross = targetNet + cap + fixed;
      pct = cap;
      capped = true;
    }
    const fee = pct + fixed;
    return { gross, fee, net: gross - fee, capped };
  }
  const fee = (gross * ratePct) / 100 + fixed;
  return { gross, fee, net: gross - fee, capped: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

/** Label/value pair used in every result panel. */
export function Row({
  label,
  value,
  hint,
  highlight,
  large,
  muted,
  icon,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  highlight?: boolean;
  large?: boolean;
  muted?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={cn(
          "text-sm",
          highlight
            ? "font-medium text-primary"
            : muted
              ? "text-muted-foreground/80"
              : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "flex items-center gap-1.5 font-mono tabular-nums",
          large
            ? "text-2xl font-semibold text-foreground"
            : highlight
              ? "text-base font-semibold text-primary"
              : muted
                ? "text-sm text-muted-foreground"
                : "text-base text-foreground",
        )}
      >
        {icon}
        {value}
        {hint && <span className="ml-1 text-[11px] font-sans text-muted-foreground/70">{hint}</span>}
      </span>
    </div>
  );
}

/** Small stat card with icon + label + big value + optional hint. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "primary" | "emerald" | "rose" | "amber";
}) {
  const toneClass = {
    default: "bg-background",
    primary: "bg-primary/5 border-primary/30",
    emerald: "bg-emerald-500/5 border-emerald-500/30",
    rose: "bg-rose-500/5 border-rose-500/30",
    amber: "bg-amber-500/5 border-amber-500/30",
  }[tone];
  return (
    <div className={cn("rounded-lg border p-3", toneClass)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Section header used inside tool bodies. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}
