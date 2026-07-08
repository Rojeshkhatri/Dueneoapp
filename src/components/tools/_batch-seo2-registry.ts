import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { RobotsTxtTester } from "./seo/robots-txt-tester";
import { SitemapVisualizer } from "./seo/sitemap-visualizer";
import { InternalLinkVisualizer } from "./seo/internal-link-visualizer";
import { CanonicalTagChecker } from "./seo/canonical-tag-checker";
import { OpenGraphPreview } from "./seo/open-graph-preview";
import { SchemaValidator } from "./seo/schema-validator";
import { SerpSnippetPreview } from "./seo/serp-snippet-preview";
import { KeywordClusteringTool } from "./seo/keyword-clustering-tool";
import { FaqSchemaGenerator } from "./seo/faq-schema-generator";

/**
 * Batch SEO-2 registry — 9 SEO tools (Task 3-seo, IDs 156-164).
 *
 * Centralised in its own file so the main agent can import and merge this map
 * into `tool-router.tsx` after all parallel batches complete, avoiding git
 * conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchSeo2Components: Record<
  string,
  ComponentType<{ tool: ToolDefinition }>
> = {
  "robots-txt-tester": RobotsTxtTester,
  "sitemap-visualizer": SitemapVisualizer,
  "internal-link-visualizer": InternalLinkVisualizer,
  "canonical-tag-checker": CanonicalTagChecker,
  "open-graph-preview": OpenGraphPreview,
  "schema-validator": SchemaValidator,
  "serp-snippet-preview": SerpSnippetPreview,
  "keyword-clustering-tool": KeywordClusteringTool,
  "faq-schema-generator": FaqSchemaGenerator,
};
