# Task 2-e — Finance & Business Tools

**Agent:** finance-business-tools
**Scope:** 10 finance tools (IDs 81–90) + 5 business tools (IDs 76–80) — total **15 components**.

## Summary

All 15 components are implemented as browser-only React client components, registered
in `tool-router.tsx`, lint-clean, and the dev server compiles without errors.

## Files created

### Shared helpers & shells
- `src/components/tools/finance/_finance-helpers.ts` — `parseNumber`, `formatCurrency`,
  `formatNumber`, `formatPercent`, `compoundInterestSeries`, `monthlyPayment`,
  `amortisationSchedule`, `toRawNumberString`, `FINANCE_DISCLAIMER`.
- `src/components/tools/finance/_tax-calculator.tsx` — `TaxCalculator` shared engine
  used by the GST, VAT and Sales Tax tools; takes a `TaxCalculatorConfig` (taxName,
  defaultRate, presets, currency) and renders both the form and the result panel.
- `src/components/tools/business/_business-helpers.ts` — `parseNumber`, `formatCurrency`,
  `formatDate`, `todayISO`, `plusDaysISO`, `defaultDocumentNumber`, `makeLineItemId`,
  `lineTotal`, `subtotal`, `LineItem` interface.
- `src/components/tools/business/_business-document.tsx` — `BusinessDocumentShell`
  shared two-column layout (form on the left, live preview on the right wrapped in
  `.print-area`), `FormSection` and `Field` primitives. Includes the `@media print`
  CSS block that hides everything except the document for print-to-PDF.

### Finance tools (10)
- `src/components/tools/finance/gst-calculator.tsx` — `GstCalculator` (default 18%,
  presets 0/5/12/18/28, INR).
- `src/components/tools/finance/vat-calculator.tsx` — `VatCalculator` (default 20%,
  presets 0/5/9/13.5/20/23/25, EUR).
- `src/components/tools/finance/sales-tax-calculator.tsx` — `SalesTaxCalculator`
  (default 7%, presets 0/4/6/7/8.25/8.875/10, USD).
- `src/components/tools/finance/discount-calculator.tsx` — `DiscountCalculator` with
  up to 6 stacked or combined percentage tiers, per-tier price breakdown, effective
  discount + amount saved + final price.
- `src/components/tools/finance/profit-margin-calculator.tsx` — `ProfitMarginCalculator`
  with gross profit, gross margin %, markup on cost, loss warning.
- `src/components/tools/finance/markup-calculator.tsx` — `MarkupCalculator` with two
  solve modes (Cost + Markup → Price, Cost + Price → Markup) and markup presets.
- `src/components/tools/finance/compound-interest-calculator.tsx` — `CompoundInterestCalculator`
  with principal, annual rate, compounding frequency (1/2/4/12/52/365× per year),
  years and optional annual contribution. Renders a recharts AreaChart showing the
  balance, contributions and interest growth year-by-year.
- `src/components/tools/finance/loan-calculator.tsx` — `LoanCalculator` using the
  standard annuity formula; shows monthly payment, total payment, total interest and
  a 12-row amortisation preview table.
- `src/components/tools/finance/mortgage-calculator.tsx` — `MortgageCalculator` with
  home price, down payment, rate, term, annual property tax and home insurance. Shows
  PITI monthly breakdown, total interest, lifetime cost, PMI warning when down payment
  is below 20%, and a 12-row amortisation preview.
- `src/components/tools/finance/percentage-calculator.tsx` — `PercentageCalculator`
  with three tabs (X% of Y, X is what % of Y, % change from X to Y) including an
  Increase/Decrease badge and absolute-change readout.

### Business tools (5)
- `src/components/tools/business/invoice-generator.tsx` — `InvoiceGenerator` with
  from/bill-to/line items/tax/notes/currency. Live preview titled “INVOICE” with
  subtotal, tax, total due, notes, and Print button.
- `src/components/tools/business/quote-generator.tsx` — `QuoteGenerator` same
  structure as invoice but titled “QUOTE” and with a “valid until” date instead of
  due date.
- `src/components/tools/business/receipt-generator.tsx` — `ReceiptGenerator` with
  payer/payee/amount/payment method/reference/description, prominent amount-received
  panel and signature + date lines.
- `src/components/tools/business/purchase-order-generator.tsx` — `PurchaseOrderGenerator`
  with buyer/vendor/ship-to, PO #, delivery date, line items, tax, shipping and total,
  plus an authorised-by signature line.
- `src/components/tools/business/delivery-note-generator.tsx` — `DeliveryNoteGenerator`
  with from/deliver-to, delivery note #, PO reference, qty-ordered vs qty-delivered
  table (short shipments highlighted in amber with ⚠), notes and received-by signature
  line. Prices intentionally excluded.

## Files modified
- `src/components/tools/tool-router.tsx` — imported and registered all 15 components.

## Implementation notes

- **Finance helpers** (`_finance-helpers.ts`) are pure functions; no JSX so they stay
  a `.ts` module. Currency formatting uses `Intl.NumberFormat` with a manual fallback
  when `Intl` is unavailable.
- **Compound-interest chart** uses `recharts@2.15.4` (already installed). The chart
  shows an AreaChart with stacked Contributions and Balance areas plus a dashed
  Interest line. Tooltip + Legend are configured.
- **Tax calculator** uses a shared `TaxCalculator` component so the GST/VAT/Sales Tax
  tools are thin wrappers (~80 lines each) that pass a `TaxCalculatorConfig`. This
  avoids 3× duplicated ~250-line files.
- **Business document shell** uses `window.print()` for PDF generation. A `<style>`
  block with `@media print` rules hides everything except `.print-area` and positions
  the document at top-left with full width. No `jspdf` or `html2canvas` installed.
- **Disclaimer:** every finance tool's `limitations` section includes the
  `FINANCE_DISCLAIMER` ("This calculator produces an estimate only and is not
  professional financial, tax or investment advice…").
- **Empty-input handling:** all finance tools default to 0 via `parseNumber`; the
  business tools pre-fill sample data so the live preview is immediately useful and
  editable.
- **Recharts responsive chart** is wrapped in a fixed-height container (`h-72`) so
  `ResponsiveContainer` has a defined height to render into.

## Issues caught & fixed

- **React Compiler (`react-hooks/preserve-manual-memoization`) errors** on
  `loan-calculator.tsx` and `mortgage-calculator.tsx` — both used `useMemo` with
  dependencies that the compiler couldn't guarantee wouldn't be mutated. Fixed by
  removing the `useMemo` (the amortisation calculation is ≤12 rows of arithmetic,
  trivially cheap to recompute on every render). Lint now exits 0.

## Verification

- `bun run lint` → exit 0, no errors or warnings.
- `tail /home/z/my-project/dev.log` → no compile errors; only `Compiled in Nms` and
  `GET / 200` lines after the changes.
- `curl http://127.0.0.1:81/` → HTTP 200, homepage renders cleanly.
- `curl http://127.0.0.1:81/#/gst-calculator` → HTTP 200 (SPA hash route).
- `curl http://127.0.0.1:81/#/invoice-generator` → HTTP 200.

## Follow-ups for future agents

- The finance helpers file is reusable for any later task that needs
  currency formatting, compound-interest series, monthly-payment maths or
  amortisation schedules.
- The business document shell is reusable for any future printable-document
  tool (e.g. credit note, statement of work) — just supply `form` and
  `preview` React nodes.
- The compound-interest chart could optionally support variable annual
  contributions (inflation step-ups) and tax-on-interest if a future
  iteration wants that depth.
- Logo upload for the business documents would require a FileReader →
  data-URL → `<img>` render in the preview; trivial to add if requested.
