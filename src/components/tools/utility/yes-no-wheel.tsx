"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw, Sparkles } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { randomInt } from "./_random-helpers";

const SIZE = 280;

export function YesNoWheel({ tool }: { tool: ToolDefinition }) {
  const [rotation, setRotation] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  const [result, setResult] = React.useState<"YES" | "NO" | null>(null);
  const [yesCount, setYesCount] = React.useState(0);
  const [noCount, setNoCount] = React.useState(0);
  const [pulse, setPulse] = React.useState(false);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    setPulse(false);

    // The wheel has 2 halves: YES occupies [0, 180), NO occupies [180, 360).
    // YES is centred at 90, NO at 270 (clockwise from top).
    // We want YES → rotation ≡ -90 ≡ 270 (mod 360).
    // We want NO  → rotation ≡ -270 ≡ 90 (mod 360).
    const isYes = randomInt(2) === 0;
    const desired = isYes ? 270 : 90;
    const minSpins = 5;
    const extraTurns = 2 + randomInt(3);
    const diff = ((desired - rotation) % 360 + 360) % 360;
    const next = rotation + 360 * (minSpins + extraTurns) + diff;
    setRotation(next);

    window.setTimeout(() => {
      setResult(isYes ? "YES" : "NO");
      if (isYes) setYesCount((c) => c + 1);
      else setNoCount((c) => c + 1);
      setSpinning(false);
      setPulse(true);
      window.setTimeout(() => setPulse(false), 1200);
    }, 4200);
  };

  const reset = () => {
    setRotation(0);
    setResult(null);
    setYesCount(0);
    setNoCount(0);
    setSpinning(false);
    setPulse(false);
  };

  const total = yesCount + noCount;
  const yesPct = total > 0 ? Math.round((yesCount / total) * 100) : 0;
  const noPct = total > 0 ? 100 - yesPct : 0;

  const toolBody = (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Wheel column */}
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-4 sm:p-6">
          <div className="relative" style={{ width: SIZE, height: SIZE, maxWidth: "100%" }}>
            {/* Pointer */}
            <div
              className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2"
              aria-hidden="true"
            >
              <svg width="28" height="36" viewBox="0 0 28 36">
                <path d="M 14 36 L 0 4 Q 14 -2 28 4 Z" fill="#1f2937" />
                <circle cx="14" cy="6" r="3" fill="#fbbf24" />
              </svg>
            </div>

            <div
              className="h-full w-full"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning
                  ? "transform 4s cubic-bezier(0.17, 0.67, 0.21, 1)"
                  : "none",
              }}
            >
              <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
                {/* YES half (right side) */}
                <path
                  d={`M ${SIZE / 2},${SIZE / 2} L ${SIZE / 2},4 A ${SIZE / 2 - 4},${SIZE / 2 - 4} 0 0 1 ${SIZE - 4},${SIZE / 2} Z`}
                  fill="#22c55e"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                {/* NO half (left side) */}
                <path
                  d={`M ${SIZE / 2},${SIZE / 2} L 4,${SIZE / 2} A ${SIZE / 2 - 4},${SIZE / 2 - 4} 0 0 1 ${SIZE / 2},4 Z`}
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <path
                  d={`M ${SIZE / 2},${SIZE / 2} L ${SIZE / 2},${SIZE - 4} A ${SIZE / 2 - 4},${SIZE / 2 - 4} 0 0 1 4,${SIZE / 2} Z`}
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <path
                  d={`M ${SIZE / 2},${SIZE / 2} L ${SIZE - 4},${SIZE / 2} A ${SIZE / 2 - 4},${SIZE / 2 - 4} 0 0 1 ${SIZE / 2},${SIZE - 4} Z`}
                  fill="#22c55e"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                {/* Labels */}
                <text
                  x={SIZE * 0.75}
                  y={SIZE / 2}
                  fill="#ffffff"
                  fontSize="28"
                  fontWeight="800"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(90 ${SIZE * 0.75} ${SIZE / 2})`}
                >
                  YES
                </text>
                <text
                  x={SIZE * 0.25}
                  y={SIZE / 2}
                  fill="#ffffff"
                  fontSize="28"
                  fontWeight="800"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(-90 ${SIZE * 0.25} ${SIZE / 2})`}
                >
                  NO
                </text>
                <circle cx={SIZE / 2} cy={SIZE / 2} r="14" fill="#1f2937" stroke="#ffffff" strokeWidth="2" />
                <circle cx={SIZE / 2} cy={SIZE / 2} r="5" fill="#fbbf24" />
              </svg>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full max-w-xs text-base"
            onClick={spin}
            disabled={spinning}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            {spinning ? "Spinning…" : "Spin for an answer"}
          </Button>

          {result && (
            <div
              role="status"
              className={`w-full max-w-md rounded-xl border-2 p-6 text-center transition-all ${
                result === "YES"
                  ? "border-green-500/50 bg-green-500/10"
                  : "border-red-500/50 bg-red-500/10"
              } ${pulse ? "scale-105" : "scale-100"}`}
              style={{ transition: "transform 200ms ease-out" }}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                The wheel says
              </p>
              <p
                className={`mt-1 text-5xl font-black tracking-tight ${
                  result === "YES" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}
              >
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
              Total spins: <span className="font-mono font-medium text-foreground">{total}</span>
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-green-600 dark:text-green-400">YES</span>
                  <span className="font-mono text-muted-foreground">
                    {yesCount} · {yesPct}%
                  </span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${yesPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-red-600 dark:text-red-400">NO</span>
                  <span className="font-mono text-muted-foreground">
                    {noCount} · {noPct}%
                  </span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${noPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button variant="ghost" size="sm" className="w-full" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset wheel & stats
          </Button>

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">50/50 odds.</span>{" "}
              Each spin is independent and unbiased — perfect for breaking a
              deadlock when you can't decide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "A simple 50/50 yes-or-no wheel for instant decisions. Spin and let fate decide. Tracks your yes/no stats so you can see if your luck is trending green or red.",
    tool: toolBody,
    howTo: [
      {
        title: "Click the spin button",
        description:
          "Hit “Spin for an answer”. The wheel rotates with several full turns and lands on either YES (green) or NO (red).",
      },
      {
        title: "Read the result",
        description:
          "The chosen answer is announced in a big colourful banner below the wheel. Use it to break any either/or deadlock.",
      },
      {
        title: "Check your stats",
        description:
          "The panel on the right tracks how many times YES and NO have come up, along with the percentage split.",
      },
      {
        title: "Reset when you’re done",
        description:
          "Use “Reset wheel & stats” to clear the counters and start fresh for a new question.",
      },
    ],
    useCases: [
      "Should I go to the gym today? Yes or no?",
      "Decide whether to accept an invitation you’re on the fence about.",
      "Break a tie when two friends can’t agree on a plan.",
      "Use it as a quick daily decision-maker for low-stakes questions.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Always 50/50 — you cannot weight the wheel toward yes or no. For weighted decisions, use the full Wheel Spinner tool.</li>
        <li>Stats are kept only for the current browser session. They reset if you refresh or close the tab.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is the result really 50/50?",
        a: "Yes. We use the browser's cryptographic random number generator (crypto.getRandomValues with rejection sampling) to pick between YES and NO with equal probability.",
      },
      {
        q: "Can I weight the wheel toward yes?",
        a: "Not in this tool — it’s intentionally a pure 50/50. If you want weighted odds, use the full Wheel Spinner tool and add more YES segments than NO segments.",
      },
      {
        q: "Does the wheel remember my previous spins?",
        a: "Only within the current browser tab. Refreshing the page or closing the tab clears both the wheel position and the statistics.",
      },
      {
        q: "Why does the wheel sometimes land on the same answer several times in a row?",
        a: "Each spin is independent. A run of five YESes in a row is statistically expected about 1 in 32 sequences — not a bug.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
