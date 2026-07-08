"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
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
import { RotateCcw, PiggyBank, TrendingUp, Briefcase } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatNumber,
  FINANCE_DISCLAIMER,
} from "./_finance-helpers";
import { useCurrency, CurrencySelector } from "@/components/dueneo/currency-selector";

interface SeriesPoint {
  year: number;
  age: number;
  balance: number;
  contributions: number;
  growth: number;
}

/**
 * Project the retirement balance year-by-year using monthly compounding
 * with monthly contributions added at the end of each month.
 *
 * Returns an array of { year, age, balance, contributions, growth } points
 * starting at year 0 (today) and ending at the retirement year.
 */
function projectRetirement(
  currentAge: number,
  retirementAge: number,
  currentSavings: number,
  monthlyContribution: number,
  annualReturnPct: number
): SeriesPoint[] {
  const years = Math.max(0, Math.floor(retirementAge - currentAge));
  const monthlyRate = annualReturnPct / 100 / 12;
  const points: SeriesPoint[] = [];
  let balance = Math.max(0, currentSavings);
  let totalContributions = Math.max(0, currentSavings);
  let totalGrowth = 0;
  points.push({
    year: 0,
    age: currentAge,
    balance,
    contributions: totalContributions,
    growth: totalGrowth,
  });
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      // Growth first, contribution at end of month.
      const growthThisMonth = balance * monthlyRate;
      balance += growthThisMonth;
      totalGrowth += growthThisMonth;
      balance += monthlyContribution;
      totalContributions += monthlyContribution;
    }
    points.push({
      year: y,
      age: currentAge + y,
      balance,
      contributions: totalContributions,
      growth: totalGrowth,
    });
  }
  return points;
}

export function RetirementCalculator({ tool }: { tool: ToolDefinition }) {
  const [currentAge, setCurrentAge] = React.useState<string>("30");
  const [retirementAge, setRetirementAge] = React.useState<string>("65");
  const [currentSavings, setCurrentSavings] = React.useState<string>("25000");
  const [monthlyContribution, setMonthlyContribution] = React.useState<string>("500");
  const [annualReturn, setAnnualReturn] = React.useState<string>("7");
  const { code: currency, setCode: setCurrency } = useCurrency();

  const a = parseNumber(currentAge);
  const r = parseNumber(retirementAge);
  const s = Math.max(0, parseNumber(currentSavings));
  const m = Math.max(0, parseNumber(monthlyContribution));
  const rt = parseNumber(annualReturn);

  const valid = a > 0 && r > a && a < 120;

  const series = React.useMemo(() => {
    if (!valid) return [];
    return projectRetirement(a, r, s, m, rt);
  }, [valid, a, r, s, m, rt]);

  const final = series[series.length - 1];
  const finalBalance = final?.balance ?? 0;
  const totalContributions = final ? final.contributions : s;
  const totalGrowth = final?.growth ?? 0;
  const yearsToRetire = Math.max(0, Math.floor(r - a));

  const fmt = (v: number) =>
    formatCurrency(v, { currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const reset = () => {
    setCurrentAge("30");
    setRetirementAge("65");
    setCurrentSavings("25000");
    setMonthlyContribution("500");
    setAnnualReturn("7");
  };

  const summary = valid
    ? `Retirement projection (age ${a} → ${r}, ${yearsToRetire} yrs)
Current savings: ${fmt(s)}
Monthly contribution: ${fmt(m)}
Assumed annual return: ${rt.toFixed(2)}%
Projected balance at ${r}: ${fmt(finalBalance)}
Total contributions: ${fmt(totalContributions)}
Investment growth: ${fmt(totalGrowth)}`
    : "";

  const chartData = series.map((p) => ({
    year: p.year,
    age: p.age,
    Contributions: Math.round(p.contributions),
    Balance: Math.round(p.balance),
    Growth: Math.round(p.growth),
  }));

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ret-current-age">Current age</Label>
              <Input
                id="ret-current-age"
                inputMode="numeric"
                value={currentAge}
                onChange={(e) => setCurrentAge(e.target.value)}
                placeholder="30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ret-age">Retirement age</Label>
              <Input
                id="ret-age"
                inputMode="numeric"
                value={retirementAge}
                onChange={(e) => setRetirementAge(e.target.value)}
                placeholder="65"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ret-savings">Current savings</Label>
              <Input
                id="ret-savings"
                inputMode="decimal"
                value={currentSavings}
                onChange={(e) => setCurrentSavings(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ret-monthly">Monthly contribution</Label>
              <Input
                id="ret-monthly"
                inputMode="decimal"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ret-return">Expected annual return (%)</Label>
              <Input
                id="ret-return"
                inputMode="decimal"
                value={annualReturn}
                onChange={(e) => setAnnualReturn(e.target.value)}
                placeholder="7"
              />
            </div>
            <div className="space-y-2">
              <CurrencySelector value={currency} onChange={setCurrency} id="ret-currency" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Monthly contributions are added at the end of each month; interest is compounded
            monthly at the annual rate ÷ 12. A 6–8% return is a common long-term assumption for
            a balanced stock/bond portfolio — adjust to match your risk tolerance.
          </p>

          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Projected at retirement</h3>
            {valid && <CopyButton value={summary} size="sm" />}
          </div>

          {!valid && (
            <p className="text-sm text-muted-foreground">
              Enter a current age and a later retirement age to see the projection.
            </p>
          )}

          {valid && (
            <>
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <PiggyBank className="h-3.5 w-3.5 text-primary" /> Projected balance at age {r}
                </div>
                <div className="mt-1 font-mono text-4xl font-black tabular-nums text-foreground sm:text-5xl">
                  {fmt(finalBalance)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Over {yearsToRetire} year{yearsToRetire === 1 ? "" : "s"} of saving and growth.
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5" /> Total contributions
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {fmt(totalContributions)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Investment growth
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmt(totalGrowth)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                  <span className="text-sm text-muted-foreground">Growth as % of balance</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {finalBalance > 0
                      ? formatNumber((totalGrowth / finalBalance) * 100, { maximumFractionDigits: 1 })
                      : "0"}
                    %
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                <p>
                  You will contribute about{" "}
                  <strong className="text-foreground">{fmt(totalContributions)}</strong> and earn
                  about <strong className="text-foreground">{fmt(totalGrowth)}</strong> in
                  investment growth. The earlier you start, the larger the growth share — thanks
                  to compound interest.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {valid && series.length > 1 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Growth over time</h3>
          <p className="text-xs text-muted-foreground">
            Stacked area chart showing how contributions and investment growth build your balance
            from age {a} to {r}.
          </p>
          <div className="mt-4 h-72 w-full" role="img" aria-label="Retirement savings growth chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <defs>
                  <linearGradient id="retContribGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="retGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis
                  dataKey="age"
                  tickFormatter={(v: number) => `${v}`}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: "Age",
                    position: "insideBottom",
                    offset: -2,
                    fontSize: 11,
                    fill: "hsl(var(--muted-foreground))",
                  }}
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
                  formatter={(value: number, name: string) => [fmt(value), name]}
                  labelFormatter={(label: number) => `Age ${label}`}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="plainline" />
                <Area
                  type="monotone"
                  dataKey="Contributions"
                  stackId="1"
                  stroke="#2563eb"
                  strokeWidth={1.5}
                  fill="url(#retContribGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="Growth"
                  stackId="1"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  fill="url(#retGrowthGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="Balance"
                  stroke="#0f172a"
                  strokeWidth={2}
                  fill="none"
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Project how much you’ll have saved by retirement based on your current age, retirement age, current savings, monthly contribution and an assumed annual return. The model compounds interest monthly and shows your projected balance, total contributions, investment growth and a year-by-year growth chart so you can see the power of starting early.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter your current age",
        description:
          "Your current age is the starting point. Combined with the retirement age, it determines the saving horizon in years.",
      },
      {
        title: "Set your retirement age",
        description:
          "The age at which you plan to stop contributing and start drawing down. Must be greater than your current age.",
      },
      {
        title: "Enter savings & contributions",
        description:
          "Type your current retirement savings and how much you add each month. Both update the projection live.",
      },
      {
        title: "Pick a realistic return",
        description:
          "A 6–8% annual return is a common long-term assumption for a balanced stock/bond portfolio. Adjust to match your asset allocation and risk tolerance.",
      },
    ],
    useCases: [
      "Stress-test whether you’re on track for a comfortable retirement.",
      "Compare starting at 25 vs 35 to see the cost of waiting.",
      "Work out the monthly contribution needed to hit a target balance.",
      "Model different return assumptions (conservative vs aggressive).",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          The model assumes a constant annual return for the entire horizon. Real markets
          fluctuate year to year and may have multi-year drawdowns.
        </li>
        <li>
          Inflation, taxes on investment gains, fees, and salary growth are not modelled. The
          projected balance is a nominal figure — its real purchasing power will be lower.
        </li>
        <li>
          Contributions are assumed constant in nominal terms. In practice, you’ll likely
          increase contributions as your salary grows.
        </li>
        <li>
          The model does not account for Social Security, pensions, or other income sources in
          retirement — only your own savings and growth.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What return should I assume?",
        a: "A 6–8% nominal annual return is a common long-term assumption for a balanced portfolio of stocks and bonds. More aggressive (stock-heavy) portfolios might aim for 8–10%, more conservative (bond-heavy) 4–5%. Adjust to match your actual allocation.",
      },
      {
        q: "Does this account for inflation?",
        a: "No — the projected balance is nominal. To approximate real (inflation-adjusted) growth, subtract expected inflation (say 2–3%) from your assumed return. A 7% nominal return becomes ~4–5% real.",
      },
      {
        q: "How are contributions handled?",
        a: "Monthly contributions are added at the end of each month. Interest is compounded monthly at the annual rate ÷ 12. This slightly understates growth vs continuous compounding but matches how most accounts actually credit interest.",
      },
      {
        q: "What about taxes and required minimum distributions?",
        a: "Out of scope. This tool projects the pre-tax balance at your retirement age only. Tax-deferred accounts (Traditional IRA/401k) will be taxed on withdrawal; Roth accounts won’t. Consult a tax advisor for personal guidance.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
