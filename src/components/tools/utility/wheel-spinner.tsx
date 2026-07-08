"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Minus, Play, RotateCcw, Shuffle, Trash2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseOptions,
  randomInt,
  WHEEL_PALETTE,
} from "./_random-helpers";

const SIZE = 320; // SVG viewBox size
const RADIUS = SIZE / 2 - 4;
const CENTER = SIZE / 2;

interface SegmentPath {
  path: string;
  fill: string;
  text: string;
  label: string;
  midAngle: number; // radians, measured clockwise from top
}

function polar(angleRad: number, radius: number): { x: number; y: number } {
  // angle measured clockwise from top → x = sin, y = -cos (then translate to center)
  return {
    x: CENTER + radius * Math.sin(angleRad),
    y: CENTER - radius * Math.cos(angleRad),
  };
}

function buildSegments(options: string[]): SegmentPath[] {
  const n = options.length;
  if (n === 0) return [];
  const seg = (2 * Math.PI) / n;
  return options.map((label, i) => {
    const a1 = i * seg;
    const a2 = (i + 1) * seg;
    const p1 = polar(a1, RADIUS);
    const p2 = polar(a2, RADIUS);
    const largeArc = a2 - a1 > Math.PI ? 1 : 0;
    const path = `M ${CENTER},${CENTER} L ${p1.x},${p1.y} A ${RADIUS},${RADIUS} 0 ${largeArc} 1 ${p2.x},${p2.y} Z`;
    const palette = WHEEL_PALETTE[i % WHEEL_PALETTE.length];
    const midAngle = (a1 + a2) / 2;
    return { path, fill: palette.fill, text: palette.text, label, midAngle };
  });
}

export function WheelSpinner({ tool }: { tool: ToolDefinition }) {
  const [raw, setRaw] = React.useState<string>(
    "Pizza\nSushi\nTacos\nBurgers\nSalad\nPasta"
  );
  const [options, setOptions] = React.useState<string[]>(() =>
    parseOptions("Pizza\nSushi\nTacos\nBurgers\nSalad\nPasta")
  );
  const [rotation, setRotation] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  const [winner, setWinner] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<string[]>([]);
  const wheelRef = React.useRef<HTMLDivElement>(null);

  const segments = React.useMemo(() => buildSegments(options), [options]);

  const updateOptions = (text: string) => {
    setRaw(text);
    setOptions(parseOptions(text));
  };

  const spin = () => {
    if (spinning) return;
    if (options.length < 2) {
      toast.error("Add at least two options to spin.");
      return;
    }
    setWinner(null);
    setSpinning(true);

    const n = options.length;
    const winnerIdx = randomInt(n);
    const seg = 360 / n;
    // Desired final rotation (mod 360) so that the winner's segment
    // centre lands at the top (pointer). Segment i is centred at
    // (i + 0.5) * seg clockwise from top; to bring it to the top we
    // rotate by -(i + 0.5) * seg, normalised to [0, 360).
    const desired = (360 - (winnerIdx + 0.5) * seg + 360) % 360;
    const minSpins = 5;
    const extraTurns = 2 + randomInt(3); // 2..4 extra full turns for variety
    const diff = ((desired - rotation) % 360 + 360) % 360;
    const next = rotation + 360 * (minSpins + extraTurns) + diff;
    setRotation(next);

    window.setTimeout(() => {
      setWinner(options[winnerIdx] ?? null);
      setHistory((h) => [options[winnerIdx] ?? "", ...h].slice(0, 12));
      setSpinning(false);
    }, 4200);
  };

  const removeWinner = () => {
    if (!winner) return;
    setOptions((prev) => {
      const next = prev.filter((o) => o !== winner);
      // Also update raw text so the textarea stays in sync.
      setRaw(next.join("\n"));
      return next;
    });
    setWinner(null);
    toast.success(`Removed “${winner}” from the wheel.`);
  };

  const reset = () => {
    setRotation(0);
    setWinner(null);
    setHistory([]);
    setSpinning(false);
  };

  const shuffleOptions = () => {
    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setOptions(shuffled);
    setRaw(shuffled.join("\n"));
  };

  const n = options.length;

  const toolBody = (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Wheel column */}
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-4 sm:p-6">
          <div className="relative" style={{ width: SIZE, height: SIZE, maxWidth: "100%" }}>
            {/* Pointer (fixed at top) */}
            <div
              className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2"
              aria-hidden="true"
            >
              <svg width="28" height="36" viewBox="0 0 28 36">
                <path d="M 14 36 L 0 4 Q 14 -2 28 4 Z" fill="#1f2937" />
                <circle cx="14" cy="6" r="3" fill="#fbbf24" />
              </svg>
            </div>

            {/* The spinning wheel */}
            <div
              ref={wheelRef}
              className="h-full w-full"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning
                  ? "transform 4s cubic-bezier(0.17, 0.67, 0.21, 1)"
                  : "none",
              }}
            >
              {segments.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center rounded-full border border-dashed text-sm text-muted-foreground">
                  Add options to build the wheel
                </div>
              ) : segments.length === 1 ? (
                <div className="flex h-full w-full items-center justify-center rounded-full border" style={{ background: segments[0]?.fill, color: segments[0]?.text }}>
                  <span className="px-4 text-center text-lg font-semibold">{segments[0]?.label}</span>
                </div>
              ) : (
                <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
                  {segments.map((s, i) => (
                    <path key={i} d={s.path} fill={s.fill} stroke="#ffffff" strokeWidth="1.5" />
                  ))}
                  {segments.map((s, i) => {
                    // Place the label along the segment mid-angle.
                    const r = RADIUS * 0.62;
                    const p = polar(s.midAngle, r);
                    const rotate = (s.midAngle * 180) / Math.PI;
                    const showLabel = s.label.length <= 14;
                    return (
                      <text
                        key={`t-${i}`}
                        x={p.x}
                        y={p.y}
                        fill={s.text}
                        fontSize={n > 16 ? 9 : n > 10 ? 11 : 13}
                        fontWeight={600}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${rotate} ${p.x} ${p.y})`}
                      >
                        {showLabel ? s.label : `${s.label.slice(0, 12)}…`}
                      </text>
                    );
                  })}
                  <circle cx={CENTER} cy={CENTER} r={14} fill="#1f2937" stroke="#ffffff" strokeWidth="2" />
                  <circle cx={CENTER} cy={CENTER} r={5} fill="#fbbf24" />
                </svg>
              )}
            </div>
          </div>

          <Button
            size="lg"
            className="w-full max-w-xs text-base"
            onClick={spin}
            disabled={spinning || options.length < 2}
          >
            <Play className="mr-2 h-5 w-5" />
            {spinning ? "Spinning…" : "Spin the wheel"}
          </Button>

          {winner && (
            <div
              role="status"
              className="w-full max-w-md rounded-xl border-2 border-primary/40 bg-primary/5 p-4 text-center"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Winner
              </p>
              <p className="mt-1 break-words text-2xl font-bold">{winner}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Button size="sm" variant="default" onClick={removeWinner}>
                  <Minus className="mr-1.5 h-3.5 w-3.5" />
                  Remove winner & spin again
                </Button>
                <Button size="sm" variant="outline" onClick={() => setWinner(null)}>
                  Keep & spin again
                </Button>
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="w-full max-w-md">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recent winners
              </p>
              <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                {history.map((h, i) => (
                  <Badge key={i} variant="secondary" className="font-medium">
                    {h}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Controls column */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ws-options">Options</Label>
              <span className="text-xs text-muted-foreground">
                {n} option{n === 1 ? "" : "s"}
              </span>
            </div>
            <Textarea
              id="ws-options"
              value={raw}
              onChange={(e) => updateOptions(e.target.value)}
              placeholder={"One option per line\nor, comma, separated"}
              className="min-h-[220px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter one option per line, or separate them with commas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={shuffleOptions} disabled={n < 2 || spinning}>
              <Shuffle className="mr-1.5 h-3.5 w-3.5" />
              Shuffle order
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRaw("");
                setOptions([]);
                setWinner(null);
              }}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Tip:</span> Use the
              “Remove winner” button after each spin for multi-round raffles — the
              winner is taken out of the wheel automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Create a custom spinning wheel to make random decisions. Add your own options, hit spin, and let the wheel choose. Coloured segments, smooth animation, and one-click winner removal for multi-round raffles.",
    tool: toolBody,
    howTo: [
      {
        title: "Add your options",
        description:
          "Type each option on its own line in the box on the right, or separate them with commas. The wheel updates instantly with coloured segments.",
      },
      {
        title: "Spin the wheel",
        description:
          "Click the “Spin the wheel” button. The wheel rotates with several full turns and lands on a random segment. The winning option is announced below the wheel.",
      },
      {
        title: "Remove the winner (optional)",
        description:
          "For multi-round draws — like a raffle — click “Remove winner & spin again” to take the chosen option out of the wheel before the next spin.",
      },
      {
        title: "Reset or clear",
        description:
          "Use “Reset” to clear the rotation and history, or “Clear” to wipe the options list and start over with new choices.",
      },
    ],
    useCases: [
      "Pick a restaurant when nobody can agree on dinner.",
      "Run a giveaway or raffle with multiple rounds.",
      "Decide classroom chores or presentation order.",
      "Choose a winner for a contest from a list of entries.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Labels longer than 14 characters are truncated on the wheel itself but shown in full when announced as the winner.</li>
        <li>Very long option lists (50+) render small text on the wheel — consider grouping or splitting your list.</li>
        <li>The spin animation runs for about 4 seconds regardless of the number of options.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is the wheel truly random?",
        a: "Yes. We use the browser's cryptographic random number generator (crypto.getRandomValues with rejection sampling) to pick the winning segment. The animation is purely visual — the winner is decided before the wheel starts spinning.",
      },
      {
        q: "Can I use the wheel for a paid giveaway?",
        a: "Yes. The randomness is unbiased and verifiable. For high-stakes draws we recommend keeping your list of options visible to participants and screen-recording the spin.",
      },
      {
        q: "Why does my wheel stop in the same spot twice in a row?",
        a: "Each spin is an independent random draw, so the same segment can win twice. Use “Remove winner” to ensure unique winners across rounds.",
      },
      {
        q: "Does my list get saved anywhere?",
        a: "No. Everything stays in your browser tab. Refreshing the page resets the wheel and your list of options.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
