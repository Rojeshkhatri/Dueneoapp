"use client";

import * as React from "react";
import { GameLayout, type GameContent } from "@/components/dueneo/game-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, Undo2, Layers } from "lucide-react";
import type { GameDefinition } from "@/data/games";
import {
  type Card,
  createDeck,
  shuffle,
  CardView,
  Pile,
  type CardSize,
} from "./_cards";
import { formatTime, readLocal, writeLocal, makeRng } from "./_game-helpers";

// ---------------------------------------------------------------------------
// Spider (1-suit, easy version)
// ---------------------------------------------------------------------------

interface SpiderState {
  /** Remaining cards in the stock, dealt 10 at a time. */
  stock: Card[];
  /** 10 tableau columns. */
  tableau: Card[][];
  /** Completed K→A sequences (8 = win). Each entry is the 13 cards. */
  foundations: Card[][];
  moves: number;
}

type Selection = { pile: number; cardIndex: number } | null;

// ---- Game setup ----

function deal(seed: number): SpiderState {
  const rng = makeRng(seed);
  // 1-suit Spider: 8 sets of A-K spades = 104 cards.
  const deck = shuffle(
    createDeck([
      "spades", "spades", "spades", "spades",
      "spades", "spades", "spades", "spades",
    ]),
    rng
  );
  const tableau: Card[][] = Array.from({ length: 10 }, () => []);
  for (let col = 0; col < 10; col++) {
    const count = col < 4 ? 6 : 5; // cols 1-4 get 6, cols 5-10 get 5
    for (let i = 0; i < count; i++) {
      const card = deck.pop()!;
      card.faceUp = i === count - 1; // top card face-up
      tableau[col].push(card);
    }
  }
  // Remaining 50 cards → stock (face-down, dealt 10 at a time, 5 deals).
  const stock = deck.map((c) => ({ ...c, faceUp: false }));
  return { stock, tableau, foundations: [], moves: 0 };
}

function cloneState(s: SpiderState): SpiderState {
  return {
    stock: s.stock.map((c) => ({ ...c })),
    tableau: s.tableau.map((p) => p.map((c) => ({ ...c }))),
    foundations: s.foundations.map((seq) => seq.map((c) => ({ ...c }))),
    moves: s.moves,
  };
}

// ---- Move validation ----

/** In 1-suit Spider, a valid moveable run is any descending sequence (rank N, N-1, N-2, ...) of face-up cards. */
function isValidRun(cards: Card[]): boolean {
  if (cards.length === 0) return false;
  if (!cards.every((c) => c.faceUp)) return false;
  for (let i = 0; i < cards.length - 1; i++) {
    if (cards[i].rank !== cards[i + 1].rank + 1) return false;
  }
  return true;
}

function canDropOnTableau(cards: Card[], col: Card[]): boolean {
  if (cards.length === 0) return false;
  if (col.length === 0) return true; // any card or sequence can fill an empty column
  const top = col[col.length - 1];
  if (!top.faceUp) return false;
  return top.rank === cards[0].rank + 1; // descending by 1
}

function carriedCards(state: SpiderState, sel: Selection): Card[] {
  if (!sel) return [];
  return state.tableau[sel.pile].slice(sel.cardIndex);
}

/** Check the TOP of a column for a complete K→A sequence; if found, return the 13 cards. */
function tryCompleteSequence(col: Card[]): Card[] | null {
  if (col.length < 13) return null;
  const top13 = col.slice(col.length - 13);
  for (let i = 0; i < 13; i++) {
    if (!top13[i].faceUp) return null;
    if (top13[i].rank !== 13 - i) return null;
  }
  const suit = top13[0].suit;
  if (!top13.every((c) => c.suit === suit)) return null;
  return top13;
}

/** Apply a move + auto-collect any completed sequences from the destination column. Returns the new state (or null if illegal). */
function moveCards(state: SpiderState, sel: Selection, targetCol: number): SpiderState | null {
  if (!sel) return null;
  const cards = carriedCards(state, sel);
  if (!isValidRun(cards)) return null;
  if (!canDropOnTableau(cards, state.tableau[targetCol])) return null;
  const next = cloneState(state);
  next.tableau[sel.pile].splice(sel.cardIndex);
  for (const c of cards) next.tableau[targetCol].push({ ...c, faceUp: true });
  next.moves += 1;
  const srcCol = next.tableau[sel.pile];
  if (srcCol.length > 0 && !srcCol[srcCol.length - 1].faceUp) {
    srcCol[srcCol.length - 1].faceUp = true;
  }
  const completed = tryCompleteSequence(next.tableau[targetCol]);
  if (completed) {
    next.tableau[targetCol].splice(next.tableau[targetCol].length - 13);
    next.foundations.push(completed);
    const t = next.tableau[targetCol];
    if (t.length > 0 && !t[t.length - 1].faceUp) t[t.length - 1].faceUp = true;
  }
  return next;
}

/** Deal 10 cards from stock — one to each column. Returns null if stock is empty or any column is empty. */
function dealFromStock(state: SpiderState): SpiderState | null {
  if (state.stock.length === 0) return null;
  if (state.tableau.some((c) => c.length === 0)) return null;
  const next = cloneState(state);
  for (let i = 0; i < 10; i++) {
    const card = next.stock.pop();
    if (!card) break;
    card.faceUp = true;
    next.tableau[i].push(card);
  }
  next.moves += 1;
  for (let i = 0; i < 10; i++) {
    const completed = tryCompleteSequence(next.tableau[i]);
    if (completed) {
      next.tableau[i].splice(next.tableau[i].length - 13);
      next.foundations.push(completed);
      const t = next.tableau[i];
      if (t.length > 0 && !t[t.length - 1].faceUp) t[t.length - 1].faceUp = true;
    }
  }
  return next;
}

function isWin(state: SpiderState): boolean {
  return state.foundations.length === 8;
}

// ---- Component ----

const BEST_KEY = "dueneo:spider:best";

export function SpiderSolitaire({ game }: { game: GameDefinition }) {
  const [state, setState] = React.useState<SpiderState>(() =>
    deal(Math.floor(Math.random() * 1e9))
  );
  const [history, setHistory] = React.useState<SpiderState[]>([]);
  const [sel, setSel] = React.useState<Selection>(null);
  const [seconds, setSeconds] = React.useState(0);
  const [won, setWon] = React.useState(false);
  const [best, setBest] = React.useState<{ time: number; moves: number } | null>(() =>
    readLocal(BEST_KEY, null)
  );

  // Timer.
  React.useEffect(() => {
    if (won) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [won]);

  // Win detection.
  React.useEffect(() => {
    if (!won && isWin(state)) {
      setWon(true);
      const newBest = { time: seconds, moves: state.moves };
      if (!best || newBest.time < best.time) {
        setBest(newBest);
        writeLocal(BEST_KEY, newBest);
        toast.success(
          `🏆 All 8 sequences collected in ${formatTime(seconds)} and ${state.moves} moves — new best!`
        );
      } else {
        toast.success(
          `🏆 All 8 sequences collected in ${formatTime(seconds)} and ${state.moves} moves!`
        );
      }
    }
  }, [state, won, seconds, best]);

  function newGame() {
    setState(deal(Math.floor(Math.random() * 1e9)));
    setHistory([]);
    setSel(null);
    setSeconds(0);
    setWon(false);
  }

  function undo() {
    if (history.length === 0) {
      toast.message("Nothing to undo.");
      return;
    }
    setState(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setSel(null);
    if (won) setWon(false);
  }

  function commit(next: SpiderState | null): boolean {
    if (!next) return false;
    setHistory((h) => [...h.slice(-49), state]);
    setState(next);
    setSel(null);
    return true;
  }

  function handleTableauCardClick(pileIdx: number, cardIdx: number) {
    const col = state.tableau[pileIdx];
    const card = col[cardIdx];
    if (!card || !card.faceUp) return;
    if (sel) {
      if (sel.pile === pileIdx && sel.cardIndex === cardIdx) {
        setSel(null);
        return;
      }
      const next = moveCards(state, sel, pileIdx);
      if (!commit(next)) {
        toast.error("That run can't go there.");
        setSel(null);
      }
      return;
    }
    const cards = carriedCards(state, { pile: pileIdx, cardIndex: cardIdx });
    if (!isValidRun(cards)) {
      toast.error("That isn't a valid descending run.");
      return;
    }
    setSel({ pile: pileIdx, cardIndex: cardIdx });
  }

  function handleEmptyColumnClick(pileIdx: number) {
    if (!sel) return;
    const next = moveCards(state, sel, pileIdx);
    if (!commit(next)) {
      toast.error("That run can't go there.");
      setSel(null);
    }
  }

  function handleStockClick() {
    if (state.stock.length === 0) {
      toast.message("Stock is empty.");
      return;
    }
    if (state.tableau.some((c) => c.length === 0)) {
      toast.error("Fill every empty column before dealing again.");
      return;
    }
    const next = dealFromStock(state);
    commit(next);
  }

  const selectedIds = React.useMemo(() => {
    if (!sel) return new Set<string>();
    const cards = carriedCards(state, sel);
    return new Set(cards.map((c) => c.id));
  }, [sel, state]);

  const cardSize: CardSize = "sm";
  const faceUpOffset = 18;
  const faceDownOffset = 11;

  const content: GameContent = {
    intro:
      "Spider Solitaire with one suit (all spades) — the easiest of the three Spider variants. Build descending runs in the tableau, collect complete King-to-Ace sequences to the foundation, and clear all 8 to win. The 2-suit and 4-suit versions step up the difficulty by mixing suits and restricting multi-card moves to same-suit runs.",
    game: (
      <div className="rounded-xl border bg-card p-3 sm:p-5">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Sequences: {state.foundations.length}/8</Badge>
            <Badge variant="secondary">Moves: {state.moves}</Badge>
            <Badge variant="secondary">⏱ {formatTime(seconds)}</Badge>
            {best && (
              <Badge variant="outline">
                Best: {formatTime(best.time)} · {best.moves} moves
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={undo} disabled={history.length === 0}>
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </Button>
            <Button variant="default" size="sm" onClick={newGame}>
              <RotateCcw className="h-3.5 w-3.5" /> New game
            </Button>
          </div>
        </div>

        {/* Foundations + stock row */}
        <div className="mt-3 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => {
              const seq = state.foundations[i];
              if (!seq) {
                return (
                  <div
                    key={i}
                    className="flex h-14 w-10 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 bg-muted/20 text-[10px] text-muted-foreground/50"
                  >
                    K→A
                  </div>
                );
              }
              const top = seq[0];
              return (
                <div key={i} className="relative">
                  <CardView card={{ ...top, faceUp: true }} size={cardSize} />
                  <span className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-emerald-400/60" />
                </div>
              );
            })}
          </div>
          {/* Stock pile — click to deal 10. */}
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {Math.ceil(state.stock.length / 10)} deal{Math.ceil(state.stock.length / 10) === 1 ? "" : "s"} left
            </span>
            <div className="relative">
              {state.stock.length > 0 ? (
                <>
                  {state.stock.length > 10 && (
                    <span className="absolute left-1 top-1 h-14 w-10 rounded-md border border-slate-300/50 bg-indigo-600/80" />
                  )}
                  <button
                    type="button"
                    onClick={handleStockClick}
                    aria-label={`Deal 10 cards from stock — ${state.stock.length} remaining`}
                    className="relative flex h-14 w-10 items-center justify-center rounded-md border border-indigo-300/60 bg-gradient-to-br from-indigo-500 to-indigo-700 text-indigo-50 shadow-sm hover:brightness-110"
                  >
                    <Layers className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <div className="flex h-14 w-10 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 bg-muted/20 text-[10px] text-muted-foreground/50">
                  Empty
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="mt-4 overflow-x-auto">
          <div className="grid min-w-[700px] grid-cols-10 gap-1.5 sm:gap-2">
            {state.tableau.map((col, i) => (
              <div key={i} className="min-h-[120px]">
                <Pile
                  cards={col}
                  variant="fan"
                  size={cardSize}
                  faceUpOffset={faceUpOffset}
                  faceDownOffset={faceDownOffset}
                  emptyLabel=""
                  onPileClick={() => col.length === 0 && handleEmptyColumnClick(i)}
                  onCardClick={(_c, idx) => handleTableauCardClick(i, idx)}
                  selectedIds={selectedIds}
                />
              </div>
            ))}
          </div>
        </div>

        {won && (
          <div className="mt-4 rounded-md bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:text-emerald-300">
            🏆 All 8 sequences collected! Click <strong>New game</strong> for another deal.
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Tip: click a card to pick up a descending run, then click a destination column. Click the
          stock pile (top-right) to deal 10 more cards — every column must be non-empty first.
        </p>
      </div>
    ),
    rules: (
      <div className="space-y-3">
        <p>
          Spider Solitaire uses <strong>two decks (104 cards)</strong>. This build plays the
          one-suit easy version: all 104 cards are spades, so any descending run is automatically a
          legal multi-card move. The traditional <strong>2-suit</strong> (spades + hearts) and{" "}
          <strong>4-suit</strong> (full deck) variants add the constraint that multi-card moves
          must be same-suit runs — they're much harder.
        </p>
        <p>
          Cards are dealt into <strong>10 tableau columns</strong>: columns 1–4 get 6 cards each,
          columns 5–10 get 5 cards each. Only the top card of each column is face-up; the rest are
          face-down. The remaining 50 cards form the <strong>stock</strong>, dealt 10 at a time
          (one to each column) — that's 5 stock deals in total.
        </p>
        <p>
          The tableau builds <strong>down</strong> by rank: a 7 can go on an 8, a 6 on a 7, and so
          on. Suit doesn't matter in 1-suit mode. You can move either a single card or a valid
          descending run of cards as a group. Empty columns can be filled with any card or run.
          When a face-up card is removed from a column, the next card down is automatically flipped
          face-up.
        </p>
        <p>
          When a complete <strong>King → Ace</strong> descending sequence forms at the top of a
          column, it's automatically collected to a foundation. Win by collecting all{" "}
          <strong>8 sequences</strong> (8 × 13 = 104 cards).
        </p>
        <p>
          <strong>Dealing from the stock</strong>: when you click the stock, one card is dealt
          face-up to each of the 10 columns. You may not deal if any column is empty — fill empty
          columns first (with any card or run).
        </p>
      </div>
    ),
    tips: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Reveal face-down cards as fast as you can — the more you can see, the more options you have.</li>
        <li>Avoid dealing from the stock too early: every deal adds 10 new cards on top of your tableau, which can bury useful runs. Try to clear at least one column first.</li>
        <li>An empty column is a powerful wildcard — it can hold any card or run, letting you reshuffle the whole tableau. Try to keep one open.</li>
        <li>Build long descending runs and aim to complete K→A sequences in one column — once a sequence is collected, you'll never need those 13 cards again.</li>
        <li>If you find 1-suit too easy, the 2-suit and 4-suit variants in a desktop Solitaire collection use the same rules but restrict multi-card moves to same-suit runs.</li>
      </ul>
    ),
    controls: (
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Click</strong> a face-up card to pick up the descending run from that card to the top of its column (it'll glow). Click a destination column to drop the run.</li>
        <li><strong>Click an empty column</strong> to drop the currently held run there.</li>
        <li><strong>Click the stock pile</strong> (top-right) to deal 10 cards — one face-up card to each column.</li>
        <li><strong>Undo</strong> rewinds one move (up to 50 deep).</li>
        <li><strong>New game</strong> shuffles a fresh deal.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why won't it let me deal from the stock?",
        a: "Spider Solitaire forbids dealing if any of the 10 columns is empty — you'd just be wasting cards. Fill every empty column first (with any card or run), then deal.",
      },
      {
        q: "Why did a whole column disappear?",
        a: "When a complete King-to-Ace descending sequence forms at the top of a column, Spider Solitaire automatically collects those 13 cards to a foundation. That's the goal — collect all 8 sequences to win.",
      },
      {
        q: "Can I move a run of mixed suits?",
        a: "In this 1-suit build, yes — every card is a spade, so every descending run is same-suit. In the 2-suit and 4-suit variants (not included in this build, but mentioned in the rules), only same-suit descending runs can be moved as a group.",
      },
      {
        q: "Is my best time saved?",
        a: "Yes — your fastest winning time and the move count for that win are saved locally in your browser (under the dueneo:spider:best key). Nothing is uploaded.",
      },
    ],
  };

  return <GameLayout game={game} content={content} />;
}
