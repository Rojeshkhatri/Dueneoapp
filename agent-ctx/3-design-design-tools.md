# Task 3-design — Designer Tools (IDs 183-189)

**Agent:** design-tools
**Task ID:** 3-design
**Scope:** Build 7 designer tools for the Dueneo platform.

## Summary

All 7 designer tools (IDs 183-189) flagged `implemented: true` in
`src/data/tools.ts` are now fully implemented, browser-only, and ready to
route. Lint clean. Dev server compiles cleanly.

## Files created

- `src/components/tools/design/_accessibility-helpers.ts` — CVD simulation matrices (protanopia, deuteranopia, tritanopia, achromatopsia via Vienot/Brettel) + WCAG evaluation helper.
- `src/components/tools/design/color-accessibility-tester.tsx`
- `src/components/tools/design/typography-scale-generator.tsx`
- `src/components/tools/design/icon-optimizer.tsx`
- `src/components/tools/design/design-token-generator.tsx`
- `src/components/tools/design/border-radius-playground.tsx`
- `src/components/tools/design/component-spacing-calculator.tsx`
- `src/components/tools/design/shadow-generator.tsx`
- `src/components/tools/_batch-design2-registry.ts` — exports `batchDesign2Components` map.
- `agent-ctx/3-design-design-tools.md` (this file)

## Files modified

- (none — per task instructions I did NOT edit `tool-router.tsx`)

## Per-tool notes

1. **Color Accessibility Tester** (183) — palette editor (add/remove, HEX + label per colour), 4 CVD simulations + original, side-by-side comparison table (rows = conditions, cols = palette), pairwise contrast matrix with AA / AA Large / AAA pass-fail badges computed on the ORIGINAL palette (WCAG is measured on real colours, not simulated). Copy report button.

2. **Typography Scale Generator** (184) — base size (8-48 px), 6 named ratios (minor third → golden ratio), steps-above and steps-below sliders. Tailwind-style names (xs, sm, base, lg, xl, 2xl, 3xl…). Live preview rows showing `The quick brown fox` at the actual px size. Three output tabs: CSS variables (with px + rem comments), Tailwind config snippet (`fontSize`), SCSS variables.

3. **Icon Optimizer** (185) — paste SVG, 7 toggleable optimisations: remove XML declaration, comments, editor namespaces (inkscape/sodipodi/xlink/sketch/illustrator/corel), metadata, default attributes (fill="black", stroke="none", stroke-width="1"), **round coordinates to 2 dp** (operates on known numeric attributes: d, points, x, y, x1, y1, x2, y2, cx, cy, r, rx, ry, width, height, fx, fy, offset), collapse whitespace. Before/after size, saved %, live preview at 48/96/144 px, copy + download.

4. **Design Token Generator** (186) — three input sections (colour palette, typography scale, spacing system) + three output tabs (CSS custom properties, Tailwind config, JSON). Colour names slugified on input. Spacing follows the canonical Tailwind multiplier set (0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96).

5. **Border Radius Playground** (187) — 8 sliders (TL-X, TL-Y, TR-X, TR-Y, BR-X, BR-Y, BL-X, BL-Y), each with a numeric input. Live preview on a coloured square against an editable background. CSS output collapses to the simple `Npx` form when all radii match; otherwise emits the `horizontal / vertical` per-corner syntax. Presets: Sharp, Card, Pill, Circle, Squircle (asymmetric X/Y approximation).

6. **Component Spacing Calculator** (188) — base unit 4 or 8 px, slider for step count (1 to 34). Standard Tailwind multipliers as the scale (so names like `0`, `0.5`, `1`, `1.5`, `2.5`, `3.5`, `12`, `14`, `16`, `20`, `24`, `28`, `32` map cleanly to Tailwind utilities). Visual swatches (capped at 320 px width for readability) with px labels. Output as CSS variables or Tailwind config.

7. **Shadow Generator** (189) — multi-layer editor with per-layer sliders (offsetX, offsetY, blur, spread), colour picker + free-text colour field (accepts rgba/hsla/hex/named), inset toggle, reorder up/down, remove. Presets: Material Elevation 0-5 (dp→px approximations), Neumorphic (paired light/dark), Glow (blue). Editable preview background. Live `box-shadow` CSS output with copy button.

## Patterns followed

- Each component exports a named function matching the `component` key in `tools.ts`.
- Props: `{ tool }: { tool: ToolDefinition }`.
- Each component returns `<ToolLayout tool={tool} content={content} />` with full `intro`, `tool`, `howTo`, `useCases`, `limitations`, `faq`.
- shadcn/ui primitives used: `Input`, `Label`, `Button`, `Slider`, `Switch`, `Tabs`, `Select`, `Textarea` (via existing imports).
- `CopyButton` from `@/components/dueneo/copy-button` for all clipboard actions.
- `sonner` toast for feedback.
- All client-only — `"use client"` at the top of every `.tsx` file.
- Reused `_color-helpers.ts` (HEX/RGB/HSL, contrast) and `_dev-helpers.ts` (byteLength, formatBytes, downloadText) for consistency with the existing design/developer tool families.
- All SVG icons from `lucide-react`.

## Verification

- `bun run lint` exits 0 (zero errors, zero warnings).
- Dev server (Next.js 16.1.3 Turbopack) keeps compiling cleanly — last several `dev.log` entries are `✓ Compiled in …` with no errors.
- Did NOT edit `tool-router.tsx` per task instructions.

## Follow-ups for the main agent

- Merge `batchDesign2Components` into `TOOL_COMPONENTS` in `tool-router.tsx` (one-line spread, same pattern as `...batchAComponents`, `...batchSocialComponents`, etc.).
- After the merge, smoke-test the 7 routes:
  - `#/color-accessibility-tester`
  - `#/typography-scale-generator`
  - `#/icon-optimizer`
  - `#/design-token-generator`
  - `#/border-radius-playground`
  - `#/component-spacing-calculator`
  - `#/shadow-generator`
