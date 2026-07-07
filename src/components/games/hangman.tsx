"use client";

import * as React from "react";
import { GameLayout, type GameContent } from "@/components/dueneo/game-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, RefreshCw } from "lucide-react";
import type { GameDefinition } from "@/data/games";

type Category = "animals" | "food" | "science" | "geography";

const WORDS: Record<Category, string[]> = {
  animals: [
    "elephant", "giraffe", "kangaroo", "penguin", "dolphin", "leopard", "octopus",
    "butterfly", "rhinoceros", "crocodile", "hedgehog", "flamingo", "cheetah",
    "platypus", "chameleon", "porcupine", "salamander", "peacock", "buffalo",
    "raccoon", "jaguar", "gorilla", "orangutan", "anteater",
  ],
  food: [
    "pizza", "sushi", "pancake", "omelette", "spaghetti", "avocado", "strawberry",
    "blueberry", "chocolate", "sandwich", "popcorn", "waffle", "burrito",
    "lasagna", "brownie", "muffin", "smoothie", "tiramisu", "quesadilla",
    "hummus", "falafel", "pretzel", "macaroon", "cappuccino",
  ],
  science: [
    "atom", "gravity", "molecule", "electron", "neutron", "proton", "velocity",
    "friction", "magnet", "energy", "fusion", "fission", "orbit", "spectrum",
    "isotope", "nebula", "quasar", "photon", "plasma", "polymer", "catalyst",
    "enzyme", "genome", "particle",
  ],
  geography: [
    "paris", "london", "tokyo", "cairo", "moscow", "berlin", "madrid",
    "lisbon", "vienna", "dublin", "oslo", "helsinki", "athens", "prague",
    "budapest", "istanbul", "bangkok", "jakarta", "manila", "lima", "bogota",
    "nairobi", "dakar", "vancouver",
  ],
};

const CATEGORY_LABEL: Record<Category, string> = {
  animals: "Animals",
  food: "Food",
  science: "Science",
  geography: "Geography",
};

const MAX_WRONG = 6;

function pickWord(cat: Category, exclude?: string): string {
  const pool = WORDS[cat];
  let w = pool[Math.floor(Math.random() * pool.length)];
  let tries = 0;
  while (w === exclude && tries < 10) {
    w = pool[Math.floor(Math.random() * pool.length)];
    tries++;
  }
  return w;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function Hangman({ game }: { game: GameDefinition }) {
  const [category, setCategory] = React.useState<Category>("animals");
  const [word, setWord] = React.useState<string>(() => pickWord("animals"));
  const [guessed, setGuessed] = React.useState<Set<string>>(new Set());
  const [wrong, setWrong] = React.useState(0);
  const [reveal, setReveal] = React.useState(false);

  const won = React.useMemo(
    () => word.split("").every((ch) => guessed.has(ch.toUpperCase())),
    [word, guessed]
  );
  const lost = wrong >= MAX_WRONG || reveal;
  const gameOver = won || lost;

  React.useEffect(() => {
    if (won) toast.success("You saved the word! \ud83c\udf89");
    else if (lost && wrong >= MAX_WRONG) toast.error(`The word was "${word.toUpperCase()}".`);
  }, [won, lost]);

  function guess(letter: string) {
    const upper = letter.toUpperCase();
    if (guessed.has(upper) || gameOver) return;
    const next = new Set(guessed);
    next.add(upper);
    setGuessed(next);
    if (!word.toUpperCase().includes(upper)) {
      setWrong((w) => w + 1);
    }
  }

  function newWord(nextCat: Category = category) {
    setWord(pickWord(nextCat, word));
    setGuessed(new Set());
    setWrong(0);
    setReveal(false);
  }

  function changeCategory(c: Category) {
    if (c === category) return;
    setCategory(c);
    newWord(c);
  }

  // Keyboard support.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) guess(e.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guessed, word, wrong, gameOver]);

  const display = word
    .toUpperCase()
    .split("")
    .map((ch) => {
      if (/[A-Z]/.test(ch)) {
        return guessed.has(ch) || reveal || lost ? ch : "_";
      }
      return ch;
    });

  const content: GameContent = {
    intro:
      "Pick a category and try to guess the hidden word one letter at a time. Each wrong guess adds a piece to the gallows. Make six wrong guesses and the game is over — guess every letter first to win.",
    game: (
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
            {(Object.keys(WORDS) as Category[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => changeCategory(c)}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  category === c ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
          <Button onClick={() => newWord()} variant="default" size="sm">
            <RefreshCw className="h-4 w-4" /> New word
          </Button>
        </div>

        <div className="mt-5 grid gap-6 sm:grid-cols-[200px_1fr]">
          <div className="flex flex-col items-center">
            <Gallows wrong={wrong} />
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Wrong:</span>
              <Badge variant={wrong >= MAX_WRONG ? "destructive" : "secondary"}>
                {wrong} / {MAX_WRONG}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
              {display.map((ch, i) => (
                <span
                  key={i}
                  className={`flex h-12 w-8 items-center justify-center border-b-2 text-2xl font-bold sm:h-14 sm:w-10 ${
                    ch === "_"
                      ? "border-foreground/40 text-transparent"
                      : lost && !guessed.has(ch)
                        ? "border-destructive text-destructive"
                        : won
                          ? "border-emerald-500 text-emerald-600"
                          : "border-foreground text-foreground"
                  }`}
                >
                  {ch === "_" ? "·" : ch}
                </span>
              ))}
            </div>

            {gameOver && (
              <div className={`mb-3 rounded-md px-3 py-1.5 text-sm font-medium ${won ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                {won ? "🎉 You won!" : "💀 Game over."}
                {!won && ` The word was "${word.toUpperCase()}".`}
              </div>
            )}

            <div className="grid max-w-md grid-cols-7 gap-1.5 sm:grid-cols-9">
              {ALPHABET.map((L) => {
                const used = guessed.has(L);
                const inWord = word.toUpperCase().includes(L);
                return (
                  <button
                    key={L}
                    type="button"
                    onClick={() => guess(L)}
                    disabled={used || gameOver}
                    className={`h-9 rounded-md text-sm font-semibold transition-colors ${
                      used
                        ? inWord
                          ? "bg-emerald-500 text-white"
                          : "bg-destructive text-white"
                        : "border border-input bg-background hover:bg-accent"
                    } disabled:cursor-not-allowed`}
                    aria-label={`${L}${used ? (inWord ? " in word" : " not in word") : ""}`}
                  >
                    {L}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2">
              <Button onClick={() => newWord()} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4" /> Skip word
              </Button>
              {!gameOver && (
                <Button
                  onClick={() => setReveal(true)}
                  variant="ghost"
                  size="sm"
                >
                  Give up
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    rules: (
      <div className="space-y-3">
        <p>
          Choose a category — Animals, Food, Science or Geography — and the
          game picks a hidden word from that pool. You guess letters by
          clicking the on-screen keyboard or pressing a key on your real one.
          Correct letters appear in their positions; wrong letters add a piece
          to the hangman drawing.
        </p>
        <p>
          You can make up to <strong>six wrong guesses</strong>. Reveal all
          letters before the gallows is complete to win. Click <strong>New
          word</strong> to skip the current puzzle and start a fresh one from
          the same category.
        </p>
      </div>
    ),
    tips: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Start with the most common English letters: E, A, R, I, O, T, N, S.</li>
        <li>Vowels first narrows down possibilities quickly — try A, E, I, O, U.</li>
        <li>Watch for word length and category cues: a four-letter animal is rarely "pterodactyl".</li>
        <li>Once you know the word, type the remaining letters in any order — you don't have to spell it.</li>
      </ul>
    ),
    controls: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Click a letter on the keyboard, or press the matching physical key.</li>
        <li>Switch category with the toggle (resets the current word).</li>
        <li><strong>New word</strong> discards the current puzzle and draws a fresh one.</li>
      </ul>
    ),
    faq: [
      {
        q: "How many words are in each category?",
        a: "Each category ships with 24 hand-picked words. New word reshuffles, so you'll occasionally see a repeat — click New word again to skip.",
      },
      {
        q: "Can I use my physical keyboard?",
        a: "Yes. Press any letter key A–Z (case insensitive) to make a guess — no need to focus the keyboard widget first.",
      },
      {
        q: "Does the game track wins or losses?",
        a: "Only via toast notifications for the current session — there's no persistent scoreboard. Use New word to start a fresh round.",
      },
    ],
  };

  return <GameLayout game={game} content={content} />;
}

/** SVG hangman that grows with each wrong guess. */
function Gallows({ wrong }: { wrong: number }) {
  const showHead = wrong >= 1;
  const showBody = wrong >= 2;
  const showLeftArm = wrong >= 3;
  const showRightArm = wrong >= 4;
  const showLeftLeg = wrong >= 5;
  const showRightLeg = wrong >= 6;

  return (
    <svg viewBox="0 0 120 160" className="h-40 w-32" aria-label={`Hangman drawing, ${wrong} of 6 wrong guesses`}>
      {/* Gallows */}
      <line x1="10" y1="150" x2="90" y2="150" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="150" x2="30" y2="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="10" x2="80" y2="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="80" y1="10" x2="80" y2="25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Body parts */}
      {showHead && <circle cx="80" cy="35" r="10" stroke="currentColor" strokeWidth="3" fill="none" />}
      {showBody && <line x1="80" y1="45" x2="80" y2="90" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />}
      {showLeftArm && <line x1="80" y1="60" x2="65" y2="75" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />}
      {showRightArm && <line x1="80" y1="60" x2="95" y2="75" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />}
      {showLeftLeg && <line x1="80" y1="90" x2="65" y2="115" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />}
      {showRightLeg && <line x1="80" y1="90" x2="95" y2="115" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />}
    </svg>
  );
}
