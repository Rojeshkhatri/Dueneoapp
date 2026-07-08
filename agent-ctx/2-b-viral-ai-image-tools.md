# Task 2-b-viral — ai-image-tools

**Agent:** ai-image-tools
**Task ID:** 2-b-viral
**Scope:** Build 6 AI / image tools (IDs 109-114) — `background-remover`, `image-color-extractor`, `meme-generator`, `passport-photo-maker`, `image-to-ascii`, `photo-collage-maker`.

## What was built

All 6 tools are browser-only, render through `ToolLayout`, and live under `src/components/tools/image/`. Each accepts `{ tool }: { tool: ToolDefinition }` and supplies `intro`, `tool`, `howTo`, `useCases`, `limitations`, `faq` content.

### 1. `background-remover.tsx` (`BackgroundRemover`)
- Installed `@imgly/background-removal@1.7.0` (the package name on npm is `background-removal`, not `background-remover` as the brief suggested) and its peer dependency `onnxruntime-web@1.21.0`.
- The library is **dynamically imported** inside the click handler (`await import("@imgly/background-removal")`) so the heavy ONNX runtime never lands in the initial JS bundle. It only loads when the user actually clicks "Remove background".
- Uses the `isnet_quint8` quantized model (~40MB) for the smallest download. The model + WASM runtime are browser-cached for instant subsequent runs.
- Wires up the library's `progress: (key, current, total) => ...` callback to a `<Progress>` bar with friendly phase labels ("Downloading AI model…", "Loading WASM runtime…", "Running neural network…").
- First-run banner explicitly warns "Loading AI model (~30MB, one-time download)".
- Renders original + transparent result side-by-side; result is shown over a checkerboard backdrop so the alpha channel is visible.
- Download as PNG with `replaceExtension(file.name, "png")`.

### 2. `image-color-extractor.tsx` (`ImageColorExtractor`)
- Downscale image to max 256×256 on the longest side, sample every visible pixel (alpha < 16 skipped).
- Two algorithms: **median-cut** (Heckbert 1980) — recursively splits the colour cube along its longest axis at the median pixel until N boxes are formed; **frequency-bucket** — quantizes each channel to 4 bits → 4096 buckets, picks the N most populous.
- Each swatch shows HEX, RGB and HSL — every value is a click-to-copy button (uses `navigator.clipboard.writeText`).
- Live percentage badge per swatch reflects the share of sampled pixels closest to that colour.
- Download the full palette as JSON (HEX + RGB + HSL + population + fraction per colour).

### 3. `meme-generator.tsx` (`MemeGenerator`)
- Two source modes: upload an image OR pick from 6 gradient templates (DRAGNEO orange/red, Sky, Forest, Midnight, Sunrise, Concrete).
- Top text, bottom text, font size slider (20-120 px), text colour picker, black outline toggle, UPPERCASE toggle.
- Renders on a Canvas using `bold {size}px Impact, "Arial Narrow Bold", "Helvetica Inserat", sans-serif` with `textAlign="center"` and `lineJoin="round"`.
- Word-wrap helper (`wrapLines`) splits long captions to fit the canvas width — handles explicit `\n` and natural word boundaries.
- Preview canvas caps at 600 px wide for responsiveness; full-resolution download renders at the source image's natural pixel size.
- Custom `parseGradient` helper converts a CSS `linear-gradient(...)` string into a `CanvasGradient` for template fills (handles "to top/right/…", `Ndeg`, and percentage stops).

### 4. `passport-photo-maker.tsx` (`PassportPhotoMaker`)
- 12 country presets: US (51×51mm), UK/EU/India/Australia/Japan/Singapore/Philippines/Germany/Russia (35×45mm), Canada (50×70mm), China (33×48mm). Each carries official head-size guidance notes.
- Output rendered at 300 DPI → e.g. 35×45mm = 413×531 px, 51×51mm = 602×602 px, 50×70mm = 591×827 px.
- Three sliders: horizontal pan (0-1), vertical pan (0-1), zoom (1-4×). The photo is drawn "cover" style with the pan-point of the source aligned to the pan-point of the destination — intuitive dragging behaviour.
- Crop preview overlay shows a dashed blue ellipse (head-position guide) centred on the upper third of the frame plus a centre crosshair.
- "Fill white background" switch paints behind the photo — use after running Background Remover for a clean cut-out.
- Suggests the Background Remover tool in the upload screen and limitations section.

### 5. `image-to-ascii.tsx` (`ImageToAscii`)
- Three character sets: `standard` (`.:-=+*#%@`, 10 chars), `blocks` (` ░▒▓█`, 5 chars), `minimal` (` .:#`, 4 chars).
- Width slider 40-200 chars. Height auto-scales from the image's aspect ratio × 0.55 to compensate for character cells being taller than wide.
- Brightness = `0.299R + 0.587G + 0.114B` (luminance). Char index = `floor(adjusted * (chars.length - 1))`.
- Invert toggle flips dark/light. Colour toggle renders each character in the source pixel's original RGB (via per-character `<span>` with inline `color`).
- Preview is a `<pre>` with monospace font on a dark backdrop. Copy text to clipboard or download as `.txt` (always plain text — colour is preview-only).

### 6. `photo-collage-maker.tsx` (`PhotoCollageMaker`)
- 5 layouts: `2-up` (1×2), `3-up` (1×3), `2x2` (2×2), `3x2` (2×3), `3x3` (3×3). Auto-promotes layout when more photos are added than the current layout fits.
- Dropzone in `multiple` mode accepts up to 9 photos. Each shows as a thumbnail with a ✕ remove button.
- Spacing slider 0-48 px, background colour picker, rounded-corners switch (radius derived from spacing).
- Live CSS grid preview that mirrors the canvas output exactly (square cells, `object-fit: cover`).
- Canvas rendering: each cell is 800×800 px, photos drawn cover-style; rounded cells use `ctx.clip()` on a rounded-rectangle path. Empty cells render a faint "(empty)" placeholder.

## Registration pattern

- Per the brief, did NOT edit `tool-router.tsx` directly.
- Created `src/components/tools/_batch-b-registry.ts` exporting `batchBComponents` — a `Record<string, ComponentType<{ tool: ToolDefinition }>>` mapping all 6 component keys.
- Main agent will merge this map (single `import` + `Object.assign` / spread) into `TOOL_COMPONENTS` after parallel batches complete.

## Shared / reusable helpers

- Continued using the existing `src/components/tools/image/_image-helpers.tsx` (`MAX_IMAGE_BYTES`, `formatBytes`, `loadImageFromFile`, `getCanvas2D`, `replaceExtension`) — no changes needed.
- Each component defines its own small helpers locally (median-cut, passport drawCover, meme parseGradient, ASCII conversion) — kept them in-file because they're tightly coupled to the component's UX.

## Issues caught & fixed

- **Wrong package name.** The brief said `@imgly/background-remover`; the actual npm package is `@imgly/background-removal`. Discovered when `bun add @imgly/background-remover` returned a 404. Installed `@imgly/background-removal@1.7.0` plus its `onnxruntime-web@1.21.0` peer dep.
- **`parseGradient` referenced `ctx!` that wasn't in scope.** The helper needed a `CanvasRenderingContext2D` to call `createLinearGradient`. Fixed by adding `ctx` as the first parameter and passing it from the call site (`parseGradient(c, ...)`).
- **Unused imports.** Removed `Type` from `meme-generator.tsx` and `FileChip` / `formatBytes` from `photo-collage-maker.tsx` after they turned out not to be needed.
- **Unused eslint-disable directives.** Removed `// eslint-disable-next-line react-hooks/exhaustive-deps` from `image-to-ascii.tsx` and `photo-collage-maker.tsx` — the rule isn't enabled in this project, so the directives produced warning noise.

## Verification

- `bun run lint` — exits 0 with **0 errors and 0 warnings**.
- `npx tsc --noEmit` — **0 errors in any of the 6 new files** (56 pre-existing errors in other agents' files — `pdf-merge`, `pdf-split`, `pdf-metadata-viewer`, `add-page-numbers-to-pdf`, `image-to-pdf`, `base64-decoder`, `security/_security-helpers`, plus some `examples/` and `skills/` files — all unrelated to this batch).
- `tail -50 dev.log` — clean: only `✓ Compiled in Nms` lines, no compile errors.
- Dynamic import verified: `@imgly/background-removal` is loaded via `await import()` inside the click handler so it's code-split into a separate chunk and never blocks the initial page load.

## Files created

- `src/components/tools/image/background-remover.tsx`
- `src/components/tools/image/image-color-extractor.tsx`
- `src/components/tools/image/meme-generator.tsx`
- `src/components/tools/image/passport-photo-maker.tsx`
- `src/components/tools/image/image-to-ascii.tsx`
- `src/components/tools/image/photo-collage-maker.tsx`
- `src/components/tools/_batch-b-registry.ts`
- `agent-ctx/2-b-viral-ai-image-tools.md` (this file)

## Files modified

- `package.json` + `bun.lock` — added `@imgly/background-removal@1.7.0` and `onnxruntime-web@1.21.0`.

## Follow-ups for main agent

- Merge `batchBComponents` from `src/components/tools/_batch-b-registry.ts` into `TOOL_COMPONENTS` in `src/components/tools/tool-router.tsx` (single `import { batchBComponents }` + spread into the map). Until then the 6 tools fall through to the "Component not registered yet" placeholder.
- The same merge is still pending for `batchAComponents` from `src/components/tools/_batch-a-registry.ts` (the previous batch's 8 random/picker tools). Both can be merged in a single follow-up.
- Consider hosting the `@imgly/background-removal` model + WASM files on a first-party CDN (`publicPath` config option) for production. Default is `https://staticimgly.com/...` which works fine for now but adds a third-party dependency for the model download.
