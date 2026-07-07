"use client";

import * as React from "react";
import { GameLayout, type GameContent } from "@/components/dueneo/game-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, User, Users, Cpu } from "lucide-react";
import type { GameDefinition } from "@/data/games";

type Mode = "friend" | "ai-easy" | "ai-hard";
type Disc = 0 | 1 | 2; // 0 empty, 1 = red, 2 = yellow

const ROWS = 6;
const COLS = 7;
const WIN_LEN = 4;

function emptyBoard(): Disc[][] {
  return Array.from({ length: ROWS }, () => Array<Disc>(COLS).fill(0));
}

/** Drop a disc into column `col`, returns the row it landed in or -1 if full. */
function dropDisc(board: Disc[][], col: number, player: Disc): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      board[r][col] = player;
      return r;
    }
  }
  return -1;
}

function validColumns(board: Disc[][]): number[] {
  const out: number[] = [];
  for (let c = 0; c < COLS; c++) if (board[0][c] === 0) out.push(c);
  return out;
}

function isFull(board: Disc[][]): boolean {
  return validColumns(board).length === 0;
}

interface C4Win {
  winner: Disc;
  cells: [number, number][] | null;
}

function checkWin(board: Disc[][]): C4Win {
  const dirs: [number, number][] = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal down-right
    [1, -1], // diagonal down-left
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = board[r][c];
      if (v === 0) continue;
      for (const [dr, dc] of dirs) {
        const cells: [number, number][] = [[r, c]];
        let rr = r + dr;
        let cc = c + dc;
        while (
          rr >= 0 &&
          rr < ROWS &&
          cc >= 0 &&
          cc < COLS &&
          board[rr][cc] === v
        ) {
          cells.push([rr, cc]);
          if (cells.length === WIN_LEN) return { winner: v, cells };
          rr += dr;
          cc += dc;
        }
      }
    }
  }
  return { winner: 0, cells: null };
}

/** Score the board from `aiPlayer`'s perspective. */
function scoreBoard(board: Disc[][], aiPlayer: Disc): number {
  const { winner } = checkWin(board);
  if (winner === aiPlayer) return 100000;
  if (winner === (3 - aiPlayer) as Disc) return -100000;

  const human = (3 - aiPlayer) as Disc;
  let score = 0;
  // Centre column preference.
  const centreCol = Math.floor(COLS / 2);
  for (let r = 0; r < ROWS; r++) {
    if (board[r][centreCol] === aiPlayer) score += 3;
    else if (board[r][centreCol] === human) score -= 3;
  }

  // Score all windows of length 4.
  const dirs: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of dirs) {
        const cells: Disc[] = [];
        let ok = true;
        for (let k = 0; k < WIN_LEN; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) {
            ok = false;
            break;
          }
          cells.push(board[rr][cc]);
        }
        if (!ok) continue;
        const ai = cells.filter((x) => x === aiPlayer).length;
        const hu = cells.filter((x) => x === human).length;
        const empty = cells.filter((x) => x === 0).length;
        if (ai === 4) score += 100;
        else if (ai === 3 && empty === 1) score += 10;
        else if (ai === 2 && empty === 2) score += 2;
        if (hu === 3 && empty === 1) score -= 8;
        if (hu === 2 && empty === 2) score -= 2;
      }
    }
  }
  return score;
}

function minimax(
  board: Disc[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiPlayer: Disc
): number {
  const { winner } = checkWin(board);
  if (winner === aiPlayer) return 100000 - (4 - depth);
  if (winner === (3 - aiPlayer) as Disc) return -100000 + (4 - depth);
  if (depth === 0 || isFull(board)) return scoreBoard(board, aiPlayer);

  const cols = validColumns(board);
  // Search centre columns first (better alpha-beta pruning).
  cols.sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));

  if (maximizing) {
    let value = -Infinity;
    for (const c of cols) {
      const next = board.map((row) => row.slice());
      dropDisc(next, c, aiPlayer);
      value = Math.max(value, minimax(next, depth - 1, alpha, beta, false, aiPlayer));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    const human = (3 - aiPlayer) as Disc;
    for (const c of cols) {
      const next = board.map((row) => row.slice());
      dropDisc(next, c, human);
      value = Math.min(value, minimax(next, depth - 1, alpha, beta, true, aiPlayer));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
}

function bestColumn(board: Disc[][], aiPlayer: Disc, depth: number): number {
  const cols = validColumns(board);
  cols.sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));
  let best = -Infinity;
  let move = cols[0];
  for (const c of cols) {
    const next = board.map((row) => row.slice());
    dropDisc(next, c, aiPlayer);
    const score = minimax(next, depth - 1, -Infinity, Infinity, false, aiPlayer);
    if (score > best) {
      best = score;
      move = c;
    }
  }
  return move;
}

function easyMove(board: Disc[][], aiPlayer: Disc): number {
  const human = (3 - aiPlayer) as Disc;
  const cols = validColumns(board);
  // Take immediate win.
  for (const c of cols) {
    const next = board.map((row) => row.slice());
    dropDisc(next, c, aiPlayer);
    if (checkWin(next).winner === aiPlayer) return c;
  }
  // Block immediate loss.
  for (const c of cols) {
    const next = board.map((row) => row.slice());
    dropDisc(next, c, human);
    if (checkWin(next).winner === human) return c;
  }
  return cols[Math.floor(Math.random() * cols.length)];
}

export function ConnectFour({ game }: { game: GameDefinition }) {
  const [board, setBoard] = React.useState<Disc[][]>(emptyBoard);
  const [turn, setTurn] = React.useState<Disc>(1);
  const [mode, setMode] = React.useState<Mode>("ai-hard");
  const [scores, setScores] = React.useState({ 1: 0, 2: 0, draws: 0 });
  const win = React.useMemo(() => checkWin(board), [board]);
  const gameOver = win.winner !== 0 || isFull(board);
  const winSet = React.useMemo(() => {
    if (!win.cells) return new Set<string>();
    return new Set(win.cells.map(([r, c]) => `${r}-${c}`));
  }, [win]);

  React.useEffect(() => {
    if (mode === "friend") return;
    if (gameOver) return;
    if (turn !== 2) return;
    const t = setTimeout(() => {
      setBoard((prev) => {
        if (checkWin(prev).winner !== 0) return prev;
        const next = prev.map((row) => row.slice());
        const c = mode === "ai-easy" ? easyMove(next, 2) : bestColumn(next, 2, 4);
        dropDisc(next, c, 2);
        return next;
      });
      setTurn(1);
    }, 380);
    return () => clearTimeout(t);
  }, [turn, mode, gameOver]);

  React.useEffect(() => {
    if (win.winner !== 0) {
      setScores((s) => ({ ...s, [win.winner]: s[win.winner as 1 | 2] + 1 }));
      toast.success(win.winner === 1 ? "Red wins! 🎉" : "Yellow wins! 🎉");
    } else if (isFull(board)) {
      setScores((s) => ({ ...s, draws: s.draws + 1 }));
      toast.message("It's a draw.");
    }
  }, [win.winner, board]);

  function play(col: number) {
    if (gameOver) return;
    if (mode !== "friend" && turn !== 1) return;
    if (board[0][col] !== 0) {
      toast.error("That column is full.");
      return;
    }
    setBoard((prev) => {
      const next = prev.map((row) => row.slice());
      dropDisc(next, col, turn);
      return next;
    });
    setTurn((3 - turn) as Disc);
  }

  function reset() {
    setBoard(emptyBoard());
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

  const content: GameContent = {
    intro:
      "Drop discs into a 7-column × 6-row grid and try to line up four of your colour horizontally, vertically or diagonally. Play a friend or face the AI in easy (heuristic) or hard (minimax depth 4) mode.",
    game: (
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
            <ModeButton current={mode} value="friend" onClick={changeMode} icon={<Users className="h-3.5 w-3.5" />}>2 Players</ModeButton>
            <ModeButton current={mode} value="ai-easy" onClick={changeMode} icon={<User className="h-3.5 w-3.5" />}>AI · Easy</ModeButton>
            <ModeButton current={mode} value="ai-hard" onClick={changeMode} icon={<Cpu className="h-3.5 w-3.5" />}>AI · Hard</ModeButton>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Red: {scores[1]}</Badge>
            <Badge variant="secondary">Draws: {scores.draws}</Badge>
            <Badge variant="secondary">Yellow: {scores[2]}</Badge>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center">
          <div className="mb-3 text-sm font-medium text-muted-foreground">
            {win.winner === 1 && "🏆 Red wins!"}
            {win.winner === 2 && "🏆 Yellow wins!"}
            {win.winner === 0 && isFull(board) && "Draw — try again."}
            {!gameOver && (turn === 1 ? "Red to move" : "Yellow to move")}
            {mode !== "friend" && !gameOver && turn === 2 && " (AI thinking…)"}
          </div>

          <div className="w-full max-w-md">
            {/* Column drop buttons */}
            <div className="mb-1 grid grid-cols-7 gap-1.5">
              {Array.from({ length: COLS }, (_, c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => play(c)}
                  disabled={gameOver || (mode !== "friend" && turn !== 1) || board[0][c] !== 0}
                  aria-label={`Drop disc in column ${c + 1}`}
                  className="flex h-8 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ▼
                </button>
              ))}
            </div>
            <div
              className="grid grid-cols-7 gap-1.5 rounded-xl bg-blue-900/80 p-2 dark:bg-blue-950"
              role="grid"
              aria-label="Connect Four board"
            >
              {board.flatMap((row, r) =>
                row.map((cell, c) => {
                  const key = `${r}-${c}`;
                  const isWin = winSet.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => play(c)}
                      disabled={gameOver || (mode !== "friend" && turn !== 1)}
                      aria-label={`Row ${r + 1} column ${c + 1}${cell ? `, ${cell === 1 ? "red" : "yellow"}` : ", empty"}`}
                      className={`aspect-square rounded-full border-2 transition-all ${
                        cell === 0
                          ? "border-blue-950/40 bg-blue-950/30"
                          : cell === 1
                            ? isWin
                              ? "border-amber-300 bg-rose-500 ring-2 ring-amber-300"
                              : "border-rose-700 bg-rose-500"
                            : isWin
                              ? "border-amber-300 bg-amber-400 ring-2 ring-amber-300"
                              : "border-amber-600 bg-amber-400"
                      }`}
                    />
                  );
                })
              )}
            </div>
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
          Connect Four is played on a vertical 7-column × 6-row grid. Players
          alternate dropping a coloured disc into a column; the disc falls to
          the lowest empty cell. <strong>Red</strong> moves first against{" "}
          <strong>Yellow</strong>. The first player to line up four of their
          own discs horizontally, vertically or diagonally wins. If the board
          fills up without a winner, the round is a draw.
        </p>
        <p>
          <strong>AI · Easy</strong> wins when it can and blocks when it must,
          but plays randomly otherwise. <strong>AI · Hard</strong> searches
          four moves ahead with the minimax algorithm and a positional
          heuristic, making it tough but not unbeatable.
        </p>
      </div>
    ),
    tips: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Control the centre column — it participates in the most possible four-in-a-rows.</li>
        <li>Watch for "double threats": a single move that creates two ways to win next turn.</li>
        <li>Drop a piece directly on top of an opponent's threat to neutralise it.</li>
        <li>Odd rows matter: many winning tactics build from the bottom up.</li>
      </ul>
    ),
    controls: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Click a column (top arrow or any cell in that column) to drop your disc.</li>
        <li>Switch between 2-player, AI Easy and AI Hard with the toggle.</li>
        <li><strong>New round</strong> clears the board but keeps the running tally.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is the hard AI unbeatable?",
        a: "No — Connect Four is too deep for a perfect solver at depth 4. With first-move advantage Red can force a win with perfect play, but our heuristic AI will occasionally miss the strongest reply.",
      },
      {
        q: "Can I play with two people on the same device?",
        a: "Yes. Choose 2 Players from the toggle and alternate turns on a shared screen.",
      },
      {
        q: "Why does the AI pause before moving?",
        a: "A short delay keeps the game readable and gives the search time to complete. Hard mode looks four moves ahead so a tiny pause is normal.",
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
