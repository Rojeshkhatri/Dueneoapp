"use client";

import * as React from "react";
import { GameLayout, type GameContent } from "@/components/dueneo/game-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, Undo2, Sparkles } from "lucide-react";
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
// Types
// ---------------------------------------------------------------------------

type DrawMode = 1 | 3;

interface SolitaireState {
  stock: Card[];
  waste: Card[];
  foundations: [Card[], Card[], Card[], Card[]];
  tableau: Card[][];
  /** How many cards from the top of the waste are "drawn together" (for draw-3 visual). */
  wasteDrawnCount: number;
  moves: number;
}

type Selection =
  | { source: "waste"; cardIndex: number }
  | { source: "tableau"; pile: number; cardIndex: number }
  | { source: "foundation"; pile: number; cardIndex: number }
  | null;

function sameSelection(a: Selection, b: Selection): boolean {
  if (!a || !b) return false;
  if (a.source !== b.source) return false;
  if (a.source === "waste") return true;
  return a.pile === b.pile && a.cardIndex === b.cardIndex;
}

// ---------------------------------------------------------------------------
// Game logic
// ---------------------------------------------------------------------------

function deal(seed: number): SolitaireState {
  const rng = makeRng(seed);
  const deck = shuffle(createDeck(ALL_SUITS), rng);
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);
  for (let col = 0; col < 7; col++) {
    for (let i = 0; i <= col; i++) {
      const card = deck.pop()!;
      card.faceUp = i === col; // top card face-up
      tableau[col].push(card);
    }
  }
  // Remaining 24 cards → stock, all face-down.
  const stock = deck.map((c) => ({ ...c, faceUp: false }));
  return {
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    wasteDrawnCount: 0,
    moves: 0,
  };
}

function cloneState(s: SolitaireState): SolitaireState {
  return {
    stock: s.stock.map((c) => ({ ...c })),
    waste: s.waste.map((c) => ({ ...c })),
    foundations: s.foundations.map((p) => p.map((c) => ({ ...c }))) as [
      Card[],
      Card[],
      Card[],
      Card[]
    ],
    tableau: s.tableau.map((p) => p.map((c) => ({ ...c }))),
    wasteDrawnCount: s.wasteDrawnCount,
    moves: s.moves,
  };
}

/** Cards that would be carried if `sel` is picked up. */
function carriedCards(state: SolitaireState, sel: Selection): Card[] {
  if (!sel) return [];
  if (sel.source === "waste") {
    if (state.waste.length === 0) return [];
    return [state.waste[state.waste.length - 1]];
  }
  if (sel.source === "foundation") {
    const f = state.foundations[sel.pile];
    if (f.length === 0) return [];
    return [f[f.length - 1]];
  }
  // tableau
  return state.tableau[sel.pile].slice(sel.cardIndex);
}

/** Validate that the carried sequence is a legal Klondike run (alt colour, descending). */
function isValidCarry(cards: Card[]): boolean {
  for (let i = 0; i < cards.length - 1; i++) {
    if (!canStackTableau(cards[i + 1], cards[i])) return false;
  }
  return cards.every((c) => c.faceUp);
}

function canDropOnFoundation(cards: Card[], foundation: Card[]): boolean {
  if (cards.length !== 1) return false;
  const top = foundation.length > 0 ? foundation[foundation.length - 1] : null;
  return canStackFoundation(cards[0], top);
}

function canDropOnTableau(cards: Card[], col: Card[], easyEmpty: boolean): boolean {
  if (cards.length === 0) return false;
  if (col.length === 0) {
    return easyEmpty || cards[0].rank === 13; // King (or any card in easy mode)
  }
  return canStackTableau(cards[0], col[col.length - 1]);
}

/** Returns the index of the foundation that would accept this card, or -1. */
function findFoundationFor(state: SolitaireState, card: Card): number {
  for (let i = 0; i < 4; i++) {
    if (canDropOnFoundation([card], state.foundations[i])) return i;
  }
  return -1;
}

/** Execute a move from `sel` to a foundation pile. Returns new state or null if illegal. */
function moveToFoundation(state: SolitaireState, sel: Selection, foundationIdx: number): SolitaireState | null {
  const cards = carriedCards(state, sel);
  if (!isValidCarry(cards)) return null;
  if (!canDropOnFoundation(cards, state.foundations[foundationIdx])) return null;
  const next = cloneState(state);
  removeFromSource(next, sel);
  next.foundations[foundationIdx].push({ ...cards[0], faceUp: true });
  next.moves += 1;
  flipTop(next, sel);
  return next;
}

function moveToTableau(state: SolitaireState, sel: Selection, colIdx: number, easyEmpty: boolean): SolitaireState | null {
  const cards = carriedCards(state, sel);
  if (!isValidCarry(cards)) return null;
  if (!canDropOnTableau(cards, state.tableau[colIdx], easyEmpty)) return null;
  const next = cloneState(state);
  removeFromSource(next, sel);
  for (const c of cards) next.tableau[colIdx].push({ ...c, faceUp: true });
  next.moves += 1;
  flipTop(next, sel);
  return next;
}

function removeFromSource(state: SolitaireState, sel: Selection) {
  if (sel.source === "waste") {
    state.waste.pop();
    // Decrement wasteDrawnCount if we used one of the drawn cards.
    if (state.wasteDrawnCount > 0) state.wasteDrawnCount -= 1;
  } else if (sel.source === "foundation") {
    state.foundations[sel.pile].pop();
  } else {
    state.tableau[sel.pile].splice(sel.cardIndex);
  }
}

/** After removing cards, flip the new top of a tableau column if it's face-down. */
function flipTop(state: SolitaireState, sel: Selection) {
  if (sel.source !== "tableau") return;
  const col = state.tableau[sel.pile];
  if (col.length > 0 && !col[col.length - 1].faceUp) {
    col[col.length - 1].faceUp = true;
  }
}

function drawFromStock(state: SolitaireState, drawMode: DrawMode): SolitaireState | null {
  if (state.stock.length === 0) {
    // Recycle waste → stock.
    if (state.waste.length === 0) return null;
    const next = cloneState(state);
    const recycled = next.waste.reverse().map((c) => ({ ...c, faceUp: false }));
    next.stock = recycled;
    next.waste = [];
    next.wasteDrawnCount = 0;
    next.moves += 1;
    return next;
  }
  const next = cloneState(state);
  const n = Math.min(drawMode, next.stock.length);
  const drawn: Card[] = [];
  for (let i = 0; i < n; i++) {
    const card = next.stock.pop()!;
    card.faceUp = true;
    drawn.push(card);
  }
  next.waste.push(...drawn);
  next.wasteDrawnCount = n;
  next.moves += 1;
  return next;
}

function isWin(state: SolitaireState): boolean {
  return state.foundations.reduce((acc, f) => acc + f.length, 0) === 52;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BEST_KEY = "dueneo:solitaire:best";

export function Solitaire({ game }: { game: GameDefinition }) {
  const [seed, setSeed] = React.useState<number>(() => Math.floor(Math.random() * 1e9));
  const [drawMode, setDrawMode] = React.useState<DrawMode>(1);
  const [easyEmpty, setEasyEmpty] = React.useState(false);
  const [state, setState] = React.useState<SolitaireState>(() => deal(seed));
  const [history, setHistory] = React.useState<SolitaireState[]>([]);
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
        toast.success(`🏆 You won in ${formatTime(seconds)} and ${state.moves} moves — new best!`);
      } else {
        toast.success(`🏆 You won in ${formatTime(seconds)} and ${state.moves} moves!`);
      }
    }
  }, [state, won, seconds, best, state.moves]);

  function pushHistory(prev: SolitaireState) {
    setHistory((h) => [...h.slice(-49), prev]);
  }

  function newGame(nextMode: DrawMode = drawMode, nextEasy: boolean = easyEmpty) {
    const s = Math.floor(Math.random() * 1e9);
    setSeed(s);
    setDrawMode(nextMode);
    setEasyEmpty(nextEasy);
    setState(deal(s));
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

  function commit(next: SolitaireState | null, prev: SolitaireState) {
    if (!next) return false;
    pushHistory(prev);
    setState(next);
    setSel(null);
    return true;
  }

  // ---- Click handlers ----

  function handleStockClick() {
    const next = drawFromStock(state, drawMode);
    if (!next) return;
    commit(next, state);
  }

  function handleSelect(source: Selection) {
    if (!source) return;
    if (!sel) {
      // Pick up.
      const cards = carriedCards(state, source);
      if (cards.length === 0 || !isValidCarry(cards)) return;
      setSel(source);
      return;
    }
    // Already holding something.
    if (sameSelection(sel, source)) {
      // Clicked the same card → deselect.
      setSel(null);
      return;
    }
    // Otherwise: try to drop on the clicked card's pile.
    dropSelection(source);
  }

  function dropSelection(target: Selection) {
    if (!sel) return;
    if (target.source === "foundation") {
      const next = moveToFoundation(state, sel, target.pile);
      if (!commit(next, state)) {
        toast.error("That card can't go there.");
        setSel(null);
      }
      return;
    }
    if (target.source === "tableau") {
      const next = moveToTableau(state, sel, target.pile, easyEmpty);
      if (!commit(next, state)) {
        toast.error("That card can't go there.");
        setSel(null);
      }
      return;
    }
    // Can't drop on waste.
    setSel(null);
  }

  function handleFoundationClick(idx: number) {
    if (sel) {
      dropSelection({ source: "foundation", pile: idx, cardIndex: state.foundations[idx].length - 1 });
      return;
    }
    if (state.foundations[idx].length === 0) return;
    handleSelect({ source: "foundation", pile: idx, cardIndex: state.foundations[idx].length - 1 });
  }

  function handleTableauCardClick(pileIdx: number, cardIdx: number) {
    const col = state.tableau[pileIdx];
    const card = col[cardIdx];
    if (!card || !card.faceUp) return;
    if (sel) {
      // Drop on the top of this column.
      const target: Selection = { source: "tableau", pile: pileIdx, cardIndex: col.length - 1 };
      dropSelection(target);
      return;
    }
    handleSelect({ source: "tableau", pile: pileIdx, cardIndex: cardIdx });
  }

  function handleTableauEmptyClick(pileIdx: number) {
    if (!sel) return;
    const next = moveToTableau(state, sel, pileIdx, easyEmpty);
    if (!commit(next, state)) {
      toast.error("That card can't go there.");
      setSel(null);
    }
  }

  function handleWasteClick() {
    if (state.waste.length === 0) return;
    if (sel) {
      // Can't drop on waste; deselect.
      setSel(null);
      return;
    }
    handleSelect({ source: "waste", cardIndex: state.waste.length - 1 });
  }

  function handleAutoSend(source: Selection) {
    const cards = carriedCards(state, source);
    if (cards.length !== 1) return;
    const idx = findFoundationFor(state, cards[0]);
    if (idx === -1) return;
    const next = moveToFoundation(state, source, idx);
    commit(next, state);
  }

  // ---- Selected card IDs for highlight ----
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
      "The classic Klondike Solitaire you grew up with. Build four foundations up by suit from Ace to King, while stacking the tableau down in alternating colours. Choose draw-1 for an easier ride, or draw-3 for the traditional challenge.",
    game: (
      <div className="rounded-xl border bg-card p-3 sm:p-5">
        {/* Top bar: stats + controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Moves: {state.moves}</Badge>
            <Badge variant="secondary">⏱ {formatTime(seconds)}</Badge>
            {best && (
              <Badge variant="outline">
                Best: {formatTime(best.time)} · {best.moves} moves
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
              <button
                type="button"
                onClick={() => newGame(1, easyEmpty)}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  drawMode === 1 ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Draw 1
              </button>
              <button
                type="button"
                onClick={() => newGame(3, easyEmpty)}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  drawMode === 3 ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Draw 3
              </button>
            </div>
            <Button
              type="button"
              variant={easyEmpty ? "default" : "outline"}
              size="sm"
              onClick={() => setEasyEmpty((e) => !e)}
              title="Allow any card on empty tableau columns (easy mode)"
            >
              <Sparkles className="h-3.5 w-3.5" /> Easy
            </Button>
            <Button variant="outline" size="sm" onClick={undo} disabled={history.length === 0}>
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </Button>
            <Button variant="default" size="sm" onClick={() => newGame(drawMode, easyEmpty)}>
              <RotateCcw className="h-3.5 w-3.5" /> New game
            </Button>
          </div>
        </div>

        {/* Play area */}
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Top row: stock | waste | gap | 4 foundations */}
            <div className="grid grid-cols-7 gap-2 sm:gap-3">
              {/* Stock */}
              <div>
                <Pile
                  cards={state.stock}
                  variant="stack"
                  size={cardSize}
                  emptyLabel="↻"
                  onPileClick={handleStockClick}
                  onCardClick={handleStockClick}
                />
              </div>
              {/* Waste */}
              <div>
                {state.waste.length === 0 ? (
                  <Pile cards={[]} variant="stack" size={cardSize} emptyLabel="" />
                ) : (
                  // Show up to 3 most recent drawn cards fanned slightly (only in draw-3 mode).
                  <WasteView
                    waste={state.waste}
                    drawnCount={drawMode === 3 ? state.wasteDrawnCount : 1}
                    size={cardSize}
                    selected={selectedIds}
                    onClick={handleWasteClick}
                    onDoubleClick={() => handleAutoSend({ source: "waste", cardIndex: state.waste.length - 1 })}
                  />
                )}
              </div>
              {/* Spacer */}
              <div />
              {/* 4 Foundations */}
              {state.foundations.map((f, i) => (
                <div key={i}>
                  <Pile
                    cards={f}
                    variant="stack"
                    size={cardSize}
                    emptyLabel={foundationLabel(i)}
                    onPileClick={() => handleFoundationClick(i)}
                    onCardClick={() => handleFoundationClick(i)}
                    onCardDoubleClick={() => {
                      if (f.length === 0) return;
                      handleSelect({ source: "foundation", pile: i, cardIndex: f.length - 1 });
                    }}
                    selectedIds={selectedIds}
                  />
                </div>
              ))}
            </div>

            {/* Tableau */}
            <div className="mt-5 grid grid-cols-7 gap-2 sm:gap-3">
              {state.tableau.map((col, i) => (
                <div key={i} className="min-h-[100px]">
                  <Pile
                    cards={col}
                    variant="fan"
                    size={cardSize}
                    faceUpOffset={faceUpOffset}
                    faceDownOffset={faceDownOffset}
                    emptyLabel="K"
                    onPileClick={() => col.length === 0 && handleTableauEmptyClick(i)}
                    onCardClick={(_c, idx) => handleTableauCardClick(i, idx)}
                    onCardDoubleClick={(_c, idx) => {
                      // Only auto-send if the card is the top face-up card.
                      if (idx !== col.length - 1) return;
                      handleAutoSend({ source: "tableau", pile: i, cardIndex: idx });
                    }}
                    selectedIds={selectedIds}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {won && (
          <div className="mt-4 rounded-md bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:text-emerald-300">
            🏆 You won! All 52 cards are home. Click <strong>New game</strong> for another deal.
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Tip: click a card to pick it up, then click a destination. Double-click a card to send it
          to a foundation. Click the stock pile to draw — click an empty stock to recycle the waste.
        </p>
      </div>
    ),
    rules: (
      <div className="space-y-3">
        <p>
          Klondike Solitaire uses a standard 52-card deck. Cards are dealt into{" "}
          <strong>7 tableau columns</strong>: column 1 has 1 card, column 2 has 2, and so on up to
          column 7 with 7 cards. Only the top card of each column is dealt face-up; the rest are
          face-down. The remaining 24 cards form the <strong>stock</strong>.
        </p>
        <p>
          <strong>Foundations</strong> (four piles, top-right) are built up by suit from Ace to King.
          An Ace starts a foundation, then the 2 of the same suit goes on top, then the 3, and so on
          up to the King. Win when all 52 cards sit on the foundations.
        </p>
        <p>
          <strong>Tableau</strong> columns are built <strong>down</strong> in alternating colours —
          a red 6 (♥ or ♦) on a black 7 (♠ or ♣), or a black 5 on a red 6. You can move either a
          single face-up card or a valid descending alternating-colour run of cards as a group.
          When you remove the top card of a column, the next card down is automatically flipped
          face-up. Empty tableau columns may only be filled with a King (or any card if you have
          Easy mode on).
        </p>
        <p>
          Click the <strong>stock</strong> to draw cards to the <strong>waste</strong>. In draw-1
          mode you draw one card at a time; in draw-3 mode you draw three and only the topmost is
          available. When the stock is empty, clicking it again recycles the waste back into the
          stock. The top card of the waste may be played to the tableau or to a foundation.
        </p>
      </div>
    ),
    tips: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Turn over face-down tableau cards as fast as you can — information is power.</li>
        <li>Don't rush Aces and 2s to the foundation: low cards rarely help on the tableau, but you sometimes need a 2 down to receive a red Ace from a buried position.</li>
        <li>Try to keep at least one empty tableau column open — it gives you somewhere to stash a King or to rearrange long runs.</li>
        <li>In draw-3 mode, plan several draws ahead: the cards you need might be two draws down.</li>
        <li>If you're stuck, click Undo and try a different line — most lost games are still winnable with better play.</li>
      </ul>
    ),
    controls: (
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Click</strong> a face-up card to pick it up (it'll glow). Click a destination pile to drop it.</li>
        <li><strong>Double-click</strong> a top card to auto-send it to a foundation if legal.</li>
        <li><strong>Click the stock</strong> (top-left) to draw — click it when empty to recycle the waste.</li>
        <li><strong>Draw 1 / Draw 3</strong> toggles difficulty (starts a new game).</li>
        <li><strong>Easy</strong> mode lets any card fill an empty tableau column (default: Kings only).</li>
        <li><strong>Undo</strong> rewinds one move (up to 50 deep).</li>
      </ul>
    ),
    faq: [
      {
        q: "What's the difference between Draw 1 and Draw 3?",
        a: "Draw 1 is the easier mode — you draw one card at a time and can cycle through the stock as often as you like. Draw 3 is the traditional Windows Solitaire mode: you draw three cards at a time and only the topmost is playable, which makes the game meaningfully harder.",
      },
      {
        q: "Can I move a sequence of cards at once?",
        a: "Yes. Click the topmost card you want to move and the whole valid alternating-colour descending run above it will travel together. Invalid runs (e.g. a 7 sitting on a 5) can't be picked up.",
      },
      {
        q: "Why won't my card go on an empty column?",
        a: "By Klondike rules only a King may start a new tableau column. Toggle the Easy button if you want to allow any card there for a more relaxed game.",
      },
      {
        q: "Is my best time saved?",
        a: "Yes — your fastest winning time and the move count for that win are saved locally in your browser (under the dueneo:solitaire:best key). Nothing is uploaded.",
      },
    ],
  };

  return <GameLayout game={game} content={content} />;
}

// ---------------------------------------------------------------------------
// Foundation labels — show suit hint in empty foundation slots.
// ---------------------------------------------------------------------------

function foundationLabel(index: number): string {
  // Just show ♠ ♥ ♦ ♣ as a hint; the actual foundation accepts any suit's Ace first.
  const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
  const sym = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" }[suits[index]];
  return sym;
}

// ---------------------------------------------------------------------------
// Waste view — in draw-3 mode, fan out the most recently drawn cards so the
// player can see what's coming up next.
// ---------------------------------------------------------------------------

function WasteView({
  waste,
  drawnCount,
  size,
  selected,
  onClick,
  onDoubleClick,
}: {
  waste: Card[];
  drawnCount: number;
  size: CardSize;
  selected: Set<string>;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  // Show the last `drawnCount` cards fanned slightly.
  const visibleCount = Math.min(drawnCount, waste.length);
  const startIdx = waste.length - visibleCount;
  const visible = waste.slice(startIdx);
  const dims =
    size === "sm"
      ? { w: "w-10", h: "h-14" }
      : size === "lg"
      ? { w: "w-16 sm:w-20", h: "h-22 sm:h-28" }
      : { w: "w-12 sm:w-14", h: "h-16 sm:h-20" };

  if (visible.length === 0) {
    return (
      <button
        type="button"
        className={`flex ${dims.w} ${dims.h} items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 bg-muted/20`}
      />
    );
  }

  return (
    <div className={`relative ${dims.w} ${dims.h}`}>
      {visible.map((card, i) => {
        const isTop = i === visible.length - 1;
        return (
          <div
            key={card.id}
            className="absolute left-0 top-0"
            style={{ transform: `translateX(${i * 8}px)` }}
          >
            <CardView
              card={card}
              size={size}
              selected={isTop && selected.has(card.id)}
              onClick={isTop ? onClick : undefined}
              onDoubleClick={isTop ? onDoubleClick : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
