"use client";

import * as React from "react";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip, formatBytes } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Droplets, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  derivedPdfName,
  downloadObjectUrl,
  hexToRgb01,
  isPdfFile,
  LARGE_PDF_WARN_BYTES,
  loadPdfDocument,
  MAX_PDF_BYTES,
  POSITION_OPTIONS,
  readFileAsArrayBuffer,
  replaceObjectUrl,
  type Position,
} from "./_pdf-helpers";

const PRESET_COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "Dark grey", hex: "#4b5563" },
  { name: "Red", hex: "#dc2626" },
  { name: "Amber", hex: "#d97706" },
  { name: "Green", hex: "#16a34a" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Pink", hex: "#db2777" },
];

/**
 * Compute the (x, y) origin for `page.drawText` so that the VISUAL
 * CENTER of the (possibly rotated) text box lands at the position
 * implied by the 9-grid, with `margin` to the page edge.
 *
 * pdf-lib's `rotate: degrees(angle)` rotates the text around (x, y).
 * Without correction, a non-zero rotation pushes the text off-target.
 * We back-calculate the origin from the desired visual centre.
 */
function computeWatermarkOrigin(
  position: Position,
  pageW: number,
  pageH: number,
  textW: number,
  textH: number,
  margin: number,
  angleDeg: number
): [number, number] {
  let targetCx: number;
  let targetCy: number;
  switch (position) {
    case "top-left":
      targetCx = margin + textW / 2;
      targetCy = pageH - margin - textH / 2;
      break;
    case "top-center":
      targetCx = pageW / 2;
      targetCy = pageH - margin - textH / 2;
      break;
    case "top-right":
      targetCx = pageW - margin - textW / 2;
      targetCy = pageH - margin - textH / 2;
      break;
    case "middle-left":
      targetCx = margin + textW / 2;
      targetCy = pageH / 2;
      break;
    case "middle-center":
      targetCx = pageW / 2;
      targetCy = pageH / 2;
      break;
    case "middle-right":
      targetCx = pageW - margin - textW / 2;
      targetCy = pageH / 2;
      break;
    case "bottom-left":
      targetCx = margin + textW / 2;
      targetCy = margin + textH / 2;
      break;
    case "bottom-center":
      targetCx = pageW / 2;
      targetCy = margin + textH / 2;
      break;
    case "bottom-right":
      targetCx = pageW - margin - textW / 2;
      targetCy = margin + textH / 2;
      break;
    default:
      targetCx = pageW / 2;
      targetCy = pageH / 2;
  }
  const theta = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const x = targetCx - (textW / 2) * cos + (textH / 2) * sin;
  const y = targetCy - (textW / 2) * sin - (textH / 2) * cos;
  return [x, y];
}

export function WatermarkPdf({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [pageCount, setPageCount] = React.useState<number>(0);
  const [text, setText] = React.useState<string>("CONFIDENTIAL");
  const [fontSize, setFontSize] = React.useState<number>(48);
  const [color, setColor] = React.useState<string>("#dc2626");
  const [opacity, setOpacity] = React.useState<number>(0.2);
  const [angle, setAngle] = React.useState<number>(45);
  const [position, setPosition] = React.useState<Position>("middle-center");
  const [margin, setMargin] = React.useState<number>(36);
  const [busy, setBusy] = React.useState(false);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputSize, setOutputSize] = React.useState<number>(0);
  const [outputName, setOutputName] = React.useState<string>("watermarked.pdf");

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
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputSize(0);
  };

  const doWatermark = async () => {
    if (!file) {
      toast.error("Please upload a PDF first.");
      return;
    }
    if (pageCount === 0) {
      toast.error("The PDF has no pages.");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Enter some watermark text first.");
      return;
    }
    setBusy(true);
    try {
      const buf = await readFileAsArrayBuffer(file);
      const doc = await loadPdfDocument(buf, { PDFDocument });
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const pages = doc.getPages();
      const [r, g, b] = hexToRgb01(color);
      // Clamp opacity to [0, 1].
      const op = Math.max(0, Math.min(1, opacity));
      // pdf-lib's drawText wants degrees in [0, 360) for rotation.
      const normAngle = ((angle % 360) + 360) % 360;
      const textW = font.widthOfTextAtSize(trimmed, fontSize);
      const textH = font.heightAtSize(fontSize);

      let count = 0;
      for (const page of pages) {
        const pageW = page.getWidth();
        const pageH = page.getHeight();
        const [x, y] = computeWatermarkOrigin(
          position,
          pageW,
          pageH,
          textW,
          textH,
          margin,
          normAngle
        );
        page.drawText(trimmed, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(r, g, b),
          opacity: op,
          rotate: degrees(normAngle),
        });
        count++;
      }

      const out = await doc.save();
      const blob = new Blob([Uint8Array.from(out)], { type: "application/pdf" });
      setOutputUrl((prev) => replaceObjectUrl(prev, blob));
      setOutputSize(blob.size);
      setOutputName(derivedPdfName(file.name, "watermarked"));
      toast.success(`Watermarked ${count} page${count === 1 ? "" : "s"} (${formatBytes(blob.size)}).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Watermark failed.");
    } finally {
      setBusy(false);
    }
  };

  // Mini live preview of the watermark text on a sample page.
  const previewStyle: React.CSSProperties = {
    fontSize: `${Math.max(10, Math.min(28, fontSize / 3))}px`,
    color,
    opacity: Math.max(0.05, Math.min(1, opacity)),
    transform: `rotate(${-angle}deg)`, // CSS rotates CCW for positive; PDF rotates CW. Sign flip for visual match.
    fontWeight: 700,
    letterSpacing: "0.05em",
    whiteSpace: "nowrap" as const,
  };

  const content: ToolContent = {
    intro:
      "Stamp a text watermark across every page of a PDF — entirely in your browser. Choose the text, font size, colour, opacity, rotation angle and one of nine positions, then download the watermarked result. Perfect for “CONFIDENTIAL”, “DRAFT” or branding overlays. Your file never leaves your device.",
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
                ? `${pageCount} page${pageCount === 1 ? "" : "s"} detected · watermark will be applied to every page`
                : "Reading page count…"}
            </p>

            <div className="space-y-2">
              <Label htmlFor="wm-text">Watermark text</Label>
              <Input
                id="wm-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. CONFIDENTIAL, DRAFT, DO NOT COPY"
                maxLength={120}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="wm-size">Font size</Label>
                  <span className="text-xs font-medium text-muted-foreground">{fontSize}pt</span>
                </div>
                <Slider
                  id="wm-size"
                  value={[fontSize]}
                  min={8}
                  max={144}
                  step={1}
                  onValueChange={(v) => setFontSize(v[0] ?? 48)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="wm-opacity">Opacity</Label>
                  <span className="text-xs font-medium text-muted-foreground">
                    {Math.round(opacity * 100)}%
                  </span>
                </div>
                <Slider
                  id="wm-opacity"
                  value={[opacity]}
                  min={0.05}
                  max={1}
                  step={0.05}
                  onValueChange={(v) => setOpacity(v[0] ?? 0.2)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="wm-angle">Rotation</Label>
                  <span className="text-xs font-medium text-muted-foreground">{angle}°</span>
                </div>
                <Slider
                  id="wm-angle"
                  value={[angle]}
                  min={0}
                  max={359}
                  step={1}
                  onValueChange={(v) => setAngle(v[0] ?? 45)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="wm-margin">Margin</Label>
                  <span className="text-xs font-medium text-muted-foreground">
                    {margin}pt ({(margin / 72).toFixed(2)}″)
                  </span>
                </div>
                <Slider
                  id="wm-margin"
                  value={[margin]}
                  min={0}
                  max={144}
                  step={1}
                  onValueChange={(v) => setMargin(v[0] ?? 36)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wm-color">Colour</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="wm-color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    spellCheck={false}
                    autoCapitalize="off"
                    className="flex-1"
                  />
                  <input
                    type="color"
                    aria-label="Pick colour"
                    value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#000000"}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-9 flex-none cursor-pointer rounded border bg-background p-0.5"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      title={c.name}
                      aria-label={`Use ${c.name}`}
                      className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c.hex,
                        borderColor: color.toLowerCase() === c.hex ? "var(--primary)" : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wm-position">Position</Label>
                <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                  <SelectTrigger id="wm-position" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Position targets the visual centre of the (possibly rotated) text.
                </p>
              </div>
            </div>

            {/* Live preview card */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-md border bg-background">
                <div className="absolute inset-3 rounded border border-dashed border-muted-foreground/20" />
                <span style={previewStyle} className="select-none">
                  {text.trim() || "PREVIEW"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Approximate rendering on a sample page. Final position is computed per page using
                each page&apos;s actual dimensions.
              </p>
            </div>

            <Button onClick={doWatermark} disabled={busy || pageCount === 0} className="w-full sm:w-auto">
              <Droplets className="mr-1.5 h-4 w-4" />
              {busy ? "Watermarking…" : "Apply watermark to all pages"}
            </Button>

            {outputUrl && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{outputName}</p>
                    <p className="text-xs text-muted-foreground">
                      {pageCount} page{pageCount === 1 ? "" : "s"} watermarked ·{" "}
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
                    Download watermarked PDF
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
          "Drag and drop a PDF onto the dropzone. The page count is read in the background so you can confirm the scope before watermarking.",
      },
      {
        title: "Configure the watermark",
        description:
          "Type the watermark text, pick a font size, colour (hex picker or presets), opacity (5–100%), rotation angle (0–359°), margin and one of nine positions on the page.",
      },
      {
        title: "Preview",
        description:
          "A live mini-preview shows the text in your chosen colour, opacity and rotation. The preview is approximate — the final position is computed per page using each page's actual dimensions.",
      },
      {
        title: "Apply and download",
        description:
          "Click Apply watermark — pdf-lib draws the text on every page locally using drawText with embedded Helvetica Bold. Download the result; your file never leaves your device.",
      },
    ],
    useCases: [
      "Stamp “CONFIDENTIAL” diagonally across every page of a contract before sharing externally.",
      "Brand every page of a white paper with your company name in the top-right corner.",
      "Mark a draft proposal with “DRAFT v2 — DO NOT DISTRIBUTE” at 30° across the middle.",
      "Add a subtle copyright notice in the bottom-centre of every page of an e-book PDF.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The watermark uses Helvetica Bold only — embedding a custom TTF/OTF font is not exposed in
          the UI. To use a custom font, embed the bytes via <code>doc.embedFont</code> in custom
          code.
        </li>
        <li>
          Each character&apos;s glyphs are drawn in the chosen colour and opacity; this is a flat
          text overlay, not a transparent PNG stamp. Transparent backgrounds behind the text are
          preserved.
        </li>
        <li>Encrypted or password-protected PDFs cannot be watermarked — remove the password first.</li>
        <li>
          The same text, size, colour, opacity and angle are applied to every page. To vary the
          watermark per page, split the PDF first, watermark each part separately, then merge.
        </li>
        <li>Very large PDFs (&gt;100 MB) may take several seconds to process and use significant memory.</li>
      </ul>
    ),
    faq: [
      {
        q: "How does rotation interact with position?",
        a: "Position targets the VISUAL CENTRE of the (possibly rotated) text. For example, with 45° rotation and “middle-center”, the text is rotated 45° around the page centre. With “top-left” and 0°, the text sits horizontally in the top-left corner with the configured margin.",
      },
      {
        q: "Is my PDF uploaded somewhere?",
        a: "No. The PDF is read into browser memory only and edited with the pdf-lib library. The watermark is drawn locally; the file never leaves your device.",
      },
      {
        q: "Can I use a transparent PNG or logo instead of text?",
        a: "This tool stamps text only. For an image watermark, embed the image with doc.embedPng / doc.embedJpg and use page.drawImage in custom code, or use the Watermark Image tool for a rasterised overlay.",
      },
      {
        q: "Why does my watermark look slightly off-centre?",
        a: "The position is computed using the text's bounding box (width × height) which assumes Helvetica Bold's standard metrics. Kerning and glyph-specific overshoots can cause a few points of visual drift. Use a larger margin or pick middle-center for the most reliable result.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
