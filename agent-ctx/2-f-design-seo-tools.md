# Task 2-f — Design & SEO Tools

**Agent:** design-seo-tools  
**Task ID:** 2-f  
**Date:** 2026-07-07  

## Summary

Implemented 9 browser-only tools across the design (5) and SEO (4) categories:

| ID  | Slug                       | Component               | File                                |
|-----|----------------------------|-------------------------|-------------------------------------|
| 91  | color-picker               | ColorPicker             | design/color-picker.tsx             |
| 92  | color-palette-generator    | ColorPaletteGenerator   | design/color-palette-generator.tsx  |
| 93  | css-gradient-generator     | CssGradientGenerator    | design/css-gradient-generator.tsx   |
| 94  | contrast-checker           | ContrastChecker         | design/contrast-checker.tsx         |
| 95  | svg-optimizer              | SvgOptimizer            | design/svg-optimizer.tsx            |
| 96  | meta-tag-generator         | MetaTagGenerator        | seo/meta-tag-generator.tsx          |
| 97  | open-graph-generator       | OpenGraphGenerator      | seo/open-graph-generator.tsx        |
| 98  | robots-txt-generator       | RobotsTxtGenerator      | seo/robots-txt-generator.tsx        |
| 99  | sitemap-generator          | SitemapGenerator        | seo/sitemap-generator.tsx           |

## Shared helpers

- `src/components/tools/design/_color-helpers.ts` — HEX/RGB/HSL conversions, WCAG contrast math, palette generators (complementary, analogous, triadic, tetradic, monochromatic, shades), `readableTextOn` helper. No JSX, exported as plain functions.

## Key implementation choices

- All processing is local; no backend API routes; no new libraries installed.
- Colour inputs use native `<input type=color>` paired with sync'd HEX/RGB/HSL text fields. Invalid values revert on blur with a `toast.error`.
- SVG optimizer is regex-based (no SVGO dependency). Conservative — only strips comments, XML decl, editor namespaces, `<metadata>`, default attributes and whitespace. Never alters geometry.
- Sitemap generator returns `{ generated, warning }` from `useMemo` instead of calling `setState` inside the memo (React Compiler-friendly).
- Robots.txt supports three modes (allow-all / disallow-all / custom) and per-user-agent rule blocks.
- All tools include: intro paragraph, interactive UI, How-To steps, use cases, limitations and FAQ.

## Issues fixed

1. Three `React.ChangeEvent<HTMLInputElement)` typos in `color-picker.tsx` (missing `>`) — caused ESLint parsing error.
2. Unused `// eslint-disable-next-line @next/next/no-img-element` in `open-graph-generator.tsx` — removed.
3. Unused `Switch` import in `robots-txt-generator.tsx` — removed.
4. Wrong import path for `Input` in `robots-txt-generator.tsx` (was `@/components/ui/label`) — fixed.
5. Sitemap generator: refactored to avoid `setState` inside `useMemo`.
6. Sitemap generator: changefreq Select uses `__omit__` sentinel value to cleanly omit `<changefreq>` from output.

## Verification

- `bun run lint` → exit 0, no errors, no warnings.
- `tail dev.log` → only `Compiled in Nms` and `GET / 200` lines after fixes; no compile errors.
- `curl http://127.0.0.1:81/` → HTTP 200.
- `curl http://127.0.0.1:81/ | grep -c color-picker` → 1 (design tool linked from homepage).
- All 9 components registered in `src/components/tools/tool-router.tsx` `TOOL_COMPONENTS` map.

## Reusable artifacts for future agents

- `_color-helpers.ts` — colour conversion + WCAG contrast + palette generation utilities.
- `optimiseSvg` function in `svg-optimizer.tsx` — exported (regex-based, conservative).
- Meta-tag and OG generators' `escAttr` helper — HTML-attribute escaping, reusable for any future tag-emitting tool.
