# Task 3-seo — SEO Tools (Batch 2)

**Agent:** seo-tools-2
**Task ID:** 3-seo
**Date:** 2026-07-07

## Summary

Implemented 9 browser-only SEO tools (IDs 156-164) under `src/components/tools/seo/`, plus a centralised registry file `src/components/tools/_batch-seo2-registry.ts` for the main agent to merge into `tool-router.tsx`.

| ID  | Slug                       | Component               | File                                |
|-----|----------------------------|-------------------------|-------------------------------------|
| 156 | robots-txt-tester          | RobotsTxtTester         | seo/robots-txt-tester.tsx           |
| 157 | sitemap-visualizer         | SitemapVisualizer       | seo/sitemap-visualizer.tsx          |
| 158 | internal-link-visualizer   | InternalLinkVisualizer  | seo/internal-link-visualizer.tsx    |
| 159 | canonical-tag-checker      | CanonicalTagChecker     | seo/canonical-tag-checker.tsx       |
| 160 | open-graph-preview         | OpenGraphPreview        | seo/open-graph-preview.tsx          |
| 161 | schema-validator           | SchemaValidator         | seo/schema-validator.tsx            |
| 162 | serp-snippet-preview       | SerpSnippetPreview      | seo/serp-snippet-preview.tsx        |
| 163 | keyword-clustering-tool    | KeywordClusteringTool   | seo/keyword-clustering-tool.tsx     |
| 164 | faq-schema-generator       | FaqSchemaGenerator      | seo/faq-schema-generator.tsx        |

## Registry

- `src/components/tools/_batch-seo2-registry.ts` exports `batchSeo2Components: Record<string, ComponentType<{ tool: ToolDefinition }>>`.
- Tool-router.tsx was NOT edited (per task constraint). Main agent will add `...batchSeo2Components` to the `TOOL_COMPONENTS` map.

## Key implementation choices

- All processing is browser-only. HTML and XML parsing use the native `DOMParser`; no external parsing libraries added.
- All 9 components follow the existing SEO tool pattern (sitemap-generator, open-graph-generator, etc.): `"use client"`, `ToolLayout` with full `ToolContent` (intro / tool / howTo / useCases / limitations / faq), `sonner` toast for feedback, `CopyButton` for clipboard.
- Each tool includes sensible sample data so users see a populated result on first load.
- Reused `downloadText` helper from `src/components/tools/developer/_dev-helpers.ts` in keyword-clustering-tool and faq-schema-generator (no new utility file created).

## Per-tool highlights

- **robots-txt-tester**: hand-rolled robots.txt parser. Implements Google's most-specific-match algorithm with Allow-beats-Disallow tie-break. Wildcard `*` (matches `/`) and end-anchor `$` supported. User-agent group selection: exact match → longest prefix → `*` fallback.
- **sitemap-visualizer**: supports both `<urlset>` and `<sitemapindex>`. URL tree grouped by host then path segment, with lastmod/priority/changefreq badges on leaf nodes. Earliest/latest date range computed from lastmod.
- **internal-link-visualizer**: DOMParser-based `<a href>` extraction. Inline SVG radial graph (centre = page, ring = distinct link targets, colour-coded internal/external/anchor). Resolves relative URLs against the base URL, with `<base href>` override.
- **canonical-tag-checker**: extracts title/description/canonical/robots/hreflang/all og:*/charset/viewport. Validates 13 issue classes including noindex+canonical conflict, missing x-default hreflang, og:url vs canonical mismatch, non-HTTPS og:image.
- **open-graph-preview**: four platform-specific cards in a Tabs UI. Facebook (1.91:1), Twitter/X (2:1, 1-line title), LinkedIn (site name + tinted footer), Slack/iMessage (small square thumbnail beside text).
- **schema-validator**: 10 schema.org types with per-type required + recommended field lists. LocalBusiness inherits Organization fields. Deep checks for FAQPage mainEntity shape, BreadcrumbList itemListElement, Article author shape, Product offers price. Supports single object, JSON array, and @graph wrapper.
- **serp-snippet-preview**: Google-style SERP preview with breadcrumb URL display. Pixel-width estimator with separate average widths for CJK characters, wide letters (MW@), narrow letters (ilI1), and default. Desktop (600/980px) vs mobile (520/700px) limits via a Tabs segmented control.
- **keyword-clustering-tool**: Jaccard similarity over token sets (stop-words removed). Union-find single-link clustering at user-controlled threshold (0.30–0.80) via Slider + +/- buttons. Clusters sorted by size; each shows shared-word intersection and member keywords. JSON export (copy + download).
- **faq-schema-generator**: add/remove Q&A rows. Validation: empty fields, over-long question, short answer, HTML-in-answer, duplicate question. Emits FAQPage JSON-LD with Question/Answer nesting. Copy as bare JSON or as full `<script type="application/ld+json">` block; download as faq-schema.json.

## Issues fixed

1. `open-graph-preview.tsx`: nested `ImageBlock` function component inside render triggered `react-hooks/static-components` ESLint error. Refactored to a top-level component taking `src/alt/className/placeholder` props. Removed unused `eslint-disable-next-line @next/next/no-img-element` (rule not enabled).
2. `sitemap-visualizer.tsx`: used `Badge variant="ghost"` which doesn't exist in the local `badge.tsx` (only default/secondary/destructive/outline). Switched to `variant="outline"` with `text-muted-foreground`.
3. `internal-link-visualizer.tsx`: removed unused `Badge` import (used inline spans for type badges). Removed over-complicated `NODE_TEXT_FILL` constant; SVG legend now uses `className="fill-muted-foreground"`.
4. `schema-validator.tsx`: BreadcrumbList check operator precedence clarified with explicit parentheses (`!A || (!B && !C)`).
5. `serp-snippet-preview.tsx`: useCases array had a syntax-breaking string with embedded unescaped `"` (`"…| Brand"`). Replaced with `\u2026` escape. Removed unused `TabsContent` import (segmented control uses only Tabs/TabsList/TabsTrigger).

## Verification

- `bun run lint` → exit 0, 0 errors, 0 warnings.
- `tail -50 dev.log` → only `✓ Compiled in Nms` and `GET / 200` lines, no compile errors.
- All 9 named exports verified present with `{ tool: ToolDefinition }` prop signature.
- Registry file `batchSeo2Components` exports all 9 components keyed by their slug.

## Reusable artifacts for future agents

- `parseRobots` / `patternToRegex` / `evaluateGroup` / `pickGroup` in `robots-txt-tester.tsx` — full robots.txt matching engine.
- `parseSitemap` / `buildTree` in `sitemap-visualizer.tsx` — DOMParser-based sitemap parser + URL tree builder.
- `parseHead` / `validate` in `canonical-tag-checker.tsx` — HTML head extractor + SEO issue validator (13 issue classes).
- `SCHEMA_SPECS` table in `schema-validator.tsx` — extensible schema.org type spec; add more types by appending to the record.
- `pixelWidth` / `truncateByPixels` in `serp-snippet-preview.tsx` — pixel-width estimator with CJK + wide/narrow Latin handling.
- `tokenize` / `jaccard` / `clusterKeywords` in `keyword-clustering-tool.tsx` — Jaccard similarity + union-find clustering.
