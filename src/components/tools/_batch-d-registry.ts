import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { AgeCalculator } from "./utility/age-calculator";
import { BMICalculator } from "./utility/bmi-calculator";
import { TipCalculator } from "./finance/tip-calculator";
import { DateDifferenceCalculator } from "./utility/date-difference-calculator";
import { TimeZoneConverter } from "./utility/time-zone-converter";
import { CountdownTimer } from "./utility/countdown-timer";
import { PomodoroTimer } from "./utility/pomodoro-timer";
import { GPACalculator } from "./utility/gpa-calculator";
import { RetirementCalculator } from "./finance/retirement-calculator";
import { InflationCalculator } from "./finance/inflation-calculator";

/**
 * Batch D registry — 10 calculator tools (Task 2-d-viral).
 *
 * Centralised in its own file so the main agent can import and merge this
 * map into `tool-router.tsx` after all parallel batches complete, avoiding
 * git conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 *
 * Tools: age, BMI, tip, date-difference, time-zone, countdown, pomodoro,
 * GPA, retirement, inflation.
 */
export const batchDComponents: Record<string, ComponentType<{ tool: ToolDefinition }>> = {
  "age-calculator": AgeCalculator,
  "bmi-calculator": BMICalculator,
  "tip-calculator": TipCalculator,
  "date-difference-calculator": DateDifferenceCalculator,
  "time-zone-converter": TimeZoneConverter,
  "countdown-timer": CountdownTimer,
  "pomodoro-timer": PomodoroTimer,
  "gpa-calculator": GPACalculator,
  "retirement-calculator": RetirementCalculator,
  "inflation-calculator": InflationCalculator,
};
