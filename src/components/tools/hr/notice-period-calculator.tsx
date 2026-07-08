"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  CalendarOff,
  Briefcase,
  Clock,
  Plus,
  Trash2,
  RotateCcw,
  CalendarCheck,
  Sun,
  Hourglass,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { toast } from "sonner";
import {
  DOW_LABELS,
  addDays,
  formatInt,
  formatPrettyDate,
  parseDateInput,
  toDateInputValue,
  totalDaysBetween,
} from "./_hr-helpers";

type PeriodUnit = "days" | "weeks" | "months";

interface CalcResult {
  lastWorkingDay: Date;
  totalCalendarDays: number;
  workingDays: number;
  weekendDays: number;
  holidaysExcluded: number;
  startDate: Date;
  periodDays: number;
}

/** Convert notice period to a calendar-day count. */
function periodToDays(periodValue: number, unit: PeriodUnit): number {
  if (unit === "days") return Math.round(periodValue);
  if (unit === "weeks") return Math.round(periodValue * 7);
  // months: ~30.4375 days/month
  return Math.round(periodValue * 30.4375);
}

/**
 * Compute the last working day given a resignation date and a notice period.
 *
 * The notice clock starts the day AFTER the resignation date. We count
 * `periodDays` notice days forward. When `excludeWeekends` or
 * `excludeHolidays` is on, any notice day that lands on a weekend/holiday
 * is skipped (does not count toward the notice total) and the end date
 * shifts forward. Otherwise the end date is simply resignation + periodDays.
 *
 * Returns the final last-working-day plus a breakdown of all calendar days
 * in the notice window (working / weekend / holiday).
 */
function computeLastDay(
  resignationDate: Date,
  periodValue: number,
  unit: PeriodUnit,
  excludeWeekends: boolean,
  excludeHolidays: boolean,
  holidays: Date[]
): CalcResult | null {
  const periodDays = periodToDays(periodValue, unit);
  if (periodDays <= 0) return null;

  // Build holiday key set (UTC midnight, de-duplicated).
  const holidayKeys = new Set<number>();
  for (const h of holidays) {
    if (h instanceof Date && !Number.isNaN(h.getTime())) {
      holidayKeys.add(Date.UTC(h.getFullYear(), h.getMonth(), h.getDate()));
    }
  }
  const dayKey = (d: Date) =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

  // Walk forward from the day after resignation, counting notice days.
  // Skipped days (weekend/holiday with the relevant flag on) do not count
  // toward the notice total — we keep walking.
  let cursor = addDays(resignationDate, 1);
  let counted = 0;
  let guard = 0;
  const cap = Math.max(10_000, periodDays * 10);
  while (counted < periodDays && guard < cap) {
    const dow = cursor.getDay();
    const onWeekend = dow === 0 || dow === 6;
    const onHoliday = holidayKeys.has(dayKey(cursor));
    const skipWeekend = excludeWeekends && onWeekend;
    const skipHoliday = excludeHolidays && onHoliday;
    if (!skipWeekend && !skipHoliday) {
      counted++;
    }
    cursor = addDays(cursor, 1);
    guard++;
  }
  // `cursor` is now one day past the last counted notice day.
  const lastWorkingDay = addDays(cursor, -1);

  // Build the breakdown across the full notice window (resignation+1 .. lastWorkingDay).
  let workingDays = 0;
  let weekendDays = 0;
  let holidaysExcluded = 0;
  let bcursor = addDays(resignationDate, 1);
  guard = 0;
  while (totalDaysBetween(bcursor, lastWorkingDay) >= 0 && guard < cap) {
    const dow = bcursor.getDay();
    const onWeekend = dow === 0 || dow === 6;
    const onHoliday = holidayKeys.has(dayKey(bcursor));
    if (onWeekend) weekendDays++;
    else if (onHoliday) holidaysExcluded++;
    else workingDays++;
    bcursor = addDays(bcursor, 1);
    guard++;
  }

  const totalCalendarDays = totalDaysBetween(resignationDate, lastWorkingDay);
  return {
    lastWorkingDay,
    totalCalendarDays,
    workingDays,
    weekendDays,
    holidaysExcluded,
    startDate: resignationDate,
    periodDays,
  };
}

/** Live countdown to a target date. */
function useCountdown(target: Date | null): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!target) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const diff = Math.max(0, target.getTime() - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { days, hours, minutes, seconds };
}

export function NoticePeriodCalculator({ tool }: { tool: ToolDefinition }) {
  const today = React.useMemo(() => new Date(), []);
  const [resignDate, setResignDate] = React.useState(toDateInputValue(today));
  const [periodValue, setPeriodValue] = React.useState("30");
  const [unit, setUnit] = React.useState<PeriodUnit>("days");
  const [excludeWeekends, setExcludeWeekends] = React.useState(false);
  const [excludeHolidays, setExcludeHolidays] = React.useState(false);
  const [holidays, setHolidays] = React.useState<string[]>([]);

  const start = parseDateInput(resignDate);
  const periodN = Number(periodValue);

  const holidayDates = React.useMemo(
    () =>
      holidays
        .map((h) => parseDateInput(h))
        .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime())),
    [holidays]
  );

  const result = React.useMemo<CalcResult | null>(() => {
    if (!start || !Number.isFinite(periodN) || periodN <= 0) return null;
    return computeLastDay(
      start,
      periodN,
      unit,
      excludeWeekends,
      excludeHolidays,
      holidayDates
    );
  }, [start, periodN, unit, excludeWeekends, excludeHolidays, holidayDates]);

  const countdown = useCountdown(result ? result.lastWorkingDay : null);

  const addHoliday = () => setHolidays((p) => [...p, ""]);
  const updateHoliday = (i: number, v: string) =>
    setHolidays((p) => {
      const n = [...p];
      n[i] = v;
      return n;
    });
  const removeHoliday = (i: number) =>
    setHolidays((p) => p.filter((_, idx) => idx !== i));

  const reset = () => {
    setResignDate(toDateInputValue(new Date()));
    setPeriodValue("30");
    setUnit("days");
    setExcludeWeekends(false);
    setExcludeHolidays(false);
    setHolidays([]);
    toast.success("Reset");
  };

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="np-resign">Resignation date</Label>
            <Input
              id="np-resign"
              type="date"
              value={resignDate}
              onChange={(e) => setResignDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The day you formally resign. Notice typically starts counting the next day.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <div className="space-y-2">
              <Label htmlFor="np-period">Notice period</Label>
              <Input
                id="np-period"
                type="number"
                min={0}
                step={unit === "months" ? 0.5 : 1}
                value={periodValue}
                onChange={(e) => setPeriodValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as PeriodUnit)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="weeks">Weeks</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-amber-500" />
                <span>Exclude weekends (Sat &amp; Sun)</span>
              </span>
              <Switch
                checked={excludeWeekends}
                onCheckedChange={setExcludeWeekends}
                aria-label="Exclude weekends"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <CalendarOff className="h-4 w-4 text-rose-500" />
                <span>Exclude custom holidays</span>
              </span>
              <Switch
                checked={excludeHolidays}
                onCheckedChange={setExcludeHolidays}
                aria-label="Exclude holidays"
              />
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Custom holidays</Label>
              <Button variant="outline" size="sm" onClick={addHoliday} className="h-7 px-2 text-xs">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add holiday
              </Button>
            </div>
            {holidays.length === 0 ? (
              <p className="rounded-md border border-dashed bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                No custom holidays. Add public holidays that fall within your notice period
                so they extend (or are counted in) the last working day.
              </p>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
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

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarCheck className="h-4 w-4 text-primary" /> Result
          </h3>
          {!result && (
            <p className="text-sm text-muted-foreground">
              Enter your resignation date and notice period to see your last working day.
            </p>
          )}
          {result && (
            <>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Last working day
                </div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums sm:text-3xl">
                  {formatPrettyDate(result.lastWorkingDay)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  ({DOW_LABELS[result.lastWorkingDay.getDay()]})
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border bg-background p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" /> Calendar days
                  </div>
                  <div className="mt-1 font-mono text-xl font-bold tabular-nums">
                    {formatInt(result.totalCalendarDays)}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5 text-primary" /> Working days
                  </div>
                  <div className="mt-1 font-mono text-xl font-bold tabular-nums">
                    {formatInt(result.workingDays)}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground">
                    <Sun className="h-3.5 w-3.5 text-primary" /> Weekend days
                  </div>
                  <div className="mt-1 font-mono text-xl font-bold tabular-nums">
                    {formatInt(result.weekendDays)}
                  </div>
                </div>
              </div>

              {(excludeWeekends || excludeHolidays) && (
                <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                  <Badge variant="outline" className="mb-1">
                    <Hourglass className="mr-1 h-3 w-3" /> Adjustments
                  </Badge>
                  <p className="mt-1">
                    Notice period: <span className="font-medium text-foreground">{result.periodDays}</span> calendar day(s).
                    Excluded <span className="font-medium text-foreground">{result.weekendDays}</span> weekend day(s)
                    {excludeHolidays && (
                      <>
                        {" "}and <span className="font-medium text-foreground">{result.holidaysExcluded}</span> holiday(s)
                      </>
                    )}{" "}
                    — they extended the last working day forward.
                  </p>
                </div>
              )}

              {result.totalCalendarDays > 0 && (
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" /> Countdown
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: "Days", value: countdown.days },
                      { label: "Hours", value: countdown.hours },
                      { label: "Minutes", value: countdown.minutes },
                      { label: "Seconds", value: countdown.seconds },
                    ].map((u) => (
                      <div key={u.label} className="rounded-md border bg-background p-2">
                        <div className="font-mono text-lg font-bold tabular-nums">
                          {String(u.value).padStart(2, "0")}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {u.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border bg-background p-3 text-xs text-muted-foreground">
                <p>
                  Notice starts on <span className="font-medium text-foreground">{formatPrettyDate(result.startDate)}</span> and ends on{" "}
                  <span className="font-medium text-foreground">{formatPrettyDate(result.lastWorkingDay)}</span>.
                  The notice clock typically begins the day after you formally resign — confirm
                  the exact start date with your HR team.
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
      "Calculate your last working day from your resignation date and notice period. Enter your notice length in days, weeks or months, optionally exclude weekends and public holidays, and see the exact last working day plus a live countdown. Useful for planning handovers, garden leave, start dates at a new employer and final-pay calculations. Everything runs locally in your browser.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter your resignation date",
        description:
          "Pick the date you formally submitted (or will submit) your resignation. The notice clock starts the day after by convention — confirm the exact start date with your HR team.",
      },
      {
        title: "Set the notice period length and unit",
        description:
          "Enter the length (e.g. 30, 8, 3) and pick the unit: days, weeks or months. Months use an average of 30.44 days. Your employment contract specifies the exact unit and length.",
      },
      {
        title: "Optionally exclude weekends and holidays",
        description:
          "If your contract counts only business days as notice (rare but exists), toggle weekends off. Add custom public holidays that fall within the notice window so they extend the end date.",
      },
      {
        title: "Read your last working day and countdown",
        description:
          "The result panel shows the last working day, total calendar days, working days, weekend days, holiday adjustments and a live ticking countdown to the end of notice.",
      },
    ],
    useCases: [
      "Plan the start date at your new employer so it lands the day after your notice ends.",
      "Schedule handover meetings and knowledge-transfer sessions during the notice window.",
      "Calculate accrued leave payout by knowing your exact final employment date.",
      "Negotiate garden leave or notice-period buyout with concrete date math.",
      "Coordinate visa/permit expiry with your last working day when moving between countries.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The calculator counts calendar days by default. Most employment contracts express
          notice in calendar days or months — confirm the convention in your contract before
          relying on the result.
        </li>
        <li>
          Months are converted at 30.44 days/month (365.25 / 12). Some jurisdictions use a
          calendar-month convention (e.g. &ldquo;3 months from the 15th = the 15th three months later&rdquo;)
          which can differ by 1–2 days. For exact month arithmetic, count manually.
        </li>
        <li>
          The notice clock starts the day after your resignation date by default. Some contracts
          count the resignation day itself; if so, subtract one day from the result.
        </li>
        <li>
          The countdown uses your device clock. If your system clock is wrong, the countdown will be wrong.
        </li>
        <li>
          Public holidays are not pre-populated — add them manually for your jurisdiction.
          Holiday handling is a plain date match; there is no logic for observed-holiday rules
          (e.g. a Sunday holiday moving to Monday).
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Does the resignation day count as a notice day?",
        a: "By default no — the notice clock starts the day after your resignation date. Some contracts count the resignation day itself; if yours does, subtract one day from the result. Always confirm the convention with HR.",
      },
      {
        q: "How are months converted?",
        a: "Months are converted at 30.44 days/month (365.25 / 12). This is the average length of a month and works well for multi-month notice periods. For exact calendar-month arithmetic (e.g. \"3 months from Jan 15 = Apr 15\"), compute it manually — the small difference matters for legal deadlines.",
      },
      {
        q: "What does \"exclude weekends\" do?",
        a: "When on, weekend days (Saturday and Sunday) do not count toward the notice total — they extend the last working day forward. Most contracts count calendar days, so leave this off unless your contract explicitly counts business days.",
      },
      {
        q: "Can I add public holidays?",
        a: "Yes. Click \"Add holiday\" and pick the date for each public holiday that falls within your notice window. When \"Exclude custom holidays\" is on, those days extend the notice period forward like weekends.",
      },
      {
        q: "Why does the countdown show 0 days?",
        a: "If your resignation date is in the past and the notice period has already elapsed, the last working day has already passed — the countdown shows 0. Pick a future resignation date or a longer notice period to see a live countdown.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
