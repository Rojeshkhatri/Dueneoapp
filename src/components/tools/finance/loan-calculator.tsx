"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Calendar, Percent } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  monthlyPayment,
  amortisationSchedule,
  FINANCE_DISCLAIMER,
} from "./_finance-helpers";

export function LoanCalculator({ tool }: { tool: ToolDefinition }) {
  const [principal, setPrincipal] = React.useState<string>("250000");
  const [rate, setRate] = React.useState<string>("7.5");
  const [years, setYears] = React.useState<string>("15");
  const currency = "USD";

  const principalNum = Math.max(0, parseNumber(principal));
  const rateNum = parseNumber(rate);
  const yearsNum = Math.max(0, parseNumber(years));

  const payment = monthlyPayment(principalNum, rateNum, yearsNum);
  const totalPayments = payment * Math.max(1, Math.round(yearsNum * 12));
  const totalInterest = Math.max(0, totalPayments - principalNum);

  // Amortisation is cheap (≤12 rows of arithmetic) so we compute it inline
  // rather than memoising — keeps the React Compiler happy.
  const schedule = amortisationSchedule(principalNum, rateNum, yearsNum, 12);

  const reset = () => {
    setPrincipal("250000");
    setRate("7.5");
    setYears("15");
    toast.info("Reset.");
  };

  const summary = `Loan summary
Principal: ${formatCurrency(principalNum, { currency })}
Annual rate: ${rateNum.toFixed(3)}%
Term: ${yearsNum} years (${Math.round(yearsNum * 12)} months)
Monthly payment: ${formatCurrency(payment, { currency })}
Total payment: ${formatCurrency(totalPayments, { currency })}
Total interest: ${formatCurrency(totalInterest, { currency })}`;

  const content: ToolContent = {
    intro:
      "Estimate the monthly payment, total cost and total interest of an amortising loan such as a personal loan, car finance or student loan. Enter the principal, annual interest rate and term in years — the schedule previews the first 12 months so you can see how each payment splits between interest and principal.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="ln-principal">Loan principal</Label>
              <Input
                id="ln-principal"
                inputMode="decimal"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ln-rate">Annual interest rate (%)</Label>
                <Input
                  id="ln-rate"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ln-years">Term (years)</Label>
                <Input
                  id="ln-years"
                  inputMode="decimal"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Result</h3>
              <CopyButton value={summary} size="sm" />
            </div>

            <div className="grid gap-2">
              <Row
                label="Monthly payment"
                value={formatCurrency(payment, { currency })}
                large
              />
              <Row
                label="Total payment"
                value={formatCurrency(totalPayments, { currency })}
                hint={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
              />
              <Row
                label="Total interest"
                value={formatCurrency(totalInterest, { currency })}
                highlight
                hint={<Percent className="h-3.5 w-3.5 text-amber-500" />}
              />
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
              <p>
                Annuity formula: <code className="rounded bg-background px-1 py-0.5">P × r × (1+r)ⁿ / ((1+r)ⁿ − 1)</code>, where{" "}
                <code className="rounded bg-background px-1 py-0.5">r</code> is the monthly
                rate and <code className="rounded bg-background px-1 py-0.5">n</code> is the
                number of months.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Amortisation preview (first 12 months)</h3>
          <p className="text-xs text-muted-foreground">
            See how each early payment splits between interest and principal. The interest
            share shrinks as the balance falls.
          </p>
          <div className="mt-4 max-h-96 overflow-y-auto rounded-lg border bg-background pr-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Month</TableHead>
                  <TableHead className="text-right">Payment</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      Enter loan details above to preview the schedule.
                    </TableCell>
                  </TableRow>
                ) : (
                  schedule.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(row.payment, { currency })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-amber-600 dark:text-amber-500">
                        {formatCurrency(row.interest, { currency })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-500">
                        {formatCurrency(row.principal, { currency })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(row.balance, { currency })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter the principal",
        description:
          "Type the loan amount you intend to borrow. Defaults to 250,000 to make the example tangible.",
      },
      {
        title: "Enter the annual interest rate",
        description:
          "Use the nominal annual percentage rate (APR) quoted by your lender. A 7.5% APR means typing 7.5.",
      },
      {
        title: "Enter the term in years",
        description:
          "Specify the loan duration. A 15-year loan means typing 15 — the calculator converts to 180 months internally.",
      },
      {
        title: "Read the schedule",
        description:
          "Monthly payment, total payment and total interest update live. The first 12 months of the amortisation schedule are shown to illustrate the interest-vs-principal split.",
      },
    ],
    useCases: [
      "Compare a 15-year vs 30-year loan on the same principal to see interest savings.",
      "Estimate the monthly payment on a car finance quote before signing.",
      "Stress-test a personal loan repayment against a higher interest rate.",
      "Understand why early payments are interest-heavy and how that shifts over time.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          The model assumes a fixed interest rate and level monthly payments (annuity
          structure). Variable-rate, interest-only and balloon loans are not modelled.
        </li>
        <li>
          Origination fees, insurance, taxes and early-repayment penalties are excluded.
          Add the fee to the principal to approximate its effect.
        </li>
        <li>
          Day-count conventions differ between lenders; small discrepancies (typically
          &lt; 1%) may appear when compared to your bank's quote.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What is the difference between APR and interest rate?",
        a: "The interest rate is the cost of borrowing the principal. The APR (annual percentage rate) includes certain fees and is the better comparator between lenders. Type the APR here for the most realistic estimate.",
      },
      {
        q: "Why is interest higher in the early months?",
        a: "Each month's interest is computed on the remaining balance. Early in the loan the balance is highest, so the interest share of each payment is largest. As the principal is paid down, more of each payment goes to principal.",
      },
      {
        q: "Does this handle extra payments?",
        a: "Not directly. To model extra payments, reduce the principal or shorten the term — that gives an equivalent monthly payment without the complexity of tracking ad-hoc prepayments.",
      },
      {
        q: "Is this a loan offer?",
        a: "No. It is an estimate based on standard annuity maths. Your actual repayment will depend on the lender's underwriting, fees and the day-count convention they use.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Row({
  label,
  value,
  highlight,
  large,
  hint,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  large?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          "text-sm " + (highlight ? "font-medium text-primary" : "text-muted-foreground")
        }
      >
        {label}
      </span>
      <span
        className={
          "flex items-center gap-1.5 font-mono tabular-nums " +
          (large
            ? "text-2xl font-semibold text-foreground"
            : highlight
              ? "text-base font-semibold text-primary"
              : "text-base text-foreground")
        }
      >
        {hint}
        {value}
      </span>
    </div>
  );
}
