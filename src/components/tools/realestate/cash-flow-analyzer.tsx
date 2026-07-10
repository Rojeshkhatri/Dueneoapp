"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, TrendingUp, TrendingDown, Receipt, Wrench, Home, Building } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { parseNumber, formatCurrency, formatPercent, RE_DISCLAIMER } from "./_re-helpers";
import { useCurrency, CurrencySelector } from "@/components/dueneo/currency-selector";

export function CashFlowAnalyzer({ tool }: { tool: ToolDefinition }) {
  const [rentalIncome, setRentalIncome] = React.useState<string>("2200");
  const [mortgagePI, setMortgagePI] = React.useState<string>("1350");
  const [propertyTax, setPropertyTax] = React.useState<string>("300");
  const [insurance, setInsurance] = React.useState<string>("120");
  const [hoa, setHoa] = React.useState<string>("0");
  const [vacancyPct, setVacancyPct] = React.useState<string>("5");
  const [maintenancePct, setMaintenancePct] = React.useState<string>("1");
  const [mgmtPct, setMgmtPct] = React.useState<string>("8");
  const [other, setOther] = React.useState<string>("50");
  const { code: currency, setCode: setCurrency } = useCurrency();

  const nums = {
    rent: Math.max(0, parseNumber(rentalIncome)),
    mortgage: Math.max(0, parseNumber(mortgagePI)),
    tax: Math.max(0, parseNumber(propertyTax)),
    ins: Math.max(0, parseNumber(insurance)),
    hoa: Math.max(0, parseNumber(hoa)),
    vacancy: Math.max(0, Math.min(100, parseNumber(vacancyPct))),
    maint: Math.max(0, Math.min(100, parseNumber(maintenancePct))),
    mgmt: Math.max(0, Math.min(100, parseNumber(mgmtPct))),
    other: Math.max(0, parseNumber(other)),
  };

  // Vacancy loss is a percentage of gross rent
  const vacancyLoss = nums.rent * (nums.vacancy / 100);
  // Maintenance and management are typically % of gross rent (some use % of EGI; we use gross for simplicity)
  const maintenanceCost = nums.rent * (nums.maint / 100);
  const mgmtCost = nums.rent * (nums.mgmt / 100);

  const grossIncome = nums.rent; // potential gross
  const effectiveIncome = grossIncome - vacancyLoss;
  const totalExpenses =
    nums.mortgage + nums.tax + nums.ins + nums.hoa + maintenanceCost + mgmtCost + nums.other;
  const monthlyCashFlow = effectiveIncome - totalExpenses;
  const annualCashFlow = monthlyCashFlow * 12;
  const annualGross = grossIncome * 12;
  const annualExpenses = totalExpenses * 12;

  const chartData = [
    { name: "Mortgage P&I", value: Math.round(nums.mortgage), tone: "fixed" },
    { name: "Property tax", value: Math.round(nums.tax), tone: "fixed" },
    { name: "Insurance", value: Math.round(nums.ins), tone: "fixed" },
    { name: "HOA", value: Math.round(nums.hoa), tone: "fixed" },
    { name: "Vacancy", value: Math.round(vacancyLoss), tone: "variable" },
    { name: "Maintenance", value: Math.round(maintenanceCost), tone: "variable" },
    { name: "Management", value: Math.round(mgmtCost), tone: "variable" },
    { name: "Other", value: Math.round(nums.other), tone: "fixed" },
  ].filter((d) => d.value > 0);

  const positive = monthlyCashFlow >= 0;

  const reset = () => {
    setRentalIncome("2200");
    setMortgagePI("1350");
    setPropertyTax("300");
    setInsurance("120");
    setHoa("0");
    setVacancyPct("5");
    setMaintenancePct("1");
    setMgmtPct("8");
    setOther("50");
    toast.info("Reset.");
  };

  const summary = `Rental cash flow analysis
Gross monthly rent: ${formatCurrency(nums.rent, { currency })}
Vacancy loss (${nums.vacancy}%): ${formatCurrency(vacancyLoss, { currency })}
Effective income: ${formatCurrency(effectiveIncome, { currency })}

Monthly expenses:
  Mortgage P&I: ${formatCurrency(nums.mortgage, { currency })}
  Property tax: ${formatCurrency(nums.tax, { currency })}
  Insurance: ${formatCurrency(nums.ins, { currency })}
  HOA: ${formatCurrency(nums.hoa, { currency })}
  Maintenance (${nums.maint}%): ${formatCurrency(maintenanceCost, { currency })}
  Management (${nums.mgmt}%): ${formatCurrency(mgmtCost, { currency })}
  Other: ${formatCurrency(nums.other, { currency })}
  Total: ${formatCurrency(totalExpenses, { currency })}

Monthly cash flow: ${formatCurrency(monthlyCashFlow, { currency })}
Annual cash flow: ${formatCurrency(annualCashFlow, { currency })}
Annual gross income: ${formatCurrency(annualGross, { currency })}
Annual expenses: ${formatCurrency(annualExpenses, { currency })}
Status: ${positive ? "POSITIVE" : "NEGATIVE"}`;

  const content: ToolContent = {
    intro:
      "Analyse the monthly and annual cash flow for a rental property. Enter rental income, mortgage P&I, taxes, insurance, HOA and the standard percentage-based reserves (vacancy, maintenance, management) to see net cash flow with a clear positive/negative indicator and a colour-coded expense breakdown chart.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Income & expenses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="cf-rent">Gross monthly rent</Label>
                <Input id="cf-rent" inputMode="decimal" value={rentalIncome} onChange={(e) => setRentalIncome(e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Mortgage P&I / mo" value={mortgagePI} onChange={setMortgagePI} icon={<Home className="h-3.5 w-3.5" />} />
                <Field label="Property tax / mo" value={propertyTax} onChange={setPropertyTax} icon={<Receipt className="h-3.5 w-3.5" />} />
                <Field label="Insurance / mo" value={insurance} onChange={setInsurance} />
                <Field label="HOA / mo" value={hoa} onChange={setHoa} />
                <Field label="Vacancy (% of rent)" value={vacancyPct} onChange={setVacancyPct} />
                <Field label="Maintenance (% of rent)" value={maintenancePct} onChange={setMaintenancePct} icon={<Wrench className="h-3.5 w-3.5" />} />
                <Field label="Management (% of rent)" value={mgmtPct} onChange={setMgmtPct} icon={<Building className="h-3.5 w-3.5" />} />
                <Field label="Other / mo" value={other} onChange={setOther} />
              </div>
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
              <CurrencySelector value={currency} onChange={setCurrency} id="cf-currency" className="pt-2" />
            </CardContent>
          </Card>

          <Card className={positive ? "bg-emerald-50/40 dark:bg-emerald-950/10" : "bg-rose-50/40 dark:bg-rose-950/10"}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Cash flow</CardTitle>
                <CopyButton value={summary} size="sm" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Monthly net</span>
                <span className={"flex items-center gap-1.5 font-mono text-3xl font-bold tabular-nums " + (positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {positive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  {formatCurrency(monthlyCashFlow, { currency })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Annual net</span>
                <span className={"font-mono text-lg font-semibold tabular-nums " + (positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {formatCurrency(annualCashFlow, { currency })}
                </span>
              </div>
              <div className={"rounded-md border p-2 text-xs " + (positive ? "border-emerald-300/60 text-emerald-700 dark:text-emerald-300" : "border-rose-300/60 text-rose-700 dark:text-rose-300")}>
                {positive ? "Positive cash flow — the property pays for itself and then some." : "Negative cash flow — you're paying out of pocket each month."}
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <Row label="Gross monthly rent" value={formatCurrency(grossIncome, { currency })} />
                <Row label="Vacancy loss" value={`−${formatCurrency(vacancyLoss, { currency })}`} muted />
                <Row label="Effective income" value={formatCurrency(effectiveIncome, { currency })} highlight />
                <Row label="Total expenses" value={`−${formatCurrency(totalExpenses, { currency })}`} muted />
                <Row label="Annual gross income" value={formatCurrency(annualGross, { currency })} muted />
                <Row label="Annual expenses" value={formatCurrency(annualExpenses, { currency })} muted />
              </div>
            </CardContent>
          </Card>
        </div>

        {chartData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Monthly expense breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v, { currency, minimumFractionDigits: 0, maximumFractionDigits: 0 })} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v, { currency })}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {chartData.map((d, i) => (
                        <Cell
                          key={i}
                          fill={d.tone === "variable" ? "#f59e0b" : "#2563eb"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#2563eb]" /> Fixed expenses</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#f59e0b]" /> Variable (vacancy, maintenance, mgmt)</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {RE_DISCLAIMER}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter gross monthly rent",
        description: "The full rent you charge before any vacancy or expense allowances.",
      },
      {
        title: "Enter fixed monthly expenses",
        description: "Mortgage principal & interest, property tax, insurance, HOA and any other fixed monthly costs.",
      },
      {
        title: "Set percentage-based reserves",
        description: "Vacancy, maintenance and management are entered as a percentage of gross rent. Common defaults: vacancy 5–8%, maintenance 1–2%, management 8–10%.",
      },
      {
        title: "Read net cash flow",
        description: "The result card shows monthly and annual net cash flow, with a positive/negative indicator. The bar chart shows where the money goes.",
      },
    ],
    useCases: [
      "Decide whether a rental will be cash-flow positive before you buy.",
      "See which expense category is eating your returns the most.",
      "Stress-test by raising the vacancy % to model a tougher rental market.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{RE_DISCLAIMER}</li>
        <li>Maintenance and management are computed as a percentage of gross rent. Some property managers charge a percentage of collected rent (effective gross income) — adjust the percentage to compensate.</li>
        <li>The model is monthly and linear. It doesn't model one-off capital expenditures (roof, HVAC) — reserve for those separately, typically $200–$400/unit/month.</li>
      </ul>
    ),
    faq: [
      {
        q: "What's a healthy cash flow?",
        a: "Most investors want at least $100–$200/unit/month after all expenses including mortgage. Below $50/unit/month is risky — small increases in expenses or vacancy can push you negative.",
      },
      {
        q: "Why use percentages for vacancy/maintenance/management?",
        a: "They scale with rent, which makes them easy to compare across properties. Common defaults: vacancy 5–8% (depends on market), maintenance 1–2% of rent, management 8–10% of collected rent.",
      },
      {
        q: "Should I include a capital-expenditure reserve?",
        a: "Yes — typically $100–$300/unit/month for big-ticket items (roof, HVAC, water heater). Add it to 'Other / mo' or increase the maintenance percentage.",
      },
      {
        q: "Why is my cash flow negative?",
        a: "Likely the mortgage is too high relative to rent. The 1% rule (rent ≥ 1% of price) is a quick check — at today's interest rates you may need 1.2–1.5% to cash-flow positively.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Field({ label, value, onChange, icon }: { label: string; value: string; onChange: (v: string) => void; icon?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-xs">{icon}{label}</Label>
      <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={"text-sm " + (highlight ? "font-medium text-primary" : muted ? "text-muted-foreground/80" : "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={
          "font-mono tabular-nums " +
          (highlight ? "text-base font-semibold text-primary" : muted ? "text-sm text-muted-foreground" : "text-base text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}
