import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { WheelSpinner } from "./utility/wheel-spinner";
import { YesNoWheel } from "./utility/yes-no-wheel";
import { NamePicker } from "./utility/name-picker";
import { RandomNumberGenerator } from "./utility/random-number-generator";
import { DiceRoller } from "./utility/dice-roller";
import { CoinFlipper } from "./utility/coin-flipper";
import { RandomLetterGenerator } from "./utility/random-letter-generator";
import { TeamGenerator } from "./utility/team-generator";

/**
 * Batch A registry — 8 random / picker tools (Task 2-a-viral).
 *
 * Centralised in its own file so that the main agent can import and merge
 * this map into `tool-router.tsx` after all parallel batches complete,
 * avoiding git conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchAComponents: Record<string, ComponentType<{ tool: ToolDefinition }>> = {
  "wheel-spinner": WheelSpinner,
  "yes-no-wheel": YesNoWheel,
  "name-picker": NamePicker,
  "random-number-generator": RandomNumberGenerator,
  "dice-roller": DiceRoller,
  "coin-flipper": CoinFlipper,
  "random-letter-generator": RandomLetterGenerator,
  "team-generator": TeamGenerator,
};
