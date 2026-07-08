"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  ArrowDownUp,
  CheckCircle2,
  Copy,
  Download,
  FileCode2,
  ListOrdered,
  RefreshCw,
  Wand2,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { downloadText } from "./_dev-helpers";

const SAMPLE = `<button class="text-white px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50">
  Click me
</button>`;

type InputMode = "auto" | "html" | "list";

export function TailwindClassSorter({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [mode, setMode] = React.useState<InputMode>("auto");
  const [stats, setStats] = React.useState<{ total: number; unique: number; duplicates: number; htmlTags: number } | null>(null);

  const sort = React.useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setStats(null);
      toast.error("Paste some HTML or a class list first.");
      return;
    }

    const looksLikeHtml = /<[a-zA-Z]/.test(input);
    const effectiveMode: "html" | "list" = mode === "auto" ? (looksLikeHtml ? "html" : "list") : mode;

    if (effectiveMode === "html") {
      // Find every class="..." or className="..." and re-sort its contents.
      let tagCount = 0;
      let allClasses: string[] = [];
      const result = input.replace(
        /(\bclass(?:Name)?\s*=\s*)(["'])([\s\S]*?)\2/g,
        (full, prefix: string, quote: string, body: string) => {
          tagCount++;
          const classes = body.split(/\s+/).filter(Boolean);
          allClasses.push(...classes);
          const sorted = sortTailwindClasses(classes);
          return `${prefix}${quote}${sorted.join(" ")}${quote}`;
        }
      );
      setOutput(result);
      const unique = new Set(allClasses).size;
      setStats({ total: allClasses.length, unique, duplicates: allClasses.length - unique, htmlTags: tagCount });
      toast.success(`Sorted classes in ${tagCount} tag(s).`);
    } else {
      const classes = input.split(/\s+/).filter(Boolean);
      const sorted = sortTailwindClasses(classes);
      setOutput(sorted.join(" "));
      const unique = new Set(classes).size;
      setStats({ total: classes.length, unique, duplicates: classes.length - unique, htmlTags: 0 });
      toast.success(`Sorted ${classes.length} class(es).`);
    }
  }, [input, mode]);

  const loadSample = () => {
    setInput(SAMPLE);
    // Pre-compute output for instant feedback.
    const tagCount = 1;
    const allClasses: string[] = [];
    const result = SAMPLE.replace(
      /(\bclass(?:Name)?\s*=\s*)(["'])([\s\S]*?)\2/g,
      (full, prefix: string, quote: string, body: string) => {
        const classes = body.split(/\s+/).filter(Boolean);
        allClasses.push(...classes);
        return `${prefix}${quote}${sortTailwindClasses(classes).join(" ")}${quote}`;
      }
    );
    setOutput(result);
    const unique = new Set(allClasses).size;
    setStats({ total: allClasses.length, unique, duplicates: allClasses.length - unique, htmlTags: tagCount });
  };

  const reset = () => {
    setInput("");
    setOutput("");
    setStats(null);
  };

  const content: ToolContent = {
    intro:
      "Paste HTML or a space-separated class list and the tool reorders every class to follow the official Tailwind order: layout → positioning → box model → typography → backgrounds → effects → transitions → transforms → interactivity → SVG. Duplicates are removed. The HTML structure is preserved — only class attributes are rewritten — so you can paste a whole component and get a clean, consistent className string back.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tw-input">Input</Label>
              <button type="button" onClick={loadSample} className="text-xs text-primary hover:underline">
                Load sample
              </button>
            </div>
            <Textarea
              id="tw-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'<div class="px-4 bg-white flex rounded">…</div>  or  "px-4 bg-white flex rounded"'}
              className="min-h-[240px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tw-output">Sorted output</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("sorted.txt", output);
                    toast.success("Downloaded sorted.txt");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="tw-output"
              value={output}
              readOnly
              placeholder="Sorted classes will appear here."
              className="min-h-[240px] font-mono text-xs"
              spellCheck={false}
              aria-label="Sorted output"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label>Input mode</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as InputMode)}
              className="flex flex-row gap-4"
            >
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="auto" id="tw-auto" /> Auto-detect
              </Label>
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="html" id="tw-html" /> HTML
              </Label>
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="list" id="tw-list" /> Class list
              </Label>
            </RadioGroup>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button size="sm" onClick={sort}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Sort classes
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={ListOrdered} label="Total classes" value={String(stats.total)} />
            <StatCard icon={CheckCircle2} label="Unique" value={String(stats.unique)} />
            <StatCard icon={Copy} label="Duplicates removed" value={String(stats.duplicates)} />
            <StatCard icon={FileCode2} label="HTML tags updated" value={String(stats.htmlTags)} />
          </div>
        )}

        <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
            <ArrowDownUp className="h-3.5 w-3.5" /> Sort order
          </div>
          <ol className="list-decimal space-y-0.5 pl-5">
            <li>Layout (display, flex, grid, container, columns, aspect-ratio, box-sizing)</li>
            <li>Positioning (position, inset, top/right/bottom/left, z-index)</li>
            <li>Box model (width, height, margin, padding, border, rounded, gap, space)</li>
            <li>Typography (font, text, leading, tracking, list, whitespace, align)</li>
            <li>Backgrounds (bg-, gradient, from-/via-/to-)</li>
            <li>Effects (shadow, opacity, ring, outline, mix-blend, filter, backdrop)</li>
            <li>Transitions (transition, duration, ease, delay, animate)</li>
            <li>Transforms (transform, rotate, scale, translate, skew, origin)</li>
            <li>Interactivity (appearance, cursor, pointer-events, resize, select, scroll)</li>
            <li>SVG (fill, stroke, stop-color)</li>
          </ol>
          <p className="mt-2">Classes outside these buckets (custom names, modifiers like hover:, dark:, sm:) are kept and sorted alphabetically within their position. Variants are sorted by the inner class order, then by the variant prefix.</p>
        </div>
      </div>
    ),
    howTo: [
      { title: "Paste HTML or a class list", description: "Drop a JSX/HTML snippet or just a space-separated string of Tailwind classes. Auto-detect picks the right mode." },
      { title: "Sort", description: "Click Sort classes. Every class attribute (or the whole list) is reordered and deduplicated." },
      { title: "Copy or download", description: "Use Copy to put the result on your clipboard, or Save to download it as sorted.txt." },
      { title: "Mix custom classes", description: "Non-Tailwind classes (e.g. my-custom-widget) are kept at the end of each class attribute so nothing is lost." },
    ],
    useCases: [
      "Standardise className order across a codebase before committing.",
      "Spot duplicate classes that snuck in during refactoring.",
      "Make code review easier by always presenting classes in the same order.",
      "Quickly find which classes are present in a long className string.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The sort order approximates the official <code>prettier-plugin-tailwindcss</code> order using category buckets. Edge cases (e.g. ordering of two classes in the same bucket) fall back to alphabetical.</li>
        <li>Arbitrary value classes like <code>bg-[#ff0000]</code> are bucketed with their prefix family.</li>
        <li>Conditional class libraries (clsx, cva, twMerge) are not evaluated — only literal class strings are sorted.</li>
        <li>Comments inside class attributes are not preserved.</li>
      </ul>
    ),
    faq: [
      { q: "Is the sort order exactly the same as prettier-plugin-tailwindcss?", a: "It is close but not identical. The official plugin uses Tailwind's internal sort key; this tool uses a 10-bucket heuristic. For most codebases the difference is invisible." },
      { q: "What about JSX className with template literals?", a: "Static class=\"…\" and className=\"…\" attributes are handled. Dynamic template literals like className={`a ${b}`} are left untouched — only the literal portion inside a quoted attribute is sorted." },
      { q: "Does it remove classes that conflict?", a: "No. It only deduplicates exact matches. Use twMerge if you need conflict resolution." },
      { q: "Are responsive and state variants sorted?", a: "Yes. Variants (sm:, lg:, hover:, dark:, …) are sorted after their base class, with the variant order following the same bucket rules." },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

/* ───────────────────────── Components ─────────────────────────────── */

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

/* ────────────────────── Tailwind sort order ───────────────────────── */

/**
 * Sort an array of Tailwind class names into the canonical order:
 * layout → positioning → box model → typography → backgrounds → effects
 * → transitions → transforms → interactivity → svg → unknown.
 */
export function sortTailwindClasses(classes: string[]): string[] {
  // Deduplicate while preserving first occurrence for stable sorting within buckets.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const c of classes) {
    if (c && !seen.has(c)) {
      seen.add(c);
      unique.push(c);
    }
  }
  // Sort by (variantRank, categoryRank, className).
  return unique.sort((a, b) => {
    const [va, ca] = classifyClass(a);
    const [vb, cb] = classifyClass(b);
    if (va !== vb) return va - vb;
    if (ca !== cb) return ca - cb;
    return a.localeCompare(b);
  });
}

/** Returns [variantRank, categoryRank] for a class. */
function classifyClass(cls: string): [number, number] {
  // Split modifiers from the base class: "hover:bg-red-500" → ["hover", "bg-red-500"]
  // Variants are separated by ':'.
  const colonIdx = cls.lastIndexOf(":");
  const variant = colonIdx >= 0 ? cls.slice(0, colonIdx + 1) : "";
  const base = colonIdx >= 0 ? cls.slice(colonIdx + 1) : cls;

  const variantRank = variantRankFor(variant);
  const categoryRank = categoryRankFor(base);
  return [variantRank, categoryRank];
}

const VARIANT_ORDER = [
  "",            // base
  "*",           // asterisk
  "first:",
  "last:",
  "only:",
  "odd:",
  "even:",
  "first-of-type:",
  "last-of-type:",
  "only-of-type:",
  "visited:",
  "target:",
  "open:",
  "default:",
  "checked:",
  "indeterminate:",
  "placeholder-shown:",
  "autofill:",
  "optional:",
  "required:",
  "valid:",
  "invalid:",
  "in-range:",
  "out-of-range:",
  "read-only:",
  "read-write:",
  "empty:",
  "before:",
  "after:",
  "marker:",
  "selection:",
  "file:",
  "placeholder:",
  "backdrop:",
  "first-letter:",
  "first-line:",
  "sm:",
  "md:",
  "lg:",
  "xl:",
  "2xl:",
  "3xl:",
  "4xl:",
  "5xl:",
  "6xl:",
  "7xl:",
  "8xl:",
  "9xl:",
  "dark:",
  "light:",
  "rtl:",
  "ltr:",
  "hover:",
  "focus:",
  "focus-within:",
  "focus-visible:",
  "active:",
  "enabled:",
  "disabled:",
  "inert:",
  "group-",
  "peer-",
  "aria-",
  "data-",
  "supports-",
  "motion-",
  "print:",
  "forced-colors:",
  "contrast-",
  "orientation-",
  "portrait:",
  "landscape:",
];

function variantRankFor(variant: string): number {
  if (!variant) return 0;
  // Try exact match first.
  const idx = VARIANT_ORDER.indexOf(variant);
  if (idx >= 0) return idx;
  // Group variants (group-hover:, peer-focus:, aria-disabled:, data-[...]:) — match by prefix.
  for (let i = 0; i < VARIANT_ORDER.length; i++) {
    const v = VARIANT_ORDER[i];
    if (v.endsWith("-") && variant.startsWith(v)) return i;
  }
  // Unknown variant — sort after all known variants.
  return VARIANT_ORDER.length + variant.length;
}

/**
 * Map a base class (no variant) to one of the 10 official category buckets.
 * Returns 0..9 for known buckets, 10 for unknown/custom classes.
 */
function categoryRankFor(base: string): number {
  // Layout
  if (
    /^(container|columns-\d+|columns-auto|columns-3xs|columns-2xs|columns-xs|columns-sm|columns-md|columns-lg|columns-xl|columns-2xl|columns-3xl|columns-4xl|columns-5xl|columns-6xl|columns-7xl)$/.test(base) ||
    /^(block|inline-block|inline|flex|inline-flex|table|inline-table|table-caption|table-cell|table-column|table-column-group|table-footer-group|table-header-group|table-row-group|table-row|flow-root|grid|inline-grid|contents|list-item|hidden)$/.test(base) ||
    /^(float-right|float-left|float-none|clear-left|clear-right|clear-both|clear-none)$/.test(base) ||
    /^(object-contain|object-cover|object-fill|object-none|object-scale-down|object-(bottom|center|left|right|top|left-bottom|left-top|right-bottom|right-top))$/.test(base) ||
    /^(overflow-auto|overflow-hidden|overflow-clip|overflow-visible|overflow-scroll|overflow-x-auto|overflow-y-auto|overflow-x-hidden|overflow-y-hidden|overflow-x-clip|overflow-y-clip|overflow-x-visible|overflow-y-visible|overflow-x-scroll|overflow-y-scroll|overscroll-auto|overscroll-contain|overscroll-none|overscroll-y-auto|overscroll-y-contain|overscroll-y-none|overscroll-x-auto|overscroll-x-contain|overscroll-x-none)$/.test(base) ||
    /^(box-border|box-content)$/.test(base) ||
    /^(aspect-auto|aspect-square|aspect-video|aspect-\[.*\])$/.test(base) ||
    /^(columns-.*)$/.test(base) ||
    /^(break-before-auto|break-before-avoid|break-before-all|break-before-avoid-page|break-before-page|break-before-left|break-before-right|break-inside-auto|break-inside-avoid|break-inside-avoid-page|break-inside-avoid-column|break-after-auto|break-after-avoid|break-after-all|break-after-avoid-page|break-after-page|break-after-left|break-after-right|box-decoration-clone|box-decoration-slice)$/.test(base)
  ) return 0;

  // Positioning
  if (
    /^(static|fixed|absolute|relative|sticky)$/.test(base) ||
    /^(inset-0|inset-auto|inset-x-0|inset-y-0|inset-x-auto|inset-y-auto|inset-\[.*\]|(top|right|bottom|left)-(0|auto|px|\[.*\]|[\d.]+))$/.test(base) ||
    /^(z-\d+|z-auto|z-\[.*\])$/.test(base)
  ) return 1;

  // Box model
  if (
    /^(w-\d+|w-auto|w-px|w-full|w-screen|w-min|w-max|w-fit|w-\[.*\])$/.test(base) ||
    /^(min-w-\d+|min-w-0|min-w-full|min-w-min|min-w-max|min-w-fit|min-w-\[.*\])$/.test(base) ||
    /^(max-w-\d+|max-w-0|max-w-none|max-w-full|max-w-min|max-w-max|max-w-fit|max-w-prose|max-w-screen-sm|max-w-screen-md|max-w-screen-lg|max-w-screen-xl|max-w-screen-2xl|max-w-\[.*\])$/.test(base) ||
    /^(h-\d+|h-auto|h-px|h-full|h-screen|h-min|h-max|h-fit|h-\[.*\])$/.test(base) ||
    /^(min-h-\d+|min-h-0|min-h-full|min-h-screen|min-h-\[.*\])$/.test(base) ||
    /^(max-h-\d+|max-h-0|max-h-full|max-h-screen|max-h-\[.*\])$/.test(base) ||
    /^(m-\d+|m-auto|m-px|m-\[.*\]|mx-\d+|mx-auto|mx-px|my-\d+|my-auto|my-px|mt-|mr-|mb-|ml-|ms-|me-)$/.test(base) ||
    /^(p-\d+|p-px|px-\d+|py-\d+|pt-|pr-|pb-|pl-|ps-|pe-)/.test(base) ||
    /^(space-x-|space-y-|space-x-reverse|space-y-reverse)/.test(base) ||
    /^(border|border-\d+|border-x-|border-y-|border-t-|border-r-|border-b-|border-l-|border-solid|border-dashed|border-dotted|border-double|border-hidden|border-none|border-separate|border-collapse)/.test(base) ||
    /^(rounded|rounded-|rounded-\[.*\])$/.test(base) ||
    /^(divide-x-|divide-y-|divide-|divide-x-reverse|divide-y-reverse)/.test(base) ||
    /^(ring-\d+|ring-1|ring-0|ring|ring-inset|ring-)/.test(base) ||
    /^(gap-\d+|gap-px|gap-x-|gap-y-)/.test(base)
  ) return 2;

  // Typography
  if (
    /^(font-(sans|serif|mono)|font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)|font-\[.*\])$/.test(base) ||
    /^(text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)|text-\[.*\])$/.test(base) ||
    /^(text-(left|center|right|justify|start|end))$/.test(base) ||
    /^(text-(transparent|current|black|white|\w+-\d+|inherit))$/.test(base) ||
    /^(uppercase|lowercase|capitalize|normal-case|truncate|text-ellipsis|text-clip)$/.test(base) ||
    /^(italic|not-italic|underline|overline|line-through|no-underline|decoration-|decoration-solid|decoration-double|decoration-dotted|decoration-dashed|decoration-wavy|underline-offset-|antialiased|subpixel-antialiased)$/.test(base) ||
    /^(leading-|tracking-|indent-|align-)/.test(base) ||
    /^(whitespace-normal|whitespace-nowrap|whitespace-pre|whitespace-pre-line|whitespace-pre-wrap|break-normal|break-words|break-all|hyphens-auto|hyphens-manual|content-none|content-\[.*\])$/.test(base) ||
    /^(list-none|list-disc|list-decimal|list-inside|list-outside|list-image-)/.test(base) ||
    /^(placeholder-)/.test(base)
  ) return 3;

  // Backgrounds
  if (
    /^(bg-(transparent|current|black|white|\w+-\d+|\w+-\w+|\[.*\]|fixed|local|scroll|clip-border|clip-padding|clip-content|clip-text|bottom|center|left|right|top|left-bottom|left-top|right-bottom|right-top|repeat|no-repeat|repeat-x|repeat-y|round|space|cover|contain|blend-))/.test(base) ||
    /^(from-|via-|to-)/.test(base) ||
    /^(bg-gradient-to-|bg-none|bg-image-)/.test(base)
  ) return 4;

  // Effects
  if (
    /^(shadow|shadow-|shadow-\[.*\])$/.test(base) ||
    /^(opacity-\d+|opacity-\[.*\])$/.test(base) ||
    /^(mix-blend-|bg-clip)/.test(base) ||
    /^(outline|outline-|outline-none|outline-\[.*\])$/.test(base) ||
    /^(ring-offset-)/.test(base) ||
    /^(blur-|brightness-|contrast-|drop-shadow-|grayscale-|hue-rotate-|invert-|saturate-|sepia-|filter|filter-none|backdrop-blur-|backdrop-brightness-|backdrop-contrast-|backdrop-grayscale-|backdrop-hue-rotate-|backdrop-invert-|backdrop-opacity-|backdrop-saturate-|backdrop-sepia-|backdrop-filter|backdrop-filter-none)/.test(base)
  ) return 5;

  // Transitions
  if (
    /^(transition|transition-none|transition-all|transition-colors|transition-opacity|transition-shadow|transition-transform|transition-\[.*\])$/.test(base) ||
    /^(duration-\d+|duration-\[.*\])$/.test(base) ||
    /^(ease-|ease-\[.*\])$/.test(base) ||
    /^(delay-\d+|delay-\[.*\])$/.test(base) ||
    /^(animate-|animate-\[.*\])$/.test(base)
  ) return 6;

  // Transforms
  if (
    /^(transform|transform-gpu|transform-none)$/.test(base) ||
    /^(rotate-|scale-|scale-x-|scale-y-|translate-x-|translate-y-|skew-x-|skew-y-)/.test(base) ||
    /^(origin-center|origin-top|origin-bottom|origin-left|origin-right|origin-top-left|origin-top-right|origin-bottom-left|origin-bottom-right|origin-\[.*\])$/.test(base) ||
    /^(perspective-|perspective-\[.*\])$/.test(base) ||
    /^(transform-\[.*\])$/.test(base)
  ) return 7;

  // Interactivity
  if (
    /^(appearance-none|cursor-|pointer-events-|resize-|resize|select-|scroll-auto|scroll-smooth|snap-|scroll-mt-|scroll-mr-|scroll-mb-|scroll-ml-|scroll-mx-|scroll-my-|scroll-pt-|scroll-pr-|scroll-pb-|scroll-pl-|scroll-px-|scroll-py-|touch-|accent-|caret-|will-change-)/.test(base) ||
    /^(sr-only|not-sr-only)$/.test(base)
  ) return 8;

  // SVG
  if (
    /^(fill-|stroke-|stroke-\d+|stroke-\[.*\]|stop-)/.test(base)
  ) return 9;

  // Unknown / custom
  return 10;
}
