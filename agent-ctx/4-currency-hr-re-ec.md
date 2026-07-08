# Task 4-currency-hr-re-ec — Currency selection for HR + real-estate + e-commerce tools

## Summary

Wired the shared currency infrastructure (`useCurrency`, `CurrencySelector`,
`money`) at `src/components/dueneo/currency-selector.tsx` into the 4 HR money
tools, all 10 real-estate tools and all 10 e-commerce tools so a single user-
selectable currency persists across every money tool on the site (via
localStorage `dueneo:currency`). The previously hardcoded `const currency =
"USD"` and the per-tool 6-currency inline `<select>` dropdowns in cap-rate /
renovation-budget / property-comparison-dashboard are gone — one shared 58-
currency selector now drives every money display.

## Files modified (25)

### HR tools (`src/components/tools/hr/`)
1. `salary-comparison-calculator.tsx` — added hook + `<CurrencySelector>` next
   to Reset; replaced `result.currentCity.currency` / `result.targetCity.currency`
   with shared `currency` for all `formatCurrency` + chart formatters.
2. `offer-comparison-tool.tsx` — added hook + `fmt` wrapper + `<CurrencySelector>`;
   all `formatCurrency(...)` → `fmt(...)` (per-offer cards, comparison table,
   summary cards).
3. `cost-to-company-calculator.tsx` — same pattern; donut tooltip + per-day /
   per-hour footer all use shared currency.
4. `payslip-analyzer.tsx` — same pattern; updated limitations + FAQ copy that
   previously said "currency is auto-detected from your browser locale".

### HR tools intentionally NOT changed (5)
- `notice-period-calculator.tsx`, `pto-calculator.tsx`,
  `interview-scorecard-builder.tsx`, `shift-planner.tsx`,
  `work-anniversary-tracker.tsx` — none of these display a currency value
  (verified by grep for `formatCurrency|currency|USD|money`). The only
  "pay"/"salary" mentions are descriptive text.

### Real-estate tools (`src/components/tools/realestate/`)
5. `rental-yield-calculator.tsx` — `const currency = "USD"` → `useCurrency()`.
6. `mortgage-affordability-calculator.tsx` — same.
7. `cash-flow-analyzer.tsx` — same.
8. `airbnb-income-estimator.tsx` — same.
9. `property-roi-calculator.tsx` — same.
10. `house-flipping-calculator.tsx` — same.
11. `cap-rate-calculator.tsx` — replaced native `<select>` (USD/GBP/EUR/CAD/
    AUD/INR) with `<CurrencySelector>`; `useState<string>("USD")` → hook.
12. `renovation-budget-planner.tsx` — replaced shadcn `<Select>` (6 currencies)
    with `<CurrencySelector>`; pruned the now-unused `Select*` imports.
13. `property-comparison-dashboard.tsx` — same pattern as cap-rate.
14. `stamp-duty-calculator.tsx` — replaced `const currency = REGION_CURRENCY[region]`
    (per-region native currency) with shared `useCurrency()`. Removed the
    now-unused `REGION_CURRENCY` constant. Added a limitations bullet
    explaining that bracket thresholds are displayed in the user's selected
    currency (a display simplification, not a currency conversion).
15. `_re-helpers.ts` — `computeStampDuty` now accepts an optional `currency`
    parameter (default "GBP" for backward compatibility) used purely for the
    breakdown-label currency symbol; calculation logic unchanged.

### E-commerce tools (`src/components/tools/ecommerce/`)
Each e-commerce tool previously called `formatCurrency(value)` with no
currency option. Each now imports `useCurrency, CurrencySelector, money`,
declares `const { code: currency, setCode: setCurrency } = useCurrency();` +
`const fmt = (v: number) => money(v, currency);`, adds a `<CurrencySelector>`
next to Reset, and every `formatCurrency(...)` call site is replaced with
`fmt(...)` (using MultiEdit `replace_all`).

16. `shopify-profit-calculator.tsx`
17. `amazon-fba-fee-calculator.tsx`
18. `etsy-fee-calculator.tsx`
19. `tiktok-shop-profit-calculator.tsx`
20. `ebay-fee-calculator.tsx`
21. `stripe-fee-calculator.tsx`
22. `paypal-fee-calculator.tsx`
23. `product-margin-calculator.tsx` — also replaced the stale "All currency is
    USD" limitation bullet with text pointing at the shared selector.
24. `bundle-pricing-calculator.tsx`
25. `discount-stack-calculator.tsx`

For tools 16–22 (the 7 fee-calculator tools with published USD fee schedules),
a new limitations bullet was added per the task spec explaining that the
fixed USD fee components (e.g. Stripe $0.30, PayPal $0.49, Etsy $0.20 listing
+ $0.25 payment, eBay $0.35 insertion + $0.30 per-order + $5 reserve + $750
cap, Amazon $0.30 min referral, Shopify $0.30 CC fixed + $39/$105/$399 plan
fees, TikTok $0.30 payment) are treated as being denominated in the user's
chosen currency — a display simplification, not a currency conversion.

## Patterns applied

**Pattern A** — real-estate tools with `const currency = "USD"`:
```tsx
import { useCurrency, CurrencySelector } from "@/components/dueneo/currency-selector";
// ...
const { code: currency, setCode: setCurrency } = useCurrency();
// existing formatCurrency(value, { currency }) calls work unchanged
<CurrencySelector value={currency} onChange={setCurrency} id="xx-currency" className="pt-2" />
```

**Pattern B** — HR offer/cost/payslip + all e-commerce tools (where
`formatCurrency(value)` had no currency arg):
```tsx
import { useCurrency, CurrencySelector, money } from "@/components/dueneo/currency-selector";
// ...
const { code: currency, setCode: setCurrency } = useCurrency();
const fmt = (v: number) => money(v, currency);  // helper injects currency
// replace_all: formatCurrency( → fmt(
<CurrencySelector value={currency} onChange={setCurrency} id="xx-currency" className="pt-2" />
```
The `fmt` helper is named differently from `formatCurrency` so the
`replace_all` of `formatCurrency(` → `fmt(` doesn't recurse into the helper
definition (which calls `money`, not `formatCurrency`).

## Constraints honored

- **No calculation logic changed** — every fee, ROI, yield, profit and tax
  computation is byte-identical to before. Only the display currency symbol
  and Intl formatting changed.
- **No existing features removed** — every tool still has a currency
  selector (now shared with 58 currencies instead of the prior 6-currency
  inline list).
- **Currency choice persists** across all 24 touched tools via
  `useCurrency()` → localStorage `dueneo:currency`.
- **Existing `<CurrencySelector>` reused** — no new selector component
  created.
- **TypeScript strict, sonner toast, no backend** — all maintained.
- **Limitation notes added** to the 7 fee-calculator tools explaining the
  USD-fee → user-currency simplification, per the task spec.

## Verification

- `cd /home/z/my-project && bun run lint` → exits 0, 0 errors, 0 warnings.
- `bunx tsc --noEmit --skipLibCheck` → no new errors introduced by this
  task. The single error in `cap-rate-calculator.tsx:103` (`Type 'number'
  is not assignable to type 'string'`) is pre-existing — confirmed by
  `git stash` test (was at line 112 before my insertion added a few lines
  above it). The `resume-ats-scanner.tsx` regex-flag error is also
  pre-existing and unrelated.
- `tail -50 /home/z/my-project/dev.log` → only `✓ Compiled in NNNms`
  lines, no compile errors throughout the edit session.
