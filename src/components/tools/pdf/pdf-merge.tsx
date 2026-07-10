"use client";

import * as React from "react";
import { PDFDocument } from "pdf-lib";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, type DropzoneFile, formatBytes } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Download, FilePlus2, RotateCcw, X } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  isPdfFile,
  LARGE_PDF_WARN_BYTES,
  loadPdfDocument,
  MAX_PDF_BYTES,
  readFileAsArrayBuffer,
} from "./_pdf-helpers";

interface MergeItem {
  id: string;
  file: File;
  pageCount: number | null;
  status: "pending" | "ok" | "error";
}

export function PdfMerge({ tool }: { tool: ToolDefinition }) {
  const [items, setItems] = React.useState<MergeItem[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputSize, setOutputSize] = React.useState<number>(0);
  const [outputName, setOutputName] = React.useState<string>("merged.pdf");
  const idCounter = React.useRef(0);

  // Revoke object URL on cleanup / replace.
  React.useEffect(() => {
    return () => {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [outputUrl]);

  const handleFiles = async (incoming: DropzoneFile[]) => {
    const pdfs = incoming.filter((d) => {
      if (!isPdfFile(d.file)) {
        toast.error(`"${d.file.name}" is not a PDF. Skipped.`);
        return false;
      }
      if (d.file.size > MAX_PDF_BYTES) {
        toast.error(`"${d.file.name}" is larger than ${formatBytes(MAX_PDF_BYTES)}. Skipped.`);
        return false;
      }
      if (d.file.size > LARGE_PDF_WARN_BYTES) {
        toast.warning(
          `"${d.file.name}" is ${formatBytes(d.file.size)}. Large files may take a while to merge.`
        );
      }
      return true;
    });
    if (pdfs.length === 0) return;

    const newItems: MergeItem[] = pdfs.map((d) => ({
      id: `pdf-${++idCounter.current}-${d.id}`,
      file: d.file,
      pageCount: null,
      status: "pending",
    }));
    setItems((prev) => [...prev, ...newItems]);

    // Read page counts in the background.
    for (const item of newItems) {
      try {
        const buf = await readFileAsArrayBuffer(item.file);
        const doc = await loadPdfDocument(buf, { PDFDocument });
        const count = doc.getPageCount();
        setItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, pageCount: count, status: "ok" } : p))
        );
      } catch {
        setItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: "error" } : p))
        );
      }
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  const moveItem = (id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const reset = () => {
    setItems([]);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputSize(0);
  };

  const doMerge = async () => {
    const okItems = items.filter((p) => p.status !== "error");
    if (okItems.length < 2) {
      toast.error("Add at least two PDF files to merge.");
      return;
    }
    setBusy(true);
    try {
      const merged = await PDFDocument.create();
      for (const item of okItems) {
        const buf = await readFileAsArrayBuffer(item.file);
        const src = await loadPdfDocument(buf, { PDFDocument });
        const pages = await merged.copyPages(src, src.getPageIndices());
        for (const p of pages) merged.addPage(p);
      }
      const bytes = await merged.save();
      const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(URL.createObjectURL(blob));
      setOutputSize(blob.size);
      const base = okItems[0].file.name.replace(/\.pdf$/i, "");
      setOutputName(`${base}-merged.pdf`);
      toast.success(`Merged ${okItems.length} PDFs into ${formatBytes(blob.size)}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Merge failed.");
    } finally {
      setBusy(false);
    }
  };

  const totalPages = items
    .filter((p) => p.status === "ok")
    .reduce((sum, p) => sum + (p.pageCount ?? 0), 0);
  const totalBytes = items.reduce((sum, p) => sum + p.file.size, 0);

  const content: ToolContent = {
    intro:
      "Combine multiple PDF files into a single document — entirely in your browser. Drag and drop your PDFs, reorder them with the arrow buttons, and download the merged result. Your files never leave your device.",
    tool: (
      <div className="space-y-5">
        <Dropzone
          accept="application/pdf,.pdf"
          multiple
          onFiles={handleFiles}
          hint="PDF files only · up to 100 MB each"
          maxSizeLabel="100 MB recommended"
          label="Drop PDFs here or click to browse"
        />

        {items.length > 0 && (
          <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span className="font-medium">{items.length}</span>{" "}
                file{items.length === 1 ? "" : "s"} ·{" "}
                <span className="text-muted-foreground">
                  {totalPages > 0 ? `${totalPages} pages · ` : ""}
                  {formatBytes(totalBytes)}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>

            <ol className="space-y-2">
              {items.map((item, idx) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border bg-background p-3"
                >
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(item.file.size)}
                      {item.pageCount !== null && ` · ${item.pageCount} pages`}
                      {item.status === "error" && (
                        <span className="text-destructive"> · could not read</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-none items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Move up"
                      disabled={idx === 0}
                      onClick={() => moveItem(item.id, -1)}
                      className="h-8 w-8"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Move down"
                      disabled={idx === items.length - 1}
                      onClick={() => moveItem(item.id, 1)}
                      className="h-8 w-8"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() => removeItem(item.id)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>

            <Button
              onClick={doMerge}
              disabled={busy || items.filter((p) => p.status !== "error").length < 2}
              className="w-full sm:w-auto"
            >
              <FilePlus2 className="mr-1.5 h-4 w-4" />
              {busy ? "Merging…" : `Merge ${items.length} PDFs`}
            </Button>

            {outputUrl && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{outputName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(outputSize)} · ready to download
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      if (!downloadBlobUrl(outputUrl, outputName)) {
                        toast.error("Nothing to download yet.");
                      }
                    }}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Download merged PDF
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
        title: "Add your PDFs",
        description:
          "Drag and drop one or more PDF files onto the dropzone, or click to browse. You can add files in batches — they will all be queued.",
      },
      {
        title: "Reorder the pages",
        description:
          "Use the up and down arrows next to each file to set the order in which they will appear in the merged document. Remove any file with the × button.",
      },
      {
        title: "Merge",
        description:
          "Click the Merge button. pdf-lib reads each file in your browser memory, copies every page into a new combined document, and writes the result as a fresh PDF.",
      },
      {
        title: "Download",
        description:
          "Click the download button to save the merged PDF. The original files are never uploaded — everything happens locally.",
      },
    ],
    useCases: [
      "Combine scanned receipts and invoices into a single expense report.",
      "Merge a cover letter, résumé and portfolio into one application PDF.",
      "Join chapter PDFs into a complete e-book or report.",
      "Concatenate multiple contract sections signed by different parties.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Files larger than 100 MB may take several seconds to process and use significant memory.</li>
        <li>Encrypted or password-protected PDFs cannot be merged — remove the password first.</li>
        <li>Interactive form fields, annotations and bookmarks from the source files are not preserved in the merged output.</li>
        <li>The output file name is derived from the first file in the list; rename it after download if needed.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is there a limit on the number of PDFs I can merge?",
        a: "There is no hard limit, but merging dozens of large PDFs in one tab can exhaust browser memory. For very large batches, merge in groups of 10–20 files at a time.",
      },
      {
        q: "Are my PDFs uploaded to a server?",
        a: "No. Your files are loaded into your browser memory only and processed with the pdf-lib library. They never leave your device.",
      },
      {
        q: "Can I merge only specific pages from each PDF?",
        a: "This tool merges every page of every file. Use the PDF Split tool to extract the pages you want first, then merge those results here.",
      },
      {
        q: "Why does my merged PDF lose its bookmarks?",
        a: "pdf-lib does not currently preserve outline/bookmark trees when copying pages. You can rebuild them in a PDF editor after downloading.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

/** Trigger a download of an existing object URL, then revoke it. */
function downloadBlobUrl(url: string, filename: string): boolean {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  requestAnimationFrame(() => {
    a.click();
    setTimeout(() => a.remove(), 100);
  });
  return true;
}
