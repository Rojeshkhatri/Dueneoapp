"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Wand2, RotateCcw, Download, AlertTriangle } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { byteLength, formatBytes, downloadText } from "../developer/_dev-helpers";

const MAX_BYTES = 1 * 1024 * 1024;

const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.0.dtd" width="24" height="24" viewBox="0 0 24 24">
  <!-- a home icon exported from a vector editor -->
  <metadata id="metadata1">some metadata</metadata>
  <sodipodi:namedview id="base" pagecolor="#ffffff"></sodipodi:namedview>
  <path d="M3.5000 12.0000 L12.0000 3.50000 L20.5000 12.0000" fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"></path>
  <path d="M5.50000 11.0000 L5.50000 20.5000 L18.5000 20.5000 L18.5000 11.0000" fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"></path>
  <rect x="9.50000" y="14.5000" width="5.00000" height="6.00000" fill="black"></rect>
</svg>`;

interface OptimiseOptions {
  removeComments: boolean;
  removeXmlDecl: boolean;
  removeEditorNs: boolean;
  removeMetadata: boolean;
  roundCoords: boolean;
  removeDefaults: boolean;
  collapseWhitespace: boolean;
}

const DEFAULT_OPTIONS: OptimiseOptions = {
  removeComments: true,
  removeXmlDecl: true,
  removeEditorNs: true,
  removeMetadata: true,
  roundCoords: true,
  removeDefaults: true,
  collapseWhitespace: true,
};

/**
 * Regex-based SVG icon optimiser. Conservative — never reorders attributes
 * or alters geometry, just removes obvious bloat and rounds numeric
 * coordinates to 2 decimals.
 */
export function optimiseSvg(input: string, opts: OptimiseOptions): string {
  let out = input;

  // 1. XML declaration `<?xml ... ?>`
  if (opts.removeXmlDecl) {
    out = out.replace(/<\?xml[\s\S]*?\?>/g, "");
  }

  // 2. Comments `<!-- ... -->`
  if (opts.removeComments) {
    out = out.replace(/<!--[\s\S]*?-->/g, "");
  }

  // 3. Editor namespaces (inkscape, sodipodi, xlink, etc.) + their attributes + elements.
  if (opts.removeEditorNs) {
    const editorNs = ["inkscape", "sodipodi", "xlink", "sketch", "illustrator", "corel"];
    for (const ns of editorNs) {
      out = out.replace(new RegExp(`\\sxmlns:${ns}="[^"]*"`, "g"), "");
    }
    for (const ns of editorNs) {
      out = out.replace(new RegExp(`\\s${ns}:[a-zA-Z_:][-a-zA-Z0-9_:]*="[^"]*"`, "g"), "");
      out = out.replace(new RegExp(`\\s${ns}:[a-zA-Z_:][-a-zA-Z0-9_:]*='[^']*'`, "g"), "");
    }
    for (const ns of editorNs) {
      // Paired elements.
      out = out.replace(
        new RegExp(`<${ns}:[a-zA-Z_:][-a-zA-Z0-9_:.]*[\\s\\S]*?</${ns}:[a-zA-Z_:][-a-zA-Z0-9_:.]*>`, "g"),
        "",
      );
      // Self-closing elements.
      out = out.replace(new RegExp(`<${ns}:[a-zA-Z_:][-a-zA-Z0-9_:.]*[\\s\\S]*?/>`, "g"), "");
    }
  }

  // 4. <metadata>...</metadata> blocks
  if (opts.removeMetadata) {
    out = out.replace(/<metadata[\s\S]*?<\/metadata>/gi, "");
    out = out.replace(/<metadata\b[^>]*\/>/gi, "");
  }

  // 5. Default attributes — fill="black", stroke="none", stroke-width="1".
  if (opts.removeDefaults) {
    out = out.replace(/\sstroke-width="1"/g, "");
    out = out.replace(/\sstroke-width='1'/g, "");
    out = out.replace(/\sstroke="none"/gi, "");
    out = out.replace(/\sstroke='none'/gi, "");
    out = out.replace(/\sfill="black"/gi, "");
    out = out.replace(/\sfill='black'/gi, "");
  }

  // 6. Round numeric coordinates inside path data and other geometry attributes
  //    to 2 decimals. Operates only inside known attribute value strings.
  if (opts.roundCoords) {
    const numericAttrs = ["d", "points", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "fx", "fy", "offset"];
    for (const attr of numericAttrs) {
      // Double-quoted values.
      out = out.replace(
        new RegExp(`(${attr})="([^"]*)"`, "gi"),
        (_m, name: string, val: string) => `${name}="${roundNumbers(val)}"`,
      );
      // Single-quoted values.
      out = out.replace(
        new RegExp(`(${attr})='([^']*)'`, "gi"),
        (_m, name: string, val: string) => `${name}='${roundNumbers(val)}'`,
      );
    }
  }

  // 7. Collapse whitespace.
  if (opts.collapseWhitespace) {
    out = out.replace(/>\s+</g, "><");
    out = out.replace(/\s{2,}/g, " ");
    out = out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join("");
  }

  return out.trim();
}

/** Round every number in a string to 2 decimals, dropping trailing zeros. */
function roundNumbers(value: string): string {
  // Match numbers including scientific notation and negative exponents.
  return value.replace(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g, (num) => {
    const n = parseFloat(num);
    if (!Number.isFinite(n)) return num;
    // Round to 2 decimals, drop trailing zeros.
    const r = Math.round(n * 100) / 100;
    return String(r);
  });
}

export function IconOptimizer({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [options, setOptions] = React.useState<OptimiseOptions>(DEFAULT_OPTIONS);
  const [error, setError] = React.useState<string | null>(null);

  const run = () => {
    if (!input.trim()) {
      setError("Paste some SVG markup first.");
      setOutput("");
      return;
    }
    if (byteLength(input) > MAX_BYTES) {
      setError("Input is larger than 1 MB — please trim it down.");
      setOutput("");
      return;
    }
    if (!/<svg[\s\S]*<\/svg>/.test(input)) {
      setError("Could not find an <svg>…</svg> block. Make sure you pasted SVG markup.");
      setOutput("");
      return;
    }
    try {
      const optimised = optimiseSvg(input, options);
      setOutput(optimised);
      setError(null);
      const saved = byteLength(input) - byteLength(optimised);
      const pct = byteLength(input) > 0 ? Math.round((saved / byteLength(input)) * 100) : 0;
      toast.success(`Optimised — saved ${formatBytes(Math.max(0, saved))} (${pct}%).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimisation failed.");
      setOutput("");
      toast.error("Optimisation failed.");
    }
  };

  const reset = () => {
    setInput("");
    setOutput("");
    setError(null);
    setOptions(DEFAULT_OPTIONS);
    toast.info("Reset.");
  };

  const loadSample = () => {
    setInput(SAMPLE);
    setError(null);
    setOutput("");
  };

  const toggleOption = (key: keyof OptimiseOptions, value: boolean) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const inputSize = byteLength(input);
  const outputSize = byteLength(output);
  const savedBytes = Math.max(0, inputSize - outputSize);
  const savedPct = inputSize > 0 ? Math.round((savedBytes / inputSize) * 100) : 0;

  // Build a data URL for the live preview.
  const previewSrc = React.useMemo(() => {
    const src = output || input;
    if (!src) return "";
    return `data:image/svg+xml;utf8,${encodeURIComponent(src)}`;
  }, [output, input]);

  const content: ToolContent = {
    intro:
      "Paste an SVG icon and strip the bloat that illustration tools leave behind — comments, XML declarations, editor namespaces (Inkscape, Sodipodi, XLink), <metadata> blocks, default attributes, redundant whitespace — and round every coordinate to 2 decimals. See before/after size, live preview, then copy or download the clean SVG.",
    tool: (
      <div className="space-y-5">
        {/* Inputs */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="io-input">Input SVG</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="io-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="<svg ...> paste your SVG icon here </svg>"
              className="min-h-[260px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input SVG"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="io-output">Optimised output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("icon-optimised.svg", output, "image/svg+xml");
                    toast.success("Downloaded icon-optimised.svg");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                </Button>
              </div>
            </div>
            <Textarea
              id="io-output"
              value={output}
              readOnly
              placeholder="Optimised SVG will appear here."
              className="min-h-[260px] font-mono text-xs"
              spellCheck={false}
              aria-label="Optimised SVG"
            />
          </div>
        </div>

        {/* Options */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Optimisation options</h2>
            <div className="flex gap-2">
              <Button size="sm" onClick={run} disabled={!input.trim()}>
                <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Optimise
              </Button>
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <OptionToggle
              label="Remove XML declaration"
              checked={options.removeXmlDecl}
              onChange={(v) => toggleOption("removeXmlDecl", v)}
            />
            <OptionToggle
              label="Remove comments"
              checked={options.removeComments}
              onChange={(v) => toggleOption("removeComments", v)}
            />
            <OptionToggle
              label="Remove editor namespaces"
              checked={options.removeEditorNs}
              onChange={(v) => toggleOption("removeEditorNs", v)}
            />
            <OptionToggle
              label="Remove <metadata>"
              checked={options.removeMetadata}
              onChange={(v) => toggleOption("removeMetadata", v)}
            />
            <OptionToggle
              label="Remove default attributes"
              checked={options.removeDefaults}
              onChange={(v) => toggleOption("removeDefaults", v)}
            />
            <OptionToggle
              label="Round coordinates to 2 dp"
              checked={options.roundCoords}
              onChange={(v) => toggleOption("roundCoords", v)}
            />
            <OptionToggle
              label="Collapse whitespace"
              checked={options.collapseWhitespace}
              onChange={(v) => toggleOption("collapseWhitespace", v)}
            />
          </div>
        </div>

        {/* Size + preview */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-5 lg:col-span-1">
            <h2 className="mb-3 text-sm font-semibold">Size</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Before</dt>
                <dd className="font-mono">{formatBytes(inputSize)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">After</dt>
                <dd className="font-mono">{formatBytes(outputSize)}</dd>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <dt>Saved</dt>
                <dd className="font-mono">
                  {formatBytes(savedBytes)} ({savedPct}%)
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border bg-card p-5 lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold">Live preview</h2>
            {previewSrc ? (
              <div className="flex flex-wrap items-center justify-center gap-6 rounded-lg bg-muted/40 p-6">
                <div className="text-center">
                  <img
                    src={previewSrc}
                    alt="SVG icon preview at 1x"
                    className="mx-auto h-12 w-12"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">48 px</p>
                </div>
                <div className="text-center">
                  <img
                    src={previewSrc}
                    alt="SVG icon preview at 2x"
                    className="mx-auto h-24 w-24"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">96 px</p>
                </div>
                <div className="text-center">
                  <img
                    src={previewSrc}
                    alt="SVG icon preview at 4x"
                    className="mx-auto h-36 w-36"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">144 px</p>
                </div>
              </div>
            ) : (
              <div className="flex h-36 items-center justify-center rounded-lg bg-muted/40 text-sm text-muted-foreground">
                Optimised preview will appear here.
              </div>
            )}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
            <span>{error}</span>
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste your SVG",
        description:
          "Drop the SVG markup exported by Figma, Illustrator, Inkscape or another vector tool into the input box. Use “Load sample” to try it out.",
      },
      {
        title: "Toggle options",
        description:
          "Enable or disable individual optimisations. The default set is safe for icons: strip comments, namespaces, metadata, defaults, round coordinates to 2 dp and collapse whitespace.",
      },
      {
        title: "Optimise and preview",
        description:
          "Click “Optimise”. The clean SVG appears on the right, with before/after sizes and a live preview at three resolutions.",
      },
      {
        title: "Copy or download",
        description:
          "Use the Copy button to copy the optimised SVG to your clipboard, or Download to save it as an .svg file.",
      },
    ],
    useCases: [
      "Strip Inkscape/Sodipodi bloat from SVG icons before committing them.",
      "Shrink icon bundles for inline use in HTML or JSX.",
      "Normalise hand-tweaked icons by rounding messy floating-point coordinates.",
      "Prepare SVG icons for use as React components or icon font source files.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>This is a regex-based optimiser — it never reorders attributes, merges paths or simplifies geometry. For deeper optimisation use SVGO locally.</li>
        <li>Coordinate rounding applies to known numeric attributes (d, points, x, y, etc.) and may affect gradients/transforms if they share attribute names.</li>
        <li>Inputs larger than 1 MB are rejected to keep the UI responsive.</li>
      </ul>
    ),
    faq: [
      {
        q: "Will this break my SVG?",
        a: "The optimiser only removes obviously safe bloat (comments, XML declaration, editor namespaces, metadata, default attributes) and rounds numbers. It never reorders or rewrites geometry. Always preview before shipping.",
      },
      {
        q: "Why round coordinates to 2 decimals?",
        a: "Most editors export coordinates with 5+ decimals (e.g. 12.34567). Rounding to 2 decimals (12.35) is invisible at any realistic icon size but saves a meaningful amount of bytes across an icon set.",
      },
      {
        q: "Does it support strokes and fills?",
        a: "Yes — it preserves all stroke and fill attributes except the defaults (fill=\"black\", stroke=\"none\", stroke-width=\"1\"), which match the SVG spec defaults and can safely be omitted.",
      },
      {
        q: "Can I use it for full illustrations, not just icons?",
        a: "Yes, but for large illustrations you’ll get better results with SVGO, which can simplify paths and deduplicate gradients — features beyond the scope of this browser-only tool.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function OptionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}
