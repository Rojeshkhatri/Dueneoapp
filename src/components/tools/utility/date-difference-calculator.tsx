"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/dueneo/copy-button";
import { CalendarRange, RotateCcw, ArrowLeftRight } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseDateInput,
  toDateInputValue,
  calendarAge,
  totalDaysBetween,
  wholeMonthsBetween,
  formatInt,
  formatNum,
} from "./_calc-date-helpers";

export function DateDifferenceCalculator({ tool }: { tool: ToolDefinition }) {
  const today = React.useMemo(() => new Date(), []);
  const [start, setStart] = React.useState<string>("");
  const [end, setEnd] = React.useState<string>(toDateInputValue(today));
  const [includeEnd, setIncludeEnd] = React.useState<boolean>(false);

  const startDate = parseDateInput(start);
  const endDate = parseDateInput(end);

  const valid = startDate instanceof Date && endDate instanceof Date && !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime());

  const calc = React.useMemo(() => {
    if (!valid) return null;
    let days = totalDaysBetween(startDate!, endDate!);
    if (includeEnd && days >= 0) days += 1;
    const cal = calendarAge(startDate!, endDate!);
    const months = wholeMonthsBetween(startDate!, endDate!);
    const years = Math.trunc(months / 12);
    const weeks = days / 7;
    const hours = days * 24;
    const minutes = hours * 60;
    return { days, weeks, hours, minutes, cal, months, years };
  }, [valid, startDate, endDate, includeEnd]);

  const swap = () => {
    setStart(end);
    setEnd(start);
  };

  const reset = () => {
    setStart("");
    setEnd(toDateInputValue(new Date()));
    setIncludeEnd(false);
  };

  const sign = calc && calc.days < 0 ? -1 : 1;
  const absDays = calc ? Math.abs(calc.days) : 0;

  const summary = calc
    ? `From ${start || "(empty)"} to ${end}: ${calc.cal.years} yr, ${Math.abs(
        calc.cal.months
      )} mo, ${Math.abs(calc.cal.days)} d (${formatInt(calc.days)} total days${includeEnd ? ", end included" : ""}).`
    : "";

  const rows = calc
    ? [
        { label: "Total days", value: formatInt(calc.days) },
        { label: "Total weeks", value: `${formatNum(Math.abs(calc.weeks), 2)}${sign < 0 ? " (−)" : ""}` },
        { label: "Total months (calendar)", value: formatInt(calc.months) },
        { label: "Total years (calendar)", value: formatInt(calc.years) },
        { label: "Total hours", value: formatInt(calc.hours) },
        { label: "Total minutes", value: formatInt(calc.minutes) },
      ]
    : [];

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dd-start">Start date</Label>
              <Input
                id="dd-start"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dd-end">End date</Label>
              <Input
                id="dd-end"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={swap}>
              <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" /> Swap dates
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          <Label
            htmlFor="dd-include-end"
            className="flex cursor-pointer items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
          >
            <span>Include end date in the count</span>
            <Switch id="dd-include-end" checked={includeEnd} onCheckedChange={setIncludeEnd} />
          </Label>
          <p className="text-xs text-muted-foreground">
            When enabled, the day count is increased by one (e.g. Mon → Tue = 2 days instead of 1).
            Useful for hotel-night and project-day calculations.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Result</h3>
            {calc && <CopyButton value={summary} size="sm" />}
          </div>

          {!valid && (
            <p className="text-sm text-muted-foreground">
              Pick both a start and end date to see the difference.
            </p>
          )}

          {valid && calc && (
            <>
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <CalendarRange className="h-3.5 w-3.5 text-primary" /> Total time
                </div>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                    {calc.cal.years}
                    <span className="ml-1 text-base font-normal text-muted-foreground">yr</span>
                  </span>
                  <span className="font-mono text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                    {Math.abs(calc.cal.months)}
                    <span className="ml-1 text-base font-normal text-muted-foreground">mo</span>
                  </span>
                  <span className="font-mono text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                    {Math.abs(calc.cal.days)}
                    <span className="ml-1 text-base font-normal text-muted-foreground">d</span>
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Calendar breakdown from {start} to {end}.
                  {sign < 0 ? " End date is before start date — values shown as the absolute span." : ""}
                </p>
              </div>

              <div className="grid gap-2">
                {rows.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                  >
                    <span className="text-sm text-muted-foreground">{r.label}</span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">{formatInt(absDays)}</span> day
                  span{includeEnd && sign >= 0 ? " (end date included)" : ""}. Months and years use
                  calendar arithmetic — a 31 Jan → 28 Feb span counts as exactly 28 days / 1 month,
                  not 30.
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
      "Find the exact number of days, weeks, months and years between two dates — with an option to include the end date in the count (useful for hotel nights, project days or age-at-end calculations). The breakdown uses true calendar arithmetic rather than a fixed 30-day month.",
    tool: toolBody,
    howTo: [
      {
        title: "Pick the start date",
        description:
          "Use the first date picker. Defaults to empty so you can choose any start point.",
      },
      {
        title: "Pick the end date",
        description:
          "Use the second date picker. Defaults to today. Use the Swap button to flip the two.",
      },
      {
        title: "Toggle end-date inclusion",
        description:
          "Enable “Include end date in the count” if you need hotel-night style counting (Mon → Tue = 2 days).",
      },
      {
        title: "Read the breakdown",
        description:
          "The big number shows years, months and days. The list below shows totals in days, weeks, months, years, hours and minutes.",
      },
    ],
    useCases: [
      "Count days remaining until a deadline, vacation or product launch.",
      "Calculate project duration in working days for a statement of work.",
      "Work out the age of an account, contract or warranty from its start and end dates.",
      "Verify hotel-night counts or rental-day charges by including the end date.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Years / months / days use calendar arithmetic. A 31 Jan → 28 Feb span is 28 days / 1
          month, not 30 days — this matches how a person reads a calendar.
        </li>
        <li>
          Hours and minutes are derived by multiplying the day count by 24 and 60 respectively;
          daylight saving transitions are not modelled.
        </li>
        <li>
          The end-date toggle adds one day only when the end date is on or after the start date.
          Reversed ranges show the absolute span without adjustment.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why is the month count different from another tool?",
        a: "Many tools approximate a month as 30.44 days (365.25 ÷ 12). We count true calendar months between the two dates, which is the convention used when stating a person’s age or a project duration.",
      },
      {
        q: "What does “include end date” mean?",
        a: "When enabled, the day count is increased by 1. For example, 1 Jan → 2 Jan is 1 day by default, or 2 days when the end date is included. This matches hotel-night, rental-day and inclusive project-day conventions.",
      },
      {
        q: "Does the order of the dates matter?",
        a: "The total days are signed — if the end date is before the start, the day count is negative. Calendar years / months / days always show the absolute span. Use the Swap button to flip them.",
      },
      {
        q: "Does this account for leap years?",
        a: "Yes. Calendar arithmetic uses real Date objects, so 29 Feb is treated correctly. Day counts across a leap-day boundary include the extra day.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
