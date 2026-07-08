# Task 4-currency-bus-fin — Currency selection for business + finance tools

## Summary

Wired the shared currency infrastructure (`useCurrency`, `CurrencySelector`) at
`src/components/dueneo/currency-selector.tsx` into the 5 business-document tools
and the finance tools so a single user-selectable currency persists across every
money tool, replacing the previously hardcoded USD/INR/EUR defaults and the
per-tool local currency state.

## Files modified (21)

### Shared engine
- `src/components/tools/finance/_tax-calculator.tsx` — calls `useCurrency()`
  (default USD), renders `<CurrencySelector>` next to Reset, passes shared
  `currency` to all `formatCurrency` calls. The `TaxCalculatorConfig.currency`
  field is now ignored (kept for backward compat).

### Business tools (`src/components/tools/business/`)
1. `invoice-generator.tsx` — removed `CURRENCY_OPTIONS` const + native
   `<select>`; uses `useCurrency` + `<CurrencySelector>`; rewired every
   `currency.code` reference to `currency`.
2. `quote-generator.tsx` — same pattern.
3. `receipt-generator.tsx` — same pattern.
4. `purchase-order-generator.tsx` — same pattern (also covers the shipping line).
5. `delivery-note-generator.tsx` — no money is shown (intentionally excluded),
   but a `<CurrencySelector>` is rendered in the Delivery details section so the
   shared currency can still be changed here for consistency.

### Finance tools (`src/components/tools/finance/`)

Hardcoded `const currency = "USD";` pattern (replaced with hook + added
`<CurrencySelector>`):
6. `discount-calculator.tsx`
7. `profit-margin-calculator.tsx` (also removed obsolete "Currency defaults to
   USD" limitation bullet)
8. `markup-calculator.tsx`
9. `compound-interest-calculator.tsx`
10. `loan-calculator.tsx`
11. `mortgage-calculator.tsx`
12. `freelancer-tax-estimator.tsx` (also removed unused `CURRENCIES` const)

Local `currency`/`currencyCode` state + custom `<select>`/`<Select>` pattern
(replaced with hook + `<CurrencySelector>`, removed `CURRENCIES` const,
removed `setCurrency("USD")` from `reset`, pruned unused Select imports where
applicable):
13. `tip-calculator.tsx`
14. `retirement-calculator.tsx`
15. `inflation-calculator.tsx`
16. `fire-calculator.tsx` (pruned unused Select imports)
17. `loan-payoff-simulator.tsx` (pruned unused Select imports)
18. `subscription-cost-tracker.tsx`
19. `invoice-due-date-tracker.tsx`
20. `mortgage-comparison.tsx` (pruned unused Select imports)

Plus the shared engine: 21 files total.

## Tools intentionally NOT changed (2 of the 20 listed finance tools)

- `percentage-calculator.tsx` — pure-numeric tool. Uses `formatNumber` only,
  displays no currency anywhere. Adding a `<CurrencySelector>` would render an
  inert control. Skipped.
- `currency-margin-calculator.tsx` — FX-spread calculator where the user
  explicitly picks base + quote currencies. Imposing a single global display
  currency would conflict with those user-chosen currencies. Tool correctly
  uses `formatNumber` (no symbol imposed). Skipped.

## Patterns applied

For tools with hardcoded `const currency = "USD";`:
```tsx
import { useCurrency, CurrencySelector } from "@/components/dueneo/currency-selector";
// ...
const { code: currency, setCode: setCurrency } = useCurrency();
// ...
<CurrencySelector value={currency} onChange={setCurrency} id="xx-currency" />
```
All existing `formatCurrency(value, { currency })` calls work unchanged because
`currency` is still a string.

For tools with local `currency`/`currencyCode` state + custom select:
- Replaced the state line with the hook call (variable names preserved so
  downstream `currency` references stay valid).
- Replaced the `<select>` (native or shadcn) with `<CurrencySelector>`.
- Removed `setCurrency("USD")` from `reset` (currency is global, not per-tool).
- Removed the `CURRENCIES` const array (no longer needed).
- Pruned unused `Select` imports (mortgage-comparison, loan-payoff-simulator,
  fire-calculator).

For business tools that used `currency.code` (because `currency` was previously
a `{code, symbol}` object from `CURRENCY_OPTIONS`): rewired every reference to
just `currency` (now a string from the hook).

## Constraints honored

- **No calculation logic changed** — only display currency.
- **No existing features removed** — every tool still has a currency selector
  (just shared now). The per-tool "default" currencies (INR for GST, EUR for
  VAT) are no longer applied, but this is the intended behavior per the task
  ("use a shared, user-selectable currency that persists across all money
  tools").
- **Persistence** — `useCurrency()` writes to localStorage `dueneo:currency`,
  shared across every tool that calls the hook.
- **Default USD** — `useCurrency()` defaults to "USD" when no localStorage
  value exists, satisfying the "must still work if user has never selected a
  currency" constraint.
- **Existing `CurrencySelector` reused** — no new selector component created.
- **`_finance-helpers.ts` `formatCurrency` kept working** — just passes
  `{ currency }` to it.
- **`sonner` toast, TypeScript strict, no backend** — all maintained.

## Verification

- `cd /home/z/my-project && bun run lint` — exits 0, 0 errors, 0 warnings.
- `bunx tsc --noEmit --skipLibCheck` — no errors in any touched file (only
  pre-existing errors in unrelated `examples/`, `games/`, `developer/`,
  `education/`, `realestate/` files from other tasks).
- `tail -50 /home/z/my-project/dev.log` — only clean `✓ Compiled` and
  `GET / 200` lines, no compile errors.
