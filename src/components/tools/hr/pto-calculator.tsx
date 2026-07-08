"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  CalendarCheck,
  CalendarClock,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Plane,
  Sun,
  PiggyBank,
  CalendarX,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { toast } from "sonner";
import { formatInt, formatNumber, parseDateInput, toDateInputValue } from "./_hr-helpers";

type AccrualRate = "monthly" | "quarterly" | "annual";

interface CalcResult {
  currentBalance: number;
  accruedSoFar: number;
  projectedYearEnd: number;
  daysCanStillTake: number;
  accrualPeriodsPerYear: number;
  accrualPerPeriod: number;
  periodsElapsed: number;
  periodsRemaining: number;
  willLose: number;
  lossWarning: boolean;
  usedRatioPct: number;
  accruedRatioPct: number;
}

/**
 * Compute PTO balance, year-end projection and loss warnings.
 *
 * Accrual model:
 *   - annual: all allowance granted at start of accrual year
 *   - monthly: allowance / 12 granted at start of each month
 *   - quarterly: allowance / 4 granted at start of each quarter
 *
 * `accruedSoFar` is computed from the start of the accrual year (Jan 1 by
 * default) to `currentDate`. `currentBalance` = accruedSoFar - ptoUsed.
 */
function computePTO(
  annualAllowance: number,
  accruedSoFarInput: number,
  ptoUsed: number,
  rate: AccrualRate,
  currentDate: Date,
  carryoverCap: number
): CalcResult | null {
  if (annualAllowance < 0 || ptoUsed < 0) return null;

  // Determine the accrual-year start (Jan 1 of the current year).
  const yearStart = new Date(currentDate.getFullYear(), 0, 1);
  const yearEnd = new Date(currentDate.getFullYear(), 11, 31);

  // Accrual periods.
  let accrualPeriodsPerYear = 1;
  let periodsElapsed = 1;
  let periodsRemaining = 0;
  let accrualPerPeriod = annualAllowance;
  if (rate === "monthly") {
    accrualPeriodsPerYear = 12;
    accrualPerPeriod = annualAllowance / 12;
    periodsElapsed = currentDate.getMonth() + 1;
    periodsRemaining = 12 - periodsElapsed;
  } else if (rate === "quarterly") {
    accrualPeriodsPerYear = 4;
    accrualPerPeriod = annualAllowance / 4;
    periodsElapsed = Math.floor(currentDate.getMonth() / 3) + 1;
    periodsRemaining = 4 - periodsElapsed;
  } else {
    // annual — full allowance granted on Jan 1.
    accrualPeriodsPerYear = 1;
    accrualPerPeriod = annualAllowance;
    periodsElapsed = 1;
    periodsRemaining = 0;
  }

  // The user can override the accrued-so-far figure with their paystub number.
  // If they leave it 0 or blank, we compute it from the rate.
  let accruedSoFar: number;
  if (accruedSoFarInput > 0) {
    accruedSoFar = accruedSoFarInput;
  } else {
    accruedSoFar = accrualPerPeriod * periodsElapsed;
  }

  const currentBalance = accruedSoFar - ptoUsed;
  const projectedYearEnd = annualAllowance - ptoUsed;

  // Loss warning: if projected year-end balance exceeds the carryover cap,
  // the employee will lose the excess at year rollover.
  const willLose = Math.max(0, projectedYearEnd - carryoverCap);
  const lossWarning = willLose > 0;

  // Days they can still take without losing PTO at year end = projected year-end
  // minus carryover cap (so they end the year exactly at the cap). Capped at >= 0.
  const daysCanStillTake = Math.max(0, projectedYearEnd - carryoverCap);

  const usedRatioPct = annualAllowance > 0 ? (ptoUsed / annualAllowance) * 100 : 0;
  const accruedRatioPct = annualAllowance > 0 ? (accruedSoFar / annualAllowance) * 100 : 0;

  // suppress unused warnings — these are returned in the result
  void yearStart;
  void yearEnd;

  return {
    currentBalance,
    accruedSoFar,
    projectedYearEnd,
    daysCanStillTake,
    accrualPeriodsPerYear,
    accrualPerPeriod,
    periodsElapsed,
    periodsRemaining,
    willLose,
    lossWarning,
    usedRatioPct,
    accruedRatioPct,
  };
}

export function PtoCalculator({ tool }: { tool: ToolDefinition }) {
  const today = React.useMemo(() => new Date(), []);
  const [allowance, setAllowance] = React.useState("25");
  const [accruedInput, setAccruedInput] = React.useState("");
  const [used, setUsed] = React.useState("8");
  const [rate, setRate] = React.useState<AccrualRate>("monthly");
  const [currentDate, setCurrentDate] = React.useState(toDateInputValue(today));
  const [carryoverCap, setCarryoverCap] = React.useState("5");

  const result = React.useMemo(() => {
    const d = parseDateInput(currentDate);
    if (!d) return null;
    return computePTO(
      Number(allowance) || 0,
      Number(accruedInput) || 0,
      Number(used) || 0,
      rate,
      d,
      Number(carryoverCap) || 0
    );
  }, [allowance, accruedInput, used, rate, currentDate, carryoverCap]);

  const reset = () => {
    setAllowance("25");
    setAccruedInput("");
    setUsed("8");
    setRate("monthly");
    setCurrentDate(toDateInputValue(new Date()));
    setCarryoverCap("5");
    toast.success("Reset");
  };

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pto-allowance">Annual PTO allowance (days)</Label>
              <Input
                id="pto-allowance"
                type="number"
                min={0}
                step={0.5}
                value={allowance}
                onChange={(e) => setAllowance(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pto-used">PTO used so far (days)</Label>
              <Input
                id="pto-used"
                type="number"
                min={0}
                step={0.5}
                value={used}
                onChange={(e) => setUsed(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pto-accrued">PTO accrued so far (days)</Label>
              <Input
                id="pto-accrued"
                type="number"
                min={0}
                step={0.5}
                value={accruedInput}
                onChange={(e) => setAccruedInput(e.target.value)}
                placeholder="Auto-calculated if blank"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to auto-calculate from the accrual rate. Or enter the exact figure
                from your latest paystub for precision.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pto-carryover">Carryover cap (days)</Label>
              <Input
                id="pto-carryover"
                type="number"
                min={0}
                step={0.5}
                value={carryoverCap}
                onChange={(e) => setCarryoverCap(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Max unused PTO you can roll into next year. Set 0 for use-it-or-lose-it policies.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Accrual rate</Label>
              <Select value={rate} onValueChange={(v) => setRate(v as AccrualRate)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual (lump sum on Jan 1)</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pto-date">Current date</Label>
              <Input
                id="pto-date"
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <PiggyBank className="h-4 w-4 text-primary" /> Your PTO balance
          </h3>
          {!result && (
            <p className="text-sm text-muted-foreground">
              Enter your PTO allowance, used days and accrual rate to see your current balance,
              projected year-end balance and loss warnings.
            </p>
          )}
          {result && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <CalendarCheck className="h-3.5 w-3.5 text-primary" /> Current balance
                  </div>
                  <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-primary">
                    {formatNumber(result.currentBalance, { maximumFractionDigits: 1 })}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">days available now</div>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" /> Projected year-end
                  </div>
                  <div className="mt-1 font-mono text-3xl font-bold tabular-nums">
                    {formatNumber(result.projectedYearEnd, { maximumFractionDigits: 1 })}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">days at Dec 31</div>
                </div>
              </div>

              {result.lossWarning ? (
                <Alert variant="destructive" className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="text-amber-900 dark:text-amber-100">
                    You will lose {formatNumber(result.willLose, { maximumFractionDigits: 1 })} day(s) at year-end
                  </AlertTitle>
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    Your projected year-end balance exceeds your carryover cap of {carryoverCap} day(s).
                    Plan to take {formatNumber(result.daysCanStillTake, { maximumFractionDigits: 1 })} more day(s)
                    of PTO before Dec 31 to avoid losing it.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
                  <p className="flex items-center gap-2">
                    <CalendarX className="h-4 w-4" />
                    No loss risk — you&apos;re under your carryover cap. You can take up to{" "}
                    <span className="font-mono font-semibold">
                      {formatNumber(Math.max(0, result.currentBalance), { maximumFractionDigits: 1 })}
                    </span>{" "}
                    more day(s) without exceeding the cap.
                  </p>
                </div>
              )}

              <div className="space-y-3 rounded-lg border bg-background p-3">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" /> Accrued
                    </span>
                    <span className="font-mono font-medium">
                      {formatNumber(result.accruedSoFar, { maximumFractionDigits: 1 })} / {allowance || "0"} days
                      {" "}
                      ({result.accruedRatioPct.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={Math.min(100, result.accruedRatioPct)} className="mt-1.5 h-1.5" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Plane className="h-3.5 w-3.5 text-primary" /> Used
                    </span>
                    <span className="font-mono font-medium">
                      {formatNumber(Number(used) || 0, { maximumFractionDigits: 1 })} / {allowance || "0"} days
                      {" "}
                      ({result.usedRatioPct.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={Math.min(100, result.usedRatioPct)} className="mt-1.5 h-1.5" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md border bg-background p-2">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <CalendarClock className="h-3 w-3" /> Periods left
                  </div>
                  <div className="mt-0.5 font-mono text-base font-bold tabular-nums">
                    {formatInt(result.periodsRemaining)}
                  </div>
                </div>
                <div className="rounded-md border bg-background p-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Per period
                  </div>
                  <div className="mt-0.5 font-mono text-base font-bold tabular-nums">
                    {formatNumber(result.accrualPerPeriod, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="rounded-md border bg-background p-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Periods/year
                  </div>
                  <div className="mt-0.5 font-mono text-base font-bold tabular-nums">
                    {formatInt(result.accrualPeriodsPerYear)}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-background p-3 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <Sun className="h-3.5 w-3.5 text-primary" />
                  Tip: schedule {formatNumber(result.daysCanStillTake, { maximumFractionDigits: 1 })} day(s)
                  of PTO before Dec 31 to land exactly at your carryover cap and lose nothing.
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
      "Track your paid time off balance and project where you'll land at year end. Enter your annual allowance, days used so far and accrual rate (monthly, quarterly or annual lump sum), and Dueneo calculates your current balance, projected year-end balance and warns you if you're about to lose unused PTO to a carryover cap. Everything runs locally in your browser.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter your annual PTO allowance",
        description:
          "Type the total paid-time-off days you earn per year (e.g. 25). Use decimals if you accrue in half-day increments.",
      },
      {
        title: "Enter days used and (optionally) accrued so far",
        description:
          "Days used is what you've already taken. Accrued so far is optional — leave it blank to auto-calculate from the accrual rate, or enter the exact figure from your latest paystub for precision.",
      },
      {
        title: "Pick the accrual rate and current date",
        description:
          "Monthly grants 1/12 of the allowance on the 1st of each month. Quarterly grants 1/4 on Jan 1, Apr 1, Jul 1, Oct 1. Annual grants the full allowance on Jan 1.",
      },
      {
        title: "Set your carryover cap and read the warning",
        description:
          "The carryover cap is the max unused PTO you can roll into next year. If your projected year-end balance exceeds the cap, Dueneo warns you exactly how many days you'll lose and how many more you should take.",
      },
    ],
    useCases: [
      "Plan end-of-year vacation to use up PTO before a use-it-or-lose-it deadline.",
      "Check whether you've used PTO at a sustainable rate through the year (accrued vs used).",
      "Negotiate a PTO cash-out at job change by knowing your exact accrued balance.",
      "Compare two job offers' effective PTO value (allowance + carryover policy).",
      "Model a mid-year promotion that bumps your accrual rate.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The accrual year is assumed to be the calendar year (Jan 1 – Dec 31). Some employers
          use a fiscal-year or hire-date anniversary accrual year. For those, shift the current
          date input accordingly or compute manually.
        </li>
        <li>
          Accrual is granted at the start of each period (1st of the month, 1st of the quarter,
          Jan 1). Some employers grant on the last day of the period or prorate mid-period
          joins — adjust the accrued-so-far input to match your paystub.
        </li>
        <li>
          Carryover caps vary widely: some employers allow unlimited carryover, some cap at a
          fixed number of days, some pay out unused PTO at year end, some forfeit it entirely.
          Match the cap to your employee handbook.
        </li>
        <li>
          The tool does not model negative balances (PTO borrowing). If you&apos;ve used more than
          you&apos;ve accrued, the current balance will show as negative — that&apos;s correct,
          but the year-end projection assumes you&apos;ll have earned the full allowance by Dec 31.
        </li>
        <li>
          PTO cash-out value, sick-leave conversion and floating-holiday rules are not modelled.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What's the difference between \"accrued so far\" and \"current balance\"?",
        a: "Accrued so far is the total PTO you've earned year-to-date. Current balance = accrued so far − PTO used. If you leave accrued blank, Dueneo calculates it from the accrual rate and the current date.",
      },
      {
        q: "How is the projected year-end balance calculated?",
        a: "Projected year-end = annual allowance − PTO used. This assumes you take no more PTO for the rest of the year. If your projected balance exceeds your carryover cap, you'll lose the excess at year rollover.",
      },
      {
        q: "What does \"days can still take\" mean?",
        a: "It's the projected year-end balance minus the carryover cap — the number of additional PTO days you should take before Dec 31 to land exactly at your cap and lose nothing. If it's 0, you're already at or under the cap.",
      },
      {
        q: "Can I model a fiscal-year accrual (not Jan 1 – Dec 31)?",
        a: "Not directly. The accrual year is fixed to the calendar year. To model a fiscal year, shift the current-date input by the offset (e.g. for a July–June fiscal year, enter a date 6 months earlier).",
      },
      {
        q: "Does this work for hourly / part-time employees?",
        a: "Part-time accrual is often prorated. Enter the prorated annual allowance (e.g. 12.5 days for a half-time employee with a 25-day full-time allowance) and the math holds. Hourly PTO accrual (per-hour-worked) is not modelled.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
