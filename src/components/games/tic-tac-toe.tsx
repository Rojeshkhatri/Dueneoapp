"use client";

import * as React from "react";
import { GameLayout, type GameContent } from "@/components/dueneo/game-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, User, Users, Cpu } from "lucide-react";
import type { GameDefinition } from "@/data/games";
import { checkWin, type WinResult } from "./_game-helpers";

type Mode = "friend" | "ai-easy" | "ai-hard";
type Cell = 0 | 1 | 2; // 0 empty, 1 = X, 2 = O

const SIZE = 3;
const WIN_LEN = 3;
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function evaluate(board: readonly Cell[]): WinResult {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as number, line };
    }
  }
  return { winner: 0, line: null };
}

function isFull(board: readonly Cell[]): boolean {
  return board.every((c) => c !== 0);
}

/** Minimax with alpha-beta pruning. Returns score from perspective of `player`. */
function minimax(
  board: Cell[],
  player: Cell,
  aiPlayer: Cell,
  humanPlayer: Cell,
  depth: number,
  alpha: number,
  beta: number
): number {
  const { winner } = evaluate(board);
  if (winner === aiPlayer) return 10 - depth;
  if (winner === humanPlayer) return depth - 10;
  if (isFull(board)) return 0;

  if (player === aiPlayer) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] !== 0) continue;
      board[i] = player;
      const score = minimax(board, (3 - player) as Cell, aiPlayer, humanPlayer, depth + 1, alpha, beta);
      board[i] = 0;
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] !== 0) continue;
      board[i] = player;
      const score = minimax(board, (3 - player) as Cell, aiPlayer, humanPlayer, depth + 1, alpha, beta);
      board[i] = 0;
      if (score < best) best = score;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

function bestMoveFor(board: Cell[], aiPlayer: Cell): number {
  const humanPlayer = (3 - aiPlayer) as Cell;
  let best = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== 0) continue;
    board[i] = aiPlayer;
    const score = minimax(board, humanPlayer, aiPlayer, humanPlayer, 0, -Infinity, Infinity);
    board[i] = 0;
    if (score > best) {
      best = score;
      move = i;
    }
  }
  return move;
}

function randomMove(board: Cell[]): number {
  const empty: number[] = [];
  for (let i = 0; i < 9; i++) if (board[i] === 0) empty.push(i);
  return empty.length === 0 ? -1 : empty[Math.floor(Math.random() * empty.length)];
}

function aiMove(board: Cell[], aiPlayer: Cell, mode: Mode): number {
  if (mode === "ai-easy") {
    // Easy: take a winning move or block an immediate loss, else random.
    const winNow = findThreatMove(board, aiPlayer);
    if (winNow !== -1) return winNow;
    const block = findThreatMove(board, (3 - aiPlayer) as Cell);
    if (block !== -1 && Math.random() < 0.6) return block;
    return randomMove(board);
  }
  return bestMoveFor(board, aiPlayer);
}

function findThreatMove(board: Cell[], player: Cell): number {
  for (let i = 0; i < 9; i++) {
    if (board[i] !== 0) continue;
    const copy = board.slice();
    copy[i] = player;
    if (evaluate(copy).winner === player) return i;
  }
  return -1;
}

const EMPTY_BOARD: Cell[] = Array(9).fill(0) as Cell[];

export function TicTacToe({ game }: { game: GameDefinition }) {
  const [board, setBoard] = React.useState<Cell[]>(EMPTY_BOARD);
  const [turn, setTurn] = React.useState<Cell>(1);
  const [mode, setMode] = React.useState<Mode>("ai-hard");
  const [scores, setScores] = React.useState({ 1: 0, 2: 0, draws: 0 });
  const result = React.useMemo(() => evaluate(board), [board]);
  const gameOver = result.winner !== 0 || isFull(board);

  // AI plays as O (player 2) on its turn.
  React.useEffect(() => {
    if (mode === "friend") return;
    if (gameOver) return;
    if (turn !== 2) return;
    const t = setTimeout(() => {
      setBoard((prev) => {
        if (evaluate(prev).winner !== 0) return prev;
        const mv = aiMove(prev, 2, mode);
        if (mv < 0) return prev;
        const next = prev.slice();
        next[mv] = 2;
        return next;
      });
      setTurn(1);
    }, 320);
    return () => clearTimeout(t);
  }, [turn, mode, gameOver]);

  // Update score on game end.
  React.useEffect(() => {
    if (result.winner !== 0) {
      setScores((s) => ({ ...s, [result.winner]: s[result.winner as 1 | 2] + 1 }));
      toast.success(result.winner === 1 ? "X wins! 🎉" : "O wins! 🎉");
    } else if (isFull(board)) {
      setScores((s) => ({ ...s, draws: s.draws + 1 }));
      toast.message("It's a draw.");
    }
  }, [result.winner, board]);

  function handleClick(i: number) {
    if (board[i] !== 0 || gameOver) return;
    if (mode !== "friend" && turn !== 1) return;
    const next = board.slice();
    next[i] = turn;
    setBoard(next);
    setTurn((3 - turn) as Cell);
  }

  function reset() {
    setBoard(EMPTY_BOARD.slice() as Cell[]);
    setTurn(1);
  }

  function resetAll() {
    setScores({ 1: 0, 2: 0, draws: 0 });
    reset();
  }

  function changeMode(m: Mode) {
    setMode(m);
    reset();
  }

  const cellMark = (c: Cell) => (c === 1 ? "X" : c === 2 ? "O" : "");
  const winningSet = React.useMemo(() => new Set(result.line ?? []), [result.line]);

  const content: GameContent = {
    intro:
      "The classic 3×3 noughts and crosses. Play a friend locally on one device, or take on the AI in easy (random) or hard (perfect minimax) mode. First to line up three wins.",
    game: (
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
            <ModeButton current={mode} value="friend" onClick={changeMode} icon={<Users className="h-3.5 w-3.5" />}>2 Players</ModeButton>
            <ModeButton current={mode} value="ai-easy" onClick={changeMode} icon={<User className="h-3.5 w-3.5" />}>AI · Easy</ModeButton>
            <ModeButton current={mode} value="ai-hard" onClick={changeMode} icon={<Cpu className="h-3.5 w-3.5" />}>AI · Hard</ModeButton>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">X: {scores[1]}</Badge>
            <Badge variant="secondary">Draws: {scores.draws}</Badge>
            <Badge variant="secondary">O: {scores[2]}</Badge>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center">
          <div className="mb-3 text-sm font-medium text-muted-foreground">
            {result.winner === 1 && "🏆 X wins!"}
            {result.winner === 2 && "🏆 O wins!"}
            {result.winner === 0 && isFull(board) && "Draw — try again."}
            {!gameOver && (turn === 1 ? "X to move" : "O to move")}
            {mode !== "friend" && !gameOver && turn === 2 && " (AI thinking…)"}
          </div>

          <div
            className="grid grid-cols-3 gap-2"
            role="grid"
            aria-label="Tic-tac-toe board"
          >
            {board.map((c, i) => {
              const isWin = winningSet.has(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleClick(i)}
                  disabled={c !== 0 || gameOver || (mode !== "friend" && turn !== 1)}
                  aria-label={`Cell ${i + 1}${c ? `, ${cellMark(c)}` : ", empty"}`}
                  className={`flex h-24 w-24 items-center justify-center rounded-lg border text-5xl font-bold transition-colors sm:h-28 sm:w-28 ${
                    isWin
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input bg-background hover:bg-accent"
                  } ${c === 1 ? "text-teal-500" : c === 2 ? "text-rose-500" : ""}`}
                >
                  {cellMark(c)}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={reset} variant="default">
              <RotateCcw className="h-4 w-4" /> New round
            </Button>
            <Button onClick={resetAll} variant="outline">
              Reset scores
            </Button>
          </div>
        </div>
      </div>
    ),
    rules: (
      <div className="space-y-3">
        <p>
          Tic-Tac-Toe is played on a 3×3 grid. Player <strong>X</strong> always
          moves first, then players alternate placing their mark in an empty
          cell. The first player to line up three of their marks horizontally,
          vertically or diagonally wins. If all nine cells are filled and no
          one has three in a row, the round is a draw.
        </p>
        <p>
          In <strong>2 Players</strong> mode two people share the keyboard. In{" "}
          <strong>AI · Easy</strong> the computer plays randomly with a basic
          win-or-block instinct. In <strong>AI · Hard</strong> it uses the
          minimax algorithm with alpha-beta pruning and will never lose — your
          best result is a draw.
        </p>
      </div>
    ),
    tips: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Take the centre on your opening move — it is part of four winning lines.</li>
        <li>If you go second and your opponent took the centre, grab a corner.</li>
        <li>Look for "forks": a move that creates two winning threats at once.</li>
        <li>Always block your opponent's two-in-a-row before chasing your own win.</li>
      </ul>
    ),
    controls: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Click or tap an empty cell to place your mark.</li>
        <li>Use the mode switcher to pick 2-player, AI Easy or AI Hard.</li>
        <li><strong>New round</strong> clears the board but keeps the running score.</li>
      </ul>
    ),
    faq: [
      {
        q: "Can the hard AI ever be beaten?",
        a: "No. Tic-Tac-Toe is a solved game and our minimax search explores every possible move, so the best a human can do against AI · Hard is force a draw.",
      },
      {
        q: "How are scores saved?",
        a: "Only in memory for the current session — they reset when you reload the page or click Reset scores. Nothing is sent to a server.",
      },
      {
        q: "Does this work on a phone?",
        a: "Yes. The board is touch-friendly with 44px+ tap targets and the layout reflows on small screens.",
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
