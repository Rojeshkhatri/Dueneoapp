# Task 3-social — Social Media Tools

**Agent:** social-media-tools
**Scope:** 9 social media tools (IDs 165–173) — Instagram Grid Planner, YouTube Thumbnail Tester, TikTok Caption Formatter, LinkedIn Carousel Creator, Twitter Thread Formatter, Hashtag Analyzer, Bio Link Preview, Reel Cover Generator, Post Scheduling Calculator.

## Summary

All 9 components are implemented as browser-only React client components, registered in `_batch-social-registry.ts`. Lint clean, TypeScript clean for the new files, dev server compiles without errors. The registry file is wired up so the main agent can merge it into `tool-router.tsx` in a single follow-up (just import `batchSocialComponents` from `@/components/tools/_batch-social-registry` and spread it into the `TOOL_COMPONENTS` map).

## Files created

### Shared helpers
- `src/components/tools/social/_social-helpers.ts` — pure functions only (no JSX), shared by the social tools:
  - `MAX_IMAGE_BYTES` (50 MB), `formatBytes`, `getCanvas2D` (friendly-error wrapper), `downloadBlob` (triggers browser download with auto-cleanup), `loadImageFromFile` (File → HTMLImageElement via ObjectURL), `hexToRgba` (hex → rgba string for canvas APIs), `readableTextOn` (W3C relative-luminance contrast, picks black or white text for a given background), `wrapText` (canvas word-boundary line wrapper honouring explicit newlines), `drawWrappedText` (renders wrapped text and returns the y after the last line), `uid` (Date + random id for UI keys).

### Tool components (all under `src/components/tools/social/`)

1. **`instagram-grid-planner.tsx`** (`InstagramGridPlanner`) — Multi-image Dropzone upload (multiple=true), 3-column grid with HTML5 drag-and-drop reordering (plus up/down arrow buttons for accessibility), per-tile caption editor, full profile preview (mock Instagram header + 3-col grid), JSON export of arrangement (position, row, column, filename, size, type, caption). ObjectURL cleanup on unmount via ref + effect.

2. **`youtube-thumbnail-tester.tsx`** (`YoutubeThumbnailTester`) — Single image upload; reports actual dimensions + aspect ratio + ideal-1280×720 indicator. Title-overlay text input + show/hide toggle. Dark/Light background theme toggle (button pair). Four real-world size previews: full (1280×720 watch page), medium (320×180 sidebar), small (168×94 mobile search), tiny (120×68 mobile row). Overlay mimics YouTube's dark-to-transparent gradient with 2-line clamp.

3. **`tiktok-caption-formatter.tsx`** (`TiktokCaptionFormatter`) — Textarea editor with live counter against 2,200-char TikTok limit (green/amber/red states). Word/line/hashtag/unique/duplicate counts. Auto-format button strips hashtags out of body, de-duplicates them (case-insensitive), groups at end with blank line. Mock TikTok preview card with handle, formatted caption body, and sky-blue hashtag colouring. Unicode-aware hashtag regex `#[\p{L}\p{N}_]+/gu`.

4. **`linkedin-carousel-creator.tsx`** (`LinkedinCarouselCreator`) — Slide list (title + body) with add/duplicate/remove/move, drag-to-reorder thumbnails, prev/next navigation. Four layouts: title-top, title-bottom, centred, split (vertical divider with title left / body right). Two aspect ratios: square 1080×1080, portrait 1208×1520. Solid colour OR two-stop linear gradient at any angle (0–360°). Auto text colour (picks black/white via W3C luminance) or manual text colour picker. Page number position: bottom-right / bottom-center / top-right / none. Live full-resolution canvas preview, single-slide PNG download, batch download of all slides (each named slide-01.png, slide-02.png, …). Per-thumbnail canvas re-renders on settings change. Uses `wrapText` + custom `drawParagraph` (clamps to max-y).

5. **`twitter-thread-formatter.tsx`** (`TwitterThreadFormatter`) — Long-text input, splits into tweets of ≤280 chars on word boundaries. Honours blank-line paragraph breaks (forces a new tweet). Hard-splits words longer than 280. Toggles: number tweets (1/N), add 🧵 to first tweet, show character counts. Optional first-tweet prefix (e.g. "🧵 A thread:"). Each tweet card shows live char count (green/amber/red), Copy tweet button, and a Copy all button that joins the thread with `---` separators. Tweet body truncated with ellipsis if labels push it over 280.

6. **`hashtag-analyzer.tsx`** (`HashtagAnalyzer`) — Paste caption, instantly extract #hashtags (Unicode-aware regex). Stat cards: total hashtags, unique, duplicates, characters used by hashtags. Hashtag density percentage with guidance (>25% spam, 10–25% reasonable, <10% conservative). Unique hashtag list with per-tag count badges. Duplicate warning panel. Suggestions library of 105 popular hashtags across 7 categories (General, Business, Tech, Lifestyle, Food, Travel, Fitness) with filter box. Click-to-add; already-used tags are crossed out. Copy unique button.

7. **`bio-link-preview.tsx`** (`BioLinkPreview`) — Four inputs: title, description, image URL, URL. CharMeter for title (target 70, ideal 50) and description (target 200, ideal 140). Live previews of four platform cards: Instagram bio (text-only card), Twitter / X card (1.91:1 image + title + description), Facebook share (1.91:1 image + grey-bg metadata block), iMessage rich link (blue bubble with image + title + description + domain). Each preview truncates at the platform's real-world limits. Warnings flag invalid URLs, missing images, non-image extensions, titles >70 chars. Character limits reference table.

8. **`reel-cover-generator.tsx`** (`ReelCoverGenerator`) — 1080×1920 (9:16) canvas. Inputs: title (textarea, multi-line), optional subtitle, font-size slider 48–180px, vertical position (top/center/bottom), horizontal alignment (left/center/right), background (solid colour OR two-stop gradient at any angle), text colour (manual OR auto-contrast), optional dark overlay (5–80% strength) for legibility on busy backgrounds. Live preview canvas, PNG download named from slugified title.

9. **`post-scheduling-calculator.tsx`** (`PostSchedulingCalculator`) — Source timezone select (defaults to browser tz), target timezone select (defaults to America/New_York), datetime-local input. Conversion card: source time → target time with UTC offsets and ±1 day flag if calendar differs. Four peak-hour badges (morning 7–9, lunch 12–13, evening 17–19, night 20–22) — the one containing the target-hour is highlighted. 7-day recommendation table: midpoint of each peak window in target tz converted back to source tz, with day offset (Today / Tomorrow / +Nd). Uses `Intl.DateTimeFormat` for all zone math (DST-aware). Reuses `COMMON_TIMEZONES` + `toDateTimeInputValue` from `utility/_calc-date-helpers`.

### Registry
- `src/components/tools/_batch-social-registry.ts` — exports `batchSocialComponents` (9 keys matching the `component` field in `tools.ts`). NOT merged into `tool-router.tsx` per task instructions — main agent should add `...batchSocialComponents` to the `TOOL_COMPONENTS` map.

## Tech / design notes

- All 9 use `ToolLayout` with full `ToolContent` (intro, tool, howTo steps, useCases, limitations JSX `<ul>`, FAQ). 4 how-to steps, 4 use cases, 4 FAQ entries, 4 limitations per tool.
- Browser-only: Canvas API, FileReader, URL.createObjectURL, navigator.clipboard, Intl.DateTimeFormat. No backend, no uploads.
- shadcn/ui components used: `Button`, `Label`, `Input`, `Textarea`, `Slider`, `Badge`, `Switch`, `Select`. Custom-styled `<select>` (with optgroups) for the timezone pickers in `post-scheduling-calculator.tsx` to match the pattern used by `time-zone-converter.tsx`.
- Toast notifications via `sonner` for add/copy/download/reset actions.
- Drag-and-drop reordering uses native HTML5 draggable API (no library) — both Instagram Grid Planner and LinkedIn Carousel Creator support it. Up/down buttons provided for keyboard accessibility.
- Canvas rendering at full resolution for both LinkedIn Carousel Creator (1080×1080 or 1208×1520) and Reel Cover Generator (1080×1920); CSS scales the canvas down for preview.
- Multi-download in LinkedIn Carousel Creator uses sequential `toBlob` + `downloadBlob` with 250 ms pauses between files so browsers don't block multi-download.
- Used `React.useEffect` to keep an `itemsRef` in sync for unmount cleanup (Instagram Grid Planner), avoiding the "Cannot update ref during render" ESLint rule.
- Used `@/components/tools/utility/_calc-date-helpers` (existing `COMMON_TIMEZONES` list + `toDateTimeInputValue` helper) so the Post Scheduling Calculator has a consistent timezone picker with the existing Time Zone Converter tool.
- Used `@/components/dueneo/copy-button` and `@/components/dueneo/dropzone` shared components.
- No indigo/blue brand colours introduced; gradient defaults use brand-neutral palettes (pink→purple for reel cover, blue→dark-blue for LinkedIn carousel matching LinkedIn's brand).

## Issues caught & fixed during development

1. **JSX parse error in `youtube-thumbnail-tester.tsx`** — I had a doubled `}` in `className={`rounded-lg ${bgClass} p-4 sm:p-6`}``}>` (extra closing brace). ESLint caught it as "Parsing error: Identifier expected" at the `>` column. Removed the extra `}`.
2. **`react-hooks/refs` violation in `instagram-grid-planner.tsx`** — I was assigning `itemsRef.current = items` during render. ESLint flagged "Cannot access refs during render". Restructured to update the ref inside a `useEffect` that runs after each render, with a separate unmount-only effect for the cleanup.
3. **Missing higher-order-function invocation in `linkedin-carousel-creator.tsx`** — `onDrop={onThumbDrop}` was passing the higher-order function itself instead of the returned handler. TypeScript caught it: `Type '(idx: number) => (e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLButtonElement>'`. Fixed to `onDrop={onThumbDrop(idx)}`.
4. **Unused `eslint-disable` directives** — the project's ESLint config does not enable `@next/next/no-img-element`. I had added three `// eslint-disable-next-line @next/next/no-img-element` directives in `bio-link-preview.tsx` (for the `<img>` tags used to render user-provided image URLs in the link-card previews). Removed all three with a `sed` one-liner before the final lint pass.

## Verification

- `bun run lint` — exits 0 with no errors and no warnings.
- `bunx tsc --noEmit` — exits 0 for all 9 new files plus the registry file and shared helpers. (The pre-existing errors in `games/freecell.tsx`, `games/solitaire.tsx`, `developer/base64-decoder.tsx`, `pdf/*.tsx`, `security/_security-helpers.ts`, `pdf/pdf-metadata-viewer.tsx` were already present in the codebase before this task and are NOT introduced by this work.)
- `tail dev.log` — dev server (Next.js 16.1.3 Turbopack) compiles cleanly. Homepage returns HTTP 200.
- The 9 social tool components are not yet reachable through the router (per task instructions I did not edit `tool-router.tsx`), but each file parses, type-checks and lints cleanly.

## Follow-ups for the main agent

- Merge `batchSocialComponents` into the `TOOL_COMPONENTS` map in `src/components/tools/tool-router.tsx` (one-line spread, same pattern as the existing `...batchAComponents` etc.). Keys already match the `component` field in `tools.ts`.
- Smoke-test the 9 social tool routes after the merge: `#/instagram-grid-planner`, `#/youtube-thumbnail-tester`, `#/tiktok-caption-formatter`, `#/linkedin-carousel-creator`, `#/twitter-thread-formatter`, `#/hashtag-analyzer`, `#/bio-link-preview`, `#/reel-cover-generator`, `#/post-scheduling-calculator`.
