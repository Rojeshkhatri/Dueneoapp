"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Dices, RotateCcw, Trash2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { randomInt } from "./_random-helpers";

type DiceType = 4 | 6 | 8 | 10 | 12 | 20 | 100;

const DICE_TYPES: { value: DiceType; label: string }[] = [
  { value: 4, label: "D4 · Tetrahedron" },
  { value: 6, label: "D6 · Cube" },
  { value: 8, label: "D8 · Octahedron" },
  { value: 10, label: "D10 · Pentagonal" },
  { value: 12, label: "D12 · Dodecahedron" },
  { value: 20, label: "D20 · Icosahedron" },
  { value: 100, label: "D100 / Percentile" },
];

// Pip layout for D6 faces — positions in a 3x3 grid.
const PIP_MAP: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DieFace({ value, rolling }: { value: number; rolling: boolean }) {
  // D6 gets a pip face, everything else shows a numeric tile.
  return (
    <div
      className={`flex aspect-square w-full items-center justify-center rounded-xl border-2 border-foreground/20 bg-gradient-to-br from-white to-slate-100 p-2 shadow-sm dark:from-slate-100 dark:to-slate-300 ${
        rolling ? "animate-pulse" : ""
      }`}
      style={{
        transform: rolling ? "rotate(8deg)" : "rotate(0deg)",
        transition: "transform 120ms ease-in-out",
      }}
      aria-label={`Die showing ${value}`}
    >
      <PipFace value={value} />
    </div>
  );
}

function PipFace({ value }: { value: number }) {
  if (value < 1 || value > 6) {
    // Numeric display for D4/D8/D10/D12/D20/D100.
    return (
      <span
        className="font-mono font-black text-slate-900"
        style={{
          fontSize: value >= 100 ? "1.25rem" : value >= 10 ? "1.75rem" : "2.25rem",
        }}
      >
        {value}
      </span>
    );
  }
  const pips = PIP_MAP[value] ?? [];
  return (
    <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-0.5 p-0.5">
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="flex items-center justify-center">
          {pips.includes(i) && (
            <span className="block h-2.5 w-2.5 rounded-full bg-slate-900 sm:h-3 sm:w-3" />
          )}
        </div>
      ))}
    </div>
  );
}

interface RollRecord {
  id: number;
  type: DiceType;
  qty: number;
  rolls: number[];
  total: number;
  at: number;
}

export function DiceRoller({ tool }: { tool: ToolDefinition }) {
  const [type, setType] = React.useState<DiceType>(6);
  const [qty, setQty] = React.useState(2);
  const [rolling, setRolling] = React.useState(false);
  const [current, setCurrent] = React.useState<number[]>([6, 3]);
  const [history, setHistory] = React.useState<RollRecord[]>([]);
  const [nextId, setNextId] = React.useState(1);
  const rollTimer = React.useRef<number | null>(null);

  const cleanup = () => {
    if (rollTimer.current !== null) {
      window.clearInterval(rollTimer.current);
      rollTimer.current = null;
    }
  };
  React.useEffect(() => () => cleanup(), []);

  const roll = () => {
    if (rolling) return;
    setRolling(true);

    const finalRolls: number[] = Array.from({ length: qty }, () => 1 + randomInt(type));
    const startedAt = Date.now();
    const duration = 800;

    rollTimer.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= duration) {
        cleanup();
        setCurrent(finalRolls);
        setRolling(false);
        const total = finalRolls.reduce((s, n) => s + n, 0);
        setHistory((h) =>
          [
            {
              id: nextId,
              type,
              qty,
              rolls: finalRolls,
              total,
              at: Date.now(),
            },
            ...h,
          ].slice(0, 12)
        );
        setNextId((n) => n + 1);
        toast.success(
          `${qty}× D${type} rolled → total ${total}${
            qty > 1 ? ` (avg ${(total / qty).toFixed(1)})` : ""
          }`
        );
        return;
      }
      // Flicker random values during the roll.
      setCurrent(Array.from({ length: qty }, () => 1 + randomInt(type)));
    }, 80);
  };

  const reset = () => {
    cleanup();
    setRolling(false);
    setCurrent([]);
    setHistory([]);
    setNextId(1);
  };

  const total = current.reduce((s, n) => s + n, 0);
  const max = type * qty;
  const min = qty;

  const toolBody = (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dr-type">Dice type</Label>
          <Select
            value={String(type)}
            onValueChange={(v) => setType(Number(v) as DiceType)}
          >
            <SelectTrigger id="dr-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DICE_TYPES.map((d) => (
                <SelectItem key={d.value} value={String(d.value)}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="dr-qty">Quantity</Label>
            <span className="font-mono text-xs text-muted-foreground">
              {qty} dice
            </span>
          </div>
          <Slider
            id="dr-qty"
            value={[qty]}
            min={1}
            max={20}
            step={1}
            onValueChange={(v) => setQty(v[0] ?? 2)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" onClick={roll} disabled={rolling}>
          <Dices className="mr-2 h-5 w-5" />
          {rolling ? "Rolling…" : "Roll dice"}
        </Button>
        <Button variant="outline" size="sm" onClick={roll} disabled={rolling}>
          Roll again
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset
        </Button>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistory([])}
            className="ml-auto"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Clear history
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-6">
        {current.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            Press “Roll dice” to begin.
          </div>
        ) : (
          <>
            <div
              className={`grid gap-3 ${
                current.length <= 4
                  ? "grid-cols-2 sm:grid-cols-4"
                  : current.length <= 9
                  ? "grid-cols-3 sm:grid-cols-5"
                  : "grid-cols-4 sm:grid-cols-6"
              }`}
            >
              {current.map((v, i) => (
                <div key={i} className="w-full">
                  <DieFace value={v} rolling={rolling} />
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total
                  </p>
                  <p className="font-mono text-3xl font-black tracking-tight text-primary">
                    {total}
                  </p>
                </div>
                {current.length > 1 && (
                  <div className="text-xs text-muted-foreground">
                    <p>min possible: {min}</p>
                    <p>max possible: {max}</p>
                    <p>average: {(total / current.length).toFixed(2)}</p>
                  </div>
                )}
              </div>
              {current.length > 1 && (
                <div className="flex h-2.5 w-40 overflow-hidden rounded-full bg-muted sm:w-56">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{
                      width: `${Math.max(
                        2,
                        Math.min(100, ((total - min) / Math.max(1, max - min)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {history.length > 0 && (
        <div className="rounded-xl border bg-muted/20 p-4">
          <h3 className="text-sm font-semibold">Roll history</h3>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {h.qty}× D{h.type}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {h.rolls.join(" · ")}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold">
                  Σ {h.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Roll virtual dice for tabletop RPGs, board games or probability demos. Choose from D4, D6, D8, D10, D12, D20 or D100, roll up to 20 dice at once, and watch D6 dice flicker with classic pip faces. History keeps your last 12 rolls.",
    tool: toolBody,
    howTo: [
      {
        title: "Choose a dice type",
        description:
          "Pick D4, D6, D8, D10, D12, D20 or D100 from the dropdown. The D6 displays traditional pip faces; other dice show their numeric result.",
      },
      {
        title: "Set the quantity",
        description:
          "Drag the slider to roll 1–20 dice at once. The total, average and min/max possible range are shown after each roll.",
      },
      {
        title: "Roll the dice",
        description:
          "Click “Roll dice”. The dice flicker through random values for under a second before settling on the final result.",
      },
      {
        title: "Review your history",
        description:
          "Your most recent 12 rolls are listed at the bottom with the dice configuration, individual results and total for each.",
      },
    ],
    useCases: [
      "Play tabletop RPGs like D&D without physical dice.",
      "Resolve board-game moves when dice are missing.",
      "Teach basic probability by rolling many dice and comparing totals.",
      "Generate a quick random number for any game that needs one.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Only D6 shows pip faces — other dice are shown as numeric tiles for clarity.</li>
        <li>Maximum 20 dice per roll to keep the layout readable on mobile.</li>
        <li>Roll history is limited to 12 entries and is not persisted across refreshes.</li>
      </ul>
    ),
    faq: [
      {
        q: "Are the dice fair?",
        a: "Yes. Each die is rolled independently using crypto.getRandomValues with rejection sampling, giving every face an equal 1/N probability.",
      },
      {
        q: "Can I roll mixed dice like 2D6 + 1D20?",
        a: "Not in a single click — this tool rolls one dice type at a time. You can run two rolls and add the totals, or use the Random Number Generator for a custom range.",
      },
      {
        q: "Why does D100 show values 1–100 instead of 00–90?",
        a: "We show the final result (1–100) rather than two separate percentile dice. To emulate classic 2d10 percentile rolls, generate two numbers 0–9 and 0–9 manually.",
      },
      {
        q: "Does the roll history persist?",
        a: "No. History is kept only for the current browser tab. Refreshing the page or closing the tab clears it.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
