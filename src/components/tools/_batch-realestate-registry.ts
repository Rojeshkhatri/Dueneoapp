import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { RentalYieldCalculator } from "./realestate/rental-yield-calculator";
import { MortgageAffordabilityCalculator } from "./realestate/mortgage-affordability-calculator";
import { StampDutyCalculator } from "./realestate/stamp-duty-calculator";
import { RenovationBudgetPlanner } from "./realestate/renovation-budget-planner";
import { PropertyRoiCalculator } from "./realestate/property-roi-calculator";
import { AirbnbIncomeEstimator } from "./realestate/airbnb-income-estimator";
import { CapRateCalculator } from "./realestate/cap-rate-calculator";
import { HouseFlippingCalculator } from "./realestate/house-flipping-calculator";
import { PropertyComparisonDashboard } from "./realestate/property-comparison-dashboard";
import { CashFlowAnalyzer } from "./realestate/cash-flow-analyzer";

/**
 * Real-estate batch registry — 10 tools (IDs 225–234, Task 3-edu-real).
 *
 * Centralised in its own file so the main agent can import and merge
 * this map into `tool-router.tsx` without git conflicts from concurrent
 * edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchRealestateComponents: Record<string, ComponentType<{ tool: ToolDefinition }>> = {
  "rental-yield-calculator": RentalYieldCalculator,
  "mortgage-affordability-calculator": MortgageAffordabilityCalculator,
  "stamp-duty-calculator": StampDutyCalculator,
  "renovation-budget-planner": RenovationBudgetPlanner,
  "property-roi-calculator": PropertyRoiCalculator,
  "airbnb-income-estimator": AirbnbIncomeEstimator,
  "cap-rate-calculator": CapRateCalculator,
  "house-flipping-calculator": HouseFlippingCalculator,
  "property-comparison-dashboard": PropertyComparisonDashboard,
  "cash-flow-analyzer": CashFlowAnalyzer,
};
