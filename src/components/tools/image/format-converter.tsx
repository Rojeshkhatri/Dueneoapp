"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, RotateCcw, Wand2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  PreviewTile,
  downloadBlob,
  formatBytes,
  getCanvas2D,
  loadImageFromFile,
  replaceExtension,
} from "./_image-helpers";

/**
 * Shared format converter. The `tool.slug` field drives the target MIME type
 * and accept string, so a single component powers jpg-to-png, png-to-jpg,
 * png-to-webp, webp-to-png, jpg-to-webp, webp-to-jpg and avif-to-jpg.
 */
interface TargetSpec {
  mime: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
  label: string;
  /** Accept attribute for the input. */
  accept: string;
  /** Whether the quality slider has any effect. */
  lossy: boolean;
}

const TARGETS: Record<string, TargetSpec> = {
  "jpg-to-png": { mime: "image/png", ext: "png", label: "PNG", accept: "image/jpeg,.jpg,.jpeg", lossy: false },
  "png-to-jpg": { mime: "image/jpeg", ext: "jpg", label: "JPG", accept: "image/png,.png", lossy: true },
  "png-to-webp": { mime: "image/webp", ext: "webp", label: "WebP", accept: "image/png,.png", lossy: true },
  "webp-to-png": { mime: "image/png", ext: "png", label: "PNG", accept: "image/webp,.webp", lossy: false },
  "jpg-to-webp": { mime: "image/webp", ext: "webp", label: "WebP", accept: "image/jpeg,.jpg,.jpeg", lossy: true },
  "webp-to-jpg": { mime: "image/jpeg", ext: "jpg", label: "JPG", accept: "image/webp,.webp", lossy: true },
  "avif-to-jpg": { mime: "image/jpeg", ext: "jpg", label: "JPG", accept: "image/avif,.avif", lossy: true },
};

export function FormatConverter({ tool }: { tool: ToolDefinition }) {
  const spec = TARGETS[tool.slug] ?? TARGETS["jpg-to-png"];

  const [file, setFile] = React.useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = React.useState<string | null>(null);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputBlob, setOutputBlob] = React.useState<Blob | null>(null);
  const [quality, setQuality] = React.useState<number>(90);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [originalUrl, outputUrl]);

  const onFiles = (files: { file: File }[]) => {
    const f = files[0]?.file;
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      toast.error("Please choose an image file.");
      return;
    }
    setFile(f);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    setOriginalUrl(URL.createObjectURL(f));
    setOutputUrl(null);
    setOutputBlob(null);
    // Auto-convert on file select for instant feedback.
    convert(f, quality);
  };

  const convert = async (source: File, q: number) => {
    setBusy(true);
    try {
      const img = await loadImageFromFile(source);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = getCanvas2D(canvas);
      // White background for JPEG output (no transparency support).
      if (spec.mime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, spec.mime, q / 100)
      );
      if (!blob) {
        throw new Error(
          `Your browser could not encode this image as ${spec.label}. The format may not be supported.`
        );
      }
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(URL.createObjectURL(blob));
      setOutputBlob(blob);
      toast.success(`Converted to ${spec.label} (${formatBytes(blob.size)}).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setBusy(false);
    }
  };

  const onQualityChange = (v: number) => {
    setQuality(v);
    if (file && spec.lossy) {
      convert(file, v);
    }
  };

  const reset = () => {
    setFile(null);
    setOriginalUrl(null);
    setOutputUrl(null);
    setOutputBlob(null);
    setQuality(90);
  };

  const downloadName = file ? replaceExtension(file.name, spec.ext) : `converted.${spec.ext}`;

  // Build dynamic copy based on the source/target pair.
  const sourceLabel = tool.slug.split("-to-")[0].toUpperCase().replace("JPG", "JPG");
  const targetLabel = spec.label;
  const intro = `Convert ${sourceLabel} images to ${targetLabel} format locally in your browser. Drag and drop a ${sourceLabel} file, optionally adjust quality for lossy output, and download the converted ${targetLabel} — your file never leaves your device.`;

  const content: ToolContent = {
    intro,
    tool: (
      <div className="space-y-5">
        {!file ? (
          <Dropzone
            accept={spec.accept}
            onFiles={onFiles}
            hint={`${sourceLabel} input · up to 50 MB`}
            maxSizeLabel="50 MB"
          />
        ) : (
          <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FileChip name={file.name} size={file.size} onRemove={reset} />
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>

            {spec.lossy && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="fc-quality">Quality</Label>
                  <span className="text-xs font-medium text-muted-foreground">{quality}%</span>
                </div>
                <Slider
                  id="fc-quality"
                  value={[quality]}
                  min={10}
                  max={100}
                  step={1}
                  onValueChange={(v) => onQualityChange(v[0] ?? 90)}
                />
                <p className="text-xs text-muted-foreground">
                  Lower = smaller file, lower visual quality.
                </p>
              </div>
            )}

            <Button onClick={() => file && convert(file, quality)} disabled={busy} className="w-full sm:w-auto">
              <Wand2 className="mr-1.5 h-4 w-4" />
              {busy ? "Converting…" : `Convert to ${spec.label}`}
            </Button>

            {outputUrl && (
              <div className="grid gap-4 sm:grid-cols-2">
                <PreviewTile src={originalUrl} label={`Original (${sourceLabel})`} />
                <PreviewTile src={outputUrl} label={`Converted (${targetLabel})`} caption={outputBlob ? formatBytes(outputBlob.size) : undefined} />
                <div className="sm:col-span-2">
                  <Button
                    onClick={() => {
                      if (!downloadBlob(outputBlob, downloadName)) {
                        toast.error("Nothing to download yet.");
                      }
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Download className="mr-1.5 h-4 w-4" /> Download {targetLabel}
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
        title: "Upload your image",
        description: `Drag and drop a ${sourceLabel} file, or click to browse.`,
      },
      {
        title: "Adjust quality (if applicable)",
        description:
          spec.lossy
            ? `For ${targetLabel} output, drag the quality slider to balance file size and visual fidelity.`
            : `${targetLabel} is lossless, so there is no quality slider.`,
      },
      {
        title: "Convert and download",
        description:
          "Conversion happens automatically. Preview the result, then download the converted file.",
      },
    ],
    useCases: [
      `Convert a ${sourceLabel} to ${targetLabel} for a project that requires a specific format.`,
      "Prepare images for upload to a platform that only accepts certain formats.",
      "Reduce file size by switching to a more efficient codec.",
      "Preserve or remove transparency by switching formats as needed.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>JPG output cannot preserve transparency — transparent areas become white.</li>
        <li>AVIF support varies by browser; if conversion fails, try a different browser.</li>
        <li>Very large images (&gt;50 MB) may slow down or crash the tab.</li>
        <li>Animated images are not supported; only the first frame is converted.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my image uploaded?",
        a: `No. The ${sourceLabel} is loaded into your browser only and converted with the Canvas API. It never leaves your device.`,
      },
      {
        q: `Why did my transparent ${sourceLabel} get a white background?`,
        a: `JPG does not support transparency. When converting to JPG, transparent pixels are filled with white. Choose PNG or WebP output to preserve transparency.`,
      },
      {
        q: "What quality should I use?",
        a: `For most photos, 85–95% produces a barely noticeable visual difference while keeping the file small. Use 100% only when quality matters more than size.`,
      },
      {
        q: "Can I convert multiple files at once?",
        a: "This tool processes one image at a time so you can preview the result. Repeat for each additional file.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
