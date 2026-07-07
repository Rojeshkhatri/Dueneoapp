# Task 2-g — PDF tools

**Agent:** pdf-tools
**Scope:** Implement the 5 PDF tools flagged `implemented: true` in the registry (IDs 21, 22, 28, 30, 31, 33, 34 — three of them share the same `image-to-pdf` component key).

## What was built

### Shared helpers
- `src/components/tools/pdf/_pdf-helpers.ts` — browser-only utilities:
  - `MAX_PDF_BYTES` (250 MB hard cap), `LARGE_PDF_WARN_BYTES` (>100 MB → friendly warning).
  - `formatBytes`, `downloadBlob`, `readFileAsArrayBuffer`, `isPdfFile`.
  - `readPdfVersion` — parses `%PDF-x.y` from the file header bytes.
  - `formatPdfDate` — renders pdf-lib Date / string values as a locale string.
  - `parsePageRanges` — parses `"1-3, 5, 7-9"` into a validated list of 1-indexed pages; throws on bad input.
  - `positionForPdfPoint` + `POSITION_OPTIONS` — 9-position grid in PDF point coordinates (bottom-left origin, unlike the canvas top-left helper used by image tools).
  - `imageFileToPdfEmbeddable` — returns pdf-lib-embeddable bytes for JPG/PNG directly and rasterises WebP/GIF/BMP/AVIF to PNG via Canvas first; also returns the image's natural dimensions.
  - `loadPdfDocument` — friendly wrapper around `pdf-lib`'s `PDFDocument.load` that catches encryption errors and reports a helpful message.

### Tool components

1. **`pdf-merge.tsx`** (`PdfMerge`) — multi-file dropzone (multiple + accept `.pdf`). Each accepted file is probed in the background for its page count (shown in the list). Up/down arrow buttons reorder the queue; × removes a file. The merge button is disabled until ≥2 valid PDFs are queued. The merged PDF is produced by `PDFDocument.create()` + `copyPages` + `addPage` per source doc, saved as a `Uint8Array`, wrapped in a `Blob`, and exposed via `URL.createObjectURL`. Output filename is `${firstFileBase}-merged.pdf`. Files >100 MB trigger a warning toast; >250 MB are rejected.

2. **`pdf-split.tsx`** (`PdfSplit`) — single PDF dropzone. Tabs: "Each page → separate PDF" (every page becomes a single-page PDF) and "Custom ranges" (`1-3, 5, 7-9` style — each comma-separated group becomes one output PDF). Output selector: single ZIP (default) or individual download buttons. ZIP is built with JSZip (`zip.file(name, blob)` × N, `zip.generateAsync({ type: "blob" })`). Range spec is validated twice — first by `parsePageRanges` for syntax, then re-parsed locally to preserve grouping. Output names use zero-padded page numbers (`${base}-page-001.pdf`) or part indices (`${base}-part-1.pdf`).

3. **`image-to-pdf.tsx`** (`ImageToPdf`) — shared by three registry entries: `image-to-pdf`, `jpg-to-pdf`, `png-to-pdf`. The component reads `tool.slug` and adapts:
   - Accepted MIME types / extensions (`image/jpeg` only for `jpg-to-pdf`, `image/png` only for `png-to-pdf`, all raster for `image-to-pdf`).
   - Intro text and dropzone label.
   Each image is converted via `imageFileToPdfEmbeddable` (WebP → PNG via Canvas) then embedded with `embedJpg` / `embedPng`. Page size selector: "Fit to image" (1 image per page, page matches image's pixel dimensions in PDF points), A4 portrait (595 × 842pt, image centred with 36pt margin and aspect-ratio-preserved scaling) or US Letter portrait (612 × 792pt). Output filename is `${firstFileBase}.pdf`.

4. **`add-page-numbers-to-pdf.tsx`** (`AddPageNumbersToPdf`) — single PDF dropzone. Controls:
   - **Position** — one of 9 (top/middle/bottom × left/center/right), default bottom-center.
   - **Format** — `"1"`, `"1 of N"`, `"Page 1"`, `"Page 1 of N"`, `"- 1 -"`.
   - **Font size** — 6–36pt via Slider, default 12pt.
   - **Margin** — 0–108pt via Slider (shown as both pt and inches), default 36pt (0.5″).
   - **Starting page number** — Input, default 1, useful for multi-volume sets.
   - **Live preview** — a small panel showing the format rendered for the current starting number against the actual page count.
   Numbers are drawn with `page.drawText` using the embedded `StandardFonts.Helvetica` in black `rgb(0,0,0)`. Position is computed via `positionForPdfPoint` using the text's `widthOfTextAtSize` + `heightAtSize` so the box centres correctly at every position. Output filename is `${base}-numbered.pdf`.

5. **`pdf-metadata-viewer.tsx`** (`PdfMetadataViewer`) — single PDF dropzone. Reads the file into memory and probes:
   - Info dictionary: `getTitle`, `getAuthor`, `getSubject`, `getKeywords`, `getCreator`, `getProducer`.
   - Dates: `getCreationDate`, `getModificationDate` → `formatPdfDate`.
   - Page count and first-page size (`getWidth` × `getHeight` + orientation guess).
   - PDF version (`readPdfVersion` parses `%PDF-x.y` from the header bytes).
   - Encryption flag — scans the last 64 KB of the file for `/Encrypt\b` (pdf-lib's `ignoreEncryption: true` lets us open flagged-but-unprotected files; we still report the flag).
   - Linearisation flag — scans the first 4 KB for `/Linearized\b`.
   - File size.
   Results are rendered in a semantic `<table>` with `<th scope="row">` for the field labels and `<td>` for the values. A "Copy metadata as text" button writes a plain-text summary to the clipboard via `navigator.clipboard.writeText`.

## Setup

- Installed `pdf-lib@1.17.1` (~350 KB, no native deps) and `jszip@3.10.1` (~95 KB, no native deps).
- Both libraries are statically imported at the top of the relevant client components; Next.js's automatic code-splitting keeps them out of the initial bundle until the user navigates to a PDF tool.

## Edge cases handled

- Empty input → dropzone-only state, primary button hidden or disabled.
- Invalid files (non-PDF for PDF tools, non-image for image-to-pdf) → friendly toast, file skipped or rejected.
- Encrypted PDFs → `loadPdfDocument` catches the encryption error and shows "Please decrypt it first".
- Files >100 MB → warning toast ("Large files may take a while").
- Files >250 MB → rejected with a clear error toast.
- Invalid range syntax (`1-, abc, 5-3-reversed`) → `parsePageRanges` throws a friendly message.
- Ranges entirely outside `[1, pageCount]` → "No valid pages selected" error.
- Multiple download buttons (no ZIP) → each blob gets its own `URL.createObjectURL` and is revoked after download via the shared `downloadBlob` helper.

## Registration

All 5 components are imported and registered in `src/components/tools/tool-router.tsx`:
- `pdf-merge` → `PdfMerge`
- `pdf-split` → `PdfSplit`
- `image-to-pdf` → `ImageToPdf` (shared component, also powers `jpg-to-pdf` and `png-to-pdf`)
- `add-page-numbers-to-pdf` → `AddPageNumbersToPdf`
- `pdf-metadata-viewer` → `PdfMetadataViewer`

## Issues caught & fixed

- **JSX parsing error in `pdf-split.tsx`**: limitations section had `>100 MB` as a raw `>` character inside JSX text. ESLint flagged it as `Parsing error: Unexpected token. Did you mean `{'>'}` or `&gt;`?`. Fixed by HTML-escaping to `&gt;100 MB`.
- **Unused `PDFName` / `PDFString` imports in `pdf-metadata-viewer.tsx`**: initial encryption-probe logic used pdf-lib's internal `PDFName.of("Encrypt")` lookup; that approach was brittle and dropped in favour of a raw-bytes scan. Removed the now-unused imports.
- **Unused `downloadBlob` import in `image-to-pdf.tsx`**: download handler was refactored to use the existing object URL directly (so the link can be re-used for repeated downloads without revoking). Removed the unused import.
- **Unused `fmtBytes` alias in `pdf-merge.tsx`**: the file imported `formatBytes` from both `@/components/dueneo/dropzone` and `./_pdf-helpers` (as `fmtBytes`). Dropped the helpers-side import; all callsites use the dropzone version.
- **`parsePageRanges` `void pages` placeholder in `pdf-split.tsx`**: initial code called `parsePageRanges` purely for validation and discarded the result with a `void pages;` line. Cleaned up to a plain validation call.

## Verification

- `bun run lint` → exits 0, no errors, no warnings.
- `tail -50 dev.log` → final lines show `Compiled in Nms` and `GET / 200` only; the only error trace (an earlier `>100 MB` JSX parse failure) was fixed.
- `curl http://127.0.0.1:81/` → HTTP 200, homepage HTML contains `#/pdf-merge` (in the popular-tools list) and `#/pdf-tools` (category page link). The other PDF tools are reachable via the `#/pdf-tools` category page and the global search.
- `curl http://127.0.0.1:81/ | grep -c pdf-merge` → 1.

## Follow-ups for future agents

- The `_pdf-helpers.ts` file is reusable for any future PDF task: `loadPdfDocument`, `parsePageRanges`, `positionForPdfPoint`, `imageFileToPdfEmbeddable`, `readPdfVersion`, `formatPdfDate` are all generic.
- Web Worker support is mentioned in the DUENEO BIBLE for heavy PDF operations. All processing currently runs on the main thread; for very large PDFs (50 MB+), moving `loadPdfDocument` and `doc.save()` into a Web Worker (via `Comlink` or a hand-rolled message channel) would keep the UI responsive. The shape of `_pdf-helpers` would not need to change — only the call sites.
- The remaining 8 PDF tools (PDF Compress, Rotate PDF, Delete PDF Pages, Extract PDF Pages, Rearrange PDF Pages, PDF to JPG, Watermark PDF, Password Protect PDF) are not yet implemented. PDF to JPG needs pdf.js for rasterisation; Rotate/Delete/Extract/Rearrange can use pdf-lib directly; Watermark PDF can adapt `add-page-numbers-to-pdf.tsx`; PDF Compress and Password Protect PDF need heavier libraries (pdf.js + canvas recompression for compress, qpdf-wasm or similar for encrypt).
- The page-numbers tool could be extended to support custom fonts by accepting a TTF/OTF File and using `doc.embedFont(uint8Array)`. The UI plumbing is already there — just add a font-upload Dropzone and pass the bytes through.
- The metadata viewer could be extended to display XMP metadata packets (parse the XML packet in the PDF stream objects) for users who want the modern metadata standard too.
