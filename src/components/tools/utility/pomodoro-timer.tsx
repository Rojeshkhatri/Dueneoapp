"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Play, Pause, RotateCcw, SkipForward, Bell, Coffee, Brain } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

type Mode = "work" | "break" | "longBreak";

const DEFAULTS = {
  work: 25,
  break: 5,
  longBreak: 15,
  longBreakEvery: 4,
};

function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

/**
 * Play a short beep using the Web Audio API. Falls back to a no-op if
 * AudioContext is unavailable (older browsers, autoplay restrictions).
 */
function playBeep(durationMs = 600, frequency = 880): void {
  try {
    const AudioCtx =
      typeof window !== "undefined"
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        : undefined;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
    // Two-tone chime: play a higher note 200ms later.
    if (durationMs >= 400) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.value = frequency * 1.5;
      const start2 = ctx.currentTime + 0.22;
      gain2.gain.setValueAtTime(0.0001, start2);
      gain2.gain.exponentialRampToValueAtTime(0.22, start2 + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.0001, start2 + (durationMs - 200) / 1000);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(start2);
      osc2.stop(start2 + (durationMs - 200) / 1000);
    }
    // Close context after the sound finishes to free resources.
    osc.onended = () => {
      try {
        ctx.close();
      } catch {
        // ignore
      }
    };
  } catch {
    // Audio API not available — silently ignore.
  }
}

export function PomodoroTimer({ tool }: { tool: ToolDefinition }) {
  const [workMin, setWorkMin] = React.useState<string>(String(DEFAULTS.work));
  const [breakMin, setBreakMin] = React.useState<string>(String(DEFAULTS.break));
  const [longBreakMin, setLongBreakMin] = React.useState<string>(String(DEFAULTS.longBreak));
  const [longBreakEvery, setLongBreakEvery] = React.useState<string>(String(DEFAULTS.longBreakEvery));

  const workSecs = Math.max(1, Math.floor(parseFloat(workMin) || 0)) * 60;
  const breakSecs = Math.max(1, Math.floor(parseFloat(breakMin) || 0)) * 60;
  const longBreakSecs = Math.max(1, Math.floor(parseFloat(longBreakMin) || 0)) * 60;
  const longBreakEveryN = Math.max(1, Math.floor(parseFloat(longBreakEvery) || 1));

  const [mode, setMode] = React.useState<Mode>("work");
  const [remaining, setRemaining] = React.useState<number>(workSecs);
  const [running, setRunning] = React.useState<boolean>(false);
  const [completedPomodoros, setCompletedPomodoros] = React.useState<number>(0);
  const [soundOn, setSoundOn] = React.useState<boolean>(true);

  // Reset remaining whenever the corresponding duration changes & we're not running.
  React.useEffect(() => {
    if (running) return;
    if (mode === "work") setRemaining(workSecs);
  }, [workSecs, mode, running]);

  React.useEffect(() => {
    if (running) return;
    if (mode === "break") setRemaining(breakSecs);
  }, [breakSecs, mode, running]);

  React.useEffect(() => {
    if (running) return;
    if (mode === "longBreak") setRemaining(longBreakSecs);
  }, [longBreakSecs, mode, running]);

  // Tick every second while running.
  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          // Phase complete.
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Handle phase completion.
  React.useEffect(() => {
    if (remaining !== 0 || !running) return;
    // Stop the timer; the user can start the next phase manually.
    setRunning(false);
    if (soundOn) playBeep(700, mode === "work" ? 660 : 990);
    if (mode === "work") {
      const newCount = completedPomodoros + 1;
      setCompletedPomodoros(newCount);
      // Auto-switch to the appropriate break.
      if (newCount % longBreakEveryN === 0) {
        setMode("longBreak");
        setRemaining(longBreakSecs);
        toast.success("Pomodoro complete! Time for a long break.");
      } else {
        setMode("break");
        setRemaining(breakSecs);
        toast.success("Pomodoro complete! Time for a short break.");
      }
    } else {
      setMode("work");
      setRemaining(workSecs);
      toast.info("Break over — back to work!");
    }
  }, [remaining, running, mode, soundOn, completedPomodoros, longBreakEveryN, longBreakSecs, breakSecs, workSecs]);

  const start = () => {
    if (remaining <= 0) {
      // Reset to current mode's full duration.
      setRemaining(mode === "work" ? workSecs : mode === "break" ? breakSecs : longBreakSecs);
    }
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setMode("work");
    setRemaining(workSecs);
  };
  const skip = () => {
    setRunning(false);
    setRemaining(0);
    // Trigger the completion handler by faking it.
    if (mode === "work") {
      const newCount = completedPomodoros + 1;
      setCompletedPomodoros(newCount);
      if (newCount % longBreakEveryN === 0) {
        setMode("longBreak");
        setRemaining(longBreakSecs);
      } else {
        setMode("break");
        setRemaining(breakSecs);
      }
    } else {
      setMode("work");
      setRemaining(workSecs);
    }
  };

  const resetCount = () => {
    setCompletedPomodoros(0);
    toast.info("Pomodoro count reset.");
  };

  const totalForMode =
    mode === "work" ? workSecs : mode === "break" ? breakSecs : longBreakSecs;
  const progress = totalForMode > 0 ? 1 - remaining / totalForMode : 0;
  const circumference = 2 * Math.PI * 120; // r=120

  const modeLabel = mode === "work" ? "Focus" : mode === "break" ? "Short break" : "Long break";
  const modeColor =
    mode === "work"
      ? "text-rose-600 dark:text-rose-400"
      : "text-emerald-600 dark:text-emerald-400";
  const modeStroke =
    mode === "work"
      ? "#e11d48" // rose-600
      : "#10b981"; // emerald-500
  const modeBg =
    mode === "work"
      ? "bg-rose-50 dark:bg-rose-950/30"
      : "bg-emerald-50 dark:bg-emerald-950/30";

  const summary = `Pomodoro: ${completedPomodoros} completed · ${modeLabel} · ${fmtTime(
    remaining
  )} remaining${running ? " (running)" : " (paused)"}.`;

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Settings</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pomo-work">Focus (minutes)</Label>
              <Input
                id="pomo-work"
                inputMode="numeric"
                value={workMin}
                onChange={(e) => setWorkMin(e.target.value)}
                disabled={running}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pomo-break">Short break (minutes)</Label>
              <Input
                id="pomo-break"
                inputMode="numeric"
                value={breakMin}
                onChange={(e) => setBreakMin(e.target.value)}
                disabled={running}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pomo-long">Long break (minutes)</Label>
              <Input
                id="pomo-long"
                inputMode="numeric"
                value={longBreakMin}
                onChange={(e) => setLongBreakMin(e.target.value)}
                disabled={running}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pomo-every">Long break every</Label>
              <Input
                id="pomo-every"
                inputMode="numeric"
                value={longBreakEvery}
                onChange={(e) => setLongBreakEvery(e.target.value)}
                disabled={running}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Classic Pomodoro is 25 min focus + 5 min break, with a 15 min long break every 4
            pomodoros. Adjust to your own rhythm — settings lock while the timer is running.
          </p>

          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset timer
          </Button>
        </div>

        <div className={`space-y-4 rounded-xl border bg-muted/30 p-5 ${modeBg}`}>
          <div className="flex items-center justify-between">
            <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${modeColor}`}>
              {mode === "work" ? (
                <>
                  <Brain className="h-3.5 w-3.5" /> {modeLabel}
                </>
              ) : (
                <>
                  <Coffee className="h-3.5 w-3.5" /> {modeLabel}
                </>
              )}
            </div>
            <Button
              size="sm"
              variant={soundOn ? "default" : "outline"}
              onClick={() => setSoundOn((v) => !v)}
              aria-label={soundOn ? "Mute completion sound" : "Unmute completion sound"}
            >
              <Bell className="mr-1.5 h-3.5 w-3.5" />
              {soundOn ? "Sound on" : "Muted"}
            </Button>
          </div>

          {/* Circular timer */}
          <div className="relative mx-auto flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 256 256" aria-hidden="true">
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.15}
                strokeWidth="12"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke={modeStroke}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`font-mono text-6xl font-black tabular-nums sm:text-7xl ${modeColor}`}>
                {fmtTime(remaining)}
              </div>
              <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                {modeLabel}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {!running ? (
              <Button size="lg" onClick={start}>
                <Play className="mr-1.5 h-4 w-4" /> Start
              </Button>
            ) : (
              <Button size="lg" onClick={pause}>
                <Pause className="mr-1.5 h-4 w-4" /> Pause
              </Button>
            )}
            <Button size="lg" variant="outline" onClick={skip}>
              <SkipForward className="mr-1.5 h-4 w-4" /> Skip
            </Button>
            <Button size="lg" variant="ghost" onClick={reset}>
              <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
            <div>
              <div className="text-xs text-muted-foreground">Pomodoros completed</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {completedPomodoros}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CopyButton value={summary} size="sm" />
              <Button size="sm" variant="ghost" onClick={resetCount}>
                Reset count
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Tip:</span> keep this tab in the
          foreground for the most accurate ticking. When a phase ends, a soft two-tone chime
          plays (toggle the bell to mute) and the timer auto-advances to the next phase — just
          press Start to begin it.
        </p>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Run focus sessions with the Pomodoro Technique: 25 minutes of deep work followed by a 5-minute break, with a longer 15-minute break every four pomodoros. Adjust every duration to match your rhythm, watch the big circular timer count down, hear a soft chime when each phase ends, and track how many pomodoros you’ve completed today.",
    tool: toolBody,
    howTo: [
      {
        title: "Tune the durations",
        description:
          "Set the focus, short-break, long-break and long-break-every values to match your workflow. Settings lock while a session is running.",
      },
      {
        title: "Press Start",
        description:
          "The circular timer fills as the phase progresses. The number in the centre shows the remaining time, updating every second.",
      },
      {
        title: "Take your break",
        description:
          "When the focus phase ends, a chime plays and the timer auto-advances to the next break. Press Start to begin the break (or Skip to jump straight through).",
      },
      {
        title: "Track your streak",
        description:
          "The “Pomodoros completed” counter increments every time you finish a focus phase. Use Copy to share your progress, or Reset count to start fresh.",
      },
    ],
    useCases: [
      "Beat procrastination by committing to a single 25-minute focus block.",
      "Protect your attention during deep work like writing, coding or studying.",
      "Pace yourself through a long revision session with regular breaks.",
      "Build a daily focus streak by tracking completed pomodoros.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The timer uses setInterval(…, 1000) and pauses if the tab is closed. Reopening the
          page restores the remaining time from the in-memory state — there is no persistence
          across reloads.
        </li>
        <li>
          The completion chime uses the Web Audio API. Browsers may block audio until you
          interact with the page; the first Start click satisfies this autoplay requirement.
        </li>
        <li>
          The Pomodoro count is not saved between sessions. For long-term tracking, copy the
          summary at the end of each session.
        </li>
        <li>
          Background tabs may have their setInterval throttled by the browser to once per
          minute. Keep the tab foregrounded for accurate per-second updates.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What is the Pomodoro Technique?",
        a: "A time-management method invented by Francesco Cirillo in the late 1980s. You work in 25-minute focus blocks (“pomodoros”) separated by 5-minute breaks, with a longer 15-minute break after every four pomodoros. The fixed intervals reduce decision fatigue and protect against burnout.",
      },
      {
        q: "Can I change the durations mid-session?",
        a: "No — settings lock while the timer is running to prevent mid-pomodoro drift. Pause or reset the timer to edit them.",
      },
      {
        q: "Why didn’t the chime play?",
        a: "Most likely the bell toggle is off, or your browser blocked audio until you interacted with the page. Click anywhere first, then toggle the bell on — the next completion will play the chime.",
      },
      {
        q: "What happens after the focus phase ends?",
        a: "The chime plays, the counter increments, and the timer auto-advances to the next break (short or long depending on the cycle). It stops there — press Start to begin the break so you don’t accidentally miss it.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
