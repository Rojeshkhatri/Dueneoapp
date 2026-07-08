"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Home, Shield, Landmark } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  monthlyPayment,
  amortisationSchedule,
  FINANCE_DISCLAIMER,
} from "./_finance-helpers";
import { useCurrency, CurrencySelector } from "@/components/dueneo/currency-selector";

export function MortgageCalculator({ tool }: { tool: ToolDefinition }) {
  const [homePrice, setHomePrice] = React.useState<string>("400000");
  const [downPayment, setDownPayment] = React.useState<string>("80000");
  const [rate, setRate] = React.useState<string>("6.8");
  const [years, setYears] = React.useState<string>("30");
  const [propertyTax, setPropertyTax] = React.useState<string>("3600");
  const [insurance, setInsurance] = React.useState<string>("1200");
  const { code: currency, setCode: setCurrency } = useCurrency();

  const homeNum = Math.max(0, parseNumber(homePrice));
  const downNum = Math.max(0, Math.min(homeNum, parseNumber(downPayment)));
  const rateNum = parseNumber(rate);
  const yearsNum = Math.max(0, parseNumber(years));
  const taxNum = Math.max(0, parseNumber(propertyTax));
  const insuranceNum = Math.max(0, parseNumber(insurance));

  const principal = Math.max(0, homeNum - downNum);
  const principalAndInterest = monthlyPayment(principal, rateNum, yearsNum);
  const monthlyTax = taxNum / 12;
  const monthlyInsurance = insuranceNum / 12;
  const monthlyTotal = principalAndInterest + monthlyTax + monthlyInsurance;
  const totalPayments = principalAndInterest * Math.max(1, Math.round(yearsNum * 12));
  const totalInterest = Math.max(0, totalPayments - principal);
  const lifetimeCost = monthlyTotal * Math.max(1, Math.round(yearsNum * 12));

  const downPaymentPct = homeNum > 0 ? (downNum / homeNum) * 100 : 0;
  // Amortisation is cheap (≤12 rows of arithmetic) so we compute it inline
  // rather than memoising — keeps the React Compiler happy.
  const schedule = amortisationSchedule(principal, rateNum, yearsNum, 12);

  const reset = () => {
    setHomePrice("400000");
    setDownPayment("80000");
    setRate("6.8");
    setYears("30");
    setPropertyTax("3600");
    setInsurance("1200");
    toast.info("Reset.");
  };

  const summary = `Mortgage summary
Home price: ${formatCurrency(homeNum, { currency })}
Down payment: ${formatCurrency(downNum, { currency })} (${downPaymentPct.toFixed(1)}%)
Loan principal: ${formatCurrency(principal, { currency })}
Annual rate: ${rateNum.toFixed(3)}%
Term: ${yearsNum} years
Principal & interest / month: ${formatCurrency(principalAndInterest, { currency })}
Property tax / month: ${formatCurrency(monthlyTax, { currency })}
Home insurance / month: ${formatCurrency(monthlyInsurance, { currency })}
Total monthly payment: ${formatCurrency(monthlyTotal, { currency })}
Total interest paid: ${formatCurrency(totalInterest, { currency })}
Lifetime cost: ${formatCurrency(lifetimeCost, { currency })}`;

  const content: ToolContent = {
    intro:
      "Estimate the true monthly cost of a home loan — principal, interest, property tax and insurance — in one place. Enter the home price, down payment, interest rate and term, then add your annual property-tax and insurance estimates to see your total monthly outlay and lifetime cost.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="mc-home">Home price</Label>
              <Input
                id="mc-home"
                inputMode="decimal"
                value={homePrice}
                onChange={(e) => setHomePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mc-down">Down payment</Label>
                <Input
                  id="mc-down"
                  inputMode="decimal"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  {downPaymentPct.toFixed(1)}% of home price
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mc-rate">Annual interest rate (%)</Label>
                <Input
                  id="mc-rate"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-years">Term (years)</Label>
              <Input
                id="mc-years"
                inputMode="decimal"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                placeholder="30"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mc-tax">Annual property tax</Label>
                <Input
                  id="mc-tax"
                  inputMode="decimal"
                  value={propertyTax}
                  onChange={(e) => setPropertyTax(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mc-insurance">Annual home insurance</Label>
                <Input
                  id="mc-insurance"
                  inputMode="decimal"
                  value={insurance}
                  onChange={(e) => setInsurance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <CurrencySelector value={currency} onChange={setCurrency} id="mc-currency" />
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Monthly breakdown</h3>
              <CopyButton value={summary} size="sm" />
            </div>

            <div className="grid gap-2">
              <Row
                label="Monthly payment"
                value={formatCurrency(monthlyTotal, { currency })}
                large
              />
              <Row
                label="Principal & interest"
                value={formatCurrency(principalAndInterest, { currency })}
                hint={<Home className="h-3.5 w-3.5 text-muted-foreground" />}
              />
              <Row
                label="Property tax (1/12)"
                value={formatCurrency(monthlyTax, { currency })}
                hint={<Landmark className="h-3.5 w-3.5 text-muted-foreground" />}
              />
              <Row
                label="Home insurance (1/12)"
                value={formatCurrency(monthlyInsurance, { currency })}
                hint={<Shield className="h-3.5 w-3.5 text-muted-foreground" />}
              />
            </div>

            <div className="border-t pt-3">
              <Row
                label="Loan principal"
                value={formatCurrency(principal, { currency })}
                muted
              />
              <Row
                label="Total interest paid"
                value={formatCurrency(totalInterest, { currency })}
                highlight
              />
              <Row
                label="Lifetime cost"
                value={formatCurrency(lifetimeCost, { currency })}
                muted
              />
            </div>

            {downPaymentPct < 20 && homeNum > 0 && (
              <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                Down payment is below 20% — most lenders will require private mortgage
                insurance (PMI), which is not included in this estimate.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Amortisation preview (first 12 months)</h3>
          <p className="text-xs text-muted-foreground">
            Shows how the principal &amp; interest portion of your payment splits during the
            first year. Tax and insurance are not part of this table.
          </p>
          <div className="mt-4 max-h-96 overflow-y-auto rounded-lg border bg-background pr-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Month</TableHead>
                  <TableHead className="text-right">Payment</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      Enter mortgage details above to preview the schedule.
                    </TableCell>
                  </TableRow>
                ) : (
                  schedule.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(row.payment, { currency })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-amber-600 dark:text-amber-500">
                        {formatCurrency(row.interest, { currency })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-500">
                        {formatCurrency(row.principal, { currency })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(row.balance, { currency })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter the home price",
        description:
          "Type the purchase price of the property. Defaults to 400,000 to make the example tangible.",
      },
      {
        title: "Enter the down payment",
        description:
          "Specify the cash you will put down upfront. The percentage of the home price is shown live — below 20% most lenders require PMI.",
      },
      {
        title: "Set the rate, term, tax and insurance",
        description:
          "Enter the annual interest rate, the term in years, and your annual property-tax and home-insurance estimates. The monthly breakdown adds all four together.",
      },
      {
        title: "Read the breakdown and schedule",
        description:
          "The total monthly payment is split into principal & interest, tax and insurance. The first 12 months of the amortisation schedule appear below.",
      },
    ],
    useCases: [
      "Compare monthly payments on a 15-year vs 30-year mortgage before committing.",
      "Stress-test affordability at a higher interest rate before locking in.",
      "See how a larger down payment reduces both the loan size and the monthly payment.",
      "Budget for the full monthly housing cost (PITI) — not just the loan repayment.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          Private mortgage insurance (PMI), HOA dues, flood insurance and closing costs are
          not included. Add PMI manually if your down payment is below 20%.
        </li>
        <li>
          Property tax and insurance are split evenly across 12 months. Real escrow
          payments may differ based on local assessment cycles.
        </li>
        <li>
          The model uses a fixed-rate annuity structure. Adjustable-rate mortgages (ARMs),
          interest-only periods and balloon payments are not supported.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What is PITI?",
        a: "Principal, Interest, Taxes and Insurance — the four components most lenders use to qualify you for a mortgage. This calculator shows all four so you can budget the true monthly cost.",
      },
      {
        q: "Should I include PMI?",
        a: "Yes, if your down payment is below 20% of the home price. PMI typically costs 0.3–1.5% of the original loan per year. Estimate it as an extra annual cost and add it to the property-tax field as a workaround.",
      },
      {
        q: "Does this handle adjustable-rate mortgages?",
        a: "No. The model assumes a fixed rate for the full term. For an ARM, run separate scenarios at the start rate and the maximum rate to understand the worst-case payment.",
      },
      {
        q: "Is this a mortgage offer?",
        a: "No. It is an estimate based on standard annuity maths. Your actual repayment depends on the lender's underwriting, mortgage insurance, fees and the day-count convention they use.",
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
  muted,
  hint,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  large?: boolean;
  muted?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          "text-sm " +
          (highlight
            ? "font-medium text-primary"
            : muted
              ? "text-muted-foreground/80"
              : "text-muted-foreground")
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
              : muted
                ? "text-sm text-muted-foreground"
                : "text-base text-foreground")
        }
      >
        {hint}
        {value}
      </span>
    </div>
  );
}
