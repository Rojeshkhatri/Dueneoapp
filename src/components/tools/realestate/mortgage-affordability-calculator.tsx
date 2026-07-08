"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Home, Wallet, Scale } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { parseNumber, formatCurrency, formatPercent, monthlyPayment, RE_DISCLAIMER } from "./_re-helpers";

export function MortgageAffordabilityCalculator({ tool }: { tool: ToolDefinition }) {
  const [income, setIncome] = React.useState<string>("95000");
  const [downPayment, setDownPayment] = React.useState<string>("60000");
  const [monthlyDebts, setMonthlyDebts] = React.useState<string>("450");
  const [rate, setRate] = React.useState<string>("6.8");
  const [term, setTerm] = React.useState<string>("30");
  const [taxes, setTaxes] = React.useState<string>("3600");
  const [insurance, setInsurance] = React.useState<string>("1400");
  const [hoa, setHoa] = React.useState<string>("0");
  const currency = "USD";

  const incomeNum = Math.max(0, parseNumber(income));
  const downNum = Math.max(0, parseNumber(downPayment));
  const debtsNum = Math.max(0, parseNumber(monthlyDebts));
  const rateNum = parseNumber(rate);
  const termNum = Math.max(0, parseNumber(term));
  const taxesNum = Math.max(0, parseNumber(taxes));
  const insNum = Math.max(0, parseNumber(insurance));
  const hoaNum = Math.max(0, parseNumber(hoa));

  const grossMonthly = incomeNum / 12;

  // 28/36 rule:
  //   housing (P+I+T+I+HOA) <= 28% of gross monthly
  //   total debt (housing + monthly debts) <= 36% of gross monthly
  const housingCap28 = grossMonthly * 0.28;
  const totalDebtCap36 = grossMonthly * 0.36;
  const housingCapFromDebt = totalDebtCap36 - debtsNum; // housing cap from the 36% rule
  const housingCap = Math.max(0, Math.min(housingCap28, housingCapFromDebt));

  const monthlyTax = taxesNum / 12;
  const monthlyIns = insNum / 12;
  const fixedHousing = monthlyTax + monthlyIns + hoaNum;
  const maxPI = Math.max(0, housingCap - fixedHousing);

  // Solve for principal from monthly payment: P = M * (1 - (1+r)^-n) / r
  const n = Math.max(1, Math.round(termNum * 12));
  const r = rateNum > 0 ? rateNum / 100 / 12 : 0;
  const maxPrincipal = r > 0 ? (maxPI * (1 - Math.pow(1 + r, -n))) / r : maxPI * n;
  const maxHomePrice = Math.max(0, maxPrincipal + downNum);

  // For display: the monthly payment at max home price
  const monthlyPmt = maxPI;
  const totalMonthlyHousing = maxPI + fixedHousing;
  const totalMonthlyDebt = totalMonthlyHousing + debtsNum;

  const dtiHousing = grossMonthly > 0 ? (totalMonthlyHousing / grossMonthly) * 100 : 0;
  const dtiTotal = grossMonthly > 0 ? (totalMonthlyDebt / grossMonthly) * 100 : 0;

  const bindingRule = housingCap28 <= housingCapFromDebt ? "28% (housing)" : "36% (total debt)";

  const reset = () => {
    setIncome("95000");
    setDownPayment("60000");
    setMonthlyDebts("450");
    setRate("6.8");
    setTerm("30");
    setTaxes("3600");
    setInsurance("1400");
    setHoa("0");
    toast.info("Reset.");
  };

  const summary = `Mortgage affordability summary
Gross annual income: ${formatCurrency(incomeNum, { currency })}
Gross monthly income: ${formatCurrency(grossMonthly, { currency })}
Monthly debts: ${formatCurrency(debtsNum, { currency })}
Down payment: ${formatCurrency(downNum, { currency })}
Rate: ${rateNum.toFixed(3)}%  ·  Term: ${termNum} yrs

28% housing cap: ${formatCurrency(housingCap28, { currency })}/mo
36% total-debt cap: ${formatCurrency(housingCapFromDebt, { currency })}/mo housing
Binding rule: ${bindingRule}
Max P&I / month: ${formatCurrency(maxPI, { currency })}
Max loan principal: ${formatCurrency(maxPrincipal, { currency })}
Max home price: ${formatCurrency(maxHomePrice, { currency })}

Total monthly housing: ${formatCurrency(totalMonthlyHousing, { currency })} (${formatPercent(dtiHousing)} DTI)
Total monthly debt: ${formatCurrency(totalMonthlyDebt, { currency })} (${formatPercent(dtiTotal)} DTI)`;

  const content: ToolContent = {
    intro:
      "See how much house you can afford based on the standard 28/36 rule: housing costs should be at most 28% of your gross monthly income, and total debt payments at most 36%. Enter your income, down payment, debts and rate to get the maximum monthly payment, loan amount and home price you'd qualify for.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Your finances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="ma-income">Gross annual income</Label>
                <Input id="ma-income" inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="95000" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ma-down">Down payment</Label>
                  <Input id="ma-down" inputMode="decimal" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ma-debts">Monthly debts</Label>
                  <Input id="ma-debts" inputMode="decimal" value={monthlyDebts} onChange={(e) => setMonthlyDebts(e.target.value)} placeholder="Car, student loans, credit cards" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ma-rate">Interest rate (%)</Label>
                  <Input id="ma-rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ma-term">Term (years)</Label>
                  <Input id="ma-term" inputMode="decimal" value={term} onChange={(e) => setTerm(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ma-taxes">Property tax / yr</Label>
                  <Input id="ma-taxes" inputMode="decimal" value={taxes} onChange={(e) => setTaxes(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ma-ins">Insurance / yr</Label>
                  <Input id="ma-ins" inputMode="decimal" value={insurance} onChange={(e) => setInsurance(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ma-hoa">HOA / month</Label>
                  <Input id="ma-hoa" inputMode="decimal" value={hoa} onChange={(e) => setHoa(e.target.value)} />
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">What you can afford</CardTitle>
                <CopyButton value={summary} size="sm" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Big label="Max home price" value={formatCurrency(maxHomePrice, { currency })} icon={<Home className="h-4 w-4" />} />
              <Row label="Max loan principal" value={formatCurrency(maxPrincipal, { currency })} muted />
              <Row label="Down payment" value={formatCurrency(downNum, { currency })} muted />
              <div className="border-t pt-3" />
              <Row label="Max monthly P&I" value={formatCurrency(maxPI, { currency })} />
              <Row label="Monthly taxes + insurance + HOA" value={formatCurrency(fixedHousing, { currency })} muted />
              <Row label="Total monthly housing" value={formatCurrency(totalMonthlyHousing, { currency })} highlight icon={<Wallet className="h-3.5 w-3.5" />} />
              <div className="border-t pt-3" />
              <div className="grid grid-cols-2 gap-3">
                <RatioCard label="Housing DTI" pct={dtiHousing} cap={28} icon={<Scale className="h-3.5 w-3.5" />} />
                <RatioCard label="Total debt DTI" pct={dtiTotal} cap={36} icon={<Scale className="h-3.5 w-3.5" />} />
              </div>
              <p className="text-xs text-muted-foreground">
                Binding constraint: <strong>{bindingRule}</strong>
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">How the 28/36 rule works</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="font-semibold">28% rule (front-end ratio)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your monthly housing payment — principal, interest, property tax, insurance and HOA — should be ≤ 28% of your gross monthly income ({formatCurrency(housingCap28, { currency })}/mo for your income).
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="font-semibold">36% rule (back-end ratio)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your total monthly debt — housing plus car loans, student loans, credit cards — should be ≤ 36% of gross monthly income. Existing debts reduce the housing room to ({formatCurrency(housingCapFromDebt, { currency })}/mo).
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {RE_DISCLAIMER}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter your income and debts",
        description: "Gross annual income (before tax), down payment, and monthly debt payments (car, student loans, credit card minimums).",
      },
      {
        title: "Set the loan assumptions",
        description: "Interest rate, term in years, and your best estimates for annual property tax, insurance and HOA dues.",
      },
      {
        title: "Read the maximums",
        description: "The tool shows the max monthly P&I, max loan principal and max home price you'd qualify for under the 28/36 rule.",
      },
      {
        title: "Check the binding constraint",
        description: "If your existing debts are high, the 36% rule will bind before the 28% rule — the tool shows which one is limiting you.",
      },
    ],
    useCases: [
      "Set a realistic price ceiling before you start house-hunting.",
      "See how paying off a car loan first would increase your buying power.",
      "Compare a 15-year vs 30-year mortgage's effect on affordability.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{RE_DISCLAIMER}</li>
        <li>The 28/36 rule is a traditional guideline — many lenders now allow up to 43–50% DTI for qualified buyers. Your actual pre-approval may differ.</li>
        <li>PMI (required below 20% down), closing costs and reserves are not modelled. Add PMI to monthly debts for a more conservative estimate.</li>
        <li>The tool assumes a fixed-rate amortising loan. ARMs, interest-only and balloon loans are not supported.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why is my max home price lower than expected?",
        a: "Most likely the 36% rule is binding — your existing monthly debts eat into the housing budget. Try paying down debts or increasing your down payment to see the effect.",
      },
      {
        q: "Should I include PMI in monthly debts?",
        a: "If your down payment is below 20%, yes — add an estimated PMI to the monthly debts field. PMI typically runs 0.3–1.5% of the loan per year.",
      },
      {
        q: "What's a 'good' DTI?",
        a: "Most lenders prefer total DTI under 36%, with some going to 43% (the qualified-mortgage limit) or higher for strong borrowers. Lower is always better for approval and rate.",
      },
      {
        q: "Does this account for closing costs?",
        a: "No. Closing costs typically run 2–5% of the purchase price and are paid upfront alongside the down payment. Reduce your down payment by that amount for a true invested-cash figure.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Big({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-mono text-2xl font-bold tabular-nums">
        {icon}{value}
      </span>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  muted,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={"text-sm " + (highlight ? "font-medium text-primary" : muted ? "text-muted-foreground/80" : "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={
          "flex items-center gap-1.5 font-mono tabular-nums " +
          (highlight ? "text-base font-semibold text-primary" : muted ? "text-sm text-muted-foreground" : "text-base text-foreground")
        }
      >
        {icon}{value}
      </span>
    </div>
  );
}

function RatioCard({ label, pct, cap, icon }: { label: string; pct: number; cap: number; icon?: React.ReactNode }) {
  const ok = pct <= cap;
  return (
    <div className={"rounded-lg border p-3 " + (ok ? "border-emerald-300/60 bg-emerald-50 dark:bg-emerald-950/20" : "border-rose-300/60 bg-rose-50 dark:bg-rose-950/20")}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}{label}
      </div>
      <p className={"mt-1 font-mono text-lg font-semibold tabular-nums " + (ok ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
        {formatPercent(pct)}
      </p>
      <p className="text-[10px] text-muted-foreground">cap: {cap}%</p>
    </div>
  );
}
