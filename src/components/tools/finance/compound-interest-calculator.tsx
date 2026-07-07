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
  Area,
  AreaChart,
  Legend,
} from "recharts";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, TrendingUp, PiggyBank } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatNumber,
  compoundInterestSeries,
  FINANCE_DISCLAIMER,
} from "./_finance-helpers";

const COMPOUND_OPTIONS = [
  { value: "1", label: "Annually (1× / year)", n: 1 },
  { value: "2", label: "Semi-annually (2× / year)", n: 2 },
  { value: "4", label: "Quarterly (4× / year)", n: 4 },
  { value: "12", label: "Monthly (12× / year)", n: 12 },
  { value: "52", label: "Weekly (52× / year)", n: 52 },
  { value: "365", label: "Daily (365× / year)", n: 365 },
];

export function CompoundInterestCalculator({ tool }: { tool: ToolDefinition }) {
  const [principal, setPrincipal] = React.useState<string>("10000");
  const [rate, setRate] = React.useState<string>("8");
  const [compounds, setCompounds] = React.useState<string>("12");
  const [years, setYears] = React.useState<string>("10");
  const [annualContribution, setAnnualContribution] = React.useState<string>("0");
  const currency = "USD";

  const principalNum = Math.max(0, parseNumber(principal));
  const rateNum = parseNumber(rate);
  const yearsNum = Math.max(0, parseNumber(years));
  const contribNum = Math.max(0, parseNumber(annualContribution));
  const n = COMPOUND_OPTIONS.find((o) => o.value === compounds)?.n ?? 12;

  const series = React.useMemo(
    () => compoundInterestSeries(principalNum, rateNum, n, yearsNum, contribNum),
    [principalNum, rateNum, n, yearsNum, contribNum]
  );

  const finalPoint = series[series.length - 1] ?? {
    year: 0,
    balance: 0,
    principal: 0,
    contributions: 0,
    interest: 0,
  };
  const totalContributions = principalNum + contribNum * yearsNum;
  const totalInterest = finalPoint.interest;

  const reset = () => {
    setPrincipal("10000");
    setRate("8");
    setCompounds("12");
    setYears("10");
    setAnnualContribution("0");
    toast.info("Reset.");
  };

  const summary = `Compound interest summary
Principal: ${formatCurrency(principalNum, { currency })}
Annual rate: ${rateNum.toFixed(2)}%
Compounding: ${COMPOUND_OPTIONS.find((o) => o.value === compounds)?.label}
Years: ${yearsNum}
Annual contribution: ${formatCurrency(contribNum, { currency })}
Final balance: ${formatCurrency(finalPoint.balance, { currency })}
Total contributions: ${formatCurrency(totalContributions, { currency })}
Interest earned: ${formatCurrency(totalInterest, { currency })}`;

  const chartData = series.map((p) => ({
    year: p.year,
    Principal: Math.round(p.principal * 100) / 100,
    Contributions: Math.round((p.principal + p.contributions) * 100) / 100,
    Balance: Math.round(p.balance * 100) / 100,
    Interest: Math.round(p.interest * 100) / 100,
  }));

  const content: ToolContent = {
    intro:
      "Model how a one-time deposit (and optional recurring annual contributions) grow over time with compound interest. Adjust the principal, annual rate, compounding frequency and time horizon to see your final balance, total interest earned and a year-by-year growth chart.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ci-principal">Principal</Label>
                <Input
                  id="ci-principal"
                  inputMode="decimal"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ci-rate">Annual interest rate (%)</Label>
                <Input
                  id="ci-rate"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ci-compounds">Compounding frequency</Label>
                <Select value={compounds} onValueChange={setCompounds}>
                  <SelectTrigger id="ci-compounds" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPOUND_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ci-years">Years</Label>
                <Input
                  id="ci-years"
                  inputMode="decimal"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  placeholder="10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ci-contrib">Annual contribution (optional)</Label>
              <Input
                id="ci-contrib"
                inputMode="decimal"
                value={annualContribution}
                onChange={(e) => setAnnualContribution(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Added at the end of each compounding period, spread evenly through the year.
              </p>
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
                label="Final balance"
                value={formatCurrency(finalPoint.balance, { currency })}
                large
              />
              <Row
                label="Total contributions"
                value={formatCurrency(totalContributions, { currency })}
                hint={<PiggyBank className="h-3.5 w-3.5 text-muted-foreground" />}
              />
              <Row
                label="Interest earned"
                value={formatCurrency(totalInterest, { currency })}
                highlight
                hint={<TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
              />
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
              <p>
                Compounding {n}× per year over {yearsNum} years. Total growth:{" "}
                <strong className="text-foreground">
                  {formatCurrency(finalPoint.balance - principalNum, { currency })}
                </strong>{" "}
                (
                {principalNum > 0
                  ? formatNumber(
                      ((finalPoint.balance - principalNum) / principalNum) * 100,
                      { maximumFractionDigits: 1 }
                    )
                  : "0"}
                %).
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Growth over time</h3>
          <p className="text-xs text-muted-foreground">
            The chart shows the balance each year, with stacked contributions and
            accumulated interest.
          </p>
          <div className="mt-4 h-72 w-full" role="img" aria-label="Compound interest growth chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <defs>
                  <linearGradient id="ciBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="ciContribGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis
                  dataKey="year"
                  tickFormatter={(v: number) => `Y${v}`}
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
                    name,
                  ]}
                  labelFormatter={(label: number) => `Year ${label}`}
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
                />
                <Area
                  type="monotone"
                  dataKey="Contributions"
                  stackId="1"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  fill="url(#ciContribGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="Balance"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#ciBalanceGrad)"
                />
                <Line
                  type="monotone"
                  dataKey="Interest"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter the principal",
        description:
          "Type the lump sum you are starting with. Defaults to 10,000 so the chart is immediately useful.",
      },
      {
        title: "Set the annual rate",
        description:
          "Enter the nominal annual interest rate as a percentage. For a savings account paying 4.5%, type 4.5.",
      },
      {
        title: "Pick compounding frequency",
        description:
          "Choose how often interest is credited — daily, weekly, monthly, quarterly, semi-annually or annually. More frequent compounding earns slightly more interest.",
      },
      {
        title: "Add the time horizon and contributions",
        description:
          "Enter the number of years and an optional annual contribution. The chart and totals update live.",
      },
    ],
    useCases: [
      "Project the growth of a fixed deposit or high-yield savings account.",
      "Compare monthly vs annual compounding on the same nominal rate.",
      "Model a recurring annual investment in a long-term savings goal.",
      "Show the long-term impact of starting to invest 10 years earlier.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          The model assumes a constant interest rate for the full horizon. Real returns
          fluctuate year to year.
        </li>
        <li>
          Contributions are added evenly across each year; interest is credited per period
          using the nominal annual rate ÷ periods.
        </li>
        <li>
          Inflation, taxes on interest and fees are not modelled. Adjust the rate
          downwards to approximate real (after-inflation) growth.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What formula does this use?",
        a: "Standard compound interest: A = P × (1 + r/n)^(n×t), with optional contributions split evenly across the n periods of each year. r is the annual rate, n is compounding frequency and t is years.",
      },
      {
        q: "Does more frequent compounding always help?",
        a: "Yes, but the gain is small. Going from annual to monthly compounding on a 5% rate over 10 years adds about 0.25 percentage points to the effective annual yield.",
      },
      {
        q: "Is the interest rate I enter annual?",
        a: "Yes. Enter the nominal annual rate; the calculator divides it by the compounding frequency internally to compute per-period interest.",
      },
      {
        q: "Is this investment advice?",
        a: "No. It is a mathematical projection of compound growth under fixed assumptions. Past performance does not guarantee future returns — consult a licensed advisor for personal advice.",
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
