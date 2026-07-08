"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CopyButton } from "@/components/dueneo/copy-button";
import {
  Baby,
  HeartPulse,
  RotateCcw,
  CalendarDays,
  CalendarClock,
  Stethoscope,
  AlertTriangle,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseDateInput,
  toDateInputValue,
  addDays,
  formatPrettyDate,
  formatInt,
} from "./_calc-date-helpers";

const MS_PER_DAY = 86_400_000;
const LMP_TO_DUE_DAYS = 280; // Naegele's rule
const CONCEPTION_TO_DUE_DAYS = 266; // 280 - 14
const LMP_TO_CONCEPTION_DAYS = 14; // typical ovulation offset

type Mode = "lmp" | "conception";

interface CalcResult {
  dueDate: Date;
  lmpDate: Date;
  conceptionDate: Date;
  gestationDays: number; // signed: positive = before due date, negative = after
  gestationWeeks: number;
  gestationDaysRemainder: number;
  trimester: 1 | 2 | 3 | null;
  daysUntilDue: number; // signed
  pastDue: boolean;
  conceived: boolean; // gestation >= 0
}

function compute(inputDate: Date, mode: Mode, today: Date): CalcResult {
  const lmpDate =
    mode === "lmp"
      ? new Date(inputDate)
      : addDays(inputDate, -LMP_TO_CONCEPTION_DAYS);
  const conceptionDate =
    mode === "conception"
      ? new Date(inputDate)
      : addDays(inputDate, LMP_TO_CONCEPTION_DAYS);
  const dueDate =
    mode === "lmp"
      ? addDays(inputDate, LMP_TO_DUE_DAYS)
      : addDays(inputDate, CONCEPTION_TO_DUE_DAYS);

  const gestationMs = today.getTime() - lmpDate.getTime();
  const gestationDays = Math.trunc(gestationMs / MS_PER_DAY);
  const conceived = gestationDays >= 0;
  const gestationWeeks = Math.floor(Math.max(0, gestationDays) / 7);
  const gestationDaysRemainder = Math.max(0, gestationDays) % 7;

  let trimester: 1 | 2 | 3 | null = null;
  if (conceived) {
    if (gestationWeeks <= 12) trimester = 1;
    else if (gestationWeeks <= 27) trimester = 2;
    else trimester = 3;
  }

  const daysUntilDue = Math.trunc(
    (dueDate.getTime() - today.getTime()) / MS_PER_DAY
  );
  const pastDue = daysUntilDue < 0;

  return {
    dueDate,
    lmpDate,
    conceptionDate,
    gestationDays,
    gestationWeeks,
    gestationDaysRemainder,
    trimester,
    daysUntilDue,
    pastDue,
    conceived,
  };
}

function trimesterLabel(t: 1 | 2 | 3 | null): string {
  if (t === 1) return "1st trimester";
  if (t === 2) return "2nd trimester";
  if (t === 3) return "3rd trimester";
  return "—";
}

export function PregnancyDueDateCalculator({ tool }: { tool: ToolDefinition }) {
  const today = React.useMemo(() => new Date(), []);
  const [mode, setMode] = React.useState<Mode>("lmp");
  const [lmpInput, setLmpInput] = React.useState<string>("");
  const [conceptionInput, setConceptionInput] = React.useState<string>("");

  // Tick once a day boundary crosses; cheap — we just need today recalculated
  // if the user keeps the page open past midnight.
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const activeValue = mode === "lmp" ? lmpInput : conceptionInput;
  const parsed = parseDateInput(activeValue);
  const valid = parsed instanceof Date && !Number.isNaN(parsed.getTime());

  const futureInput = valid && parsed!.getTime() > today.getTime();

  const calc = React.useMemo<CalcResult | null>(() => {
    if (!valid || !parsed || futureInput) return null;
    return compute(parsed, mode, today);
  }, [valid, parsed, mode, futureInput, today, tick]);

  const switchMode = (m: Mode) => {
    // When switching modes, carry the equivalent date across so users don't
    // lose their work.
    if (m === mode) return;
    if (valid && parsed) {
      if (m === "lmp") {
        // coming from conception -> set lmp = conception - 14
        setLmpInput(toDateInputValue(addDays(parsed, -LMP_TO_CONCEPTION_DAYS)));
      } else {
        // coming from lmp -> set conception = lmp + 14
        setConceptionInput(toDateInputValue(addDays(parsed, LMP_TO_CONCEPTION_DAYS)));
      }
    }
    setMode(m);
  };

  const reset = () => {
    setMode("lmp");
    setLmpInput("");
    setConceptionInput("");
  };

  const summary = calc
    ? `Due date: ${formatPrettyDate(calc.dueDate)} (${formatInt(Math.max(0, calc.daysUntilDue))} days from today). Gestational age: ${calc.gestationWeeks}w ${calc.gestationDaysRemainder}d (${trimesterLabel(calc.trimester)}). LMP: ${toDateInputValue(calc.lmpDate)}, Conception: ${toDateInputValue(calc.conceptionDate)}.`
    : "";

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="space-y-2">
            <Label>Calculation method</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => switchMode(v as Mode)}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              <label
                htmlFor="pdc-mode-lmp"
                className="flex cursor-pointer items-start gap-2 rounded-md border bg-background p-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem id="pdc-mode-lmp" value="lmp" className="mt-0.5" />
                <span>
                  <span className="block font-medium">Last menstrual period</span>
                  <span className="block text-xs text-muted-foreground">
                    Due date = LMP + 280 days (Naegele&apos;s rule)
                  </span>
                </span>
              </label>
              <label
                htmlFor="pdc-mode-conception"
                className="flex cursor-pointer items-start gap-2 rounded-md border bg-background p-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem
                  id="pdc-mode-conception"
                  value="conception"
                  className="mt-0.5"
                />
                <span>
                  <span className="block font-medium">Conception date</span>
                  <span className="block text-xs text-muted-foreground">
                    Due date = conception + 266 days
                  </span>
                </span>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdc-date" className="flex items-center gap-1.5">
              {mode === "lmp" ? (
                <>
                  <CalendarDays className="h-4 w-4 text-primary" /> Last menstrual period (LMP)
                </>
              ) : (
                <>
                  <HeartPulse className="h-4 w-4 text-primary" /> Conception date
                </>
              )}
            </Label>
            <Input
              id="pdc-date"
              type="date"
              value={activeValue}
              onChange={(e) =>
                mode === "lmp"
                  ? setLmpInput(e.target.value)
                  : setConceptionInput(e.target.value)
              }
              max={toDateInputValue(today)}
            />
            <p className="text-xs text-muted-foreground">
              {mode === "lmp"
                ? "First day of your last period. The due date is computed 280 days later."
                : "Date of conception (or estimated ovulation). The due date is computed 266 days later."}
            </p>
          </div>

          {valid && futureInput && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              The entered date is in the future. Pick a date on or before today.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">How it works:</span>{" "}
              Naegele&apos;s rule adds 280 days (40 weeks) to the first day of the last
              menstrual period. Conception typically occurs ~14 days later, so the
              conception-based estimate adds 266 days. Gestational age is counted from
              the LMP — that&apos;s why a “40-week” pregnancy is really ~38 weeks from
              conception.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Estimated due date</h3>
            {calc && <CopyButton value={summary} size="sm" />}
          </div>

          {!valid && (
            <p className="text-sm text-muted-foreground">
              Enter a date to estimate the due date and current gestational age.
            </p>
          )}

          {valid && futureInput && (
            <p className="text-sm text-rose-600 dark:text-rose-400">
              The entered date is in the future — pick a valid past date.
            </p>
          )}

          {calc && (
            <>
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Baby className="h-3.5 w-3.5 text-primary" /> Estimated due date
                </div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                  {formatPrettyDate(calc.dueDate)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {calc.pastDue ? (
                    <>
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        {formatInt(Math.abs(calc.daysUntilDue))} days past the estimated date.
                      </span>{" "}
                      Contact your healthcare provider.
                    </>
                  ) : calc.daysUntilDue === 0 ? (
                    "Estimated due date is today."
                  ) : (
                    <>
                      {formatInt(calc.daysUntilDue)} days remaining ({Math.ceil(calc.daysUntilDue / 7)} weeks)
                    </>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-background p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5 text-primary" /> Gestational age
                  </div>
                  <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">
                    {calc.gestationWeeks}
                    <span className="ml-1 text-base font-normal text-muted-foreground">w</span>{" "}
                    {calc.gestationDaysRemainder}
                    <span className="ml-1 text-base font-normal text-muted-foreground">d</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {formatInt(Math.max(0, calc.gestationDays))} days since LMP
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Stethoscope className="h-3.5 w-3.5 text-primary" /> Trimester
                  </div>
                  <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">
                    {calc.trimester ? `${calc.trimester}` : "—"}
                    <span className="ml-1 text-base font-normal text-muted-foreground">
                      {calc.trimester ? `(${calc.trimester === 1 ? "wk 1–12" : calc.trimester === 2 ? "wk 13–27" : "wk 28–40"})` : ""}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {trimesterLabel(calc.trimester)}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                  <span className="text-sm text-muted-foreground">Last menstrual period (LMP)</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {formatPrettyDate(calc.lmpDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                  <span className="text-sm text-muted-foreground">Estimated conception date</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {formatPrettyDate(calc.conceptionDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                  <span className="text-sm text-muted-foreground">Days until due date</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {calc.pastDue
                      ? `−${formatInt(Math.abs(calc.daysUntilDue))} (overdue)`
                      : formatInt(calc.daysUntilDue)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                <p>
                  <span className="font-semibold">Estimate only.</span> Only about
                  5% of babies arrive on their estimated due date. Full-term
                  pregnancies range from 37 to 42 weeks. Always consult your
                  healthcare provider for medical advice, dating scans and
                  individualised care.
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
      "Estimate your pregnancy due date from either the first day of your last menstrual period (Naegele’s rule: +280 days) or the date of conception (+266 days). See your current gestational age in weeks and days, current trimester and how many days remain until the estimated due date. All processing runs locally in your browser.",
    tool: toolBody,
    howTo: [
      {
        title: "Pick a calculation method",
        description:
          "Choose “Last menstrual period” (default) or “Conception date”. Switching modes carries the equivalent date across so you don’t lose your entry.",
      },
      {
        title: "Enter the date",
        description:
          "Type or pick the LMP or conception date. The date cannot be in the future. The due date is computed from this single input.",
      },
      {
        title: "Read the estimated due date",
        description:
          "The big number shows the estimated due date with the number of days remaining (or overdue). Gestational age, trimester and the equivalent LMP / conception date are listed below.",
      },
      {
        title: "Copy or share the summary",
        description:
          "Use Copy to put a one-line summary on your clipboard. Discuss the result with your healthcare provider — this tool is for informational purposes only.",
      },
    ],
    useCases: [
      "Get a quick first-pass due date before your first prenatal appointment.",
      "Track your current gestational week and trimester as the pregnancy progresses.",
      "Plan maternity leave, baby shower or nursery milestones around the estimated date.",
      "Cross-check the date from an ultrasound scan against the LMP-based estimate.",
    ],
    limitations: (
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <p>
            <span className="font-semibold">Estimate only — consult your healthcare provider.</span>{" "}
            This tool provides a statistical estimate based on a 28-day cycle with ovulation on day 14.
            It does not account for cycle-length variation, irregular cycles, IVF transfer dates,
            multiple pregnancies or medical history. Ultrasound dating in the first trimester is more
            accurate and should override this estimate. Always consult a qualified healthcare
            professional for medical advice.
          </p>
        </div>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Naegele&apos;s rule assumes a 28-day cycle. If your cycles are longer or shorter, the
            LMP-based estimate may be off by several days — a dating ultrasound is more accurate.
          </li>
          <li>
            Gestational age is counted from the LMP, not from conception. A “40-week” pregnancy
            corresponds to ~38 weeks from fertilisation.
          </li>
          <li>
            Trimester boundaries follow the common convention: 1st = weeks 1–12, 2nd = weeks 13–27,
            3rd = weeks 28–40. Some clinicians use slightly different cutoffs.
          </li>
          <li>
            Only about 5% of babies are born on their estimated due date; the normal delivery window
            is 37–42 weeks.
          </li>
        </ul>
      </div>
    ),
    faq: [
      {
        q: "What is Naegele’s rule?",
        a: "Naegele’s rule estimates the due date by adding 280 days (40 weeks) to the first day of the last menstrual period. It assumes a 28-day cycle with ovulation on day 14, so conception-based estimates add 266 days instead.",
      },
      {
        q: "Why is gestational age counted from the LMP, not conception?",
        a: "Because the LMP is observable while conception is not, medical convention counts gestational age from the LMP. A pregnancy is “40 weeks” from the LMP, which is about 38 weeks from conception.",
      },
      {
        q: "How accurate is the estimate?",
        a: "Only about 5% of babies arrive on the estimated date. First-trimester ultrasound dating is more accurate (±5–7 days) and should override the LMP-based estimate when they disagree.",
      },
      {
        q: "Can I use an IVF transfer date instead?",
        a: "Not directly with this tool. For IVF, treat the transfer date as conception minus the embryo age (e.g. a Day-5 embryo transfer → conception ≈ transfer date + 5 days, then add 266 days).",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
