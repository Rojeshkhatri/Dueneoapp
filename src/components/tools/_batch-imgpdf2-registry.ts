import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { HeicToJpg } from "./image/heic-to-jpg";
import { PdfToJpg } from "./pdf/pdf-to-jpg";

/**
 * Batch image/PDF-2 registry — 2 conversion tools (Task 5-image-pdf-tools).
 *
 * - HEIC to JPG  (image category)
 * - PDF to JPG   (pdf category)
 *
 * Both tools are heavy library users (heic2any and pdfjs-dist), so they are
 * dynamically imported from inside the component bodies — the libraries never
 * ship in the initial bundle.
 *
 * Centralised in its own file so the main agent can import and merge this map
 * into `tool-router.tsx` after all parallel batches complete, avoiding git
 * conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchImgPdf2Components: Record<
  string,
  ComponentType<{ tool: ToolDefinition }>
> = {
  "heic-to-jpg": HeicToJpg,
  "pdf-to-jpg": PdfToJpg,
};
