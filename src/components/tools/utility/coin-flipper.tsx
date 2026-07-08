"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Coins, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { randomInt } from "./_random-helpers";

type Side = "HEADS" | "TAILS";

export function CoinFlipper({ tool }: { tool: ToolDefinition }) {
  const [rotation, setRotation] = React.useState(0);
  const [flipping, setFlipping] = React.useState(false);
  const [result, setResult] = React.useState<Side | null>(null);
  const [heads, setHeads] = React.useState(0);
  const [tails, setTails] = React.useState(0);
  const [history, setHistory] = React.useState<Side[]>([]);

  const flip = () => {
    if (flipping) return;
    setFlipping(true);
    setResult(null);

    const isHeads = randomInt(2) === 0;
    const desired: Side = isHeads ? "HEADS" : "TAILS";

    // Each flip adds several full rotations and lands on the chosen face.
    // HEADS = even multiple of 180°, TAILS = odd multiple of 180°.
    const fullTurns = 5 + randomInt(3); // 5–7 turns
    const halfTurns = fullTurns * 2 + (isHeads ? 0 : 1);
    const next = rotation + halfTurns * 180;

    // Round down to nearest 180 so we start cleanly from a known position.
    setRotation(next);

    window.setTimeout(() => {
      setResult(desired);
      setFlipping(false);
      setHistory((h) => [desired, ...h].slice(0, 20));
      if (isHeads) setHeads((c) => c + 1);
      else setTails((c) => c + 1);
      toast.success(`Coin landed on ${desired}.`);
    }, 2100);
  };

  const reset = () => {
    setRotation(0);
    setFlipping(false);
    setResult(null);
    setHeads(0);
    setTails(0);
    setHistory([]);
  };

  const total = heads + tails;
  const headsPct = total > 0 ? Math.round((heads / total) * 100) : 0;
  const tailsPct = total > 0 ? 100 - headsPct : 0;

  const toolBody = (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Coin column */}
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-4 sm:p-6">
          <div
            className="relative flex h-56 w-56 items-center justify-center"
            style={{ perspective: "1000px" }}
          >
            <div
              className="relative h-48 w-48"
              style={{
                transformStyle: "preserve-3d",
                transform: `rotateY(${rotation}deg) rotateX(12deg)`,
                transition: flipping
                  ? "transform 2s cubic-bezier(0.22, 0.61, 0.36, 1)"
                  : "none",
              }}
            >
              {/* Heads face */}
              <div
                className="absolute inset-0 flex items-center justify-center rounded-full border-4 border-amber-300 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 shadow-lg"
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="flex flex-col items-center">
                  <div className="text-6xl" aria-hidden="true">👑</div>
                  <span className="mt-1 text-sm font-black uppercase tracking-widest text-amber-900">
                    Heads
                  </span>
                </div>
              </div>
              {/* Tails face */}
              <div
                className="absolute inset-0 flex items-center justify-center rounded-full border-4 border-amber-500 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-lg"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="text-6xl" aria-hidden="true">⭐</div>
                  <span className="mt-1 text-sm font-black uppercase tracking-widest text-amber-100">
                    Tails
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full max-w-xs text-base"
            onClick={flip}
            disabled={flipping}
          >
            <Coins className="mr-2 h-5 w-5" />
            {flipping ? "Flipping…" : "Flip the coin"}
          </Button>

          {result && !flipping && (
            <div
              role="status"
              className="w-full max-w-md rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4 text-center"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Result
              </p>
              <p className="mt-1 text-4xl font-black tracking-tight text-amber-700 dark:text-amber-300">
                {result}
              </p>
            </div>
          )}
        </div>

        {/* Stats column */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold">Statistics</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Total flips: <span className="font-mono font-medium text-foreground">{total}</span>
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-amber-700 dark:text-amber-300">👑 Heads</span>
                  <span className="font-mono text-muted-foreground">
                    {heads} · {headsPct}%
                  </span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${headsPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-amber-700 dark:text-amber-300">⭐ Tails</span>
                  <span className="font-mono text-muted-foreground">
                    {tails} · {tailsPct}%
                  </span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-amber-600 transition-all duration-500"
                    style={{ width: `${tailsPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {history.length > 0 && (
            <div className="rounded-xl border bg-muted/20 p-4">
              <h3 className="text-sm font-semibold">Recent flips</h3>
              <div className="mt-2 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {history.map((h, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-md border bg-background px-2 py-0.5 text-xs font-medium"
                    title={h}
                  >
                    {h === "HEADS" ? "👑" : "⭐"}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button variant="ghost" size="sm" className="w-full" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset coin & stats
          </Button>
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Flip a virtual coin for heads or tails with a satisfying 3D animation. Track how many times each side comes up and watch the percentages converge toward 50/50 over many flips. Perfect for settling bets and breaking ties.",
    tool: toolBody,
    howTo: [
      {
        title: "Click flip",
        description:
          "Hit “Flip the coin”. The coin spins on its Y-axis with several full rotations and lands on either HEADS or TAILS.",
      },
      {
        title: "Read the result",
        description:
          "The chosen side is announced below the coin. The face shown matches the announced result thanks to a 3D CSS flip.",
      },
      {
        title: "Watch your stats",
        description:
          "The right-hand panel tracks total flips, the count for each side, and the live percentage split between heads and tails.",
      },
      {
        title: "Reset when finished",
        description:
          "Use “Reset coin & stats” to clear the counters and history and start fresh for a new decision.",
      },
    ],
    useCases: [
      "Settle a friendly bet or argument without a physical coin.",
      "Pick who goes first in a game.",
      "Decide between two equally good options.",
      "Demonstrate the law of large numbers — the split tends toward 50/50 over time.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The 3D flip uses CSS transforms — on very old browsers it may render flat, but the result is still announced correctly.</li>
        <li>Statistics are kept only for the current browser session. Refreshing or closing the tab clears them.</li>
        <li>The coin is purely 50/50 — there is no way to weight it.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is the flip truly fair?",
        a: "Yes. We use crypto.getRandomValues with rejection sampling to choose heads or tails with exactly 50% probability each. The animation is purely cosmetic.",
      },
      {
        q: "Why isn’t my heads/tails split exactly 50/50?",
        a: "Random variation means small samples can be skewed. Over hundreds of flips the percentage will tend toward 50/50 by the law of large numbers.",
      },
      {
        q: "Can I weight the coin?",
        a: "No. This tool is intentionally a fair 50/50 coin. If you need weighted odds, use the full Wheel Spinner tool and add more of one option than the other.",
      },
      {
        q: "Does my flip history get saved?",
        a: "Only within the current browser tab. Refreshing the page or closing the tab clears both stats and recent flips.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
