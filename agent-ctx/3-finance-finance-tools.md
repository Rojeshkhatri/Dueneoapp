# Task 3-finance — Advanced Finance Tools

**Agent:** finance
**Task ID:** `3-finance`
**Scope:** Build 7 advanced finance tools (IDs 209-215) for the Dueneo platform.

## Work Log

### Context Review
- Read `/home/z/my-project/worklog.md` to understand prior agent work (foundation Tasks 1, 2-a through 2-h, 3-content/design/ecommerce/hr/seo/social).
- Read `/home/z/my-project/src/data/tools.ts` rows 3163-3231 confirming all 7 finance tools (IDs 209-215) have `component`, `implemented: true`, `privacyLevel: "standard"`, `adProfile: "standard"` set.
- Read existing `src/components/tools/finance/_finance-helpers.ts` (parseNumber, formatCurrency, formatNumber, formatPercent, compoundInterestSeries, monthlyPayment, amortisationSchedule, FINANCE_DISCLAIMER).
- Read existing `src/components/tools/finance/compound-interest-calculator.tsx` and `loan-calculator.tsx` as structural references for `ToolLayout` usage, recharts integration and the Row/SummaryRow component pattern.
- Read `src/components/dueneo/tool-layout.tsx` for the `ToolContent` interface contract.
- Read `src/components/tools/utility/working-days-calculator.tsx` and `src/components/tools/_batch-f-registry.ts` for the batch-registry pattern.
- Confirmed `recharts`, `sonner`, `next-themes` installed; full shadcn/ui component set in `src/components/ui/`.

### Files Created

#### `src/components/tools/finance/fire-calculator.tsx` (`FireCalculator`)
- Inputs: current age, current savings, annual savings rate, expected annual return %, annual expenses, currency.
- FIRE number = annual expenses × 25 (the 4% safe withdrawal rule).
- `simulateFire()` projects balance year-by-year (annual compounding + end-of-year contribution) up to an 80-year cap, returning the years-to-FIRE and a per-year series.
- Progress bar (savings / FIRE number) via the `Progress` component.
- Projected FIRE date computed as today + (yearsToFire × 365.25 days).
- recharts `AreaChart` of balance vs FIRE target with a `ReferenceLine` at the FIRE number.
- Export `fire-calculator`.

#### `src/components/tools/finance/mortgage-comparison.tsx` (`MortgageComparison`)
- Shared loan amount + currency input.
- 3 offers side-by-side, each with editable lender name, interest rate, term (years), fees/closing costs, discount points (% of loan).
- Per offer: monthly payment (via existing `monthlyPayment` helper), total interest, upfront cost (fees + points×principal/100), total cost.
- Cheapest total cost identified by `reduce`; the cheapest offer card(s) get a green border, ring and "Cheapest" trophy badge.
- Copy summary button.
- Export `mortgage-comparison`.

#### `src/components/tools/finance/loan-payoff-simulator.tsx` (`LoanPayoffSimulator`)
- Inputs: balance, annual rate, minimum monthly payment, extra monthly payment, optional one-time lump sum + the month number to apply it.
- `simulatePayoff()` runs month-by-month: accrue interest, apply (min + extra) payment, apply lump sum at the chosen month (1-indexed, before interest).
- Detects "underpaid" condition (payment doesn't cover monthly interest) and shows an amber warning.
- Cap of 1200 months (100 years).
- Outputs: payoff time (yr/mo), total interest, total paid — for both baseline and accelerated schedules.
- Months saved + interest saved highlighted in emerald.
- recharts `LineChart` with two lines (baseline amber, accelerated blue), downsampled to ≤120 points.
- Export `loan-payoff-simulator`.

#### `src/components/tools/finance/freelancer-tax-estimator.tsx` (`FreelancerTaxEstimator`)
- Inputs: annual gross income, business expenses, filing status (single / married filing jointly), tax year (2024 only — others blocked at the Select).
- Computes:
  - Net earnings = income − expenses.
  - SE tax = 15.3% on 92.35% of net; SS portion (12.4%) capped at $168,600 wage base, Medicare (2.9%) uncapped. Half of SE tax is deductible.
  - QBI deduction = 20% × (net − half-SE-tax) — simplified, doesn't model SSTB phase-out (documented in limitations).
  - AGI = net − half-SE − QBI; taxable income = AGI − standard deduction ($14,600 single / $29,200 MFJ for 2024).
  - Federal income tax via the 2024 IRS 7-bracket schedule, with a per-bracket breakdown table.
- Outputs: total tax, effective rate, after-tax income, quarterly estimated payment (÷4).
- Amber warning callout listing what's NOT modelled (state tax, Additional Medicare Tax, etc.).
- Export `freelancer-tax-estimator`.

#### `src/components/tools/finance/currency-margin-calculator.tsx` (`CurrencyMarginCalculator`)
- Inputs: from-currency, to-currency (free-text 3-letter, with datalist of popular codes), mid-market rate, customer rate, transaction amount.
- Swap button inverts the currencies and reciprocals the rates.
- Computes:
  - Margin per unit (mid − customer) in quote currency.
  - Margin % = (mid − customer) / mid × 100.
  - Amount at mid-market vs amount at offered rate.
  - Loss/gain in quote currency and base-currency equivalent.
  - Effective exchange rate (= customer rate).
- Loss card turns red on a loss, emerald on a (rare) gain.
- Export `currency-margin-calculator`.

#### `src/components/tools/finance/invoice-due-date-tracker.tsx` (`InvoiceDueDateTracker`)
- Add/remove/clear multiple invoices; each row: invoice number, client, issue date, amount, payment terms (Net 7 / 15 / 30 / 60 / EOM / Custom + custom days).
- Due-date logic: Net N = issue + N days; EOM = last day of issue month; custom = issue + N days.
- Days-until-due / days-overdue computed via whole-calendar-day diff.
- Status badges: Overdue (rose), Due-soon (amber, ≤7 days), Upcoming (muted), Paid (emerald), No date (muted).
- Status badge is clickable to toggle paid/unpaid.
- Sort by urgency: overdue → due-soon → upcoming → paid → invalid.
- Totals: Outstanding, Overdue, Paid — colour-coded StatCards.
- Overdue rows highlighted with a rose background tint.
- localStorage persistence under `dueneo:invoices:v1`; sample invoices seeded on first visit.
- Export `invoice-due-date-tracker`.

#### `src/components/tools/finance/subscription-cost-tracker.tsx` (`SubscriptionCostTracker`)
- Add/remove/clear multiple subscriptions; each: name, cost, billing period (weekly / monthly / yearly), start date, status (active / cancelled).
- Per subscription: monthly equivalent (weekly × 52/12, monthly as-is, yearly ÷ 12), annual equivalent, periods paid (whole billing periods since start), lifetime cost (periodsPaid × cost).
- Subscriptions above the $20/month threshold (active only) get an amber border + "Expensive" sparkles badge.
- Sort by monthly cost descending, active before cancelled.
- Totals: Monthly (active), Annual (active), Lifetime (all).
- localStorage persistence under `dueneo:subscriptions:v1`; sample subscriptions seeded on first visit.
- Export `subscription-cost-tracker`.

#### `src/components/tools/_batch-finance2-registry.ts`
- Exports `batchFinance2Components: Record<string, ComponentType<{ tool: ToolDefinition }>>` mapping all 7 component keys.
- Pattern matches existing batch registries (`_batch-a-registry.ts`, `_batch-f-registry.ts`, etc.).
- The main agent will spread this into `TOOL_COMPONENTS` in `tool-router.tsx` (per task constraints I did NOT edit that file).

### Issues Caught & Fixed
1. **Wrong import path in `fire-calculator.tsx`**: initial import was `./finance/_finance-helpers` (left over from when the file was created at `src/components/tools/fire-calculator.tsx` and moved into the `finance/` folder). Fixed to `./_finance-helpers` after `bunx tsc` would have flagged it.
2. **No "mark paid" UI in `invoice-due-date-tracker.tsx`**: original implementation only showed the paid badge but had no way to set an invoice to paid. Wrapped `StatusBadge` in a clickable `<button>` that toggles `inv.paid`. Updated how-to text and the in-page hint to match.

### Verification
- `bun run lint` → exit 0, no errors or warnings.
- `bunx tsc --noEmit --skipLibCheck` → no errors in any of the 7 new component files or the batch registry (other unrelated errors in `games/`, `pdf/`, `hr/` and `developer/` exist in the project but are not from this task).
- `tail /home/z/my-project/dev.log` → no compile errors, dev server still serving `GET / 200`.
- Components will only render once the main agent imports and spreads `batchFinance2Components` into `TOOL_COMPONENTS` in `tool-router.tsx` (the registry file is wired to be merged by the main agent to avoid git conflicts from concurrent edits).

### Files Created
- `src/components/tools/finance/fire-calculator.tsx`
- `src/components/tools/finance/mortgage-comparison.tsx`
- `src/components/tools/finance/loan-payoff-simulator.tsx`
- `src/components/tools/finance/freelancer-tax-estimator.tsx`
- `src/components/tools/finance/currency-margin-calculator.tsx`
- `src/components/tools/finance/invoice-due-date-tracker.tsx`
- `src/components/tools/finance/subscription-cost-tracker.tsx`
- `src/components/tools/_batch-finance2-registry.ts`

### Files Modified
- None outside `src/components/tools/finance/` and `src/components/tools/` (per the constraint not to edit `tool-router.tsx`).

### Follow-ups for Main Agent
- Import and spread `batchFinance2Components` from `./_batch-finance2-registry` into `TOOL_COMPONENTS` in `src/components/tools/tool-router.tsx`, following the existing batch registry pattern (lines 105-110 and 224-229).
- All 7 finance tools already have `implemented: true` and matching `component` keys in `src/data/tools.ts` — no registry edits needed.
