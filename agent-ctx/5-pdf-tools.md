# Task 5-pdf-tools — 6 PDF manipulation tools

**Agent:** 5-pdf-tools
**Scope:** Build the 6 remaining PDF tools flagged `implemented: true` in the registry under component keys `rotate-pdf`, `delete-pdf-pages`, `extract-pdf-pages`, `rearrange-pdf-pages`, `watermark-pdf`, `pdf-compress`. All processing browser-only via `pdf-lib` (+ `@dnd-kit` for drag-and-drop, `Canvas` for image re-encoding).

## What was built

### Shared helpers extended — `src/components/tools/pdf/_pdf-helpers.ts`

Added 4 new exports (no existing exports changed):

- `hexToRgb01(hex: string): [number, number, number]` — parses `#RGB` / `#RRGGBB` (with or without `#`) into a `[r, g, b]` triple in 0–1 range suitable for `pdf-lib`'s `rgb()` helper. Returns black on parse failure. Used by the watermark tool.
- `derivedPdfName(sourceName: string | undefined, suffix: string): string` — strips `.pdf` from the source filename and appends `-${suffix}.pdf`. Centralises the output-naming pattern.
- `replaceObjectUrl(prev: string | null, blob: Blob): string` — revokes the previous object URL (if any) and returns a fresh one for the new blob. Used in `setState` updater form so we never leak URLs when an output is regenerated.
- `downloadObjectUrl(url: string, filename: string): boolean` — triggers a download of an existing object URL without revoking it (caller manages lifecycle via `useEffect` cleanup). Mirrors the inline pattern in `pdf-merge.tsx` but extracted for reuse.

The existing helpers were reused throughout: `formatBytes`, `downloadBlob`, `readFileAsArrayBuffer`, `isPdfFile`, `parsePageRanges`, `loadPdfDocument`, `POSITION_OPTIONS`, `LARGE_PDF_WARN_BYTES`, `MAX_PDF_BYTES`.

### Tool components (all under `src/components/tools/pdf/`)

1. **`rotate-pdf.tsx`** (`RotatePdf`) — RadioGroup for angle (90° / 180° / 270°) with a rotating icon preview, RadioGroup for scope (all pages / specific range) with conditional `Input` for the range spec. The rotation is **added** to each page's existing `/Rotate` flag (modulo 360), not replaced — matches the user's mental model of "rotate by 90°". `parsePageRanges` validates the range. Uses `page.setRotation(degrees((current + angle) % 360))`. Output: `${base}-rotated.pdf`.

2. **`delete-pdf-pages.tsx`** (`DeletePdfPages`) — Live preview grid of page-number badges (1..N) with strikethrough on pages marked for deletion. Validates via `parsePageRanges`. Rejects the "delete every page" case. Deletes from the **highest index first** (`doc.removePage(idx)` in descending order) to keep remaining indices valid. Output: `${base}-trimmed.pdf`.

3. **`extract-pdf-pages.tsx`** (`ExtractPdfPages`) — Same page-number grid as Delete but highlights selected pages with the primary colour. The extract **preserves the order you type** — `parsePageRanges` deduplicates while preserving first-seen order, so `"5, 1-3"` produces `[5, 1, 2, 3]`. Builds a fresh PDF via `PDFDocument.create()` + `copyPages(src, indices)` + `addPage` per copied page. Output: `${base}-extracted.pdf`.

4. **`rearrange-pdf-pages.tsx`** (`RearrangePdfPages`) — Drag-and-drop grid of page cards via `@dnd-kit/core` (`DndContext`, `PointerSensor` 5px activation, `TouchSensor` 120ms hold, `KeyboardSensor` via `sortableKeyboardCoordinates`, `closestCenter`) + `@dnd-kit/sortable` (`SortableContext` with `rectSortingStrategy`, `useSortable`, `arrayMove`). Each card shows original page number (big) + new position (small badge). Three toolbar buttons: Reset order, Shuffle (Fisher-Yates), New file. Rebuilds the PDF via `PDFDocument.create()` + `copyPages(src, indices-in-new-order)` + `addPage` (more reliable than in-place `removePage` + `insertPage`). Output: `${base}-rearranged.pdf`.

5. **`watermark-pdf.tsx`** (`WatermarkPdf`) — Inputs: text (max 120 chars), font size (8–144 pt slider), colour (hex input + native `<input type="color">` + 8 preset swatches), opacity (5–100% slider), rotation (0–359° slider), margin (0–144 pt slider, shown as pt + inches), position (`Select` with 9 `POSITION_OPTIONS`). Uses `StandardFonts.HelveticaBold`. The position calculation **corrects for rotation**: pdf-lib's `rotate: degrees(angle)` rotates around the (x, y) origin, so a naive `positionForPdfPoint` would push the visual centre off-target. The new `computeWatermarkOrigin` function computes the target visual centre from the 9-position grid + margin, then back-calculates the (x, y) origin so the rotated text's visual centre lands exactly at the target. Includes a mini live preview card (rotated CSS text in the chosen colour + opacity). Output: `${base}-watermarked.pdf`.

6. **`pdf-compress.tsx`** (`PdfCompress`) — RadioGroup with Light / Medium / Aggressive levels. The compression pipeline:
   - **All levels**: strip metadata (title/author/subject/keywords/producer/creator blanked, dates set to epoch) + save with `useObjectStreams: true`.
   - **Medium**: re-encode JPEG images at 60% quality via `Canvas` + `canvas.toBlob("image/jpeg", 0.6)`. Iterates indirect objects via `doc.context.largestObjectNumber` + `PDFRef.of(i)` + `doc.context.lookup(ref)`, finds `PDFRawStream` instances with `Subtype: /Image` + `Filter: /DCTDecode`, decodes via `Image` + `URL.createObjectURL`, re-encodes, replaces the stream with `PDFRawStream.of(dict, newBytes)` + `doc.context.assign(ref, newStream)` ONLY if the re-encoded bytes are smaller (never grows the file). Updates `Width`, `Height`, `Length` dict entries.
   - **Aggressive**: same as Medium but at 40% quality AND with `maxSize = 1000` pixel cap on the longest side.
   - Skips: non-image streams, non-DCTDecode filters (FlateDecode raw bitmaps, CCITT, JBIG2, JPX), images >8000 px (Canvas safety), decode failures.
   - Shows a live progress bar with status messages. After completion: 3-column Before / After / Savings % card with green/amber/neutral colouring. Honest toast feedback (success if smaller, info if same size, warning if larger).
   - The limitations section is explicit about what `pdf-lib` cannot recompress (FlateDecode streams, vector data, embedded fonts) and recommends Ghostscript for 50%+ savings on text-heavy PDFs. Output: `${base}-compressed.pdf`.

### Registration — `src/components/tools/_batch-pdf2-registry.ts`

Per the explicit task constraint NOT to edit `tool-router.tsx`, the 6 components are exported from a new batch registry file: `batchPdf2Components` (Record<string, ComponentType<{ tool: ToolDefinition }>>). Keys match the `component` field in `src/data/tools.ts`: `rotate-pdf`, `delete-pdf-pages`, `extract-pdf-pages`, `rearrange-pdf-pages`, `watermark-pdf`, `pdf-compress`. The main agent can spread this map into `TOOL_COMPONENTS` in `tool-router.tsx` (mirroring the existing `...batchAComponents` through `...batchFinance2Components` pattern) to wire the tools up.

## Edge cases handled (all 6 tools)

- Empty input → dropzone-only state, primary button hidden or disabled.
- Invalid files (non-PDF) → friendly toast, file rejected.
- Encrypted PDFs → `loadPdfDocument` catches the encryption error and shows "Please decrypt it first".
- Files >100 MB → warning toast ("Large PDFs may take a while").
- Files >250 MB → rejected with a clear error toast.
- Invalid range syntax (`1-, abc, 5-3-reversed`) → `parsePageRanges` throws a friendly message.
- Ranges entirely outside `[1, pageCount]` → "No valid pages selected" error.
- "Delete every page" case → friendly error ("You can't delete every page — the result would be empty").
- All object URLs are revoked via `useEffect` cleanup on unmount AND via `replaceObjectUrl` when an output is regenerated, so memory is freed.
- All processing is browser-only: `pdf-lib` for PDF manipulation, `Canvas` for image re-encoding, `URL.createObjectURL` for downloads. No backend API route, no upload, no fetch.

## Issues caught & fixed

- **`getContentsRaw()` does not exist on `PDFRawStream`** (`pdf-compress.tsx`): initial implementation called `obj.getContentsRaw()` to get the raw JPEG bytes. tsc flagged it (`error TS2551: Property 'getContentsRaw' does not exist on type 'PDFRawStream'. Did you mean 'getContents'?`). Verified against `node_modules/pdf-lib/cjs/core/objects/PDFRawStream.d.ts` — only `getContents()`, `getContentsString()`, `getContentsSize()`, `asUint8Array()` exist as methods, plus the public readonly `contents: Uint8Array` field. Replaced with `obj.contents` (the raw, still-encoded byte payload — for DCTDecode images, this IS the JPEG byte stream).
- **Pre-existing `Uint8Array<ArrayBufferLike>` → `BlobPart` pattern**: tsc strict flags this in all my files (and in the 5 pre-existing PDF tools — `pdf-merge`, `pdf-split`, `image-to-pdf`, `add-page-numbers-to-pdf`, `pdf-metadata-viewer`). The project's `next.config.ts` has `typescript.ignoreBuildErrors: true` and the runtime works correctly because `Blob` accepts `Uint8Array` at runtime regardless of the TS generic. Left as-is to match the established pattern; ESLint passes (the project's lint config doesn't run full strict tsc).

## Verification

- `cd /home/z/my-project && bun run lint` → exits 0, 0 errors, 0 warnings.
- `bunx tsc --noEmit --skipLibCheck` → only the pre-existing `Uint8Array<ArrayBufferLike>` → `BlobPart` pattern errors remain (same as the existing PDF tools). No new errors introduced.
- `tail -50 /home/z/my-project/dev.log` → only `✓ Compiled in Nms` and `GET / 200` lines after my changes; no compile errors. (The earlier `tools.ts:235:27` parse error in the log was a pre-existing issue from another agent's parallel edit, already fixed in the current state of `tools.ts`.)
- All 6 named exports verified: `RotatePdf`, `DeletePdfPages`, `ExtractPdfPages`, `RearrangePdfPages`, `WatermarkPdf`, `PdfCompress` — match the keys in `_batch-pdf2-registry.ts`.
- All `@dnd-kit` imports verified against the installed version's type definitions.

## Files created

- `src/components/tools/pdf/rotate-pdf.tsx`
- `src/components/tools/pdf/delete-pdf-pages.tsx`
- `src/components/tools/pdf/extract-pdf-pages.tsx`
- `src/components/tools/pdf/rearrange-pdf-pages.tsx`
- `src/components/tools/pdf/watermark-pdf.tsx`
- `src/components/tools/pdf/pdf-compress.tsx`
- `src/components/tools/_batch-pdf2-registry.ts`
- `agent-ctx/5-pdf-tools.md` (this file)

## Files modified

- `src/components/tools/pdf/_pdf-helpers.ts` (added `hexToRgb01`, `derivedPdfName`, `replaceObjectUrl`, `downloadObjectUrl` — no existing exports changed).

## Follow-ups for main agent

- Spread `batchPdf2Components` into `TOOL_COMPONENTS` in `src/components/tools/tool-router.tsx` (mirroring the existing `...batchAComponents` through `...batchFinance2Components` pattern). After that, the 6 tools will be reachable via `#/rotate-pdf`, `#/delete-pdf-pages`, `#/extract-pdf-pages`, `#/rearrange-pdf-pages`, `#/watermark-pdf`, `#/pdf-compress` and via the `#/pdf-tools` category page + global search.
- The rearrange tool uses numbered cards (not actual page thumbnails) to keep memory low for large PDFs. If real thumbnails are ever needed, the next agent can integrate `pdfjs-dist` (~300 KB) to rasterise pages into `<canvas>` thumbnails. The drag-and-drop grid scaffolding is already in place.
- The compress tool's image re-encoding only handles DCTDecode (JPEG) images. To handle FlateDecode raw bitmaps (screenshots, line art), a future agent could parse `Width` / `Height` / `BitsPerComponent` / `ColorSpace` from the stream dict, decode the raw pixel data, draw it to a Canvas, and re-encode as JPEG. This would unlock significant additional savings on PDFs that contain uncompressed screenshots. The iteration scaffolding (`enumerateIndirectObjects` via `largestObjectNumber` + `PDFRef.of(i)` + `doc.context.lookup(ref)`) is already in place — only the per-stream pixel-decoding logic would need to be added.
- The watermark tool could be extended to support custom TTF/OTF fonts via `doc.embedFont(uint8Array)` — the UI plumbing (font upload Dropzone + passing bytes through to the drawText call) is the only missing piece. The current build uses `StandardFonts.HelveticaBold` for maximum compatibility.
