"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Home, Receipt, Wrench, Users } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { parseNumber, formatCurrency, formatPercent, monthlyPayment, RE_DISCLAIMER } from "./_re-helpers";

export function RentalYieldCalculator({ tool }: { tool: ToolDefinition }) {
  const [propertyValue, setPropertyValue] = React.useState<string>("450000");
  const [monthlyRent, setMonthlyRent] = React.useState<string>("2200");
  const [insurance, setInsurance] = React.useState<string>("1200");
  const [taxes, setTaxes] = React.useState<string>("3600");
  const [maintenance, setMaintenance] = React.useState<string>("1800");
  const [management, setManagement] = React.useState<string>("0");
  const [showMortgage, setShowMortgage] = React.useState<boolean>(false);
  const [downPayment, setDownPayment] = React.useState<string>("90000");
  const [rate, setRate] = React.useState<string>("6.8");
  const [years, setYears] = React.useState<string>("30");
  const currency = "USD";

  const value = Math.max(0, parseNumber(propertyValue));
  const rentMo = Math.max(0, parseNumber(monthlyRent));
  const insuranceNum = Math.max(0, parseNumber(insurance));
  const taxesNum = Math.max(0, parseNumber(taxes));
  const maintNum = Math.max(0, parseNumber(maintenance));
  const mgmtNum = Math.max(0, parseNumber(management));

  const annualRent = rentMo * 12;
  const annualExpenses = insuranceNum + taxesNum + maintNum + mgmtNum;
  const netAnnualIncome = annualRent - annualExpenses;

  const grossYield = value > 0 ? (annualRent / value) * 100 : 0;
  const netYield = value > 0 ? (netAnnualIncome / value) * 100 : 0;

  const downNum = Math.max(0, parseNumber(downPayment));
  const rateNum = parseNumber(rate);
  const yearsNum = Math.max(0, parseNumber(years));
  const principal = Math.max(0, value - downNum);
  const mortgagePmt = showMortgage ? monthlyPayment(principal, rateNum, yearsNum) : 0;
  const annualMortgage = mortgagePmt * 12;
  const cashFlowAnnual = netAnnualIncome - annualMortgage;
  const cashOnCash = downNum > 0 ? (cashFlowAnnual / downNum) * 100 : 0;

  const reset = () => {
    setPropertyValue("450000");
    setMonthlyRent("2200");
    setInsurance("1200");
    setTaxes("3600");
    setMaintenance("1800");
    setManagement("0");
    setShowMortgage(false);
    setDownPayment("90000");
    setRate("6.8");
    setYears("30");
    toast.info("Reset.");
  };

  const summary = `Rental yield summary
Property value: ${formatCurrency(value, { currency })}
Monthly rent: ${formatCurrency(rentMo, { currency })}
Annual rent: ${formatCurrency(annualRent, { currency })}
Annual expenses: ${formatCurrency(annualExpenses, { currency })}
Net annual income: ${formatCurrency(netAnnualIncome, { currency })}
Gross yield: ${formatPercent(grossYield)}
Net yield: ${formatPercent(netYield)}${showMortgage ? `
Mortgage P&I / month: ${formatCurrency(mortgagePmt, { currency })}
Annual cash flow: ${formatCurrency(cashFlowAnnual, { currency })}
Cash-on-cash return: ${formatPercent(cashOnCash)}` : ""}`;

  const content: ToolContent = {
    intro:
      "Calculate gross and net rental yield from a property's value, monthly rent and annual expenses. Optionally enter mortgage details to see the cash-on-cash return on your invested down payment. All in your browser — nothing is uploaded.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Property & rent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="ry-value">Property value</Label>
                <Input id="ry-value" inputMode="decimal" value={propertyValue} onChange={(e) => setPropertyValue(e.target.value)} placeholder="450000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ry-rent">Monthly rent</Label>
                <Input id="ry-rent" inputMode="decimal" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} placeholder="2200" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ry-insurance">Insurance / yr</Label>
                  <Input id="ry-insurance" inputMode="decimal" value={insurance} onChange={(e) => setInsurance(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ry-taxes">Property tax / yr</Label>
                  <Input id="ry-taxes" inputMode="decimal" value={taxes} onChange={(e) => setTaxes(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ry-maint">Maintenance / yr</Label>
                  <Input id="ry-maint" inputMode="decimal" value={maintenance} onChange={(e) => setMaintenance(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ry-mgmt">Management / yr</Label>
                  <Input id="ry-mgmt" inputMode="decimal" value={management} onChange={(e) => setManagement(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="ry-mortgage-toggle"
                  type="checkbox"
                  checked={showMortgage}
                  onChange={(e) => setShowMortgage(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="ry-mortgage-toggle" className="text-sm">Include mortgage (cash-on-cash)</Label>
              </div>
              {showMortgage && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="ry-down">Down payment</Label>
                    <Input id="ry-down" inputMode="decimal" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ry-rate">Rate (%)</Label>
                    <Input id="ry-rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ry-years">Term (yrs)</Label>
                    <Input id="ry-years" inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value)} />
                  </div>
                </div>
              )}
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Yields & income</CardTitle>
                <CopyButton value={summary} size="sm" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="Gross yield" value={formatPercent(grossYield)} large icon={<Home className="h-3.5 w-3.5" />} />
              <Row label="Net yield" value={formatPercent(netYield)} large icon={<Home className="h-3.5 w-3.5" />} />
              <div className="border-t pt-3" />
              <Row label="Annual rent" value={formatCurrency(annualRent, { currency })} icon={<Receipt className="h-3.5 w-3.5" />} />
              <Row label="Annual expenses" value={formatCurrency(annualExpenses, { currency })} icon={<Wrench className="h-3.5 w-3.5" />} />
              <Row label="Net annual income" value={formatCurrency(netAnnualIncome, { currency })} highlight icon={<Receipt className="h-3.5 w-3.5" />} />
              {showMortgage && (
                <>
                  <div className="border-t pt-3" />
                  <Row label="Mortgage P&I / month" value={formatCurrency(mortgagePmt, { currency })} muted />
                  <Row label="Annual cash flow" value={formatCurrency(cashFlowAnnual, { currency })} highlight icon={<Users className="h-3.5 w-3.5" />} />
                  <Row label="Cash-on-cash return" value={formatPercent(cashOnCash)} large />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {RE_DISCLAIMER}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter property value and rent",
        description: "Type the purchase price (or current value) of the property and the monthly rent you expect to charge.",
      },
      {
        title: "Add annual expenses",
        description: "Fill in insurance, property tax, maintenance and property management costs as annual figures.",
      },
      {
        title: "Optionally add mortgage",
        description: "Tick 'Include mortgage' to enter down payment, rate and term — you'll see the cash-on-cash return on your invested cash.",
      },
      {
        title: "Read yields and income",
        description: "Gross yield = annual rent ÷ value. Net yield = (annual rent − expenses) ÷ value. Cash-on-cash = annual cash flow ÷ down payment.",
      },
    ],
    useCases: [
      "Compare two rental properties by their net yield rather than headline rent.",
      "See whether the rent covers the mortgage and expenses (positive cash flow).",
      "Stress-test a purchase at a higher interest rate before you commit.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{RE_DISCLAIMER}</li>
        <li>Vacancy, leasing fees, HOA dues and capital-expenditure reserves are not included — add them to maintenance or management to model them.</li>
        <li>Cash-on-cash return uses only the down payment as invested cash. Closing costs and rehab should be added to the down payment for a true invested-capital figure.</li>
      </ul>
    ),
    faq: [
      {
        q: "What's a 'good' rental yield?",
        a: "It depends on the market. Gross yields of 6–8% are common in many US cities; net yields of 4–6% are typical for solid, professionally managed rentals. Higher yields usually mean more risk or more work.",
      },
      {
        q: "Gross yield vs net yield — which matters?",
        a: "Net yield. Gross yield ignores expenses; two properties with the same gross yield can have very different net yields once taxes, insurance and management are factored in.",
      },
      {
        q: "What is cash-on-cash return?",
        a: "Annual cash flow (rent − expenses − mortgage) divided by the cash you invested (down payment + closing costs). It's the simplest measure of yearly return on your actual out-of-pocket cash.",
      },
      {
        q: "Does this account for tax benefits?",
        a: "No. Depreciation, mortgage-interest deductions and 1031 exchanges are not modelled. Talk to a CPA to understand your after-tax return.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Row({
  label,
  value,
  large,
  highlight,
  muted,
  icon,
}: {
  label: string;
  value: string;
  large?: boolean;
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
          (large
            ? "text-xl font-semibold text-foreground"
            : highlight
              ? "text-base font-semibold text-primary"
              : muted
                ? "text-sm text-muted-foreground"
                : "text-base text-foreground")
        }
      >
        {icon}
        {value}
      </span>
    </div>
  );
}
