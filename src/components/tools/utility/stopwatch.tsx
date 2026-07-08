"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import {
  Play,
  Pause,
  Flag,
  RotateCcw,
  Trophy,
  Turtle,
  Timer,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "dueneo-stopwatch-v1";

interface Lap {
  lapMs: number;
  totalMs: number;
}

interface PersistState {
  snapshotElapsedMs: number;
  running: boolean;
  snapshotWallAt: number | null;
  laps: Lap[];
}

function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalMs = Math.floor(ms);
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const milliseconds = totalMs % 1000;
  return (
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0") +
    "." +
    String(milliseconds).padStart(3, "0")
  );
}

export function Stopwatch({ tool }: { tool: ToolDefinition }) {
  // elapsedMs accumulates the elapsed time at the moment of the last pause.
  // When running, the live display adds (performance.now() - perfStart).
  const [elapsedMs, setElapsedMs] = React.useState<number>(0);
  const [perfStart, setPerfStart] = React.useState<number | null>(null);
  const [laps, setLaps] = React.useState<Lap[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  const running = perfStart != null;

  // requestAnimationFrame loop — we force a re-render on every frame while
  // running so the millisecond display updates smoothly. setInterval at 60Hz
  // is not smooth enough because it doesn't sync with the display refresh.
  const [, forceTick] = React.useReducer((x: number) => x + 1, 0);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!running) return;
    const loop = () => {
      forceTick();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [running]);

  // Live display value: when running, add the current segment delta on top
  // of the accumulated baseline.
  const displayMs =
    running && perfStart != null
      ? elapsedMs + (performance.now() - perfStart)
      : elapsedMs;

  // ----- Hydrate from localStorage on mount -----
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as PersistState;
        if (saved && typeof saved.snapshotElapsedMs === "number") {
          if (saved.running && saved.snapshotWallAt != null) {
            const delta = Date.now() - saved.snapshotWallAt;
            setElapsedMs(saved.snapshotElapsedMs + Math.max(0, delta));
            setPerfStart(performance.now());
          } else {
            setElapsedMs(saved.snapshotElapsedMs);
            setPerfStart(null);
          }
          if (Array.isArray(saved.laps)) {
            setLaps(saved.laps);
          }
        }
      }
    } catch {
      // ignore corrupted state
    }
    setHydrated(true);
  }, []);

  // ----- Persist to localStorage -----
  const persist = React.useCallback(() => {
    try {
      const snapshot: PersistState = {
        snapshotElapsedMs:
          running && perfStart != null
            ? elapsedMs + (performance.now() - perfStart)
            : elapsedMs,
        running,
        snapshotWallAt: running ? Date.now() : null,
        laps,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // storage might be full or disabled (private mode) — fail silently
    }
  }, [running, perfStart, elapsedMs, laps]);

  React.useEffect(() => {
    if (!hydrated) return;
    persist();
  }, [hydrated, persist]);

  // While running, refresh the snapshot every second so a tab close keeps an
  // accurate running clock.
  React.useEffect(() => {
    if (!running || !hydrated) return;
    const id = window.setInterval(persist, 1000);
    return () => window.clearInterval(id);
  }, [running, hydrated, persist]);

  // ----- Controls -----
  const startPause = () => {
    if (running && perfStart != null) {
      // Pause: fold the current segment into elapsedMs.
      const delta = performance.now() - perfStart;
      setElapsedMs((prev) => prev + delta);
      setPerfStart(null);
    } else {
      // Start a fresh running segment.
      setPerfStart(performance.now());
    }
  };

  const lap = () => {
    if (!running || perfStart == null) {
      toast.error("Start the stopwatch before recording a lap.");
      return;
    }
    const total = elapsedMs + (performance.now() - perfStart);
    const prevTotal = laps.length > 0 ? laps[laps.length - 1].totalMs : 0;
    const lapMs = Math.max(0, total - prevTotal);
    setLaps((prev) => [...prev, { lapMs, totalMs: total }]);
  };

  const reset = () => {
    setElapsedMs(0);
    setPerfStart(null);
    setLaps([]);
    toast.success("Stopwatch reset");
  };

  const clearLaps = () => {
    if (laps.length === 0) return;
    setLaps([]);
    toast.success("Laps cleared");
  };

  // ----- Auto-scroll lap list to bottom on new lap -----
  const lapListRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (lapListRef.current) {
      lapListRef.current.scrollTop = lapListRef.current.scrollHeight;
    }
  }, [laps]);

  // ----- Best / worst lap (only meaningful with 2+ laps) -----
  const bestLapIndex = React.useMemo(() => {
    if (laps.length < 2) return -1;
    let best = 0;
    for (let i = 1; i < laps.length; i++) {
      if (laps[i].lapMs < laps[best].lapMs) best = i;
    }
    return best;
  }, [laps]);

  const worstLapIndex = React.useMemo(() => {
    if (laps.length < 2) return -1;
    let worst = 0;
    for (let i = 1; i < laps.length; i++) {
      if (laps[i].lapMs > laps[worst].lapMs) worst = i;
    }
    return worst;
  }, [laps]);

  const summary = `Stopwatch: ${formatTime(displayMs)}${
    laps.length > 0 ? ` · ${laps.length} lap(s)` : ""
  }${bestLapIndex >= 0 ? ` · best lap ${formatTime(laps[bestLapIndex].lapMs)}` : ""}`;

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        {/* Display + controls */}
        <div className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Timer className="h-3.5 w-3.5 text-primary" />
            {running ? "Running" : elapsedMs > 0 ? "Paused" : "Ready"}
          </div>
          <div
            className={cn(
              "rounded-xl border bg-background p-5 text-center transition-colors sm:p-6",
              running && "border-primary/40 bg-primary/5"
            )}
            role="timer"
            aria-live="off"
            aria-label={`Elapsed time ${formatTime(displayMs)}`}
          >
            <div className="font-mono text-4xl font-bold tabular-nums tracking-tight text-foreground sm:text-6xl">
              {formatTime(displayMs)}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              HH:MM:SS.mmm · millisecond precision via requestAnimationFrame
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button
              onClick={startPause}
              variant={running ? "secondary" : "default"}
              className="col-span-2 sm:col-span-2"
              size="lg"
            >
              {running ? (
                <>
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  {elapsedMs > 0 ? "Resume" : "Start"}
                </>
              )}
            </Button>
            <Button
              onClick={lap}
              variant="outline"
              size="lg"
              disabled={!running}
            >
              <Flag className="mr-2 h-4 w-4" /> Lap
            </Button>
            <Button
              onClick={reset}
              variant="outline"
              size="lg"
              disabled={elapsedMs === 0 && laps.length === 0}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {running
                ? "Click Lap to record a split without stopping the clock."
                : elapsedMs > 0
                ? "Click Resume to continue, or Reset to clear the timer and laps."
                : "Click Start to begin timing."}
            </p>
            <CopyButton value={summary} size="sm" />
          </div>
        </div>

        {/* Laps panel */}
        <div className="flex flex-col rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Laps{" "}
              {laps.length > 0 && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({laps.length})
                </span>
              )}
            </h3>
            {laps.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearLaps}
                className="h-7 px-2 text-xs"
              >
                Clear laps
              </Button>
            )}
          </div>

          {laps.length === 0 ? (
            <div className="mt-3 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed bg-background/50 px-4 py-10 text-center">
              <Flag className="h-8 w-8 text-muted-foreground/60" />
              <p className="mt-2 text-sm text-muted-foreground">
                No laps recorded yet.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Start the stopwatch and click <span className="font-medium">Lap</span> to capture split times.
              </p>
            </div>
          ) : (
            <div
              ref={lapListRef}
              className="mt-3 max-h-96 flex-1 space-y-1.5 overflow-y-auto pr-1"
              style={{ scrollbarWidth: "thin" }}
            >
              {laps.map((lap, i) => {
                const isBest = i === bestLapIndex;
                const isWorst = i === worstLapIndex;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm",
                      isBest &&
                        "border-emerald-400/60 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950/30",
                      isWorst &&
                        "border-rose-400/60 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-950/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                        {laps.length - i}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Lap {laps.length - i}
                      </span>
                      {isBest && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <Trophy className="h-3 w-3" /> Best
                        </span>
                      )}
                      {isWorst && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                          <Turtle className="h-3 w-3" /> Slowest
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs tabular-nums sm:text-sm">
                      <span className="text-muted-foreground">
                        {formatTime(lap.lapMs)}
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatTime(lap.totalMs)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between gap-3 rounded-md border border-dashed bg-background/50 px-3 py-1.5 text-[10px] text-muted-foreground">
                <span>Lap</span>
                <span className="flex items-center gap-3 font-mono">
                  <span>split</span>
                  <span>total</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Persistence:</span> the
          stopwatch state — including the running clock and all recorded laps —
          is saved to your browser&apos;s <code className="rounded bg-background px-1 py-0.5">localStorage</code> every
          second while running and on every control action. Refresh the page or
          close the tab and the timer keeps ticking from where you left off.
        </p>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "A precision stopwatch with millisecond-accurate display driven by requestAnimationFrame and performance.now() — no choppy setInterval updates. Record unlimited lap splits, see your best and slowest laps highlighted automatically, and keep going across page refreshes thanks to localStorage persistence. Runs entirely in your browser.",
    tool: toolBody,
    howTo: [
      {
        title: "Start the timer",
        description:
          "Click Start. The display updates on every animation frame for smooth millisecond motion — about 60 times per second on most displays.",
      },
      {
        title: "Record laps",
        description:
          "While running, click Lap to capture a split. Each lap shows the time since the previous lap (split) and the total elapsed time at that lap. The list auto-scrolls to the newest entry.",
      },
      {
        title: "Pause, resume, reset",
        description:
          "Click Pause to freeze the clock, then Resume to continue. Reset clears the timer and all laps. Laps can also be cleared on their own without resetting the clock.",
      },
      {
        title: "Best / slowest lap",
        description:
          "Once you have two or more laps, the fastest lap is highlighted in green and the slowest in red so you can spot trends at a glance.",
      },
    ],
    useCases: [
      "Time running intervals, swim splits or track laps with millisecond precision.",
      "Measure task durations for time-tracking or productivity experiments.",
      "Run a debate or speech timer where you record per-segment splits.",
      "Demo a “click reaction time” benchmark with start + lap on a single click.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The display refreshes once per animation frame, so on a 60 Hz monitor
          the millisecond digit advances in ~16 ms steps; on a 120 Hz display it
          updates in ~8 ms steps. The underlying timing uses{" "}
          <code className="rounded bg-background px-1 py-0.5">performance.now()</code>,
          which has microsecond resolution — only the rendering is frame-locked.
        </li>
        <li>
          When the tab is in the background, most browsers throttle
          requestAnimationFrame to a much lower rate (or pause it entirely).
          The accumulated time stays accurate because we recompute from the
          baseline + delta on every render, but the visible millisecond digit
          will not animate while the tab is hidden.
        </li>
        <li>
          Persistence uses localStorage, which is per-browser and per-device.
          Clearing site data will erase a running stopwatch.
        </li>
        <li>
          If the system clock is changed while the stopwatch is running and the
          page is open, accuracy is unaffected — we use the monotonic{" "}
          <code className="rounded bg-background px-1 py-0.5">performance.now()</code>{" "}
          timer for live deltas. A clock change while the tab is closed,
          however, will affect the resume calculation.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why does the stopwatch keep running after I refresh the page?",
        a: "State is saved to localStorage every second while running and on every control action. On page load we read the saved snapshot, add the time that elapsed while the page was closed, and resume the animation loop. The result is a stopwatch that survives refreshes and tab closes.",
      },
      {
        q: "Why is the millisecond digit not perfectly smooth?",
        a: "The display updates once per animation frame, which on a 60 Hz display is roughly every 16 ms. The underlying timer (performance.now) has microsecond precision — only the rendering is tied to the display refresh rate. On a 120 Hz or 144 Hz monitor the digit will animate more smoothly.",
      },
      {
        q: "How are best and worst laps determined?",
        a: "We compare the split duration of each lap (the time since the previous lap, not the total elapsed time). The shortest split is highlighted as Best, the longest as Slowest. These badges appear only when you have at least two laps.",
      },
      {
        q: "What happens if I close the tab while running?",
        a: "The next time you open the stopwatch it will resume from the correct elapsed time, calculated using the snapshot timestamp saved while running. The laps you recorded are also restored.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
