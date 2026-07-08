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
  ReferenceLine,
} from "recharts";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Flame, TrendingUp, Calendar, Target } from "lucide-react";
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

const MAX_YEARS = 80;

interface FirePoint {
  year: number;
  age: number;
  balance: number;
  fireNumber: number;
}

/**
 * Simulate year-by-year portfolio growth until the balance reaches the
 * FIRE number (or the cap of MAX_YEARS is hit). Annual contribution is
 * added at the end of each year after a year of growth.
 */
function simulateFire(
  currentAge: number,
  currentSavings: number,
  annualSavings: number,
  annualReturnPct: number,
  fireNumber: number
): { points: FirePoint[]; yearsToFire: number | null } {
  const r = annualReturnPct / 100;
  const points: FirePoint[] = [
    { year: 0, age: currentAge, balance: currentSavings, fireNumber },
  ];
  let balance = Math.max(0, currentSavings);
  let yearsToFire: number | null = null;
  for (let y = 1; y <= MAX_YEARS; y++) {
    balance = balance * (1 + r) + annualSavings;
    if (balance < 0) balance = 0;
    points.push({ year: y, age: currentAge + y, balance, fireNumber });
    if (yearsToFire === null && balance >= fireNumber && fireNumber > 0) {
      yearsToFire = y;
    }
  }
  return { points, yearsToFire };
}

export function FireCalculator({ tool }: { tool: ToolDefinition }) {
  const [currentAge, setCurrentAge] = React.useState("30");
  const [currentSavings, setCurrentSavings] = React.useState("50000");
  const [annualSavings, setAnnualSavings] = React.useState("25000");
  const [annualReturn, setAnnualReturn] = React.useState("7");
  const [annualExpenses, setAnnualExpenses] = React.useState("40000");
  const [currencyCode, setCurrencyCode] = React.useState("USD");
  const currency = currencyCode;

  const age = Math.max(0, Math.floor(parseNumber(currentAge)));
  const savings = Math.max(0, parseNumber(currentSavings));
  const contrib = parseNumber(annualSavings);
  const ret = parseNumber(annualReturn);
  const expenses = Math.max(0, parseNumber(annualExpenses));

  const fireNumber = expenses * 25;

  const sim = React.useMemo(
    () => simulateFire(age, savings, contrib, ret, fireNumber),
    [age, savings, contrib, ret, fireNumber]
  );

  const reached = sim.yearsToFire !== null;
  const fireAge = reached ? age + (sim.yearsToFire as number) : null;
  const fireDate = reached
    ? new Date(
        Date.now() + (sim.yearsToFire as number) * 365.25 * 24 * 3600 * 1000
      )
    : null;

  const progressPct =
    fireNumber > 0 ? Math.min(100, (savings / fireNumber) * 100) : 0;

  const reset = () => {
    setCurrentAge("30");
    setCurrentSavings("50000");
    setAnnualSavings("25000");
    setAnnualReturn("7");
    setAnnualExpenses("40000");
    setCurrencyCode("USD");
    toast.info("Reset to defaults.");
  };

  const fmtDate = (d: Date) =>
    d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const summary = `FIRE projection
Current age: ${age}
Current savings: ${formatCurrency(savings, { currency })}
Annual savings: ${formatCurrency(contrib, { currency })}
Expected annual return: ${ret.toFixed(2)}%
Annual expenses: ${formatCurrency(expenses, { currency })}
FIRE number (expenses × 25): ${formatCurrency(fireNumber, { currency })}
${reached ? `Years to FIRE: ${sim.yearsToFire}` : "FIRE not reached within 80 years"}
${reached && fireAge ? `FIRE age: ${fireAge}` : ""}
${reached && fireDate ? `Projected FIRE date: ${fmtDate(fireDate)}` : ""}
Progress: ${progressPct.toFixed(1)}%`;

  const chartData = sim.points.map((p) => ({
    year: p.year,
    age: p.age,
    Balance: Math.round(p.balance),
    FIRE: Math.round(p.fireNumber),
  }));

  const content: ToolContent = {
    intro:
      "Project when you will reach Financial Independence / Retire Early (FIRE). The FIRE number is calculated as your annual expenses × 25 (the 4% safe withdrawal rule). See your year-by-year growth, the projected FIRE date and how close you are today.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fc-age">Current age</Label>
                <Input
                  id="fc-age"
                  inputMode="numeric"
                  value={currentAge}
                  onChange={(e) => setCurrentAge(e.target.value)}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fc-cur">Currency</Label>
                <Select value={currencyCode} onValueChange={setCurrencyCode}>
                  <SelectTrigger id="fc-cur" className="w-full">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="fc-savings">Current savings</Label>
              <Input
                id="fc-savings"
                inputMode="decimal"
                value={currentSavings}
                onChange={(e) => setCurrentSavings(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fc-annual">Annual savings rate</Label>
                <Input
                  id="fc-annual"
                  inputMode="decimal"
                  value={annualSavings}
                  onChange={(e) => setAnnualSavings(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fc-return">Expected annual return (%)</Label>
                <Input
                  id="fc-return"
                  inputMode="decimal"
                  value={annualReturn}
                  onChange={(e) => setAnnualReturn(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fc-exp">Annual expenses in retirement</Label>
              <Input
                id="fc-exp"
                inputMode="decimal"
                value={annualExpenses}
                onChange={(e) => setAnnualExpenses(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Used to derive your FIRE number (× 25).
              </p>
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Projection</h3>
              <CopyButton value={summary} size="sm" />
            </div>

            <div className="grid gap-2">
              <Row
                label="FIRE number (× 25)"
                value={formatCurrency(fireNumber, { currency })}
                large
                hint={<Target className="h-4 w-4 text-primary" />}
              />
              <Row
                label="Current savings"
                value={formatCurrency(savings, { currency })}
              />
              <Row
                label="Years to FIRE"
                value={
                  reached
                    ? `${sim.yearsToFire} yr`
                    : "Not within 80 years"
                }
                highlight={reached}
                hint={<Flame className="h-3.5 w-3.5 text-orange-500" />}
              />
              {reached && fireAge && (
                <Row
                  label="FIRE age"
                  value={`${fireAge}`}
                  hint={<TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                />
              )}
              {reached && fireDate && (
                <Row
                  label="Projected FIRE date"
                  value={fmtDate(fireDate)}
                  hint={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress to FIRE</span>
                <span className="font-mono tabular-nums">
                  {progressPct.toFixed(1)}%
                </span>
              </div>
              <Progress value={progressPct} className="h-2.5" />
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
              <p>
                Based on the <strong>4% rule</strong>: a portfolio of{" "}
                <strong className="text-foreground">
                  {formatCurrency(fireNumber, { currency })}
                </strong>{" "}
                should sustain {formatCurrency(expenses, { currency })} of annual
                spending for ~30 years. Returns above {Math.abs(ret).toFixed(1)}%
                growth are required to outpace inflation in retirement.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Portfolio growth vs FIRE number</h3>
          <p className="text-xs text-muted-foreground">
            Year-by-year projection of your portfolio balance (annual compounding)
            against the FIRE target line.
          </p>
          <div className="mt-4 h-72 w-full" role="img" aria-label="FIRE growth chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <defs>
                  <linearGradient id="fcBalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
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
                    name === "FIRE" ? "FIRE target" : "Balance",
                  ]}
                  labelFormatter={(label: number) => `Year ${label}`}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <ReferenceLine
                  y={fireNumber}
                  stroke="#f97316"
                  strokeDasharray="6 4"
                  label={{ value: "FIRE", fontSize: 11, fill: "#f97316", position: "insideTopRight" }}
                />
                <Area
                  type="monotone"
                  dataKey="Balance"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#fcBalGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter your current age",
        description:
          "Your age anchors the projection — the calculator tells you at what age you will hit your FIRE number.",
      },
      {
        title: "Enter current savings and annual savings rate",
        description:
          "Current savings is your investable net worth today; annual savings is what you add each year (use after-tax savings).",
      },
      {
        title: "Set an expected annual return",
        description:
          "Use a real (inflation-adjusted) return like 6–7% for a balanced stock/bond portfolio, or 4–5% for conservative projections.",
      },
      {
        title: "Enter your annual retirement expenses",
        description:
          "The FIRE number is calculated as annual expenses × 25 (the 4% safe withdrawal rule). Track the progress bar to see how close you are.",
      },
    ],
    useCases: [
      "Project when you can retire early based on current savings and savings rate.",
      "See how increasing your savings rate shortens years to FIRE.",
      "Stress-test FIRE timing against conservative (4%) or aggressive (8%) return assumptions.",
      "Compare LeanFIRE (lower expenses) vs FatFIRE (higher expenses) targets.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          The 4% rule (FIRE number = expenses × 25) is based on the Trinity
          Study for a 30-year retirement with a stock/bond portfolio. It is a
          rule of thumb, not a guarantee.
        </li>
        <li>
          The model assumes a constant annual return. Real returns fluctuate
          year to year (sequence-of-returns risk is not modelled).
        </li>
        <li>
          Taxes on withdrawals, healthcare costs, inflation and Social Security
          / pension income are not included.
        </li>
        <li>
          Contributions are treated as a lump at year-end; monthly contributions
          would compound slightly faster.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What is the FIRE number?",
        a: "It is the portfolio size at which you can withdraw 4% per year to cover your expenses for ~30 years. FIRE number = annual expenses × 25. For 40,000 of expenses, you need 1,000,000.",
      },
      {
        q: "Why does the calculator cap at 80 years?",
        a: "Beyond 80 years of saving, the projection is unrealistic — either you have already FIRE'd, or your savings rate is too low to ever reach the target under the assumed return.",
      },
      {
        q: "Should I use real or nominal returns?",
        a: "Real (inflation-adjusted) returns are better for FIRE planning because they show whether your future purchasing power is sustainable. A 7% real return on a stock-heavy portfolio is a common historical assumption.",
      },
      {
        q: "Does this include Social Security or pensions?",
        a: "No. Reduce your projected annual expenses in retirement by any Social Security / pension income to approximate the net amount your portfolio must cover.",
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
