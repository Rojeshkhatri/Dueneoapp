"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dices, RotateCcw, Trash2, UserMinus } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { parseLines, randomInt } from "./_random-helpers";

interface PickRecord {
  name: string;
  at: number;
}

export function NamePicker({ tool }: { tool: ToolDefinition }) {
  const [raw, setRaw] = React.useState<string>(
    "Alice\nBob\nCarol\nDave\nEve\nFrank\nGrace\nHeidi"
  );
  const [names, setNames] = React.useState<string[]>(() =>
    parseLines("Alice\nBob\nCarol\nDave\nEve\nFrank\nGrace\nHeidi")
  );
  const [revealing, setRevealing] = React.useState(false);
  const [displayed, setDisplayed] = React.useState<string>("");
  const [winner, setWinner] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<PickRecord[]>([]);
  const [removePicked, setRemovePicked] = React.useState(false);
  const revealTimer = React.useRef<number | null>(null);

  const updateNames = (text: string) => {
    setRaw(text);
    setNames(parseLines(text));
  };

  const cleanupTimer = () => {
    if (revealTimer.current !== null) {
      window.clearInterval(revealTimer.current);
      revealTimer.current = null;
    }
  };

  React.useEffect(() => () => cleanupTimer(), []);

  const pick = () => {
    if (revealing) return;
    if (names.length === 0) {
      toast.error("Add at least one name to pick from.");
      return;
    }
    setWinner(null);
    setRevealing(true);

    // Decide the winner up-front so the reveal animation is purely cosmetic.
    const winnerIdx = randomInt(names.length);
    const chosen = names[winnerIdx] ?? "";

    // Slot-machine style reveal: cycle through random names for ~1.4s.
    const startedAt = Date.now();
    const duration = 1400;
    revealTimer.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= duration) {
        cleanupTimer();
        setDisplayed(chosen);
        setWinner(chosen);
        setRevealing(false);
        setHistory((h) => [{ name: chosen, at: Date.now() }, ...h].slice(0, 20));
        if (removePicked) {
          setNames((prev) => {
            const next = prev.filter((n) => n !== chosen);
            setRaw(next.join("\n"));
            return next;
          });
        }
        toast.success(`Picked: ${chosen}`);
        return;
      }
      // Speed of flicker slows down as we approach the end.
      const flickerNames = names;
      setDisplayed(flickerNames[randomInt(flickerNames.length)] ?? "");
    }, 70);
  };

  const reset = () => {
    cleanupTimer();
    setRevealing(false);
    setWinner(null);
    setDisplayed("");
    setHistory([]);
  };

  const clearNames = () => {
    setRaw("");
    setNames([]);
    setWinner(null);
    setDisplayed("");
  };

  const removeWinner = () => {
    if (!winner) return;
    setNames((prev) => {
      const next = prev.filter((n) => n !== winner);
      setRaw(next.join("\n"));
      return next;
    });
    setWinner(null);
    setDisplayed("");
    toast.success(`Removed “${winner}” from the list.`);
  };

  const toolBody = (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Picker column */}
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-4 sm:p-6">
          <div
            className={`flex h-44 w-full max-w-md items-center justify-center rounded-xl border-2 bg-gradient-to-br ${
              winner
                ? "border-primary/40 from-primary/10 to-primary/5"
                : "border-dashed from-muted/40 to-muted/10"
            } p-4 text-center transition-all`}
          >
            <span
              className={`break-words text-center font-bold ${
                winner ? "text-3xl sm:text-4xl" : revealing ? "text-2xl opacity-70" : "text-lg text-muted-foreground"
              }`}
            >
              {revealing || winner ? displayed || "…" : "Your winner appears here"}
            </span>
          </div>

          <Button
            size="lg"
            className="w-full max-w-xs text-base"
            onClick={pick}
            disabled={revealing || names.length === 0}
          >
            <Dices className="mr-2 h-5 w-5" />
            {revealing ? "Picking…" : "Pick a name"}
          </Button>

          {winner && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="default" onClick={pick}>
                <Dices className="mr-1.5 h-3.5 w-3.5" />
                Pick again
              </Button>
              <Button size="sm" variant="outline" onClick={removeWinner}>
                <UserMinus className="mr-1.5 h-3.5 w-3.5" />
                Remove winner
              </Button>
            </div>
          )}

          {history.length > 0 && (
            <div className="w-full max-w-md">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recent picks
              </p>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {history.map((h, i) => (
                  <Badge key={i} variant="secondary" className="font-medium">
                    {h.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Controls column */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="np-names">Names</Label>
              <span className="text-xs text-muted-foreground">
                {names.length} name{names.length === 1 ? "" : "s"}
              </span>
            </div>
            <Textarea
              id="np-names"
              value={raw}
              onChange={(e) => updateNames(e.target.value)}
              placeholder={"Alice\nBob\nCarol\n…"}
              className="min-h-[260px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter one name per line. Blank lines are ignored.
            </p>
          </div>

          <Label
            htmlFor="np-remove"
            className="flex cursor-pointer items-center justify-between rounded-md border bg-background px-3 py-2.5 text-sm"
          >
            <span>Remove picked name from list</span>
            <Switch
              id="np-remove"
              checked={removePicked}
              onCheckedChange={setRemovePicked}
            />
          </Label>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearNames}
              disabled={names.length === 0}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Clear names
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Tip:</span> Toggle
              “Remove picked name” for raffles or secret-Santa style draws where
              each name should only be picked once.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Randomly pick a name from your list with a fun slot-machine reveal animation. Perfect for giveaways, classroom picks, and team selection. Optionally remove picked names so each person is chosen only once.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter your names",
        description:
          "Type each name on its own line in the box on the right. Blank lines are ignored automatically.",
      },
      {
        title: "Pick a name",
        description:
          "Click “Pick a name”. Names flicker on screen for about 1.5 seconds before the winner is revealed with a highlight.",
      },
      {
        title: "Remove the winner (optional)",
        description:
          "Toggle “Remove picked name from list” for raffles where each name can be chosen only once, or click “Remove winner” after each pick.",
      },
      {
        title: "Check recent picks",
        description:
          "The recent-picks badge list shows your last 20 draws so you can verify who has already been chosen.",
      },
    ],
    useCases: [
      "Run a giveaway or raffle and announce a winner live.",
      "Pick a student to answer a question in class.",
      "Assign daily chores or presentation order fairly.",
      "Choose a team captain or first speaker from a group.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Names are case-sensitive — “Alice” and “alice” count as different entries.</li>
        <li>The recent-picks history is limited to the most recent 20 draws and resets when you refresh the page.</li>
        <li>Very long names may wrap onto multiple lines in the winner display.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is the picker fair?",
        a: "Yes. We use the browser's cryptographic random number generator (crypto.getRandomValues with rejection sampling) to pick each name with equal probability.",
      },
      {
        q: "Can the same name be picked twice?",
        a: "Only if it appears twice in your list, or if you don’t remove the winner. Toggle “Remove picked name from list” for unique picks across rounds.",
      },
      {
        q: "Does the order of names matter?",
        a: "No. The picker treats your list as an unordered pool — every name has the same chance of being picked regardless of position.",
      },
      {
        q: "Are my names sent anywhere?",
        a: "No. Everything stays in your browser tab. Refreshing the page clears your list and history.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
