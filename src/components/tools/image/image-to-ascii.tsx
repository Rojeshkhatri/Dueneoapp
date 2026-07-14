"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Download, RotateCcw, Copy, Check } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_IMAGE_BYTES,
  PreviewTile,
  formatBytes,
  getCanvas2D,
  loadImageFromFile,
} from "./_image-helpers";

type CharsetKey = "standard" | "blocks" | "minimal";

const CHARSET: Record<CharsetKey, string> = {
  // Darkest first; index 0 = brightest pixel.
  standard: " .:-=+*#%@",
  blocks: " ░▒▓█",
  minimal: " .:#",
};

interface AsciiOptions {
  width: number;
  charset: CharsetKey;
  invert: boolean;
  color: boolean;
}

interface AsciiResult {
  text: string;
  /** For colour mode: lines of (char + rgb) — render as HTML for true colour. */
  coloredLines: { ch: string; color: string }[][];
  width: number;
  height: number;
}

/**
 * Image to ASCII Art — loads an image, downscales to a configurable width,
 * maps each pixel's brightness to a character, and renders the result.
 * Supports standard / blocks / minimal character sets, invert toggle,
 * colour toggle (uses the original pixel colour) and copy/download.
 */
export function ImageToAscii({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<AsciiResult | null>(null);
  const [width, setWidth] = React.useState<number>(80);
  const [charset, setCharset] = React.useState<CharsetKey>("standard");
  const [invert, setInvert] = React.useState<boolean>(false);
  const [color, setColor] = React.useState<boolean>(false);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const processGen = React.useRef(0);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onFiles = (files: { file: File }[]) => {
    const f = files[0]?.file;
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      toast.error("Please choose an image file.");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      toast.error(
        `File is too large (${formatBytes(f.size)}). The maximum supported size is ${formatBytes(MAX_IMAGE_BYTES)}.`
      );
      return;
    }
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
    void convert(f, { width, charset, invert, color });
  };

  const convert = React.useCallback(
    async (f: File, opts: AsciiOptions) => {
      const gen = ++processGen.current;
      setBusy(true);
      try {
        const img = await loadImageFromFile(f);
        if (gen !== processGen.current) return;
        const canvas = document.createElement("canvas");
        const aspectFix = 0.55;
        const targetW = Math.max(8, Math.min(200, opts.width));
        const targetH = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * targetW * aspectFix));
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = getCanvas2D(canvas);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const data = ctx.getImageData(0, 0, targetW, targetH).data;

        const chars = CHARSET[opts.charset];
        const lines: string[] = [];
        const coloredLines: { ch: string; color: string }[][] = [];

        for (let y = 0; y < targetH; y++) {
          let line = "";
          const coloredLine: { ch: string; color: string }[] = [];
          for (let x = 0; x < targetW; x++) {
            const i = (y * targetW + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            const alpha = a / 255;
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const effective = alpha === 0 ? 1 : lum;
            const adjusted = opts.invert ? 1 - effective : effective;
            const idx = Math.min(chars.length - 1, Math.max(0, Math.floor(adjusted * (chars.length - 1))));
            const ch = chars[idx];
            line += ch;
            coloredLine.push({
              ch,
              color: `rgb(${r}, ${g}, ${b})`,
            });
          }
          lines.push(line);
          coloredLines.push(coloredLine);
        }

        if (gen !== processGen.current) return;
        setResult({
          text: lines.join("\n"),
          coloredLines,
          width: targetW,
          height: targetH,
        });
      } catch (err) {
        if (gen !== processGen.current) return;
        toast.error(err instanceof Error ? err.message : "ASCII conversion failed.");
        setResult(null);
      } finally {
        if (gen === processGen.current) setBusy(false);
      }
    },
    []
  );

  // Auto-convert when options change (debounced).
  React.useEffect(() => {
    if (!file) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void convert(file, { width, charset, invert, color });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [file, width, charset, invert, color]);

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
  };

  const copyText = async () => {
    if (!result) {
      toast.error("Convert an image first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      toast.success("ASCII art copied to clipboard.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Clipboard not available in this browser.");
    }
  };

  const downloadTxt = () => {
    if (!result) {
      toast.error("Convert an image first.");
      return;
    }
    const blob = new Blob([result.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ascii-art.txt";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
    toast.success("ASCII art downloaded.");
  };

  const content: ToolContent = {
    intro:
      "Turn any image into ASCII art. Pick a character set (standard, blocks or minimal), set the output width (40-200 chars), invert brightness, or render in colour using each pixel's original RGB. Copy the result or download it as a .txt file.",
    tool: (
      <div className="space-y-5">
        {!file ? (
          <Dropzone
            accept="image/jpeg,image/png,image/webp,image/bmp,image/gif"
            onFiles={onFiles}
            hint="JPG, PNG, WebP, BMP or GIF · up to 50 MB"
            maxSizeLabel="50 MB"
            label="Drop an image here or click to browse"
          />
        ) : (
          <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FileChip name={file.name} size={file.size} onRemove={reset} />
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ia-width">Width (chars)</Label>
                  <span className="text-xs font-medium text-muted-foreground">{width}</span>
                </div>
                <input
                  id="ia-width"
                  type="range"
                  min={40}
                  max={200}
                  step={2}
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div className="space-y-2">
                <Label>Character set</Label>
                <Select value={charset} onValueChange={(v) => setCharset(v as CharsetKey)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard · ·:-=+*#%@</SelectItem>
                    <SelectItem value="blocks">Blocks · ░▒▓█</SelectItem>
                    <SelectItem value="minimal">Minimal · .:#</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <Label htmlFor="ia-invert" className="text-sm">Invert</Label>
                <Switch id="ia-invert" checked={invert} onCheckedChange={setInvert} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <Label htmlFor="ia-color" className="text-sm">Colour</Label>
                <Switch id="ia-color" checked={color} onCheckedChange={setColor} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PreviewTile src={previewUrl} label="Original" />
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">ASCII Art</p>
                {result ? (
                  <div className="space-y-3">
                    <div className="max-h-[360px] overflow-auto rounded-lg border bg-zinc-950 p-3 text-zinc-100">
                      {color ? (
                        <pre
                          className="font-mono text-[10px] leading-[10px] sm:text-[11px] sm:leading-[11px]"
                          aria-label="Colour ASCII art preview"
                        >
                          {result.coloredLines.map((line, y) => (
                            <div key={y}>
                              {line.map((cell, x) => (
                                <span key={x} style={{ color: cell.color }}>
                                  {cell.ch}
                                </span>
                              ))}
                            </div>
                          ))}
                        </pre>
                      ) : (
                        <pre
                          className="whitespace-pre font-mono text-[10px] leading-[10px] sm:text-[11px] sm:leading-[11px]"
                          aria-label="ASCII art preview"
                        >
                          {result.text}
                        </pre>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Output size: {result.width} × {result.height} characters.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={copyText} variant="outline" size="sm">
                        {copied ? (
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                        ) : (
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {copied ? "Copied" : "Copy text"}
                      </Button>
                      <Button onClick={downloadTxt} variant="outline" size="sm">
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download .txt
                      </Button>
                    </div>
                  </div>
                ) : busy ? (
                  <p className="text-xs text-muted-foreground">Converting…</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Nothing to preview yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Upload an image",
        description:
          "Drag and drop a JPG, PNG, WebP, BMP or GIF. The image is downscaled to your chosen width before conversion — even large photos work fine.",
      },
      {
        title: "Pick a character set",
        description:
          "Standard (10 chars, most detail), blocks (5 chars, chunky terminal look) or minimal (4 chars, very low-fi).",
      },
      {
        title: "Adjust width, invert and colour",
        description:
          "Set the output width (40-200 characters). Toggle invert to swap dark and light, or toggle colour to render each character in the pixel's original RGB.",
      },
      {
        title: "Copy or download",
        description:
          "Copy the ASCII art to your clipboard, or download it as a .txt file. Paste anywhere that accepts monospace text.",
      },
    ],
    useCases: [
      "Generate a unique text-based avatar for terminal or chat.",
      "Embed a low-fi preview of an image in code comments or README files.",
      "Create retro-styled banners for blogs or social posts.",
      "Visualise the brightness structure of an image at a glance.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          ASCII art assumes a monospace font with characters about twice as tall as they
          are wide. We correct for this by scaling height by 0.55, but pasting into a
          variable-width font will distort the image.
        </li>
        <li>Colour mode requires a viewer that supports HTML/CSS colours — .txt downloads are plain text only.</li>
        <li>Very fine detail is lost at narrow widths (under 60 chars).</li>
        <li>Animated GIFs use only the first frame.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my image uploaded?",
        a: "No. The image is loaded into a Canvas in your browser, downscaled, and converted to characters locally. Nothing is transmitted to a server.",
      },
      {
        q: "Why does my art look stretched?",
        a: "Paste it into a monospace font (most code editors, terminals, or `<pre>` blocks). The converter already compensates for character aspect ratio, so as long as the font is monospace it should look correct.",
      },
      {
        q: "Can I get coloured ASCII as a text file?",
        a: "Plain .txt files can't carry colour. The colour toggle is for on-screen preview only. If you need coloured ASCII in code, generate it in standard mode and use ANSI escape codes manually.",
      },
      {
        q: "What's the maximum width?",
        a: "200 characters. Wider output gets unwieldy and won't fit most screens or editors. For desktop wallpapers or large prints, use 120-160 chars.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
