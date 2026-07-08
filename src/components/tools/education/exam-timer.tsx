"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Bell } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { EDU_DISCLAIMER } from "./_edu-helpers";

function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function playChime(): void {
  try {
    const AudioCtx =
      typeof window !== "undefined"
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    // Three ascending tones for an unmissable end-of-exam chime.
    const notes = [660, 880, 1320];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.25;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
    // Close context after the chime finishes.
    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        // ignore
      }
    }, 1200);
  } catch {
    // Audio API not available — silently ignore.
  }
}

export function ExamTimer({ tool }: { tool: ToolDefinition }) {
  const [durationMin, setDurationMin] = React.useState<string>("180");
  const [numQuestions, setNumQuestions] = React.useState<string>("60");
  const [allocatePerQ, setAllocatePerQ] = React.useState<boolean>(true);

  const [running, setRunning] = React.useState<boolean>(false);
  const [remaining, setRemaining] = React.useState<number>(0);
  const [currentQ, setCurrentQ] = React.useState<number>(1);
  const [finished, setFinished] = React.useState<boolean>(false);

  const durationSec = Math.max(0, Math.round(parseFloat(durationMin || "0") * 60));
  const qNum = Math.max(1, Math.round(parseInt(numQuestions || "1", 10)));
  const perQSec = durationSec > 0 ? durationSec / qNum : 0;

  // Initialise the timer when duration changes & not running.
  React.useEffect(() => {
    if (!running) {
      setRemaining(durationSec);
      setCurrentQ(1);
      setFinished(false);
    }
  }, [durationSec, running]);

  // Tick loop.
  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id);
          setRunning(false);
          setFinished(true);
          playChime();
          toast.error("Time's up!", { description: "Pencils down." });
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const start = () => {
    if (durationSec <= 0) {
      toast.error("Set an exam duration first.");
      return;
    }
    if (finished) {
      setRemaining(durationSec);
      setCurrentQ(1);
      setFinished(false);
    }
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setRemaining(durationSec);
    setCurrentQ(1);
    setFinished(false);
  };
  const goPrev = () => setCurrentQ((q) => Math.max(1, q - 1));
  const goNext = () => setCurrentQ((q) => Math.min(qNum, q + 1));

  const pctLeft = durationSec > 0 ? (remaining / durationSec) * 100 : 0;
  const level: "ok" | "warn" | "danger" =
    pctLeft < 10 ? "danger" : pctLeft < 25 ? "warn" : "ok";
  const levelColor =
    level === "danger"
      ? "text-rose-600 dark:text-rose-400"
      : level === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground";
  const ringColor =
    level === "danger"
      ? "border-rose-400 bg-rose-50 dark:bg-rose-950/20"
      : level === "warn"
        ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
        : "border-border bg-card";

  // Time used per question so far & expected remaining for current question.
  const elapsed = durationSec - remaining;
  const expectedPerQ = allocatePerQ ? perQSec : 0;
  const expectedQElapsed = currentQ * expectedPerQ;
  const qDelta = expectedPerQ > 0 ? elapsed - expectedQElapsed : 0;

  const content: ToolContent = {
    intro:
      "Run a visible exam-style timer with per-question pacing. Enter the duration and number of questions, then start the clock — the big countdown turns amber under 25% remaining and red under 10%, with a three-note chime at the end. Tick through questions to see whether you're ahead or behind pace.",
    tool: (
      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Exam setup</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="et-dur">Duration (minutes)</Label>
              <Input id="et-dur" inputMode="numeric" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} disabled={running} placeholder="180" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="et-q">Number of questions</Label>
              <Input id="et-q" inputMode="numeric" value={numQuestions} onChange={(e) => setNumQuestions(e.target.value)} disabled={running} placeholder="60" />
            </div>
            <div className="space-y-2">
              <Label>Per-question pacing</Label>
              <Button
                type="button"
                variant={allocatePerQ ? "default" : "outline"}
                className="w-full"
                onClick={() => setAllocatePerQ((v) => !v)}
                disabled={running}
              >
                {allocatePerQ ? "On" : "Off"}
              </Button>
              <p className="text-xs text-muted-foreground">Even split across all questions.</p>
            </div>
          </CardContent>
        </Card>

        <Card className={ringColor}>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Bell className="h-3.5 w-3.5" />
                {finished ? "Exam finished" : running ? "Time remaining" : "Ready"}
              </div>
              <p className={`mt-2 font-mono text-6xl font-bold tabular-nums sm:text-7xl ${levelColor}`}>
                {fmtTime(remaining)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {pctLeft.toFixed(0)}% of {fmtTime(durationSec)} remaining
              </p>

              <div className="mt-4 h-2 w-full max-w-md overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${
                    level === "danger" ? "bg-rose-500" : level === "warn" ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${pctLeft}%` }}
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {!running ? (
                  <Button onClick={start} size="lg">
                    <Play className="mr-1.5 h-4 w-4" /> {finished ? "Restart" : "Start"}
                  </Button>
                ) : (
                  <Button onClick={pause} size="lg" variant="secondary">
                    <Pause className="mr-1.5 h-4 w-4" /> Pause
                  </Button>
                )}
                <Button onClick={reset} size="lg" variant="outline">
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {allocatePerQ && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Question pacing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Time per question" value={fmtTime(perQSec)} />
                <Stat label="Current question" value={`${currentQ} / ${qNum}`} />
                <Stat
                  label="Pace vs plan"
                  value={qDelta === 0 ? "On track" : qDelta > 0 ? `+${fmtTime(qDelta)} behind` : `-${fmtTime(Math.abs(qDelta))} ahead`}
                  highlight={qDelta > 0 ? "warn" : qDelta < 0 ? "good" : undefined}
                />
              </div>

              <div className="flex items-center justify-center gap-3">
                <Button onClick={goPrev} disabled={currentQ === 1} variant="outline">
                  <ChevronLeft className="mr-1.5 h-4 w-4" /> Prev
                </Button>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  Q {currentQ} of {qNum}
                </Badge>
                <Button onClick={goNext} disabled={currentQ === qNum} variant="outline">
                  Next <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                You should spend roughly {fmtTime(perQSec)} per question. Use Prev / Next to track which question you're on.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Set duration and question count",
        description: "Enter the total exam time in minutes and how many questions there are. Toggle per-question pacing on to get an even split.",
      },
      {
        title: "Start the timer",
        description: "Click Start. The big countdown shows time remaining, with a progress bar that turns amber under 25% and red under 10%.",
      },
      {
        title: "Track question pace",
        description: "Use Prev / Next to mark which question you're on. The 'Pace vs plan' stat shows whether you're ahead or behind the even split.",
      },
      {
        title: "Hear the end chime",
        description: "When the timer reaches zero, a three-note chime plays and a toast appears. Reset to start a new exam.",
      },
    ],
    useCases: [
      "Practice pacing yourself under real exam conditions at home.",
      "Run a mock timed essay or test in class with a visible clock.",
      "Invigilate a class test with a clear countdown for students.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{EDU_DISCLAIMER}</li>
        <li>The chime uses the Web Audio API — most browsers require a user gesture before audio plays. Click Start (a gesture) and audio will work from then on.</li>
        <li>Per-question pacing splits time evenly. For exams with mixed question weights (e.g. essay vs MCQ), use the per-question time as a guide, not a rule.</li>
        <li>The timer keeps running while the tab is in the foreground. Background tabs may be throttled by the browser; check the on-screen time when you return.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why doesn't the chime play?",
        a: "Browsers block autoplay audio until you interact with the page. Click any button (Start, Prev, Next) before the timer ends and the chime will play normally. Muted devices will still see the on-screen 'Time's up' toast.",
      },
      {
        q: "What happens if I close the tab?",
        a: "The timer stops. There is no background persistence — this is a foreground-only study aid. For an unattended classroom clock, keep the tab open and the screen on.",
      },
      {
        q: "Can I pause the exam?",
        a: "Yes — click Pause. The clock freezes and Start resumes from where it left off. Reset returns to the full duration.",
      },
      {
        q: "How is per-question time calculated?",
        a: "Total duration ÷ number of questions. The 'Pace vs plan' stat compares your elapsed time to (current question × per-question time) so you can see at a glance if you're falling behind.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "good" | "warn";
}) {
  const color =
    highlight === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : highlight === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground";
  return (
    <div className="rounded-lg border bg-muted/30 p-4 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-lg font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
