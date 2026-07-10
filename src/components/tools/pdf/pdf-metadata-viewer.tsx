"use client";

import * as React from "react";
import { PDFDocument } from "pdf-lib";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip, formatBytes } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw, FileText } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  formatPdfDate,
  isPdfFile,
  LARGE_PDF_WARN_BYTES,
  loadPdfDocument,
  MAX_PDF_BYTES,
  readPdfVersion,
  readFileAsArrayBuffer,
} from "./_pdf-helpers";

interface MetaRow {
  label: string;
  value: string;
}

interface Metadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: Date | null;
  modificationDate: Date | null;
  pageCount: number;
  pdfVersion: string;
  pageSize: string;
  isEncrypted: boolean;
  isLinearized: boolean;
}

function firstNonEmpty(...values: (string | null | undefined)[]): string {
  for (const v of values) {
    if (v !== null && v !== undefined && String(v).trim() !== "") return String(v);
  }
  return "—";
}

export function PdfMetadataViewer({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [meta, setMeta] = React.useState<Metadata | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
      toast.warning(`"${f.name}" is ${formatBytes(f.size)}. Large PDFs may take a while to read.`);
    }
    setFile(f);
    setMeta(null);
    setError(null);
    setBusy(true);
    try {
      const buf = await readFileAsArrayBuffer(f);
      const version = readPdfVersion(buf);
      const doc = await loadPdfDocument(buf, { PDFDocument });
      const pages = doc.getPages();
      let pageSize = "—";
      if (pages.length > 0) {
        const p = pages[0];
        const w = p.getWidth();
        const h = p.getHeight();
        const orient = w > h ? "landscape" : "portrait";
        pageSize = `${w.toFixed(0)} × ${h.toFixed(0)}pt (${orient})`;
      }

      // Probe encryption flag by scanning the trailer (near end of file)
      // for the "/Encrypt" entry. pdf-lib's `ignoreEncryption: true` lets
      // us open PDFs that carry the flag without a user password.
      let isEncrypted = false;
      try {
        const tailSize = Math.min(buf.byteLength, 64 * 1024);
        const tailBytes = new Uint8Array(buf.slice(buf.byteLength - tailSize));
        const tail = new TextDecoder("latin1").decode(tailBytes);
        isEncrypted = /\/Encrypt\b/.test(tail);
      } catch {
        isEncrypted = false;
      }

      // Linearised PDFs carry a "/Linearized" entry in the first dict.
      let isLinearized = false;
      try {
        const header = new TextDecoder("ascii").decode(new Uint8Array(buf.slice(0, 4096)));
        isLinearized = /\/Linearized\b/.test(header);
      } catch {
        isLinearized = false;
      }

      const keywordsRaw = doc.getKeywords();
      setMeta({
        title: firstNonEmpty(doc.getTitle()),
        author: firstNonEmpty(doc.getAuthor()),
        subject: firstNonEmpty(doc.getSubject()),
        keywords: keywordsRaw ? keywordsRaw : "—",
        creator: firstNonEmpty(doc.getCreator()),
        producer: firstNonEmpty(doc.getProducer()),
        creationDate: doc.getCreationDate() ?? null,
        modificationDate: doc.getModificationDate() ?? null,
        pageCount: doc.getPageCount(),
        pdfVersion: version,
        pageSize,
        isEncrypted,
        isLinearized,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not read this PDF.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setMeta(null);
    setError(null);
  };

  const rows: MetaRow[] = meta
    ? [
        { label: "Title", value: meta.title },
        { label: "Author", value: meta.author },
        { label: "Subject", value: meta.subject },
        { label: "Keywords", value: meta.keywords },
        { label: "Creator", value: meta.creator },
        { label: "Producer", value: meta.producer },
        { label: "Creation date", value: formatPdfDate(meta.creationDate) },
        { label: "Modification date", value: formatPdfDate(meta.modificationDate) },
        { label: "Page count", value: String(meta.pageCount) },
        { label: "Page size", value: meta.pageSize },
        { label: "PDF version", value: meta.pdfVersion },
        {
          label: "Encrypted",
          value: meta.isEncrypted ? "Yes" : "No",
        },
        {
          label: "Linearized (fast web view)",
          value: meta.isLinearized ? "Yes" : "No",
        },
        {
          label: "File size",
          value: file ? formatBytes(file.size) : "—",
        },
      ]
    : [];

  const copySummary = (): string => {
    if (!meta || !file) return "";
    const lines = rows.map((r) => `${r.label}: ${r.value}`);
    lines.unshift(`File: ${file.name}`);
    return lines.join("\n");
  };

  const content: ToolContent = {
    intro:
      "Load any PDF to inspect its built-in metadata — title, author, subject, keywords, creator, producer, creation and modification dates, page count, page size, PDF version, encryption flag, linearisation flag and file size. Everything is read locally in your browser; nothing is uploaded.",
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

            {busy && (
              <p className="text-sm text-muted-foreground">Reading metadata…</p>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {meta && (
              <>
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <tbody className="divide-y">
                      {rows.map((row) => (
                        <tr key={row.label} className="align-top">
                          <th
                            scope="row"
                            className="w-1/3 bg-muted/40 px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                          >
                            {row.label}
                          </th>
                          <td className="px-3 py-2 break-words">
                            {row.value === "—" ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              row.value
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const summary = copySummary();
                      if (!summary) {
                        toast.error("Nothing to copy yet.");
                        return;
                      }
                      navigator.clipboard
                        .writeText(summary)
                        .then(() => toast.success("Metadata copied to clipboard"))
                        .catch(() => toast.error("Copy failed — please copy manually."));
                    }}
                  >
                    <FileText className="mr-1.5 h-4 w-4" /> Copy metadata as text
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Upload a PDF",
        description:
          "Drag and drop a PDF onto the dropzone. The file is read into browser memory only — never uploaded.",
      },
      {
        title: "Inspect the metadata",
        description:
          "The tool reads title, author, subject, keywords, creator, producer, creation/modification dates, page count, page size, PDF version, encryption flag and linearisation flag — all from the PDF's own trailer and info dictionary.",
      },
      {
        title: "Copy if needed",
        description:
          "Use the Copy metadata as text button to grab a plain-text summary for pasting into a bug report, asset register or record-keeping system.",
      },
    ],
    useCases: [
      "Verify the title and author fields of a PDF before publishing it.",
      "Check whether a PDF is encrypted or linearised (optimised for fast web viewing).",
      "Audit the producer/creator strings to learn which tool exported a PDF.",
      "Inspect the page size of a PDF to confirm it matches your printer's paper.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Metadata fields not embedded in the source PDF are shown as “—”.</li>
        <li>XMP metadata packets are not parsed separately — only the legacy Info dictionary is read.</li>
        <li>Encrypted PDFs may report encryption status as “No” if the producer set the flag incorrectly; open the file in a PDF viewer to be sure.</li>
        <li>The tool does not edit or strip metadata. To remove it, re-export the PDF in your editor with metadata cleared.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my PDF uploaded somewhere?",
        a: "No. The PDF is read into browser memory only and inspected with the pdf-lib library. Nothing is transmitted to Dueneo or any third party.",
      },
      {
        q: "Why are some fields blank?",
        a: "Those fields were never set by whatever tool created the PDF. Many simple PDF exporters omit the title, author, subject and keywords fields entirely.",
      },
      {
        q: "Can I remove or edit the metadata?",
        a: "This viewer is read-only. To clear metadata, re-export the PDF in your editor with the metadata fields blank, or use a dedicated metadata-stripping tool.",
      },
      {
        q: "What does linearised mean?",
        a: "A linearised PDF (also called “fast web view”) is rearranged so the first page can be displayed before the whole file has downloaded. Useful for web-hosted PDFs; the flag is reported in the file header.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
