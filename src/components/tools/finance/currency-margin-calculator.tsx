"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, ArrowRightLeft, TrendingDown, Percent, AlertTriangle } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatNumber,
  formatPercent,
  FINANCE_DISCLAIMER,
} from "./_finance-helpers";

const POPULAR_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "INR",
  "SGD",
  "HKD",
  "NZD",
  "MXN",
  "BRL",
  "ZAR",
];

export function CurrencyMarginCalculator({ tool }: { tool: ToolDefinition }) {
  const [baseCurrency, setBaseCurrency] = React.useState("USD");
  const [quoteCurrency, setQuoteCurrency] = React.useState("EUR");
  const [midRate, setMidRate] = React.useState("0.92");
  const [custRate, setCustRate] = React.useState("0.90");
  const [amount, setAmount] = React.useState("1000");

  const mid = parseNumber(midRate);
  const cust = parseNumber(custRate);
  const amt = Math.max(0, parseNumber(amount));

  // Margin per unit and percentage. A worse customer rate (lower than mid
  // when receiving quote currency) means a positive spread (the bank pockets
  // the difference). A negative spread means the customer is being offered a
  // better rate than mid-market — rare, but possible.
  const marginPerUnit = mid - cust;
  const marginPct = mid !== 0 ? (marginPerUnit / mid) * 100 : 0;

  const atMid = mid * amt;
  const atCustomer = cust * amt;
  const lossQuote = atMid - atCustomer;
  const lossBase = mid !== 0 ? lossQuote / mid : 0;

  const isLoss = lossQuote > 0.000001;
  const isGain = lossQuote < -0.000001;

  const reset = () => {
    setBaseCurrency("USD");
    setQuoteCurrency("EUR");
    setMidRate("0.92");
    setCustRate("0.90");
    setAmount("1000");
    toast.info("Reset to defaults.");
  };

  const swap = () => {
    setBaseCurrency(quoteCurrency);
    setQuoteCurrency(baseCurrency);
    if (mid !== 0) setMidRate(formatNumber(1 / mid, { maximumFractionDigits: 6 }));
    if (cust !== 0) setCustRate(formatNumber(1 / cust, { maximumFractionDigits: 6 }));
    toast.info("Currencies inverted. Double-check the rates.");
  };

  const summary = `Currency margin
Mid-market rate: 1 ${baseCurrency} = ${formatNumber(mid, { maximumFractionDigits: 6 })} ${quoteCurrency}
Customer rate:   1 ${baseCurrency} = ${formatNumber(cust, { maximumFractionDigits: 6 })} ${quoteCurrency}
Transaction amount: ${formatNumber(amt, { maximumFractionDigits: 2 })} ${baseCurrency}

Margin per unit: ${formatNumber(marginPerUnit, { maximumFractionDigits: 6 })} ${quoteCurrency}
Margin (%): ${formatPercent(marginPct, 3)}
You'd receive at mid-market: ${formatNumber(atMid, { maximumFractionDigits: 2 })} ${quoteCurrency}
You'll receive at offered rate: ${formatNumber(atCustomer, { maximumFractionDigits: 2 })} ${quoteCurrency}
You ${isLoss ? "lose" : isGain ? "gain" : "break even"}: ${formatNumber(Math.abs(lossQuote), { maximumFractionDigits: 2 })} ${quoteCurrency}
(≈ ${formatNumber(Math.abs(lossBase), { maximumFractionDigits: 2 })} ${baseCurrency})`;

  const content: ToolContent = {
    intro:
      "Quantify how much you lose to a bank, broker or money-transfer service on a currency exchange. Enter the mid-market (interbank) rate, the rate offered to you and the transaction amount — the calculator shows the margin per unit, the margin as a percentage, the effective rate you actually receive and the total cost of the spread.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div className="space-y-2">
                <Label htmlFor="cm-base">From currency</Label>
                <CurrencyInput value={baseCurrency} onChange={setBaseCurrency} id="cm-base" />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mb-0.5"
                onClick={swap}
                aria-label="Swap currencies"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
              <div className="space-y-2">
                <Label htmlFor="cm-quote">To currency</Label>
                <CurrencyInput value={quoteCurrency} onChange={setQuoteCurrency} id="cm-quote" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cm-mid">
                Mid-market rate (1 {baseCurrency} = ? {quoteCurrency})
              </Label>
              <Input
                id="cm-mid"
                inputMode="decimal"
                value={midRate}
                onChange={(e) => setMidRate(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                The live interbank rate you can verify on Google, XE or Reuters.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cm-cust">
                Rate offered to you (1 {baseCurrency} = ? {quoteCurrency})
              </Label>
              <Input
                id="cm-cust"
                inputMode="decimal"
                value={custRate}
                onChange={(e) => setCustRate(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                The rate your bank, broker or transfer service actually quoted.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cm-amt">Transaction amount ({baseCurrency})</Label>
              <Input
                id="cm-amt"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Result</h3>
              <CopyButton value={summary} size="sm" />
            </div>

            <div
              className={
                "rounded-lg border p-4 " +
                (isLoss
                  ? "border-rose-400/60 bg-rose-50 dark:bg-rose-950/30"
                  : isGain
                    ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-muted")
              }
            >
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {isLoss ? (
                  <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                )}
                You {isLoss ? "lose" : isGain ? "gain" : "break even"} vs mid-market
              </div>
              <div className="mt-1 font-mono text-3xl font-semibold tabular-nums text-foreground">
                {formatNumber(Math.abs(lossQuote), { maximumFractionDigits: 2 })} {quoteCurrency}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                ≈ {formatNumber(Math.abs(lossBase), { maximumFractionDigits: 2 })} {baseCurrency} equivalent
              </div>
            </div>

            <div className="grid gap-2">
              <Row label="Margin per unit" value={`${formatNumber(marginPerUnit, { maximumFractionDigits: 6 })} ${quoteCurrency}`} />
              <Row
                label="Margin (%)"
                value={formatPercent(marginPct, 3)}
                highlight
                hint={<Percent className="h-3.5 w-3.5 text-amber-500" />}
              />
              <Row
                label={`You'd receive at mid-market`}
                value={`${formatNumber(atMid, { maximumFractionDigits: 2 })} ${quoteCurrency}`}
              />
              <Row
                label="You'll receive at offered rate"
                value={`${formatNumber(atCustomer, { maximumFractionDigits: 2 })} ${quoteCurrency}`}
              />
              <Row
                label="Effective exchange rate"
                value={`1 ${baseCurrency} = ${formatNumber(cust, { maximumFractionDigits: 6 })} ${quoteCurrency}`}
              />
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
              The bank or transfer service keeps the spread between the
              mid-market rate and the rate they quote you. A 2% margin on a
              10,000 transfer costs you ~200 in hidden fees on top of any
              explicit fee they charge.
            </div>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Pick the currencies you are converting",
        description:
          "Choose the base (from) and quote (to) currencies. Use the swap button to invert the rate (e.g. USD→EUR becomes EUR→USD).",
      },
      {
        title: "Enter the mid-market rate",
        description:
          "The live interbank rate you can verify on Google Finance, XE.com or Reuters. This is the 'true' exchange rate before any markup.",
      },
      {
        title: "Enter the rate offered to you",
        description:
          "The rate your bank, broker, card network or money-transfer service actually quoted for the transaction.",
      },
      {
        title: "Enter the transaction amount and read the loss",
        description:
          "The difference between the two rates × the amount is the hidden fee you pay. Use it to compare providers and decide whether a fixed-fee service is cheaper.",
      },
    ],
    useCases: [
      "Compare a bank's FX markup against a specialist transfer service like Wise.",
      "Quantify the hidden fee on a card-payment currency conversion (DCC) at checkout.",
      "Decide whether to pay in home or local currency when travelling abroad.",
      "Negotiate a better rate with your broker for large transfers.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          Mid-market rates move intraday. The rate you enter is a snapshot —
          always verify on a live source immediately before transacting.
        </li>
        <li>
          This calculator shows only the spread (margin). Most providers also
          charge explicit fixed or percentage fees on top. Add those to the
          margin to get the total cost.
        </li>
        <li>
          Card networks (Visa/Mastercard) typically add 1–3% on top of mid for
          foreign transactions, and some merchants offer Dynamic Currency
          Conversion (DCC) with even higher margins — always choose to pay in
          the local currency.
        </li>
        <li>
          Interbank rates apply to large institutional trades (typically over
          $1M). Retail customers never transact at mid — the realistic best
          case is mid + 0.3–0.5% from a specialist broker.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What is a 'good' margin?",
        a: "Specialist FX brokers (Wise, Revolut, IBKR) charge 0.3–0.6% margin. Traditional banks typically charge 2–4%. Card DCC at point of sale is often 4–6%. Anything above 1% on a large transfer is worth shopping around.",
      },
      {
        q: "Why is the margin not the same as the fee my bank quoted?",
        a: "Banks often quote 'zero fees' but make their money on the FX spread instead. The total cost of a currency conversion = explicit fee + hidden margin. This tool isolates the margin so you can compare apples to apples.",
      },
      {
        q: "Should I pay in my home currency or local currency abroad?",
        a: "Almost always local currency. When a card terminal offers to bill you in your home currency (DCC), the merchant's processor sets the rate — typically 3–6% worse than your card network's rate. Declining DCC lets your card network convert at their (usually better) rate.",
      },
      {
        q: "Why does my margin show as a gain?",
        a: "If the rate offered is better than mid-market (extremely rare), the tool will report a gain. This can happen if you mistyped the rates, swapped the from/to currencies, or are looking at a stale mid-market rate.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function CurrencyInput({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id: string;
}) {
  return (
    <Input
      id={id}
      list="cm-currencies"
      value={value}
      onChange={(e) => onChange(e.target.value.toUpperCase().slice(0, 3))}
      maxLength={3}
      className="uppercase"
    />
  );
}

function Row({
  label,
  value,
  highlight,
  hint,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
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
          (highlight ? "text-base font-semibold text-primary" : "text-sm text-foreground")
        }
      >
        {hint}
        {value}
      </span>
    </div>
  );
}
