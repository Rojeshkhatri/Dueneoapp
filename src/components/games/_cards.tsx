"use client";

/**
 * Shared card-game primitives used by Solitaire, Spider Solitaire and FreeCell.
 *
 * Pure rendering + lightweight helpers. The actual game logic (rules, scoring,
 * undo, etc.) lives in each game's component file. Everything here is
 * presentational + a small handful of pure functions for deck creation,
 * labelling, and the most common stacking rule.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { shuffle as fyShuffle } from "./_game-helpers";

export type Suit = "spades" | "hearts" | "diamonds" | "clubs";

export interface Card {
  suit: Suit;
  /** 1 = Ace, 11 = Jack, 12 = Queen, 13 = King. */
  rank: number;
  faceUp: boolean;
  /** Stable identity (so React keys + undo state stay sane across moves). */
  id: string;
}

export const ALL_SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `c${idCounter}`;
}

/** Build one full deck of 52 cards per suit in `suits`. Pass multiple suits for bigger decks (Spider = 2× spades → 104 cards). */
export function createDeck(suits: Suit[]): Card[] {
  const deck: Card[] = [];
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank, faceUp: false, id: nextId() });
    }
  }
  return deck;
}

/** Re-export of `_game-helpers.shuffle` so card games have a single import surface. */
export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  return fyShuffle(arr, rng);
}

export function rankLabel(rank: number): string {
  if (rank === 1) return "A";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

export function suitSymbol(suit: Suit): string {
  switch (suit) {
    case "spades":
      return "♠";
    case "hearts":
      return "♥";
    case "diamonds":
      return "♦";
    case "clubs":
      return "♣";
  }
}

export function isRed(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}

/** True if `card` can be placed directly on top of `onto` in a Klondike-style tableau (alt-colour, descending). A null `onto` means "empty column" — always returns false here; callers handle King-only rules explicitly. */
export function canStackTableau(card: Card, onto: Card | null): boolean {
  if (!onto) return false;
  if (!card.faceUp || !onto.faceUp) return false;
  if (isRed(card.suit) === isRed(onto.suit)) return false;
  return card.rank === onto.rank - 1;
}

/** True if `card` can be placed on the foundation given the foundation's current top card. */
export function canStackFoundation(card: Card, foundationTop: Card | null): boolean {
  if (!card.faceUp) return false;
  if (!foundationTop) return card.rank === 1; // Ace starts a foundation
  return card.suit === foundationTop.suit && card.rank === foundationTop.rank + 1;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** Visual size variants for cards. */
export type CardSize = "sm" | "md" | "lg";

const CARD_DIMS: Record<CardSize, { w: string; h: string; textCorner: string; textCenter: string }> = {
  sm: { w: "w-8 sm:w-10", h: "h-11 sm:h-14", textCorner: "text-[8px] sm:text-[10px]", textCenter: "text-sm sm:text-base" },
  md: { w: "w-10 sm:w-12 md:w-14", h: "h-14 sm:h-16 md:h-20", textCorner: "text-[10px] sm:text-xs", textCenter: "text-base sm:text-lg md:text-xl" },
  lg: { w: "w-12 sm:w-16 md:w-20", h: "h-16 sm:h-20 md:h-28", textCorner: "text-xs sm:text-sm", textCenter: "text-lg sm:text-2xl md:text-3xl" },
};

export interface CardViewProps {
  card: Card;
  size?: CardSize;
  selected?: boolean;
  dimmed?: boolean;
  className?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  ariaLabel?: string;
}

/** A single playing card. Face-down shows a blue patterned back; face-up shows rank+suit in corners and a large suit pip in the middle. */
export function CardView({
  card,
  size = "md",
  selected,
  dimmed,
  className,
  onClick,
  onDoubleClick,
  ariaLabel,
}: CardViewProps) {
  const dims = CARD_DIMS[size];
  const red = isRed(card.suit);
  const label = rankLabel(card.rank);
  const sym = suitSymbol(card.suit);

  if (!card.faceUp) {
    return (
      <button
        type="button"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        aria-label={ariaLabel ?? "Face-down card"}
        className={cn(
          "relative flex items-center justify-center rounded-md border border-indigo-300/60 bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-sm transition-all",
          dims.w,
          dims.h,
          onClick && "hover:brightness-110",
          selected && "ring-2 ring-amber-400 ring-offset-1",
          dimmed && "opacity-60",
          className
        )}
      >
        <span className="absolute inset-1 rounded-sm border border-indigo-200/30" />
        <span className="bg-indigo-200/40 px-1 text-[10px] font-bold tracking-widest text-indigo-50/80 rotate-45">
          ♦
        </span>
        <span className="absolute inset-1 rounded-sm [background:repeating-linear-gradient(45deg,rgba(255,255,255,0.08)_0_4px,transparent_4px_8px)]" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      aria-label={ariaLabel ?? `${label} of ${card.suit}`}
      className={cn(
        "relative flex flex-col justify-between rounded-md border border-slate-300 bg-white p-1 shadow-sm transition-all dark:border-slate-600 dark:bg-slate-100",
        dims.w,
        dims.h,
        onClick && "hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
        selected && "ring-2 ring-amber-400 ring-offset-1 -translate-y-0.5",
        dimmed && "opacity-60",
        className
      )}
    >
      <span
        className={cn(
          "flex items-center gap-0.5 leading-none font-bold",
          dims.textCorner,
          red ? "text-rose-600" : "text-slate-900"
        )}
      >
        <span>{label}</span>
        <span>{sym}</span>
      </span>
      <span
        className={cn(
          "self-center leading-none",
          dims.textCenter,
          red ? "text-rose-600" : "text-slate-900"
        )}
      >
        {sym}
      </span>
      <span
        className={cn(
          "flex items-center gap-0.5 self-end leading-none font-bold rotate-180",
          dims.textCorner,
          red ? "text-rose-600" : "text-slate-900"
        )}
      >
        <span>{label}</span>
        <span>{sym}</span>
      </span>
    </button>
  );
}

/** Empty slot — the outline of a card-shaped drop target. */
export function EmptySlot({
  size = "md",
  label,
  onClick,
  selected,
  className,
}: {
  size?: CardSize;
  label?: string;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}) {
  const dims = CARD_DIMS[size];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ?? "Empty pile"}
      className={cn(
        "flex items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 bg-muted/20 text-xs text-muted-foreground/60 transition-colors hover:border-muted-foreground/40 hover:bg-muted/40",
        dims.w,
        dims.h,
        selected && "ring-2 ring-amber-400 ring-offset-1 border-amber-400",
        onClick && "cursor-pointer",
        className
      )}
    >
      {label && <span className="px-1 text-center">{label}</span>}
    </button>
  );
}

export interface PileProps {
  cards: Card[];
  /** Render mode: `fan` for tableau (offset vertically), `stack` for stock/waste/foundation (only top card visible). */
  variant?: "fan" | "stack";
  size?: CardSize;
  /** Pixel offset between face-up cards in `fan` mode. */
  faceUpOffset?: number;
  /** Pixel offset between face-down cards in `fan` mode. */
  faceDownOffset?: number;
  /** When empty, render an EmptySlot with this label. */
  emptyLabel?: string;
  /** Click handler for the pile itself (used when the pile is empty, or for stock/draw). */
  onPileClick?: () => void;
  /** Per-card click handler — receives the card and its index in the pile. */
  onCardClick?: (card: Card, index: number) => void;
  onCardDoubleClick?: (card: Card, index: number) => void;
  /** Set of card IDs that should appear selected. */
  selectedIds?: Set<string>;
  /** Optional override: only the top N cards are interactive. */
  interactiveFromIndex?: number;
  className?: string;
}

/**
 * A pile of cards.
 *
 * In `fan` mode, cards are stacked vertically with smaller offsets for face-down
 * cards and larger offsets for face-up ones — the typical Klondike tableau look.
 *
 * In `stack` mode, only the top card is visible (with the cards underneath
 * rendered as a subtle shadow), which is what you want for stock/waste/foundation.
 */
export function Pile({
  cards,
  variant = "fan",
  size = "md",
  faceUpOffset = 22,
  faceDownOffset = 12,
  emptyLabel,
  onPileClick,
  onCardClick,
  onCardDoubleClick,
  selectedIds,
  interactiveFromIndex = 0,
  className,
}: PileProps) {
  const dims = CARD_DIMS[size];

  if (cards.length === 0) {
    return <EmptySlot size={size} label={emptyLabel} onClick={onPileClick} className={className} />;
  }

  if (variant === "stack") {
    const top = cards[cards.length - 1];
    return (
      <div className={cn("relative", dims.w, dims.h, className)}>
        {/* Subtle "stack" shadow underneath */}
        {cards.length > 1 && (
          <>
            <span className="absolute inset-x-0 top-0.5 h-full rounded-md border border-slate-300/60 bg-slate-100/60 dark:bg-slate-700/40" />
            {cards.length > 2 && (
              <span className="absolute inset-x-0 top-1 h-full rounded-md border border-slate-300/40 bg-slate-100/40 dark:bg-slate-700/30" />
            )}
          </>
        )}
        <div className="relative">
          <CardView
            card={top}
            size={size}
            selected={selectedIds?.has(top.id)}
            onClick={
              onCardClick
                ? () => onCardClick(top, cards.length - 1)
                : onPileClick
            }
            onDoubleClick={
              onCardDoubleClick
                ? () => onCardDoubleClick(top, cards.length - 1)
                : undefined
            }
          />
        </div>
      </div>
    );
  }

  // fan mode — face-down cards offset less, face-up cards offset more so
  // rank+suit are always visible.
  const offsets: number[] = [];
  let acc = 0;
  for (let i = 0; i < cards.length; i++) {
    offsets.push(acc);
    acc += cards[i].faceUp ? faceUpOffset : faceDownOffset;
  }
  // Approximate height so layout reserves enough vertical space.
  const cardHeight = size === "sm" ? 56 : size === "lg" ? 112 : 80;
  const totalHeight = acc + cardHeight;

  return (
    <div
      className={cn("relative", className)}
      style={{ width: "fit-content", minHeight: totalHeight }}
      onClick={
        onPileClick
          ? (e) => {
              // Only fire if the click landed on the wrapper, not on a card.
              if (e.target === e.currentTarget) onPileClick();
            }
          : undefined
      }
    >
      {cards.map((card, i) => {
        // Face-down cards are never clickable — they auto-flip when exposed.
        const isFaceDown = !card.faceUp;
        const isInteractive = !isFaceDown && i >= interactiveFromIndex;
        const handleCardClick = isInteractive
          ? onCardClick
            ? () => onCardClick(card, i)
            : undefined
          : undefined;
        const handleCardDouble = isInteractive && onCardDoubleClick
          ? () => onCardDoubleClick(card, i)
          : undefined;
        return (
          <div
            key={card.id}
            className="absolute left-0 top-0"
            style={{ transform: `translateY(${offsets[i]}px)` }}
          >
            <CardView
              card={card}
              size={size}
              selected={selectedIds?.has(card.id)}
              onClick={handleCardClick}
              onDoubleClick={handleCardDouble}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Reset the internal card ID counter — useful in tests but not needed in app code. */
export function resetCardIdCounter(): void {
  idCounter = 0;
}
