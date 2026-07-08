import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { FancyTextGenerator } from "./text/fancy-text-generator";
import { StrikethroughText } from "./text/strikethrough-text";
import { SmallCapsGenerator } from "./text/small-caps-generator";
import { ZalgoTextGenerator } from "./text/zalgo-text-generator";
import { CursiveTextGenerator } from "./text/cursive-text-generator";
import { BinaryTranslator } from "./text/binary-translator";
import { MorseCodeTranslator } from "./text/morse-code-translator";
import { DiscordTimestampGenerator } from "./text/discord-timestamp-generator";
import { WordleSolver } from "./text/wordle-solver";

/**
 * Batch C registry — 9 Unicode / text generator tools (Task 2-c-viral).
 *
 * Centralised in its own file so the main agent can import and merge this
 * map into `tool-router.tsx` after all parallel batches complete, avoiding
 * git conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchCComponents: Record<string, ComponentType<{ tool: ToolDefinition }>> = {
  "fancy-text-generator": FancyTextGenerator,
  "strikethrough-text": StrikethroughText,
  "small-caps-generator": SmallCapsGenerator,
  "zalgo-text-generator": ZalgoTextGenerator,
  "cursive-text-generator": CursiveTextGenerator,
  "binary-translator": BinaryTranslator,
  "morse-code-translator": MorseCodeTranslator,
  "discord-timestamp-generator": DiscordTimestampGenerator,
  "wordle-solver": WordleSolver,
};
