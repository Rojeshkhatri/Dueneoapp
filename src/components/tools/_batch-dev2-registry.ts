import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { ApiResponseVisualizer } from "./developer/api-response-visualizer";
import { SqlExecutionPlanner } from "./developer/sql-execution-planner";
import { JwtInspector } from "./developer/jwt-inspector";
import { GraphQLQueryExplorer } from "./developer/graphql-query-explorer";
import { OpenApiViewer } from "./developer/openapi-viewer";
import { DockerComposeVisualizer } from "./developer/docker-compose-visualizer";
import { KubernetesYamlValidator } from "./developer/kubernetes-yaml-validator";
import { TailwindClassSorter } from "./developer/tailwind-class-sorter";
import { CssSpecificityCalculator } from "./developer/css-specificity-calculator";

/**
 * Batch Dev-2 registry — 9 advanced developer tools (Task 3-developer,
 * tool IDs 174-182).
 *
 * Centralised in its own file so that the main agent can import and merge
 * this map into `tool-router.tsx` after all parallel batches complete,
 * avoiding git conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchDev2Components: Record<string, ComponentType<{ tool: ToolDefinition }>> = {
  "api-response-visualizer": ApiResponseVisualizer,
  "sql-execution-planner": SqlExecutionPlanner,
  "jwt-inspector": JwtInspector,
  "graphql-query-explorer": GraphQLQueryExplorer,
  "openapi-viewer": OpenApiViewer,
  "docker-compose-visualizer": DockerComposeVisualizer,
  "kubernetes-yaml-validator": KubernetesYamlValidator,
  "tailwind-class-sorter": TailwindClassSorter,
  "css-specificity-calculator": CssSpecificityCalculator,
};
