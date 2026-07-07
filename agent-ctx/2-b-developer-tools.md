# Task 2-b — Developer Tools (agent: developer-tools)

## Scope
Implemented all 16 developer / text tools flagged `implemented: true` in the
registry (IDs 36-49, 51-54 and 74) as browser-only React client components
under `src/components/tools/developer/`, registered them in the tool router,
and verified the build with `bun run lint` and the dev server log.

## Tools built
| # | File | Component | Notes |
|---|------|-----------|-------|
| 1 | `json-formatter.tsx` | `JsonFormatter` | 2/4 spaces or tab indent, parse errors with line + excerpt, before/after size |
| 2 | `json-validator.tsx` | `JsonValidator` | ✓ valid / ✗ invalid banner, line + column + excerpt, type hint + byte size on success |
| 3 | `json-minifier.tsx` | `JsonMinifier` | compact `JSON.stringify`, before/after bytes + savings % |
| 4 | `xml-formatter.tsx` | `XmlFormatter` | 2/4 spaces or tab, hand-rolled `formatXml`, tag-balance warning |
| 5 | `csv-to-json.tsx` | `CsvToJson` | Delimiter picker, header-row toggle, trim, auto-coerce numbers/booleans/null |
| 6 | `json-to-csv.tsx` | `JsonToCsv` | Auto-detects union of keys, JSON-stringifies nested objects/arrays, auto-quote |
| 7 | `base64-encoder.tsx` | `Base64Encoder` | Two tabs: Text→Base64 + File→Data URL via `FileReader`. URL-safe toggle |
| 8 | `base64-decoder.tsx` | `Base64Decoder` | Auto-detects data URLs, offers download for binary blobs, UTF-8 fallback |
| 9 | `url-encoder.tsx` | `UrlEncoder` | `encodeURIComponent` / `encodeURI` toggle |
| 10 | `url-decoder.tsx` | `UrlDecoder` | `decodeURIComponent` / `decodeURI` toggle, friendly stray-`%` errors |
| 11 | `html-escape.tsx` | `HtmlEscape` | Escape → entities / unescape → text direction toggle, optional quote escaping, Flip button |
| 12 | `regex-tester.tsx` | `RegexTester` | Flag buttons g/i/m/s/u/y, live `<mark>` highlighting, matches table with capture groups |
| 13 | `diff-checker.tsx` | `DiffChecker` | Hand-rolled LCS line diff (no library), ignore-case + normalise-whitespace toggles, unified copy |
| 14 | `unix-timestamp-converter.tsx` | `UnixTimestampConverter` | Live ticking clock, seconds/ms toggle, datetime-local picker, local/UTC/ISO/relative readouts |
| 15 | `cron-expression-builder.tsx` | `CronExpressionBuilder` | 5 preset dropdowns + custom-expression override, plain-English description, next 5 runs |
| 16 | `markdown-previewer.tsx` | `MarkdownPreviewer` | Two-pane editor + preview using `react-markdown` v10 (default import), styled via Tailwind arbitrary selectors |

## Shared helpers
Created `src/components/tools/developer/_dev-helpers.ts` (a `.ts` module —
no JSX) with:
- `MAX_INPUT_BYTES` (1 MB) + `INPUT_TOO_LARGE_MSG`
- `byteLength` (UTF-8 via `TextEncoder`), `formatBytes`
- `downloadText`, `downloadBlob`
- Base64 helpers: `encodeBase64`, `decodeBase64ToText`, `decodeBase64ToBytes`,
  `bytesToBase64` (with URL-safe mode), `readFileAsDataURL`
- `describeJsonError` — extracts `{message, line, column, excerpt}` from V8
  ("position N") and SpiderMonkey ("line N column M") parse error messages
- `escapeHtml` / `unescapeHtml` — handles `& < > " '` plus named entities
  (`&amp; &lt; &gt; &quot; &#39; &apos; &nbsp;`) and numeric entities
  (`&#NNN;`, `&#xNN;`)
- `formatXml` — hand-rolled tokenising pretty-printer (tags, comments, CDATA,
  processing instructions, self-closing tags, attributes with quoted
  delimiters); does not require a parser library
- `parseCsv` — RFC-4180-style quoted-field parser supporting embedded
  delimiters, newlines and `""` escapes
- `csvField` — auto-quoter that wraps a field in quotes only when needed

## Registration
Updated `src/components/tools/tool-router.tsx`:
- Added 16 imports at the top (under a `// Developer tools (Task 2-b)` comment).
- Added 16 entries to the `TOOL_COMPONENTS` map with keys exactly matching the
  `component` field in `src/data/tools.ts`.

## Issues encountered & fixes
1. **JSX parsing failures** with literal `<` `>` characters in JSX text and
   attribute strings — `html-escape.tsx` had a `<li>` containing
   `<, >, &, ", '` and `xml-formatter.tsx` had a `placeholder="<?xml ...?>"`
   attribute. Fixed by replacing JSX text with `<code>&lt;</code>` entities
   and by wrapping the placeholder string in a `{'...'}` JSX expression so
   the `<` is parsed inside a string literal rather than as a tag opener.
2. **`react-markdown` v10 import** — `import { Markdown } from "react-markdown"`
   fails because the package root `index.js` only re-exports `Markdown as
   default` (along with `MarkdownAsync`, `MarkdownHooks`,
   `defaultUrlTransform`). Switched to `import Markdown from "react-markdown"`.
3. **Unused `eslint-disable`** in `base64-encoder.tsx` — removed the
   directive and replaced it with a comment explaining why `text` and
   `output` are intentionally omitted from the `useEffect` deps array.

## Verification
- `bun run lint` → exits 0, no errors or warnings.
- `tail dev.log` → only `✓ Compiled` and `GET / 200` entries after the fixes;
  no `⨯` or "Parsing ecmascript source code failed" lines from the
  developer-tool files.
- `curl -sS http://127.0.0.1:81/ -o /tmp/home.html -w "%{http_code}\n"` → 200,
  homepage lists developer tool links (`/json-formatter`, `/base64-encoder`,
  `/regex-tester`, etc.).
- Smoke-tested all 16 hash routes via `curl http://127.0.0.1:81/#/<slug>` —
  every request returns HTTP 200 (the homepage serves the same HTML, the
  tool renders client-side via the hash router).

## Constraints honoured
- No backend API routes. All processing is browser-only.
- No file uploads (except `FileReader` for local base64 encoding in
  `base64-encoder.tsx`, which never transmits the file).
- TypeScript strict — no `any` used.
- Existing shadcn/ui components reused (`Button`, `Textarea`, `Label`,
  `RadioGroup`, `Switch`, `Tabs`, `ToggleGroup`, `Select`, `Input`,
  `Slider`-adjacent patterns from the image tools).
- `sonner` `toast` for success/error notifications.
- No new heavy libraries — `react-markdown` was already installed; the diff
  is a hand-rolled LCS, the cron matcher is hand-rolled, the XML formatter
  is hand-rolled, and the CSV parser is hand-rolled.
- Every tool rejects inputs >1 MB with a friendly error and handles empty
  and invalid input gracefully.

## Follow-ups for future agents
- The registry still lists YAML Formatter (id 40), CSV↔Excel (ids 43-44) and
  JWT Decoder (id 50) as `implemented: false` (no `component` key) — those
  fall through to `ComingSoonTool`. YAML needs `js-yaml`, Excel needs
  `SheetJS`, JWT decoder belongs to the security category.
- Regex lookbehind support depends on the user's browser (Safari < 16.4
  lacks it). Consider adding a note for Safari users in `regex-tester.tsx`.
- Markdown previewer uses core CommonMark only. To enable GFM tables,
  strikethrough and task lists, install `remark-gfm` and pass it as a plugin.
- `cron-expression-builder.tsx` could grow support for `L` (last day),
  `W` (nearest weekday) and `#` (nth weekday) tokens if needed.
- `diff-checker.tsx` is line-based — a character-level intra-line diff would
  make small edits inside long lines easier to spot.
