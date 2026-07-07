"use client";

import * as React from "react";
import { GameLayout, type GameContent } from "@/components/dueneo/game-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw, Clock, MousePointerClick, Trophy } from "lucide-react";
import type { GameDefinition } from "@/data/games";
import { readLocal, writeLocal, formatTime, shuffle } from "./_game-helpers";

type GridSize = "2x4" | "4x4" | "6x6";

const EMOJIS = [
  "🐶", "🐱", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁",
  "🐮", "🐷", "🐸", "🐵", "🦄", "🐔", "🐧", "🐦",
  "🦉", "🦇", "🐺", "🐗", "🐴", "🦓", "🦒", "🐘",
  "🦏", "🐊", "🐢", "🐍", "🦎", "🐙", "🦑", "🦋",
];

const SIZE_CONFIG: Record<GridSize, { cols: number; rows: number; pairs: number; label: string }> = {
  "2x4": { cols: 4, rows: 2, pairs: 4, label: "Easy · 2×4" },
  "4x4": { cols: 4, rows: 4, pairs: 8, label: "Medium · 4×4" },
  "6x6": { cols: 6, rows: 6, pairs: 18, label: "Hard · 6×6" },
};

interface Card {
  id: number;
  emoji: string;
  pairId: number;
  flipped: boolean;
  matched: boolean;
}

function buildDeck(size: GridSize): Card[] {
  const cfg = SIZE_CONFIG[size];
  const chosen = shuffle(EMOJIS).slice(0, cfg.pairs);
  const pairs: Card[] = [];
  chosen.forEach((emoji, i) => {
    pairs.push({ id: i * 2, emoji, pairId: i, flipped: false, matched: false });
    pairs.push({ id: i * 2 + 1, emoji, pairId: i, flipped: false, matched: false });
  });
  return shuffle(pairs).map((c, idx) => ({ ...c, id: idx }));
}

const BEST_TIME_KEY = (size: GridSize) => `dueneo:memory:best:${size}`;

export function MemoryMatch({ game }: { game: GameDefinition }) {
  const [size, setSize] = React.useState<GridSize>("4x4");
  const [cards, setCards] = React.useState<Card[]>(() => buildDeck("4x4"));
  const [flippedIds, setFlippedIds] = React.useState<number[]>([]);
  const [moves, setMoves] = React.useState(0);
  const [matches, setMatches] = React.useState(0);
  const [startedAt, setStartedAt] = React.useState<number | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [bestTimes, setBestTimes] = React.useState<Record<GridSize, number>>({
    "2x4": readLocal<number>(BEST_TIME_KEY("2x4"), 0),
    "4x4": readLocal<number>(BEST_TIME_KEY("4x4"), 0),
    "6x6": readLocal<number>(BEST_TIME_KEY("6x6"), 0),
  });

  const cfg = SIZE_CONFIG[size];
  const completed = matches === cfg.pairs;

  // Timer
  React.useEffect(() => {
    if (!startedAt || completed) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(id);
  }, [startedAt, completed]);

  // Save best time on completion.
  React.useEffect(() => {
    if (!completed) return;
    const prev = bestTimes[size];
    if (prev === 0 || elapsed < prev) {
      setBestTimes((b) => ({ ...b, [size]: elapsed }));
      writeLocal(BEST_TIME_KEY(size), elapsed);
      toast.success(`New best time: ${formatTime(elapsed)} 🎉`);
    } else {
      toast.success(`Completed in ${formatTime(elapsed)}!`);
    }
  }, [completed]);

  // Resolve flips.
  React.useEffect(() => {
    if (flippedIds.length < 2) return;
    const [a, b] = flippedIds;
    const cardA = cards.find((c) => c.id === a);
    const cardB = cards.find((c) => c.id === b);
    if (!cardA || !cardB) return;
    if (cardA.pairId === cardB.pairId) {
      const t = setTimeout(() => {
        setCards((prev) =>
          prev.map((c) => (c.id === a || c.id === b ? { ...c, matched: true } : c))
        );
        setMatches((m) => m + 1);
        setFlippedIds([]);
      }, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setCards((prev) =>
        prev.map((c) => (c.id === a || c.id === b ? { ...c, flipped: false } : c))
      );
      setFlippedIds([]);
    }, 800);
    return () => clearTimeout(t);
  }, [flippedIds, cards]);

  function handleFlip(id: number) {
    if (completed) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.matched || card.flipped) return;
    if (flippedIds.length >= 2) return;
    if (startedAt === null) setStartedAt(Date.now());
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)));
    setFlippedIds((prev) => {
      const next = [...prev, id];
      if (next.length === 2) setMoves((m) => m + 1);
      return next;
    });
  }

  function restart(nextSize: GridSize = size) {
    setSize(nextSize);
    setCards(buildDeck(nextSize));
    setFlippedIds([]);
    setMoves(0);
    setMatches(0);
    setStartedAt(null);
    setElapsed(0);
  }

  function changeSize(s: GridSize) {
    if (s === size) return;
    restart(s);
  }

  const gridColsClass =
    size === "2x4" ? "grid-cols-4" : size === "4x4" ? "grid-cols-4" : "grid-cols-6";
  const cardSizeClass =
    size === "6x6"
      ? "h-12 w-12 text-2xl sm:h-16 sm:w-16 sm:text-3xl"
      : "h-20 w-20 text-4xl sm:h-24 sm:w-24 sm:text-5xl";

  const content: GameContent = {
    intro:
      "Flip cards two at a time to find matching pairs. The fewer moves and the faster you clear the grid, the better. Pick from three difficulty levels and chase a personal-best time, saved per grid size in your browser.",
    game: (
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
            {(Object.keys(SIZE_CONFIG) as GridSize[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => changeSize(s)}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  size === s ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {SIZE_CONFIG[s].label}
              </button>
            ))}
          </div>
          <Button onClick={() => restart()} variant="default" size="sm">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat icon={<MousePointerClick className="h-4 w-4" />} label="Moves" value={moves} />
          <Stat icon={<Trophy className="h-4 w-4" />} label="Pairs" value={`${matches}/${cfg.pairs}`} />
          <Stat icon={<Clock className="h-4 w-4" />} label="Time" value={formatTime(elapsed)} />
          <Stat icon={<Trophy className="h-4 w-4" />} label="Best" value={bestTimes[size] ? formatTime(bestTimes[size]) : "—"} />
        </div>

        <div className="mt-5 flex flex-col items-center">
          <div
            className={`grid ${gridColsClass} gap-2`}
            role="grid"
            aria-label={`Memory grid ${cfg.cols} by ${cfg.rows}`}
          >
            {cards.map((card) => {
              const show = card.flipped || card.matched;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleFlip(card.id)}
                  disabled={show || flippedIds.length >= 2 || completed}
                  aria-label={show ? `Card showing ${card.emoji}` : "Hidden card, click to flip"}
                  className={`relative flex items-center justify-center rounded-lg border-2 transition-all duration-150 ${cardSizeClass} ${
                    show
                      ? card.matched
                        ? "border-emerald-400 bg-emerald-500/15"
                        : "border-primary bg-primary/10"
                      : "border-input bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {show ? (
                    <span aria-hidden>{card.emoji}</span>
                  ) : (
                    <span className="text-lg font-bold">?</span>
                  )}
                </button>
              );
            })}
          </div>

          {completed && (
            <div className="mt-4 rounded-lg border bg-muted/40 px-4 py-3 text-center text-sm">
              🎉 Cleared in <strong>{moves}</strong> moves and <strong>{formatTime(elapsed)}</strong>.
              {bestTimes[size] === elapsed && " New best!"}{" "}
              <Button onClick={() => restart()} variant="outline" size="sm" className="ml-2">
                Play again
              </Button>
            </div>
          )}
        </div>
      </div>
    ),
    rules: (
      <div className="space-y-3">
        <p>
          The deck is shuffled and laid face-down. Click a card to flip it;
          click a second card to reveal it too. If the two emojis match they
          stay face-up; otherwise they flip back after a short pause. Find
          every pair to clear the grid.
        </p>
        <p>
          <strong>Easy · 2×4</strong> has 4 pairs (8 cards),{" "}
          <strong>Medium · 4×4</strong> has 8 pairs and{" "}
          <strong>Hard · 6×6</strong> has 18 pairs. Your fastest time on each
          grid size is saved locally so you can chase a personal record.
        </p>
      </div>
    ),
    tips: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Scan cards in a fixed order so you don't re-flip the same square.</li>
        <li>When you reveal a card you've seen before, match it on the very next flip.</li>
        <li>On the 6×6 grid, work row-by-row to keep mental track of 18 pairs.</li>
        <li>Speed matters more than move count for the best time — trust your memory.</li>
      </ul>
    ),
    controls: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Click or tap a face-down card to flip it.</li>
        <li>Two cards are flipped per move; matching pairs stay revealed.</li>
        <li>Switch grid sizes with the Easy / Medium / Hard toggle.</li>
      </ul>
    ),
    faq: [
      {
        q: "Where is my best time stored?",
        a: "In localStorage under dueneo:memory:best:{size}. Each grid size keeps its own record, and the data never leaves your device.",
      },
      {
        q: "What counts as a 'move'?",
        a: "One move = two card flips. A perfect game on the 4×4 grid would be 8 moves (one per pair).",
      },
      {
        q: "Can I change difficulty mid-game?",
        a: "Yes — switching grid sizes resets the deck, move counter and timer immediately.",
      },
    ],
  };

  return <GameLayout game={game} content={content} />;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
