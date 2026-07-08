# Task 3-edu-real — Education + Real Estate Tools

**Agent:** edu-real
**Date:** 2025 build
**Task:** Implement 19 tools — 9 education (IDs 216-224) + 10 real estate (IDs 225-234) for the Dueneo platform.

## What I built

### Shared helpers
- `src/components/tools/education/_edu-helpers.ts` — numeric/date/storage/CSV helpers + `EDU_DISCLAIMER`.
- `src/components/tools/realestate/_re-helpers.ts` — same shape + `monthlyPayment`, `STAMP_DUTY_REGIONS`, `STAMP_DUTY_TABLE` (marginal brackets + first-time-buyer relief), `computeStampDuty` engine, `RE_DISCLAIMER`.

### Education tools (9)
1. **citation-formatter** — APA 7 / MLA 9 / Chicago / Harvard for book, journal, website, newspaper. Handles author lists with `et al.` and 21-author truncation.
2. **flashcard-generator** — study mode (flip, mark known/unknown, shuffle), CSV/JSON/printable-HTML export, localStorage.
3. **quiz-randomizer** — paste parser for `Q:`/`A)`/`Ans:` blocks, generates 1-5 variants with shuffled question + answer order.
4. **study-planner** — exam date, topic list, weekday picker; balanced allocator (largest topic first to lowest-load day), calendar grid with checkboxes, localStorage.
5. **assignment-countdown** — live per-second countdown, color-coded urgency (green/amber/red/overdue), localStorage.
6. **formula-sheet-creator** — monospace formula render (no KaTeX in this build), category grouping, print-to-PDF via new tab + print CSS, localStorage.
7. **grade-predictor** — required final-exam score with feasibility check (out of reach > 100%, guaranteed ≤ 0%), projected grade if same average.
8. **attendance-calculator** — current %, classes-can-still-miss, classes-must-attend-in-a-row, traffic-light status.
9. **exam-timer** — big countdown (ok/amber/red), per-question pacing, three-note Web Audio chime at end.

### Real-estate tools (10)
1. **rental-yield-calculator** — gross/net yield, optional mortgage for cash-on-cash.
2. **mortgage-affordability-calculator** — 28/36 rule, max P&I, max principal, max home price, DTI ratio cards.
3. **stamp-duty-calculator** — UK/NSW/VIC/India/Ireland/US marginal brackets with first-time-buyer relief.
4. **renovation-budget-planner** — per-room line items, variance tracking, CSV export, localStorage.
5. **property-roi-calculator** — total returns, profit, ROI %, annualised ROI (geometric mean).
6. **airbnb-income-estimator** — monthly/annual gross + net, occupancy sensitivity (-10% stress test).
7. **cap-rate-calculator** — multi-property NOI + cap rate, comparison table, "what does cap rate mean?" ranges.
8. **house-flipping-calculator** — total cost, profit, ROI %, annualised ROI (12/months exponent).
9. **property-comparison-dashboard** — up to 4 properties side-by-side, best-value/best-yield highlights, pros/cons cards.
10. **cash-flow-analyzer** — gross/effective income, percentage-based reserves, monthly + annual net, Recharts expense breakdown.

All 10 realestate tools include the `RE_DISCLAIMER` ("estimate only, not professional advice") as an in-body amber callout AND in limitations.
All 9 education tools include the `EDU_DISCLAIMER` in limitations.

## Registry files (per the explicit constraint NOT to edit tool-router.tsx)
- `src/components/tools/_batch-education-registry.ts` → `batchEducationComponents` (9 keys)
- `src/components/tools/_batch-realestate-registry.ts` → `batchRealestateComponents` (10 keys)

The main agent should spread both maps into `TOOL_COMPONENTS` in `tool-router.tsx` (mirroring `...batchAComponents` etc.).

## Verification
- `bun run lint` → 0 errors, 0 warnings.
- Dev server (`tail dev.log`) → clean compilation, only `✓ Compiled` and `GET / 200` entries.
- Both batch registry files load via a one-off bun script — education has 9 keys, realestate has 10 keys, all matching the `component` field in `src/data/tools.ts`.
- All 19 component files import cleanly via bun (no missing exports / broken imports).

## Tech notes
- TypeScript strict, shadcn/ui (Card, Input, Label, Button, Select, Checkbox, Badge, Textarea, Table, CopyButton), sonner toast, lucide icons.
- `recharts@2.15.4` for the cash-flow expense breakdown chart.
- `Intl.NumberFormat` for currency, `Intl.DateTimeFormat` for dates.
- localStorage for flashcard-generator, study-planner, assignment-countdown, formula-sheet-creator, renovation-budget-planner.
- Web Audio API for exam-timer end-of-exam chime (handles autoplay restrictions).
- No KaTeX installed — formula-sheet-creator renders formulas in monospace as plain text (per the spec: "use KaTeX if installed, else monospace").
- No backend, no API routes, no uploads — everything runs in the browser.
