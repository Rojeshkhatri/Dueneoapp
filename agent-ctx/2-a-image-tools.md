# Task 2-a — Image Tools (agent: image-tools)

## Scope
Implemented all 13 required image tool components under
`src/components/tools/image/`, registered them in the tool router,
and verified the build with `bun run lint` and the dev server log.

## Tools built
| # | File | Component | Notes |
|---|------|-----------|-------|
| 1 | `image-compressor.tsx` | `ImageCompressor` | Quality slider + format select (JPG/PNG/WebP) + before/after preview + savings % |
| 2 | `image-resizer.tsx` | `ImageResizer` | Pixels / percentage / preset modes + lock-aspect checkbox |
| 3 | `crop-image.tsx` | `CropImage` | Numeric X/Y/W/H inputs + live overlay + aspect presets |
| 4 | `rotate-image.tsx` | `RotateImage` | 90/180/270 buttons + custom 0–360° slider (padded canvas) |
| 5 | `flip-image.tsx` | `FlipImage` | Horizontal / vertical flip buttons |
| 6 | `format-converter.tsx` | `FormatConverter` | **Shared component** powering 7 tools (jpg-to-png, png-to-jpg, png-to-webp, webp-to-png, jpg-to-webp, webp-to-jpg, avif-to-jpg). Reads `tool.slug` to pick the target MIME type, extension and accept string. |
| 7 | `svg-to-png.tsx` | `SvgToPng` | Scale slider (0.25–8×), transparent/background option, parses SVG width/height/viewBox |
| 8 | `watermark-image.tsx` | `WatermarkImage` | 9-position grid, font-size slider, color picker, opacity slider, auto-scaled font |
| 9 | `blur-image.tsx` | `BlurImage` | `ctx.filter = blur(Npx)`, radius 0–40, live preview |
| 10 | `pixelate-image.tsx` | `PixelateImage` | Draw small then scale up with `imageSmoothingEnabled=false`, block 2–64 |
| 11 | `add-border-to-image.tsx` | `AddBorderToImage` | Width slider + color picker, border auto-scales with image |
| 12 | `favicon-generator.tsx` | `FaviconGenerator` | Tabs for text / emoji / image upload, generates 7 sizes (16/32/48/64/180/192/512), individual PNG downloads |
| 13 | `social-media-image-resizer.tsx` | `SocialMediaImageResizer` | 8 presets (FB cover, X header, IG square/story, LinkedIn cover, YT thumbnail, FB/X post), cover/contain fit, bg color |

## Shared helpers
Created `src/components/tools/image/_image-helpers.tsx` (note: must be `.tsx`
because it includes the `PreviewTile` JSX component) with:
- `formatBytes`, `loadImageFromFile`, `loadImageFromSrc`
- `downloadBlob`, `replaceExtension`, `getCanvas2D`, `hexToRgba`
- `positionFor` + `POSITION_OPTIONS` (9-position grid for watermark)
- `readFileAsDataURL`, `readFileAsText`
- `PreviewTile` reusable component
- `MAX_IMAGE_BYTES` (50 MB safety cap)

## Registration
All 13 components imported and registered in
`src/components/tools/tool-router.tsx` `TOOL_COMPONENTS` map. The 7 format
converters all map to the single `format-converter` key (matching the
`component` field in the registry).

## Conventions followed
- Every component is a **named export** taking `{ tool }: { tool: ToolDefinition }`.
- Every component renders `<ToolLayout tool={tool} content={content} />` with
  `intro`, `tool`, `howTo`, `useCases`, `limitations` and `faq`.
- Browser-only: Canvas `toBlob`, FileReader, `URL.createObjectURL` — no backend.
- Uses `Dropzone` for file input, `sonner` `toast` for notifications, and
  existing shadcn/ui components (Button, Slider, Label, Input, Select,
  Checkbox, Tabs).
- Friendly error toasts for invalid/oversized/unsupported files.
- Object URLs are revoked on cleanup and replacement to avoid leaks.
- Per the rule, no `indigo` or `blue` colors used for chrome (only the brand
  blue comes from the existing `bg-primary` token).

## Verification
- `bun run lint` → exit 0, no errors or warnings.
- Dev server log shows clean compiles and `GET / 200` responses only.
- Homepage `curl -sS http://127.0.0.1:81/` returns HTTP 200.

## Issues / follow-ups
- `heic-to-jpg` (id 12) is intentionally left unimplemented — it has no
  `component` key in the registry (HEIC decoding requires a heavy WASM
  library that the bible's "no heavy libraries" rule discourages). It will
  show as "Coming soon" via the existing `ComingSoonTool` fallback.
- Favicon generator exports PNGs only (no `.ico` encoder, per the brief).
- Crop Image uses numeric inputs + overlay rather than drag-resize handles
  (acceptable per the brief, which permits numeric x/y/w/h).
- No web worker offloading; the Canvas API is fast enough for ≤50 MB images
  in modern browsers. Heavy processing warnings are shown in the
  `limitations` section of each tool.
