"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import { Hourglass, RotateCcw, CalendarClock, PartyPopper } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { parseDateInput, toDateTimeInputValue, formatPrettyDateTime } from "./_calc-date-helpers";

interface Remaining {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function computeRemaining(target: Date, now: Date): Remaining {
  const total = target.getTime() - now.getTime();
  const abs = Math.abs(total);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const seconds = Math.floor((abs % 60_000) / 1000);
  return { total, days, hours, minutes, seconds };
}

export function CountdownTimer({ tool }: { tool: ToolDefinition }) {
  const defaultTarget = React.useMemo(() => {
    // Default: 7 days from now, at the same time of day.
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  }, []);
  const [targetInput, setTargetInput] = React.useState<string>(toDateTimeInputValue(defaultTarget));
  const [now, setNow] = React.useState<Date>(new Date());
  const [title, setTitle] = React.useState<string>("My countdown");

  const target = parseDateInput(targetInput);
  const valid = target instanceof Date && !Number.isNaN(target.getTime());

  // Tick every second.
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = valid ? computeRemaining(target!, now) : null;
  const isPast = remaining ? remaining.total <= 0 : false;
  const reached = remaining ? remaining.total <= 0 : false;

  const reset = () => {
    setTargetInput(toDateTimeInputValue(defaultTarget));
    setTitle("My countdown");
  };

  const summary = remaining
    ? isPast
      ? `${title}: reached ${formatPrettyDateTime(target!)} (${Math.abs(remaining.days)} days ago).`
      : `${title}: ${remaining.days}d ${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s remaining (target ${formatPrettyDateTime(target!)}).`
    : "";

  const quickSet = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 0, 0);
    setTargetInput(toDateTimeInputValue(d));
  };

  const bigUnits = remaining
    ? [
        { label: "Days", value: isPast ? Math.abs(remaining.days) : remaining.days },
        { label: "Hours", value: remaining.hours },
        { label: "Minutes", value: remaining.minutes },
        { label: "Seconds", value: remaining.seconds },
      ]
    : [];

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="cd-title">Countdown label (optional)</Label>
            <Input
              id="cd-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Wedding day"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cd-target" className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-primary" /> Target date & time
            </Label>
            <Input
              id="cd-target"
              type="datetime-local"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => quickSet(1)}>
                +1 day
              </Button>
              <Button size="sm" variant="outline" onClick={() => quickSet(7)}>
                +1 week
              </Button>
              <Button size="sm" variant="outline" onClick={() => quickSet(30)}>
                +30 days
              </Button>
              <Button size="sm" variant="outline" onClick={() => quickSet(365)}>
                +1 year
              </Button>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{title || "Countdown"}</h3>
            {remaining && <CopyButton value={summary} size="sm" />}
          </div>

          {!valid && (
            <p className="text-sm text-muted-foreground">
              Pick a valid target date and time to start the countdown.
            </p>
          )}

          {valid && remaining && (
            <>
              <div className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Hourglass className="h-3.5 w-3.5 text-primary" /> Target
                </div>
                <div className="mt-1 font-mono text-base font-semibold text-foreground">
                  {formatPrettyDateTime(target!)}
                </div>
              </div>

              {reached ? (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-5 text-center dark:border-emerald-800 dark:bg-emerald-950/40">
                  <PartyPopper className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  <p className="mt-2 text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                    {title ? `${title} has arrived!` : "Target reached!"}
                  </p>
                  <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-300/80">
                    Reached {formatPrettyDateTime(target!)} ({Math.abs(remaining.days)} days,{" "}
                    {remaining.hours}h ago)
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {bigUnits.map((u) => (
                    <div
                      key={u.label}
                      className="rounded-lg border bg-background p-3 text-center"
                    >
                      <div className="font-mono text-3xl font-black tabular-nums text-foreground sm:text-4xl">
                        {String(u.value).padStart(2, "0")}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                        {u.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                <p>
                  {isPast
                    ? `Target was ${Math.abs(remaining.days)} days, ${remaining.hours}h ${remaining.minutes}m ago.`
                    : `Total: ${Math.floor(remaining.total / 1000).toLocaleString()} seconds remaining.`}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Count down to any future date and time — a wedding, exam, product launch, vacation or retirement. The display updates every second and shows days, hours, minutes and seconds remaining. When the target is reached, a celebratory message appears; the counter then keeps counting up so you can see how long ago it passed.",
    tool: toolBody,
    howTo: [
      {
        title: "Name your countdown",
        description:
          "Optionally type a label like “Wedding day” so the result panel and copied summary read naturally.",
      },
      {
        title: "Pick the target date & time",
        description:
          "Use the datetime-local picker. Quick buttons add 1 day, 1 week, 30 days or 1 year from now.",
      },
      {
        title: "Watch the live countdown",
        description:
          "Days, hours, minutes and seconds update every second. The card flips to a “reached” state when the moment passes.",
      },
      {
        title: "Copy the summary",
        description:
          "Use Copy to put a one-line summary like “Launch: 14d 06h 32m 11s remaining” on your clipboard.",
      },
    ],
    useCases: [
      "Build excitement for a wedding, holiday or product launch.",
      "Track a deadline for a school project, grant or tax filing.",
      "Count down to retirement or a sabbatical start date.",
      "Keep a public-facing countdown for a live event or stream.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The countdown runs entirely in your browser using setInterval — it pauses if the tab
          is closed and may drift briefly when the device sleeps.
        </li>
        <li>
          Times are interpreted in your device’s local timezone. For a fixed UTC deadline, use
          the Time Zone Converter to compute the local equivalent first.
        </li>
        <li>
          The counter keeps counting up after the target passes so you can see how long ago it
          happened — there is no automatic alarm sound.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Does it keep counting when I close the tab?",
        a: "No. The countdown only ticks while the page is open. When you reopen it, the remaining time is recomputed from your device’s clock, so it stays accurate — it just doesn’t update in the background.",
      },
      {
        q: "Will it make a sound when the target is reached?",
        a: "No, the countdown timer is silent. For an audible alarm, use the Pomodoro Timer which plays a Web Audio beep on completion.",
      },
      {
        q: "Can I count down to a time in another timezone?",
        a: "Use the Time Zone Converter first to find the local equivalent of that UTC/zoned moment, then enter that local time here. Times you enter are always read as local wall-clock time.",
      },
      {
        q: "How precise is the seconds display?",
        a: "It refreshes once per second via setInterval. The actual time used for the calculation is taken from Date.now() each tick, so there’s no accumulated drift — it stays accurate to the second.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
