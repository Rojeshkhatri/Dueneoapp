"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CopyButton } from "@/components/dueneo/copy-button";
import { useCurrency, CurrencySelector } from "@/components/dueneo/currency-selector";
import { toast } from "sonner";
import { RotateCcw, Calculator, Info } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatPercent,
  FINANCE_DISCLAIMER,
} from "./_finance-helpers";

export interface TaxCalculatorConfig {
  /** Display name of the tax, e.g. "GST", "VAT", "Sales Tax". */
  taxName: string;
  /** Default rate (percentage). */
  defaultRate: number;
  /** Common preset rates shown as quick chips. */
  presets: number[];
  /** Suggested currency for the formatted output. */
  currency?: string;
  /** Optional versioned persistence key for a jurisdiction-specific default. */
  currencyStorageKey?: string;
}

type Mode = "exclusive" | "inclusive";

interface TaxResult {
  net: number;
  tax: number;
  gross: number;
}

function computeTax(amount: number, rate: number, mode: Mode): TaxResult {
  if (mode === "exclusive") {
    const tax = amount * (rate / 100);
    return { net: amount, tax, gross: amount + tax };
  }
  // Inclusive: amount already contains the tax.
  const net = amount / (1 + rate / 100);
  const tax = amount - net;
  return { net, tax, gross: amount };
}

/**
 * Shared tax-calculator engine used by the GST, VAT and Sales Tax tools.
 * Each public tool passes a different `config` so the labels, presets and
 * default rate match the user's intent.
 */
export function TaxCalculator({
  tool,
  config,
  content,
}: {
  tool: ToolDefinition;
  config: TaxCalculatorConfig;
  content: {
    intro: React.ReactNode;
    howTo: ToolContent["howTo"];
    useCases?: string[];
    faq: ToolContent["faq"];
  };
}) {
  const { taxName, defaultRate, presets } = config;
  // Tax tools keep jurisdiction-aware defaults without overriding the user's
  // global currency preference in unrelated calculators.
  const { code: currency, setCode: setCurrency } = useCurrency(
    config.currency ?? "USD",
    config.currencyStorageKey ??
      `dueneo:currency:tax:${taxName.toLowerCase().replace(/\s+/g, "-")}`
  );
  const [amount, setAmount] = React.useState<string>("");
  const [rate, setRate] = React.useState<string>(String(defaultRate));
  const [mode, setMode] = React.useState<Mode>("exclusive");

  const amountNum = parseNumber(amount);
  const rateNum = Math.max(0, parseNumber(rate));
  const result = computeTax(amountNum, rateNum, mode);

  const reset = () => {
    setAmount("");
    setRate(String(defaultRate));
    setMode("exclusive");
    toast.info("Reset.");
  };

  const summary = `${taxName} summary
Mode: ${mode === "exclusive" ? "Add tax to net amount" : "Remove tax from gross amount"}
Net amount: ${formatCurrency(result.net, { currency })}
${taxName} (${formatPercent(rateNum)}): ${formatCurrency(result.tax, { currency })}
Gross amount: ${formatCurrency(result.gross, { currency })}`;

  const toolContent: ToolContent = {
    intro: content.intro,
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="tax-amount">Amount</Label>
              <Input
                id="tax-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                aria-describedby="tax-amount-help"
              />
              <p id="tax-amount-help" className="text-xs text-muted-foreground">
                Enter the monetary amount you want to compute {taxName} on.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-rate">{taxName} rate (%)</Label>
              <Input
                id="tax-rate"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder={String(defaultRate)}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setRate(String(p))}
                    className={
                      "rounded-full border px-2.5 py-1 text-xs transition-colors " +
                      (rateNum === p
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted")
                    }
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Calculation mode</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as Mode)}
                className="grid gap-2 sm:grid-cols-2"
              >
                <Label
                  htmlFor="tax-exclusive"
                  className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value="exclusive" id="tax-exclusive" className="mt-0.5" />
                  <span>
                    <span className="block font-medium">Add {taxName} to net</span>
                    <span className="block text-xs text-muted-foreground">Amount excludes {taxName.toLowerCase()}</span>
                  </span>
                </Label>
                <Label
                  htmlFor="tax-inclusive"
                  className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value="inclusive" id="tax-inclusive" className="mt-0.5" />
                  <span>
                    <span className="block font-medium">Remove {taxName} from gross</span>
                    <span className="block text-xs text-muted-foreground">Amount includes {taxName.toLowerCase()}</span>
                  </span>
                </Label>
              </RadioGroup>
            </div>

            <CurrencySelector value={currency} onChange={setCurrency} id="tax-currency" />

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Result</h3>
              <CopyButton value={summary} size="sm" />
            </div>
            <ResultRow label="Net amount" value={formatCurrency(result.net, { currency })} />
            <ResultRow
              label={`${taxName} (${formatPercent(rateNum)})`}
              value={formatCurrency(result.tax, { currency })}
              highlight
            />
            <div className="border-t pt-3">
              <ResultRow
                label="Gross amount"
                value={formatCurrency(result.gross, { currency })}
                large
              />
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
              <div className="flex gap-2">
                <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
                <p>
                  {mode === "exclusive"
                    ? `Net amount × ${formatPercent(
                        rateNum
                      )} = ${taxName}. Net + ${taxName} = gross.`
                    : `Gross amount ÷ (1 + ${formatPercent(
                        rateNum
                      )}) = net. Gross − net = ${taxName}.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    howTo: content.howTo,
    useCases: content.useCases,
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          Rates vary by country, region and product category — always confirm the
          applicable {taxName} rate for your jurisdiction.
        </li>
        <li>
          The calculator applies a single rate to the full amount. It does not
          model tiered, exempt or zero-rated supplies.
        </li>
        <li>Negative inputs are treated as zero to keep the result meaningful.</li>
      </ul>
    ),
    faq: content.faq,
  };

  return <ToolLayout tool={tool} content={toolContent} />;
}

function ResultRow({
  label,
  value,
  highlight,
  large,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  large?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={"text-sm " + (highlight ? "text-primary font-medium" : "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={
          "font-mono tabular-nums " +
          (large ? "text-2xl font-semibold text-foreground" : highlight ? "text-base font-semibold text-primary" : "text-base text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}

/** Convenience export so consumers don't need to import Calculator separately. */
export const CalculatorIcon = Calculator;
