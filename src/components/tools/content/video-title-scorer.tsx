"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  RotateCcw,
  Trophy,
  Type,
  Hash,
  Zap,
  Brain,
  Parentheses,
  HelpCircle,
  Lightbulb,
  Target,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  POWER_WORDS,
  EMOTIONAL_TRIGGERS,
  SectionLabel,
  ScoreBar,
  StatCard,
  TriggerBadge,
} from "./_content-helpers";

interface TitleEntry {
  id: string;
  text: string;
}

const SAMPLE_TITLES: TitleEntry[] = [
  { id: "t1", text: "How I Built a $10K/Month Side Project in 90 Days (Proven Framework)" },
  { id: "t2", text: "Side Project Update" },
  { id: "t3", text: "The Secret Psychology Behind Why People Click (Shocking Truth)" },
];

const newId = () =>
  `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface Analysis {
  text: string;
  length: number;
  lengthScore: number;
  hasNumber: boolean;
  numberScore: number;
  powerWords: string[];
  powerScore: number;
  emotionalWords: string[];
  emotionalScore: number;
  hasBrackets: boolean;
  bracketScore: number;
  hasQuestion: boolean;
  questionScore: number;
  total: number;
  suggestions: string[];
}

const IDEAL_MIN = 50;
const IDEAL_MAX = 70;
const HARD_MAX = 100;

function analyzeTitle(raw: string): Analysis {
  const text = raw.trim();
  const length = text.length;
  const lower = text.toLowerCase();

  // ── Length score (ideal 50–70 chars, taper outside).
  let lengthScore: number;
  if (length === 0) lengthScore = 0;
  else if (length >= IDEAL_MIN && length <= IDEAL_MAX) lengthScore = 25;
  else if (length < IDEAL_MIN) {
    // 0→0, 50→25
    lengthScore = Math.round((length / IDEAL_MIN) * 25);
  } else if (length <= HARD_MAX) {
    // 70→25, 100→10
    lengthScore = Math.round(25 - ((length - IDEAL_MAX) / (HARD_MAX - IDEAL_MAX)) * 15);
  } else {
    // over 100 chars — diminishing
    lengthScore = Math.max(0, 10 - Math.min(10, length - HARD_MAX));
  }

  // ── Number score (any digit earns 15).
  const hasNumber = /\d/.test(text);
  const numberScore = hasNumber ? 15 : 0;

  // ── Power words (up to 25 pts, 8 per match, capped).
  const powerWords: string[] = [];
  for (const w of POWER_WORDS) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) powerWords.push(w);
  }
  const powerScore = Math.min(25, powerWords.length * 8);

  // ── Emotional triggers (up to 20 pts, 10 per match, capped).
  const emotionalWords: string[] = [];
  for (const w of EMOTIONAL_TRIGGERS) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) emotionalWords.push(w);
  }
  const emotionalScore = Math.min(20, emotionalWords.length * 10);

  // ── Brackets / parentheses (10 pts if present).
  const hasBrackets = /[\[(]/.test(text);
  const bracketScore = hasBrackets ? 10 : 0;

  // ── Question mark (5 pts).
  const hasQuestion = /\?$/.test(text.trim());
  const questionScore = hasQuestion ? 5 : 0;

  const total = Math.min(
    100,
    lengthScore + numberScore + powerScore + emotionalScore + bracketScore + questionScore,
  );

  // ── Suggestions
  const suggestions: string[] = [];
  if (length === 0) {
    suggestions.push("Type a title to start scoring.");
  } else {
    if (length < IDEAL_MIN) {
      suggestions.push(
        `Title is ${length} chars — add ${IDEAL_MIN - length} more characters to reach the 50–70 char sweet spot where YouTube truncates less.`,
      );
    } else if (length > IDEAL_MAX) {
      suggestions.push(
        `Title is ${length} chars — YouTube often truncates above 70 chars. Trim ${length - IDEAL_MAX} characters so the full title shows in search.`,
      );
    }
    if (!hasNumber) {
      suggestions.push(
        "Add a number (e.g. '7 ways', 'in 90 days', '$10K') — numbered titles consistently outperform generic ones in CTR tests.",
      );
    }
    if (powerWords.length === 0) {
      suggestions.push(
        "Use a power word like 'ultimate', 'proven', 'secret', 'complete' or 'how to' to signal value.",
      );
    }
    if (emotionalWords.length === 0) {
      suggestions.push(
        "Add an emotional trigger ('shocking', 'amazing', 'forbidden', 'hidden') to lift arousal.",
      );
    }
    if (!hasBrackets) {
      suggestions.push(
        "Append a parenthetical like '(Proven Framework)' or '[2025 Update]' — brackets catch the eye and signal extra value.",
      );
    }
    if (!hasQuestion && length < 60) {
      suggestions.push(
        "Try phrasing the title as a question ('Why do…?', 'Can you…?') to invite curiosity.",
      );
    }
    if (total >= 85) {
      suggestions.push("Strong title — minimal changes needed.");
    } else if (total >= 60) {
      suggestions.push("Decent foundation — apply 1–2 suggestions to push past 85.");
    } else {
      suggestions.push("Re-work the title using the suggestions above before publishing.");
    }
  }

  return {
    text,
    length,
    lengthScore,
    hasNumber,
    numberScore,
    powerWords,
    powerScore,
    emotionalWords,
    emotionalScore,
    hasBrackets,
    bracketScore,
    hasQuestion,
    questionScore,
    total,
    suggestions,
  };
}

export function VideoTitleScorer({ tool }: { tool: ToolDefinition }) {
  const [titles, setTitles] = React.useState<TitleEntry[]>(SAMPLE_TITLES);

  const analyses = React.useMemo(
    () => titles.map((t) => ({ ...t, analysis: analyzeTitle(t.text) })),
    [titles],
  );

  const addTitle = () =>
    setTitles((ts) => [...ts, { id: newId(), text: "" }]);
  const removeTitle = (id: string) =>
    setTitles((ts) => ts.filter((t) => t.id !== id));
  const update = (id: string, text: string) =>
    setTitles((ts) => ts.map((t) => (t.id === id ? { ...t, text } : t)));

  const reset = () => {
    setTitles(SAMPLE_TITLES);
    toast.info("Reset to sample titles.");
  };

  const sorted = React.useMemo(
    () => [...analyses].sort((a, b) => b.analysis.total - a.analysis.total),
    [analyses],
  );

  const best = sorted[0];

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Input */}
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Titles</SectionLabel>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
              <Button size="sm" onClick={addTitle}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add title
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {titles.map((t, idx) => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="w-6 flex-none text-center text-xs font-mono text-muted-foreground">
                  {idx + 1}
                </span>
                <Input
                  value={t.text}
                  onChange={(e) => update(t.id, e.target.value)}
                  placeholder="Enter a video title…"
                  className="flex-1"
                  aria-label={`Title ${idx + 1}`}
                />
                <span
                  className={`w-12 flex-none text-right font-mono text-xs ${
                    t.text.length > HARD_MAX
                      ? "text-destructive"
                      : t.text.length > IDEAL_MAX
                        ? "text-amber-500"
                        : "text-muted-foreground"
                  }`}
                >
                  {t.text.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-none text-muted-foreground hover:text-destructive"
                  onClick={() => removeTitle(t.id)}
                  aria-label={`Remove title ${idx + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {titles.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Click <strong>Add title</strong> to start.
              </p>
            )}
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Scoring rubric (0–100)</p>
            <ul className="mt-2 space-y-1">
              <li>• Length 50–70 chars → up to 25 pts (tapers outside)</li>
              <li>• Contains a number → 15pts</li>
              <li>• Power words → up to 25pts (8/match)</li>
              <li>• Emotional triggers → up to 20pts (10/match)</li>
              <li>• Brackets / parentheses → 10pts</li>
              <li>• Question mark → 5pts</li>
            </ul>
          </div>
        </div>

        {/* Best title + comparison */}
        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" /> Top-ranked title
            </span>
          </SectionLabel>
          {best && best.text ? (
            <>
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
                <div className="text-xs text-muted-foreground">
                  Score {best.analysis.total}/100
                </div>
                <div className="mt-1 text-base font-semibold leading-snug">
                  {best.text}
                </div>
                <div className="mt-3">
                  <ScoreBar value={best.analysis.total} tone="auto" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <StatCard
                  label="Length"
                  value={best.analysis.length}
                  hint={`${best.analysis.lengthScore}/25 pts`}
                  icon={<Type className="h-3.5 w-3.5 text-primary" />}
                />
                <StatCard
                  label="Power words"
                  value={best.analysis.powerWords.length}
                  hint={`${best.analysis.powerScore}/25 pts`}
                  icon={<Zap className="h-3.5 w-3.5 text-primary" />}
                />
                <StatCard
                  label="Emotional"
                  value={best.analysis.emotionalWords.length}
                  hint={`${best.analysis.emotionalScore}/20 pts`}
                  icon={<Brain className="h-3.5 w-3.5 text-primary" />}
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <TriggerBadge
                  label="Number"
                  fired={best.analysis.hasNumber}
                  description={`${best.analysis.numberScore}/15 pts`}
                />
                <TriggerBadge
                  label="Brackets"
                  fired={best.analysis.hasBrackets}
                  description={`${best.analysis.bracketScore}/10 pts`}
                />
                <TriggerBadge
                  label="Question"
                  fired={best.analysis.hasQuestion}
                  description={`${best.analysis.questionScore}/5 pts`}
                />
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Add at least one title to see scoring.
            </p>
          )}
        </div>
      </div>

      {/* Per-title breakdown */}
      {analyses.some((a) => a.text) && (
        <div className="rounded-xl border bg-card p-5">
          <SectionLabel>Per-title breakdown</SectionLabel>
          <div className="mt-3 space-y-3">
            {analyses.map((a, idx) => (
              <details
                key={a.id}
                open={a.analysis.total >= 60 && a.text !== ""}
                className="rounded-lg border bg-background"
              >
                <summary className="flex cursor-pointer items-center gap-3 p-3 text-sm">
                  <span className="w-6 flex-none text-center font-mono text-xs text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium leading-snug line-clamp-2">
                      {a.text || <span className="text-muted-foreground">(empty)</span>}
                    </div>
                  </div>
                  <div className="w-28 flex-none">
                    <ScoreBar value={a.analysis.total} tone="auto" />
                  </div>
                  <span className="w-10 flex-none text-right font-mono text-sm font-bold tabular-nums">
                    {a.analysis.total}
                  </span>
                </summary>
                <div className="space-y-3 border-t bg-muted/30 p-3 text-xs">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <MiniStat
                      icon={<Type className="h-3.5 w-3.5" />}
                      label="Length"
                      value={`${a.analysis.length} chars`}
                      score={`${a.analysis.lengthScore}/25`}
                    />
                    <MiniStat
                      icon={<Hash className="h-3.5 w-3.5" />}
                      label="Number"
                      value={a.analysis.hasNumber ? "Yes" : "No"}
                      score={`${a.analysis.numberScore}/15`}
                    />
                    <MiniStat
                      icon={<Zap className="h-3.5 w-3.5" />}
                      label="Power words"
                      value={
                        a.analysis.powerWords.length
                          ? a.analysis.powerWords.join(", ")
                          : "—"
                      }
                      score={`${a.analysis.powerScore}/25`}
                    />
                    <MiniStat
                      icon={<Brain className="h-3.5 w-3.5" />}
                      label="Emotional"
                      value={
                        a.analysis.emotionalWords.length
                          ? a.analysis.emotionalWords.join(", ")
                          : "—"
                      }
                      score={`${a.analysis.emotionalScore}/20`}
                    />
                    <MiniStat
                      icon={<Parentheses className="h-3.5 w-3.5" />}
                      label="Brackets"
                      value={a.analysis.hasBrackets ? "Yes" : "No"}
                      score={`${a.analysis.bracketScore}/10`}
                    />
                    <MiniStat
                      icon={<HelpCircle className="h-3.5 w-3.5" />}
                      label="Question"
                      value={a.analysis.hasQuestion ? "Yes" : "No"}
                      score={`${a.analysis.questionScore}/5`}
                    />
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                      Suggestions
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                      {a.analysis.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Comparison summary */}
      {analyses.filter((a) => a.text).length >= 2 && (
        <div className="rounded-xl border bg-muted/30 p-5">
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" /> Comparison
            </span>
          </SectionLabel>
          <div className="mt-3 space-y-2">
            {sorted
              .filter((a) => a.text)
              .map((a, rank) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 rounded-md border p-2 text-sm ${
                    rank === 0
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "bg-background"
                  }`}
                >
                  <span className="w-6 flex-none text-center font-mono text-xs text-muted-foreground">
                    #{rank + 1}
                  </span>
                  <span className="flex-1 truncate">{a.text}</span>
                  <div className="w-32 flex-none">
                    <ScoreBar value={a.analysis.total} tone="auto" />
                  </div>
                  <span className="w-10 flex-none text-right font-mono text-sm font-bold tabular-nums">
                    {a.analysis.total}
                  </span>
                  {rank === 0 && (
                    <CopyButton
                      value={a.text}
                      size="icon"
                      variant="ghost"
                    />
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Score your video titles on a 0–100 scale based on length (50–70 chars is ideal), presence of a number, power words, emotional triggers, brackets/parentheses and question marks. Compare multiple titles side by side, see which one wins, and get specific suggestions to push each title higher.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter one or more titles",
        description:
          "Type each title into its own row. Click Add title to add more. The character counter turns amber above 70 and red above 100.",
      },
      {
        title: "Read the top-ranked card",
        description:
          "The Top-ranked title card shows your highest-scoring title with its score, length, power-word count, and a breakdown of which triggers fired.",
      },
      {
        title: "Expand a title for the full breakdown",
        description:
          "Click any title row to expand a per-criterion breakdown with scores and detected words.",
      },
      {
        title: "Apply the suggestions",
        description:
          "Each title's Suggestions panel lists concrete edits — add a number, use a power word, trim length, etc. Apply them and watch the score climb.",
      },
    ],
    useCases: [
      "A/B test title variants before recording your thumbnail.",
      "Audit a backlog of old titles to spot low-CTR patterns.",
      "Coach a team member on what makes a clickable YouTube title.",
      "Brainstorm titles by scoring 5–10 variants and picking the top one.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The score is a heuristic based on common CTR best practices — it does
          not predict your actual click-through rate. Topic, thumbnail and
          audience matter more than any title formula.
        </li>
        <li>
          The ideal-length band (50–70 chars) matches YouTube&apos;s search-result
          truncation, not the mobile feed (which truncates earlier at ~40–50
          chars). Test your title in a real search preview before publishing.
        </li>
        <li>
          The power-word and emotional-trigger lists are English-only and not
          exhaustive. Add your own words to your title — the score won&apos;t
          catch every effective word.
        </li>
        <li>
          Clickbait-y titles (heavy on emotional triggers, low on substance)
          score well here but may hurt watch time and reputation. Use the score
          as a ceiling check, not a target.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What's the ideal title length?",
        a: "50–70 characters. Below 50, YouTube's algorithm has less context to recommend the video. Above 70, the title gets truncated in search results and on most mobile feeds. The 50–70 band is where you fit enough context without truncation.",
      },
      {
        q: "Why do numbers help?",
        a: "Numbers (especially specific ones like '7 ways', 'in 90 days', '$10K') signal concrete value and set expectations. They also stand out visually against a sea of word-only titles. Listicles and case studies consistently outperform generic titles in CTR tests.",
      },
      {
        q: "What are power words?",
        a: "Words that signal authority or instructional promise: 'ultimate', 'proven', 'secret', 'how to', 'complete', 'definitive', 'guide', 'step by step'. They tell the viewer exactly what they'll get — a complete answer, not a teaser.",
      },
      {
        q: "Why do brackets help?",
        a: "Brackets and parentheses like '(Proven Framework)' or '[2025 Update]' stand out visually and signal extra value (a framework, an update, a case study). They also let you add context that wouldn't fit grammatically in the main title.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function MiniStat({
  icon,
  label,
  value,
  score,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  score: string;
}) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-medium">{value}</div>
      <div className="text-[10px] font-mono text-muted-foreground">{score}</div>
    </div>
  );
}
