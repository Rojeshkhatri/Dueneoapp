"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  RotateCcw,
  Calendar,
  PiggyBank,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatNumber,
  FINANCE_DISCLAIMER,
} from "./_finance-helpers";

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "CAD", symbol: "$" },
  { code: "AUD", symbol: "$" },
  { code: "INR", symbol: "₹" },
  { code: "JPY", symbol: "¥" },
  { code: "CNY", symbol: "¥" },
];

const MAX_MONTHS = 1200; // 100-year sanity cap

interface PayoffResult {
  months: number | null;
  totalInterest: number;
  totalPaid: number;
  series: { month: number; balance: number }[];
  underpaid: boolean; // true if monthly payment didn't cover interest
}

/**
 * Simulate a loan payoff month-by-month.
 *
 * @param balance      starting balance
 * @param annualRatePct nominal annual interest rate
 * @param basePayment  minimum monthly payment (principal + interest portion)
 * @param extraMonthly extra amount added on top every month
 * @param lumpSum      one-time extra principal payment
 * @param lumpMonth    the month number (1-indexed) at which the lump sum is applied
 */
function simulatePayoff(
  balance: number,
  annualRatePct: number,
  basePayment: number,
  extraMonthly: number,
  lumpSum: number,
  lumpMonth: number
): PayoffResult {
  const monthlyRate = annualRatePct / 100 / 12;
  let bal = Math.max(0, balance);
  const payment = Math.max(0, basePayment) + Math.max(0, extraMonthly);
  let totalInterest = 0;
  let totalPaid = 0;
  let underpaid = false;
  const series: { month: number; balance: number }[] = [{ month: 0, balance: bal }];

  for (let m = 1; m <= MAX_MONTHS; m++) {
    // Apply lump sum at the start of the specified month, before interest.
    if (m === lumpMonth && lumpSum > 0) {
      bal = Math.max(0, bal - lumpSum);
      totalPaid += lumpSum;
    }
    if (bal <= 0) {
      series.push({ month: m - 1, balance: 0 });
      return { months: m - 1, totalInterest, totalPaid, series, underpaid };
    }
    const interest = bal * monthlyRate;
    let principalPaid = payment - interest;
    if (principalPaid <= 0) {
      // Payment does not cover interest — balance grows. Bail out.
      underpaid = true;
      series.push({ month: m, balance: bal + interest - payment });
      return { months: null, totalInterest, totalPaid, series, underpaid };
    }
    if (principalPaid > bal) principalPaid = bal;
    bal = Math.max(0, bal - principalPaid);
    totalInterest += interest;
    totalPaid += interest + principalPaid;
    // Sample every month (we'll downsample in the chart).
    series.push({ month: m, balance: bal });
    if (bal <= 0.005) {
      return { months: m, totalInterest, totalPaid, series, underpaid };
    }
  }
  return { months: null, totalInterest, totalPaid, series, underpaid };
}

function fmtMonths(months: number | null): string {
  if (months === null) return "Never (underpaid)";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
}

export function LoanPayoffSimulator({ tool }: { tool: ToolDefinition }) {
  const [balance, setBalance] = React.useState("20000");
  const [rate, setRate] = React.useState("18.9");
  const [minPayment, setMinPayment] = React.useState("400");
  const [extraMonthly, setExtraMonthly] = React.useState("150");
  const [lumpSum, setLumpSum] = React.useState("2000");
  const [lumpMonth, setLumpMonth] = React.useState("1");
  const [currencyCode, setCurrencyCode] = React.useState("USD");
  const currency = currencyCode;

  const bal = Math.max(0, parseNumber(balance));
  const annualRate = parseNumber(rate);
  const minPay = Math.max(0, parseNumber(minPayment));
  const extra = Math.max(0, parseNumber(extraMonthly));
  const lump = Math.max(0, parseNumber(lumpSum));
  const lumpM = Math.max(1, Math.round(parseNumber(lumpMonth)));

  const base = React.useMemo(
    () => simulatePayoff(bal, annualRate, minPay, 0, 0, 1),
    [bal, annualRate, minPay]
  );
  const withExtra = React.useMemo(
    () => simulatePayoff(bal, annualRate, minPay, extra, lump, lumpM),
    [bal, annualRate, minPay, extra, lump, lumpM]
  );

  const monthsSaved =
    base.months !== null && withExtra.months !== null
      ? base.months - withExtra.months
      : null;
  const interestSaved = Math.max(0, base.totalInterest - withExtra.totalInterest);

  const reset = () => {
    setBalance("20000");
    setRate("18.9");
    setMinPayment("400");
    setExtraMonthly("150");
    setLumpSum("2000");
    setLumpMonth("1");
    setCurrencyCode("USD");
    toast.info("Reset to defaults.");
  };

  // Downsample series to at most ~120 points for chart performance.
  const chartData = React.useMemo(() => {
    const maxLen = Math.max(base.series.length, withExtra.series.length);
    const step = Math.max(1, Math.ceil(maxLen / 120));
    const out: { month: number; baseline: number | null; accelerated: number | null }[] = [];
    for (let i = 0; i < maxLen; i += step) {
      const b = base.series[i];
      const w = withExtra.series[i];
      out.push({
        month: i,
        baseline: b ? Math.round(b.balance) : null,
        accelerated: w ? Math.round(w.balance) : null,
      });
    }
    // Always include final point.
    const lastBase = base.series[base.series.length - 1];
    const lastWith = withExtra.series[withExtra.series.length - 1];
    const lastMonth = Math.max(
      lastBase ? lastBase.month : 0,
      lastWith ? lastWith.month : 0
    );
    if (out.length === 0 || out[out.length - 1].month !== lastMonth) {
      out.push({
        month: lastMonth,
        baseline: lastBase ? Math.round(lastBase.balance) : null,
        accelerated: lastWith ? Math.round(lastWith.balance) : null,
      });
    }
    return out;
  }, [base, withExtra]);

  const summary = `Loan payoff simulation
Balance: ${formatCurrency(bal, { currency })}
Annual rate: ${annualRate.toFixed(3)}%
Minimum payment: ${formatCurrency(minPay, { currency })}
Extra monthly: ${formatCurrency(extra, { currency })}
Lump sum: ${formatCurrency(lump, { currency })} at month ${lumpM}

Without extra:
  Payoff time: ${fmtMonths(base.months)}
  Total interest: ${formatCurrency(base.totalInterest, { currency })}
  Total paid: ${formatCurrency(base.totalPaid, { currency })}

With extra + lump sum:
  Payoff time: ${fmtMonths(withExtra.months)}
  Total interest: ${formatCurrency(withExtra.totalInterest, { currency })}
  Total paid: ${formatCurrency(withExtra.totalPaid, { currency })}

Months saved: ${monthsSaved === null ? "—" : monthsSaved}
Interest saved: ${formatCurrency(interestSaved, { currency })}`;

  const content: ToolContent = {
    intro:
      "See how extra payments and a one-time lump sum accelerate loan payoff. Enter the loan balance, interest rate and the minimum monthly payment, then add an extra monthly amount and an optional lump sum at a chosen month. The simulator compares payoff time, total interest and months saved against the baseline schedule.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lp-balance">Loan balance</Label>
                <Input
                  id="lp-balance"
                  inputMode="decimal"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lp-rate">Annual interest rate (%)</Label>
                <Input
                  id="lp-rate"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lp-min">Minimum monthly payment</Label>
              <Input
                id="lp-min"
                inputMode="decimal"
                value={minPayment}
                onChange={(e) => setMinPayment(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-primary">
                Acceleration options
              </h4>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lp-extra">Extra monthly payment</Label>
                  <Input
                    id="lp-extra"
                    inputMode="decimal"
                    value={extraMonthly}
                    onChange={(e) => setExtraMonthly(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lp-cur">Currency</Label>
                  <Select value={currencyCode} onValueChange={setCurrencyCode}>
                    <SelectTrigger id="lp-cur" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} ({c.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lp-lump">One-time lump sum</Label>
                  <Input
                    id="lp-lump"
                    inputMode="decimal"
                    value={lumpSum}
                    onChange={(e) => setLumpSum(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lp-lumpm">Lump sum applied at month</Label>
                  <Input
                    id="lp-lumpm"
                    inputMode="numeric"
                    value={lumpMonth}
                    onChange={(e) => setLumpMonth(e.target.value)}
                    placeholder="1"
                  />
                </div>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Results</h3>
              <CopyButton value={summary} size="sm" />
            </div>

            {(base.underpaid || withExtra.underpaid) && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-400/60 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                <div>
                  The minimum monthly payment does not cover the monthly interest —
                  the balance grows instead of shrinking. Increase the payment or
                  reduce the balance to see a payoff projection.
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <ResultCard
                title="Without extra"
                months={base.months}
                totalInterest={base.totalInterest}
                totalPaid={base.totalPaid}
                currency={currency}
                tone="muted"
              />
              <ResultCard
                title="With extra + lump sum"
                months={withExtra.months}
                totalInterest={withExtra.totalInterest}
                totalPaid={withExtra.totalPaid}
                currency={currency}
                tone="primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Months saved
                </div>
                <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-500">
                  {monthsSaved === null ? "—" : formatNumber(monthsSaved, { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PiggyBank className="h-3.5 w-3.5" /> Interest saved
                </div>
                <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-500">
                  {formatCurrency(interestSaved, { currency })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Balance over time</h3>
          <p className="text-xs text-muted-foreground">
            Compares the remaining balance each month under the minimum-payment
            schedule (amber) vs the accelerated schedule (blue).
          </p>
          <div className="mt-4 h-72 w-full" role="img" aria-label="Loan payoff comparison chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis
                  dataKey="month"
                  tickFormatter={(v: number) => `${v}mo`}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value, { currency }),
                    name === "baseline" ? "Minimum only" : "Accelerated",
                  ]}
                  labelFormatter={(label: number) => `Month ${label}`}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="plainline"
                  formatter={(value) =>
                    value === "baseline" ? "Minimum only" : "Accelerated"
                  }
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="accelerated"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter the loan balance and rate",
        description:
          "Type the current outstanding balance and the annual interest rate. Defaults reflect a credit-card-style balance at 18.9% APR.",
      },
      {
        title: "Set the minimum monthly payment",
        description:
          "Enter the minimum payment required by your lender. If this is less than the monthly interest, the balance grows and the simulator will warn you.",
      },
      {
        title: "Add an extra monthly payment",
        description:
          "Anything you pay above the minimum goes 100% to principal. Even small extras like 50–100/month can shave years off a long loan.",
      },
      {
        title: "Optionally add a lump sum at a chosen month",
        description:
          "Enter a one-time principal payment (e.g. from a bonus or tax refund) and the month number at which it is applied. Default is month 1.",
      },
    ],
    useCases: [
      "Decide whether to apply a year-end bonus to your mortgage or car loan.",
      "Quantify how a 100/month extra payment shortens a 30-year mortgage.",
      "Compare avalanche (extra on highest-rate debt) vs snowball strategies.",
      "Plan a lump-sum prepayment after selling a property or receiving an inheritance.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          The model assumes a fixed interest rate and a single minimum payment
          for the life of the loan. Variable rates, interest-only periods and
          payment resets are not modelled.
        </li>
        <li>
          Extra payments are assumed to be applied immediately to principal
          with no penalty. Some lenders charge early-repayment fees or require
          you to formally restructure the loan.
        </li>
        <li>
          The simulator does not model escrow, PMI or fees that change with the
          balance. It tracks only the principal-and-interest balance.
        </li>
        <li>
          If the minimum payment does not cover the monthly interest, the loan
          never pays off under the baseline — the tool will warn you. Increase
          the payment to see a realistic projection.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why does the balance sometimes show as 'never' paying off?",
        a: "If your minimum monthly payment is less than the interest charged that month, the balance grows instead of shrinking. The simulator caps at 100 years and warns you. Increase the minimum payment to a level that at least covers the monthly interest.",
      },
      {
        q: "When is the lump sum applied?",
        a: "At the start of the month you specify (1-indexed). The lump sum reduces the balance before that month's interest is calculated, so applying it earlier in the loan's life saves more interest.",
      },
      {
        q: "Does this work for mortgages too?",
        a: "Yes — the maths is the same. For mortgages, watch out for early-repayment penalties and remember that lowering the balance does not lower the contractual monthly payment; it just shortens the term (unless you recast the loan).",
      },
      {
        q: "Are extra payments really 100% principal?",
        a: "For most consumer loans yes — once the month's interest is paid, anything extra reduces principal. Mortgages in some countries apply overpayments to future payments by default; you may need to instruct the lender to apply them to principal.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function ResultCard({
  title,
  months,
  totalInterest,
  totalPaid,
  currency,
  tone,
}: {
  title: string;
  months: number | null;
  totalInterest: number;
  totalPaid: number;
  currency: string;
  tone: "primary" | "muted";
}) {
  return (
    <div
      className={
        "rounded-lg border p-3 " +
        (tone === "primary"
          ? "border-primary/40 bg-primary/5"
          : "bg-card")
      }
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Payoff time</span>
      </div>
      <div className="font-mono text-lg font-semibold tabular-nums text-foreground">
        {fmtMonths(months)}
      </div>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total interest</span>
          <span className="font-mono tabular-nums text-amber-600 dark:text-amber-500">
            {formatCurrency(totalInterest, { currency })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total paid</span>
          <span className="font-mono tabular-nums">
            {formatCurrency(totalPaid, { currency })}
          </span>
        </div>
      </div>
    </div>
  );
}
