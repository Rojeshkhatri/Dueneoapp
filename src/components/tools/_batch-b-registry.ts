import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { BackgroundRemover } from "./image/background-remover";
import { ImageColorExtractor } from "./image/image-color-extractor";
import { MemeGenerator } from "./image/meme-generator";
import { PassportPhotoMaker } from "./image/passport-photo-maker";
import { ImageToAscii } from "./image/image-to-ascii";
import { PhotoCollageMaker } from "./image/photo-collage-maker";

/**
 * Batch B registry — 6 AI / image tools (Task 2-b-viral).
 *
 * Centralised in its own file so the main agent can import and merge this
 * map into `tool-router.tsx` after all parallel batches complete, avoiding
 * git conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchBComponents: Record<string, ComponentType<{ tool: ToolDefinition }>> = {
  "background-remover": BackgroundRemover,
  "image-color-extractor": ImageColorExtractor,
  "meme-generator": MemeGenerator,
  "passport-photo-maker": PassportPhotoMaker,
  "image-to-ascii": ImageToAscii,
  "photo-collage-maker": PhotoCollageMaker,
};
