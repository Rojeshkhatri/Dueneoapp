"use client";

import * as React from "react";
import { GameLayout, type GameContent } from "@/components/dueneo/game-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, User, Users, Cpu, Crown } from "lucide-react";
import type { GameDefinition } from "@/data/games";

type Mode = "friend" | "ai-easy" | "ai-hard";
type Player = 1 | 2; // 1 = red (bottom, moves up), 2 = black (top, moves down)

interface Piece {
  player: Player;
  king: boolean;
}

type Cell = Piece | null;
type Board = Cell[][];

const SIZE = 8;

function isDark(r: number, c: number): boolean {
  return (r + c) % 2 === 1;
}

function initialBoard(): Board {
  const b: Board = Array.from({ length: SIZE }, () => Array<Cell>(SIZE).fill(null));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!isDark(r, c)) continue;
      if (r < 3) b[r][c] = { player: 2, king: false };
      else if (r > 4) b[r][c] = { player: 1, king: false };
    }
  }
  return b;
}

function cloneBoard(b: Board): Board {
  return b.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

interface Move {
  from: [number, number];
  to: [number, number];
  captures: [number, number][];
  path: [number, number][];
}

const DIAGS: [number, number][] = [
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];

function getMovesForPiece(board: Board, r: number, c: number): Move[] {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: Move[] = [];
  const captures: Move[] = [];

  // Captures: kings can move in any diagonal direction; men only forward (but captures both directions? In American draughts, men capture forward only).
  const captureDirs: [number, number][] = piece.king
    ? DIAGS
    : piece.player === 1
      ? [[-1, -1], [-1, 1]]
      : [[1, -1], [1, 1]];

  for (const [dr, dc] of captureDirs) {
    const midR = r + dr;
    const midC = c + dc;
    const landR = r + dr * 2;
    const landC = c + dc * 2;
    if (landR < 0 || landR >= SIZE || landC < 0 || landC >= SIZE) continue;
    const mid = board[midR][midC];
    if (!mid || mid.player === piece.player) continue;
    if (board[landR][landC] !== null) continue;
    captures.push({
      from: [r, c],
      to: [landR, landC],
      captures: [[midR, midC]],
      path: [[r, c], [landR, landC]],
    });
  }

  if (captures.length > 0) {
    // Mandatory capture; explore multi-jumps.
    return expandCaptures(board, r, c, piece, [[r, c]], []);
  }

  // Simple moves: men only forward; kings any diagonal.
  const moveDirs: [number, number][] = piece.king
    ? DIAGS
    : piece.player === 1
      ? [[-1, -1], [-1, 1]]
      : [[1, -1], [1, 1]];
  for (const [dr, dc] of moveDirs) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
    if (board[nr][nc] === null) {
      moves.push({
        from: [r, c],
        to: [nr, nc],
        captures: [],
        path: [[r, c], [nr, nc]],
      });
    }
  }
  return moves;
}

function expandCaptures(
  board: Board,
  r: number,
  c: number,
  piece: Piece,
  path: [number, number][],
  capturedSoFar: [number, number][]
): Move[] {
  const captureDirs: [number, number][] = piece.king
    ? DIAGS
    : piece.player === 1
      ? [[-1, -1], [-1, 1]]
      : [[1, -1], [1, 1]];
  const further: Move[] = [];
  for (const [dr, dc] of captureDirs) {
    const midR = r + dr;
    const midC = c + dc;
    const landR = r + dr * 2;
    const landC = c + dc * 2;
    if (landR < 0 || landR >= SIZE || landC < 0 || landC >= SIZE) continue;
    const mid = board[midR][midC];
    if (!mid || mid.player === piece.player) continue;
    // Can't capture the same piece twice.
    if (capturedSoFar.some(([cr, cc]) => cr === midR && cc === midC)) continue;
    if (board[landR][landC] !== null && !(landR === path[0][0] && landC === path[0][1])) continue;
    const newCaptured = [...capturedSoFar, [midR, midC]];
    const newPath = [...path, [landR, landC]];
    // Temporarily simulate the capture so further jumps see the board correctly.
    const tmp = cloneBoard(board);
    tmp[r][c] = null;
    tmp[midR][midC] = null;
    tmp[landR][landC] = piece;
    const furtherFromHere = expandCaptures(tmp, landR, landC, piece, newPath, newCaptured);
    if (furtherFromHere.length > 0) {
      further.push(...furtherFromHere);
    } else {
      further.push({
        from: path[0],
        to: [landR, landC],
        captures: newCaptured,
        path: newPath,
      });
    }
  }
  return further;
}

function allMovesForPlayer(board: Board, player: Player): Move[] {
  let captures: Move[] = [];
  const simples: Move[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const piece = board[r][c];
      if (!piece || piece.player !== player) continue;
      const moves = getMovesForPiece(board, r, c);
      for (const m of moves) {
        if (m.captures.length > 0) captures.push(m);
        else simples.push(m);
      }
    }
  }
  return captures.length > 0 ? captures : simples;
}

function applyMove(board: Board, move: Move): Board {
  const next = cloneBoard(board);
  const piece = next[move.from[0]][move.from[1]]!;
  next[move.from[0]][move.from[1]] = null;
  for (const [cr, cc] of move.captures) {
    next[cr][cc] = null;
  }
  // Check promotion.
  let promoted = false;
  let finalPiece: Piece = { ...piece };
  const finalR = move.to[0];
  if (!piece.king) {
    if ((piece.player === 1 && finalR === 0) || (piece.player === 2 && finalR === SIZE - 1)) {
      finalPiece.king = true;
      promoted = true;
    }
  }
  next[finalR][move.to[1]] = finalPiece;
  // In American draughts, promotion ends the turn (no further captures).
  void promoted;
  return next;
}

function evaluate(board: Board, player: Player): number {
  let score = 0;
  const opp = (3 - player) as Player;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = board[r][c];
      if (!p) continue;
      const v = p.king ? 5 : 3;
      // Position bonus: forward progress for men.
      const positional = p.king ? 0 : p.player === 1 ? (SIZE - 1 - r) * 0.1 : r * 0.1;
      if (p.player === player) score += v + positional;
      else if (p.player === opp) score -= v + positional;
    }
  }
  return score;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiPlayer: Player,
  currentPlayer: Player
): number {
  const moves = allMovesForPlayer(board, currentPlayer);
  if (depth === 0) return evaluate(board, aiPlayer);
  if (moves.length === 0) {
    // Current player loses.
    return currentPlayer === aiPlayer ? -1000 : 1000;
  }
  if (maximizing) {
    let value = -Infinity;
    for (const m of moves) {
      const next = applyMove(board, m);
      value = Math.max(value, minimax(next, depth - 1, alpha, beta, false, aiPlayer, (3 - currentPlayer) as Player));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const m of moves) {
      const next = applyMove(board, m);
      value = Math.min(value, minimax(next, depth - 1, alpha, beta, true, aiPlayer, (3 - currentPlayer) as Player));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
}

function bestMove(board: Board, player: Player, depth: number): Move | null {
  const moves = allMovesForPlayer(board, player);
  if (moves.length === 0) return null;
  let best = -Infinity;
  let bestMove_: Move | null = null;
  for (const m of moves) {
    const next = applyMove(board, m);
    const score = minimax(next, depth - 1, -Infinity, Infinity, false, player, (3 - player) as Player);
    if (score > best) {
      best = score;
      bestMove_ = m;
    }
  }
  return bestMove_;
}

function easyMove(board: Board, player: Player): Move | null {
  const moves = allMovesForPlayer(board, player);
  if (moves.length === 0) return null;
  // Prefer captures, otherwise random.
  return moves[Math.floor(Math.random() * moves.length)];
}

export function Checkers({ game }: { game: GameDefinition }) {
  const [board, setBoard] = React.useState<Board>(initialBoard);
  const [turn, setTurn] = React.useState<Player>(1);
  const [mode, setMode] = React.useState<Mode>("ai-hard");
  const [selected, setSelected] = React.useState<[number, number] | null>(null);
  const [forcedFrom, setForcedFrom] = React.useState<[number, number] | null>(null);
  const [winner, setWinner] = React.useState<Player | null>(null);

  const allMoves = React.useMemo(() => allMovesForPlayer(board, turn), [board, turn]);
  const legalFromSelected = React.useMemo(() => {
    if (!selected) return [];
    if (forcedFrom && (selected[0] !== forcedFrom[0] || selected[1] !== forcedFrom[1])) return [];
    return allMoves.filter((m) => m.from[0] === selected[0] && m.from[1] === selected[1]);
  }, [allMoves, selected, forcedFrom]);
  const legalDestinations = React.useMemo(() => {
    const set = new Set<string>();
    for (const m of legalFromSelected) set.add(`${m.to[0]}-${m.to[1]}`);
    return set;
  }, [legalFromSelected]);
  const movablePieces = React.useMemo(() => {
    const set = new Set<string>();
    if (forcedFrom) {
      set.add(`${forcedFrom[0]}-${forcedFrom[1]}`);
      return set;
    }
    for (const m of allMoves) set.add(`${m.from[0]}-${m.from[1]}`);
    return set;
  }, [allMoves, forcedFrom]);

  React.useEffect(() => {
    if (allMoves.length === 0 && !winner) {
      const w = (3 - turn) as Player;
      setWinner(w);
      toast.success(`🏆 ${w === 1 ? "Red" : "Black"} wins!`);
    }
  }, [allMoves, turn, winner]);

  // AI turn.
  React.useEffect(() => {
    if (mode === "friend" || winner) return;
    if (turn !== 2) return;
    const t = setTimeout(() => {
      const move = mode === "ai-easy" ? easyMove(board, 2) : bestMove(board, 2, 4);
      if (!move) {
        setWinner(1);
        toast.success("🏆 Red wins!");
        return;
      }
      const next = applyMove(board, move);
      setBoard(next);
      setTurn(1);
    }, 450);
    return () => clearTimeout(t);
  }, [turn, mode, board, winner]);

  function handleCellClick(r: number, c: number) {
    if (winner) return;
    if (mode !== "friend" && turn !== 1) return;
    if (!isDark(r, c)) return;
    const key = `${r}-${c}`;

    // If a piece is selected and clicking a legal destination, move.
    if (selected && legalDestinations.has(key)) {
      const move = legalFromSelected.find((m) => m.to[0] === r && m.to[1] === c);
      if (!move) return;
      const next = applyMove(board, move);
      // Check if multi-jump available (only if captures AND no promotion).
      const piece = board[move.from[0]][move.from[1]]!;
      const wasPromoted = !piece.king && ((piece.player === 1 && r === 0) || (piece.player === 2 && r === SIZE - 1));
      if (move.captures.length > 0 && !wasPromoted) {
        const newPiece = next[r][c]!;
        const further = expandCaptures(next, r, c, newPiece, [[move.from[0], move.from[1]], [r, c]], move.captures);
        if (further.length > 0) {
          setBoard(next);
          setSelected([r, c]);
          setForcedFrom([r, c]);
          return;
        }
      }
      setBoard(next);
      setTurn((3 - turn) as Player);
      setSelected(null);
      setForcedFrom(null);
      return;
    }

    // Otherwise, try selecting a piece.
    if (forcedFrom) return; // can only continue the multi-jump
    if (!movablePieces.has(key)) return;
    setSelected([r, c]);
  }

  function reset() {
    setBoard(initialBoard());
    setTurn(1);
    setSelected(null);
    setForcedFrom(null);
    setWinner(null);
  }

  function changeMode(m: Mode) {
    setMode(m);
    reset();
  }

  const counts = React.useMemo(() => {
    let red = 0;
    let black = 0;
    for (const row of board) for (const p of row) {
      if (!p) continue;
      if (p.player === 1) red++;
      else black++;
    }
    return { red, black };
  }, [board]);

  const content: GameContent = {
    intro:
      "Classic 8×8 American (English) draughts. Move your pieces diagonally, jump over opponent pieces to capture them, and reach the far row to crown a king. Captures are mandatory, and multi-jumps must be completed in a single turn. Play a friend or face the AI.",
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
            <div className="h-5 w-5 rounded-full bg-rose-500" />
            <span className="text-sm font-semibold">{counts.red}</span>
            {turn === 1 && !winner && <Badge variant="secondary">turn</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-slate-800" />
            <span className="text-sm font-semibold">{counts.black}</span>
            {turn === 2 && !winner && <Badge variant="secondary">turn</Badge>}
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <div
            className="grid grid-cols-8 gap-0 overflow-hidden rounded-lg border-2 border-amber-900/30"
            role="grid"
            aria-label="Checkers board"
          >
            {board.map((row, r) =>
              row.map((cell, c) => {
                const dark = isDark(r, c);
                const key = `${r}-${c}`;
                const isSelected = selected && selected[0] === r && selected[1] === c;
                const isLegalDest = legalDestinations.has(key);
                const isMovable = movablePieces.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleCellClick(r, c)}
                    aria-label={`Row ${r + 1} column ${c + 1}${cell ? `, ${cell.player === 1 ? "red" : "black"}${cell.king ? " king" : ""}` : ""}`}
                    className={`relative flex h-9 w-9 items-center justify-center sm:h-12 sm:w-12 ${
                      dark ? "bg-amber-800/80" : "bg-amber-100 dark:bg-amber-200/30"
                    } ${isSelected ? "ring-2 ring-primary ring-inset" : ""}`}
                  >
                    {isLegalDest && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="h-3 w-3 rounded-full bg-primary/60 sm:h-4 sm:w-4" />
                      </span>
                    )}
                    {cell && (
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-sm sm:h-9 sm:w-9 ${
                          cell.player === 1
                            ? "border-rose-300 bg-rose-500 text-rose-50"
                            : "border-slate-500 bg-slate-800 text-slate-50"
                        } ${isMovable ? "ring-1 ring-emerald-400" : ""}`}
                      >
                        {cell.king && <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {forcedFrom && (
          <div className="mt-3 text-center text-sm text-muted-foreground">
            Multi-jump in progress — you must continue capturing with this piece.
          </div>
        )}

        {winner && (
          <div className="mt-3 rounded-md bg-muted px-3 py-2 text-center text-sm font-medium">
            🏆 {winner === 1 ? "Red" : "Black"} wins!{" "}
            <button onClick={reset} className="underline">Play again</button>
          </div>
        )}
      </div>
    ),
    rules: (
      <div className="space-y-3">
        <p>
          Checkers is played on the dark squares of an 8×8 board. Each player
          starts with 12 discs on their side. <strong>Red</strong> moves first.
          Regular pieces (men) move one square diagonally forward to an empty
          dark square. To capture, jump diagonally over an adjacent opponent
          piece into the empty square beyond it — the captured piece is
          removed.
        </p>
        <p>
          <strong>Captures are mandatory.</strong> If any of your pieces can
          capture, you must make a capturing move. After a capture, if the same
          piece can capture again from its new square, you must continue the
          multi-jump in the same turn. The game highlights the piece you must
          keep moving.
        </p>
        <p>
          When a man reaches the opponent's back row it is crowned a{" "}
          <strong>king</strong> (shown with a crown icon). Kings can move and
          capture diagonally in any direction. In American draughts, becoming a
          king ends your turn even if more captures look available.
        </p>
        <p>
          You win by capturing all of your opponent's pieces, or by leaving
          them with no legal move on their turn.
        </p>
      </div>
    ),
    tips: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Control the centre early — central pieces have more move options.</li>
        <li>Keep your back row intact as long as possible to deny your opponent kings.</li>
        <li>Force multi-jumps to maximise captures in a single turn.</li>
        <li>Trade pieces when you're ahead in material; avoid trades when behind.</li>
        <li>Watch out for "trapping" your own piece — sometimes a single bad move loses a king.</li>
      </ul>
    ),
    controls: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Click one of your movable pieces (highlighted with a green ring) to select it.</li>
        <li>Click a highlighted destination dot to move there.</li>
        <li>During a multi-jump, only the capturing piece is selectable — keep clicking destinations until the chain ends.</li>
        <li>Switch between 2-player, AI Easy and AI Hard with the toggle (resets the board).</li>
      </ul>
    ),
    faq: [
      {
        q: "Why can't I move a piece I just clicked?",
        a: "Either the piece has no legal move, or another of your pieces has a capture available. Captures are mandatory — the game only highlights pieces that can capture when one exists.",
      },
      {
        q: "Why did my piece stop after one capture when more look possible?",
        a: "If your piece became a king on that capture, the turn ends immediately. Otherwise, the game keeps the piece selected and shows the next legal jump — click the destination to continue.",
      },
      {
        q: "How strong is the AI?",
        a: "Easy plays randomly (still respecting mandatory captures). Hard uses a 4-ply minimax search with material and positional evaluation — competent enough to punish blunders, but a careful player can beat it.",
      },
      {
        q: "Which checkers variant is this?",
        a: "American (English) draughts: 8×8 board, 12 pieces each, men capture only forward, kings move one square in any diagonal. Other variants (international, Italian, Russian) have different rules.",
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
