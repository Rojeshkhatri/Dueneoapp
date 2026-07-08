"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Trophy, Building2, Percent, Calendar, DollarSign } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatNumber,
  monthlyPayment,
  FINANCE_DISCLAIMER,
} from "./_finance-helpers";
import { useCurrency, CurrencySelector } from "@/components/dueneo/currency-selector";

interface Offer {
  id: string;
  lender: string;
  rate: string;
  term: string;
  fees: string;
  points: string;
}

const DEFAULT_OFFERS: Offer[] = [
  { id: "o1", lender: "Bank A", rate: "6.85", term: "30", fees: "2500", points: "0" },
  { id: "o2", lender: "Credit Union B", rate: "6.50", term: "30", fees: "3500", points: "0.5" },
  { id: "o3", lender: "Online Lender C", rate: "6.25", term: "30", fees: "4500", points: "1" },
];

function calcOffer(
  offer: Offer,
  principal: number,
  currency: string
): {
  monthly: number;
  totalInterest: number;
  totalCost: number;
  upfrontCost: number;
  termMonths: number;
} {
  const rate = parseNumber(offer.rate);
  const years = Math.max(1, parseNumber(offer.term));
  const fees = Math.max(0, parseNumber(offer.fees));
  const points = parseNumber(offer.points);
  // Points: 1 point = 1% of principal, paid upfront.
  const pointsCost = (points / 100) * principal;
  const upfrontCost = fees + pointsCost;
  const monthly = monthlyPayment(principal, rate, years);
  const termMonths = Math.round(years * 12);
  const totalPaid = monthly * termMonths;
  const totalInterest = Math.max(0, totalPaid - principal);
  const totalCost = totalPaid + upfrontCost;
  return { monthly, totalInterest, totalCost, upfrontCost, termMonths };
}

export function MortgageComparison({ tool }: { tool: ToolDefinition }) {
  const [principal, setPrincipal] = React.useState("350000");
  const { code: currency, setCode: setCurrency } = useCurrency();
  const [offers, setOffers] = React.useState<Offer[]>(DEFAULT_OFFERS);

  const principalNum = Math.max(0, parseNumber(principal));

  const results = React.useMemo(
    () => offers.map((o) => ({ offer: o, ...calcOffer(o, principalNum, currency) })),
    [offers, principalNum, currency]
  );

  // Cheapest by total cost (only consider offers with a positive principal).
  const cheapestTotal = results.reduce<number>(
    (min, r) => (Number.isFinite(r.totalCost) && (min < 0 || r.totalCost < min) ? r.totalCost : min),
    -1
  );
  const cheapestIds = new Set(
    results.filter((r) => r.totalCost === cheapestTotal && principalNum > 0).map((r) => r.offer.id)
  );

  const updateOffer = (id: string, patch: Partial<Offer>) => {
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const reset = () => {
    setPrincipal("350000");
    setOffers(DEFAULT_OFFERS.map((o) => ({ ...o })));
    toast.info("Reset to defaults.");
  };

  const summary = `Mortgage comparison
Loan amount: ${formatCurrency(principalNum, { currency })}
${results
  .map((r) => {
    const win = cheapestIds.has(r.offer.id) ? " ← CHEAPEST" : "";
    return `${r.offer.lender} | rate ${parseNumber(r.offer.rate).toFixed(3)}% | ${parseNumber(r.offer.term)}yr
  Monthly: ${formatCurrency(r.monthly, { currency })}
  Total interest: ${formatCurrency(r.totalInterest, { currency })}
  Total cost: ${formatCurrency(r.totalCost, { currency })}${win}`;
  })
  .join("\n")}`;

  const content: ToolContent = {
    intro:
      "Compare up to three mortgage offers side by side on the same loan amount. Enter the lender name, interest rate, term, fees/closing costs and discount points for each offer. The tool computes the monthly payment, total interest and total cost (including upfront fees and points) and highlights the cheapest total cost.",
    tool: (
      <div className="space-y-5">
        <div className="rounded-xl border bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mc-principal">Loan amount (purchase price − down payment)</Label>
              <Input
                id="mc-principal"
                inputMode="decimal"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <CurrencySelector
                value={currency}
                onChange={setCurrency}
                id="mc-cur"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {results.map((r) => {
            const isCheapest = cheapestIds.has(r.offer.id);
            return (
              <Card
                key={r.offer.id}
                className={
                  "relative flex flex-col gap-4 p-4 transition " +
                  (isCheapest
                    ? "border-emerald-500 ring-2 ring-emerald-500/40"
                    : "")
                }
              >
                {isCheapest && (
                  <div className="absolute -top-2.5 right-3">
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                      <Trophy className="mr-1 h-3 w-3" /> Cheapest
                    </Badge>
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <Input
                      aria-label={`Lender name for offer ${r.offer.id}`}
                      value={r.offer.lender}
                      onChange={(e) => updateOffer(r.offer.id, { lender: e.target.value })}
                      className="h-8 border-0 bg-transparent px-0 text-base font-semibold focus-visible:ring-1"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Field label="Interest rate (%)">
                      <Input
                        inputMode="decimal"
                        value={r.offer.rate}
                        onChange={(e) => updateOffer(r.offer.id, { rate: e.target.value })}
                        className="h-8"
                        aria-label="Interest rate percent"
                      />
                    </Field>
                    <Field label="Term (years)">
                      <Input
                        inputMode="decimal"
                        value={r.offer.term}
                        onChange={(e) => updateOffer(r.offer.id, { term: e.target.value })}
                        className="h-8"
                        aria-label="Term in years"
                      />
                    </Field>
                    <Field label="Fees / closing costs">
                      <Input
                        inputMode="decimal"
                        value={r.offer.fees}
                        onChange={(e) => updateOffer(r.offer.id, { fees: e.target.value })}
                        className="h-8"
                        aria-label="Fees and closing costs"
                      />
                    </Field>
                    <Field label="Discount points (% of loan)">
                      <Input
                        inputMode="decimal"
                        value={r.offer.points}
                        onChange={(e) => updateOffer(r.offer.id, { points: e.target.value })}
                        className="h-8"
                        aria-label="Discount points as percent of loan"
                      />
                    </Field>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                  <SummaryRow
                    icon={<DollarSign className="h-3.5 w-3.5 text-muted-foreground" />}
                    label="Monthly payment"
                    value={formatCurrency(r.monthly, { currency })}
                  />
                  <SummaryRow
                    icon={<Percent className="h-3.5 w-3.5 text-amber-500" />}
                    label="Total interest"
                    value={formatCurrency(r.totalInterest, { currency })}
                  />
                  <SummaryRow
                    icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
                    label="Upfront (fees + points)"
                    value={formatCurrency(r.upfrontCost, { currency })}
                  />
                  <div className="mt-1 border-t pt-2">
                    <SummaryRow
                      label="Total cost"
                      value={formatCurrency(r.totalCost, { currency })}
                      large
                      highlight={isCheapest}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">
            Cheapest total cost:{" "}
            <strong className="text-foreground">
              {principalNum > 0 && cheapestTotal >= 0
                ? formatCurrency(cheapestTotal, { currency })
                : "—"}
            </strong>{" "}
            over {results.find((r) => cheapestIds.has(r.offer.id))?.offer.term ?? "—"} years
            ({results.find((r) => cheapestIds.has(r.offer.id))?.offer.lender ?? "—"}).
          </div>
          <CopyButton value={summary} size="sm" />
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter the loan amount",
        description:
          "This is the amount you are borrowing (purchase price minus down payment). All three offers share this loan amount.",
      },
      {
        title: "Fill in each lender's offer",
        description:
          "For each offer enter the lender name, annual interest rate, term in years, fees/closing costs and discount points (as a percentage of the loan amount).",
      },
      {
        title: "Read the results",
        description:
          "Each card shows the monthly payment, total interest over the full term, upfront cost (fees + points) and the total cost (sum of all payments plus upfront).",
      },
      {
        title: "Pick the cheapest total cost",
        description:
          "The cheapest offer is highlighted with a green border and trophy badge. Watch out — the lowest monthly payment is not always the cheapest total cost.",
      },
    ],
    useCases: [
      "Compare a 30-year offer with a 15-year offer on the same loan amount.",
      "Decide whether paying discount points upfront is worth it over your expected holding period.",
      "Weigh a low-rate offer with high fees against a higher-rate offer with low fees.",
      "Get a single number (total cost) to compare apples-to-apples across lenders.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          The model assumes a fixed-rate, fully-amortising loan. Adjustable-rate
          mortgages (ARMs), interest-only periods and balloon payments are not
          modelled.
        </li>
        <li>
          Discount points reduce the rate in real life; this tool does NOT adjust
          the rate based on the points you enter — enter the rate the lender
          quoted for that point tier.
        </li>
        <li>
          The "total cost" is the sum of all monthly payments plus upfront fees
          and points. It does not account for the time value of money — a
          proper net-present-value comparison would discount future payments.
        </li>
        <li>
          Property taxes, insurance, PMI and HOA dues are not included. Add them
          separately when budgeting your total monthly housing cost.
        </li>
        <li>
          If you expect to move or refinance before the end of the term, a
          shorter holding-period break-even analysis is more appropriate than
          full-term total cost.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What are discount points?",
        a: "A point is 1% of the loan amount paid upfront to reduce the interest rate. 0.5 points on a 350,000 loan costs 1,750 upfront. Points make sense if you keep the loan long enough for the lower monthly payment to recoup the upfront cost.",
      },
      {
        q: "Why is the cheapest total cost not always the lowest monthly payment?",
        a: "A longer term (e.g. 30 vs 15 years) gives a lower monthly payment but you pay interest for twice as long, so the total cost is higher. Points and fees also add to the upfront cost without changing the monthly payment.",
      },
      {
        q: "Should I include property taxes and insurance?",
        a: "No — those vary by location and are not part of the loan. Add them to your monthly budget separately. The lender's PITI quote (Principal, Interest, Taxes, Insurance) is your full monthly housing cost.",
      },
      {
        q: "Does this account for refinancing?",
        a: "No. If you expect to refinance or sell before the term ends, you will not pay the full total cost. In that case, compare break-even points on the upfront fees instead.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  large,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  large?: boolean;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
      <span
        className={
          "font-mono tabular-nums " +
          (large
            ? highlight
              ? "text-lg font-semibold text-emerald-600 dark:text-emerald-500"
              : "text-lg font-semibold text-foreground"
            : "text-sm text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}
