import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { CitationFormatter } from "./education/citation-formatter";
import { FlashcardGenerator } from "./education/flashcard-generator";
import { QuizRandomizer } from "./education/quiz-randomizer";
import { StudyPlanner } from "./education/study-planner";
import { AssignmentCountdown } from "./education/assignment-countdown";
import { FormulaSheetCreator } from "./education/formula-sheet-creator";
import { GradePredictor } from "./education/grade-predictor";
import { AttendanceCalculator } from "./education/attendance-calculator";
import { ExamTimer } from "./education/exam-timer";

/**
 * Education batch registry — 9 tools (IDs 216–224, Task 3-edu-real).
 *
 * Centralised in its own file so the main agent can import and merge
 * this map into `tool-router.tsx` without git conflicts from concurrent
 * edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchEducationComponents: Record<string, ComponentType<{ tool: ToolDefinition }>> = {
  "citation-formatter": CitationFormatter,
  "flashcard-generator": FlashcardGenerator,
  "quiz-randomizer": QuizRandomizer,
  "study-planner": StudyPlanner,
  "assignment-countdown": AssignmentCountdown,
  "formula-sheet-creator": FormulaSheetCreator,
  "grade-predictor": GradePredictor,
  "attendance-calculator": AttendanceCalculator,
  "exam-timer": ExamTimer,
};
