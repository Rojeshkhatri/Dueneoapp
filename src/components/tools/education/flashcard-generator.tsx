"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Download,
  RotateCcw,
  Layers,
  Eye,
  EyeOff,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { uid, shuffle, toCsv, downloadText, downloadHtmlAndPrint, loadJSON, saveJSON, EDU_DISCLAIMER } from "./_edu-helpers";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

const STORAGE_KEY = "dueneo:flashcards:v1";

export function FlashcardGenerator({ tool }: { tool: ToolDefinition }) {
  const [cards, setCards] = React.useState<Flashcard[]>(() => loadJSON<Flashcard[]>(STORAGE_KEY, []));
  const [front, setFront] = React.useState("");
  const [back, setBack] = React.useState("");

  // Study-mode state
  const [studying, setStudying] = React.useState(false);
  const [deck, setDeck] = React.useState<Flashcard[]>([]);
  const [pos, setPos] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [knownCount, setKnownCount] = React.useState(0);
  const [unknownCount, setUnknownCount] = React.useState(0);

  React.useEffect(() => {
    saveJSON(STORAGE_KEY, cards);
  }, [cards]);

  const addCard = () => {
    if (!front.trim() && !back.trim()) {
      toast.error("Add at least front or back text.");
      return;
    }
    setCards((p) => [...p, { id: uid(), front: front.trim(), back: back.trim() }]);
    setFront("");
    setBack("");
  };

  const removeCard = (id: string) => setCards((p) => p.filter((c) => c.id !== id));

  const startStudy = (shuffled: boolean) => {
    if (cards.length === 0) {
      toast.error("Add at least one card first.");
      return;
    }
    setDeck(shuffled ? shuffle(cards) : cards.slice());
    setPos(0);
    setFlipped(false);
    setKnownCount(0);
    setUnknownCount(0);
    setStudying(true);
  };

  const answer = (known: boolean) => {
    if (known) setKnownCount((n) => n + 1);
    else setUnknownCount((n) => n + 1);
    if (pos < deck.length - 1) {
      setPos((n) => n + 1);
      setFlipped(false);
    } else {
      setStudying(false);
      toast.success(`Session complete — ${known ? knownCount + 1 : knownCount}/${deck.length} known`);
    }
  };

  const next = () => {
    if (pos < deck.length - 1) {
      setPos((n) => n + 1);
      setFlipped(false);
    }
  };
  const prev = () => {
    if (pos > 0) {
      setPos((n) => n - 1);
      setFlipped(false);
    }
  };

  const exportCsv = () => {
    if (cards.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    const rows = [["Front", "Back"], ...cards.map((c) => [c.front, c.back])];
    downloadText("flashcards.csv", toCsv(rows), "text/csv");
    toast.success("Exported CSV (Anki / Quizlet ready)");
  };

  const exportJson = () => {
    if (cards.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    downloadText("flashcards.json", JSON.stringify(cards, null, 2), "application/json");
    toast.success("Exported JSON");
  };

  const exportHtml = () => {
    if (cards.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Flashcards — printable</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 20px; margin: 0 0 16px; }
  .card { border: 1px solid #ccc; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; page-break-inside: avoid; }
  .front { font-weight: 600; font-size: 16px; margin-bottom: 6px; }
  .back { color: #444; font-size: 14px; white-space: pre-wrap; }
  .badge { display: inline-block; background: #eef; color: #336; padding: 2px 8px; border-radius: 999px; font-size: 11px; margin-right: 6px; }
</style>
</head>
<body>
<h1>Flashcards (${cards.length})</h1>
${cards.map((c, i) => `<div class="card"><div class="front"><span class="badge">${i + 1}</span>${escapeHtml(c.front)}</div><div class="back">${escapeHtml(c.back)}</div></div>`).join("")}
</body>
</html>`;
    downloadHtmlAndPrint("flashcards.html", html, "Flashcards — printable");
    toast.success("Opened printable view");
  };

  const reset = () => {
    if (cards.length === 0) return;
    if (!confirm("Delete all flashcards?")) return;
    setCards([]);
    toast.info("Cleared.");
  };

  const content: ToolContent = {
    intro:
      "Build a deck of flashcards (front + back) and study them one at a time. Flip cards with a click, mark each as known or unknown, shuffle, and export to CSV for Anki or Quizlet, JSON, or a printable HTML page. Your deck is saved in your browser automatically.",
    tool: studying ? (
      <StudyMode
        deck={deck}
        pos={pos}
        flipped={flipped}
        knownCount={knownCount}
        unknownCount={unknownCount}
        onFlip={() => setFlipped((f) => !f)}
        onAnswer={answer}
        onNext={next}
        onPrev={prev}
        onExit={() => setStudying(false)}
      />
    ) : (
      <div className="space-y-5">
        <Card>
          <CardContent className="grid gap-3 sm:grid-cols-2 pt-6">
            <div className="space-y-2">
              <Label htmlFor="fc-front">Front (question)</Label>
              <Input id="fc-front" value={front} onChange={(e) => setFront(e.target.value)} placeholder="What is the powerhouse of the cell?" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addCard(); }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fc-back">Back (answer)</Label>
              <Input id="fc-back" value={back} onChange={(e) => setBack(e.target.value)} placeholder="Mitochondria" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addCard(); }} />
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <Button onClick={addCard}>
                <Plus className="mr-1.5 h-4 w-4" /> Add card
              </Button>
              <Button variant="outline" onClick={() => startStudy(false)} disabled={cards.length === 0}>
                <Layers className="mr-1.5 h-4 w-4" /> Study in order
              </Button>
              <Button variant="outline" onClick={() => startStudy(true)} disabled={cards.length === 0}>
                <Shuffle className="mr-1.5 h-4 w-4" /> Study shuffled
              </Button>
              <Button variant="outline" onClick={exportCsv} disabled={cards.length === 0}>
                <Download className="mr-1.5 h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" onClick={exportJson} disabled={cards.length === 0}>
                <Download className="mr-1.5 h-4 w-4" /> JSON
              </Button>
              <Button variant="outline" onClick={exportHtml} disabled={cards.length === 0}>
                <Download className="mr-1.5 h-4 w-4" /> Printable HTML
              </Button>
              <Button variant="ghost" onClick={reset} disabled={cards.length === 0} className="ml-auto text-destructive">
                <RotateCcw className="mr-1.5 h-4 w-4" /> Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Your deck ({cards.length} {cards.length === 1 ? "card" : "cards"})
            </h3>
          </div>
          {cards.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              No cards yet. Add one above — it will be saved to this browser automatically.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((c, i) => (
                <Card key={c.id} className="overflow-hidden">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeCard(c.id)} aria-label="Remove card">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <p className="mt-2 text-sm font-medium">{c.front || <span className="italic text-muted-foreground">(empty front)</span>}</p>
                    <div className="my-2 border-t border-dashed" />
                    <p className="text-sm text-muted-foreground">{c.back || <span className="italic">(empty back)</span>}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Add cards",
        description: "Type a front (question) and back (answer). Press Cmd/Ctrl+Enter to add quickly. Cards are saved to this browser automatically.",
      },
      {
        title: "Study in order or shuffled",
        description: "Click 'Study in order' to walk through your deck sequentially, or 'Study shuffled' to randomise the order.",
      },
      {
        title: "Flip and mark",
        description: "Click the big card to flip it. Mark each as Known (✓) or Unknown (✗) — counts update live at the top.",
      },
      {
        title: "Export",
        description: "Download your deck as CSV for Anki or Quizlet (columns: Front, Back), as JSON, or as a printable HTML page.",
      },
    ],
    useCases: [
      "Build a vocabulary deck for a language course and export to Anki.",
      "Drill medical / legal / science terms before an exam.",
      "Print a hard-copy study sheet when screen time isn't an option.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{EDU_DISCLAIMER}</li>
        <li>Cards are stored in this browser only — clearing site data or switching devices will lose them. Export to JSON or CSV for a backup.</li>
        <li>The CSV export matches Anki's basic 'Front, Back' import format. For tags, image occlusion or cloze deletions, edit the CSV manually before importing.</li>
      </ul>
    ),
    faq: [
      {
        q: "Where are my flashcards saved?",
        a: "In your browser's localStorage under the key 'dueneo:flashcards:v1'. They persist across reloads of this page in the same browser, but are not synced anywhere — export to JSON or CSV to back them up or move them to another device.",
      },
      {
        q: "How do I import into Anki?",
        a: "Export as CSV, open Anki → File → Import, select the CSV, and map column 1 to the Front field and column 2 to the Back field of a Basic note type.",
      },
      {
        q: "Can I shuffle just the deck without entering study mode?",
        a: "Use 'Study shuffled' — it randomises the order and immediately starts the session. The underlying deck list is preserved.",
      },
      {
        q: "What does the 'Printable HTML' option do?",
        a: "It opens a new tab with a clean, print-ready layout of every card and triggers your browser's print dialog so you can save as PDF or print on paper.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function StudyMode({
  deck,
  pos,
  flipped,
  knownCount,
  unknownCount,
  onFlip,
  onAnswer,
  onNext,
  onPrev,
  onExit,
}: {
  deck: Flashcard[];
  pos: number;
  flipped: boolean;
  knownCount: number;
  unknownCount: number;
  onFlip: () => void;
  onAnswer: (known: boolean) => void;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
}) {
  const card = deck[pos];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge variant="secondary">
          Card {pos + 1} / {deck.length}
        </Badge>
        <Badge variant="outline" className="text-emerald-600">
          <Check className="mr-1 h-3 w-3" /> {knownCount} known
        </Badge>
        <Badge variant="outline" className="text-rose-600">
          <X className="mr-1 h-3 w-3" /> {unknownCount} unknown
        </Badge>
        <Button size="sm" variant="ghost" onClick={onExit} className="ml-auto">
          Exit study mode
        </Button>
      </div>

      <button
        type="button"
        onClick={onFlip}
        className="block w-full rounded-xl border bg-card p-8 text-left shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={flipped ? "Showing answer — click to show question" : "Showing question — click to reveal answer"}
      >
        <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
          <span>{flipped ? "Answer" : "Question"}</span>
          {flipped ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </div>
        <p className="whitespace-pre-wrap break-words text-lg leading-relaxed sm:text-xl">
          {flipped ? card.back || "(empty answer)" : card.front || "(empty question)"}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">Click anywhere to flip</p>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onPrev} disabled={pos === 0}>
          <ChevronLeft className="mr-1.5 h-4 w-4" /> Previous
        </Button>
        <Button variant="outline" onClick={onNext} disabled={pos === deck.length - 1}>
          Next <ChevronRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30" onClick={() => onAnswer(false)}>
          <X className="mr-1.5 h-4 w-4" /> Don't know
        </Button>
        <Button variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30" onClick={() => onAnswer(true)}>
          <Check className="mr-1.5 h-4 w-4" /> Got it
        </Button>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
