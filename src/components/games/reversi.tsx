"use client";

import * as React from "react";
import { GameLayout, type GameContent } from "@/components/dueneo/game-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, User, Users, Cpu } from "lucide-react";
import type { GameDefinition } from "@/data/games";

type Mode = "friend" | "ai-easy" | "ai-hard";
type Disc = 0 | 1 | 2; // 0 empty, 1 = black, 2 = white

const SIZE = 8;
const DIRS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

function emptyBoard(): Disc[][] {
  const b = Array.from({ length: SIZE }, () => Array<Disc>(SIZE).fill(0));
  b[3][3] = 2;
  b[3][4] = 1;
  b[4][3] = 1;
  b[4][4] = 2;
  return b;
}

/** Cells that would be flipped if `player` plays at [r, c]. Returns [] if illegal. */
function getFlips(board: Disc[][], r: number, c: number, player: Disc): [number, number][] {
  if (board[r][c] !== 0) return [];
  const opp = (3 - player) as Disc;
  const flips: [number, number][] = [];
  for (const [dr, dc] of DIRS) {
    const line: [number, number][] = [];
    let rr = r + dr;
    let cc = c + dc;
    while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === opp) {
      line.push([rr, cc]);
      rr += dr;
      cc += dc;
    }
    if (line.length > 0 && rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === player) {
      for (const cell of line) flips.push(cell);
    }
  }
  return flips;
}

function legalMoves(board: Disc[][], player: Disc): [number, number, [number, number][]][] {
  const moves: [number, number, [number, number][]][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const flips = getFlips(board, r, c, player);
      if (flips.length > 0) moves.push([r, c, flips]);
    }
  }
  return moves;
}

function applyMove(board: Disc[][], r: number, c: number, player: Disc, flips: [number, number][]): Disc[][] {
  const next = board.map((row) => row.slice());
  next[r][c] = player;
  for (const [fr, fc] of flips) next[fr][fc] = player;
  return next;
}

function countDiscs(board: Disc[][]): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (const row of board) for (const v of row) {
    if (v === 1) black++;
    else if (v === 2) white++;
  }
  return { black, white };
}

// AI heuristics.
const POSITION_WEIGHTS = [
  [120, -20, 20, 5, 5, 20, -20, 120],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [120, -20, 20, 5, 5, 20, -20, 120],
];

function evaluateBoard(board: Disc[][], player: Disc): number {
  const opp = (3 - player) as Disc;
  let score = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === player) score += POSITION_WEIGHTS[r][c];
      else if (board[r][c] === opp) score -= POSITION_WEIGHTS[r][c];
    }
  }
  // Mobility bonus.
  const myMoves = legalMoves(board, player).length;
  const oppMoves = legalMoves(board, opp).length;
  if (myMoves + oppMoves > 0) {
    score += 10 * (myMoves - oppMoves);
  }
  return score;
}

function minimax(
  board: Disc[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiPlayer: Disc,
  currentPlayer: Disc
): number {
  const moves = legalMoves(board, currentPlayer);
  if (depth === 0) return evaluateBoard(board, aiPlayer);
  if (moves.length === 0) {
    const oppMoves = legalMoves(board, (3 - currentPlayer) as Disc);
    if (oppMoves.length === 0) {
      // Game over — terminal score.
      const { black, white } = countDiscs(board);
      const mine = aiPlayer === 1 ? black : white;
      const theirs = aiPlayer === 1 ? white : black;
      if (mine > theirs) return 100000;
      if (mine < theirs) return -100000;
      return 0;
    }
    return minimax(board, depth - 1, alpha, beta, !maximizing, aiPlayer, (3 - currentPlayer) as Disc);
  }

  if (maximizing) {
    let value = -Infinity;
    for (const [r, c, flips] of moves) {
      const next = applyMove(board, r, c, currentPlayer, flips);
      value = Math.max(value, minimax(next, depth - 1, alpha, beta, false, aiPlayer, (3 - currentPlayer) as Disc));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const [r, c, flips] of moves) {
      const next = applyMove(board, r, c, currentPlayer, flips);
      value = Math.min(value, minimax(next, depth - 1, alpha, beta, true, aiPlayer, (3 - currentPlayer) as Disc));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
}

function bestMove(board: Disc[][], player: Disc, depth: number): [number, number, [number, number][]] | null {
  const moves = legalMoves(board, player);
  if (moves.length === 0) return null;
  let best = -Infinity;
  let bestMove_: [number, number, [number, number][]] | null = null;
  for (const move of moves) {
    const next = applyMove(board, move[0], move[1], player, move[2]);
    const score = minimax(next, depth - 1, -Infinity, Infinity, false, player, (3 - player) as Disc);
    if (score > best) {
      best = score;
      bestMove_ = move;
    }
  }
  return bestMove_;
}

function easyMove(board: Disc[][], player: Disc): [number, number, [number, number][]] | null {
  const moves = legalMoves(board, player);
  if (moves.length === 0) return null;
  // Prefer corners, then random.
  for (const m of moves) {
    if ((m[0] === 0 || m[0] === SIZE - 1) && (m[1] === 0 || m[1] === SIZE - 1)) return m;
  }
  return moves[Math.floor(Math.random() * moves.length)];
}

export function Reversi({ game }: { game: GameDefinition }) {
  const [board, setBoard] = React.useState<Disc[][]>(emptyBoard);
  const [turn, setTurn] = React.useState<Disc>(1);
  const [mode, setMode] = React.useState<Mode>("ai-hard");
  const [passCount, setPassCount] = React.useState(0);

  const blackMoves = React.useMemo(() => legalMoves(board, 1), [board]);
  const whiteMoves = React.useMemo(() => legalMoves(board, 2), [board]);
  const counts = React.useMemo(() => countDiscs(board), [board]);
  const currentMoves = turn === 1 ? blackMoves : whiteMoves;
  const legalSet = React.useMemo(() => new Set(currentMoves.map((m) => `${m[0]}-${m[1]}`)), [currentMoves]);
  const gameOver = blackMoves.length === 0 && whiteMoves.length === 0;

  React.useEffect(() => {
    if (gameOver) {
      const winner = counts.black > counts.white ? "Black" : counts.white > counts.black ? "White" : null;
      if (winner) toast.success(`🏆 ${winner} wins ${counts.black}-${counts.white}!`);
      else toast.message("Draw!");
      return;
    }
  }, [gameOver, counts.black, counts.white]);

  // AI turn.
  React.useEffect(() => {
    if (mode === "friend" || gameOver) return;
    if (turn !== 2) return;
    const t = setTimeout(() => {
      const move = mode === "ai-easy" ? easyMove(board, 2) : bestMove(board, 2, 3);
      if (!move) {
        // Pass.
        setTurn(1);
        setPassCount((p) => p + 1);
        toast.message("White has no legal moves — pass.");
        return;
      }
      const [r, c, flips] = move;
      setBoard((prev) => applyMove(prev, r, c, 2, flips));
      setTurn(1);
      setPassCount(0);
    }, 450);
    return () => clearTimeout(t);
  }, [turn, mode, board, gameOver]);

  // Auto-pass for human if no moves.
  React.useEffect(() => {
    if (gameOver) return;
    if (mode !== "friend" && turn === 2) return;
    if (currentMoves.length === 0) {
      const t = setTimeout(() => {
        toast.message(`${turn === 1 ? "Black" : "White"} has no legal moves — pass.`);
        setTurn((3 - turn) as Disc);
        setPassCount((p) => p + 1);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [currentMoves.length, turn, mode, gameOver]);

  function play(r: number, c: number) {
    if (gameOver) return;
    if (mode !== "friend" && turn !== 1) return;
    if (!legalSet.has(`${r}-${c}`)) return;
    const flips = getFlips(board, r, c, turn);
    if (flips.length === 0) return;
    setBoard((prev) => applyMove(prev, r, c, turn, flips));
    setTurn((3 - turn) as Disc);
    setPassCount(0);
  }

  function reset() {
    setBoard(emptyBoard());
    setTurn(1);
    setPassCount(0);
  }

  function changeMode(m: Mode) {
    setMode(m);
    reset();
  }

  const content: GameContent = {
    intro:
      "Outflank your opponent to flip their discs to your colour. Standard 8×8 Reversi (Othello): place a disc so that one or more of your opponent's discs are bracketed between your new disc and another of yours along a straight line — those discs flip. Play a friend or take on the AI.",
    game: (
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
            <ModeButton current={mode} value="friend" onClick={changeMode} icon={<Users className="h-3.5 w-3.5" />}>2 Players</ModeButton>
            <ModeButton current={mode} value="ai-easy" onClick={changeMode} icon={<User className="h-3.5 w-3.5" />}>AI · Easy</ModeButton>
            <ModeButton current={mode} value="ai-hard" onClick={changeMode} icon={<Cpu className="h-3.5 w-3.5" />}>AI · Hard</ModeButton>
          </div>
          <Button onClick={reset} variant="default" size="sm">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-foreground" />
            <span className="text-sm font-semibold">{counts.black}</span>
            {turn === 1 && !gameOver && <Badge variant="secondary">turn</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full border-2 border-foreground bg-background" />
            <span className="text-sm font-semibold">{counts.white}</span>
            {turn === 2 && !gameOver && <Badge variant="secondary">turn</Badge>}
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <div
            className="grid grid-cols-8 gap-1 rounded-lg bg-emerald-900/80 p-2 dark:bg-emerald-950"
            role="grid"
            aria-label="Reversi board"
          >
            {board.map((row, r) =>
              row.map((cell, c) => {
                const key = `${r}-${c}`;
                const legal = legalSet.has(key) && !gameOver && (mode === "friend" || turn === 1);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => play(r, c)}
                    disabled={!legal}
                    aria-label={`Row ${r + 1} column ${c + 1}${cell ? `, ${cell === 1 ? "black" : "white"}` : legal ? ", legal move" : ", empty"}`}
                    className={`relative flex h-8 w-8 items-center justify-center rounded-sm bg-emerald-700/50 transition-colors hover:bg-emerald-700 sm:h-10 sm:w-10 ${
                      legal ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    {cell !== 0 && (
                      <span
                        className={`h-6 w-6 rounded-full shadow-sm sm:h-8 sm:w-8 ${
                          cell === 1 ? "bg-foreground" : "bg-background border border-foreground/20"
                        }`}
                      />
                    )}
                    {legal && cell === 0 && (
                      <span className="h-2 w-2 rounded-full bg-emerald-300/60" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {gameOver && (
          <div className="mt-3 rounded-md bg-muted px-3 py-2 text-center text-sm">
            {counts.black > counts.white && `🏆 Black wins ${counts.black}-${counts.white}`}
            {counts.white > counts.black && `🏆 White wins ${counts.white}-${counts.black}`}
            {counts.black === counts.white && "Draw!"}
          </div>
        )}
      </div>
    ),
    rules: (
      <div className="space-y-3">
        <p>
          The board starts with four discs in the centre — two black, two
          white, in an X pattern. <strong>Black</strong> moves first. To make a
          legal move, place your disc on an empty cell so that one or more of
          your opponent's discs are bracketed between your new disc and
          another of your existing discs along a straight horizontal, vertical
          or diagonal line. All bracketed opponent discs then flip to your
          colour.
        </p>
        <p>
          If you have no legal move, your turn is automatically passed. The
          game ends when neither player can move — typically when the board is
          full. The player with the most discs of their colour wins.
        </p>
        <p>
          <strong>AI · Easy</strong> grabs corners when it can and plays
          randomly otherwise. <strong>AI · Hard</strong> uses a 3-ply minimax
          search with a positional weight table and mobility heuristic.
        </p>
      </div>
    ),
    tips: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Corners are gold — once taken, they can never be flipped.</li>
        <li>Avoid the squares adjacent to corners (the "X-squares" and "C-squares") unless you're sure — they often hand the corner to your opponent.</li>
        <li>Fewer discs on the board early is often better: less material for your opponent to flip back.</li>
        <li>Mobility matters: keep your move options high and your opponent's low.</li>
      </ul>
    ),
    controls: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Click any cell marked with a small dot to place your disc there.</li>
        <li>Illegal cells are disabled — only legal moves are clickable.</li>
        <li>If you have no legal move, your turn auto-passes after a short delay.</li>
        <li>Switch between 2-player, AI Easy and AI Hard with the toggle (resets the board).</li>
      </ul>
    ),
    faq: [
      {
        q: "Why did my turn get skipped?",
        a: "If you have no legal move — no cell where you can outflank at least one opponent disc — the game automatically passes. This is standard Reversi rules.",
      },
      {
        q: "How strong is the AI?",
        a: "Easy grabs corners opportunistically and is otherwise random. Hard searches three moves ahead with positional weights and mobility scoring — strong enough to punish obvious corner giveaways but beatable with disciplined play.",
      },
      {
        q: "When does the game end?",
        a: "When neither player has a legal move (usually when all 64 cells are filled). Whoever has more discs of their colour at that point wins.",
      },
    ],
  };

  return <GameLayout game={game} content={content} />;
}

function ModeButton({
  current,
  value,
  onClick,
  children,
  icon,
}: {
  current: Mode;
  value: Mode;
  onClick: (m: Mode) => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
