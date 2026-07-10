"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw, Target, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { uid, parseNumber, formatNumber, EDU_DISCLAIMER } from "./_edu-helpers";

interface Component {
  id: string;
  name: string;
  score: string; // % achieved in this component
  weight: string; // % of final grade
}

export function GradePredictor({ tool }: { tool: ToolDefinition }) {
  const [target, setTarget] = React.useState<string>("85");
  const [finalWeight, setFinalWeight] = React.useState<string>("40");
  const [components, setComponents] = React.useState<Component[]>([
    { id: uid(), name: "Homework", score: "92", weight: "20" },
    { id: uid(), name: "Midterm", score: "78", weight: "40" },
  ]);

  const targetNum = parseNumber(target);
  const finalWeightNum = Math.max(0, Math.min(100, parseNumber(finalWeight)));
  const componentsWeight = components.reduce((n, c) => n + Math.max(0, parseNumber(c.weight)), 0);

  const earnedWeight = components.reduce((n, c) => {
    const score = parseNumber(c.score);
    const w = parseNumber(c.weight);
    return n + (score * w) / 100;
  }, 0);
  const earnedPctOfFinal = componentsWeight > 0 ? earnedWeight : 0;

  const totalWeightSoFar = componentsWeight;
  const remainingWeight = Math.max(0, 100 - totalWeightSoFar);
  // Use the explicit final-exam weight if specified; otherwise fall back to remaining weight.
  const finalExamWeight = finalWeightNum > 0 ? finalWeightNum : remainingWeight;

  // Required final-exam score:
  // target = earnedPctOfFinal + (finalExamScore/100) * finalExamWeight
  // finalExamScore = (target - earnedPctOfFinal) * 100 / finalExamWeight
  const requiredFinal = finalExamWeight > 0 ? ((targetNum - earnedPctOfFinal) * 100) / finalExamWeight : 0;

  const feasible = requiredFinal <= 100;
  const stillPossible = requiredFinal <= 100 && requiredFinal >= 0;
  const guaranteed = requiredFinal <= 0;

  // Projected grade if final = current performance average
  const avgSoFar = totalWeightSoFar > 0 ? earnedPctOfFinal / (totalWeightSoFar / 100) : 0;
  const projectedIfSame = earnedPctOfFinal + (avgSoFar / 100) * finalExamWeight;

  const add = () => setComponents((p) => [...p, { id: uid(), name: "", score: "", weight: "" }]);
  const update = (id: string, patch: Partial<Component>) =>
    setComponents((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (id: string) => setComponents((p) => p.filter((c) => c.id !== id));

  const reset = () => {
    setComponents([]);
    setTarget("85");
    setFinalWeight("40");
    toast.info("Reset.");
  };

  const totalW = componentsWeight + finalExamWeight;
  const weightWarning = Math.abs(totalW - 100) > 0.5 && totalW > 0;

  const content: ToolContent = {
    intro:
      "See exactly what you need on the final exam to hit your target grade. Enter your current grade components (with their weights), your target percentage and the final-exam weight — the predictor tells you the score you need, whether it's feasible, and your projected grade if you perform at your current average.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Grade components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-[1fr_80px_80px_32px] gap-2 text-xs font-medium text-muted-foreground">
                <span>Name</span>
                <span className="text-right">Score %</span>
                <span className="text-right">Weight %</span>
                <span />
              </div>
              {components.map((c, i) => (
                <div key={c.id} className="grid grid-cols-[1fr_80px_80px_32px] items-center gap-2">
                  <Input
                    value={c.name}
                    onChange={(e) => update(c.id, { name: e.target.value })}
                    placeholder={`Component ${i + 1}`}
                    className="h-8"
                  />
                  <Input
                    inputMode="decimal"
                    value={c.score}
                    onChange={(e) => update(c.id, { score: e.target.value })}
                    placeholder="0"
                    className="h-8 text-right"
                  />
                  <Input
                    inputMode="decimal"
                    value={c.weight}
                    onChange={(e) => update(c.id, { weight: e.target.value })}
                    placeholder="0"
                    className="h-8 text-right"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(c.id)} aria-label="Remove">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={add}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add component
              </Button>
              <div className="mt-2 grid grid-cols-[1fr_80px_80px_32px] gap-2 border-t pt-2 text-xs">
                <span className="text-muted-foreground">Totals so far</span>
                <span className="text-right font-mono">{formatNumber(avgSoFar, { digits: 1 })}%</span>
                <span className="text-right font-mono">{formatNumber(componentsWeight, { digits: 1 })}%</span>
                <span />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Target & final exam</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="gp-target">Target final grade (%)</Label>
                <Input id="gp-target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="85" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gp-final-weight">Final exam weight (%)</Label>
                <Input id="gp-final-weight" inputMode="decimal" value={finalWeight} onChange={(e) => setFinalWeight(e.target.value)} placeholder="40" />
              </div>
              {weightWarning && (
                <div className="rounded-md border border-amber-300/60 bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  Component weights + final = {formatNumber(totalW, { digits: 1 })}%, not 100%. Check your syllabus for the correct weights.
                </div>
              )}
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-primary" /> Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Current weighted grade" value={`${formatNumber(earnedPctOfFinal, { digits: 1 })}%`} sub={`from ${formatNumber(totalWeightSoFar, { digits: 1 })}% of total weight`} icon={<TrendingUp className="h-4 w-4" />} />
              <Stat label="Required on final exam" value={`${formatNumber(requiredFinal, { digits: 1 })}%`} sub={`on a ${formatNumber(finalExamWeight, { digits: 1 })}% final`} icon={<Target className="h-4 w-4" />} highlight={stillPossible ? "amber" : "rose"} />
              <Stat label="Projected if same average" value={`${formatNumber(projectedIfSame, { digits: 1 })}%`} sub={`at current ${formatNumber(avgSoFar, { digits: 1 })}% avg`} icon={<TrendingUp className="h-4 w-4" />} />
            </div>

            {guaranteed ? (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-300/60 bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" />
                <div>
                  <p className="font-semibold">Target already met — even 0% on the final keeps you at {formatNumber(targetNum, { digits: 1 })}%.</p>
                  <p className="mt-1 text-xs">Your current weighted grade of {formatNumber(earnedPctOfFinal, { digits: 1 })}% already meets the {formatNumber(targetNum, { digits: 1 })}% target.</p>
                </div>
              </div>
            ) : !feasible ? (
              <div className="flex items-start gap-3 rounded-lg border border-rose-300/60 bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
                <div>
                  <p className="font-semibold">Out of reach — you'd need {formatNumber(requiredFinal, { digits: 1 })}% on the final.</p>
                  <p className="mt-1 text-xs">That's above 100%, which isn't possible. Consider asking for extra credit, scaling your target down, or improving earlier components if re-submission is allowed.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <Target className="mt-0.5 h-5 w-5 flex-none" />
                <div>
                  <p className="font-semibold">You need {formatNumber(requiredFinal, { digits: 1 })}% on the final exam to finish at {formatNumber(targetNum, { digits: 1 })}%.</p>
                  <p className="mt-1 text-xs">That's {requiredFinal > avgSoFar ? "above" : "below"} your current average of {formatNumber(avgSoFar, { digits: 1 })}% — {requiredFinal > avgSoFar ? "you'll need to step up" : "you're on track"}.</p>
                </div>
              </div>
            )}

            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">How it's calculated:</strong>{" "}
              Final = (Σ component score × weight) + (final-exam score × final weight). Solve for the final-exam score that produces your target.
            </div>
          </CardContent>
        </Card>
      </div>
    ),
    howTo: [
      {
        title: "List your grade components",
        description: "Add each component (homework, midterm, quizzes…) with the percentage you achieved and its weight in the final grade.",
      },
      {
        title: "Set your target and final weight",
        description: "Enter the final grade you want (e.g. 85%) and how much the final exam is worth (e.g. 40%).",
      },
      {
        title: "Read the result",
        description: "The tool shows the score you need on the final, whether it's feasible (≤100%), and your projected grade if you perform at your current average.",
      },
    ],
    useCases: [
      "Decide whether to push hard on the final or accept a lower grade.",
      "See if an A is still possible after a disappointing midterm.",
      "Work out the minimum score you need to keep a scholarship or pass.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{EDU_DISCLAIMER}</li>
        <li>The model assumes a simple weighted average — it doesn't handle dropped-lowest, curves, or extra credit. Add those manually if your course uses them.</li>
        <li>If your component weights don't sum with the final to 100%, a warning appears but the calculation still runs using the entered weights.</li>
      </ul>
    ),
    faq: [
      {
        q: "What does 'required on final exam' mean if it's over 100%?",
        a: "It means the target is mathematically out of reach — there's no score you can get on the final (assuming 100 is the max) that lifts your overall grade to the target. Look at extra credit, re-submissions or scaling your target down.",
      },
      {
        q: "What if my final exam replaces a lower midterm score?",
        a: "This calculator doesn't model replacement policies. Run the calculation twice — once with the original midterm, once with the final replacing it — and use the more favourable result.",
      },
      {
        q: "My weights don't add up to 100%. Should I worry?",
        a: "A warning will show. Some courses have weights that total less than 100% (the rest is participation or extra credit). The calculation still uses the weights you entered — just make sure they match your syllabus.",
      },
      {
        q: "Is this saved between visits?",
        a: "No — grade components live only in the current tab. Refresh the page to reset (or click Reset). Nothing is uploaded.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Stat({
  label,
  value,
  sub,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  highlight?: "amber" | "rose" | "emerald";
}) {
  const highlightColor =
    highlight === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : highlight === "rose"
        ? "text-rose-600 dark:text-rose-400"
        : highlight === "emerald"
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-foreground";
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${highlightColor}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
