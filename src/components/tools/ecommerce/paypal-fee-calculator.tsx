"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  Banknote,
  CreditCard,
  Globe,
  Users,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatPercent,
  ECOMMERCE_DISCLAIMER,
  PAYPAL_TRANSACTION_TYPES,
  computeProcessingFee,
  computeReverseCharge,
  type PaypalTransactionType,
  Row,
  StatCard,
} from "./_ecommerce-helpers";
import { useCurrency, CurrencySelector, money } from "@/components/dueneo/currency-selector";

const TX_ICONS: Record<string, React.ReactNode> = {
  "goods-services-domestic": <CreditCard className="h-3.5 w-3.5 text-primary" />,
  "goods-services-international": <Globe className="h-3.5 w-3.5 text-primary" />,
  "friends-family-balance": <Users className="h-3.5 w-3.5 text-primary" />,
  "friends-family-card": <CreditCard className="h-3.5 w-3.5 text-primary" />,
};

export function PaypalFeeCalculator({ tool }: { tool: ToolDefinition }) {
  // Forward mode: charge $X, see how much you receive.
  const [fwdAmount, setFwdAmount] = React.useState<string>("100.00");
  const [fwdTypeKey, setFwdTypeKey] = React.useState<string>(
    PAYPAL_TRANSACTION_TYPES[0].key,
  );

  // Reverse mode: I want to receive $Y, see how much to charge.
  const [revTarget, setRevTarget] = React.useState<string>("100.00");
  const [revTypeKey, setRevTypeKey] = React.useState<string>(
    PAYPAL_TRANSACTION_TYPES[0].key,
  );
  const { code: currency, setCode: setCurrency } = useCurrency();
  const fmt = (v: number) => money(v, currency);

  const fwdType = React.useMemo<PaypalTransactionType>(
    () => PAYPAL_TRANSACTION_TYPES.find((t) => t.key === fwdTypeKey) ?? PAYPAL_TRANSACTION_TYPES[0],
    [fwdTypeKey],
  );
  const revType = React.useMemo<PaypalTransactionType>(
    () => PAYPAL_TRANSACTION_TYPES.find((t) => t.key === revTypeKey) ?? PAYPAL_TRANSACTION_TYPES[0],
    [revTypeKey],
  );

  const fwdAmt = Math.max(0, parseNumber(fwdAmount));
  const revAmt = Math.max(0, parseNumber(revTarget));

  // Forward: charge X → receive X − fee.
  const fwdFee = computeProcessingFee(fwdAmt, fwdType.ratePct, fwdType.fixed);
  const fwdNet = Math.max(0, fwdAmt - fwdFee);
  const fwdFeePct = fwdAmt > 0 ? (fwdFee / fwdAmt) * 100 : 0;

  // Reverse: want net Y → charge X.
  const revResult = computeReverseCharge(revAmt, revType.ratePct, revType.fixed);

  const reset = () => {
    setFwdAmount("100.00");
    setFwdTypeKey(PAYPAL_TRANSACTION_TYPES[0].key);
    setRevTarget("100.00");
    setRevTypeKey(PAYPAL_TRANSACTION_TYPES[0].key);
    toast.info("Reset.");
  };

  const fwdSummary = `PayPal fee (forward)
Charge amount:        ${fmt(fwdAmt)}
Transaction type:     ${fwdType.label}
Rate:                 ${fwdType.ratePct}%${fwdType.fixed > 0 ? ` + $${fwdType.fixed.toFixed(2)}` : ""}

Processing fee:       ${fmt(fwdFee)} (${formatPercent(fwdFeePct)} of charge)
Net received:         ${fmt(fwdNet)}`;

  const revSummary = `PayPal fee (reverse)
Target net received:  ${fmt(revAmt)}
Transaction type:     ${revType.label}
Rate:                 ${revType.ratePct}%${revType.fixed > 0 ? ` + $${revType.fixed.toFixed(2)}` : ""}

Charge amount:        ${fmt(revResult.gross)}
Processing fee:       ${fmt(revResult.fee)}
Net received:         ${fmt(revResult.net)}`;

  const renderTypeSelector = (
    id: string,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>Transaction type</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAYPAL_TRANSACTION_TYPES.map((t) => (
            <SelectItem key={t.key} value={t.key}>
              {t.label} —{" "}
              {t.ratePct === 0 && t.fixed === 0
                ? "Free"
                : `${t.ratePct}%${t.fixed > 0 ? ` + $${t.fixed.toFixed(2)}` : ""}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const toolBody = (
    <div className="space-y-5">
      <Tabs defaultValue="forward" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="forward" className="flex-1 sm:flex-none">
            <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" /> Charge → Receive
          </TabsTrigger>
          <TabsTrigger value="reverse" className="flex-1 sm:flex-none">
            <Wallet className="mr-1.5 h-3.5 w-3.5" /> Receive → Charge
          </TabsTrigger>
        </TabsList>

        {/* FORWARD MODE ===================================================== */}
        <TabsContent value="forward">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border bg-card p-5">
              <SectionLabel>How much are you charging?</SectionLabel>

              <div className="space-y-2">
                <Label htmlFor="pp-fwd-amt">Charge amount</Label>
                <Input
                  id="pp-fwd-amt"
                  inputMode="decimal"
                  value={fwdAmount}
                  onChange={(e) => setFwdAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {renderTypeSelector("pp-fwd-type", fwdTypeKey, setFwdTypeKey)}

              <p className="text-xs text-muted-foreground">{fwdType.hint}</p>

              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
              <CurrencySelector value={currency} onChange={setCurrency} id="pp-currency" className="pt-2" />
            </div>

            <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
              <div className="flex items-center justify-between">
                <SectionLabel>Result</SectionLabel>
                <CopyButton value={fwdSummary} size="sm" />
              </div>

              {fwdAmt === 0 && (
                <p className="text-sm text-muted-foreground">
                  Enter a charge amount to see the processing fee.
                </p>
              )}

              {fwdAmt > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      label="Net received"
                      value={fmt(fwdNet)}
                      tone="emerald"
                      icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                      hint={`After ${fmt(fwdFee)} fee`}
                    />
                    <StatCard
                      label="Processing fee"
                      value={fmt(fwdFee)}
                      tone="primary"
                      icon={<CreditCard className="h-3.5 w-3.5 text-primary" />}
                      hint={fwdFee > 0 ? `${formatPercent(fwdFeePct)} of charge` : "No fee"}
                    />
                  </div>

                  <div className="space-y-2 rounded-lg border bg-background p-4">
                    <Row label="Charge amount" value={fmt(fwdAmt)} />
                    <div className="border-t pt-2">
                      <Row
                        label={
                          fwdType.ratePct === 0 && fwdType.fixed === 0
                            ? "No fee (free transfer)"
                            : `${fwdType.ratePct}%${fwdType.fixed > 0 ? ` + $${fwdType.fixed.toFixed(2)}` : ""}`
                        }
                        value={fmt(fwdFee)}
                        icon={TX_ICONS[fwdType.key]}
                      />
                    </div>
                    <div className="border-t pt-2">
                      <Row
                        label="Net received"
                        value={fmt(fwdNet)}
                        large
                        highlight
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* REVERSE MODE ===================================================== */}
        <TabsContent value="reverse">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border bg-card p-5">
              <SectionLabel>How much do you want to receive?</SectionLabel>

              <div className="space-y-2">
                <Label htmlFor="pp-rev-amt">Target net amount</Label>
                <Input
                  id="pp-rev-amt"
                  inputMode="decimal"
                  value={revTarget}
                  onChange={(e) => setRevTarget(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  The amount you want to land in your PayPal balance after the
                  fee is deducted.
                </p>
              </div>

              {renderTypeSelector("pp-rev-type", revTypeKey, setRevTypeKey)}

              <p className="text-xs text-muted-foreground">{revType.hint}</p>
            </div>

            <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
              <div className="flex items-center justify-between">
                <SectionLabel>Charge this amount</SectionLabel>
                <CopyButton value={revSummary} size="sm" />
              </div>

              {revAmt === 0 && (
                <p className="text-sm text-muted-foreground">
                  Enter a target net amount to see how much to charge.
                </p>
              )}

              {revAmt > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      label="Charge this amount"
                      value={fmt(revResult.gross)}
                      tone="emerald"
                      icon={<Banknote className="h-3.5 w-3.5 text-emerald-500" />}
                      hint={`To net ${fmt(revResult.net)}`}
                    />
                    <StatCard
                      label="Processing fee"
                      value={fmt(revResult.fee)}
                      tone="primary"
                      icon={<CreditCard className="h-3.5 w-3.5 text-primary" />}
                      hint={
                        revType.ratePct === 0 && revType.fixed === 0
                          ? "No fee (charge = net)"
                          : `${revType.ratePct}% + $${revType.fixed.toFixed(2)}`
                      }
                    />
                  </div>

                  <div className="space-y-2 rounded-lg border bg-background p-4">
                    <Row label="Target net received" value={fmt(revResult.net)} />
                    <div className="border-t pt-2">
                      <Row
                        label={
                          revType.ratePct === 0 && revType.fixed === 0
                            ? "No fee (free transfer)"
                            : `Processing fee (${revType.ratePct}%${revType.fixed > 0 ? ` + $${revType.fixed.toFixed(2)}` : ""})`
                        }
                        value={fmt(revResult.fee)}
                        icon={TX_ICONS[revType.key]}
                      />
                    </div>
                    <div className="border-t pt-2">
                      <Row
                        label="Charge the sender"
                        value={fmt(revResult.gross)}
                        large
                        highlight
                      />
                      {revType.ratePct === 0 && revType.fixed === 0 && (
                        <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                          Free transfer — charge exactly the amount you want to
                          receive. PayPal only charges a fee when funded by card
                          or for cross-border commercial transactions.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
        <p>
          <strong className="text-foreground">Forward</strong>: charge $X, see
          how much you net. <strong className="text-foreground">Reverse</strong>:
          tell the calculator what you want to net and it tells you what to
          charge. Friends & Family funded by balance or bank is free — no
          surcharge applies.
        </p>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Calculate PayPal's processing fee for any transaction type — Goods & Services domestic (2.99% + $0.49) or international (4.99% + $0.49), Friends & Family funded by balance/bank (free) or by card (2.99% + $0.49). Toggle between forward mode (\"if I charge $X, what do I receive?\") and reverse mode (\"if I want to net $Y, what should I charge?\"). All calculations update live as you type.",
    tool: toolBody,
    howTo: [
      {
        title: "Pick a mode",
        description:
          "Use Charge → Receive if you know the charge amount and want to see the net. Use Receive → Charge if you have a target net in mind and want to back-calculate the gross charge.",
      },
      {
        title: "Enter the amount",
        description:
          "In forward mode enter the charge; in reverse mode enter the net you want to land in your PayPal balance.",
      },
      {
        title: "Choose a transaction type",
        description:
          "Goods & Services domestic is 2.99% + $0.49, international 4.99% + $0.49, Friends & Family free (balance/bank) or 2.99% + $0.49 (card funded).",
      },
      {
        title: "Read the breakdown",
        description:
          "The result shows the processing fee as both an absolute amount and a percentage of the charge, plus the net received (or the gross to charge in reverse mode).",
      },
    ],
    useCases: [
      "Quote a client the gross invoice amount needed to net $5,000 after PayPal Goods & Services fees.",
      "Decide whether to absorb PayPal fees or pass them to buyers on a small-ticket item.",
      "Compare the cost of receiving $200 via PayPal Friends & Family card-funded vs. Goods & Services.",
      "Set pricing on an Etsy-style order that adds PayPal as a payment method.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{ECOMMERCE_DISCLAIMER}</li>
        <li>
          Rates are PayPal's US pricing as of early 2025. PayPal's commercial
          rate in many international markets is 4.99% (with no fixed fee) for
          domestic and higher for cross-border — confirm the rate on
          paypal.com/merchantfees for your country.
        </li>
        <li>
          Charitable donations (PayPal Giving Fund) have a reduced rate of 1.99%
          + $0.49 — not modelled here. Micropayments pricing (5% + $0.05) is
          also available for sub-$10 transactions, but not modelled.
        </li>
        <li>
          Currency conversion fee (4% above wholesale exchange rate), dispute
          chargeback fee ($20), and PayPal Commerce Platform surcharges are
          excluded.
        </li>
        <li>
          PayPal's fee schedule for charity and micropayments accounts differs —
          switch to micropayments mode if your average ticket is under $10.
        </li>
        <li>
          PayPal&rsquo;s fee schedule is published in USD. This calculator
          displays amounts in your selected currency and treats the fixed USD
          fee component (e.g. $0.49) as if denominated in your chosen currency
          &mdash; a display simplification, not a currency conversion.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What's the difference between Goods & Services and Friends & Family?",
        a: "Goods & Services is for commercial transactions — the buyer gets purchase protection, the seller pays 2.99% + $0.49. Friends & Family is for personal transfers — free if funded by balance or bank, but 2.99% + $0.49 if funded by card. Using F&F for commercial sales violates PayPal's terms and forfeits seller protection.",
      },
      {
        q: "How does the reverse calculator work?",
        a: "For a simple rate + fixed schedule, gross = (target + fixed) ÷ (1 − rate). For example, to net $100 via Goods & Services domestic at 2.99% + $0.49: gross = ($100 + $0.49) ÷ (1 − 0.0299) = $103.55. The sender pays $103.55, PayPal takes $3.55, you receive $100.00.",
      },
      {
        q: "Why is the international fee higher than domestic?",
        a: "PayPal charges 4.99% + $0.49 for cross-border commercial transactions vs. 2.99% + $0.49 domestic. The extra 2% covers PayPal's risk, currency conversion handling, and fraud protection across jurisdictions. Currency conversion adds a further 4% on top of the wholesale rate.",
      },
      {
        q: "Can I avoid PayPal fees entirely?",
        a: "For personal transfers, yes — use Friends & Family funded by PayPal balance or linked bank account. For commercial sales, no — PayPal's fee is deducted from every Goods & Services payment. Some sellers offer a cash/check discount to incentivise fee-free payment methods.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}
