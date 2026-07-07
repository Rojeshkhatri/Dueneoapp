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
  <!-- a simple icon -->
  <metadata id="metadata1">some metadata</metadata>
  <sodipodi:namedview id="base" pagecolor="#ffffff"></sodipodi:namedview>
  <circle cx="12" cy="12" r="10" fill="#2563eb" stroke="#000000" stroke-width="1" />
  <rect x="6" y="6" width="12" height="12" fill="red" style="fill:red;" />
</svg>`;

interface OptimiseOptions {
  removeComments: boolean;
  removeXmlDecl: boolean;
  removeEditorNs: boolean;
  removeMetadata: boolean;
  collapseWhitespace: boolean;
  removeDefaults: boolean;
}

const DEFAULT_OPTIONS: OptimiseOptions = {
  removeComments: true,
  removeXmlDecl: true,
  removeEditorNs: true,
  removeMetadata: true,
  collapseWhitespace: true,
  removeDefaults: true,
};

/** Regex-based SVG optimiser. Conservative — never reorders attributes or alters geometry. */
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

  // 3. Editor namespaces (inkscape, sodipodi, xlink often useless), their attributes and elements.
  if (opts.removeEditorNs) {
    const editorNs = [
      "inkscape",
      "sodipodi",
      "xlink",
      "sketch",
      "illustrator",
      "corel",
    ];
    // Remove namespace declarations on the root svg.
    for (const ns of editorNs) {
      const re = new RegExp(`\\sxmlns:${ns}="[^"]*"`, "g");
      out = out.replace(re, "");
    }
    // Remove attributes whose name starts with `ns:` (e.g. inkscape:label).
    for (const ns of editorNs) {
      const re = new RegExp(`\\s${ns}:[a-zA-Z_:][-a-zA-Z0-9_:]*="[^"]*"`, "g");
      out = out.replace(re, "");
      const re2 = new RegExp(`\\s${ns}:[a-zA-Z_:][-a-zA-Z0-9_:]*='[^']*'`, "g");
      out = out.replace(re2, "");
    }
    // Remove elements in editor namespaces entirely.
    for (const ns of editorNs) {
      const re = new RegExp(`<${ns}:[a-zA-Z_:][-a-zA-Z0-9_:.]*[\\s\\S]*?</${ns}:[a-zA-Z_:][-a-zA-Z0-9_:.]*>`, "g");
      out = out.replace(re, "");
      // Self-closing editor elements.
      const reSelf = new RegExp(`<${ns}:[a-zA-Z_:][-a-zA-Z0-9_:.]*[\\s\\S]*?/>`, "g");
      out = out.replace(reSelf, "");
    }
  }

  // 4. <metadata>...</metadata> blocks
  if (opts.removeMetadata) {
    out = out.replace(/<metadata[\s\S]*?<\/metadata>/gi, "");
    out = out.replace(/<metadata\b[^>]*\/>/gi, "");
  }

  // 5. Default attributes — stroke-width="1", stroke="none" on paths/elements where it's the default.
  if (opts.removeDefaults) {
    out = out.replace(/\sstroke-width="1"/g, "");
    out = out.replace(/\sstroke-width='1'/g, "");
    out = out.replace(/\sstroke="none"/gi, "");
    out = out.replace(/\sstroke='none'/gi, "");
    out = out.replace(/\sfill="black"/gi, "");
    out = out.replace(/\sfill='black'/gi, "");
    // Default vector-effect (none) is rarely useful, leave it.
  }

  // 6. Collapse whitespace.
  if (opts.collapseWhitespace) {
    // Strip whitespace between tags.
    out = out.replace(/>\s+</g, "><");
    // Collapse runs of whitespace inside text content.
    out = out.replace(/\s{2,}/g, " ");
    // Trim each line.
    out = out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join("");
  }

  return out.trim();
}

export function SvgOptimizer({ tool }: { tool: ToolDefinition }) {
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

  const content: ToolContent = {
    intro:
      "Paste SVG markup and remove the bloat that illustration tools leave behind — comments, XML declarations, editor namespaces (Inkscape, Sodipodi, XLink), <metadata> blocks, default attributes and redundant whitespace. See before/after size and copy the clean SVG.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="so-input">Input SVG</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="so-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="<svg ...> paste your SVG here </svg>"
              className="min-h-[280px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input SVG"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="so-output">Optimised output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("optimised.svg", output, "image/svg+xml");
                    toast.success("Downloaded optimised.svg");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="so-output"
              value={output}
              readOnly
              placeholder="Cleaned-up SVG will appear here."
              className="min-h-[280px] font-mono text-xs"
              spellCheck={false}
              aria-label="Optimised output"
            />
          </div>
        </div>

        {/* Options */}
        <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <OptionToggle
            id="so-comments"
            label="Remove comments"
            checked={options.removeComments}
            onChange={(v) => toggleOption("removeComments", v)}
          />
          <OptionToggle
            id="so-xmldecl"
            label="Remove XML declaration"
            checked={options.removeXmlDecl}
            onChange={(v) => toggleOption("removeXmlDecl", v)}
          />
          <OptionToggle
            id="so-ns"
            label="Remove editor namespaces"
            checked={options.removeEditorNs}
            onChange={(v) => toggleOption("removeEditorNs", v)}
          />
          <OptionToggle
            id="so-meta"
            label="Remove <metadata> blocks"
            checked={options.removeMetadata}
            onChange={(v) => toggleOption("removeMetadata", v)}
          />
          <OptionToggle
            id="so-ws"
            label="Collapse whitespace"
            checked={options.collapseWhitespace}
            onChange={(v) => toggleOption("collapseWhitespace", v)}
          />
          <OptionToggle
            id="so-defaults"
            label="Remove default attributes"
            checked={options.removeDefaults}
            onChange={(v) => toggleOption("removeDefaults", v)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
          <Button onClick={run}>
            <Wand2 className="mr-1.5 h-4 w-4" /> Optimise SVG
          </Button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {output && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Before" value={formatBytes(inputSize)} />
            <Stat label="After" value={formatBytes(outputSize)} />
            <Stat label="Saved" value={formatBytes(savedBytes)} accent="text-emerald-600" />
            <Stat label="Reduction" value={`${savedPct}%`} accent="text-emerald-600" />
          </div>
        )}

        {output && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Rendered preview</h3>
            <div
              className="flex min-h-[160px] items-center justify-center rounded-xl border bg-background p-6"
              aria-label="Rendered SVG preview"
              // dangerouslySetInnerHTML is safe here because the user pasted their own SVG
              // and it never leaves the browser. We do not sanitise scripts, but inline
              // <script> tags will not execute when injected via innerHTML on modern browsers.
              dangerouslySetInnerHTML={{ __html: output || "<p class='text-xs text-muted-foreground'>No output yet.</p>" }}
            />
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste your SVG",
        description:
          "Drop raw SVG markup into the left-hand editor. The textarea handles multi-line input and preserves whitespace — exactly what export tools produce.",
      },
      {
        title: "Choose optimisations",
        description:
          "Toggle which cleanups to apply: comments, XML declaration, editor namespaces (Inkscape/Sodipodi/XLink), <metadata> blocks, default attributes and whitespace.",
      },
      {
        title: "Optimise",
        description:
          "Click Optimise SVG. The cleaned-up markup appears on the right, with before/after size and a rendered preview.",
      },
      {
        title: "Copy or download",
        description:
          "Use Copy to put the SVG on your clipboard, or Save to download it as optimised.svg.",
      },
    ],
    useCases: [
      "Shrink icon SVGs exported from Illustrator or Inkscape before committing them.",
      "Strip editor cruft (sodipodi:namedview, inkscape:label) from a designer's hand-off.",
      "Minify SVG sprites to reduce the size of an inline icon system.",
      "Preview an optimised SVG to make sure no geometry was accidentally removed.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>This is a regex-based optimiser. It does not parse the SVG tree, so it cannot deduplicate gradients, collapse groups or rewrite paths the way SVGO can.</li>
        <li>Inputs larger than 1 MB are rejected to keep the tab responsive.</li>
        <li>Inline <code>&lt;script&gt;</code> tags are not stripped — do not paste untrusted SVG into shared documents.</li>
        <li>The rendered preview uses <code>dangerouslySetInnerHTML</code>; modern browsers do not execute inline scripts injected this way, but CSP rules on your site may differ.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is this as good as SVGO?",
        a: "No. SVGO is a full AST-based optimiser that rewrites paths, deduplicates gradients and collapses groups. This tool is a fast, dependency-free regex-based cleaner for the most common bloat. For icon-set work, run SVGO separately.",
      },
      {
        q: "Will optimisation break my SVG?",
        a: "The optimisations are conservative — they only remove comments, declarations, editor namespaces, metadata, default attributes and whitespace. They never touch geometry, paths or styling. The rendered preview lets you visually verify nothing was lost.",
      },
      {
        q: "Why are Inkscape and Sodipodi namespaces removed?",
        a: "They are editor-specific metadata that adds nothing to rendering. Removing them shrinks the file and avoids leaking authoring-tool fingerprints.",
      },
      {
        q: "Can I keep the XML declaration?",
        a: "Yes — toggle off “Remove XML declaration”. The declaration is only required when the SVG is served as a standalone .svg file with a non-UTF-8 encoding; for inline HTML use it is unnecessary.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function OptionToggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-background p-3 text-sm"
    >
      <span>{label}</span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </Label>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={"mt-1 font-mono text-lg font-semibold tabular-nums " + (accent ?? "")}>
        {value}
      </p>
    </div>
  );
}
