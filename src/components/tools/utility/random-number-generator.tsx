"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Dices, RotateCcw, Shuffle } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { hasCrypto, randomIntInRange } from "./_random-helpers";

type SortMode = "none" | "asc" | "desc";

/**
 * Generate `count` random integers in [min, max].
 * If `unique` is true, returns at most (max - min + 1) unique values.
 */
function generateNumbers(
  min: number,
  max: number,
  count: number,
  unique: boolean
): number[] {
  if (min > max) [min, max] = [max, min];
  const span = max - min + 1;
  if (unique) {
    const cap = Math.min(count, span);
    if (cap <= 0) return [];
    // For small spans, shuffle a sequential list (Fisher–Yates via randomInt).
    if (span <= 100_000) {
      const pool = Array.from({ length: span }, (_, i) => min + i);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = randomIntInRange(0, i);
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, cap);
    }
    // For huge spans, use a Set to dedupe.
    const out = new Set<number>();
    while (out.size < cap) {
      out.add(randomIntInRange(min, max));
    }
    return Array.from(out);
  }
  // Non-unique: just sample directly.
  const out: number[] = new Array(count);
  for (let i = 0; i < count; i++) out[i] = randomIntInRange(min, max);
  return out;
}

export function RandomNumberGenerator({ tool }: { tool: ToolDefinition }) {
  const [min, setMin] = React.useState(1);
  const [max, setMax] = React.useState(100);
  const [count, setCount] = React.useState(1);
  const [unique, setUnique] = React.useState(false);
  const [sort, setSort] = React.useState<SortMode>("none");
  const [results, setResults] = React.useState<number[]>([]);
  const [generating, setGenerating] = React.useState(false);

  const generate = () => {
    if (Number.isNaN(min) || Number.isNaN(max)) {
      toast.error("Min and max must be valid integers.");
      return;
    }
    if (Number.isNaN(count) || count < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }
    let lo = min;
    let hi = max;
    if (lo > hi) [lo, hi] = [hi, lo];
    if (hi - lo > 1_000_000_000) {
      toast.error("Range is too large (max 1 billion).");
      return;
    }
    let qty = Math.min(1000, Math.max(1, Math.floor(count)));
    if (unique) {
      const cap = hi - lo + 1;
      if (qty > cap) {
        toast.error(
          `Cannot pick ${qty} unique numbers from a range of only ${cap}.`
        );
        qty = cap;
      }
    }

    setGenerating(true);
    // Use a microtask delay so the spinner can paint on big batches.
    window.setTimeout(() => {
      const out = generateNumbers(lo, hi, qty, unique);
      if (sort === "asc") out.sort((a, b) => a - b);
      else if (sort === "desc") out.sort((a, b) => b - a);
      setResults(out);
      setGenerating(false);
    }, 30);
  };

  const reset = () => {
    setMin(1);
    setMax(100);
    setCount(1);
    setUnique(false);
    setSort("none");
    setResults([]);
  };

  const resultText = results.join(", ");
  const resultCount = results.length;

  const toolBody = (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="rng-min">Minimum</Label>
          <Input
            id="rng-min"
            type="number"
            inputMode="numeric"
            value={min}
            onChange={(e) => setMin(parseInt(e.target.value, 10))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rng-max">Maximum</Label>
          <Input
            id="rng-max"
            type="number"
            inputMode="numeric"
            value={max}
            onChange={(e) => setMax(parseInt(e.target.value, 10))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rng-count">Quantity (1–1000)</Label>
          <Input
            id="rng-count"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value, 10))}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Label
          htmlFor="rng-unique"
          className="flex cursor-pointer items-center justify-between rounded-md border bg-background px-3 py-2.5 text-sm"
        >
          <span>Unique numbers only</span>
          <Switch
            id="rng-unique"
            checked={unique}
            onCheckedChange={setUnique}
          />
        </Label>

        <div className="space-y-2">
          <Label htmlFor="rng-sort">Sort results</Label>
          <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
            <SelectTrigger id="rng-sort" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No sorting</SelectItem>
              <SelectItem value="asc">Ascending (low → high)</SelectItem>
              <SelectItem value="desc">Descending (high → low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={generate} disabled={generating}>
          <Dices className="mr-1.5 h-4 w-4" />
          {generating ? "Generating…" : "Generate numbers"}
        </Button>
        <Button variant="outline" size="sm" onClick={generate} disabled={generating}>
          <Shuffle className="mr-1.5 h-3.5 w-3.5" />
          Regenerate
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset
        </Button>
      </div>

      {resultCount > 0 && (
        <div className="rounded-xl border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {resultCount} number{resultCount === 1 ? "" : "s"} · range [{Math.min(min, max)}, {Math.max(min, max)}]
              {unique ? " · unique" : ""}
              {sort !== "none" ? ` · ${sort === "asc" ? "ascending" : "descending"}` : ""}
            </p>
            <CopyButton value={resultText} label="Copy all" />
          </div>

          {resultCount === 1 ? (
            <p className="mt-4 break-all text-center text-5xl font-black tracking-tight text-primary sm:text-6xl">
              {results[0]}
            </p>
          ) : (
            <div className="mt-4 max-h-96 overflow-y-auto rounded-md border bg-muted/20 p-3">
              <div className="flex flex-wrap gap-2">
                {results.map((n, i) => (
                  <span
                    key={i}
                    className="inline-flex min-w-[3rem] items-center justify-center rounded-md border bg-background px-2.5 py-1 font-mono text-sm font-semibold"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Randomness:</span>{" "}
          {hasCrypto()
            ? "Using crypto.getRandomValues (rejection-sampled)."
            : "Crypto API unavailable — falling back to Math.random."}
        </p>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Generate random integers within any range, one at a time or up to 1000 in a batch. Toggle unique-only to draw without replacement and choose whether to sort the results. Everything runs locally in your browser.",
    tool: toolBody,
    howTo: [
      {
        title: "Set your range",
        description:
          "Enter the minimum and maximum values. The generator picks integers in the inclusive range [min, max].",
      },
      {
        title: "Choose a quantity",
        description:
          "Enter how many numbers to generate (1 to 1000). A single number is shown large; batches are listed in a scrollable grid.",
      },
      {
        title: "Toggle unique & sort",
        description:
          "Turn on “Unique numbers only” to draw without replacement, and pick ascending, descending or unsorted output.",
      },
      {
        title: "Generate & copy",
        description:
          "Click “Generate numbers” and use “Copy all” to copy the comma-separated list to your clipboard.",
      },
    ],
    useCases: [
      "Pick lottery-style numbers from a fixed range.",
      "Assign unique IDs or seat numbers to participants.",
      "Generate randomised sample data for testing or prototypes.",
      "Shuffle the order of items by sorting on a random key.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Only integers are supported. For decimals, generate an integer and divide by 10/100/etc. in a spreadsheet.</li>
        <li>Unique draws from ranges above 100,000 use a Set-based approach and may take a moment for the maximum 1000 results.</li>
        <li>Maximum range is 1 billion (max − min) to keep generation responsive.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is this random enough for cryptography or lotteries?",
        a: "It uses crypto.getRandomValues with rejection sampling, which is the strongest randomness source available in the browser. That said, we cannot certify it for legal lottery use — check your local regulations.",
      },
      {
        q: "What does “unique only” mean?",
        a: "Each number is drawn without replacement — no repeats. The maximum you can draw is the size of the range (max − min + 1). If you ask for more, the tool clamps to the range size.",
      },
      {
        q: "Why are my results sorted?",
        a: "You likely selected ascending or descending in the “Sort results” dropdown. Switch it back to “No sorting” to see the raw draw order.",
      },
      {
        q: "Can I generate decimals?",
        a: "Not directly. A common workaround: generate integers in [min×100, max×100] and divide by 100 to get two decimal places.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
