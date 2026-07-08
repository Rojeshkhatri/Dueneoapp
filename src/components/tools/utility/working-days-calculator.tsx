"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/dueneo/copy-button";
import {
  CalendarRange,
  RotateCcw,
  Plus,
  Trash2,
  Briefcase,
  CalendarOff,
  Sun,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { toast } from "sonner";
import {
  parseDateInput,
  toDateInputValue,
  formatInt,
  DOW_LABELS,
} from "./_calc-date-helpers";

/**
 * Returns midnight-UTC timestamp for a given local date, used for set
 * membership comparisons (holidays, weekend days) so two Date objects at the
 * same calendar day compare equal regardless of construction path.
 */
function dayKey(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

interface CalcResult {
  totalDays: number;
  weekendDays: number;
  workingDaysBeforeHolidays: number;
  holidaysOnWorkingDays: number;
  holidayOverlap: number;
  workingDays: number;
  reversed: boolean;
}

function computeWorkingDays(
  start: Date,
  end: Date,
  weekendSet: Set<number>,
  holidays: Date[]
): CalcResult {
  const reversed = end.getTime() < start.getTime();
  const s = reversed ? end : start;
  const e = reversed ? start : end;

  const MS_PER_DAY = 86_400_000;
  const sUTC = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate());
  const eUTC = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate());
  const totalDays = Math.trunc((eUTC - sUTC) / MS_PER_DAY) + 1; // inclusive

  // Build holiday key set (normalized to midnight UTC, de-duplicated).
  const holidayKeys = new Set<number>();
  for (const h of holidays) {
    if (h instanceof Date && !Number.isNaN(h.getTime())) {
      holidayKeys.add(dayKey(h));
    }
  }

  let weekendDays = 0;
  let holidaysOnWorkingDays = 0;
  let holidayOverlap = 0; // holidays inside the date range (any day of week)

  for (let i = 0; i < totalDays; i++) {
    const cur = new Date(sUTC + i * MS_PER_DAY);
    const dow = cur.getUTCDay(); // 0=Sun..6=Sat (UTC matches local since we used midnight UTC)
    const isWeekend = weekendSet.has(dow);
    const isHoliday = holidayKeys.has(dayKey(cur));

    if (isWeekend) {
      weekendDays++;
    }
    if (isHoliday) {
      holidayOverlap++;
      if (!isWeekend) {
        holidaysOnWorkingDays++;
      }
    }
  }

  const workingDaysBeforeHolidays = totalDays - weekendDays;
  const workingDays = workingDaysBeforeHolidays - holidaysOnWorkingDays;

  return {
    totalDays,
    weekendDays,
    workingDaysBeforeHolidays,
    holidaysOnWorkingDays,
    holidayOverlap,
    workingDays,
    reversed,
  };
}

export function WorkingDaysCalculator({ tool }: { tool: ToolDefinition }) {
  const today = React.useMemo(() => new Date(), []);
  const [start, setStart] = React.useState<string>("");
  const [end, setEnd] = React.useState<string>(toDateInputValue(today));
  // Weekend mask: 7 booleans indexed by getDay() (0=Sun..6=Sat).
  // Default: Sunday (0) and Saturday (6) are weekends.
  const [weekend, setWeekend] = React.useState<boolean[]>([
    true, false, false, false, false, false, true,
  ]);
  const [holidays, setHolidays] = React.useState<string[]>([]);

  const startDate = parseDateInput(start);
  const endDate = parseDateInput(end);

  const valid =
    startDate instanceof Date &&
    endDate instanceof Date &&
    !Number.isNaN(startDate.getTime()) &&
    !Number.isNaN(endDate.getTime());

  const weekendSet = React.useMemo(() => {
    const set = new Set<number>();
    weekend.forEach((on, i) => {
      if (on) set.add(i);
    });
    return set;
  }, [weekend]);

  const holidayDates = React.useMemo(
    () => holidays.map((h) => parseDateInput(h)).filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime())),
    [holidays]
  );

  const calc = React.useMemo<CalcResult | null>(() => {
    if (!valid || !startDate || !endDate) return null;
    return computeWorkingDays(startDate, endDate, weekendSet, holidayDates);
  }, [valid, startDate, endDate, weekendSet, holidayDates]);

  const toggleWeekend = (idx: number, on: boolean) => {
    setWeekend((prev) => {
      const next = [...prev];
      next[idx] = on;
      return next;
    });
  };

  const addHoliday = () => {
    setHolidays((prev) => [...prev, ""]);
  };

  const updateHoliday = (idx: number, value: string) => {
    setHolidays((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const removeHoliday = (idx: number) => {
    setHolidays((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearHolidays = () => {
    if (holidays.length === 0) return;
    setHolidays([]);
    toast.success("Cleared all holidays");
  };

  const reset = () => {
    setStart("");
    setEnd(toDateInputValue(new Date()));
    setWeekend([true, false, false, false, false, false, true]);
    setHolidays([]);
  };

  const summary = calc
    ? `From ${start || "—"} to ${end}: ${calc.totalDays} total days, ${calc.workingDays} working day(s), ${calc.weekendDays} weekend day(s), ${calc.holidaysOnWorkingDays} holiday(s) on working days.`
    : "";

  const bigStats = calc
    ? [
        {
          label: "Total days",
          value: formatInt(calc.totalDays),
          icon: CalendarRange,
          hint: "Inclusive of start and end",
        },
        {
          label: "Working days",
          value: formatInt(calc.workingDays),
          icon: Briefcase,
          hint: `${formatInt(calc.workingDaysBeforeHolidays)} − ${calc.holidaysOnWorkingDays} holiday(s)`,
        },
        {
          label: "Weekend days",
          value: formatInt(calc.weekendDays),
          icon: Sun,
          hint: "Days marked as non-working",
        },
        {
          label: "Holidays (on working days)",
          value: formatInt(calc.holidaysOnWorkingDays),
          icon: CalendarOff,
          hint: `${formatInt(calc.holidayOverlap)} holiday(s) in range total`,
        },
      ]
    : [];

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wd-start">Start date</Label>
              <Input
                id="wd-start"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wd-end">End date</Label>
              <Input
                id="wd-end"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          {valid && calc?.reversed && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              End date is before start date — calculations use the absolute span
              (the two dates are swapped internally).
            </p>
          )}

          <div className="space-y-2">
            <Label>Weekend days</Label>
            <p className="text-xs text-muted-foreground">
              Toggle which weekdays count as non-working. Default is Saturday
              and Sunday.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {DOW_LABELS.map((label, i) => (
                <label
                  key={label}
                  htmlFor={`wd-dow-${i}`}
                  className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-xs"
                >
                  <Checkbox
                    id={`wd-dow-${i}`}
                    checked={weekend[i]}
                    onCheckedChange={(v) => toggleWeekend(i, v === true)}
                  />
                  <span className="truncate">{label.slice(0, 3)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Custom holidays</Label>
              <div className="flex gap-1.5">
                {holidays.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHolidays}
                    className="h-7 px-2 text-xs"
                  >
                    Clear all
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addHoliday}
                  className="h-7 px-2 text-xs"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add holiday
                </Button>
              </div>
            </div>
            {holidays.length === 0 ? (
              <p className="rounded-md border border-dashed bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                No custom holidays yet. Click “Add holiday” to exclude public
                holidays or company closures from the working-day count.
              </p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                {holidays.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={h}
                      onChange={(e) => updateHoliday(i, e.target.value)}
                      aria-label={`Holiday ${i + 1}`}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHoliday(i)}
                      aria-label={`Remove holiday ${i + 1}`}
                      className="flex-none text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Result</h3>
            {calc && <CopyButton value={summary} size="sm" />}
          </div>

          {!valid && (
            <p className="text-sm text-muted-foreground">
              Pick a start and end date to see the working-day breakdown.
            </p>
          )}

          {valid && calc && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {bigStats.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.label}
                      className="rounded-lg border bg-background p-3"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                        {s.label}
                      </div>
                      <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                        {s.value}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {s.hint}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                <p>
                  Range <span className="font-medium text-foreground">{start || "—"}</span> →{" "}
                  <span className="font-medium text-foreground">{end}</span> ·{" "}
                  {calc.reversed ? "swapped internally for counting" : "inclusive of both endpoints"}.
                  Holidays that fall on a weekend are not double-counted.
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
      "Count the business days between two dates with full control over which weekdays count as weekends and which dates are public holidays. Useful for project timelines, SLA deadlines, leave balances and delivery estimates. Everything runs locally in your browser.",
    tool: toolBody,
    howTo: [
      {
        title: "Pick start and end dates",
        description:
          "Use the two date pickers at the top. The range is inclusive of both endpoints — a Mon → Mon range counts as 1 working day by default.",
      },
      {
        title: "Choose your weekend days",
        description:
          "Toggle which weekdays count as non-working. Sunday + Saturday is the default, but you can switch to a Friday–Saturday weekend or any other pattern.",
      },
      {
        title: "Add custom holidays",
        description:
          "Click “Add holiday” to drop in a date picker for each public holiday or company closure. Holidays that fall on a weekend are not double-counted.",
      },
      {
        title: "Read the breakdown",
        description:
          "The four stat cards show total days, working days, weekend days and the number of holidays that landed on working days (and therefore reduced the count).",
      },
    ],
    useCases: [
      "Estimate the number of working days a software project will take between two milestones.",
      "Calculate accrued leave in business days excluding public holidays.",
      "Work out how many trading days are in a billing period.",
      "Compute SLA expiry for a support ticket raised on a Friday with a 5-business-day response window.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The range is inclusive of both start and end dates. If you need
          exclusive counting, shift the end date back by one day before
          entering it.
        </li>
        <li>
          Holiday handling is a plain date match — there is no logic for
          observed-holiday rules (e.g. a Sunday holiday moving to Monday) or
          regional holiday calendars. Add the observed date manually if needed.
        </li>
        <li>
          All arithmetic happens at midnight in your local timezone. Time of
          day is ignored.
        </li>
        <li>
          If the end date is before the start date the two are swapped
          internally and the absolute span is reported.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Is the start date included in the count?",
        a: "Yes. Both the start and end dates are counted. A Mon → Mon range is 1 day, Mon → Tue is 2 days. To exclude the start date, pick the next day as the start.",
      },
      {
        q: "What happens if a holiday lands on a weekend?",
        a: "It is counted in the “holidays in range” figure shown under the holidays stat, but it does not reduce the working-day count again — the day was already excluded as a weekend.",
      },
      {
        q: "Can I use a Friday–Saturday weekend?",
        a: "Yes. Toggle Friday and Saturday on and leave Sunday off. The calculator supports any combination of weekend days, including mid-week closures.",
      },
      {
        q: "Are holidays stored anywhere?",
        a: "No. The holiday list lives only in your browser tab. Closing or refreshing the page resets it — there is no backend and no localStorage on this tool.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
