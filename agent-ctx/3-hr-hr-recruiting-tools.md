# Task 3-hr — HR & Recruiting Tools

**Agent:** hr-recruiting-tools
**Task ID:** 3-hr
**Scope:** 10 HR & recruiting tools (IDs 199-208) in the Dueneo tool registry.
**Status:** ✅ Complete. Lint clean. Dev server compiles cleanly.

## Files created

### Shared helpers
- `src/components/tools/hr/_hr-helpers.ts` — number/date parsing & formatting, date math (`addDays`, `totalDaysBetween`, `nextAnniversary`, `yearsOfService`), DOW helpers, CSV helpers (`csvField`, `downloadText`), and **a built-in cost-of-living index table for 70 major world cities** (`CITY_COL_TABLE`) with `label`, `country`, `index` (NYC=100 baseline), `rentIndex`, native `currency`, plus `findCity` / `citiesByCountry` helpers.

### Tool components (under `src/components/tools/hr/`)
1. `resume-ats-scanner.tsx` — `ResumeAtsScanner` — sensitive. Two textareas (resume + JD), keyword extraction (stopwords filtered, technical tokens preserved), 0-100 score (keyword 50% + section 25% + formatting 25%), missing/matched keywords, section detection, formatting-issue detection, tailored suggestions, sample-data loader.
2. `salary-comparison-calculator.tsx` — `SalaryComparisonCalculator` — current/target city selects (70 cities, grouped by country via optgroups), equivalent salary, purchasing power delta, +5% recommended ask, swap button, Recharts bar chart.
3. `notice-period-calculator.tsx` — `NoticePeriodCalculator` — resignation date, notice period (days/weeks/months), exclude-weekends/holidays switches, custom-holiday list, last working day, calendar/working/weekend/holiday breakdown, live 1-second countdown.
4. `pto-calculator.tsx` — `PtoCalculator` — annual allowance, used, optional accrued-so-far, accrual rate (monthly/quarterly/annual), current date, carryover cap. Amber Alert when projected year-end > cap. Two progress bars + periods-left stat grid.
5. `interview-scorecard-builder.tsx` — `InterviewScorecardBuilder` — competencies with 1-5 weights + question banks, 1-5 rating buttons + notes per competency, weighted overall score, print via `window.print()` with print CSS (only `#dueneo-printable-scorecard` prints), Save/Load template to/from localStorage.
6. `offer-comparison-tool.tsx` — `OfferComparisonTool` — 2-4 offers, per-offer: company/base/bonus/equity-annualised/benefits/commute/PTO. Total comp + effective hourly rate (factoring commute & PTO). Side-by-side `Table`. Best-by-total-comp (emerald) + best-by-hourly (sky) highlights.
7. `cost-to-company-calculator.tsx` — `CostToCompanyCalculator` — base/bonus + pension % slider + health $ + other $ + payroll-tax % slider. Annual + monthly CTC, per-component breakdown, Recharts donut chart, overhead ratio, per-day & per-hour employer cost.
8. `payslip-analyzer.tsx` — `PayslipAnalyzer` — sensitive. Gross + dynamic deductions list. Total deductions, net pay (annual/monthly/fortnightly), deduction %, effective tax rate (tax/social-security deductions only), Recharts donut chart with net-pay slice + per-deduction slices.
9. `shift-planner.tsx` — `ShiftPlanner` — employees textarea (one per line), start date, days (1-31), manual or round-robin mode. Three shifts: Morning 06-14 / Evening 14-22 / Night 22-06. Click cells to cycle. Conflict detection (morning-after-night, 6+ consecutive work days). Coverage row. CSV export.
10. `work-anniversary-tracker.tsx` — `WorkAnniversaryTracker` — add/remove employees with name + start date. Years of service, next anniversary date, days until. Milestone highlight (1, 5, 10, 15, 20, 25). Sorted by upcoming. Upcoming panel (60 days) + full sorted table. localStorage save/load. CSV export.

### Batch registry
- `src/components/tools/_batch-hr-registry.ts` — exports `batchHrComponents` map (10 keys matching the `component` field in `src/data/tools.ts`). **Did NOT edit `tool-router.tsx`** per task instructions — main agent should add `...batchHrComponents` to the `TOOL_COMPONENTS` map.

## Key implementation notes

### Sensitive PrivacyNote
- `resume-ats-scanner.tsx` and `payslip-analyzer.tsx` include an additional in-body `<PrivacyNote level="sensitive">` emphasising that input never leaves the browser, in addition to the standard PrivacyNote rendered by `ToolLayout`.

### Recharts usage
- Used in 4 places: `salary-comparison-calculator.tsx` (BarChart + Cell + LabelList), `cost-to-company-calculator.tsx` (PieChart donut), `payslip-analyzer.tsx` (PieChart donut). All colors use direct CSS custom properties (`var(--chart-2)`, `var(--primary)`, etc.) rather than `hsl(var(--...))` wrappers — the project's Tailwind v4 token setup uses oklch values directly, so `hsl(var(--...))` would be invalid CSS.

### Date / locale handling
- All currency formatting uses `Intl.NumberFormat` with `navigator.language` locale.
- All date formatting uses `Intl.DateTimeFormat` via `formatPrettyDate` helper.
- `nextAnniversary` rolls to next year if this year's anniversary has already passed (or is today).
- `yearsOfService` is the calendar-year floor — only increments on the anniversary date.

### localStorage persistence
- `interview-scorecard-builder.tsx` — key `dueneo:interview-scorecard:v1` — saves the scorecard *template* (role, competencies, questions) only, not the live ratings/notes (those are session state by design — fresh rubric per candidate).
- `work-anniversary-tracker.tsx` — key `dueneo:work-anniversaries:v1` — saves the employee list.

### Print CSS (interview-scorecard-builder.tsx)
- Inline `<style>` block scoped to `body.dueneo-print-scorecard` — when the class is on `<body>`, everything is `visibility: hidden` except `#dueneo-printable-scorecard` and its children (positioned absolute at top-left, width 100%, padding 24px). The class is added before `window.print()` and removed 1 second after.

## Verification
- `bun run lint` → exit 0, no errors, no warnings.
- `tail dev.log` → only `✓ Compiled in …` and `GET / 200` responses. No compile errors after the new files were added.
- All 10 component files + `_hr-helpers.ts` + `_batch-hr-registry.ts` are in place (11 files in `src/components/tools/hr/`, 1 in `src/components/tools/`).

## Follow-ups for the main agent
1. Merge `...batchHrComponents` into `TOOL_COMPONENTS` in `src/components/tools/tool-router.tsx` (one-line spread, same pattern as `...batchContentComponents` and the other batch registries).
2. After the merge, smoke-test the 10 routes:
   - `#/resume-ats-scanner`
   - `#/salary-comparison-calculator`
   - `#/notice-period-calculator`
   - `#/pto-calculator`
   - `#/interview-scorecard-builder`
   - `#/offer-comparison-tool`
   - `#/cost-to-company-calculator`
   - `#/payslip-analyzer`
   - `#/shift-planner`
   - `#/work-anniversary-tracker`
3. None of these tools have any backend dependencies — once routed, they will work standalone.
