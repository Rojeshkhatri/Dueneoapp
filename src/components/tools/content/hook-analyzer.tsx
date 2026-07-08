"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  RotateCcw,
  Anchor,
  Brain,
  HelpCircle,
  Ban,
  Sparkles,
  Eye,
  Target,
  Lightbulb,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  CURIOSITY_PHRASES,
  EMOTIONAL_TRIGGERS,
  POWER_WORDS,
  SectionLabel,
  ScoreBar,
  StatCard,
  TriggerBadge,
} from "./_content-helpers";

const SAMPLE = "Stop wasting your first 5 seconds. Nobody cares about your intro — they care about the result. Here's the 3-second hook framework MrBeast uses to keep 94% of viewers past the 30-second mark.";

interface Trigger {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  fired: boolean;
  matched?: string[];
  points: number;
}

interface Analysis {
  text: string;
  wordCount: number;
  triggers: Trigger[];
  rawScore: number;
  total: number;
  suggestions: string[];
}

const IDEAL_WORDS_MIN = 8;
const IDEAL_WORDS_MAX = 30;

function analyzeHook(raw: string): Analysis {
  const text = raw.trim();
  const wordCount = text ? text.split(/\s+/).length : 0;
  const lower = text.toLowerCase();

  const matched: Record<string, string[]> = {};

  // ── Curiosity gap — phrases like "you won't believe", "the truth about".
  const curiosityHits: string[] = [];
  for (const phrase of CURIOSITY_PHRASES) {
    const re = new RegExp(
      phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    if (re.test(lower)) curiosityHits.push(phrase);
  }
  // Ellipsis or em-dash also signals withheld information.
  const hasEllipsis = /\.\.\.|…|—|--/.test(text);
  matched.curiosity = curiosityHits;

  // ── Emotional trigger words.
  const emoHits: string[] = [];
  for (const w of EMOTIONAL_TRIGGERS) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) emoHits.push(w);
  }
  matched.emotional = emoHits;

  // ── Specificity — numbers, dollar amounts, percentages, named entities.
  const numbers = text.match(/\b\d+(\.\d+)?%?\b|\$\d[\d,]*\b/g) ?? [];
  // Capitalised words that aren't sentence starters — naive named-entity hint.
  const capsWords = text
    .split(/\s+/)
    .filter((w) => /^[A-Z][a-zA-Z]{2,}/.test(w))
    .filter((w) => !["The", "This", "Here", "Nobody", "Stop", "Don", "Mr"].includes(w));
  const specificityHits = [
    ...new Set([...numbers, ...capsWords.slice(0, 3)]),
  ];
  matched.specificity = specificityHits;

  // ── Question.
  const hasQuestion = /\?/.test(text);
  matched.question = hasQuestion ? ["?"] : [];

  // ── Negation pattern ("stop doing X", "don't do X", "never X").
  const negRe = /\b(stop|don'?t|do not|never|avoid|quit)\b/i;
  const negationHits = negRe.test(text) ? [text.match(negRe)?.[0] ?? ""] : [];
  matched.negation = negationHits;

  // ── Pattern interrupt — short imperative + contrast, or rhetorical question
  // followed by a colon/em-dash.
  const startsImperative = /^(stop|don'?t|never|avoid|imagine|picture|what if|stop scrolling|wait)/i.test(
    text,
  );
  const hasContrast = /\b(but|however|while|whereas|yet)\b/i.test(text);
  const patternInterruptHits: string[] = [];
  if (startsImperative) patternInterruptHits.push("imperative opener");
  if (hasContrast) patternInterruptHits.push("contrast word");
  if (hasEllipsis) patternInterruptHits.push("suspension (…/—)");
  matched.patternInterrupt = patternInterruptHits;

  // ── Power words (bonus).
  const powerHits: string[] = [];
  for (const w of POWER_WORDS) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) powerHits.push(w);
  }
  matched.power = powerHits;

  const triggers: Trigger[] = [
    {
      key: "curiosity",
      label: "Curiosity gap",
      description: "Hints at withheld information.",
      icon: <Eye className="h-4 w-4" />,
      fired: curiosityHits.length > 0 || hasEllipsis,
      matched: [...curiosityHits, ...(hasEllipsis ? ["suspension (…/—)"] : [])],
      points: 25,
    },
    {
      key: "emotional",
      label: "Emotional trigger",
      description: "High-arousal words (shocking, amazing, hidden).",
      icon: <Brain className="h-4 w-4" />,
      fired: emoHits.length > 0,
      matched: emoHits,
      points: 15,
    },
    {
      key: "specificity",
      label: "Specificity",
      description: "Numbers, dollar amounts, named entities.",
      icon: <Target className="h-4 w-4" />,
      fired: specificityHits.length > 0,
      matched: specificityHits,
      points: 20,
    },
    {
      key: "question",
      label: "Question",
      description: "Asks the viewer something directly.",
      icon: <HelpCircle className="h-4 w-4" />,
      fired: hasQuestion,
      matched: matched.question,
      points: 10,
    },
    {
      key: "negation",
      label: "Negation pattern",
      description: "Stop/Don't/Never + action.",
      icon: <Ban className="h-4 w-4" />,
      fired: negationHits.length > 0,
      matched: negationHits.filter(Boolean),
      points: 15,
    },
    {
      key: "patternInterrupt",
      label: "Pattern interrupt",
      description: "Imperative opener, contrast, or suspense.",
      icon: <Sparkles className="h-4 w-4" />,
      fired: patternInterruptHits.length > 0,
      matched: patternInterruptHits,
      points: 15,
    },
  ];

  // Bonus for power words (up to 5 points, applied above the 100 cap is fine
  // — we clamp to 100 below).
  const powerBonus = Math.min(5, powerHits.length);

  // Length bonus/penalty — ideal is 8–30 words for a hook.
  let lengthBonus = 0;
  if (wordCount >= IDEAL_WORDS_MIN && wordCount <= IDEAL_WORDS_MAX) {
    lengthBonus = 5;
  } else if (wordCount > 0 && wordCount < IDEAL_WORDS_MIN) {
    lengthBonus = Math.round((wordCount / IDEAL_WORDS_MIN) * 5);
  }

  const firedPoints = triggers
    .filter((t) => t.fired)
    .reduce((acc, t) => acc + t.points, 0);
  const rawScore = firedPoints + powerBonus + lengthBonus;
  const total = Math.min(100, rawScore);

  // ── Suggestions
  const suggestions: string[] = [];
  if (wordCount === 0) {
    suggestions.push("Type your hook (first 1–2 sentences) to start scoring.");
  } else {
    if (!matched.curiosity.length && !hasEllipsis) {
      suggestions.push(
        "Open a curiosity gap — try 'The truth about…', 'What they don't tell you about…', or end the first sentence with an em-dash to withhold the payoff.",
      );
    }
    if (!matched.emotional.length) {
      suggestions.push(
        "Add an emotional trigger word ('shocking', 'hidden', 'forbidden', 'devastating') to lift arousal.",
      );
    }
    if (!matched.specificity.length) {
      suggestions.push(
        "Make it specific — add a number, dollar amount or named entity. 'I lost 12kg in 30 days' beats 'I lost weight quickly'.",
      );
    }
    if (!matched.question.length) {
      suggestions.push(
        "Try a rhetorical question ('Why do 90% of channels fail in year one?') to pull the viewer in.",
      );
    }
    if (!matched.negation.length) {
      suggestions.push(
        "Negation patterns ('Stop doing X', 'Never do this') work especially well in the first 3 seconds of short-form video.",
      );
    }
    if (!matched.patternInterrupt.length) {
      suggestions.push(
        "Open with an imperative ('Imagine…', 'Picture this…', 'Stop scrolling.') to break the scroll reflex.",
      );
    }
    if (wordCount > IDEAL_WORDS_MAX) {
      suggestions.push(
        `Hook is ${wordCount} words — trim to ${IDEAL_WORDS_MAX} or fewer. Long hooks lose viewers before the payoff.`,
      );
    } else if (wordCount < IDEAL_WORDS_MIN && wordCount > 0) {
      suggestions.push(
        `Hook is only ${wordCount} word(s) — add a few more to set up the payoff. Aim for ${IDEAL_WORDS_MIN}–${IDEAL_WORDS_MAX} words.`,
      );
    }
    if (total >= 85) {
      suggestions.push("Strong hook — ship it.");
    } else if (total >= 60) {
      suggestions.push("Decent foundation — apply 1–2 suggestions to push past 85.");
    } else {
      suggestions.push("Rewrite the hook using the suggestions above before recording.");
    }
  }

  return {
    text,
    wordCount,
    triggers,
    rawScore,
    total,
    suggestions,
  };
}

export function HookAnalyzer({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState<string>(SAMPLE);
  const analysis = React.useMemo(() => analyzeHook(input), [input]);

  const firedCount = analysis.triggers.filter((t) => t.fired).length;
  const maxFired = analysis.triggers.length;

  const reset = () => {
    setInput(SAMPLE);
    toast.info("Reset to sample hook.");
  };

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Input */}
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Your hook</SectionLabel>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </button>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste the first 1–2 sentences of your video, post or email…"
            className="min-h-[180px] text-sm leading-relaxed"
            spellCheck={false}
            aria-label="Hook input"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{analysis.wordCount}</strong>{" "}
              word{analysis.wordCount === 1 ? "" : "s"} ·{" "}
              <strong className="text-foreground">{input.length}</strong> chars
            </span>
            <span>
              Ideal length: {IDEAL_WORDS_MIN}–{IDEAL_WORDS_MAX} words
            </span>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">What we look for</p>
            <ul className="mt-2 space-y-1">
              <li>
                • <strong>Curiosity gap</strong> — withheld info or suspense
                (25pts)
              </li>
              <li>• <strong>Emotional trigger</strong> — high-arousal words (15pts)</li>
              <li>
                • <strong>Specificity</strong> — numbers, $ amounts, names
                (20pts)
              </li>
              <li>• <strong>Question</strong> — direct question to the viewer (10pts)</li>
              <li>
                • <strong>Negation pattern</strong> — &quot;Stop doing X&quot;
                (15pts)
              </li>
              <li>
                • <strong>Pattern interrupt</strong> — imperative opener, contrast
                or suspense (15pts)
              </li>
              <li>• Bonus: power words (+5), ideal length (+5)</li>
            </ul>
          </div>
        </div>

        {/* Score panel */}
        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <SectionLabel>Hook score</SectionLabel>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total score</div>
                <div className="font-mono text-4xl font-bold tabular-nums text-foreground">
                  {analysis.total}
                  <span className="ml-1 text-base font-medium text-muted-foreground">
                    / 100
                  </span>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>{firedCount} of {maxFired} triggers fired</div>
                <div className="font-mono">+{analysis.rawScore - analysis.triggers.filter(t=>t.fired).reduce((a,t)=>a+t.points,0)} bonus pts</div>
              </div>
            </div>
            <div className="mt-3">
              <ScoreBar value={analysis.total} tone="auto" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Triggers fired"
              value={`${firedCount}/${maxFired}`}
              icon={<Anchor className="h-3.5 w-3.5 text-primary" />}
              tone={firedCount >= 4 ? "emerald" : firedCount >= 2 ? "amber" : "rose"}
            />
            <StatCard
              label="Hook length"
              value={`${analysis.wordCount}w`}
              icon={<Target className="h-3.5 w-3.5 text-primary" />}
              tone={
                analysis.wordCount >= IDEAL_WORDS_MIN &&
                analysis.wordCount <= IDEAL_WORDS_MAX
                  ? "emerald"
                  : "amber"
              }
              hint={`${IDEAL_WORDS_MIN}–${IDEAL_WORDS_MAX}w ideal`}
            />
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Triggers
            </div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.triggers.map((t) => (
                <TriggerBadge
                  key={t.key}
                  label={t.label}
                  fired={t.fired}
                  description={`${t.points} pts — ${t.description}`}
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-background p-3">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Suggestions
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {analysis.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Trigger breakdown */}
      {analysis.text && (
        <div className="rounded-xl border bg-card p-5">
          <SectionLabel>Trigger breakdown</SectionLabel>
          <p className="mt-1 text-xs text-muted-foreground">
            Each card shows whether the trigger fired and which specific words
            or patterns we detected.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {analysis.triggers.map((t) => (
              <div
                key={t.key}
                className={`rounded-lg border p-3 ${
                  t.fired
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <span
                      className={
                        t.fired ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      }
                    >
                      {t.icon}
                    </span>
                    {t.label}
                  </div>
                  <span
                    className={`text-xs font-mono ${
                      t.fired
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {t.fired ? `+${t.points}` : "0"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.description}
                </p>
                {t.fired && t.matched && t.matched.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.matched.map((m, i) => (
                      <span
                        key={i}
                        className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-300"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Paste the first 1–2 sentences of your video, post or email and get an instant engagement score. The analyzer checks for six proven hook triggers — curiosity gap, emotional trigger, specificity, question, negation pattern and pattern interrupt — shows which fired, and gives specific suggestions to push the score higher.",
    tool: toolBody,
    howTo: [
      {
        title: "Paste your hook",
        description:
          "Type the opening 1–2 sentences of your content. The analyzer works best on 8–30 words — the typical length of a video or email hook.",
      },
      {
        title: "Read the total score",
        description:
          "The top-right panel shows a 0–100 score with a colour bar (red < 50, amber 50–75, green > 75). Below it, see how many of the six triggers fired.",
      },
      {
        title: "Review the trigger badges",
        description:
          "Each badge shows whether a trigger fired. Click a card in the breakdown section to see exactly which words or patterns matched.",
      },
      {
        title: "Apply the suggestions",
        description:
          "The Suggestions panel lists concrete edits — add a number, open with an imperative, use the negation pattern, etc. Apply them and watch the score climb.",
      },
    ],
    useCases: [
      "Test your YouTube short hook before recording.",
      "Audit the opening line of cold email outreach.",
      "Coach a team on what makes a strong video hook.",
      "Generate variants of a hook and pick the highest-scoring one.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The score is a heuristic based on common copywriting frameworks
          (PAS, AIDA, curiosity-gap). It does not predict actual engagement —
          delivery, audience and topic matter more than any formula.
        </li>
        <li>
          The trigger word lists are English-only and not exhaustive. A
          brilliant hook that uses none of the listed words can still work —
          the score is a sanity check, not a ceiling.
        </li>
        <li>
          The named-entity detection is naive (capitalised words). It will
          miss lowercase proper nouns and over-count sentence starters; the
          list is filtered to common false positives but may still misfire.
        </li>
        <li>
          Hooks longer than ~30 words lose viewers before the payoff on most
          platforms. The length penalty rewards concision but cannot detect
          whether your specific hook is genuinely too long.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What's a 'curiosity gap'?",
        a: "A curiosity gap is when you hint at information but withhold the payoff. Phrases like 'the truth about…', 'what they don't tell you…', or ending the first sentence with an em-dash all create gaps. The viewer has to keep watching to close the gap.",
      },
      {
        q: "Why does 'stop doing X' work as a hook?",
        a: "Negation patterns ('Stop scrolling', 'Don't do this', 'Never say this') grab attention by warning the viewer about a mistake. They're especially effective in short-form video where you have ~1 second to stop the scroll.",
      },
      {
        q: "What's a pattern interrupt?",
        a: "A pattern interrupt breaks the viewer's expectation. An imperative opener ('Imagine…', 'Picture this…'), a contrast word ('but', 'however'), or suspense ('…') all interrupt the typical intro pattern and force the viewer to pay attention.",
      },
      {
        q: "My hook scored 95 but flopped — what happened?",
        a: "Scoring high here means you used the proven patterns, not that the hook will work. Delivery (voice tone, pace, eye contact), audience fit, thumbnail and topic all matter more. Use the score as a floor — a hook scoring 30 is almost certainly weak — not as a guarantee of success.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
