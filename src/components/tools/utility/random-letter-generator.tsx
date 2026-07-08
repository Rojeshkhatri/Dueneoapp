"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
import { RotateCcw, Type } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { hasCrypto, randomInt } from "./_random-helpers";

type CaseMode = "upper" | "lower" | "both";
type JoinMode = "string" | "list";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";

function poolFor(mode: CaseMode): string {
  if (mode === "upper") return UPPER;
  if (mode === "lower") return LOWER;
  return UPPER + LOWER;
}

function randomChar(pool: string): string {
  return pool[randomInt(pool.length)] ?? "";
}

export function RandomLetterGenerator({ tool }: { tool: ToolDefinition }) {
  const [mode, setMode] = React.useState<CaseMode>("upper");
  const [qty, setQty] = React.useState(5);
  const [unique, setUnique] = React.useState(false);
  const [join, setJoin] = React.useState<JoinMode>("string");
  const [letters, setLetters] = React.useState<string[]>([]);

  const generate = () => {
    const pool = poolFor(mode);
    if (pool.length === 0) return;
    let result: string[] = [];
    if (unique) {
      const cap = Math.min(qty, pool.length);
      // Fisher–Yates over the pool, take first cap.
      const arr = pool.split("");
      for (let i = arr.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      result = arr.slice(0, cap);
      if (cap < qty) {
        toast.message(
          `Only ${cap} unique ${mode === "both" ? "letters" : mode + "case letters"} available — generated all ${cap}.`
        );
      }
    } else {
      result = Array.from({ length: qty }, () => randomChar(pool));
    }
    setLetters(result);
  };

  const reset = () => {
    setMode("upper");
    setQty(5);
    setUnique(false);
    setJoin("string");
    setLetters([]);
  };

  const display = join === "string" ? letters.join("") : letters.join(" ");
  const pool = poolFor(mode);

  const toolBody = (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rlg-mode">Letter case</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as CaseMode)}>
            <SelectTrigger id="rlg-mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upper">Uppercase (A–Z)</SelectItem>
              <SelectItem value="lower">Lowercase (a–z)</SelectItem>
              <SelectItem value="both">Both cases (A–Z, a–z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="rlg-qty">Quantity (1–100)</Label>
            <span className="font-mono text-xs text-muted-foreground">{qty}</span>
          </div>
          <Slider
            id="rlg-qty"
            value={[qty]}
            min={1}
            max={100}
            step={1}
            onValueChange={(v) => setQty(v[0] ?? 5)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Label
          htmlFor="rlg-unique"
          className="flex cursor-pointer items-center justify-between rounded-md border bg-background px-3 py-2.5 text-sm"
        >
          <span>Unique letters only</span>
          <Switch
            id="rlg-unique"
            checked={unique}
            onCheckedChange={setUnique}
          />
        </Label>

        <div className="space-y-2">
          <Label htmlFor="rlg-join">Output format</Label>
          <Select value={join} onValueChange={(v) => setJoin(v as JoinMode)}>
            <SelectTrigger id="rlg-join" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="string">Joined string (ABC)</SelectItem>
              <SelectItem value="list">Space-separated list (A B C)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={generate}>
          <Type className="mr-1.5 h-4 w-4" />
          Generate letters
        </Button>
        <Button variant="outline" size="sm" onClick={generate}>
          Regenerate
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset
        </Button>
      </div>

      {letters.length > 0 && (
        <div className="rounded-xl border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {letters.length} letter{letters.length === 1 ? "" : "s"} ·{" "}
              {mode === "upper"
                ? "uppercase"
                : mode === "lower"
                ? "lowercase"
                : "mixed case"}
              {unique ? " · unique" : ""}
            </p>
            <CopyButton value={display} label="Copy" />
          </div>

          <div className="mt-4 break-words text-center font-mono text-2xl font-black tracking-[0.3em] text-primary sm:text-3xl sm:tracking-[0.4em]">
            {display || "—"}
          </div>

          {letters.length > 1 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                As a grid
              </p>
              <div className="flex flex-wrap gap-2">
                {letters.map((l, i) => (
                  <span
                    key={i}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-background font-mono text-lg font-bold"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Pool:</span>{" "}
          {mode === "upper"
            ? "26 letters (A–Z)"
            : mode === "lower"
            ? "26 letters (a–z)"
            : "52 letters (A–Z and a–z)"}
          . Randomness source:{" "}
          {hasCrypto()
            ? "crypto.getRandomValues."
            : "Math.random (crypto unavailable)."}
        </p>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Generate random letters from A to Z. Pick uppercase, lowercase or mixed case, choose how many (up to 100), and optionally enforce uniqueness. Copy the result as a string or a spaced list — great for spelling games, classroom activities and naming placeholders.",
    tool: toolBody,
    howTo: [
      {
        title: "Choose letter case",
        description:
          "Pick uppercase (A–Z), lowercase (a–z) or both cases. The pool size adjusts automatically (26, 26 or 52 letters).",
      },
      {
        title: "Set quantity & uniqueness",
        description:
          "Drag the slider to generate 1–100 letters. Toggle “Unique letters only” to draw without replacement.",
      },
      {
        title: "Pick an output format",
        description:
          "Choose a joined string like “ABC” for compact copy/paste, or a spaced list like “A B C” for easier reading.",
      },
      {
        title: "Generate & copy",
        description:
          "Click “Generate letters” and use “Copy” to grab the result. A visual grid of each letter appears below the main display.",
      },
    ],
    useCases: [
      "Generate random letters for spelling or word games.",
      "Create placeholder codes or one-time pads for fun ciphers.",
      "Pick letters of the alphabet for classroom bingo.",
      "Generate random initials for mock user data.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Only the 26-letter English alphabet is supported — no accented characters or other scripts.</li>
        <li>Unique draws are capped at the pool size (26 or 52). Asking for more returns the maximum available.</li>
        <li>Output is text-only. For random strings with digits and symbols, use the Password Generator tool.</li>
      </ul>
    ),
    faq: [
      {
        q: "Are the letters truly random?",
        a: "Yes. Each letter is chosen using crypto.getRandomValues with rejection sampling, giving every letter in the pool an equal probability.",
      },
      {
        q: "Can I include digits or symbols?",
        a: "Not in this tool. For mixed-character strings (letters + digits + symbols), use the Password Generator tool instead.",
      },
      {
        q: "What does “unique only” do?",
        a: "Each letter is drawn without replacement — no duplicates. The maximum you can draw equals the pool size (26 for a single case, 52 for both cases).",
      },
      {
        q: "Can I copy the letters as a single string?",
        a: "Yes. Set “Output format” to “Joined string” and click Copy. The string will have no spaces between letters.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
