import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { FireCalculator } from "./finance/fire-calculator";
import { MortgageComparison } from "./finance/mortgage-comparison";
import { LoanPayoffSimulator } from "./finance/loan-payoff-simulator";
import { FreelancerTaxEstimator } from "./finance/freelancer-tax-estimator";
import { CurrencyMarginCalculator } from "./finance/currency-margin-calculator";
import { InvoiceDueDateTracker } from "./finance/invoice-due-date-tracker";
import { SubscriptionCostTracker } from "./finance/subscription-cost-tracker";

/**
 * Batch Finance-2 registry — 7 advanced finance tools (Task 3-finance).
 *
 * Centralised in its own file so the main agent can import and merge this
 * map into `tool-router.tsx` after all parallel batches complete, avoiding
 * git conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchFinance2Components: Record<
  string,
  ComponentType<{ tool: ToolDefinition }>
> = {
  "fire-calculator": FireCalculator,
  "mortgage-comparison": MortgageComparison,
  "loan-payoff-simulator": LoanPayoffSimulator,
  "freelancer-tax-estimator": FreelancerTaxEstimator,
  "currency-margin-calculator": CurrencyMarginCalculator,
  "invoice-due-date-tracker": InvoiceDueDateTracker,
  "subscription-cost-tracker": SubscriptionCostTracker,
};
