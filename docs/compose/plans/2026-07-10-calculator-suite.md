# Calculator Suite Implementation Plan

**Goal:** Add Scientific, Graphing, and Business calculators to Dueneo with shared switcher UI.

**Architecture:** Three separate tool pages + shared `_calculator-suite.tsx` wrapper with tab switcher. Each calculator is self-contained but shares common UI patterns.

**Dependencies to install:** `mathjs`, `decimal.js`, `formulajs`, `function-plot`

**Files to create:**
- `src/components/tools/finance/_calculator-suite.tsx` — shared switcher/layout
- `src/components/tools/finance/scientific-calculator.tsx`
- `src/components/tools/finance/graphing-calculator.tsx`
- `src/components/tools/finance/business-calculator.tsx`

**Files to modify:**
- `src/data/tools.ts` — register 3 new tools (IDs 239-241)
- `src/components/tools/tool-router.tsx` — add 3 lazy imports
- `package.json` — add new dependencies

## Tasks

### T1: Install dependencies
Run: `npm install mathjs decimal.js formulajs function-plot`

### T2: Create shared calculator suite component
Create `src/components/tools/finance/_calculator-suite.tsx` with:
- Tab switcher (Scientific | Graphing | Business)
- Shared display/result area
- Formula reference panel (collapsible)
- Guide/how-to section

### T3: Create Scientific Calculator
Features: expression input, trig functions, log/exp, constants (pi, e), parentheses, memory, history, keyboard support.

### T4: Create Graphing Calculator
Features: function input, canvas-based graph, zoom/pan, multiple function plots, grid/axis labels, intersection points.

### T5: Create Business Calculator
Features: TVM (PV, FV, PMT, N, I/Y), NPV, IRR, amortization schedule, depreciation, break-even analysis.

### T6: Register tools and deploy
Add to tools.ts, tool-router.tsx, build, deploy.
