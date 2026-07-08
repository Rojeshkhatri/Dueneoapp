# Task 3-ecommerce — E-commerce Fee / Profit Calculators

**Agent:** ecommerce-calculators
**Scope:** 10 e-commerce tools (IDs 146–155) — Shopify, Amazon FBA, Etsy, TikTok Shop, eBay, Stripe, PayPal, Product Margin, Bundle Pricing, Discount Stack.

## Summary

All 10 components are implemented as browser-only React client components, registered in `_batch-ecommerce-registry.ts`. Lint clean, TypeScript clean for the new files, dev server compiles without errors. The registry file is wired up so the main agent can merge it into `tool-router.tsx` in a single follow-up (alongside the still-pending merges for batchA–batchF).

## Files created

### Shared helpers
- `src/components/tools/ecommerce/_ecommerce-helpers.tsx` — centralised fee tables and UI primitives. Re-exports `parseNumber`, `formatCurrency`, `formatPercent`, `formatNumber`, `toRawNumberString`, `FINANCE_DISCLAIMER` from `../finance/_finance-helpers` (consistent formatting across money tools). Embeds:
  - **Shopify** — `SHOPIFY_PLANS` (Basic/Shopify/Advanced with cc rate, fixed fee, monthly fee, external-gateway surcharge %)
  - **Amazon** — `AMAZON_CATEGORIES` (22 categories with referral % + minimum), `AMAZON_FBA_STANDARD`/`AMAZON_FBA_LARGE` fulfilment brackets by weight, `AMAZON_STORAGE_FEES` (Jan–Sep vs Oct–Dec by tier), `amazonSizeTier()`, `amazonFulfilmentFee()`, `cubicFeetFromInches()`
  - **eBay** — `EBAY_CATEGORIES` (13 categories with final-value %, per-order fee, $750 cap), `EBAY_UPGRADES` (6 optional upgrades), `EBAY_RESERVE_FEE`
  - **Stripe** — `STRIPE_PAYMENT_TYPES` (domestic/international card, ACH with $5 cap, in-person terminal)
  - **PayPal** — `PAYPAL_TRANSACTION_TYPES` (G&S domestic/international, F&F balance/card)
  - **Fee primitives** — `computeProcessingFee(amount, ratePct, fixed, cap?)` and `computeReverseCharge(targetNet, ratePct, fixed, cap?)` (handles ACH cap auto-switching between formula and capped regime)
  - **UI primitives** — `Row`, `StatCard`, `SectionLabel`
  - `ECOMMERCE_DISCLAIMER` constant

### Tool components (all under `src/components/tools/ecommerce/`)

1. **`shopify-profit-calculator.tsx`** (`ShopifyProfitCalculator`) — Per-order profit after COGS, shipping, ad cost, Shopify Payments CC fee (plan-determined: 2.9%+$0.30 Basic, 2.6%+$0.30 Shopify, 2.4%+$0.30 Advanced), plan subscription allocation (monthly fee ÷ orders/mo), and optional external-gateway surcharge (2%/1%/0.5%). Loss warning when costs exceed revenue.

2. **`amazon-fba-fee-calculator.tsx`** (`AmazonFbaFeeCalculator`) — Referral fee (8–20% by category, $0.30 minimum where applicable), FBA fulfilment fee (Standard-Size weight brackets 2oz–3lb + $0.19/lb slope; Large Bulky 2lb–10lb + $0.32/lb slope), monthly storage fee ($0.87/cf standard Jan–Sep, $2.40/cf Oct–Dec; $0.56/$1.40 for large). Auto-detects Standard vs Large Bulky size tier from dimensions. Season toggle (Jan–Sep vs Oct–Dec) shows peak-season storage impact.

3. **`etsy-fee-calculator.tsx`** (`EtsyFeeCalculator`) — $0.20 listing fee × quantity (4-month auto-renewal noted), 6.5% transaction fee on order total (items + shipping), 3% + $0.25 payment processing fee (Etsy Payments US), optional 15% offsite ads fee (toggle).

4. **`tiktok-shop-profit-calculator.tsx`** (`TikTokShopProfitCalculator`) — User-adjustable commission via slider + numeric input (5–8% typical, 0–30% range; defaults 8%), 2.5% + $0.30 payment processing. Net profit + margin.

5. **`ebay-fee-calculator.tsx`** (`EbayFeeCalculator`) — Listing type buttons (fixed vs auction), 13 categories with 11–15% final-value fees, $0.30 per-order surcharge, $750 fee cap. Insertion fee logic: $0.35 for auctions, free for first 250 fixed-price/month (tracked via "free listings already used" input). Optional reserve price ($5 fee, auction only). 6 listing upgrades (Subtitle, Gallery Plus, Bold, Listing Designer, Highlight, Featured Plus) with per-upgrade fees.

6. **`stripe-fee-calculator.tsx`** (`StripeFeeCalculator`) — Two-tab interface: forward (charge → net received) and reverse (target net → charge amount). Four payment types: domestic card 2.9%+$0.30, international 3.9%+$0.30, ACH 0.8% capped at $5, in-person 2.7%+$0.05. Reverse calculator correctly handles ACH cap auto-switching (gross = net + $5 when percentage would exceed cap).

7. **`paypal-fee-calculator.tsx`** (`PaypalFeeCalculator`) — Two-tab interface identical in shape to Stripe. Four transaction types: G&S domestic 2.99%+$0.49, G&S international 4.99%+$0.49, F&F balance/bank free, F&F card 2.99%+$0.49. Free-transfer path shows zero fee and net = target.

8. **`product-margin-calculator.tsx`** (`ProductMarginCalculator`) — Multi-row table with name/cost/price per product; per-row profit (green/red), margin %, markup %, break-even (= cost). Blended totals across all rows (total revenue, total cost, total profit, blended margin/markup). Desktop table view + mobile card view (responsive). Add/remove rows. 3 sample rows pre-filled.

9. **`bundle-pricing-calculator.tsx`** (`BundlePricingCalculator`) — Multi-row product list (name + price + optional cost). Auto mode (slider 0–80% discount) vs custom mode (Switch toggle, type bundle price directly). Computes total individual price, bundle price, buyer savings + effective discount %, bundle cost/profit/margin.

10. **`discount-stack-calculator.tsx`** (`DiscountStackCalculator`) — Multi-step discounts in apply order. Each step is percent or fixed ($). Up/down arrows to reorder steps. Step-by-step breakdown showing amount off, price after, cumulative saved per step. Final price + total savings + effective discount %. Floor at $0 (clamps over-discounts to remaining subtotal). 3 sample steps pre-filled (20% + 10% + $5).

### Registry
- `src/components/tools/_batch-ecommerce-registry.ts` — exports `batchEcommerceComponents` (10 keys matching the `component` field in `tools.ts`).

## Tech / design notes

- All 10 use `ToolLayout` with full `ToolContent` (intro, tool, howTo steps, useCases, limitations JSX `<ul>`, FAQ). 4 how-to steps, 4 use cases, 4 FAQ entries, 4 limitations per tool.
- All 10 use `CopyButton` for summary copy-to-clipboard.
- All 10 use shared `Row` and `StatCard` primitives from `_ecommerce-helpers.tsx` for consistent result-panel styling.
- `sonner` `toast` used for reset feedback.
- All processing is 100% browser-only — no API routes, no backend, no uploads. All fee tables embedded as constants in `_ecommerce-helpers.tsx`.
- Live calculation: every input change triggers immediate recompute (React state, no debounce).
- Mobile-first responsive: all multi-column grids collapse to single-column on mobile; tables switch to card layouts where appropriate (product-margin-calculator); touch targets ≥44px for primary buttons.
- Long lists (product-margin table, bundle items, discount steps) are scrollable with `max-h-* overflow-y-auto` + `scrollbarWidth: "thin"`.
- Loss warnings (rose-tinted) appear when profit < 0 in shopify, etsy, tiktok, ebay, product-margin (total loss), bundle (negative margin), and discount-stack (none, as it's a price calculator not profit).
- Stripe & PayPal reverse calculators: mathematically derived formula `gross = (target + fixed) / (1 − rate)` for simple rate+fixed; ACH cap-aware fallback to `gross = target + cap` when the percentage at the simple-formula gross would exceed the cap.

## Issues caught & fixed

- **JSX text with literal `>`** in two limitations list items: `aged inventory > 271 days` (amazon) and `sellers with >$10k/yr` (etsy). Both triggered ESLint JSX parsing errors. Fixed by replacing `>` with the `&gt;` HTML entity.
- **Stray import** in stripe-fee-calculator.tsx — accidentally imported `Input` from `@/components/ui/label` (wrong module — there's no `Input` in label). Removed before lint.

## Verification

- `bun run lint` — **clean** (0 errors, 0 warnings).
- `npx tsc --noEmit --skipLibCheck` — 0 errors in any of the 11 new files. Pre-existing errors in pdf-*, security/_security-helpers, and base64-decoder (other agents' files) are unrelated.
- `tail -60 dev.log` — only `✓ Compiled in NNN ms` and `GET / 200` lines; no compile or runtime errors.

## Follow-up for main agent

Merge `batchEcommerceComponents` from `src/components/tools/_batch-ecommerce-registry.ts` into `TOOL_COMPONENTS` in `src/components/tools/tool-router.tsx` (single `import { batchEcommerceComponents }` + spread into the map). Until then the 10 tools fall through to the "Component not registered yet" placeholder. This merge can be batched with the still-pending merges for `batchAComponents` through `batchFComponents` from earlier parallel batches.
