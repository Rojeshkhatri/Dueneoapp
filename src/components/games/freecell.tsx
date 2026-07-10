"use client";

import * as React from "react";
import { GameLayout, type GameContent } from "@/components/dueneo/game-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, Undo2 } from "lucide-react";
import type { GameDefinition } from "@/data/games";
import {
  type Card,
  type Suit,
  ALL_SUITS,
  createDeck,
  shuffle,
  canStackTableau,
  canStackFoundation,
  CardView,
  Pile,
  type CardSize,
} from "./_cards";
import { formatTime, readLocal, writeLocal, makeRng } from "./_game-helpers";

// ---------------------------------------------------------------------------
// FreeCell
// ---------------------------------------------------------------------------

const NUM_TABLEAU = 8;
const NUM_FREE = 4;
const NUM_FOUND = 4;

interface FreeCellState {
  tableau: Card[][];
  freeCells: (Card | null)[];
  foundations: [Card[], Card[], Card[], Card[]];
  moves: number;
}

type Selection =
  | { source: "tableau"; pile: number; cardIndex: number }
  | { source: "freeCell"; index: number }
  | { source: "foundation"; pile: number }
  | null;
type ActiveSelection = Exclude<Selection, null>;

function sameSelection(a: Selection, b: Selection): boolean {
  if (!a || !b) return false;
  if (a.source === "freeCell") return b.source === "freeCell" && a.index === b.index;
  if (a.source === "foundation") return b.source === "foundation" && a.pile === b.pile;
  return b.source === "tableau" && a.pile === b.pile && a.cardIndex === b.cardIndex;
}

// ---- Setup ----

function deal(seed: number): FreeCellState {
  const rng = makeRng(seed);
  const deck = shuffle(createDeck(ALL_SUITS), rng);
  const tableau: Card[][] = Array.from({ length: NUM_TABLEAU }, () => []);
  // Cols 1-4 get 7 cards, cols 5-8 get 6 cards. Total = 28 + 24 = 52.
  for (let col = 0; col < NUM_TABLEAU; col++) {
    const count = col < 4 ? 7 : 6;
    for (let i = 0; i < count; i++) {
      const card = deck.pop()!;
      card.faceUp = true; // All cards face-up in FreeCell.
      tableau[col].push(card);
    }
  }
  return {
    tableau,
    freeCells: [null, null, null, null],
    foundations: [[], [], [], []],
    moves: 0,
  };
}

function cloneState(s: FreeCellState): FreeCellState {
  return {
    tableau: s.tableau.map((p) => p.map((c) => ({ ...c }))),
    freeCells: s.freeCells.map((c) => (c ? { ...c } : null)),
    foundations: s.foundations.map((p) => p.map((c) => ({ ...c }))) as [
      Card[],
      Card[],
      Card[],
      Card[]
    ],
    moves: s.moves,
  };
}

// ---- Move logic ----

function carriedCards(state: FreeCellState, sel: Selection): Card[] {
  if (!sel) return [];
  if (sel.source === "freeCell") {
    const c = state.freeCells[sel.index];
    return c ? [c] : [];
  }
  if (sel.source === "foundation") {
    const f = state.foundations[sel.pile];
    return f.length > 0 ? [f[f.length - 1]] : [];
  }
  return state.tableau[sel.pile].slice(sel.cardIndex);
}

/** Validate an alternating-colour descending run (Klondike tableau rule). */
function isValidAltRun(cards: Card[]): boolean {
  if (cards.length === 0) return false;
  if (!cards.every((c) => c.faceUp)) return false;
  for (let i = 0; i < cards.length - 1; i++) {
    if (!canStackTableau(cards[i + 1], cards[i])) return false;
  }
  return true;
}

function canDropOnFoundation(cards: Card[], foundation: Card[]): boolean {
  if (cards.length !== 1) return false;
  const top = foundation.length > 0 ? foundation[foundation.length - 1] : null;
  return canStackFoundation(cards[0], top);
}

function canDropOnTableau(cards: Card[], col: Card[]): boolean {
  if (cards.length === 0) return false;
  if (col.length === 0) return true; // any card or run on empty column
  return canStackTableau(cards[0], col[col.length - 1]);
}

/**
 * Maximum number of cards that can be moved as a "supermove" given the current
 * empty free cells and empty tableau columns. If `targetIsEmptyCol` is true,
 * the destination column does NOT count toward the multiplier.
 *
 *   max = (1 + emptyFreeCells) * 2^emptyCols
 *   (when target is empty: emptyCols - 1 instead)
 */
function maxMovable(state: FreeCellState, targetIsEmptyCol: boolean): number {
  const emptyFree = state.freeCells.filter((c) => c === null).length;
  let emptyCols = 0;
  for (let i = 0; i < NUM_TABLEAU; i++) {
    if (state.tableau[i].length === 0) emptyCols += 1;
  }
  if (targetIsEmptyCol) emptyCols = Math.max(0, emptyCols - 1);
  return (1 + emptyFree) * Math.pow(2, emptyCols);
}

function findFoundationFor(state: FreeCellState, card: Card): number {
  for (let i = 0; i < NUM_FOUND; i++) {
    if (canDropOnFoundation([card], state.foundations[i])) return i;
  }
  return -1;
}

function removeFromSource(state: FreeCellState, sel: ActiveSelection) {
  if (sel.source === "freeCell") {
    state.freeCells[sel.index] = null;
  } else if (sel.source === "foundation") {
    state.foundations[sel.pile].pop();
  } else {
    state.tableau[sel.pile].splice(sel.cardIndex);
  }
}

function moveToFreeCell(state: FreeCellState, sel: ActiveSelection, cellIdx: number): FreeCellState | null {
  if (state.freeCells[cellIdx] !== null) return null;
  const cards = carriedCards(state, sel);
  if (cards.length !== 1) return null;
  const next = cloneState(state);
  removeFromSource(next, sel);
  next.freeCells[cellIdx] = { ...cards[0], faceUp: true };
  next.moves += 1;
  return next;
}

function moveToFoundation(state: FreeCellState, sel: ActiveSelection, foundIdx: number): FreeCellState | null {
  const cards = carriedCards(state, sel);
  if (cards.length !== 1) return null;
  if (!canDropOnFoundation(cards, state.foundations[foundIdx])) return null;
  const next = cloneState(state);
  removeFromSource(next, sel);
  next.foundations[foundIdx].push({ ...cards[0], faceUp: true });
  next.moves += 1;
  return next;
}

function moveToTableau(state: FreeCellState, sel: ActiveSelection, colIdx: number): FreeCellState | null {
  const cards = carriedCards(state, sel);
  if (!isValidAltRun(cards)) return null;
  const targetEmpty = state.tableau[colIdx].length === 0;
  if (!canDropOnTableau(cards, state.tableau[colIdx])) return null;
  // Supermove size check.
  const max = maxMovable(state, targetEmpty);
  if (cards.length > max) return null;
  const next = cloneState(state);
  removeFromSource(next, sel);
  for (const c of cards) next.tableau[colIdx].push({ ...c, faceUp: true });
  next.moves += 1;
  return next;
}

function isWin(state: FreeCellState): boolean {
  return state.foundations.reduce((acc, f) => acc + f.length, 0) === 52;
}

// ---- Component ----

const BEST_KEY = "dueneo:freecell:best";

export function FreeCell({ game }: { game: GameDefinition }) {
  const [state, setState] = React.useState<FreeCellState>(() =>
    deal(Math.floor(Math.random() * 1e9))
  );
  const [history, setHistory] = React.useState<FreeCellState[]>([]);
  const [sel, setSel] = React.useState<Selection>(null);
  const [seconds, setSeconds] = React.useState(0);
  const [won, setWon] = React.useState(false);
  const [best, setBest] = React.useState<{ time: number; moves: number } | null>(() =>
    readLocal(BEST_KEY, null)
  );

  React.useEffect(() => {
    if (won) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [won]);

  React.useEffect(() => {
    if (!won && isWin(state)) {
      setWon(true);
      const newBest = { time: seconds, moves: state.moves };
      if (!best || newBest.time < best.time) {
        setBest(newBest);
        writeLocal(BEST_KEY, newBest);
        toast.success(`🏆 You won in ${formatTime(seconds)} and ${state.moves} moves — new best!`);
      } else {
        toast.success(`🏆 You won in ${formatTime(seconds)} and ${state.moves} moves!`);
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

  function commit(next: FreeCellState | null): boolean {
    if (!next) return false;
    setHistory((h) => [...h.slice(-49), state]);
    setState(next);
    setSel(null);
    return true;
  }

  function pickUp(source: ActiveSelection): boolean {
    const cards = carriedCards(state, source);
    if (cards.length === 0) return false;
    if (source.source === "tableau" && !isValidAltRun(cards)) return false;
    setSel(source);
    return true;
  }

  function dropOn(target: ActiveSelection) {
    if (!sel) return;
    let next: FreeCellState | null = null;
    if (target.source === "freeCell") {
      next = moveToFreeCell(state, sel, target.index);
    } else if (target.source === "foundation") {
      next = moveToFoundation(state, sel, target.pile);
    } else {
      next = moveToTableau(state, sel, target.pile);
    }
    if (!commit(next)) {
      toast.error("That move isn't legal.");
      setSel(null);
    }
  }

  function handleSelectOrDrop(source: ActiveSelection) {
    if (!sel) {
      pickUp(source);
      return;
    }
    if (sameSelection(sel, source)) {
      setSel(null);
      return;
    }
    dropOn(source);
  }

  // Free cell click.
  function handleFreeCellClick(idx: number) {
    const cell = state.freeCells[idx];
    if (sel) {
      // Drop into this cell if it's empty.
      if (cell !== null) {
        // Cell is occupied — re-select that card instead.
        if (sameSelection(sel, { source: "freeCell", index: idx })) {
          setSel(null);
          return;
        }
        // Can't drop into an occupied cell — try to pick up the cell's card instead.
        setSel(null);
        pickUp({ source: "freeCell", index: idx });
        return;
      }
      dropOn({ source: "freeCell", index: idx });
      return;
    }
    if (cell === null) return;
    pickUp({ source: "freeCell", index: idx });
  }

  // Foundation click.
  function handleFoundationClick(idx: number) {
    if (sel) {
      dropOn({ source: "foundation", pile: idx });
      return;
    }
    if (state.foundations[idx].length === 0) return;
    pickUp({ source: "foundation", pile: idx });
  }

  // Tableau card click.
  function handleTableauCardClick(pileIdx: number, cardIdx: number) {
    const col = state.tableau[pileIdx];
    const card = col[cardIdx];
    if (!card) return;
    if (sel) {
      // Drop on top of this column.
      if (sameSelection(sel, { source: "tableau", pile: pileIdx, cardIndex: cardIdx })) {
        setSel(null);
        return;
      }
      dropOn({ source: "tableau", pile: pileIdx, cardIndex: col.length - 1 });
      return;
    }
    pickUp({ source: "tableau", pile: pileIdx, cardIndex: cardIdx });
  }

  function handleTableauEmptyClick(pileIdx: number) {
    if (!sel) return;
    dropOn({ source: "tableau", pile: pileIdx, cardIndex: 0 });
  }

  function handleAutoSend(source: ActiveSelection) {
    const cards = carriedCards(state, source);
    if (cards.length !== 1) return;
    const idx = findFoundationFor(state, cards[0]);
    if (idx === -1) return;
    const next = moveToFoundation(state, source, idx);
    commit(next);
  }

  const selectedIds = React.useMemo(() => {
    if (!sel) return new Set<string>();
    const cards = carriedCards(state, sel);
    return new Set(cards.map((c) => c.id));
  }, [sel, state]);

  // Maximum supermove size for the move-hint display.
  const maxMoveHint = React.useMemo(() => {
    return maxMovable(state, false);
  }, [state]);

  const cardSize: CardSize = "sm";
  const faceUpOffset = 18;
  const faceDownOffset = 11;

  const content: GameContent = {
    intro:
      "FreeCell is the thinking player's solitaire — every card is dealt face-up at the start, so there's no hidden information and almost every deal is solvable with careful play. Use the 4 free cells as temporary parking, build the 4 foundations up by suit from Ace to King, and stack the tableau down in alternating colours.",
    game: (
      <div className="rounded-xl border bg-card p-3 sm:p-5">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Moves: {state.moves}</Badge>
            <Badge variant="secondary">⏱ {formatTime(seconds)}</Badge>
            <Badge variant="outline" title="Maximum cards you can move as one supermove with current empty cells + columns">
              Max move: {maxMoveHint}
            </Badge>
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

        {/* Top row: free cells + foundations */}
        <div className="mt-4 overflow-x-auto">
          <div className="grid min-w-[350px] sm:min-w-[520px] grid-cols-9 gap-2 sm:gap-3">
            {/* 4 free cells */}
            {state.freeCells.map((cell, i) => (
              <div key={`fc-${i}`} className="relative">
                {cell === null ? (
                  <button
                    type="button"
                    onClick={() => handleFreeCellClick(i)}
                    aria-label={`Free cell ${i + 1}, empty`}
                    className={`flex h-11 w-8 sm:h-14 sm:w-10 md:h-16 md:w-12 items-center justify-center rounded-md border-2 border-dashed text-[8px] sm:text-[10px] text-muted-foreground/60 transition-colors hover:bg-muted/40 ${
                      sel ? "border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/20" : "border-muted-foreground/25 bg-muted/20"
                    }`}
                  >
                    Free
                  </button>
                ) : (
                  <CardView
                    card={cell}
                    size={cardSize}
                    selected={selectedIds.has(cell.id)}
                    onClick={() => handleFreeCellClick(i)}
                    onDoubleClick={() => handleAutoSend({ source: "freeCell", index: i })}
                  />
                )}
              </div>
            ))}
            {/* Spacer */}
            <div />
            {/* 4 foundations */}
            {state.foundations.map((f, i) => (
              <div key={`fd-${i}`}>
                {f.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => handleFoundationClick(i)}
                    aria-label={`Foundation ${i + 1}, empty`}
                    className={`flex h-11 w-8 sm:h-14 sm:w-10 md:h-16 md:w-12 items-center justify-center rounded-md border-2 border-dashed text-xs sm:text-base text-muted-foreground/60 transition-colors hover:bg-muted/40 ${
                      sel ? "border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/20" : "border-muted-foreground/25 bg-muted/20"
                    }`}
                  >
                    {foundationLabel(i)}
                  </button>
                ) : (
                  <Pile
                    cards={f}
                    variant="stack"
                    size={cardSize}
                    onCardClick={() => handleFoundationClick(i)}
                    onCardDoubleClick={() => {
                      /* No-op — foundations don't auto-send. */
                    }}
                    selectedIds={selectedIds}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tableau */}
        <div className="mt-5 overflow-x-auto">
          <div className="grid min-w-[350px] sm:min-w-[520px] grid-cols-8 gap-2 sm:gap-3">
            {state.tableau.map((col, i) => (
              <div key={i} className="min-h-[120px]">
                <Pile
                  cards={col}
                  variant="fan"
                  size={cardSize}
                  faceUpOffset={faceUpOffset}
                  faceDownOffset={faceDownOffset}
                  emptyLabel=""
                  onPileClick={() => col.length === 0 && handleTableauEmptyClick(i)}
                  onCardClick={(_c, idx) => handleTableauCardClick(i, idx)}
                  onCardDoubleClick={(_c, idx) => {
                    // Only auto-send the top card.
                    if (idx !== col.length - 1) return;
                    handleAutoSend({ source: "tableau", pile: i, cardIndex: idx });
                  }}
                  selectedIds={selectedIds}
                />
              </div>
            ))}
          </div>
        </div>

        {won && (
          <div className="mt-4 rounded-md bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:text-emerald-300">
            🏆 You won! All 52 cards are home. Click <strong>New game</strong> for another deal.
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Tip: click a card to pick it up (the whole valid run above it travels too), then click a
          destination. Double-click a top card to send it to a foundation. The "Max move" badge
          shows the largest supermove you can make right now.
        </p>
      </div>
    ),
    rules: (
      <div className="space-y-3">
        <p>
          FreeCell uses a 52-card deck dealt into <strong>8 tableau columns</strong>: columns 1–4
          get 7 cards each, columns 5–8 get 6 cards each. Every card is dealt face-up — there's no
          hidden information, no stock, no waste. Above the tableau sit{" "}
          <strong>4 free cells</strong> (each can hold a single card) and{" "}
          <strong>4 foundations</strong> (one per suit).
        </p>
        <p>
          <strong>Foundations</strong> build up by suit from Ace to King. An Ace starts a
          foundation, then the 2 of the same suit goes on top, and so on up to the King. Win when
          all 52 cards sit on the foundations.
        </p>
        <p>
          <strong>Tableau</strong> columns build <strong>down</strong> in alternating colours — a
          red 6 on a black 7, a black 5 on a red 6, and so on. Empty columns can be filled with any
          card or run.
        </p>
        <p>
          You can only move a single card at a time, but you can effectively move a sequence as one
          "supermove" if you have enough spare capacity. The maximum run you can move is{" "}
          <code className="rounded bg-muted px-1">(1 + empty free cells) × 2<sup>empty columns</sup></code>
          {" "}— when moving onto an empty column, that column doesn't count toward the multiplier.
          The "Max move" badge shows the current cap.
        </p>
        <p>
          Free cells are single-card parking spots — drop a card there to free up a column, then
          pick it up again later. With 4 free cells and 4 columns, the deepest supermove you can
          realistically pull off is 5 × 2<sup>3</sup> = 40 cards (more than enough to relocate any
          run).
        </p>
      </div>
    ),
    tips: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Keep free cells empty whenever possible — they're your most flexible resource.</li>
        <li>Try to empty a column: an empty column doubles your supermove capacity and gives you somewhere to relocate long runs.</li>
        <li>Send Aces and 2s to the foundations as soon as you can — they're never useful on the tableau.</li>
        <li>Be careful with high cards (J, Q, K) on the tableau — they're hard to move off because nothing stacks on top of a King.</li>
        <li>Plan ahead: because every card is visible from the start, almost every FreeCell deal is solvable with perfect play. If you're stuck, undo and try a different ordering.</li>
      </ul>
    ),
    controls: (
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Click</strong> a face-up card to pick it up (the whole valid alt-colour descending run above it travels too). Click a destination to drop.</li>
        <li><strong>Click a free cell</strong> to drop the held card there, or to pick up the card sitting in it.</li>
        <li><strong>Click a foundation</strong> to drop the held card if it's legal (Ace on empty, same-suit +1 on top).</li>
        <li><strong>Double-click</strong> a top card to auto-send it to a foundation if legal.</li>
        <li><strong>Undo</strong> rewinds one move (up to 50 deep). <strong>New game</strong> shuffles a fresh deal.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why did my multi-card move get rejected?",
        a: "FreeCell only lets you physically move one card at a time. You can move a run as one supermove only if you have enough spare capacity — the cap is (1 + empty free cells) × 2^(empty columns). The \"Max move\" badge shows the current limit. If your run is too long, free up a free cell or empty a column first.",
      },
      {
        q: "Is every FreeCell deal solvable?",
        a: "Almost. Of the 32,000 numbered Microsoft FreeCell deals, only deal #11982 is famously unsolvable. With perfect play you can solve essentially every random deal — that's what makes FreeCell a game of skill rather than luck.",
      },
      {
        q: "Can I move a card from a foundation back to the tableau?",
        a: "Yes — click the top foundation card to pick it up, then click the destination column. This is occasionally useful for unblocking a card you sent up too early.",
      },
      {
        q: "Is my best time saved?",
        a: "Yes — your fastest winning time and the move count for that win are saved locally in your browser (under the dueneo:freecell:best key). Nothing is uploaded.",
      },
    ],
  };

  return <GameLayout game={game} content={content} />;
}

// ---------------------------------------------------------------------------
// Foundation slot label — show a faint suit hint in the empty foundation slot.
// ---------------------------------------------------------------------------

function foundationLabel(index: number): string {
  const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
  return { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" }[suits[index]];
}
