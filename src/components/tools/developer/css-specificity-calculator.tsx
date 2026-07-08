"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  Code2,
  GitCompare,
  Hash,
  RefreshCw,
  Scale,
  Sparkles,
  Square,
  Type,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { stripCssComments } from "./_dev2-helpers";

interface Specificity {
  /** D — inline styles (1 if the rule is an inline style attribute, else 0). */
  inline: number;
  /** A — ID selectors. */
  ids: number;
  /** B — class, attribute and pseudo-class selectors. */
  classes: number;
  /** C — element and pseudo-element selectors. */
  elements: number;
}

interface ParseResult {
  specificity: Specificity;
  breakdown: { token: string; kind: "id" | "class" | "attr" | "pseudo-class" | "pseudo-element" | "element" | "other"; counts: boolean }[];
  error?: string;
}

export function CssSpecificityCalculator({ tool }: { tool: ToolDefinition }) {
  const [selA, setSelA] = React.useState("#nav .item:hover");
  const [selB, setSelB] = React.useState("div.list > a.link");
  const [inlineA, setInlineA] = React.useState(false);
  const [inlineB, setInlineB] = React.useState(false);
  const [single, setSingle] = React.useState("");

  const resA = React.useMemo(() => (selA.trim() ? parseSelector(selA) : null), [selA]);
  const resB = React.useMemo(() => (selB.trim() ? parseSelector(selB) : null), [selB]);
  const resSingle = React.useMemo(() => (single.trim() ? parseSelector(single) : null), [single]);

  const comparison = React.useMemo(() => {
    if (!resA || !resB) return null;
    const scoreA: Specificity = inlineA ? { inline: 1, ids: 0, classes: 0, elements: 0 } : resA.specificity;
    const scoreB: Specificity = inlineB ? { inline: 1, ids: 0, classes: 0, elements: 0 } : resB.specificity;
    const cmp = compareSpecificity(scoreA, scoreB);
    return { scoreA, scoreB, winner: cmp > 0 ? "A" : cmp < 0 ? "B" : "tie" as const };
  }, [resA, resB, inlineA, inlineB]);

  const reset = () => {
    setSelA("#nav .item:hover");
    setSelB("div.list > a.link");
    setSingle("");
    setInlineA(false);
    setInlineB(false);
  };

  const content: ToolContent = {
    intro:
      "Type any CSS selector and see its specificity broken down by the (A, B, C, D) tuple: A = ID count, B = class + attribute + pseudo-class count, C = element + pseudo-element count, D = inline-style override. The parser understands :not(), :is(), :where(), :nth-child() and the legacy single-colon pseudo-elements. Compare two selectors side by side to see which one wins and why.",
    tool: (
      <div className="space-y-5">
        <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Single selector</h3>
          </div>
          <div className="relative">
            <Code2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              value={single}
              onChange={(e) => setSingle(e.target.value)}
              placeholder="e.g. #main .card[data-active] > h2::before"
              className="pl-8 font-mono"
              aria-label="Single selector"
            />
          </div>
          {resSingle?.error && (
            <p className="text-xs text-destructive"><AlertTriangle className="mr-1 inline h-3 w-3" />{resSingle.error}</p>
          )}
          {resSingle && !resSingle.error && (
            <div className="grid gap-3 sm:grid-cols-2">
              <ScoreCard spec={resSingle.specificity} inline={false} />
              <BreakdownCard breakdown={resSingle.breakdown} />
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-background p-4 space-y-4">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Side-by-side comparison</h3>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={reset}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SelectorPanel
              label="Selector A"
              value={selA}
              onChange={setSelA}
              inline={inlineA}
              onInlineChange={setInlineA}
              result={resA}
              highlight={comparison?.winner === "A"}
            />
            <SelectorPanel
              label="Selector B"
              value={selB}
              onChange={setSelB}
              inline={inlineB}
              onInlineChange={setInlineB}
              result={resB}
              highlight={comparison?.winner === "B"}
            />
          </div>

          {comparison && (
            <div className={`rounded-lg border p-4 text-sm ${
              comparison.winner === "tie"
                ? "border-border bg-muted/40"
                : "border-primary/40 bg-primary/5"
            }`}>
              <div className="flex flex-wrap items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {comparison.winner === "tie"
                    ? "Both selectors have equal specificity — source order decides the winner."
                    : comparison.winner === "A"
                    ? "Selector A wins"
                    : "Selector B wins"}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <ScoreComparison label="A" spec={comparison.scoreA} wins={comparison.winner === "A"} />
                <ScoreComparison label="B" spec={comparison.scoreB} wins={comparison.winner === "B"} />
              </div>
              {comparison.winner === "tie" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  When two selectors have the same specificity, the rule declared <strong>later</strong> in the
                  stylesheet wins. Add an ID or a class to break the tie deterministically.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
            <Hash className="h-3.5 w-3.5" /> How specificity is calculated
          </div>
          <ul className="list-disc space-y-0.5 pl-5">
            <li><strong>A</strong> = number of ID selectors (<code>#nav</code>).</li>
            <li><strong>B</strong> = number of class selectors (<code>.btn</code>), attribute selectors (<code>[type]</code>) and pseudo-classes (<code>:hover</code>, <code>:nth-child(2)</code>).</li>
            <li><strong>C</strong> = number of element selectors (<code>div</code>) and pseudo-elements (<code>::before</code>).</li>
            <li><strong>D</strong> = 1 for an inline <code>style=""</code> attribute, which beats any selector. <code>!important</code> is not modelled here.</li>
            <li><code>:is()</code> / <code>:matches()</code> take the specificity of their most specific argument; <code>:not()</code> counts its argument; <code>:where()</code> is always 0.</li>
            <li>The universal selector <code>*</code> and combinators (<code>&gt;</code>, <code>+</code>, <code>~</code>, space) contribute 0.</li>
          </ul>
        </div>
      </div>
    ),
    howTo: [
      { title: "Type a selector", description: "Enter any CSS selector in the single-selector box to see its specificity instantly." },
      { title: "Compare two", description: "Put one selector in each panel of the side-by-side comparison. The winner is highlighted." },
      { title: "Toggle inline", description: "Tick 'Treat as inline style' to model a style=\"\" attribute, which beats any selector." },
      { title: "Read the breakdown", description: "Each panel lists every token and which bucket it counts towards." },
    ],
    useCases: [
      "Figure out why your CSS rule is being overridden by another.",
      "Teach or learn the CSS specificity algorithm.",
      "Audit a stylesheet for over-specific selectors (lots of IDs) before refactoring.",
      "Decide whether to add a class, an attribute or an ID to win a tie." ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li><code>!important</code> is not modelled — it overrides specificity and would need its own comparison layer.</li>
        <li>Nested <code>:not(:not(...))</code> and deeply recursive <code>:is()</code> are handled but very exotic syntax may fall back to a best-effort count.</li>
        <li>Source order is not tracked — when specificity ties, the tool says so but does not know which rule appears later in your stylesheet.</li>
        <li>The parser is hand-rolled for selectors only; at-rules and declaration blocks are ignored.</li>
      </ul>
    ),
    faq: [
      { q: "Does !important count?", a: "No. !important creates a separate cascade layer above all specificity. This tool models the (D, A, B, C) tuple only." },
      { q: "Why does :where() always show 0?", a: "The :where() pseudo-class is defined to have zero specificity, which is its whole purpose. Use it to add hooks that never override your styles." },
      { q: "How is :is() different from :not()?", a: ":is() takes the specificity of its most specific argument. :not() also counts its argument's specificity. :where() is like :is() but always 0." },
      { q: "What beats an inline style?", a: "Only !important. A normal selector never beats an inline style attribute." },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

/* ───────────────────────── Components ─────────────────────────────── */

function ScoreCard({ spec, inline }: { spec: Specificity; inline: boolean }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Sparkles className="h-3 w-3" /> Specificity
      </div>
      <div className="flex items-center gap-2">
        <ScoreBadge label="D" value={spec.inline} active={inline || spec.inline > 0} icon={Square} hint="inline" />
        <ScoreBadge label="A" value={spec.ids} active={spec.ids > 0} icon={Hash} hint="IDs" />
        <ScoreBadge label="B" value={spec.classes} active={spec.classes > 0} icon={Sparkles} hint="classes / attrs / pseudo-classes" />
        <ScoreBadge label="C" value={spec.elements} active={spec.elements > 0} icon={Type} hint="elements / pseudo-elements" />
      </div>
      <div className="mt-2 font-mono text-xs text-muted-foreground">
        Score: ({spec.inline}, {spec.ids}, {spec.classes}, {spec.elements})
      </div>
    </div>
  );
}

function ScoreBadge({ label, value, active, icon: Icon, hint }: { label: string; value: number; active: boolean; icon: React.ComponentType<{ className?: string }>; hint: string }) {
  return (
    <div className={`flex-1 rounded-md border p-2 text-center ${active ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20 opacity-60"}`}>
      <div className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-2.5 w-2.5" /> {label}
      </div>
      <div className={`text-2xl font-bold tabular-nums ${active ? "text-primary" : "text-muted-foreground"}`}>{value}</div>
      <div className="text-[9px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function BreakdownCard({ breakdown }: { breakdown: ParseResult["breakdown"] }) {
  const counted = breakdown.filter((b) => b.counts);
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Type className="h-3 w-3" /> Token breakdown ({counted.length} counted)
      </div>
      {breakdown.length === 0 ? (
        <p className="text-xs text-muted-foreground">No tokens.</p>
      ) : (
        <ul className="max-h-40 space-y-0.5 overflow-y-auto thin-scroll text-xs">
          {breakdown.map((b, i) => (
            <li key={i} className="flex items-center gap-2">
              <code className="font-mono text-[11px]">{b.token || "(empty)"}</code>
              <Badge variant="outline" className="text-[10px]">{b.kind}</Badge>
              {!b.counts && <span className="text-[10px] text-muted-foreground">→ 0</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SelectorPanel({
  label, value, onChange, inline, onInlineChange, result, highlight,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inline: boolean;
  onInlineChange: (v: boolean) => void;
  result: ParseResult | null;
  highlight: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-primary/60 bg-primary/5" : "bg-muted/20"}`}>
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
        <label className="flex items-center gap-1.5 text-xs">
          <Checkbox checked={inline} onCheckedChange={(v) => onInlineChange(v === true)} />
          Treat as inline style
        </label>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. #app .modal.open"
        className="font-mono"
        aria-label={label}
      />
      {result?.error && (
        <p className="mt-2 text-xs text-destructive"><AlertTriangle className="mr-1 inline h-3 w-3" />{result.error}</p>
      )}
      {result && !result.error && (
        <div className="mt-2">
          <ScoreCard spec={inline ? { inline: 1, ids: 0, classes: 0, elements: 0 } : result.specificity} inline={inline} />
        </div>
      )}
    </div>
  );
}

function ScoreComparison({ label, spec, wins }: { label: string; spec: Specificity; wins: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${wins ? "border-primary/60 bg-primary/10" : "border-border bg-muted/20"}`}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        {wins && <Badge variant="default" className="text-[10px]">winner</Badge>}
      </div>
      <div className="font-mono text-sm">
        ({spec.inline}, {spec.ids}, {spec.classes}, {spec.elements})
      </div>
    </div>
  );
}

/* ─────────────────────── Specificity parser ───────────────────────── */

const PSEUDO_ELEMENTS = new Set([
  "before", "after", "first-line", "first-letter",
  "selection", "placeholder", "marker", "backdrop",
  "file-selector-button", "cue", "grammar-error", "spelling-error",
  "view-transition", "view-transition-group", "view-transition-image-pair",
  "view-transition-old", "view-transition-new",
  "part", "slotted",
]);

/**
 * Parse a CSS selector and compute its specificity.
 * Handles comma lists (returns the max), :not(), :is()/:matches(), :where(),
 * attribute selectors and the legacy single-colon pseudo-elements.
 */
export function parseSelector(input: string): ParseResult {
  const src = stripCssComments(input).trim();
  if (!src) {
    return { specificity: { inline: 0, ids: 0, classes: 0, elements: 0 }, breakdown: [], error: "Empty selector." };
  }

  const breakdown: ParseResult["breakdown"] = [];
  let ids = 0, classes = 0, elements = 0;

  // Split on top-level commas (each part is a separate selector; we sum them,
  // which matches the spec — a rule's specificity is computed per selector
  // and the browser uses the highest when matched. For display we sum.)
  // Actually per spec, each comma-separated selector has its own specificity;
  // the rule applies if any matches, and the matching one's specificity wins.
  // For a calculator we take the MAX across comma-separated parts so the
  // "strongest arm" is shown.
  const parts = splitOnCommas(src);
  const perPart: Specificity[] = [];

  for (const part of parts) {
    const sp = computeOne(part.trim(), breakdown);
    perPart.push(sp);
  }

  // Use the max across comma-separated parts.
  const max = perPart.reduce((acc, sp) => {
    const c = compareSpecificity(sp, acc);
    return c > 0 ? sp : acc;
  }, perPart[0] ?? { inline: 0, ids: 0, classes: 0, elements: 0 });

  ids = max.ids;
  classes = max.classes;
  elements = max.elements;

  return {
    specificity: { inline: 0, ids, classes, elements },
    breakdown,
  };
}

function computeOne(selector: string, breakdown: ParseResult["breakdown"]): Specificity {
  let ids = 0, classes = 0, elements = 0;
  let i = 0;
  const s = selector;

  const readUntilMatching = (open: string, close: string): string => {
    // Assumes s[i] === open. Returns the inner content (without the closing).
    let depth = 1;
    let out = "";
    i++; // consume open
    while (i < s.length && depth > 0) {
      const ch = s[i];
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) { i++; break; }
      }
      out += ch;
      i++;
    }
    return out;
  };

  while (i < s.length) {
    const ch = s[i];

    // Combinators and whitespace — skip.
    if (/\s/.test(ch) || ch === ">" || ch === "+" || ch === "~") {
      i++;
      continue;
    }

    // ID: #name
    if (ch === "#") {
      let name = "";
      i++;
      while (i < s.length && /[A-Za-z0-9_-]/.test(s[i])) name += s[i++];
      ids++;
      breakdown.push({ token: `#${name}`, kind: "id", counts: true });
      continue;
    }

    // Class: .name
    if (ch === ".") {
      let name = "";
      i++;
      while (i < s.length && /[A-Za-z0-9_-]/.test(s[i])) name += s[i++];
      classes++;
      breakdown.push({ token: `.${name}`, kind: "class", counts: true });
      continue;
    }

    // Attribute: [attr=value]
    if (ch === "[") {
      const inner = readUntilMatching("[", "]");
      classes++;
      breakdown.push({ token: `[${inner}]`, kind: "attr", counts: true });
      continue;
    }

    // Pseudo: :: or :
    if (ch === ":") {
      // Count colons.
      let colons = 0;
      while (s[i] === ":") { colons++; i++; }
      // Read the pseudo name.
      let name = "";
      while (i < s.length && /[A-Za-z0-9_-]/.test(s[i])) name += s[i++];
      name = name.toLowerCase();
      // Functional? Look for '('.
      let arg = "";
      if (s[i] === "(") {
        arg = readUntilMatching("(", ")");
      }
      const isFunctional = arg !== "" || s[i - 1] === ")";

      // Decide pseudo-element vs pseudo-class.
      const isPseudoElement = colons === 2 || (colons === 1 && PSEUDO_ELEMENTS.has(name));

      if (isPseudoElement) {
        elements++;
        breakdown.push({ token: `${":".repeat(colons)}${name}${arg ? `(${arg})` : ""}`, kind: "pseudo-element", counts: true });
        continue;
      }

      // Pseudo-class — handle special functional ones.
      if (isFunctional && (name === "not" || name === "is" || name === "matches" || name === "where")) {
        // Recurse into the argument.
        if (name === "where") {
          // Always 0.
          breakdown.push({ token: `:${name}(${arg})`, kind: "pseudo-class", counts: false });
          continue;
        }
        // For :is()/:matches() and :not(), the argument's specificity counts.
        // For :is() take the MAX of comma-separated args; for :not() sum the single arg.
        const argParts = splitOnCommas(arg);
        if (name === "not") {
          // :not() argument counts as-is (single selector expected, but we handle lists).
          let subMax: Specificity = { inline: 0, ids: 0, classes: 0, elements: 0 };
          for (const p of argParts) {
            const sp = computeOne(p.trim(), breakdown);
            subMax = compareSpecificity(sp, subMax) > 0 ? sp : subMax;
          }
          ids += subMax.ids;
          classes += subMax.classes;
          elements += subMax.elements;
        } else {
          // :is() / :matches() — take the MAX of the arguments.
          let subMax: Specificity = { inline: 0, ids: 0, classes: 0, elements: 0 };
          for (const p of argParts) {
            const sp = computeOne(p.trim(), breakdown);
            subMax = compareSpecificity(sp, subMax) > 0 ? sp : subMax;
          }
          ids += subMax.ids;
          classes += subMax.classes;
          elements += subMax.elements;
        }
        breakdown.push({ token: `:${name}(${arg})`, kind: "pseudo-class", counts: true });
        continue;
      }

      // Regular pseudo-class.
      classes++;
      breakdown.push({ token: `${":".repeat(colons)}${name}${arg ? `(${arg})` : ""}`, kind: "pseudo-class", counts: true });
      continue;
    }

    // Universal selector * — 0 specificity.
    if (ch === "*") {
      i++;
      breakdown.push({ token: "*", kind: "other", counts: false });
      continue;
    }

    // Element/type selector.
    if (/[A-Za-z]/.test(ch)) {
      let name = "";
      while (i < s.length && /[A-Za-z0-9_-]/.test(s[i])) name += s[i++];
      // Skip namespace alias (|name) — rare.
      if (s[i] === "|") {
        i++;
        name = "";
        while (i < s.length && /[A-Za-z0-9_-]/.test(s[i])) name += s[i++];
      }
      if (name) {
        elements++;
        breakdown.push({ token: name, kind: "element", counts: true });
      }
      continue;
    }

    // Unknown character — skip.
    i++;
  }

  return { inline: 0, ids, classes, elements };
}

function splitOnCommas(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let buf = "";
  let inS = false, inD = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inS) {
      buf += ch;
      if (ch === "'" && input[i + 1] !== "'") inS = false;
      else if (ch === "'" && input[i + 1] === "'") buf += input[++i];
      continue;
    }
    if (inD) {
      buf += ch;
      if (ch === '"') inD = false;
      continue;
    }
    if (ch === "'") { inS = true; buf += ch; continue; }
    if (ch === '"') { inD = true; buf += ch; continue; }
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      parts.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf);
  return parts;
}

/** Compare two specificities. Returns >0 if a wins, <0 if b wins, 0 if tie. */
export function compareSpecificity(a: Specificity, b: Specificity): number {
  if (a.inline !== b.inline) return a.inline - b.inline;
  if (a.ids !== b.ids) return a.ids - b.ids;
  if (a.classes !== b.classes) return a.classes - b.classes;
  if (a.elements !== b.elements) return a.elements - b.elements;
  return 0;
}
