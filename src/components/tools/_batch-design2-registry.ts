import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { ColorAccessibilityTester } from "./design/color-accessibility-tester";
import { TypographyScaleGenerator } from "./design/typography-scale-generator";
import { IconOptimizer } from "./design/icon-optimizer";
import { DesignTokenGenerator } from "./design/design-token-generator";
import { BorderRadiusPlayground } from "./design/border-radius-playground";
import { ComponentSpacingCalculator } from "./design/component-spacing-calculator";
import { ShadowGenerator } from "./design/shadow-generator";

/**
 * Batch Design-2 registry — 7 designer tools (Task 3-design, tool IDs 183-189).
 *
 * Centralised in its own file so that the main agent can import and merge
 * this map into `tool-router.tsx` after all parallel batches complete,
 * avoiding git conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchDesign2Components: Record<
  string,
  ComponentType<{ tool: ToolDefinition }>
> = {
  "color-accessibility-tester": ColorAccessibilityTester,
  "typography-scale-generator": TypographyScaleGenerator,
  "icon-optimizer": IconOptimizer,
  "design-token-generator": DesignTokenGenerator,
  "border-radius-playground": BorderRadiusPlayground,
  "component-spacing-calculator": ComponentSpacingCalculator,
  "shadow-generator": ShadowGenerator,
};
