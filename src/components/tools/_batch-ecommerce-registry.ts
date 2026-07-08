import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { ShopifyProfitCalculator } from "./ecommerce/shopify-profit-calculator";
import { AmazonFbaFeeCalculator } from "./ecommerce/amazon-fba-fee-calculator";
import { EtsyFeeCalculator } from "./ecommerce/etsy-fee-calculator";
import { TikTokShopProfitCalculator } from "./ecommerce/tiktok-shop-profit-calculator";
import { EbayFeeCalculator } from "./ecommerce/ebay-fee-calculator";
import { StripeFeeCalculator } from "./ecommerce/stripe-fee-calculator";
import { PaypalFeeCalculator } from "./ecommerce/paypal-fee-calculator";
import { ProductMarginCalculator } from "./ecommerce/product-margin-calculator";
import { BundlePricingCalculator } from "./ecommerce/bundle-pricing-calculator";
import { DiscountStackCalculator } from "./ecommerce/discount-stack-calculator";

/**
 * Batch e-commerce registry — 10 fee / profit calculators (Task 3-ecommerce,
 * IDs 146-155).
 *
 * Centralised in its own file so the main agent can import and merge this map
 * into `tool-router.tsx` after all parallel batches complete, avoiding git
 * conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchEcommerceComponents: Record<
  string,
  ComponentType<{ tool: ToolDefinition }>
> = {
  "shopify-profit-calculator": ShopifyProfitCalculator,
  "amazon-fba-fee-calculator": AmazonFbaFeeCalculator,
  "etsy-fee-calculator": EtsyFeeCalculator,
  "tiktok-shop-profit-calculator": TikTokShopProfitCalculator,
  "ebay-fee-calculator": EbayFeeCalculator,
  "stripe-fee-calculator": StripeFeeCalculator,
  "paypal-fee-calculator": PaypalFeeCalculator,
  "product-margin-calculator": ProductMarginCalculator,
  "bundle-pricing-calculator": BundlePricingCalculator,
  "discount-stack-calculator": DiscountStackCalculator,
};
