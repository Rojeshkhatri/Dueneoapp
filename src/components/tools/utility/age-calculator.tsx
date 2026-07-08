"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import { Cake, RotateCcw, CalendarDays } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseDateInput,
  toDateInputValue,
  calendarAge,
  totalDaysBetween,
  breakdownDays,
  formatInt,
} from "./_calc-date-helpers";

export function AgeCalculator({ tool }: { tool: ToolDefinition }) {
  const today = React.useMemo(() => new Date(), []);
  const [dob, setDob] = React.useState<string>("");
  const [ageOn, setAgeOn] = React.useState<string>(toDateInputValue(today));

  const dobDate = parseDateInput(dob);
  const ageOnDate = parseDateInput(ageOn) ?? today;

  const valid = dobDate instanceof Date && !Number.isNaN(dobDate.getTime());
  const futureDob = valid && dobDate.getTime() > ageOnDate.getTime();

  const calc = React.useMemo(() => {
    if (!valid || futureDob) return null;
    const cal = calendarAge(dobDate!, ageOnDate);
    const totalDays = totalDaysBetween(dobDate!, ageOnDate);
    const bd = breakdownDays(totalDays);
    return { cal, totalDays, bd };
  }, [valid, futureDob, dobDate, ageOnDate]);

  const reset = () => {
    setDob("");
    setAgeOn(toDateInputValue(new Date()));
  };

  const summary = calc
    ? `Age on ${ageOn}: ${calc.cal.years} years, ${Math.abs(calc.cal.months)} months, ${Math.abs(
        calc.cal.days
      )} days (${formatInt(calc.totalDays)} total days).`
    : "";

  const bigStats = calc
    ? [
        { label: "Years", value: calc.cal.years },
        { label: "Months", value: Math.abs(calc.cal.months) },
        { label: "Days", value: Math.abs(calc.cal.days) },
      ]
    : [];

  const detailStats = calc
    ? [
        { label: "Total days", value: formatInt(calc.totalDays) },
        { label: "Total weeks", value: formatInt(Math.floor(calc.bd.weeks)) },
        { label: "Total hours", value: formatInt(Math.floor(calc.bd.hours)) },
        { label: "Total minutes", value: formatInt(Math.floor(calc.bd.minutes)) },
        { label: "Total seconds", value: formatInt(Math.floor(calc.bd.seconds)) },
        {
          label: "Total months (approx)",
          value: formatInt(Math.floor(calc.bd.monthsApprox)),
        },
      ]
    : [];

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="age-dob" className="flex items-center gap-1.5">
              <Cake className="h-4 w-4 text-primary" /> Date of birth
            </Label>
            <Input
              id="age-dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={toDateInputValue(today)}
            />
            <p className="text-xs text-muted-foreground">
              Pick the date you were born. All processing happens locally in your browser.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="age-on" className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-primary" /> Age on date
            </Label>
            <Input
              id="age-on"
              type="date"
              value={ageOn}
              onChange={(e) => setAgeOn(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Defaults to today. Change it to find your age on a past or future date.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAgeOn(toDateInputValue(today))}
            >
              Use today
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
              Pick a date of birth to see your age breakdown.
            </p>
          )}

          {valid && futureDob && (
            <p className="text-sm text-rose-600 dark:text-rose-400">
              Date of birth is after the “age on” date. Swap them or pick a valid range.
            </p>
          )}

          {calc && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {bigStats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg border bg-background p-3 text-center"
                  >
                    <div className="font-mono text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                      {s.value}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-2">
                {detailStats.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                  >
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                Calculated from {dob} to {ageOn}. Years / months / days use calendar
                arithmetic (the same convention a person uses when stating their age).
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Find your exact age in years, months and days, plus the total elapsed days, weeks, hours, minutes and seconds since your date of birth. Optionally compute your age on any past or future date — useful for filling in forms, planning milestones or settling age-based eligibility questions.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter your date of birth",
        description:
          "Use the date picker labelled “Date of birth”. The value is clamped to today so you can’t pick a future birthdate by accident.",
      },
      {
        title: "Set the “age on” date",
        description:
          "Defaults to today. Change it to find your age on a different date — for example on the day an event happens or a form is submitted.",
      },
      {
        title: "Read the breakdown",
        description:
          "The three big numbers show calendar years, months and days. The list below totals the elapsed time in days, weeks, hours, minutes and seconds.",
      },
      {
        title: "Copy the summary",
        description:
          "Use Copy to put a one-line summary like “23 years, 4 months, 12 days (8543 total days)” on your clipboard.",
      },
    ],
    useCases: [
      "Verify you meet the minimum age requirement for an exam, job or visa application.",
      "Calculate a child’s age on the first day of school or a sports season.",
      "Count the total days since a wedding, product launch or quit-smoking date.",
      "Settle “how old am I really?” debates with second-precision totals.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Years / months / days use calendar arithmetic (the human convention). Totals use
          24-hour days and ignore leap-second adjustments.
        </li>
        <li>
          Daylight Saving Time boundaries are not factored into the “total hours” figure — it
          assumes exactly 24 hours per calendar day.
        </li>
        <li>
          The “total months (approx)” figure divides total days by 30.4375 and may differ by a
          day or two from the calendar count.
        </li>
        <li>
          The tool does not support time-of-day inputs — every calculation is performed at
          midnight in your local timezone.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why do my years and months look one off from another calculator?",
        a: "Some calculators use a “30-day month” simplification. We use true calendar arithmetic (e.g. 31 Jan → 28 Feb is 28 days, not 1 month), which matches how a person states their age.",
      },
      {
        q: "How are total seconds calculated?",
        a: "We take the absolute difference between the two midnights in milliseconds and convert to seconds. The result is whole seconds, rounded down.",
      },
      {
        q: "Can I compute age on a future date?",
        a: "Yes. Change the “age on” date to any date in the future — for example, to see your age on your next birthday or retirement date.",
      },
      {
        q: "Is my date of birth stored anywhere?",
        a: "No. The calculation runs entirely in your browser. Nothing you type leaves your device or is sent to a server.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
