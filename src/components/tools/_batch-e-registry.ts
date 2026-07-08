import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { JSONToTypeScript } from "./developer/json-to-typescript";
import { SQLFormatter } from "./developer/sql-formatter";
import { CSSMinifier } from "./developer/css-minifier";
import { JSMinifier } from "./developer/js-minifier";
import { JSONPathTester } from "./developer/jsonpath-tester";
import { HTTPStatusCodes } from "./developer/http-status-codes";
import { ColorShadeGenerator } from "./design/color-shade-generator";
import { PxRemConverter } from "./design/px-rem-converter";

/**
 * Batch E registry — 8 developer / designer tools (Task 2-e-viral).
 *
 * Centralised in its own file so that the main agent can import and merge
 * this map into `tool-router.tsx` after all parallel batches complete,
 * avoiding git conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchEComponents: Record<string, ComponentType<{ tool: ToolDefinition }>> = {
  "json-to-typescript": JSONToTypeScript,
  "sql-formatter": SQLFormatter,
  "css-minifier": CSSMinifier,
  "js-minifier": JSMinifier,
  "jsonpath-tester": JSONPathTester,
  "http-status-codes": HTTPStatusCodes,
  "color-shade-generator": ColorShadeGenerator,
  "px-rem-converter": PxRemConverter,
};
