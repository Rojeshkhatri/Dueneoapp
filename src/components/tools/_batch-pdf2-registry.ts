import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { RotatePdf } from "./pdf/rotate-pdf";
import { DeletePdfPages } from "./pdf/delete-pdf-pages";
import { ExtractPdfPages } from "./pdf/extract-pdf-pages";
import { RearrangePdfPages } from "./pdf/rearrange-pdf-pages";
import { WatermarkPdf } from "./pdf/watermark-pdf";
import { PdfCompress } from "./pdf/pdf-compress";

/**
 * Batch PDF-2 registry — 6 advanced PDF tools (Task 5-pdf-tools).
 *
 * Centralised in its own file so the main agent can import and merge
 * this map into `tool-router.tsx` after all parallel batches complete,
 * avoiding git conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchPdf2Components: Record<
  string,
  ComponentType<{ tool: ToolDefinition }>
> = {
  "rotate-pdf": RotatePdf,
  "delete-pdf-pages": DeletePdfPages,
  "extract-pdf-pages": ExtractPdfPages,
  "rearrange-pdf-pages": RearrangePdfPages,
  "watermark-pdf": WatermarkPdf,
  "pdf-compress": PdfCompress,
};
