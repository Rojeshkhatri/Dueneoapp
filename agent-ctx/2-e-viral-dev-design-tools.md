# Task 2-e-viral — Developer & Design Tools (Agent: dev-design-tools)

**Scope:** Build 8 developer/designer tools (IDs 134-141) for the Dueneo website,
all browser-only. Files placed in `src/components/tools/developer/` and
`src/components/tools/design/`. Registered through `_batch-e-registry.ts` so the
main agent can merge into `tool-router.tsx` later without parallel-edit conflicts.

## Tools built

| ID  | Component key            | File                                | Notes |
|-----|--------------------------|-------------------------------------|-------|
| 134 | `json-to-typescript`     | `developer/json-to-typescript.tsx`  | Hand-rolled TS interface/type generator. Handles nested objects (separate interfaces named after the parent key, singularised for arrays), arrays (element type inferred; objects merged into one optional-field interface), primitives, null. Options: root name, `interface` vs `type`, optional-field toggle. Syntax-highlighted `<pre>` output. |
| 135 | `sql-formatter`          | `developer/sql-formatter.tsx`       | Hand-rolled tokenizer + formatter (no library). Tokenises keywords, identifiers, strings, numbers, `--`/`/* */` comments, multi-char operators. Compound-clause merging (`GROUP BY`, `ORDER BY`, `INSERT INTO`, `DELETE FROM`, `UNION ALL`, `IS NULL`, `IS NOT NULL`, `NOT IN/LIKE/...`, `PRIMARY KEY`, `FOREIGN KEY`, `INNER/LEFT/RIGHT/FULL [OUTER] JOIN`, `START TRANSACTION`, `CROSS APPLY`). Major clauses start new line, AND/OR indented, commas split at top level, subquery parens indent. Options: 2/4 spaces or tab indent, keyword case (upper/lower/preserve), newline-per-clause toggle. |
| 136 | `css-minifier`           | `developer/css-minifier.tsx`        | Hand-rolled minifier. String-aware walker strips `/* */` block comments (toggleable), collapses whitespace, removes spaces around `{ } : ; , > + ~`, drops trailing semicolons before `}`. Before/after byte counts + savings % + copy + download. |
| 137 | `js-minifier`            | `developer/js-minifier.tsx`         | **Conservative** JS minifier. String/regex/char-class-aware comment stripper (`//` and `/* */`), whitespace collapse per line, blank-line removal, ASI-safe line joining (preserves newlines after `;` `{` `}`, before `(` `[` `+` `-` `/`; joins when prev ends with operator/`,`/`(`/`[`/`{`/`.` or a continuation keyword like `return`/`typeof`/`new`/…). Heuristic regex-start detection (after `(`, `,`, `=`, `:`, `[`, `!`, `&`, `|`, `?`, `{`, `;`, `+`, `-`, `*`, `%`, `~`, `^`, `<`, `>`, or relevant keywords). Prominent "conservative — use Terser for production" warning + before/after byte counts + savings %. |
| 138 | `jsonpath-tester`        | `developer/jsonpath-tester.tsx`     | Hand-rolled JSONPath parser + evaluator. Supports: `$` (root), `@` (current in filter), `.name`, `['name']`, `[N]` (incl. negative), `[*]` (wildcard), `..name` (recursive descent), `[?(body)]` filters with `@.path` truthy checks and `@.path OP value` comparisons (`==, !=, >, >=, <, <=`; value ∈ number, quoted string, true, false, null). Sample JSON + 5 sample paths as clickable chips. Warning when filter body uses unsupported syntax. |
| 139 | `color-shade-generator`  | `design/color-shade-generator.tsx`  | Generates 11 swatches: pure white + 4 tints (80/60/40/20% white mix) + base + 4 shades (20/40/60/80% black mix) + pure black. Linear RGB mixing (`base × (1−amount) + mixWith × amount`). Each swatch click-to-copy HEX. Base colour marked with a badge. Export as CSS variables or Tailwind colour object. 8 common-colour quick-pick chips. |
| 140 | `px-rem-converter`       | `design/px-rem-converter.tsx`       | Three-tab tool. (1) Single-value two-way converter (PX ↔ REM with swap button; EM shown as read-only since it's contextual — labelled with a footnote). (2) Batch converter: textarea, one value per line, auto-detects `px`/`rem`/`em` suffix (bare = px), results in a sortable table with copy-as-TSV. (3) Quick reference table for 8/12/14/16/18/20/24/32/48/64 px with common-use labels. Root font-size input drives all calculations. |
| 141 | `http-status-codes`      | `developer/http-status-codes.tsx`   | Static reference: 51 IANA-registered HTTP status codes (1xx=4, 2xx=10, 3xx=8, 4xx=27, 5xx=11) covering RFCs 7231/7233/7234/6585/7538/7725/8297/9110/9111 plus WebDAV. Search box (by code/name/description) + 6-tab class filter (All/1xx/2xx/3xx/4xx/5xx). Click any card to copy the numeric code. Grouped display with class-coloured badges. No backend, no input — pure reference. |

## Files created

- `src/components/tools/developer/json-to-typescript.tsx`
- `src/components/tools/developer/sql-formatter.tsx`
- `src/components/tools/developer/css-minifier.tsx`
- `src/components/tools/developer/js-minifier.tsx`
- `src/components/tools/developer/jsonpath-tester.tsx`
- `src/components/tools/developer/http-status-codes.tsx`
- `src/components/tools/design/color-shade-generator.tsx`
- `src/components/tools/design/px-rem-converter.tsx`
- `src/components/tools/_batch-e-registry.ts`
- `agent-ctx/2-e-viral-dev-design-tools.md` (this file)

## Files modified

None. Per the brief, `tool-router.tsx` was NOT modified — `batchEComponents` is exported from
`_batch-e-registry.ts` for the main agent to merge later (alongside `batchAComponents`,
`batchBComponents`, `batchCComponents`, `batchDComponents` from earlier parallel batches).

## Implementation notes

- **No new libraries installed.** Everything is hand-rolled: JSON-to-TS type inference,
  SQL tokenizer + formatter, CSS minifier, JS minifier (with regex/string-aware comment
  stripper + ASI-safe line joining), JSONPath parser + evaluator, HTTP status code data table,
  RGB colour mixing, px/rem/em math.

- **Each tool renders via `ToolLayout`** with `intro`, interactive `tool`, `howTo` (4 steps),
  `useCases` (4 bullets), `limitations` (JSX with `<ul>`), and `faq` (4 Q&A pairs). All
  processing is browser-only — no backend, no uploads.

- **Error handling:** Every input-driven tool validates empty input (shows a friendly
  "Please paste …" message), rejects inputs > 1 MB (uses `MAX_INPUT_BYTES` /
  `INPUT_TOO_LARGE_MSG` from `_dev-helpers.ts`), and shows parse errors with line/column
  where applicable (`describeJsonError`).

- **Design tools reuse `_color-helpers.ts`** for HEX/RGB/HSL conversion (`hexToRgb`,
  `rgbToHex`, `isValidHex`, `RGB` type). The shade generator adds its own `mixRgb` for
  linear interpolation rather than using the existing `shadeScale` (which uses HSL lightness)
  — RGB mixing is closer to what design tools like Figma produce when mixing in RGB mode.

- **Developer tools reuse `_dev-helpers.ts`** for `MAX_INPUT_BYTES`, `byteLength`,
  `formatBytes`, `downloadText`, `describeJsonError`.

- **JSONPath evaluator** uses a recursive-descent algorithm with a `Segment` AST
  (`root | child | index | wildcard | recursive | filter`). Filters support a small but
  useful subset: `@.path` (truthy) and `@.path OP value`. The tool warns when a filter body
  uses unsupported syntax (regex matching, `in` operator, script expressions).

- **SQL formatter** uses a two-pass approach: (1) tokenize, (2) merge compound keywords
  (`GROUP BY`, `LEFT OUTER JOIN`, etc.). The formatter tracks paren depth (with a stack to
  distinguish subquery parens from function-call parens) and only splits commas to new lines
  at top level — function-call commas stay inline. Multi-statement scripts (separated by `;`)
  reset the indent at each semicolon.

- **JS minifier** explicitly warns users in a yellow callout box that it's a conservative
  minifier (10–30% savings) and recommends Terser/esbuild for production (40–70% savings).
  The brief asked for this caveat.

## Issues caught & fixed

1. **JSDoc comment with `*/` inside** — `js-minifier.tsx` had a JSDoc comment containing
   literal `/*` and `*/` markers as part of the description, which prematurely closed the
   comment block. Rewrote the wording to avoid the `*/` sequence (used "slash-slash" and
   "slash-star" instead).

2. **JSX text with literal `${...}`** — `js-minifier.tsx` had `<code>${...}</code>` in the
   limitations JSX, which the SWC parser tried to interpret as a JSX expression. Wrapped
   in `{"${...}"}` to make it a string literal.

3. **JSX text with literal `{`** — same file had `<code>{</code>` which the parser tried to
   interpret as the start of a JSX expression. Changed to `<code>{"{"}</code>`. Also escaped
   a literal `&` to `&amp;` in the same limitations list for cleanliness.

## Verification

- **ESLint:** `bun run lint` exits 0 with 0 errors and 0 warnings.
- **TypeScript:** `npx tsc --noEmit --skipLibCheck` reports 0 errors in any of the 8 new
  component files or the registry file. (Pre-existing TS errors in other agents' files
  — pdf-*, security/_security-helpers, base64-decoder — are unrelated.)
- **Dev server:** `tail -50 dev.log` is clean — only `✓ Compiled in Nms` and `GET / 200`
  lines. No compile errors.
- **HTTP smoke test:** All 8 routes (`/#/json-to-typescript`, `/#/sql-formatter`,
  `/#/css-minifier`, `/#/js-minifier`, `/#/jsonpath-tester`, `/#/http-status-codes`,
  `/#/color-shade-generator`, `/#/px-rem-converter`) return HTTP 200 from Caddy (port 81).

## Follow-up for main agent

Merge `batchEComponents` from `src/components/tools/_batch-e-registry.ts` into
`TOOL_COMPONENTS` in `src/components/tools/tool-router.tsx` (single
`import { batchEComponents }` + spread into the map). Until then the 8 tools fall through to
the "Component not registered yet" placeholder. The same merge is still pending for
`batchAComponents`, `batchBComponents`, `batchCComponents`, and `batchDComponents` from
earlier parallel batches — all can be merged in a single follow-up.
