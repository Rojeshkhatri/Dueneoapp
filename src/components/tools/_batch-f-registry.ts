import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { WorkingDaysCalculator } from "./utility/working-days-calculator";
import { PregnancyDueDateCalculator } from "./utility/pregnancy-due-date-calculator";
import { Stopwatch } from "./utility/stopwatch";
import { WorldClock } from "./utility/world-clock";

/**
 * Batch F registry — 4 time / scheduling utility tools (Task 2-f-viral).
 *
 * Centralised in its own file so that the main agent can import and merge
 * this map into `tool-router.tsx` after all parallel batches complete,
 * avoiding git conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchFComponents: Record<string, ComponentType<{ tool: ToolDefinition }>> = {
  "working-days-calculator": WorkingDaysCalculator,
  "pregnancy-due-date-calculator": PregnancyDueDateCalculator,
  "stopwatch": Stopwatch,
  "world-clock": WorldClock,
};
