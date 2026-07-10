"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PDFDocument } from "pdf-lib";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip, formatBytes } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, GripVertical, RotateCcw, Shuffle, Undo2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  derivedPdfName,
  downloadObjectUrl,
  isPdfFile,
  LARGE_PDF_WARN_BYTES,
  loadPdfDocument,
  MAX_PDF_BYTES,
  readFileAsArrayBuffer,
  replaceObjectUrl,
} from "./_pdf-helpers";

interface PageCardProps {
  id: number;
  num: number;
  newIndex: number;
  total: number;
}

function PageCard({ id, num, newIndex, total }: PageCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex aspect-[3/4] flex-col items-center justify-center rounded-lg border bg-card p-2 text-center transition-shadow ${
        isDragging ? "border-primary shadow-lg ring-2 ring-primary/30" : "hover:border-primary/40"
      }`}
      {...attributes}
      {...listeners}
    >
      <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground">
        {newIndex + 1}
      </span>
      <GripVertical className="absolute right-1 top-1 h-3.5 w-3.5 text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="text-lg font-bold">{num}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        page {num}
      </span>
      <span className="mt-0.5 text-[10px] text-muted-foreground">
        {newIndex + 1} / {total}
      </span>
    </div>
  );
}

export function RearrangePdfPages({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [pageCount, setPageCount] = React.useState<number>(0);
  // `order` is the list of original page numbers in the new order.
  // e.g. [3, 1, 2] means: page 3 first, then page 1, then page 2.
  const [order, setOrder] = React.useState<number[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputSize, setOutputSize] = React.useState<number>(0);
  const [outputName, setOutputName] = React.useState<string>("rearranged.pdf");

  React.useEffect(() => {
    return () => {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [outputUrl]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
    try {
      const buf = await readFileAsArrayBuffer(f);
      const doc = await loadPdfDocument(buf, { PDFDocument });
      const count = doc.getPageCount();
      setPageCount(count);
      setOrder(Array.from({ length: count }, (_, i) => i + 1));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read this PDF.");
      setFile(null);
      setPageCount(0);
      setOrder([]);
    }
  };

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setOrder([]);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputSize(0);
  };

  const resetOrder = () => {
    setOrder(Array.from({ length: pageCount }, (_, i) => i + 1));
    toast.info("Page order reset to the original sequence.");
  };

  const shuffle = () => {
    setOrder((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(Number(active.id));
      const newIndex = prev.indexOf(Number(over.id));
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const doRearrange = async () => {
    if (!file) {
      toast.error("Please upload a PDF first.");
      return;
    }
    if (pageCount === 0 || order.length === 0) {
      toast.error("The PDF has no pages.");
      return;
    }
    setBusy(true);
    try {
      const buf = await readFileAsArrayBuffer(file);
      const src = await loadPdfDocument(buf, { PDFDocument });
      if (src.getPageCount() !== pageCount) {
        throw new Error(
          "The PDF changed between upload and rearrange. Please reload the file and try again."
        );
      }

      // Build a new PDF with pages copied in the new order. Using a fresh
      // document + copyPages is more reliable than in-place removePage +
      // insertPage, which can corrupt internal references in some PDFs.
      const out = await PDFDocument.create();
      const indices = order.map((n) => n - 1);
      const copied = await out.copyPages(src, indices);
      for (const p of copied) out.addPage(p);

      const bytes = await out.save();
      const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
      setOutputUrl((prev) => replaceObjectUrl(prev, blob));
      setOutputSize(blob.size);
      setOutputName(derivedPdfName(file.name, "rearranged"));
      toast.success(`Rearranged ${order.length} pages (${formatBytes(blob.size)}).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rearrange failed.");
    } finally {
      setBusy(false);
    }
  };

  // Check if the order is the original (1, 2, 3, ...).
  const isOriginalOrder = order.every((n, i) => n === i + 1);

  const content: ToolContent = {
    intro:
      "Drag pages into a new order and rebuild the PDF — entirely in your browser. Each page is shown as a numbered card you can grab and drop anywhere in the grid. Perfect for fixing mis-ordered scans or reorganising chapters. Your file never leaves your device.",
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
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetOrder}
                  disabled={isOriginalOrder}
                >
                  <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Reset order
                </Button>
                <Button variant="ghost" size="sm" onClick={shuffle} disabled={pageCount < 2}>
                  <Shuffle className="mr-1.5 h-3.5 w-3.5" /> Shuffle
                </Button>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> New file
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {pageCount} page{pageCount === 1 ? "" : "s"} · drag any card to reorder
              </span>
              <span>
                {isOriginalOrder ? (
                  "Original order"
                ) : (
                  <span className="font-medium text-foreground">Modified — ready to rebuild</span>
                )}
              </span>
            </div>

            {pageCount > 0 && (
              <div className="max-h-[28rem] overflow-y-auto rounded-md border bg-background p-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext items={order} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
                      {order.map((pageNum, idx) => (
                        <PageCard
                          key={pageNum}
                          id={pageNum}
                          num={pageNum}
                          newIndex={idx}
                          total={order.length}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              The small badge in the top-left of each card is the new position; the big number is
              the original page. Use Shuffle for a random order, or Reset order to restore the
              original sequence.
            </p>

            <Button
              onClick={doRearrange}
              disabled={busy || pageCount === 0 || isOriginalOrder}
              className="w-full sm:w-auto"
            >
              <Download className="mr-1.5 h-4 w-4" />
              {busy ? "Rebuilding…" : "Rebuild PDF in new order"}
            </Button>

            {outputUrl && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{outputName}</p>
                    <p className="text-xs text-muted-foreground">
                      {pageCount} page{pageCount === 1 ? "" : "s"} in new order ·{" "}
                      {formatBytes(outputSize)}
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
                    Download rearranged PDF
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
          "Drag and drop a PDF onto the dropzone. Every page is rendered as a numbered card in a grid — the big number is the original page number, the small badge is the new position.",
      },
      {
        title: "Drag to reorder",
        description:
          "Click and drag any card to a new slot in the grid. Use Shuffle for a random order, or Reset order to restore the original sequence.",
      },
      {
        title: "Rebuild and download",
        description:
          "Click Rebuild PDF — pdf-lib creates a fresh document by copying pages from the source in the new order. Download the result; your file never leaves your device.",
      },
    ],
    useCases: [
      "Fix a scan where the pages came out of the sheet feeder in the wrong order.",
      "Move a cover page or appendix to a different position in a report.",
      "Reorganise a slide deck PDF so the agenda comes first and the appendix comes last.",
      "Shuffle a question-bank PDF into a randomised exam paper.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
      <li>
          The cards show page numbers, not actual page previews — rendering true thumbnails for a
          large PDF would require pdf.js and significantly more memory.
        </li>
        <li>
          The rebuilt PDF is a fresh document — bookmarks, named destinations, form fields and some
          annotations from the source pages are not always carried over by pdf-lib&apos;s copyPages.
        </li>
        <li>Encrypted or password-protected PDFs cannot be rearranged — remove the password first.</li>
        <li>
          Drag-and-drop works on touch devices but requires a slightly longer press (120 ms) to
          distinguish from a scroll gesture.
        </li>
        <li>Very large PDFs (&gt;100 MB) may take several seconds to rebuild and use significant memory.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why are the cards just numbers and not thumbnails?",
        a: "Rendering true page thumbnails needs pdf.js (a separate ~300 KB library) and a canvas paint per page, which gets slow and memory-heavy for big PDFs. The number cards give you the same reordering power at a fraction of the cost. If you need thumbnails, open the rebuilt PDF in your viewer.",
      },
      {
        q: "Is my PDF uploaded somewhere?",
        a: "No. The PDF is read into browser memory only and processed with the pdf-lib library. Reordering happens locally; the file never leaves your device.",
      },
      {
        q: "What's the difference between this and the Rotate/Delete/Extract tools?",
        a: "Rearrange changes the ORDER of all pages without removing or rotating any of them. Delete removes specific pages. Extract pulls specific pages into a new PDF. Rotate changes the orientation of selected pages.",
      },
      {
        q: "Can I duplicate a page so it appears twice?",
        a: "Not directly — drag-and-drop moves cards, it doesn't clone them. To duplicate, list the page number twice in the Extract tool with a range that repeats (e.g. “5, 5”), or run Extract twice and merge the results.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
