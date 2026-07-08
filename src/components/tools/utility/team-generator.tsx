"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Shuffle, Users } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { parseLines, secureShuffle, TEAM_PALETTE } from "./_random-helpers";

type Mode = "by-count" | "by-size";

export function TeamGenerator({ tool }: { tool: ToolDefinition }) {
  const [raw, setRaw] = React.useState<string>(
    "Alice\nBob\nCarol\nDave\nEve\nFrank\nGrace\nHeidi\nIvan\nJudy\nKarl\nLara"
  );
  const [names, setNames] = React.useState<string[]>(() =>
    parseLines(
      "Alice\nBob\nCarol\nDave\nEve\nFrank\nGrace\nHeidi\nIvan\nJudy\nKarl\nLara"
    )
  );
  const [mode, setMode] = React.useState<Mode>("by-count");
  const [teamCount, setTeamCount] = React.useState(3);
  const [teamSize, setTeamSize] = React.useState(4);
  const [teams, setTeams] = React.useState<string[][]>([]);
  const [generating, setGenerating] = React.useState(false);

  const updateNames = (text: string) => {
    setRaw(text);
    setNames(parseLines(text));
  };

  const generate = () => {
    if (names.length < 2) {
      toast.error("Add at least two names to split into teams.");
      return;
    }
    setGenerating(true);
    // Tiny delay so the button can show a “generating” state visually.
    window.setTimeout(() => {
      const shuffled = secureShuffle(names);
      let nTeams: number;
      if (mode === "by-count") {
        nTeams = Math.max(1, Math.min(teamCount, shuffled.length));
      } else {
        const size = Math.max(1, teamSize);
        nTeams = Math.max(1, Math.ceil(shuffled.length / size));
      }
      const out: string[][] = Array.from({ length: nTeams }, () => []);
      // Distribute round-robin for balanced team sizes.
      shuffled.forEach((name, i) => {
        out[i % nTeams]?.push(name);
      });
      setTeams(out);
      setGenerating(false);
      toast.success(
        `Split ${shuffled.length} names into ${nTeams} team${nTeams === 1 ? "" : "s"}.`
      );
    }, 80);
  };

  const reset = () => {
    setMode("by-count");
    setTeamCount(3);
    setTeamSize(4);
    setTeams([]);
  };

  const teamsText = React.useMemo(() => {
    return teams
      .map((team, i) => {
        const header = `Team ${i + 1} (${team.length})`;
        const body = team.map((n) => `  • ${n}`).join("\n");
        return `${header}\n${body}`;
      })
      .join("\n\n");
  }, [teams]);

  const toolBody = (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="tg-names">Names</Label>
            <span className="text-xs text-muted-foreground">
              {names.length} name{names.length === 1 ? "" : "s"}
            </span>
          </div>
          <Textarea
            id="tg-names"
            value={raw}
            onChange={(e) => updateNames(e.target.value)}
            placeholder={"Alice\nBob\nCarol\n…"}
            className="min-h-[220px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Enter one name per line. Blank lines are ignored.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tg-mode">Split by</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <SelectTrigger id="tg-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="by-count">Number of teams</SelectItem>
                <SelectItem value="by-size">Team size</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "by-count" ? (
            <div className="space-y-2">
              <Label htmlFor="tg-count">Number of teams</Label>
              <Input
                id="tg-count"
                type="number"
                min={1}
                max={50}
                value={teamCount}
                onChange={(e) =>
                  setTeamCount(
                    Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1))
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                {names.length > 0
                  ? `≈ ${Math.ceil(names.length / Math.max(1, teamCount))} per team`
                  : "Add names to see team sizes."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="tg-size">Team size (max)</Label>
              <Input
                id="tg-size"
                type="number"
                min={1}
                max={100}
                value={teamSize}
                onChange={(e) =>
                  setTeamSize(
                    Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1))
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                {names.length > 0
                  ? `${Math.max(1, Math.ceil(names.length / Math.max(1, teamSize)))} team${
                      Math.ceil(names.length / Math.max(1, teamSize)) === 1 ? "" : "s"
                    } will be created`
                  : "Add names to see team count."}
              </p>
            </div>
          )}

          <Button onClick={generate} className="w-full" disabled={generating}>
            <Users className="mr-1.5 h-4 w-4" />
            {generating ? "Generating…" : "Generate teams"}
          </Button>

          {teams.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={generate}
              disabled={generating}
              className="w-full"
            >
              <Shuffle className="mr-1.5 h-3.5 w-3.5" />
              Re-shuffle
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={reset} className="w-full">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset settings
          </Button>
        </div>
      </div>

      {teams.length > 0 && (
        <div className="rounded-xl border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {teams.length} team{teams.length === 1 ? "" : "s"} ·{" "}
              {names.length} name{names.length === 1 ? "" : "s"} total
            </p>
            <CopyButton value={teamsText} label="Copy teams" />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teams.map((team, i) => {
              const palette = TEAM_PALETTE[i % TEAM_PALETTE.length];
              return (
                <div
                  key={i}
                  className="overflow-hidden rounded-lg border"
                  style={{ borderColor: palette.fill + "55" }}
                >
                  <div
                    className="flex items-center justify-between px-3 py-2 text-sm font-semibold"
                    style={{ background: palette.fill, color: palette.text }}
                  >
                    <span>Team {i + 1}</span>
                    <span className="rounded-full bg-black/15 px-2 py-0.5 text-xs font-medium">
                      {team.length}
                    </span>
                  </div>
                  <ol
                    className="max-h-64 overflow-y-auto px-3 py-2"
                    style={{ background: palette.soft }}
                  >
                    {team.map((n, j) => (
                      <li
                        key={j}
                        className="flex items-center gap-2 border-b border-black/5 py-1.5 text-sm last:border-b-0 dark:border-white/10"
                      >
                        <span
                          className="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-bold"
                          style={{ background: palette.fill, color: palette.text }}
                        >
                          {j + 1}
                        </span>
                        <span className="break-words">{n}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Split a list of names into random teams. Choose the number of teams or a target team size, hit generate, and Dueneo shuffles everyone fairly into balanced groups. Re-shuffle with one click for a fresh split. Perfect for sports, classrooms and team-building activities.",
    tool: toolBody,
    howTo: [
      {
        title: "Add your names",
        description:
          "Type each name on its own line. Blank lines are ignored, so you can leave gaps for readability.",
      },
      {
        title: "Choose how to split",
        description:
          "Pick “Number of teams” to set the count and let Dueneo balance the sizes, or “Team size” to cap each group and let the count follow.",
      },
      {
        title: "Generate teams",
        description:
          "Click “Generate teams”. Names are shuffled with a Fisher–Yates algorithm and dealt out round-robin for balanced sizes.",
      },
      {
        title: "Re-shuffle or copy",
        description:
          "Hit “Re-shuffle” for another random split, or “Copy teams” to grab the full team breakdown as plain text.",
      },
    ],
    useCases: [
      "Split PE classes into fair sports teams.",
      "Assign project groups in a workshop or classroom.",
      "Randomise tables at a dinner party or networking event.",
      "Create secret-Santa-style groups for gift exchanges.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Round-robin distribution means teams differ in size by at most one person when “Number of teams” is used.</li>
        <li>Names are case-sensitive — “Alice” and “alice” count as different people.</li>
        <li>The current split is not persisted. Refreshing the page clears the teams.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is the shuffle fair?",
        a: "Yes. We use a Fisher–Yates shuffle powered by crypto.getRandomValues with rejection sampling. Every name has an equal chance of landing in any slot.",
      },
      {
        q: "Why are my teams slightly different in size?",
        a: "When the names don’t divide evenly, round-robin distribution leaves the extra names on the first few teams. The size difference is at most one person per team.",
      },
      {
        q: "Can I exclude certain people from being on the same team?",
        a: "Not directly. If you need constraints (e.g. don’t split couples), run the tool multiple times and re-shuffle until you get an acceptable split, or pre-group people into a single name line.",
      },
      {
        q: "Are my names saved anywhere?",
        a: "No. Everything stays in your browser tab. Refreshing the page resets the list and the generated teams.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
