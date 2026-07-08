import type { ComponentType } from "react";
import type { ToolDefinition } from "@/data/tools";
import { YamlFormatter } from "./developer/yaml-formatter";
import { CsvToExcel } from "./developer/csv-to-excel";
import { ExcelToCsv } from "./developer/excel-to-csv";
import { PasswordProtectPdf } from "./pdf/password-protect-pdf";

/**
 * Batch dev/misc registry — 4 tools (Task 5-dev-misc-tools).
 *
 * - yaml-formatter      (developer, js-yaml)
 * - csv-to-excel        (developer, xlsx / SheetJS)
 * - excel-to-csv        (developer, xlsx / SheetJS)
 * - password-protect-pdf (pdf, @cantoo/pdf-lib)
 *
 * Centralised in its own file so the main agent can import and merge
 * this map into `tool-router.tsx` after all parallel batches complete,
 * avoiding git conflicts from concurrent edits to that file.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
export const batchDevMiscComponents: Record<
  string,
  ComponentType<{ tool: ToolDefinition }>
> = {
  "yaml-formatter": YamlFormatter,
  "csv-to-excel": CsvToExcel,
  "excel-to-csv": ExcelToCsv,
  "password-protect-pdf": PasswordProtectPdf,
};
