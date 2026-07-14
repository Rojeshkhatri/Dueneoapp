"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  PreviewTile,
  downloadBlob,
  formatBytes,
  getCanvas2D,
  loadImageFromSrc,
  readFileAsText,
} from "./_image-helpers";

export function SvgToPng({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [svgText, setSvgText] = React.useState<string>("");
  const [svgUrl, setSvgUrl] = React.useState<string | null>(null);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputBlob, setOutputBlob] = React.useState<Blob | null>(null);
  const [naturalW, setNaturalW] = React.useState<number>(512);
  const [naturalH, setNaturalH] = React.useState<number>(512);
  const [targetW, setTargetW] = React.useState<number>(512);
  const [scale, setScale] = React.useState<number>(1);
  const [bg, setBg] = React.useState<string>("#ffffff");
  const [transparent, setTransparent] = React.useState<boolean>(false);
  const [busy, setBusy] = React.useState(false);
  const processGen = React.useRef(0);

  React.useEffect(() => {
    return () => {
      if (svgUrl) URL.revokeObjectURL(svgUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [svgUrl, outputUrl]);

  const parseSvgDimensions = (text: string): { w: number; h: number } => {
    // Try width/height attributes first.
    const wMatch = text.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)/i);
    const hMatch = text.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)/i);
    if (wMatch && hMatch) {
      return { w: parseFloat(wMatch[1]), h: parseFloat(hMatch[1]) };
    }
    // Fall back to viewBox.
    const vb = text.match(/\bviewBox\s*=\s*["']\s*[\d.\s-]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
    if (vb) {
      return { w: parseFloat(vb[1]), h: parseFloat(vb[2]) };
    }
    return { w: 512, h: 512 };
  };

  const onFiles = async (files: { file: File }[]) => {
    const f = files[0]?.file;
    if (!f) return;
    const isSvg = f.type === "image/svg+xml" || f.name.toLowerCase().endsWith(".svg");
    if (!isSvg) {
      toast.error("Please choose an SVG file.");
      return;
    }
    setFile(f);
    setOutputUrl(null);
    setOutputBlob(null);
    try {
      const text = await readFileAsText(f);
      setSvgText(text);
      const dims = parseSvgDimensions(text);
      setNaturalW(dims.w);
      setNaturalH(dims.h);
      setTargetW(dims.w);
      setScale(1);
      if (svgUrl) URL.revokeObjectURL(svgUrl);
      setSvgUrl(URL.createObjectURL(f));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read SVG.");
    }
  };

  // Auto-convert when svgUrl, scale, bg, or transparent changes (debounced).
  React.useEffect(() => {
    if (!svgUrl) return;
    const gen = ++processGen.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const img = await loadImageFromSrc(svgUrl);
        if (processGen.current !== gen) return;
        const srcW = naturalW || img.naturalWidth || 512;
        const srcH = naturalH || img.naturalHeight || 512;
        const aspect = srcH / srcW;
        const outW = Math.max(1, Math.round(srcW * scale));
        const outH = Math.max(1, Math.round(outW * aspect));
        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = getCanvas2D(canvas);
        if (!transparent) {
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, outW, outH);
        }
        ctx.drawImage(img, 0, 0, outW, outH);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (processGen.current !== gen) return;
        if (!blob) throw new Error("Could not rasterise the SVG.");
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(URL.createObjectURL(blob));
        setOutputBlob(blob);
        setTargetW(outW);
      } catch (err) {
        if (processGen.current === gen) {
          toast.error(err instanceof Error ? err.message : "Rasterisation failed.");
        }
      } finally {
        if (processGen.current === gen) setBusy(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [svgUrl, scale, bg, transparent]);

  const reset = () => {
    setFile(null);
    setSvgText("");
    setSvgUrl(null);
    setOutputUrl(null);
    setOutputBlob(null);
    setNaturalW(512); setNaturalH(512); setTargetW(512); setScale(1);
  };

  const downloadName = file ? file.name.replace(/\.svg$/i, ".png") : "svg-to-png.png";

  const content: ToolContent = {
    intro:
      "Rasterise SVG vector files into PNG images at any resolution. Drag and drop an SVG, choose a scale factor and optional background colour, then download a crisp PNG — all locally in your browser.",
    tool: (
      <div className="space-y-5">
        {!file ? (
          <Dropzone
            accept="image/svg+xml,.svg"
            onFiles={onFiles}
            hint="SVG input · up to 50 MB"
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

            <p className="text-xs text-muted-foreground">
              Source SVG: {naturalW} × {naturalH}px · output: {Math.round(naturalW * scale)} × {Math.round(naturalH * scale)}px
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="st-scale">Scale factor</Label>
                <span className="text-xs font-medium text-muted-foreground">{scale}×</span>
              </div>
              <Slider
                id="st-scale"
                value={[scale]}
                min={0.25}
                max={8}
                step={0.25}
                onValueChange={(v) => setScale(v[0] ?? 1)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="st-bg">Background colour</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="st-bg"
                    type="color"
                    value={bg}
                    onChange={(e) => setBg(e.target.value)}
                    disabled={transparent}
                    className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1"
                    aria-label="Background colour"
                  />
                  <Input
                    value={bg}
                    onChange={(e) => setBg(e.target.value)}
                    disabled={transparent}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={transparent}
                    onChange={(e) => setTransparent(e.target.checked)}
                    className="size-4"
                  />
                  Transparent background
                </label>
              </div>
            </div>

            {busy && (
              <p className="text-xs text-muted-foreground animate-pulse">Rasterising…</p>
            )}

            {outputUrl && (
              <div className="grid gap-4 sm:grid-cols-2">
                <PreviewTile src={svgUrl} label="Source SVG" />
                <PreviewTile
                  src={outputUrl}
                  label="PNG output"
                  caption={`${targetW} × ${Math.round(targetW * (naturalH / naturalW))}px`}
                />
                <div className="sm:col-span-2">
                  <Button
                    onClick={() => {
                      if (!downloadBlob(outputBlob, downloadName)) {
                        toast.error("Nothing to download yet.");
                      }
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Download className="mr-1.5 h-4 w-4" /> Download PNG
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
        title: "Upload an SVG",
        description: "Drag and drop or browse for an .svg file.",
      },
      {
        title: "Choose a scale",
        description:
          "Use the scale slider to render the SVG at 0.25× up to 8× its native size. Higher scales produce sharper, larger PNGs.",
      },
      {
        title: "Set the background (optional)",
        description:
          "Pick a background colour for non-transparent PNGs, or enable the transparent background option to preserve the SVG's alpha channel.",
      },
      {
        title: "Rasterise and download",
        description:
          "Click rasterise to draw the SVG to a canvas and export as PNG, then download.",
      },
    ],
    useCases: [
      "Convert a vector logo SVG into a high-resolution PNG for use in slide decks.",
      "Generate a 512×512 PNG favicon source from an SVG icon.",
      "Prepare an SVG illustration for a platform that does not accept vector files.",
      "Rasterise an icon set to multiple resolutions by re-running with different scales.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>External resources referenced in the SVG (fonts, images) may not render if the browser blocks them.</li>
        <li>SVGs with scripts or foreignObject elements may not rasterise correctly for security reasons.</li>
        <li>Very large scale factors can produce very large PNGs that consume significant memory.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my SVG uploaded?",
        a: "No. The SVG is read as text in your browser, loaded into an Image element, then drawn to a canvas. It never leaves your device.",
      },
      {
        q: "Why does my SVG look different when rasterised?",
        a: "SVGs can reference external fonts or images. If the browser cannot load those resources, it falls back to defaults. Embed fonts as data URIs inside the SVG for consistent output.",
      },
      {
        q: "What scale should I choose?",
        a: "For a logo or icon, 2× or 4× the native size is usually plenty for retina displays. For high-resolution print, go higher — but watch the output file size.",
      },
      {
        q: "Can I export to JPG instead of PNG?",
        a: "This tool exports PNG only, which preserves transparency. Run the output through the PNG to JPG tool if you need a JPG.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
