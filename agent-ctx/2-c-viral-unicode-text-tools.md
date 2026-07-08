# Task 2-c-viral — unicode-text-tools

**Agent:** unicode-text-tools
**Task ID:** 2-c-viral
**Scope:** Build 9 Unicode / text generator tools (IDs 115-123) — `fancy-text-generator`, `strikethrough-text`, `small-caps-generator`, `zalgo-text-generator`, `cursive-text-generator`, `binary-translator`, `morse-code-translator`, `discord-timestamp-generator`, `wordle-solver`.

## What was built

All 9 tools are browser-only, render through `ToolLayout`, and live under `src/components/tools/text/`. Each accepts `{ tool }: { tool: ToolDefinition }` and supplies `intro`, `tool`, `howTo`, `useCases`, `limitations`, `faq` content.

### Shared: `_unicode-maps.ts`
- Single `.ts` module (no JSX) containing every Unicode character-mapping table the text generators need.
- **Mathematical alphanumeric symbols** (U+1D400–U+1D7FF) for 12 styles — Bold, Italic (with the U+210E italic-h hole), Bold Italic, Sans-Serif, Sans-Serif Bold/Italic/Bold-Italic, Monospace, Double-Struck (with the 7 Letterlike-Symbols holes ℂ ℍ ℕ ℙ ℚ ℝ ℤ), Script (with the 8 uppercase + 3 lowercase holes), Bold Script, Fraktur (with the 5 holes ℭ ℌ ℑ ℜ ℨ), Bold Fraktur.
- **Enclosed alphanumerics** — circled (Ⓐ–ⓩ), negative-circled (🅐–🅩), parenthesized (🄐–🄩 / ⒜–⒵), squared (🄰–🅉), negative-squared (🅰–🆉), fullwidth (Ａ–ｚ / ０–９).
- **Small caps** (Phonetic Extensions U+1D00–U+1D2B with Q and X falling back to the source letter), **superscript** (with the actual Unicode gaps for q, C, F, Q, S, X, Y, Z), **subscript** (with the many gaps Unicode has for consonants).
- **Combining-mark styles** for sliced (U+0337), bubble (U+0306), underlined (U+0332), strikethrough (U+0336), double-underline (U+0333), squiggly (U+0330), sparkle (U+0352).
- **Regional indicator symbols** (🇦–🇿), **upside-down map** (curated per-character table + reverse-the-string).
- **Zalgo mark tables** — curated `ZALGO_ABOVE` (57 marks), `ZALGO_BELOW` (44), `ZALGO_MIDDLE` (10) lists from U+0300–U+036F. A `generateZalgo(text, intensity, {up,down,middle})` function picks random marks per character.
- **Style catalogues** exported as `FANCY_STYLES` (32 entries), `CURSIVE_STYLES` (3 entries), `SMALL_CAPS_STYLES` (3 entries) — each with `key`, `label`, `sample`, `transform`.
- Three builder helpers: `mathStyle(upperOffset, lowerOffset, digitOffset, upperHoles, lowerHoles)`, `mapByString(upperMap, lowerMap, digitMap)`, `combineWith(mark, lettersOnly)`.

### 1. `fancy-text-generator.tsx` (`FancyTextGenerator`)
- Single `<Input>` (maxLength 500) driving all 32 styles live.
- Grid of cards (`sm:grid-cols-2 lg:grid-cols-3`), each card shows the style label, the rendered output, a static preview, and a `CopyButton` (icon size).
- Sample button loads "Dueneo rocks"; Reset clears input.
- Empty-input UX: shows sample text instead of empty cards so the user can see what each style looks like.
- 1 MB safety cap via `byteLength`.

### 2. `strikethrough-text.tsx` (`StrikethroughText`)
- Three variants per the brief: Strikethrough (U+0336), Underline (U+0332), Double strikethrough (stacks U+0336 + U+0337 for a true double-strike effect).
- Each card shows the combining-mark code-point (e.g. U+0336) and a static sample.
- "Download all variants" emits a .txt file with all three variants separated by labels.
- Textarea input (maxLength 2000).

### 3. `small-caps-generator.tsx` (`SmallCapsGenerator`)
- Three variants: Small Caps, Superscript, Subscript.
- Reuses `SMALL_CAPS_STYLES` from `_unicode-maps.ts`.
- Same card layout + download-all pattern as `strikethrough-text`.
- Honest explanation in the UI: Q/X have no small-cap form, q has no superscript, etc. — those slots fall back to the source character.

### 4. `zalgo-text-generator.tsx` (`ZalgoTextGenerator`)
- Intensity slider 1–20 (default 5).
- Three `Switch` toggles for above / below / middle (overlay) marks.
- Re-roll button forces re-render so `generateZalgo` picks fresh random marks.
- Output in a `max-h-96 overflow-y-auto` scrollable container — important because zalgo text can overflow.
- Play-time warning: high intensities can render slowly on older devices; combined marks are invisible to screen readers.
- Input capped at 500 chars to keep the output manageable.

### 5. `cursive-text-generator.tsx` (`CursiveTextGenerator`)
- Three variants: Regular Cursive (Mathematical Script), Bold Cursive (Bold Mathematical Script), Blackletter / Fraktur.
- Same card + download-all pattern.
- Note in the UI about the 8 uppercase + 3 lowercase Script "holes" that overlap with Letterlike Symbols (ℬ ℰ ℱ ℋ ℐ ℒ ℳ ℛ / ℯ ℊ ℴ).

### 6. `binary-translator.tsx` (`BinaryTranslator`)
- Tabs: Text → Binary and Binary → Text.
- Encoder uses `TextEncoder` for full UTF-8 support. ASCII-only toggle (`charCodeAt`, drops non-ASCII chars) for legacy 7-bit systems.
- Decoder tolerant: accepts space-separated bytes, runs of 0s/1s (must be a multiple of 8 chars), newlines, or no separator. Uses `TextDecoder("utf-8", { fatal: true })` and reports a friendly error for invalid UTF-8.
- Swap button moves the current output into the other mode's input.
- Byte/bit/char counters in both directions.

### 7. `morse-code-translator.tsx` (`MorseCodeTranslator`)
- Standard ITU Morse table: A–Z, 0–9, and 17 punctuation marks (`.,?!'/()&:;=+-_"$@`).
- Tabs: Text → Morse and Morse → Text. Decoder is tolerant — letters separated by spaces, words by `/`, unknown sequences render as `?` with a count.
- **Web Audio API playback** at 600 Hz sine wave with PARIS-standard timing: dot = 1.2 / WPM seconds, dash = 3 dots, intra-element gap = 1 dot, letter gap = 3 dots, word gap = 7 dots.
- Speed slider 5–40 WPM (with labels: 5 slow, 20 ham-radio exam, 40 expert).
- Stop button cancels scheduled audio events via a token system (`playTokenRef`).
- Play button disabled for inputs >500 chars (encode) or >4000 chars (decode) to avoid scheduling thousands of audio events.
- Cleanup on unmount: stop oscillator, close AudioContext.

### 8. `discord-timestamp-generator.tsx` (`DiscordTimestampGenerator`)
- `<Input type="datetime-local">` for the date/time (in the user's local timezone) plus quick presets: Now, +1 hour, +1 day, +1 week, +1 month, Christmas.
- Computes UNIX timestamp in seconds; shows it alongside the local and UTC representations.
- Renders all 7 Discord timestamp formats (`<t:UNIX:R|f|F|d|D|t|T>`) as clickable cards. Each card shows the style letter, name, description, a preview (computed with `Intl.DateTimeFormat` for non-relative formats and a custom `formatRelative` for `:R`), and the raw markdown.
- Click any card → copies the markdown to clipboard via `navigator.clipboard.writeText`.

### 9. `wordle-solver.tsx` (`WordleSolver`)
- **Embedded dictionary**: ~4,034 unique 5-letter English words (exceeds the brief's ~3,000 minimum) stored as a single space-separated template-literal string constant in the component. Parsed at module load into a deduplicated uppercase array.
- **Inputs**: 5 green-letter boxes (one per position), 5 yellow-letter boxes (one per position — the letter is in the word but NOT at this position), and a freeform grey-letters field.
- **Matching algorithm**: green position checks → yellow inclusion + position-exclusion checks → grey exclusion (with the Wordle nuance that a grey letter can still be in the word if the same letter is also in green/yellow).
- **Sorting**: by sum of unique-letter frequencies (computed from the dictionary itself), descending — words packed with common letters come first. Ties broken alphabetically.
- **Output**: chips in a `max-h-96 overflow-y-auto` scrollable container; first 300 shown with a "+N more" indicator. Click any chip to copy it lowercase. Live filter input to narrow matches further.
- Suggested opening guesses (AROSE, RAISE, AUDIO) shown when the user has no clues yet.

### Registry: `_batch-c-registry.ts`
- Per the brief, **`tool-router.tsx` was NOT edited** — instead `src/components/tools/_batch-c-registry.ts` exports `batchCComponents: Record<string, ComponentType<{tool: ToolDefinition}>>` mapping the 9 component keys. The main agent will merge this map into `TOOL_COMPONENTS` along with `batchAComponents` and `batchBComponents` in a single follow-up.

## Issues caught & fixed
- **JSX literal in `_unicode-maps.ts`**: I had a malformed `"\": ",,"",` entry in `UPSIDE_DOWN_MAP`. Fixed to `"\": ",,"` (escaped quote).
- **Wrong combining mark for "sliced"**: brief sample was `h̷e̷l̷l̷o̷` which is U+0337 (short solidus), not U+0338 (long solidus). Switched `T_SLICED` to U+0337.
- **"Squiggly" combining mark**: changed from U+033E (vertical tilde above, poorly supported) to U+0330 (tilde below, universally visible).
- **Unused imports**: removed `Type` from `fancy-text-generator.tsx`, `Clock` and `CopyButton` from `discord-timestamp-generator.tsx`.
- **Pointless `useEffect` in zalgo**: removed an empty `React.useEffect(() => {}, [seed])` that was only there for lint; replaced with a code comment explaining the seed mechanism.
- **`CopyButton` doesn't accept `disabled`**: the shared component's prop type doesn't include `disabled`. Removed `disabled={…}` from 5 `CopyButton` usages across `binary-translator.tsx`, `morse-code-translator.tsx`, and `zalgo-text-generator.tsx`. The component already handles empty values gracefully (shows "Nothing to copy yet." toast), so the visual disabled state wasn't essential.

## Verification
- `bun run lint` — exits 0 with no errors or warnings.
- `npx tsc --noEmit --skipLibCheck` — zero errors in any of the 9 new files or the shared `_unicode-maps.ts` / `_batch-c-registry.ts`. (Pre-existing errors in other agents' files — `examples/`, `skills/`, `pdf-merge`, `pdf-split`, `pdf-metadata-viewer`, `add-page-numbers-to-pdf`, `image-to-pdf`, `base64-decoder`, `security/_security-helpers`, `games/checkers`, `games/freecell`, `games/_game-helpers` — are all unrelated to this batch.)
- `tail -50 dev.log` shows only clean `✓ Compiled in Nms` and `GET / 200` lines, no compile errors.

## Files created
- `src/components/tools/text/_unicode-maps.ts`
- `src/components/tools/text/fancy-text-generator.tsx`
- `src/components/tools/text/strikethrough-text.tsx`
- `src/components/tools/text/small-caps-generator.tsx`
- `src/components/tools/text/zalgo-text-generator.tsx`
- `src/components/tools/text/cursive-text-generator.tsx`
- `src/components/tools/text/binary-translator.tsx`
- `src/components/tools/text/morse-code-translator.tsx`
- `src/components/tools/text/discord-timestamp-generator.tsx`
- `src/components/tools/text/wordle-solver.tsx`
- `src/components/tools/_batch-c-registry.ts`
- `agent-ctx/2-c-viral-unicode-text-tools.md` (this file)

## Stage summary
- All 9 Unicode/text generator tools (IDs 115-123) are implemented, browser-only, and ready to be wired up.
- Each renders via `ToolLayout` with intro, interactive UI, How-To steps, use cases, limitations and FAQ.
- All processing is client-side: `String.fromCodePoint` / `codePointAt` for Unicode maps, `Math.random` for Zalgo mark selection, `TextEncoder`/`TextDecoder` for binary, `Web Audio API` (600 Hz sine wave + scheduled gain envelopes) for Morse playback, `Intl.DateTimeFormat` + a custom relative-time formatter for Discord timestamps, and a pure-TypeScript Wordle matcher with a 4,034-word embedded dictionary.
- No backend API routes, no file uploads, no external dependencies added (everything uses built-in browser APIs and the existing shadcn/ui components).
- Each tool handles empty input gracefully (shows a sample or a friendly placeholder, never crashes).
- Lint clean; TypeScript clean for the new files; dev server compiles without errors.
- Follow-up for main agent: merge `batchCComponents` from `src/components/tools/_batch-c-registry.ts` into `TOOL_COMPONENTS` in `src/components/tools/tool-router.tsx` (single `import { batchCComponents }` + spread into the map). Until then the 9 tools fall through to the "Component not registered yet" placeholder. The same merge is still pending for `batchAComponents` (Task 2-a-viral, 8 random/picker tools) and `batchBComponents` (Task 2-b-viral, 6 AI/image tools) — all three can be merged in a single follow-up.
