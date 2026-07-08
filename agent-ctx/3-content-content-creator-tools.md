## Task ID: 3-content — Content creator tools (9 tools, IDs 190-198)

**Agent:** content-creator-tools
**Built:** 9 browser-only content creator tools under `src/components/tools/content/`, registered in `src/components/tools/_batch-content-registry.ts` (the main agent will merge this into `tool-router.tsx` later).

### Files created
1. `src/components/tools/content/_content-helpers.tsx` — shared timestamp / SRT / transcript utilities + UI primitives (StatCard, Row, ScoreBar, TriggerBadge, SectionLabel).
2. `src/components/tools/content/podcast-chapter-generator.tsx` — `PodcastChapterGenerator`
3. `src/components/tools/content/youtube-timestamp-formatter.tsx` — `YoutubeTimestampFormatter`
4. `src/components/tools/content/subtitle-timing-editor.tsx` — `SubtitleTimingEditor`
5. `src/components/tools/content/transcript-cleaner.tsx` — `TranscriptCleaner`
6. `src/components/tools/content/thumbnail-ab-comparer.tsx` — `ThumbnailAbComparer`
7. `src/components/tools/content/video-title-scorer.tsx` — `VideoTitleScorer`
8. `src/components/tools/content/hook-analyzer.tsx` — `HookAnalyzer`
9. `src/components/tools/content/script-formatter.tsx` — `ScriptFormatter`
10. `src/components/tools/content/caption-line-breaker.tsx` — `CaptionLineBreaker`
11. `src/components/tools/_batch-content-registry.ts` — registry exporting `batchContentComponents` (9 entries).
12. `agent-ctx/3-content-content-creator-tools.md` — this worklog.

### What each tool does

**Podcast Chapter Generator** — Drag-reorderable list of (timestamp, title) rows with optional episode title + URL. Generates four output formats in tabs:
- Podcasting 2.0 JSON (`{version, title, chapters:[{startTime,title}]}`) for the `<podcast:chapters>` RSS tag.
- MP4 text chapter track (`title|start|end` in seconds) — paste into `mp4chaps` or ffmpeg.
- YouTube-style description block (auto-linking `M:SS Title`).
- Plain text (`HH:MM:SS  Title` per line).
Each format has Copy + Save buttons. Invalid timestamps get a red border; chapters are auto-sorted ascending. A live "sorted chapter list" panel shows the resolved order with absolute seconds.

**YouTube Timestamp Formatter** — Per-row timestamp + title inputs with live green-check validation. Bulk-paste textarea parses lines like `1:23 Topic` or `1:23 - Topic` into rows automatically. Optional intro and outro text fields. Three list styles (YouTube auto-link, plain two-space, numbered). Stats panel shows chapters / characters / lines. Output is auto-sorted ascending; invalid rows are flagged amber and skipped. Copy + Save .txt.

**Subtitle Timing Editor** — Dropzone or textarea for `.srt` files. Parses with BOM/CRLF tolerance, missing index lines, and `.`/`,` millisecond separators. Transformations:
- Shift all timings ±N seconds (1s / 0.1s step buttons + free-form decimal input).
- Fix overlaps (clips each entry's end to the next start − 1ms).
- Renumber (always applied to output).
- Per-entry inline edits to start/end/text in a scrollable table.
- Per-entry remove + restore (removed rows stay visible at 40% opacity).
Overlap count is detected on parse and shown as an amber warning. Output is `serializeSrt`'d with sequential indices. Copy + Save `.srt` (renames to `*-edited.srt`).

**Transcript Cleaner** — Six toggleable cleanup passes:
- Remove filler words (20+ phrases: um, uh, like, you know, I mean, basically, literally…).
- Fix capitalization (capitalize first letter after every `.`, `!`, `?`).
- Add paragraph breaks every N sentences (slider 1–10).
- Remove speaker labels (regex matches `Name:`, `[Name]:`, `>> Name:`, `Speaker 1:`, etc.).
- Remove timestamps (bracketed and bare `MM:SS`).
- Final tidy collapses 3+ newlines.
Stats grid shows fillers removed, words removed, paragraphs added, speaker bytes stripped, timestamp bytes stripped, final word count + % reduction. Copy + Save .txt.

**Thumbnail A/B Comparer** — Two Dropzones (one per side, 10MB cap) load images as `blob:` URLs (no upload). Preview area toggles Full / Medium (320px) / Small (180px) sizes — the small size matches YouTube search-result thumbnails on phones. Dark / light background toggle. Scorecard table with four 0–10 sliders per side (text readability, face visibility, contrast, curiosity). Per-criterion "Edge" badge (A/B/Tie). Live totals + winning thumbnail highlighted in emerald. Three StatCards at the bottom show A%, B%, and the verdict (with point margin).

**Video Title Scorer** — Multi-title input with per-row character counter (amber > 70, red > 100). Scoring rubric (0–100):
- Length 50–70 chars → up to 25 pts (tapers outside the band).
- Contains a number → 15 pts.
- Power words (30-word list: ultimate, proven, secret, how to, why…) → up to 25 pts (8/match).
- Emotional triggers (29-word list: shocking, amazing, hidden, exposed…) → up to 20 pts (10/match).
- Brackets / parentheses → 10 pts.
- Question mark → 5 pts.
Top-ranked title card shows the winner with score, length, power-word count, emotional-word count, and trigger badges. Per-title breakdown (expandable) lists every criterion with detected words + suggestions. Comparison panel ranks all titles by score. Suggestions are concrete ("Add a number", "Use a power word like…", "Trim N chars").

**Hook Analyzer** — Single textarea for the first 1–2 sentences. Analyzes six triggers:
- Curiosity gap (curated phrase list + ellipsis / em-dash detection) — 25 pts.
- Emotional trigger (29-word list) — 15 pts.
- Specificity (numbers, $ amounts, named entities via capitalised words) — 20 pts.
- Question — 10 pts.
- Negation pattern (`stop`/`don't`/`never`/`avoid`/`quit`) — 15 pts.
- Pattern interrupt (imperative opener, contrast word, or suspense) — 15 pts.
Plus bonus points for power words (+5) and ideal length 8–30 words (+5). Total clamped to 100. Score panel shows total, triggers-fired count, hook length, and a suggestions list. Trigger-breakdown grid shows each trigger card with status and matched words/phrases highlighted.

**Script Formatter** — Line-based parser classifies each line as:
- Scene (`[SCENE NAME - timestamp]` or `INT./EXT.` screenplay prefix).
- Visual / B-roll note (`[Description]` on its own line).
- Dialogue (`SPEAKER (modifier): text` — ALL CAPS or Title Case).
- Timestamp (bare `M:SS` line).
- Action / narration (everything else).
Two output formats in tabs:
- Two-column A/V layout (40-char VISUAL column | 40-char AUDIO column).
- Structured linear text (`=== SCENE N: name @ timestamp ===` headings + indented B-roll / dialogue lines).
"Parsed segments" table shows every line with its type, content, and timestamp — useful for spotting mis-parsed lines. Per-type counts in coloured badges. Copy + Save both formats.

**Caption Line Breaker** — Long caption input + max-chars-per-line slider (12–60, default 28). Soft mode (never split words) or Hard mode (force-split long words character-by-character). Alignment toggle (center / left / right), UPPERCASE toggle, show-char-counts toggle, dark/light preview BG toggle. Output panel shows each numbered line with its character count (red if over limit). Stats: lines, max chars, over-limit count. Plain-text block for copy-paste into editors. 9:16 phone-frame preview renders the caption mid-screen with a semi-transparent background — roughly how it will appear on a Reel/TikTok/Short. Three hint cards at the bottom with best-practice tips.

### Shared helpers (`_content-helpers.tsx`)
- **Timestamp parsing/formatting**: `parseTimestamp` (MM:SS, HH:MM:SS, plain seconds, trailing `s`), `formatHMS`, `formatYouTubeTime` (no leading zeros), `formatSrtTime` (`HH:MM:SS,mmm`), `parseSrtTime`.
- **SRT**: `parseSrt` (BOM/CRLF tolerant, optional index lines, `.`/`,` ms sep), `serializeSrt`, `fixOverlaps` (clips end to next start − 1ms), `shiftEntries` (clamps at 0), `renumberEntries`.
- **Transcript**: `FILLER_WORDS` (20+ phrases), `removeFillerWords`, `removeSpeakerLabels`, `removeTimestamps`, `capitaliseSentences`, `splitSentences`, `addParagraphBreaks`, `countWords`.
- **Analysis dictionaries**: `POWER_WORDS` (30 words), `EMOTIONAL_TRIGGERS` (29 words), `CURIOSITY_PHRASES` (17 phrases) — shared between the title scorer and the hook analyzer.
- **UI primitives**: `SectionLabel`, `Row`, `StatCard` (6 tones), `ScoreBar` (auto-colour by range), `TriggerBadge`.
- Re-exports `downloadText` from the developer helpers.

### Verification
- `bun run lint` exits 0 with no errors or warnings (after fixing two `react-hooks/refs` issues in the thumbnail comparer — switched to a ref-synced-via-effect pattern for the unmount cleanup of object URLs).
- Dev server compiles cleanly — `tail dev.log` shows only `✓ Compiled` and `GET / 200` responses, no SSR or hydration errors.
- All 9 tools export a named component matching the `component` key in the registry and accept `{ tool }: { tool: ToolDefinition }`.
- All 9 are registered in `src/components/tools/_batch-content-registry.ts` under the `batchContentComponents` map. The main agent should merge this into `tool-router.tsx` like the other batch registries (`...batchContentComponents`).

### Constraints honoured
- TypeScript strict, shadcn/ui components throughout, `sonner` toast for feedback.
- All processing is browser-only — no `fetch` to backends, no API routes, no server actions.
- Dropzone component used for image uploads (thumbnail A/B comparer) and SRT file uploads (subtitle editor).
- Canvas not needed for any of these tools — the 9:16 preview in the caption line breaker is pure HTML/CSS, and the thumbnail preview uses `<img>` tags with `object-contain`.
- No edits to `tool-router.tsx` (per instructions — main agent will merge the batch registry).
- Mobile-first responsive layouts (1-col on mobile, 2-col on `lg:`) with sticky table headers and `max-h-*` overflow areas.
- Each tool uses `ToolLayout` with full `content` (intro, how-to, use cases, limitations, FAQ).
