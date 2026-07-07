# Task 2-d — Text Tools

**Agent:** text-tools
**Task ID:** 2-d
**Date:** 2026-07-07

## Scope

Implement 14 of the 15 text tools flagged `implemented: true` in the Dueneo
registry (IDs 61–73, 75). The 15th — Markdown Previewer (id 74) — was already
implemented by the developer-tools agent in Task 2-b, so it was deliberately
skipped to avoid duplication. All processing is browser-only, with no backend
API routes and no uploads.

## Files created

- `src/components/tools/text/_text-helpers.ts` — shared utilities (no JSX, `.ts` module):
  - Size helpers: `MAX_INPUT_BYTES` (1 MB cap), `INPUT_TOO_LARGE_MSG`,
    `byteLength` (UTF-8 via `TextEncoder`), `formatBytes`, `formatInt`
    (thousands-separated integer), `downloadText`.
  - Count helpers: `countWords`, `countSentences` (split on `. ! ?` with
    whitespace filtering), `countParagraphs` (split on blank-line runs),
    `countLines`.
  - Reading-time helpers: `formatDuration(seconds)` returning `"X min Y sec"`
    or `"Y sec"`.
  - Case conversions: `splitWords` (handles camelCase, PascalCase, snake_case,
    kebab-case, CONSTANT_CASE and plain whitespace), `toUpperCase`,
    `toLowerCase`, `toTitleCase`, `toSentenceCase` (heuristic sentence
    boundary detection), `toCamelCase`, `toPascalCase`, `toSnakeCase`,
    `toKebabCase`, `toConstantCase`.
  - Slug generator: `slugify(text, opts)` supporting `-` or `_` separator,
    optional lower-casing, accent stripping (NFKD + combining-mark removal)
    and stop-word removal (built-in 43-word English stop list).
  - Lorem Ipsum generator: `generateLorem(kind, count, seed)` producing
    paragraphs (3–6 sentences each), sentences or words from a fixed ~80-word
    bank of classic Cicero-derived Latin. Uses Mulberry32 PRNG so the same
    seed reproduces the same output; `makeParagraph` and `makeSentence`
    capitalise first letters and append periods.

- `src/components/tools/text/word-counter.tsx` (`WordCounter`) — Textarea with
  live 7-card stats grid: Words, Characters, Characters (no spaces),
  Sentences, Paragraphs, Lines and Reading time @ 200 wpm. Copy-stats button
  emits a plain-text breakdown; Load sample and Reset.

- `src/components/tools/text/character-counter.tsx` (`CharacterCounter`) —
  Textarea with 6-card stats grid: Total characters, Without spaces, Letters
  (Latin extended), Digits, Symbols (everything not whitespace/letter/digit),
  Lines. Copy-stats + Load sample + Reset.

- `src/components/tools/text/sentence-counter.tsx` (`SentenceCounter`) —
  Textarea with 5-card stats: Sentences, Paragraphs, Words, Avg words per
  sentence, Avg sentences per paragraph. Hints on readability targets.

- `src/components/tools/text/reading-time-calculator.tsx`
  (`ReadingTimeCalculator`) — Textarea + two sliders (reading 50–500 wpm,
  speaking 50–300 wpm, defaults 200/130). Three-card result: Words count,
  Reading time (min + sec), Speaking time (min + sec). Copy summary button.

- `src/components/tools/text/case-converter.tsx` (`CaseConverter`) — Input +
  output Textareas + nine case-style buttons (UPPERCASE, lowercase, Title
  Case, Sentence case, camelCase, PascalCase, snake_case, kebab-case,
  CONSTANT_CASE). Each button shows a live sample; the last-applied style is
  highlighted with a ring. Copy + Save .txt.

- `src/components/tools/text/remove-duplicate-lines.tsx`
  (`RemoveDuplicateLines`) — Input/output Textareas + three toggles
  (case-sensitive Switch, trim-whitespace Switch, keep first/last RadioGroup).
  Three counters: Before / After / Removed. Copy + Save.

- `src/components/tools/text/sort-lines.tsx` (`SortLines`) — Input/output
  Textareas + 7-option RadioGroup (A→Z, Z→A, Numeric ↑, Numeric ↓, Reverse,
  Shuffle, By length) each with icon and help text. Case-insensitive Switch.
  Fisher-Yates shuffle, leading-number extraction for numeric sort.
  Before/After counters. Copy + Save.

- `src/components/tools/text/reverse-text.tsx` (`ReverseText`) — Input/output
  Textareas + 3-option RadioGroup (Reverse characters, Reverse words,
  Reverse lines). Character reversal uses `Array.from` to keep surrogate
  pairs intact; word reversal preserves line structure. Copy + Save.

- `src/components/tools/text/remove-empty-lines.tsx` (`RemoveEmptyLines`) —
  Input/output Textareas + Switch for "also strip whitespace-only lines".
  Normalises CRLF → LF. Before/After counters. Copy + Save.

- `src/components/tools/text/remove-extra-spaces.tsx` (`RemoveExtraSpaces`) —
  Input/output Textareas + three Switches: Collapse runs of spaces/tabs to
  one space, Trim each line's edges, Remove all whitespace (overrides the
  others). Collapse preserves newlines. Copy + Save.

- `src/components/tools/text/find-and-replace.tsx` (`FindAndReplace`) — Input
  Textarea + Find/Replace Input pair + three Switches (case-sensitive,
  whole-word, regex). Builds a `RegExp` from the find string with optional
  `\b…\b` word boundaries and reports invalid-regex errors. Replacement is
  treated as a literal string (no `$1` interpretation). Shows match count
  and a friendly alert if no find pattern is entered. Copy + Save.

- `src/components/tools/text/slug-generator.tsx` (`SlugGenerator`) — Title
  Input + RadioGroup for separator (`-` or `_`) + three Switches (lower-case,
  strip accents, remove stop words). Live-updating slug output with URL
  preview. Copy button.

- `src/components/tools/text/lorem-ipsum-generator.tsx`
  (`LoremIpsumGenerator`) — RadioGroup for output type (paragraphs /
  sentences / words) + numeric count input (1–1000, clamped) + Generate and
  New variation buttons. New variation reseeds the Mulberry32 PRNG for a
  different sample with the same settings. Auto-generates 5 paragraphs on
  mount so the output isn't empty. Copy + Save .txt.

- `src/components/tools/text/text-cleaner.tsx` (`TextCleaner`) — Input/output
  Textareas + six Checkboxes (collapse extra spaces, trim each line, remove
  empty lines, remove duplicate lines, remove non-ASCII characters, remove
  special characters). Operations run in a fixed order so later steps see
  earlier results. Four-card before/after grid (chars + lines). Copy + Save.

## Files modified

- `src/components/tools/tool-router.tsx` — imported all 14 text-tool
  components and registered them in `TOOL_COMPONENTS` with keys matching the
  registry's `component` field exactly: `word-counter`, `character-counter`,
  `sentence-counter`, `reading-time-calculator`, `case-converter`,
  `remove-duplicate-lines`, `sort-lines`, `reverse-text`,
  `remove-empty-lines`, `remove-extra-spaces`, `find-and-replace`,
  `slug-generator`, `lorem-ipsum-generator`, `text-cleaner`.

## Issues caught & fixed

- **`Hashtag` and `TypeCase` icons don't exist in `lucide-react`.** The dev
  server returned HTTP 500 on the homepage with a turbopack compile error
  pointing at `character-counter.tsx`. Verified all icon imports against the
  actual `node_modules/lucide-react/dist/esm/icons/` filenames:
  - `character-counter.tsx`: replaced `TypeCase` → `Type` (letters) and
    `Hashtag` → `Binary` (digits).
  - `case-converter.tsx`: replaced `TypeCase` → `Type` (the case-styles
    header icon).
  - Spot-checked the remaining 12 files for other potentially-missing icons
    (FlipHorizontal2, FlipVertical2, Link2, Wand2 all exist as
    `flip-horizontal-2.js`, `flip-vertical-2.js`, `link-2.js`, `wand-2.js`).
- **Unused `eslint-disable` directive** in
  `lorem-ipsum-generator.tsx` — the project's ESLint config doesn't enable
  `react-hooks/exhaustive-deps`, so the `eslint-disable-next-line` directive
  on the mount-only `useEffect` was flagged. Replaced with a plain comment
  explaining the intentional empty deps array.

## Verification

- `bun run lint` exits 0 with no errors or warnings.
- `tail /home/z/my-project/dev.log` shows only clean `Compiled` and
  `GET / 200` after the icon fix; the earlier 500s were the missing-icon
  compile error and disappeared once `TypeCase`/`Hashtag` were replaced.
- `curl http://127.0.0.1:81/` returns HTTP 200 with no SSR crash.
- All 14 components are wired into `TOOL_COMPONENTS` and accessible via the
  hash router (e.g. `#/word-counter`, `#/text-cleaner`).

## Stage Summary

- All 14 text tools flagged `implemented: true` in the registry (IDs 61–73,
  75) are now fully implemented, browser-only, and routed. The 15th —
  Markdown Previewer (id 74) — was already implemented in Task 2-b and is
  left untouched.
- Each tool renders via `ToolLayout` with intro, interactive UI, How-To
  steps, use cases, limitations and FAQ.
- All processing is local: built-in string operations, `TextEncoder`,
  `Array.from` (for surrogate-pair-safe character reversal), hand-rolled
  Fisher-Yates shuffle, hand-rolled Mulberry32 PRNG, hand-rolled slugifier
  with NFKD accent stripping, hand-rolled Lorem Ipsum word bank. No backend
  API routes, no uploads, no external libraries added.
- Every tool rejects inputs >1 MB with a friendly `toast.error` and a
  visible inline message, and gracefully handles empty input.
- Lint clean; dev server compiles without errors; homepage and tool routes
  return HTTP 200.
- Follow-ups for future agents: the text-helpers file is reusable for any
  later task that needs word/sentence/paragraph counting, case conversion,
  slugification or Lorem Ipsum generation. The slugifier's stop-word list
  is a built-in 43-word set — extend it in code if a longer list is needed.
  The find-and-replace tool treats the replacement as a literal string; if
  back-reference support (`$1`, `$2`) is needed, switch to a callback-based
  `replace` and document the change in the limitations section.
