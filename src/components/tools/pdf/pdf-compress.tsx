"use client";

import * as React from "react";
import {
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
} from "pdf-lib";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip, formatBytes } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Download, Minimize2, RotateCcw } from "lucide-react";
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

type Level = "light" | "medium" | "aggressive";

const LEVELS: {
  value: Level;
  label: string;
  description: string;
}[] = [
  {
    value: "light",
    label: "Light",
    description:
      "Strip metadata (title, author, producer) and pack small objects into compressed streams. Lossless — content is unchanged. Best for text-heavy PDFs.",
  },
  {
    value: "medium",
    label: "Medium",
    description:
      "Light + re-encode JPEG images at 60% quality. Visible quality loss on photos. Best for image-heavy PDFs where some quality loss is acceptable.",
  },
  {
    value: "aggressive",
    label: "Aggressive",
    description:
      "Medium + downsample images to 1000 px on the longest side and re-encode at 40% quality. Significant quality loss. Best for web preview thumbnails.",
  },
];

/**
 * Re-encode a JPEG image at the given quality, optionally downsampling
 * to `maxSize` pixels on the longest side. Returns the new JPEG bytes,
 * or null if the image could not be decoded.
 */
async function reencodeJpeg(
  jpegBytes: Uint8Array,
  maxSize: number,
  quality: number
): Promise<Uint8Array | null> {
  const blob = new Blob([jpegBytes], { type: "image/jpeg" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode"));
      i.src = url;
    });
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (!w || !h) return null;
    if (maxSize > 0 && (w > maxSize || h > maxSize)) {
      const scale = Math.min(maxSize / w, maxSize / h);
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const outBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!outBlob) return null;
    return new Uint8Array(await outBlob.arrayBuffer());
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Walk every indirect object in the PDF, find image XObjects whose
 * filter is DCTDecode (JPEG), and re-encode them at the chosen quality
 * (and optionally downsample). Only replaces a stream when the
 * re-encoded bytes are SMALLER than the original — never grows the file.
 *
 * Skips: non-image streams, non-DCTDecode filters (FlateDecode raw
 * bitmaps, CCITT, JBIG2, JPX), images larger than 8000 px on either
 * side (canvas safety), and any image that fails to decode.
 */
async function reencodeImages(
  doc: PDFDocument,
  quality: number,
  maxSize: number,
  onProgress?: (msg: string) => void
): Promise<{ processed: number; reencoded: number }> {
  const largest = doc.context.largestObjectNumber;
  let processed = 0;
  let reencoded = 0;
  for (let i = 1; i <= largest; i++) {
    const ref = PDFRef.of(i);
    const obj = doc.context.lookup(ref);
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    const subtype = dict.get(PDFName.of("Subtype"));
    if (!subtype || subtype.toString() !== "/Image") continue;
    const filter = dict.get(PDFName.of("Filter"));
    if (!filter || filter.toString() !== "/DCTDecode") continue;
    const wObj = dict.get(PDFName.of("Width"));
    const hObj = dict.get(PDFName.of("Height"));
    if (!(wObj instanceof PDFNumber) || !(hObj instanceof PDFNumber)) continue;
    const w = wObj.value();
    const h = hObj.value();
    if (w <= 0 || h <= 0 || w > 8000 || h > 8000) continue;
    processed++;
    if (onProgress && processed % 5 === 0) {
      onProgress(`Re-encoding image ${processed}…`);
    }
    try {
      // PDFRawStream.contents is the raw, still-encoded byte payload.
      // For DCTDecode images, this IS the JPEG byte stream.
      const original = obj.contents;
      if (!original || original.length === 0) continue;
      const reencodedBytes = await reencodeJpeg(original, maxSize, quality);
      if (!reencodedBytes) continue;
      if (reencodedBytes.length >= original.length) continue;
      // Build the replacement stream. We must update Width / Height if
      // we downsampled, and refresh Length so the writer emits the
      // correct byte count.
      const newW = maxSize > 0 ? Math.min(w, Math.round((maxSize / Math.max(w, h)) * w)) : w;
      const newH = maxSize > 0 ? Math.min(h, Math.round((maxSize / Math.max(w, h)) * h)) : h;
      dict.set(PDFName.of("Width"), PDFNumber.of(newW));
      dict.set(PDFName.of("Height"), PDFNumber.of(newH));
      dict.set(PDFName.of("Length"), PDFNumber.of(reencodedBytes.length));
      const newStream = PDFRawStream.of(dict, reencodedBytes);
      doc.context.assign(ref, newStream);
      reencoded++;
    } catch {
      // Skip this image on any error — keep the original stream.
    }
  }
  return { processed, reencoded };
}

/**
 * Run the compression pipeline. Returns the compressed bytes plus a
 * short human-readable summary of what was done.
 */
async function compressPdf(
  bytes: ArrayBuffer,
  level: Level,
  onProgress?: (msg: string) => void
): Promise<{ output: Uint8Array; summary: string }> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  // 1. Strip metadata — every level.
  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setProducer("");
  doc.setCreator("");
  doc.setCreationDate(new Date(0));
  doc.setModificationDate(new Date(0));

  let imgSummary = "";
  if (level !== "light") {
    const quality = level === "medium" ? 0.6 : 0.4;
    const maxSize = level === "medium" ? 0 : 1000;
    onProgress?.("Scanning images…");
    const { processed, reencoded } = await reencodeImages(
      doc,
      quality,
      maxSize,
      onProgress
    );
    if (processed > 0) {
      imgSummary = ` · re-encoded ${reencoded}/${processed} JPEG image${processed === 1 ? "" : "s"}`;
    } else {
      imgSummary = " · no JPEG images found to re-encode";
    }
  }

  onProgress?.("Saving…");
  // 2. Save with useObjectStreams to pack small objects into compressed streams.
  const output = await doc.save({ useObjectStreams: true });
  const summary = `metadata stripped · object streams enabled${imgSummary}`;
  return { output, summary };
}

export function PdfCompress({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [level, setLevel] = React.useState<Level>("medium");
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<number>(0);
  const [progressMsg, setProgressMsg] = React.useState<string>("");
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputSize, setOutputSize] = React.useState<number>(0);
  const [outputName, setOutputName] = React.useState<string>("compressed.pdf");
  const [summary, setSummary] = React.useState<string>("");

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
    setSummary("");
  };

  const reset = () => {
    setFile(null);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputSize(0);
    setSummary("");
    setProgress(0);
    setProgressMsg("");
  };

  const doCompress = async () => {
    if (!file) {
      toast.error("Please upload a PDF first.");
      return;
    }
    setBusy(true);
    setProgress(5);
    setProgressMsg("Reading file…");
    try {
      const buf = await readFileAsArrayBuffer(file);
      setProgress(20);
      setProgressMsg("Loading PDF…");
      // Verify it loads before we start.
      await loadPdfDocument(buf, { PDFDocument });
      setProgress(35);
      const { output, summary } = await compressPdf(buf, level, (msg) => {
        setProgressMsg(msg);
        setProgress((p) => Math.min(85, p + 5));
      });
      setProgress(95);
      const blob = new Blob([output], { type: "application/pdf" });
      setOutputUrl((prev) => replaceObjectUrl(prev, blob));
      setOutputSize(blob.size);
      setOutputName(derivedPdfName(file.name, "compressed"));
      setSummary(summary);
      setProgress(100);
      setProgressMsg("Done");
      const saved = file.size - blob.size;
      const pct = file.size > 0 ? (saved / file.size) * 100 : 0;
      if (saved > 0) {
        toast.success(
          `Compressed: ${formatBytes(file.size)} → ${formatBytes(blob.size)} (${pct.toFixed(1)}% smaller).`
        );
      } else if (saved === 0) {
        toast.info(`Output is the same size as the original (${formatBytes(blob.size)}).`);
      } else {
        toast.warning(
          `Output is ${formatBytes(-saved)} larger than the original — the source is already well-compressed.`
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Compression failed.");
      setProgress(0);
      setProgressMsg("");
    } finally {
      setBusy(false);
    }
  };

  const savings = file && outputSize > 0 ? file.size - outputSize : 0;
  const savingsPct = file && file.size > 0 && outputSize > 0 ? (savings / file.size) * 100 : 0;

  const content: ToolContent = {
    intro:
      "Reduce the file size of a PDF — entirely in your browser. Choose light (lossless metadata strip), medium (re-encode JPEGs at 60%) or aggressive (downsample to 1000 px + 40% quality). See before/after sizes and the savings percentage before downloading. Your file never leaves your device.",
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

            <div className="rounded-md border bg-background p-3 text-sm">
              <span className="text-muted-foreground">Original size: </span>
              <span className="font-medium">{formatBytes(file.size)}</span>
            </div>

            <div className="space-y-2">
              <Label>Compression level</Label>
              <RadioGroup
                value={level}
                onValueChange={(v) => setLevel(v as Level)}
                className="grid gap-2"
              >
                {LEVELS.map((l) => (
                  <Label
                    key={l.value}
                    htmlFor={`lvl-${l.value}`}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <RadioGroupItem id={`lvl-${l.value}`} value={l.value} className="mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{l.label}</p>
                      <p className="text-xs text-muted-foreground">{l.description}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {busy && (
              <div className="space-y-2 rounded-md border bg-background p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{progressMsg}</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}

            <Button onClick={doCompress} disabled={busy} className="w-full sm:w-auto">
              <Minimize2 className="mr-1.5 h-4 w-4" />
              {busy ? "Compressing…" : "Compress PDF"}
            </Button>

            {outputUrl && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md border bg-background p-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Before
                    </p>
                    <p className="text-sm font-semibold">{formatBytes(file.size)}</p>
                  </div>
                  <div className="rounded-md border bg-background p-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      After
                    </p>
                    <p className="text-sm font-semibold">{formatBytes(outputSize)}</p>
                  </div>
                  <div
                    className={`rounded-md border bg-background p-2 ${
                      savings > 0
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                        : savings < 0
                          ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
                          : ""
                    }`}
                  >
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Savings
                    </p>
                    <p className="text-sm font-semibold">
                      {savings > 0
                        ? `-${savingsPct.toFixed(1)}%`
                        : savings < 0
                          ? `+${Math.abs(savingsPct).toFixed(1)}%`
                          : "0%"}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{summary}</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{outputName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(outputSize)} · ready to download
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
                    Download compressed PDF
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
          "Drag and drop a PDF onto the dropzone. The original file size is shown so you can compare against the compressed result.",
      },
      {
        title: "Pick a compression level",
        description:
          "Light strips metadata and packs small objects (lossless). Medium re-encodes JPEGs at 60% quality. Aggressive also downsamples images to 1000 px and uses 40% quality.",
      },
      {
        title: "Compress",
        description:
          "Click Compress PDF — pdf-lib loads the file, strips metadata, optionally re-encodes JPEG images via Canvas, and saves with object streams enabled. A progress bar shows what's happening.",
      },
      {
        title: "Compare and download",
        description:
          "See the before / after sizes and the savings percentage. If the result is larger than the original (already well-compressed source), we'll tell you honestly. Download only if it helps.",
      },
    ],
    useCases: [
      "Shrink a 30 MB scanned contract to under 10 MB so it fits in an email attachment.",
      "Strip metadata from a PDF before sharing it externally to remove author and producer traces.",
      "Downsample a print-resolution PDF to web-resolution for online preview.",
      "Prepare image-heavy PDFs for upload to a size-capped portal (visa application, grant submission, etc.).",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Already-compressed streams can&apos;t be recompressed.</strong> pdf-lib cannot
          re-compress FlateDecode content streams or vector data. If your PDF is text-only or
          already uses efficient compression, savings may be 0–5%.
        </li>
        <li>
          <strong>Only JPEG images are re-encoded.</strong> CCITT, JBIG2, JPEG2000 and raw
          FlateDecode bitmaps are left untouched — pdf-lib&apos;s API does not expose their decoded
          pixels.
        </li>
        <li>
          <strong>Metadata is irreversibly removed.</strong> Title, author, subject, keywords,
          producer, creator, creation date and modification date are all blanked. The original file
          on your device is untouched; only the downloaded copy loses this metadata.
        </li>
        <li>
          <strong>True lossless recompression needs Ghostscript.</strong> For 50%+ savings on
          text-heavy PDFs, a server-side tool like Ghostscript is required. This browser-only tool
          cannot match that — by design, your file never leaves your device.
        </li>
        <li>Encrypted or password-protected PDFs cannot be compressed — remove the password first.</li>
        <li>Very large PDFs (&gt;100 MB) may take several seconds to process and use significant memory.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why is my PDF barely smaller after compression?",
        a: "Most modern PDFs are already well-compressed: text uses FlateDecode (which pdf-lib can't recompress), and images use JPEG (which we do re-encode, but only if it actually saves bytes). For text-heavy PDFs, expect 0–5% savings. For image-heavy PDFs with high-quality JPEGs, expect 20–50% savings on Medium or Aggressive.",
      },
      {
        q: "Is my PDF uploaded somewhere?",
        a: "No. The PDF is read into browser memory only and processed with the pdf-lib library. Image re-encoding uses an off-screen Canvas. Nothing is ever transmitted to Dueneo or any third party.",
      },
      {
        q: "What's the difference between Light, Medium and Aggressive?",
        a: "Light is lossless — strips metadata and packs small objects. Medium re-encodes JPEG images at 60% quality (visible quality loss on photos). Aggressive also downsamples images to 1000 px on the longest side and uses 40% quality (significant quality loss, suitable only for web previews).",
      },
      {
        q: "Can this tool compress a PDF with embedded fonts?",
        a: "Embedded fonts are preserved as-is. pdf-lib does not subsetting or re-compress font programs. If your PDF has many embedded fonts, font subsetting (a server-side feature) is the only way to significantly shrink it.",
      },
      {
        q: "Why did the output end up LARGER than the original?",
        a: "When the source PDF is already optimally compressed, re-saving with pdf-lib can introduce a small amount of overhead (e.g. rewritten object offsets, object stream headers). The tool detects this case and warns you — the original is already as small as it gets in the browser, so just keep the original.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
