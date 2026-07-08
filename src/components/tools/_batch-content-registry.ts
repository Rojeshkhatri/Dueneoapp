import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { PodcastChapterGenerator } from "./content/podcast-chapter-generator";
import { YoutubeTimestampFormatter } from "./content/youtube-timestamp-formatter";
import { SubtitleTimingEditor } from "./content/subtitle-timing-editor";
import { TranscriptCleaner } from "./content/transcript-cleaner";
import { ThumbnailAbComparer } from "./content/thumbnail-ab-comparer";
import { VideoTitleScorer } from "./content/video-title-scorer";
import { HookAnalyzer } from "./content/hook-analyzer";
import { ScriptFormatter } from "./content/script-formatter";
import { CaptionLineBreaker } from "./content/caption-line-breaker";

/**
 * Batch content-creator registry — 9 tools (Task 3-content, IDs 190-198).
 *
 * Centralised in its own file so the main agent can import and merge this map
 * into `tool-router.tsx` after all parallel batches complete, avoiding git
 * conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchContentComponents: Record<
  string,
  ComponentType<{ tool: ToolDefinition }>
> = {
  "podcast-chapter-generator": PodcastChapterGenerator,
  "youtube-timestamp-formatter": YoutubeTimestampFormatter,
  "subtitle-timing-editor": SubtitleTimingEditor,
  "transcript-cleaner": TranscriptCleaner,
  "thumbnail-ab-comparer": ThumbnailAbComparer,
  "video-title-scorer": VideoTitleScorer,
  "hook-analyzer": HookAnalyzer,
  "script-formatter": ScriptFormatter,
  "caption-line-breaker": CaptionLineBreaker,
};
