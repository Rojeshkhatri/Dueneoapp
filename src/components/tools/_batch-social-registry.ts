import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { InstagramGridPlanner } from "./social/instagram-grid-planner";
import { YoutubeThumbnailTester } from "./social/youtube-thumbnail-tester";
import { TiktokCaptionFormatter } from "./social/tiktok-caption-formatter";
import { LinkedinCarouselCreator } from "./social/linkedin-carousel-creator";
import { TwitterThreadFormatter } from "./social/twitter-thread-formatter";
import { HashtagAnalyzer } from "./social/hashtag-analyzer";
import { BioLinkPreview } from "./social/bio-link-preview";
import { ReelCoverGenerator } from "./social/reel-cover-generator";
import { PostSchedulingCalculator } from "./social/post-scheduling-calculator";

/**
 * Batch social-media registry — 9 social media tools (Task 3-social,
 * IDs 165-173).
 *
 * Centralised in its own file so the main agent can import and merge this map
 * into `tool-router.tsx` after all parallel batches complete, avoiding git
 * conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchSocialComponents: Record<
  string,
  ComponentType<{ tool: ToolDefinition }>
> = {
  "instagram-grid-planner": InstagramGridPlanner,
  "youtube-thumbnail-tester": YoutubeThumbnailTester,
  "tiktok-caption-formatter": TiktokCaptionFormatter,
  "linkedin-carousel-creator": LinkedinCarouselCreator,
  "twitter-thread-formatter": TwitterThreadFormatter,
  "hashtag-analyzer": HashtagAnalyzer,
  "bio-link-preview": BioLinkPreview,
  "reel-cover-generator": ReelCoverGenerator,
  "post-scheduling-calculator": PostSchedulingCalculator,
};
