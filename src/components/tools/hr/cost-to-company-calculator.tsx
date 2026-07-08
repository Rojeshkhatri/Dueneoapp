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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Building2, Wallet, PieChart as PieIcon, Percent } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { toast } from "sonner";
import { formatCurrency, formatNumber, formatPercent, parseNumber } from "./_hr-helpers";

interface CtcBreakdown {
  name: string;
  value: number;
  color: string;
}

interface CtcResult {
  base: number;
  bonus: number;
  pension: number;
  healthInsurance: number;
  otherBenefits: number;
  payrollTaxes: number;
  totalCtc: number;
  monthlyCtc: number;
  breakdown: CtcBreakdown[];
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
];

export function CostToCompanyCalculator({ tool }: { tool: ToolDefinition }) {
  const [base, setBase] = React.useState("120000");
  const [bonus, setBonus] = React.useState("10000");
  const [pensionPct, setPensionPct] = React.useState(6);
  const [healthInsurance, setHealthInsurance] = React.useState("8000");
  const [otherBenefits, setOtherBenefits] = React.useState("5000");
  const [payrollTaxPct, setPayrollTaxPct] = React.useState(15);

  const result = React.useMemo<CtcResult | null>(() => {
    const baseN = parseNumber(base);
    const bonusN = parseNumber(bonus);
    const healthN = parseNumber(healthInsurance);
    const otherN = parseNumber(otherBenefits);
    if (baseN <= 0) return null;
    const pensionN = (baseN * pensionPct) / 100;
    const payrollTaxesN = (baseN * payrollTaxPct) / 100;
    const totalCtc = baseN + bonusN + pensionN + healthN + otherN + payrollTaxesN;
    const monthlyCtc = totalCtc / 12;
    const breakdown: CtcBreakdown[] = [
      { name: "Base salary", value: baseN, color: COLORS[0] },
      { name: "Bonus", value: bonusN, color: COLORS[1] },
      { name: "Pension / 401(k) match", value: pensionN, color: COLORS[2] },
      { name: "Health insurance", value: healthN, color: COLORS[3] },
      { name: "Other benefits", value: otherN, color: COLORS[4] },
      { name: "Payroll / employer taxes", value: payrollTaxesN, color: COLORS[5] },
    ].filter((b) => b.value > 0);
    return {
      base: baseN,
      bonus: bonusN,
      pension: pensionN,
      healthInsurance: healthN,
      otherBenefits: otherN,
      payrollTaxes: payrollTaxesN,
      totalCtc,
      monthlyCtc,
      breakdown,
    };
  }, [base, bonus, pensionPct, healthInsurance, otherBenefits, payrollTaxPct]);

  const reset = () => {
    setBase("120000");
    setBonus("10000");
    setPensionPct(6);
    setHealthInsurance("8000");
    setOtherBenefits("5000");
    setPayrollTaxPct(15);
    toast.success("Reset");
  };

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="ctc-base">Base salary (annual)</Label>
            <Input
              id="ctc-base"
              type="number"
              min={0}
              value={base}
              onChange={(e) => setBase(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctc-bonus">Annual bonus</Label>
            <Input
              id="ctc-bonus"
              type="number"
              min={0}
              value={bonus}
              onChange={(e) => setBonus(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ctc-pension" className="flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-primary" />
                Employer pension / 401(k) contribution
              </Label>
              <span className="font-mono text-sm font-medium tabular-nums">
                {formatPercent(pensionPct, 1)}
              </span>
            </div>
            <Slider
              id="ctc-pension"
              min={0}
              max={20}
              step={0.5}
              value={[pensionPct]}
              onValueChange={(v) => setPensionPct(v[0])}
            />
            <p className="text-xs text-muted-foreground">
              Percentage of base salary the employer contributes to retirement
              (e.g. 6% match, 3% non-elective).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ctc-health">Health insurance cost (annual, employer-paid)</Label>
            <Input
              id="ctc-health"
              type="number"
              min={0}
              value={healthInsurance}
              onChange={(e) => setHealthInsurance(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Annual premium the employer pays on your behalf (not your payroll deduction).
              Typically $6K–$15K for family coverage in the US.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ctc-other">Other benefits (car, phone, stipends, annual $)</Label>
            <Input
              id="ctc-other"
              type="number"
              min={0}
              value={otherBenefits}
              onChange={(e) => setOtherBenefits(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Annualised value of company car, phone, gym, learning stipend, meals, etc.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ctc-payroll" className="flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-primary" />
                Payroll / employer taxes
              </Label>
              <span className="font-mono text-sm font-medium tabular-nums">
                {formatPercent(payrollTaxPct, 1)}
              </span>
            </div>
            <Slider
              id="ctc-payroll"
              min={0}
              max={40}
              step={0.5}
              value={[payrollTaxPct]}
              onValueChange={(v) => setPayrollTaxPct(v[0])}
            />
            <p className="text-xs text-muted-foreground">
              Employer-side payroll taxes as a % of base (e.g. US FICA ≈ 7.65% + unemployment ≈ 6%,
              UK employer NI ≈ 13.8%, India PF + gratuity + ESI ≈ 12–20%).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-primary" /> Total Cost to Company
          </h3>
          {!result && (
            <p className="text-sm text-muted-foreground">
              Enter your base salary to see the full cost-to-company breakdown.
            </p>
          )}
          {result && (
            <>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Annual CTC
                </div>
                <div className="mt-1 font-mono text-3xl font-bold tabular-nums sm:text-4xl">
                  {formatCurrency(result.totalCtc)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  ≈ {formatCurrency(result.monthlyCtc)} / month
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border bg-background p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Base + Bonus
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-bold tabular-nums">
                    {formatCurrency(result.base + result.bonus)}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Benefits + Taxes
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-bold tabular-nums">
                    {formatCurrency(result.pension + result.healthInsurance + result.otherBenefits + result.payrollTaxes)}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-background p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5 text-primary" /> Per-component breakdown
                </div>
                <ul className="mt-2 space-y-1.5">
                  {result.breakdown.map((b) => {
                    const pct = result.totalCtc > 0 ? (b.value / result.totalCtc) * 100 : 0;
                    return (
                      <li key={b.name} className="flex items-center gap-2 text-sm">
                        <span
                          className="h-2.5 w-2.5 flex-none rounded-full"
                          style={{ backgroundColor: b.color }}
                        />
                        <span className="flex-1 truncate">{b.name}</span>
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {formatPercent(pct, 1)}
                        </span>
                        <span className="w-24 text-right font-mono font-semibold tabular-nums">
                          {formatCurrency(b.value)}
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

      {result && result.breakdown.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <PieIcon className="h-4 w-4 text-primary" /> CTC breakdown chart
          </h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={result.breakdown}
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
                  {result.breakdown.map((b, idx) => (
                    <Cell key={idx} fill={b.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) => [
                    formatCurrency(v),
                    name,
                  ]}
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
            {result.breakdown.map((b) => (
              <Badge key={b.name} variant="secondary" className="gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: b.color }}
                />
                {b.name}: {formatCurrency(b.value)}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            CTC overhead ratio: <span className="font-medium text-foreground">
              {formatPercent(
                result.totalCtc > 0
                  ? ((result.totalCtc - result.base - result.bonus) / (result.base + result.bonus)) * 100
                  : 0,
                1
              )}
            </span>{" "}
            on top of gross salary. A typical professional role carries 25–45% overhead.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Employer cost per working day (260 days/yr):{" "}
            <span className="font-mono font-medium text-foreground">
              {formatCurrency(result.totalCtc / 260, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Employer cost per working hour (2080 hrs/yr):{" "}
            <span className="font-mono font-medium text-foreground">
              {formatCurrency(result.totalCtc / 2080, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </p>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Calculate the true Cost to Company (CTC) of an employee — the full amount an employer spends on a hire, including base salary, bonus, employer pension/401(k) match, health insurance, other benefits and employer-side payroll taxes. See the annual and monthly CTC, a per-component breakdown, and a donut chart visualising the split. Everything runs locally in your browser.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter base salary and bonus",
        description:
          "Type the annual gross base salary and any target or guaranteed annual bonus. These are the cash components the employee receives on their payslip.",
      },
      {
        title: "Set employer pension / 401(k) contribution",
        description:
          "Use the slider to set the employer-side retirement contribution as a percentage of base salary. Common values: 3% non-elective, 4–6% match, 8–12% for generous plans.",
      },
      {
        title: "Enter benefits values and payroll tax rate",
        description:
          "Add annual health-insurance premium paid by the employer, the annualised value of other benefits (car, phone, stipends), and the employer-side payroll tax percentage (varies by country).",
      },
      {
        title: "Read the total CTC and breakdown",
        description:
          "The result card shows annual CTC, monthly CTC, per-component breakdown and a donut chart. The overhead ratio tells you how much the employer spends on top of gross cash salary.",
      },
    ],
    useCases: [
      "Negotiate a salary by understanding the employer's true cost (CTC overhead is typically 25–45%).",
      "Compare the cost of an employee vs an equivalent contractor (contractors don't carry benefits overhead).",
      "Budget headcount for a team plan or funding round — multiply CTC by headcount.",
      "Decide between a higher-salary/lower-benefits offer and a lower-salary/higher-benefits offer.",
      "Explain to international hires why their US CTC looks higher than their take-home pay.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Payroll tax percentages vary widely by country, state and salary band. The slider is a
          rough guide: US ≈ 7.65% FICA + 6% FUTA/SUTA, UK employer NI ≈ 13.8%, Germany ≈ 20%,
          India PF + gratuity + ESI ≈ 12–20%. Look up the exact rate for your jurisdiction.
        </li>
        <li>
          The calculator does not model equity-based compensation (RSUs, options) as part of CTC.
          For equity-heavy offers, add the annualised equity value to the bonus field or build a
          separate total-comp calculation.
        </li>
        <li>
          Health insurance value is the employer-paid premium only — not the employee&apos;s payroll
          deduction. In the US, family coverage typically costs the employer $12K–$18K/year.
        </li>
        <li>
          Pension / 401(k) match percentages often have a salary cap (e.g. match on first $300K).
          The calculator applies the percentage to the full base salary. Adjust manually if your
          plan has a cap.
        </li>
        <li>
          Other one-time costs (recruiter fees, signing bonus, equipment, training, office space)
          are not included. Add them to the &ldquo;Other benefits&rdquo; field annualised for a
          fuller picture.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What's the difference between CTC and gross salary?",
        a: "Gross salary is what the employee earns before tax (base + bonus). CTC is what the employer actually spends — gross salary PLUS employer-side benefits (pension match, health insurance, perks) and employer-side payroll taxes (FICA, NI, PF, etc.). CTC is typically 25–45% higher than gross salary.",
      },
      {
        q: "What payroll tax percentage should I use?",
        a: "Rough guide: US ≈ 13–15% (7.65% FICA + 6% FUTA/SUTA), UK employer NI ≈ 13.8%, Germany ≈ 20%, India PF + gratuity + ESI ≈ 12–20%, Australia super + payroll tax ≈ 11–15%. Look up the exact rate for your jurisdiction and salary band — many taxes have caps or thresholds.",
      },
      {
        q: "Does this include equity?",
        a: "No. RSUs, stock options and other equity grants are not modelled. If equity is a significant part of comp, add the annualised equity value (total grant ÷ vest years) to the bonus field, or use the Offer Comparison Tool for a fuller equity-aware comparison.",
      },
      {
        q: "What's a typical CTC overhead ratio?",
        a: "For a professional knowledge-worker role, expect 25–45% overhead on top of gross salary. A $100K gross salary typically costs the employer $130K–$145K all-in. Higher-overhead countries (Germany, France) trend toward the high end; lower-overhead jurisdictions (Singapore, UAE) trend lower.",
      },
      {
        q: "How do I annualise one-time costs like recruiter fees?",
        a: "Divide the one-time cost by the expected tenure in years. A $20K recruiter fee on a hire you expect to stay 4 years = $5K/year. Add that to the Other benefits field. Signing bonus is typically modelled as a one-time cost amortised the same way.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
