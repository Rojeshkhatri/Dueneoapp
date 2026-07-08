import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { ResumeAtsScanner } from "./hr/resume-ats-scanner";
import { SalaryComparisonCalculator } from "./hr/salary-comparison-calculator";
import { NoticePeriodCalculator } from "./hr/notice-period-calculator";
import { PtoCalculator } from "./hr/pto-calculator";
import { InterviewScorecardBuilder } from "./hr/interview-scorecard-builder";
import { OfferComparisonTool } from "./hr/offer-comparison-tool";
import { CostToCompanyCalculator } from "./hr/cost-to-company-calculator";
import { PayslipAnalyzer } from "./hr/payslip-analyzer";
import { ShiftPlanner } from "./hr/shift-planner";
import { WorkAnniversaryTracker } from "./hr/work-anniversary-tracker";

/**
 * Batch HR & recruiting registry — 10 tools (Task 3-hr, IDs 199-208).
 *
 * Centralised in its own file so the main agent can import and merge this map
 * into `tool-router.tsx` after all parallel batches complete, avoiding git
 * conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchHrComponents: Record<
  string,
  ComponentType<{ tool: ToolDefinition }>
> = {
  "resume-ats-scanner": ResumeAtsScanner,
  "salary-comparison-calculator": SalaryComparisonCalculator,
  "notice-period-calculator": NoticePeriodCalculator,
  "pto-calculator": PtoCalculator,
  "interview-scorecard-builder": InterviewScorecardBuilder,
  "offer-comparison-tool": OfferComparisonTool,
  "cost-to-company-calculator": CostToCompanyCalculator,
  "payslip-analyzer": PayslipAnalyzer,
  "shift-planner": ShiftPlanner,
  "work-anniversary-tracker": WorkAnniversaryTracker,
};
