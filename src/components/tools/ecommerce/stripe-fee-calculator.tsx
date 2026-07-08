"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input as InputField } from "@/components/ui/input";
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
  CreditCard,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  Banknote,
  Globe,
  Landmark,
  ScanLine,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatPercent,
  ECOMMERCE_DISCLAIMER,
  STRIPE_PAYMENT_TYPES,
  computeProcessingFee,
  computeReverseCharge,
  type StripePaymentType,
  Row,
  StatCard,
} from "./_ecommerce-helpers";
import { useCurrency, CurrencySelector, money } from "@/components/dueneo/currency-selector";

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  "domestic-card": <CreditCard className="h-3.5 w-3.5 text-primary" />,
  "international-card": <Globe className="h-3.5 w-3.5 text-primary" />,
  "ach": <Landmark className="h-3.5 w-3.5 text-primary" />,
  "in-person": <ScanLine className="h-3.5 w-3.5 text-primary" />,
};

export function StripeFeeCalculator({ tool }: { tool: ToolDefinition }) {
  // Forward mode: charge $X, see how much you receive.
  const [fwdAmount, setFwdAmount] = React.useState<string>("100.00");
  const [fwdTypeKey, setFwdTypeKey] = React.useState<string>(STRIPE_PAYMENT_TYPES[0].key);

  // Reverse mode: I want to receive $Y, see how much to charge.
  const [revTarget, setRevTarget] = React.useState<string>("100.00");
  const [revTypeKey, setRevTypeKey] = React.useState<string>(STRIPE_PAYMENT_TYPES[0].key);
  const { code: currency, setCode: setCurrency } = useCurrency();
  const fmt = (v: number) => money(v, currency);

  const fwdType = React.useMemo<StripePaymentType>(
    () => STRIPE_PAYMENT_TYPES.find((t) => t.key === fwdTypeKey) ?? STRIPE_PAYMENT_TYPES[0],
    [fwdTypeKey],
  );
  const revType = React.useMemo<StripePaymentType>(
    () => STRIPE_PAYMENT_TYPES.find((t) => t.key === revTypeKey) ?? STRIPE_PAYMENT_TYPES[0],
    [revTypeKey],
  );

  const fwdAmt = Math.max(0, parseNumber(fwdAmount));
  const revAmt = Math.max(0, parseNumber(revTarget));

  // Forward: charge X → receive X − fee.
  const fwdFee = computeProcessingFee(fwdAmt, fwdType.ratePct, fwdType.fixed, fwdType.cap);
  const fwdNet = Math.max(0, fwdAmt - fwdFee);
  const fwdFeePct = fwdAmt > 0 ? (fwdFee / fwdAmt) * 100 : 0;

  // Reverse: want net Y → charge X.
  const revResult = computeReverseCharge(revAmt, revType.ratePct, revType.fixed, revType.cap);

  const reset = () => {
    setFwdAmount("100.00");
    setFwdTypeKey(STRIPE_PAYMENT_TYPES[0].key);
    setRevTarget("100.00");
    setRevTypeKey(STRIPE_PAYMENT_TYPES[0].key);
    toast.info("Reset.");
  };

  const fwdSummary = `Stripe fee (forward)
Charge amount:        ${fmt(fwdAmt)}
Payment type:         ${fwdType.label}
Rate:                 ${fwdType.ratePct}% + $${fwdType.fixed.toFixed(2)}${fwdType.cap ? ` (cap $${fwdType.cap})` : ""}

Processing fee:       ${fmt(fwdFee)} (${formatPercent(fwdFeePct)} of charge)
Net received:         ${fmt(fwdNet)}`;

  const revSummary = `Stripe fee (reverse)
Target net received:  ${fmt(revAmt)}
Payment type:         ${revType.label}
Rate:                 ${revType.ratePct}% + $${revType.fixed.toFixed(2)}${revType.cap ? ` (cap $${revType.cap})` : ""}

Charge amount:        ${fmt(revResult.gross)}
Processing fee:       ${fmt(revResult.fee)}
Net received:         ${fmt(revResult.net)}${revResult.capped ? " (cap hit)" : ""}`;

  // For shared rendering of payment type selector.
  const renderTypeSelector = (
    id: string,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>Payment type</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STRIPE_PAYMENT_TYPES.map((t) => (
            <SelectItem key={t.key} value={t.key}>
              {t.label} — {t.ratePct}%{t.fixed > 0 ? ` + $${t.fixed.toFixed(2)}` : ""}
              {t.cap ? ` (cap $${t.cap})` : ""}
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
                <Label htmlFor="st-fwd-amt">Charge amount</Label>
                <InputField
                  id="st-fwd-amt"
                  inputMode="decimal"
                  value={fwdAmount}
                  onChange={(e) => setFwdAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {renderTypeSelector("st-fwd-type", fwdTypeKey, setFwdTypeKey)}

              <p className="text-xs text-muted-foreground">{fwdType.hint}</p>

              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
              <CurrencySelector value={currency} onChange={setCurrency} id="st-currency" className="pt-2" />
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
                      hint={`${formatPercent(fwdFeePct)} of charge`}
                    />
                  </div>

                  <div className="space-y-2 rounded-lg border bg-background p-4">
                    <Row label="Charge amount" value={fmt(fwdAmt)} />
                    <div className="border-t pt-2">
                      <Row
                        label={`${fwdType.ratePct}%${fwdType.fixed > 0 ? ` + $${fwdType.fixed.toFixed(2)}` : ""}${fwdType.cap ? ` (cap $${fwdType.cap})` : ""}`}
                        value={fmt(fwdFee)}
                        icon={PAYMENT_ICONS[fwdType.key]}
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
                <Label htmlFor="st-rev-amt">Target net amount</Label>
                <InputField
                  id="st-rev-amt"
                  inputMode="decimal"
                  value={revTarget}
                  onChange={(e) => setRevTarget(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  The amount you want to land in your bank account after Stripe's
                  fee is deducted.
                </p>
              </div>

              {renderTypeSelector("st-rev-type", revTypeKey, setRevTypeKey)}

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
                      hint={revResult.capped ? "Cap hit" : `${revType.ratePct}% + $${revType.fixed.toFixed(2)}`}
                    />
                  </div>

                  <div className="space-y-2 rounded-lg border bg-background p-4">
                    <Row label="Target net received" value={fmt(revResult.net)} />
                    <div className="border-t pt-2">
                      <Row
                        label={`Processing fee (${revType.ratePct}%${revType.fixed > 0 ? ` + $${revType.fixed.toFixed(2)}` : ""}${revType.cap ? ` cap $${revType.cap}` : ""})`}
                        value={fmt(revResult.fee)}
                        icon={PAYMENT_ICONS[revType.key]}
                      />
                    </div>
                    <div className="border-t pt-2">
                      <Row
                        label="Charge the customer"
                        value={fmt(revResult.gross)}
                        large
                        highlight
                      />
                      {revResult.capped && (
                        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                          ACH percentage hit the $5 cap — the charge equals the
                          target + $5 (no percentage-based growth above the cap).
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
          charge. ACH has a $5 cap on the percentage portion — the reverse
          calculation handles the cap automatically.
        </p>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Calculate Stripe's processing fee for any payment type — domestic card (2.9% + $0.30), international card (3.9% + $0.30), ACH debit (0.8% capped at $5) or in-person terminal (2.7% + $0.05). Toggle between forward mode (\"if I charge $X, what do I receive?\") and reverse mode (\"if I want to net $Y, what should I charge?\"). All calculations update live as you type.",
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
          "In forward mode enter the charge; in reverse mode enter the net you want to land in your bank.",
      },
      {
        title: "Choose a payment type",
        description:
          "Domestic cards cost 2.9% + $0.30, international cards 3.9% + $0.30, ACH 0.8% (max $5), in-person 2.7% + $0.05. The rate and any cap update instantly.",
      },
      {
        title: "Read the breakdown",
        description:
          "The result shows the processing fee as both an absolute amount and a percentage of the charge, plus the net received (or the gross to charge in reverse mode).",
      },
    ],
    useCases: [
      "Price a Stripe-paid invoice so that you net exactly $1,000 after fees.",
      "Compare ACH (0.8% capped at $5) vs. card (2.9% + $0.30) for a $10,000 B2B payment.",
      "Quote a customer the all-in price including the international card surcharge.",
      "Decide whether in-person terminal rates justify buying a Stripe Reader for high-volume retail.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{ECOMMERCE_DISCLAIMER}</li>
        <li>
          Rates are Stripe's US pricing as of early 2025. Stripe's pricing
          varies by country — UK cards are 1.5% + £0.20, EU cards 1.5% + €0.25,
          AU cards 1.75% + A$0.30. Use the closest equivalent.
        </li>
        <li>
          The ACH $5 cap is on the percentage portion only — there's no fixed
          fee. The reverse calculation correctly switches to the capped regime
          (gross = net + $5) when the percentage at the simple-formula gross
          would exceed $5.
        </li>
        <li>
          Stripe's additional products — Stripe Tax (0.5%), Radar fraud
          protection (5¢/dispute + 0.05%), Sigma, Billing subscription fees,
          Connect platform fees — are not modelled.
        </li>
        <li>
          Currency-conversion fees (1% for cross-currency charges), failed
          payment fees and chargeback fees ($15/dispute) are excluded.
        </li>
        <li>
          Stripe&rsquo;s fee schedule is published in USD. This calculator
          displays amounts in your selected currency and treats the fixed USD
          fee component (e.g. $0.30, $0.05, $5 ACH cap) as if denominated in
          your chosen currency &mdash; a display simplification, not a currency
          conversion.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why does ACH have a $5 cap?",
        a: "Stripe's ACH debit pricing is 0.8% per transaction with a $5 maximum. So a $100 ACH costs $0.80, a $1,000 ACH costs $5 (capped, not $8), and a $10,000 ACH still costs $5. This makes ACH dramatically cheaper than cards for large B2B payments.",
      },
      {
        q: "How does the reverse calculator work?",
        a: "For a simple rate + fixed schedule, gross = (target + fixed) ÷ (1 − rate). For ACH, we first try that formula; if the percentage portion exceeds $5, we switch to the capped regime where gross = target + $5 + $0 fixed. The calculator displays a \"cap hit\" note when this happens.",
      },
      {
        q: "Is the in-person rate really just 2.7% + $0.05?",
        a: "Yes, for standard Tap to Pay and Stripe Reader transactions in the US. Some bespoke hardware (e.g. Stripe Register) has a 2.7% + $0.05 rate; legacy BBPOS WisePOS E rates may differ. The 5¢ fixed portion is much smaller than the 30¢ on online cards, making terminal payments cheaper for small-ticket items.",
      },
      {
        q: "Does Stripe charge the fee on the refund too?",
        a: "Stripe refunds the processing fee on partial refunds but keeps the fixed fee portion. On full refunds, the entire fee is refunded. Chargeback disputes cost $15 regardless of who wins. This calculator models only the original transaction fee.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}
