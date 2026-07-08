"use client";

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { PrivacyNote } from "@/components/dueneo/privacy-note";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  RotateCcw,
  Wallet,
  Receipt,
  TrendingDown,
  PieChart as PieIcon,
  Coins,
  ShieldCheck,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { toast } from "sonner";
import { formatCurrency, formatPercent, parseNumber } from "./_hr-helpers";

interface Deduction {
  id: string;
  label: string;
  amount: number;
}

function uid(): string {
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const DEFAULT_DEDUCTIONS: Deduction[] = [
  { id: "d1", label: "Income tax", amount: 18000 },
  { id: "d2", label: "Social security", amount: 6200 },
  { id: "d3", label: "Health insurance", amount: 2400 },
  { id: "d4", label: "Pension contribution", amount: 4800 },
];

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
  "#a78bfa",
  "#f472b6",
];

interface PayslipResult {
  gross: number;
  totalDeductions: number;
  net: number;
  deductionPct: number;
  effectiveTaxRate: number;
  // "Tax-like" deductions = income tax + social security (the items typically
  // considered tax-like; pension and insurance are savings/benefits).
  taxLikeDeductions: number;
  chartData: { name: string; value: number; color: string }[];
}

export function PayslipAnalyzer({ tool }: { tool: ToolDefinition }) {
  const [gross, setGross] = React.useState("95000");
  const [deductions, setDeductions] = React.useState<Deduction[]>(DEFAULT_DEDUCTIONS);

  const addDeduction = () => {
    setDeductions((p) => [...p, { id: uid(), label: "New deduction", amount: 0 }]);
  };

  const updateDeduction = (id: string, patch: Partial<Deduction>) => {
    setDeductions((p) => p.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const removeDeduction = (id: string) => {
    setDeductions((p) => p.filter((d) => d.id !== id));
  };

  const reset = () => {
    setGross("95000");
    setDeductions(DEFAULT_DEDUCTIONS);
    toast.success("Reset");
  };

  const result = React.useMemo<PayslipResult | null>(() => {
    const grossN = parseNumber(gross);
    if (grossN <= 0) return null;
    const totalDeductions = deductions.reduce((s, d) => s + parseNumber(d.amount), 0);
    const net = grossN - totalDeductions;
    const deductionPct = grossN > 0 ? (totalDeductions / grossN) * 100 : 0;
    // Effective tax rate = (income tax + social security) / gross.
    // We treat the first two default deductions as tax-like; for user-added
    // deductions we include them only if labelled with tax-like keywords.
    const taxLikeKeywords = /(tax|social|security|national insurance|medicare|ssi|fica)/i;
    const taxLikeDeductions = deductions.reduce((s, d) => {
      if (taxLikeKeywords.test(d.label)) return s + parseNumber(d.amount);
      return s;
    }, 0);
    const effectiveTaxRate = grossN > 0 ? (taxLikeDeductions / grossN) * 100 : 0;

    const chartData = [
      { name: "Net pay", value: Math.max(0, net), color: "var(--chart-2)" },
      ...deductions
        .filter((d) => parseNumber(d.amount) > 0)
        .map((d, i) => ({
          name: d.label || `Deduction ${i + 1}`,
          value: parseNumber(d.amount),
          color: PIE_COLORS[(i + 1) % PIE_COLORS.length],
        })),
    ].filter((d) => d.value > 0);

    return {
      gross: grossN,
      totalDeductions,
      net,
      deductionPct,
      effectiveTaxRate,
      taxLikeDeductions,
      chartData,
    };
  }, [gross, deductions]);

  const toolBody = (
    <div className="space-y-5">
      <PrivacyNote level="sensitive" className="mb-1">
        Sensitive: your salary and payslip details never leave your browser. All calculations run locally — nothing is uploaded, logged or stored.
      </PrivacyNote>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="ps-gross" className="flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-primary" /> Gross annual salary
            </Label>
            <Input
              id="ps-gross"
              type="number"
              min={0}
              value={gross}
              onChange={(e) => setGross(e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-primary" /> Deductions
              </Label>
              <Button variant="outline" size="sm" onClick={addDeduction} className="h-7 px-2 text-xs">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add deduction
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add each line-item deduction from your payslip. Items labelled with
              &ldquo;tax&rdquo;, &ldquo;social security&rdquo; or &ldquo;national insurance&rdquo;
              are treated as tax-like for the effective tax rate calculation.
            </p>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
              {deductions.map((d, idx) => (
                <div key={d.id} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">#{idx + 1}</span>
                  <Input
                    value={d.label}
                    onChange={(e) => updateDeduction(d.id, { label: e.target.value })}
                    placeholder="Deduction name"
                    className="h-8 flex-1"
                    aria-label={`Deduction ${idx + 1} label`}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={d.amount || ""}
                    onChange={(e) => updateDeduction(d.id, { amount: parseNumber(e.target.value) })}
                    placeholder="0"
                    className="h-8 w-28 font-mono tabular-nums"
                    aria-label={`Deduction ${idx + 1} amount`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-none text-muted-foreground hover:text-destructive"
                    onClick={() => removeDeduction(d.id)}
                    aria-label={`Remove deduction ${idx + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
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
            <Wallet className="h-4 w-4 text-primary" /> Paycheck summary
          </h3>
          {!result && (
            <p className="text-sm text-muted-foreground">
              Enter your gross salary and deductions to see your net pay and effective tax rate.
            </p>
          )}
          {result && (
            <>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Net annual pay
                </div>
                <div className="mt-1 font-mono text-3xl font-bold tabular-nums sm:text-4xl">
                  {formatCurrency(result.net)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  ≈ {formatCurrency(result.net / 12)} / month · {formatCurrency(result.net / 26)} / fortnight
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border bg-background p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Gross
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-bold tabular-nums">
                    {formatCurrency(result.gross)}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Deductions
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
                    -{formatCurrency(result.totalDeductions)}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Deduction %
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-bold tabular-nums">
                    {formatPercent(result.deductionPct, 1)}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-background p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <TrendingDown className="h-3.5 w-3.5 text-rose-500" /> Effective tax rate
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">
                    (income tax + social security) / gross
                  </span>
                  <span className="font-mono text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                    {formatPercent(result.effectiveTaxRate, 1)}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Only deductions labelled with &ldquo;tax&rdquo;, &ldquo;social security&rdquo; or
                  &ldquo;national insurance&rdquo; count toward the effective tax rate. Pension and
                  health-insurance contributions are savings/benefits, not taxes.
                </p>
              </div>

              <div className="rounded-lg border bg-background p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Per-component breakdown
                </div>
                <ul className="mt-2 space-y-1.5">
                  <li className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 flex-none rounded-full bg-emerald-500" />
                    <span className="flex-1">Net pay</span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {formatPercent(result.gross > 0 ? (result.net / result.gross) * 100 : 0, 1)}
                    </span>
                    <span className="w-24 text-right font-mono font-semibold tabular-nums">
                      {formatCurrency(result.net)}
                    </span>
                  </li>
                  {deductions.map((d, i) => {
                    const amt = parseNumber(d.amount);
                    const pct = result.gross > 0 ? (amt / result.gross) * 100 : 0;
                    return (
                      <li key={d.id} className="flex items-center gap-2 text-sm">
                        <span
                          className="h-2.5 w-2.5 flex-none rounded-full"
                          style={{ backgroundColor: PIE_COLORS[(i + 1) % PIE_COLORS.length] }}
                        />
                        <span className="flex-1 truncate">{d.label || `Deduction ${i + 1}`}</span>
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {formatPercent(pct, 1)}
                        </span>
                        <span className="w-24 text-right font-mono font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                          -{formatCurrency(amt)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {result && result.chartData.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <PieIcon className="h-4 w-4 text-primary" /> Paycheck breakdown chart
          </h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={result.chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={55}
                  paddingAngle={2}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`
                  }
                  labelLine={false}
                  style={{ fontSize: 11 }}
                >
                  {result.chartData.map((d, idx) => (
                    <Cell key={idx} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) => [formatCurrency(v), name]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary" className="gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Net pay: {formatCurrency(result.net)}
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <TrendingDown className="h-2.5 w-2.5" /> Total deductions: {formatCurrency(result.totalDeductions)}
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              Marginal net: {formatPercent(result.gross > 0 ? (result.net / result.gross) * 100 : 0, 1)} of gross
            </Badge>
          </div>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Enter your gross salary and each payslip deduction (income tax, social security, health insurance, pension, anything else) to see your net pay, total deductions, deduction percentage and effective tax rate. A donut chart visualises the split between net pay and each deduction. Everything runs locally in your browser — your salary details never leave your device.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter your gross annual salary",
        description:
          "Type your gross (pre-tax) annual salary. If you only know your monthly gross, multiply by 12 first.",
      },
      {
        title: "Add each payslip deduction",
        description:
          "Add a row per deduction line-item from your payslip: income tax, social security / national insurance, health insurance, pension, parking, union dues, etc. Label them clearly — items with 'tax' or 'social security' in the name count toward the effective tax rate.",
      },
      {
        title: "Read your net pay and effective tax rate",
        description:
          "The summary card shows annual / monthly / fortnightly net pay, total deductions, deduction % and effective tax rate (income tax + social security ÷ gross).",
      },
      {
        title: "Use the chart for a visual breakdown",
        description:
          "The donut chart shows what slice of gross salary each deduction takes, plus the net-pay slice. Use it to see at a glance which deduction is the biggest.",
      },
    ],
    useCases: [
      "Compare two job offers' net pay (not just gross) when the jurisdictions differ.",
      "Estimate take-home pay after a raise to decide if a promotion is worth the extra responsibility.",
      "Quantify how much of your gross salary actually reaches your bank account each year.",
      "See which deduction is the largest — useful when planning pre-tax contributions (401k, HSA, FSA).",
      "Explain your payslip to a partner, financial advisor or tax preparer.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The effective tax rate is computed as (income tax + social security) ÷ gross. Pension
          contributions, health insurance premiums, and other deductions are treated as
          savings/benefits, not taxes — they&apos;re net worth you control, not government revenue.
        </li>
        <li>
          The calculator does not model progressive tax brackets automatically. Enter your actual
          income-tax figure from your payslip — if you only know the rate, multiply it by gross to
          get the dollar amount.
        </li>
        <li>
          Pre-tax vs post-tax deductions are not distinguished. For accuracy, ensure the gross
          figure you enter is the gross before pre-tax deductions (i.e. before 401(k), HSA, FSA,
          health premium if pre-tax). Many paystubs show multiple gross figures — use the
          highest one.
        </li>
        <li>
          Currency is auto-detected from your browser locale. All deductions must be in the same
          currency as the gross salary — currency conversion is not performed.
        </li>
        <li>
          Year-end adjustments (bonus tax withholding, capital gains, refund/owing at filing) are
          not modelled. The tool shows you the per-paycheck snapshot, not the full annual tax
          reconciliation.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why is my effective tax rate lower than my marginal rate?",
        a: "Marginal rate is the rate on your next dollar of income (your top bracket). Effective rate is the average rate across all your income (total tax ÷ gross). Because tax systems are progressive, effective rate is always lower than marginal rate. Enter your actual income-tax dollar figure from your payslip — Dueneo will compute the effective rate from that.",
      },
      {
        q: "What counts as a 'tax-like' deduction?",
        a: "Any deduction whose label contains 'tax', 'social security', 'national insurance', 'medicare', 'SSI' or 'FICA'. These contribute to the effective tax rate. Pension, health insurance, parking, union dues — these are benefits/savings, not taxes, so they're excluded from the effective rate (but still counted in total deductions).",
      },
      {
        q: "Should I use gross before or after pre-tax deductions?",
        a: "Use the highest gross figure on your payslip — the one before 401(k), HSA, FSA and pre-tax health premiums. This gives the truest effective tax rate and matches the CTC picture. If you only have post-deduction gross, your effective tax rate will look artificially high.",
      },
      {
        q: "Does this handle currency conversion?",
        a: "No. All deductions must be in the same currency as gross. Currency formatting uses your browser locale — change your browser language to display a different currency symbol.",
      },
      {
        q: "Are my salary details stored?",
        a: "No. This is a sensitive tool — every calculation runs in your browser. Your salary and deduction figures are never uploaded, logged or stored. Closing the tab clears everything.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
