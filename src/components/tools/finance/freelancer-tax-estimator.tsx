"use client";

import * as React from "react";
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
  Receipt,
  Percent,
  CalendarDays,
  Landmark,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatPercent,
  FINANCE_DISCLAIMER,
} from "./_finance-helpers";
import { useCurrency, CurrencySelector } from "@/components/dueneo/currency-selector";

type FilingStatus = "single" | "married";

// 2024 US federal income tax brackets (ordinary income).
const BRACKETS_2024: Record<FilingStatus, { upTo: number | null; rate: number }[]> = {
  single: [
    { upTo: 11_600, rate: 10 },
    { upTo: 47_150, rate: 12 },
    { upTo: 100_525, rate: 22 },
    { upTo: 191_950, rate: 24 },
    { upTo: 243_725, rate: 32 },
    { upTo: 609_350, rate: 35 },
    { upTo: null, rate: 37 },
  ],
  married: [
    { upTo: 23_200, rate: 10 },
    { upTo: 94_300, rate: 12 },
    { upTo: 201_050, rate: 22 },
    { upTo: 383_900, rate: 24 },
    { upTo: 487_450, rate: 32 },
    { upTo: 731_200, rate: 35 },
    { upTo: null, rate: 37 },
  ],
};

const STD_DEDUCTION_2024: Record<FilingStatus, number> = {
  single: 14_600,
  married: 29_200,
};

const SE_TAX_RATE = 15.3;
const SE_TAX_BASE_FACTOR = 0.9235;
const SS_WAGE_BASE_2024 = 168_600;
const QBI_RATE = 0.2;

interface BracketBreakdown {
  range: string;
  rate: number;
  amount: number;
  tax: number;
}

function incomeTaxFor(
  taxableIncome: number,
  status: FilingStatus
): { total: number; breakdown: BracketBreakdown[] } {
  if (taxableIncome <= 0) return { total: 0, breakdown: [] };
  const brackets = BRACKETS_2024[status];
  let remaining = taxableIncome;
  let lastCap = 0;
  let total = 0;
  const breakdown: BracketBreakdown[] = [];
  for (const b of brackets) {
    if (remaining <= 0) break;
    const cap = b.upTo === null ? Infinity : b.upTo;
    const sliceWidth = Math.min(remaining, cap - lastCap);
    if (sliceWidth > 0) {
      const tax = sliceWidth * (b.rate / 100);
      total += tax;
      breakdown.push({
        range:
          b.upTo === null
            ? `${formatCurrency(lastCap, { currency: "USD", maximumFractionDigits: 0 })}+`
            : `${formatCurrency(lastCap, { currency: "USD", maximumFractionDigits: 0 })} – ${formatCurrency(b.upTo, { currency: "USD", maximumFractionDigits: 0 })}`,
        rate: b.rate,
        amount: sliceWidth,
        tax,
      });
      remaining -= sliceWidth;
      lastCap = cap;
    } else {
      lastCap = cap;
    }
  }
  return { total, breakdown };
}

function computeSETax(netEarnings: number): { seTax: number; ssPortion: number; medicarePortion: number; halfDeductible: number } {
  if (netEarnings <= 0) {
    return { seTax: 0, ssPortion: 0, medicarePortion: 0, halfDeductible: 0 };
  }
  const seTaxBase = netEarnings * SE_TAX_BASE_FACTOR;
  // Social Security portion (12.4%) capped at the SS wage base.
  const ssPortion = Math.min(seTaxBase, SS_WAGE_BASE_2024) * 0.124;
  // Medicare portion (2.9%) uncapped.
  const medicarePortion = seTaxBase * 0.029;
  const seTax = ssPortion + medicarePortion;
  const halfDeductible = seTax / 2;
  return { seTax, ssPortion, medicarePortion, halfDeductible };
}

export function FreelancerTaxEstimator({ tool }: { tool: ToolDefinition }) {
  const [income, setIncome] = React.useState("80000");
  const [expenses, setExpenses] = React.useState("8000");
  const [status, setStatus] = React.useState<FilingStatus>("single");
  const [taxYear, setTaxYear] = React.useState("2024");
  const { code: currency, setCode: setCurrency } = useCurrency();

  const incomeNum = Math.max(0, parseNumber(income));
  const expenseNum = Math.max(0, parseNumber(expenses));
  const netEarnings = Math.max(0, incomeNum - expenseNum);

  // Self-employment tax.
  const se = computeSETax(netEarnings);

  // QBI deduction: 20% of (net earnings − half-SE-tax). Does NOT model the
  // SSTB / taxable-income phase-out (mentioned in limitations).
  const qbiBase = Math.max(0, netEarnings - se.halfDeductible);
  const qbiDeduction = qbiBase * QBI_RATE;

  // AGI and taxable income.
  const agi = netEarnings - se.halfDeductible - qbiDeduction;
  const stdDeduction = STD_DEDUCTION_2024[status];
  const taxableIncome = Math.max(0, agi - stdDeduction);
  const incomeTaxCalc = incomeTaxFor(taxableIncome, status);

  const totalTax = se.seTax + incomeTaxCalc.total;
  const effectiveRate = incomeNum > 0 ? (totalTax / incomeNum) * 100 : 0;
  const afterTax = incomeNum - totalTax;
  const quarterly = totalTax / 4;

  const reset = () => {
    setIncome("80000");
    setExpenses("8000");
    setStatus("single");
    setTaxYear("2024");
    toast.info("Reset to defaults.");
  };

  const summary = `Freelancer tax estimate (${taxYear})
Filing status: ${status === "single" ? "Single" : "Married filing jointly"}
Gross income: ${formatCurrency(incomeNum, { currency })}
Business expenses: ${formatCurrency(expenseNum, { currency })}
Net earnings: ${formatCurrency(netEarnings, { currency })}

Self-employment tax: ${formatCurrency(se.seTax, { currency })}
  (SS portion: ${formatCurrency(se.ssPortion, { currency })}, Medicare: ${formatCurrency(se.medicarePortion, { currency })})
Half-SE deduction: ${formatCurrency(se.halfDeductible, { currency })}
QBI deduction (20%): ${formatCurrency(qbiDeduction, { currency })}
Standard deduction: ${formatCurrency(stdDeduction, { currency })}
Taxable income: ${formatCurrency(taxableIncome, { currency })}
Federal income tax: ${formatCurrency(incomeTaxCalc.total, { currency })}

Total tax: ${formatCurrency(totalTax, { currency })}
Effective rate: ${effectiveRate.toFixed(2)}%
After-tax income: ${formatCurrency(afterTax, { currency })}
Quarterly estimate (×4): ${formatCurrency(quarterly, { currency })}`;

  const content: ToolContent = {
    intro:
      "Estimate US self-employment tax, federal income tax and the Qualified Business Income (QBI) deduction for a freelancer or solo business owner. Enter your gross income, business expenses and filing status — the estimator breaks down each component, shows the effective tax rate and divides the total into four equal quarterly estimated payments.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ft-income">Annual gross income</Label>
                <Input
                  id="ft-income"
                  inputMode="decimal"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ft-exp">Business expenses</Label>
                <Input
                  id="ft-exp"
                  inputMode="decimal"
                  value={expenses}
                  onChange={(e) => setExpenses(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ft-status">Filing status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as FilingStatus)}
                >
                  <SelectTrigger id="ft-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married filing jointly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ft-year">Tax year</Label>
                <Select value={taxYear} onValueChange={setTaxYear}>
                  <SelectTrigger id="ft-year" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/60 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <span>
                Uses 2024 IRS brackets and standard deductions. State taxes,
                Additional Medicare Tax (0.9%) and the Additional Child Tax Credit
                are not modelled.
              </span>
            </div>
            <CurrencySelector value={currency} onChange={setCurrency} id="ft-currency" />
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Estimate</h3>
              <CopyButton value={summary} size="sm" />
            </div>

            <div className="grid gap-2">
              <Row
                label="Total tax"
                value={formatCurrency(totalTax, { currency })}
                large
                hint={<Receipt className="h-4 w-4 text-primary" />}
              />
              <Row
                label="Effective rate (of gross)"
                value={formatPercent(effectiveRate, 2)}
                highlight
                hint={<Percent className="h-3.5 w-3.5 text-amber-500" />}
              />
              <Row
                label="After-tax income"
                value={formatCurrency(afterTax, { currency })}
                hint={<Wallet className="h-3.5 w-3.5 text-emerald-500" />}
              />
              <Row
                label="Quarterly estimated payment"
                value={formatCurrency(quarterly, { currency })}
                hint={<CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />}
              />
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
              Pay each quarter by April 15, June 15, September 15 and January 15
              (next year) to avoid the IRS underpayment penalty. Safe-harbour
              target: 90% of current-year tax or 100% of last year's tax
              (110% if AGI &gt; 150k).
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Landmark className="h-4 w-4 text-primary" /> Self-employment tax
            </h3>
            <p className="text-xs text-muted-foreground">
              15.3% on 92.35% of net earnings (12.4% Social Security capped at{" "}
              {formatCurrency(SS_WAGE_BASE_2024, { currency, maximumFractionDigits: 0 })} + 2.9% Medicare).
            </p>
            <div className="mt-3 space-y-1.5 text-sm">
              <Line label="Net earnings" value={formatCurrency(netEarnings, { currency })} />
              <Line label="SE tax base (× 92.35%)" value={formatCurrency(netEarnings * SE_TAX_BASE_FACTOR, { currency })} />
              <Line label="Social Security portion (12.4%)" value={formatCurrency(se.ssPortion, { currency })} muted />
              <Line label="Medicare portion (2.9%)" value={formatCurrency(se.medicarePortion, { currency })} muted />
              <Line label="Total SE tax" value={formatCurrency(se.seTax, { currency })} strong />
              <Line label="Deductible half (above-the-line)" value={formatCurrency(se.halfDeductible, { currency })} />
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Receipt className="h-4 w-4 text-primary" /> Federal income tax
            </h3>
            <p className="text-xs text-muted-foreground">
              QBI deduction (20%) and standard deduction applied before brackets.
            </p>
            <div className="mt-3 space-y-1.5 text-sm">
              <Line label="AGI (after ½ SE & QBI)" value={formatCurrency(agi, { currency })} />
              <Line label="Standard deduction" value={formatCurrency(stdDeduction, { currency })} />
              <Line label="Taxable income" value={formatCurrency(taxableIncome, { currency })} strong />
              <Line label="QBI deduction (20%)" value={formatCurrency(qbiDeduction, { currency })} muted />
              <Line label="Federal income tax" value={formatCurrency(incomeTaxCalc.total, { currency })} strong />
            </div>
            {incomeTaxCalc.breakdown.length > 0 && (
              <div className="mt-3 max-h-44 overflow-y-auto rounded-lg border bg-background pr-1">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background">
                    <tr className="text-muted-foreground">
                      <th className="px-2 py-1.5 text-left font-medium">Bracket</th>
                      <th className="px-2 py-1.5 text-right font-medium">Rate</th>
                      <th className="px-2 py-1.5 text-right font-medium">Taxed</th>
                      <th className="px-2 py-1.5 text-right font-medium">Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeTaxCalc.breakdown.map((b, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1.5 font-mono tabular-nums">{b.range}</td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums">{b.rate}%</td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                          {formatCurrency(b.amount, { currency, maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                          {formatCurrency(b.tax, { currency, maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter your gross income",
        description:
          "Total 1099 / self-employment income before expenses. Include all client work, side gigs and freelance revenue.",
      },
      {
        title: "Enter your business expenses",
        description:
          "Legitimate deductible expenses: software, home office, equipment, professional services, mileage. Do NOT include personal expenses.",
      },
      {
        title: "Choose your filing status",
        description:
          "Single or Married Filing Jointly — this drives the brackets and standard deduction. Head of Household is not modelled.",
      },
      {
        title: "Read the estimate and pay quarterly",
        description:
          "The total tax is divided by four. Pay each quarter by the IRS estimated-tax deadlines to avoid underpayment penalties.",
      },
    ],
    useCases: [
      "Estimate your tax burden before going full-time freelance.",
      "Plan quarterly estimated payments to avoid IRS underpayment penalties.",
      "See how QBI deduction (20%) and half-SE deduction reduce your taxable income.",
      "Stress-test the impact of taking on an extra client or raising rates.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          Only US federal tax for tax year 2024 is modelled. State and local
          income taxes (which can add 0–13%) are NOT included.
        </li>
        <li>
          The QBI deduction uses the simple 20%-of-net formula. For taxable
          income above $191,950 (single) or $383,900 (MFJ) in 2024, the actual
          QBI deduction is limited by a W-2 wages / property factor and may be
          phased out entirely for SSTB businesses (doctors, lawyers, consultants).
        </li>
        <li>
          Additional Medicare Tax (0.9% on earned income above $200k single /
          $250k MFJ) and Net Investment Income Tax are not included.
        </li>
        <li>
          Self-employed health insurance deduction, SEP-IRA / Solo 401(k)
          contributions and HSA contributions (all of which reduce AGI and SE
          tax base) are not modelled — enter them as additional expenses to
          approximate.
        </li>
        <li>
          Assumes you take the standard deduction. If you itemise, replace the
          standard deduction with your Schedule A total.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What is the 92.35% factor?",
        a: "The IRS lets you deduct 7.65% from your net earnings before computing SE tax — this represents the employer half of FICA that a regular employee would not pay. So SE tax = net × 92.35% × 15.3%.",
      },
      {
        q: "What is the QBI deduction?",
        a: "The Qualified Business Income deduction lets most self-employed people deduct 20% of their net business income from taxable income. It is automatic for most freelancers under the income thresholds, but is phased out for high earners in certain 'SSTB' professions.",
      },
      {
        q: "Why are quarterly payments required?",
        a: "The US pay-as-you-go system requires tax to be paid throughout the year. W-2 employees have withholding; freelancers must make four estimated payments (April 15, June 15, September 15, January 15) or face underpayment penalties.",
      },
      {
        q: "Is this estimate accurate enough to file with?",
        a: "No — it is a planning estimate only. Real filings include many factors (state tax, credits, dependents, retirement contributions, additional Medicare tax) not modelled here. Use tax software or a CPA for actual filing.",
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

function Line({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-xs text-muted-foreground" : "text-xs"}>
        {label}
      </span>
      <span
        className={
          "font-mono tabular-nums " +
          (strong ? "text-sm font-semibold text-foreground" : "text-xs text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}
