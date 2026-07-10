"use client";

import * as React from "react";
import { PDFDocument } from "pdf-lib";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip, formatBytes } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Trash2, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  derivedPdfName,
  downloadObjectUrl,
  isPdfFile,
  LARGE_PDF_WARN_BYTES,
  loadPdfDocument,
  MAX_PDF_BYTES,
  parsePageRanges,
  readFileAsArrayBuffer,
  replaceObjectUrl,
} from "./_pdf-helpers";

export function DeletePdfPages({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [pageCount, setPageCount] = React.useState<number>(0);
  const [spec, setSpec] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputSize, setOutputSize] = React.useState<number>(0);
  const [outputName, setOutputName] = React.useState<string>("trimmed.pdf");
  const [deletedCount, setDeletedCount] = React.useState<number>(0);

  React.useEffect(() => {
    return () => {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [outputUrl]);

  const onFiles = async (incoming: { file: File }[]) => {
    const f = incoming[0]?.file;
    if (!f) return;
    if (!isPdfFile(f)) {
      toast.error("Please choose a PDF file.");
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      toast.error(`"${f.name}" is larger than ${formatBytes(MAX_PDF_BYTES)}.`);
      return;
    }
    if (f.size > LARGE_PDF_WARN_BYTES) {
      toast.warning(`"${f.name}" is ${formatBytes(f.size)}. Large PDFs may take a while to process.`);
    }
    setFile(f);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputSize(0);
    setDeletedCount(0);
    try {
      const buf = await readFileAsArrayBuffer(f);
      const doc = await loadPdfDocument(buf, { PDFDocument });
      setPageCount(doc.getPageCount());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read this PDF.");
      setFile(null);
      setPageCount(0);
    }
  };

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setSpec("");
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputSize(0);
    setDeletedCount(0);
  };

  // Preview the pages that will be deleted (without running the operation).
  const deletedPreview = React.useMemo(() => {
    if (!spec.trim() || pageCount === 0) return [] as number[];
    try {
      return parsePageRanges(spec, pageCount);
    } catch {
      return [];
    }
  }, [spec, pageCount]);

  const remaining = Math.max(0, pageCount - deletedPreview.length);

  const doDelete = async () => {
    if (!file) {
      toast.error("Please upload a PDF first.");
      return;
    }
    if (pageCount === 0) {
      toast.error("The PDF has no pages.");
      return;
    }
    setBusy(true);
    try {
      const buf = await readFileAsArrayBuffer(file);
      const doc = await loadPdfDocument(buf, { PDFDocument });

      const pagesToDelete = parsePageRanges(spec, doc.getPageCount());
      if (pagesToDelete.length === 0) {
        throw new Error("No pages selected for deletion.");
      }
      if (pagesToDelete.length >= doc.getPageCount()) {
        throw new Error(
          "You can't delete every page — the result would be empty. Keep at least one page."
        );
      }

      // Convert 1-indexed page numbers to 0-indexed and dedupe.
      const indices = Array.from(new Set(pagesToDelete.map((p) => p - 1))).sort((a, b) => b - a);
      for (const idx of indices) {
        doc.removePage(idx);
      }

      const out = await doc.save();
      const blob = new Blob([Uint8Array.from(out)], { type: "application/pdf" });
      setOutputUrl((prev) => replaceObjectUrl(prev, blob));
      setOutputSize(blob.size);
      setOutputName(derivedPdfName(file.name, "trimmed"));
      setDeletedCount(indices.length);
      toast.success(
        `Deleted ${indices.length} page${indices.length === 1 ? "" : "s"} · ${formatBytes(blob.size)}.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deletion failed.");
    } finally {
      setBusy(false);
    }
  };

  // Render a compact preview of all pages with deleted ones marked.
  const previewItems = React.useMemo(() => {
    if (pageCount === 0) return [];
    const deletedSet = new Set(deletedPreview);
    const items: { num: number; deleted: boolean }[] = [];
    for (let i = 1; i <= pageCount; i++) {
      items.push({ num: i, deleted: deletedSet.has(i) });
    }
    return items;
  }, [pageCount, deletedPreview]);

  const content: ToolContent = {
    intro:
      "Remove unwanted pages from a PDF — entirely in your browser. Type which page numbers to delete (e.g. “3, 5, 7-9”), preview the result, then download a clean copy. Perfect for stripping cover sheets, blank pages or sensitive sections without uploading anything.",
    tool: (
      <div className="space-y-5">
        {!file ? (
          <Dropzone
            accept="application/pdf,.pdf"
            onFiles={onFiles}
            hint="PDF file · up to 100 MB recommended"
            maxSizeLabel="100 MB"
            label="Drop a PDF here or click to browse"
          />
        ) : (
          <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FileChip name={file.name} size={file.size} onRemove={reset} />
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {pageCount > 0
                ? `${pageCount} page${pageCount === 1 ? "" : "s"} detected`
                : "Reading page count…"}
            </p>

            {pageCount > 0 && (
              <div className="space-y-2">
                <div className="max-h-44 overflow-y-auto rounded-md border bg-background p-2">
                  <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
                    {previewItems.map((item) => (
                      <span
                        key={item.num}
                        aria-label={`Page ${item.num}${item.deleted ? " (to delete)" : ""}`}
                        className={`flex h-7 items-center justify-center rounded text-[11px] font-medium ${
                          item.deleted
                            ? "bg-destructive/15 text-destructive line-through"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {item.num}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Page numbers shown above. Struck-through pages will be removed.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="del-spec">Pages to delete</Label>
              <Input
                id="del-spec"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                placeholder={`e.g. 1, 3, 5-${Math.max(1, pageCount)}`}
                spellCheck={false}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Pages are 1-indexed. Use commas to list individual pages or hyphens for ranges.
                {" "}
                {deletedPreview.length > 0 && (
                  <span className="font-medium text-foreground">
                    {deletedPreview.length} to delete · {remaining} remaining
                  </span>
                )}
              </p>
            </div>

            <Button
              onClick={doDelete}
              disabled={busy || pageCount === 0 || deletedPreview.length === 0 || remaining === 0}
              className="w-full sm:w-auto"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {busy ? "Deleting…" : "Delete selected pages"}
            </Button>

            {outputUrl && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{outputName}</p>
                    <p className="text-xs text-muted-foreground">
                      {deletedCount} page{deletedCount === 1 ? "" : "s"} deleted ·{" "}
                      {pageCount - deletedCount} remaining · {formatBytes(outputSize)}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      if (!outputUrl) {
                        toast.error("Nothing to download yet.");
                        return;
                      }
                      downloadObjectUrl(outputUrl, outputName);
                    }}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Download trimmed PDF
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Upload a PDF",
        description:
          "Drag and drop a PDF onto the dropzone. The page count is read in the background and shown as a numbered grid so you can plan your deletions.",
      },
      {
        title: "Enter pages to delete",
        description:
          "Type the page numbers you want to remove, like “3, 5, 7-9”. The grid updates live — pages marked with strikethrough will be deleted.",
      },
      {
        title: "Delete and download",
        description:
          "Click Delete selected pages — pdf-lib removes those pages from the in-memory document, starting from the highest index to keep the remaining indices valid. Download the trimmed result; your file never leaves your device.",
      },
    ],
    useCases: [
      "Strip a sensitive cover sheet or signature page before sharing a contract.",
      "Remove blank trailing pages left by a scan-to-PDF workflow.",
      "Cut a 50-page report down to just the executive summary for an email attachment.",
      "Delete mis-scanned pages from a multi-page document and re-export a clean copy.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>You can&apos;t delete every page — the result would be empty. At least one page must remain.</li>
        <li>Encrypted or password-protected PDFs cannot be edited — remove the password first.</li>
        <li>Bookmarks, named destinations and internal links that pointed to deleted pages will break; pdf-lib does not rewrite them automatically.</li>
        <li>Very large PDFs (&gt;100 MB) may take several seconds to process and use significant memory.</li>
      </ul>
    ),
    faq: [
      {
        q: "What happens to bookmarks that point to deleted pages?",
        a: "They remain in the bookmark tree but point to nowhere. pdf-lib does not currently rewrite bookmark targets. If you need clean bookmarks, delete the broken entries in your PDF editor after downloading.",
      },
      {
        q: "Is my PDF uploaded somewhere?",
        a: "No. The PDF is read into browser memory only and edited with the pdf-lib library. The deletion happens locally; the file never leaves your device.",
      },
      {
        q: "Can I undo a deletion?",
        a: "The original file on your device is untouched — only the downloaded copy is changed. If you deleted the wrong pages, just upload the original again and re-run the tool with the correct page list.",
      },
      {
        q: "Why are pages removed from the highest index first?",
        a: "When you remove page 3 of a 10-page PDF, what used to be page 4 is now page 3. Removing pages in descending index order keeps the remaining indices stable during the operation, so the page list you typed maps exactly to the pages you intended.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
