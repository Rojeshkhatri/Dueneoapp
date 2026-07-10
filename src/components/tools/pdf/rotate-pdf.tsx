"use client";

import * as React from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip, formatBytes } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Download, RotateCw, RotateCcw, RotateCw as RotateIcon } from "lucide-react";
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

type Scope = "all" | "range";

const ANGLES = [90, 180, 270] as const;

export function RotatePdf({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [pageCount, setPageCount] = React.useState<number>(0);
  const [angle, setAngle] = React.useState<number>(90);
  const [scope, setScope] = React.useState<Scope>("all");
  const [rangeSpec, setRangeSpec] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputSize, setOutputSize] = React.useState<number>(0);
  const [outputName, setOutputName] = React.useState<string>("rotated.pdf");
  const [affected, setAffected] = React.useState<number>(0);

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
    setAffected(0);
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
    setRangeSpec("");
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputSize(0);
    setAffected(0);
  };

  const doRotate = async () => {
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
      const pages = doc.getPages();

      let targetIndices: number[];
      if (scope === "all") {
        targetIndices = pages.map((_, i) => i);
      } else {
        const pageNumbers = parsePageRanges(rangeSpec, pageCount);
        targetIndices = pageNumbers.map((n) => n - 1);
      }

      // Apply rotation: ADD to existing rotation (not replace). This matches
      // the user's mental model of "rotate by 90°" rather than "set to 90°".
      let count = 0;
      for (const idx of targetIndices) {
        const page = pages[idx];
        if (!page) continue;
        const current = page.getRotation().angle;
        const next = (current + angle) % 360;
        page.setRotation(degrees(next));
        count++;
      }

      const out = await doc.save();
      const blob = new Blob([Uint8Array.from(out)], { type: "application/pdf" });
      setOutputUrl((prev) => replaceObjectUrl(prev, blob));
      setOutputSize(blob.size);
      setOutputName(derivedPdfName(file.name, "rotated"));
      setAffected(count);
      toast.success(
        `Rotated ${count} page${count === 1 ? "" : "s"} by ${angle}° (${formatBytes(blob.size)}).`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rotation failed.");
    } finally {
      setBusy(false);
    }
  };

  const content: ToolContent = {
    intro:
      "Rotate every page — or just a selection — of a PDF by 90, 180 or 270 degrees, entirely in your browser. Perfect for fixing sideways scans or landscape pages that need to be portrait. Your file never leaves your device.",
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

            <div className="space-y-2">
              <Label>Rotation angle</Label>
              <RadioGroup
                value={String(angle)}
                onValueChange={(v) => setAngle(parseInt(v, 10))}
                className="grid gap-2 sm:grid-cols-3"
              >
                {ANGLES.map((a) => (
                  <Label
                    key={a}
                    htmlFor={`rot-${a}`}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <RadioGroupItem id={`rot-${a}`} value={String(a)} />
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <RotateIcon
                        className="h-4 w-4"
                        style={{ transform: `rotate(${a}deg)` }}
                      />
                      {a}°
                    </span>
                  </Label>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Rotation is applied on top of each page&apos;s existing orientation (e.g. a page
                already at 90° becomes 180° when you apply another 90°).
              </p>
            </div>

            <div className="space-y-2">
              <Label>Apply to</Label>
              <RadioGroup
                value={scope}
                onValueChange={(v) => setScope(v as Scope)}
                className="grid gap-2 sm:grid-cols-2"
              >
                <Label
                  htmlFor="scope-all"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem id="scope-all" value="all" />
                  <span className="text-sm font-medium">All {pageCount || ""} pages</span>
                </Label>
                <Label
                  htmlFor="scope-range"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem id="scope-range" value="range" />
                  <span className="text-sm font-medium">Specific page range</span>
                </Label>
              </RadioGroup>
            </div>

            {scope === "range" && (
              <div className="space-y-2">
                <Label htmlFor="rot-range">Page range</Label>
                <Input
                  id="rot-range"
                  value={rangeSpec}
                  onChange={(e) => setRangeSpec(e.target.value)}
                  placeholder={`e.g. 1-3, 5, 7-${Math.max(1, pageCount)}`}
                  spellCheck={false}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Pages are 1-indexed. Use commas to list individual pages or hyphens for ranges.
                </p>
              </div>
            )}

            <Button onClick={doRotate} disabled={busy || pageCount === 0} className="w-full sm:w-auto">
              <RotateCw className="mr-1.5 h-4 w-4" />
              {busy ? "Rotating…" : `Rotate ${scope === "all" ? "all pages" : "selected pages"}`}
            </Button>

            {outputUrl && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{outputName}</p>
                    <p className="text-xs text-muted-foreground">
                      {affected} page{affected === 1 ? "" : "s"} rotated · {formatBytes(outputSize)}
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
                    Download rotated PDF
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
          "Drag and drop a PDF onto the dropzone. The page count is read in the background so you know exactly what you're working with.",
      },
      {
        title: "Pick a rotation angle",
        description:
          "Choose 90°, 180° or 270°. The angle is added to each page's existing orientation, so a page already at 90° rotated by 90° ends up at 180°.",
      },
      {
        title: "Choose the scope",
        description:
          "Apply the rotation to every page, or to a specific page range like “1-3, 5, 7-9” for surgical fixes.",
      },
      {
        title: "Rotate and download",
        description:
          "Click Rotate — pdf-lib adjusts each page's rotation flag locally. Download the result; your file never leaves your device.",
      },
    ],
    useCases: [
      "Fix a batch of scanned pages that came out sideways from a sheet-fed scanner.",
      "Rotate only the landscape pages of a mixed-orientation report to portrait.",
      "Turn a portrait booklet layout 90° for display on a landscape screen.",
      "Correct one wrongly-rotated page in the middle of a long document without affecting the rest.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Rotation is applied to each page&apos;s <code>/Rotate</code> flag — the page contents are
          not re-rendered, so a 90° rotation of a portrait page becomes landscape (and vice versa).
        </li>
        <li>Encrypted or password-protected PDFs cannot be rotated — remove the password first.</li>
        <li>Annotations and form fields keep their absolute positions on the page; they do not rotate with the content.</li>
        <li>Very large PDFs (&gt;100 MB) may take several seconds to process and use significant memory.</li>
      </ul>
    ),
    faq: [
      {
        q: "What does 90° / 180° / 270° actually do?",
        a: "Each page in a PDF has a /Rotate flag (0, 90, 180 or 270 degrees). This tool adds your chosen angle to the existing flag, modulo 360. A page displayed at 90° rotated by 180° ends up displayed at 270°.",
      },
      {
        q: "Is my PDF uploaded somewhere?",
        a: "No. The PDF is read into browser memory only and processed with the pdf-lib library. Rotation never transmits your file to Dueneo or any third party.",
      },
      {
        q: "Why did my page get bigger/smaller after rotation?",
        a: "Rotation only flips the page's orientation flag — it does not change the page's media box. A 595×842pt portrait page rotated 90° is now displayed as 842×595pt landscape, but the underlying box is unchanged. Viewers honour the rotation flag.",
      },
      {
        q: "Can I rotate different pages by different angles?",
        a: "This tool applies one angle to a selection of pages. For per-page rotation, run the tool multiple times with different page ranges, or use the rearrange tool to split the PDF into separate files first.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
