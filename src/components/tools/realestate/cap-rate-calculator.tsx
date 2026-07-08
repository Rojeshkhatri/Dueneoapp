"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Plus, Trash2, Trophy, Building2, TrendingUp } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { uid, parseNumber, formatCurrency, formatPercent, RE_DISCLAIMER } from "./_re-helpers";

interface Property {
  id: string;
  label: string;
  value: string;
  grossIncome: string;
  operatingExpenses: string;
}

export function CapRateCalculator({ tool }: { tool: ToolDefinition }) {
  const [properties, setProperties] = React.useState<Property[]>([
    { id: uid(), label: "Duplex A", value: "650000", grossIncome: "68000", operatingExpenses: "22000" },
    { id: uid(), label: "Four-plex B", value: "920000", grossIncome: "108000", operatingExpenses: "38000" },
  ]);
  const [currency, setCurrency] = React.useState<string>("USD");

  const computed = React.useMemo(() => {
    return properties.map((p) => {
      const value = Math.max(0, parseNumber(p.value));
      const gross = Math.max(0, parseNumber(p.grossIncome));
      const opex = Math.max(0, parseNumber(p.operatingExpenses));
      const noi = gross - opex;
      const cap = value > 0 ? (noi / value) * 100 : 0;
      return { ...p, value, gross, opex, noi, cap };
    });
  }, [properties]);

  const add = () => setProperties((p) => [...p, { id: uid(), label: `Property ${p.length + 1}`, value: "", grossIncome: "", operatingExpenses: "" }]);
  const update = (id: string, patch: Partial<Property>) => setProperties((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const remove = (id: string) => setProperties((p) => p.filter((x) => x.id !== id));

  const reset = () => {
    setProperties([]);
    toast.info("Cleared.");
  };

  const best = computed.length > 0 ? computed.reduce((a, b) => (b.cap > a.cap ? b : a)) : null;
  const summary = computed
    .map((p) => `${p.label || "Property"}: value ${formatCurrency(p.value, { currency })}, NOI ${formatCurrency(p.noi, { currency })}, cap rate ${formatPercent(p.cap)}`)
    .join("\n");

  const content: ToolContent = {
    intro:
      "Calculate the capitalization rate (cap rate) for one or more investment properties from net operating income and value. Compare cap rates side by side to see which property offers the highest unleveraged yield — and learn what 'good' and 'bad' cap rates mean in context.",
    tool: (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="cr-cur" className="text-xs">Currency</Label>
          <select
            id="cr-cur"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
          >
            {["USD", "GBP", "EUR", "CAD", "AUD", "INR"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={add}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add property
          </Button>
          <Button size="sm" variant="ghost" onClick={reset} disabled={properties.length === 0}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear all
          </Button>
          {best && (
            <Badge variant="secondary" className="ml-auto">
              <Trophy className="mr-1 h-3 w-3 text-amber-500" />
              Best: {best.label || "Property"} · {formatPercent(best.cap)}
            </Badge>
          )}
        </div>

        {computed.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            No properties yet. Add one above to start comparing cap rates.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {computed.map((p) => (
              <Card key={p.id} className={best && p.id === best.id ? "border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/10" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-primary" />
                      <Input
                        value={p.label}
                        onChange={(e) => update(p.id, { label: e.target.value })}
                        className="h-7 w-40 text-sm"
                      />
                    </CardTitle>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(p.id)} aria-label="Remove property">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Property value" value={p.value} onChange={(v) => update(p.id, { value: v })} />
                    <Field label="Gross income / yr" value={p.grossIncome} onChange={(v) => update(p.id, { grossIncome: v })} />
                    <Field label="Operating exp / yr" value={p.operatingExpenses} onChange={(v) => update(p.id, { operatingExpenses: v })} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Stat label="NOI (net operating income)" value={formatCurrency(p.noi, { currency })} icon={<TrendingUp className="h-3.5 w-3.5" />} />
                    <Stat
                      label="Cap rate"
                      value={formatPercent(p.cap)}
                      large
                      tone={p.cap >= 7 ? "good" : p.cap >= 4 ? "neutral" : "bad"}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {computed.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Comparison table</CardTitle>
                <CopyButton value={summary} size="sm" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-4">Property</th>
                      <th className="py-2 pr-4 text-right">Value</th>
                      <th className="py-2 pr-4 text-right">Gross income</th>
                      <th className="py-2 pr-4 text-right">Opex</th>
                      <th className="py-2 pr-4 text-right">NOI</th>
                      <th className="py-2 pr-4 text-right">Cap rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computed.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{p.label || "Property"}</td>
                        <td className="py-2 pr-4 text-right font-mono tabular-nums">{formatCurrency(p.value, { currency })}</td>
                        <td className="py-2 pr-4 text-right font-mono tabular-nums">{formatCurrency(p.gross, { currency })}</td>
                        <td className="py-2 pr-4 text-right font-mono tabular-nums">{formatCurrency(p.opex, { currency })}</td>
                        <td className="py-2 pr-4 text-right font-mono tabular-nums">{formatCurrency(p.noi, { currency })}</td>
                        <td className="py-2 pr-4 text-right font-mono tabular-nums font-semibold">
                          <span className={p.cap >= 7 ? "text-emerald-600 dark:text-emerald-400" : p.cap >= 4 ? "" : "text-rose-600 dark:text-rose-400"}>
                            {formatPercent(p.cap)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">What does the cap rate mean?</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
            <RangeCard range="< 4%" tone="bad" label="Low" description="Premium price, low unleveraged yield. Common in hot coastal markets — investors expect appreciation more than cash flow." />
            <RangeCard range="4–7%" tone="neutral" label="Moderate" description="Typical for many urban rentals. Returns are balanced between income and appreciation." />
            <RangeCard range="> 7%" tone="good" label="High" description="Strong cash flow relative to price. Often found in lower-cost or higher-risk markets — verify rent, vacancy and condition carefully." />
          </CardContent>
        </Card>

        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {RE_DISCLAIMER}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Add one or more properties",
        description: "For each property, enter the current market value, annual gross rental income and annual operating expenses.",
      },
      {
        title: "Read the cap rate",
        description: "Cap rate = (Gross income − Operating expenses) ÷ Value × 100. The tool computes NOI and cap rate for each property automatically.",
      },
      {
        title: "Compare side by side",
        description: "The comparison table ranks properties by cap rate. The best is highlighted in amber on the cards above.",
      },
      {
        title: "Interpret the result",
        description: "Use the 'What does the cap rate mean?' card to judge whether your cap rate is low, moderate or high for the market.",
      },
    ],
    useCases: [
      "Compare two investment properties by their unleveraged yield.",
      "Quickly screen a listing — is the asking price justified by the rent?",
      "Benchmark your portfolio's cap rate against market norms.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{RE_DISCLAIMER}</li>
        <li>Cap rate ignores financing, tax, depreciation and appreciation. Two properties with the same cap rate can have very different after-tax returns.</li>
        <li>'Operating expenses' should include property tax, insurance, management, maintenance and a vacancy reserve — but not mortgage principal or interest.</li>
      </ul>
    ),
    faq: [
      {
        q: "What's a 'good' cap rate?",
        a: "It depends on market and risk. In many US markets, 5–8% is typical for residential rentals. Below 4% is often speculative (betting on appreciation); above 10% may signal higher risk or a distressed property.",
      },
      {
        q: "Does cap rate include the mortgage?",
        a: "No. Cap rate is unleveraged — it measures the property's return, not your return on borrowed money. For your return on cash invested, use cash-on-cash return instead.",
      },
      {
        q: "Should I use market value or purchase price?",
        a: "Use current market value when valuing a property you already own. Use purchase price when evaluating a deal — they're the same on day one but diverge as the property appreciates.",
      },
      {
        q: "What counts as 'operating expenses'?",
        a: "Property tax, insurance, property management, routine maintenance, utilities paid by the landlord, and a vacancy reserve. Do NOT include mortgage principal or interest, capital improvements, or depreciation.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="h-8" />
    </div>
  );
}

function Stat({ label, value, large, tone = "neutral", icon }: { label: string; value: string; large?: boolean; tone?: "good" | "bad" | "neutral"; icon?: React.ReactNode }) {
  const color = tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "bad" ? "text-rose-600 dark:text-rose-400" : "text-foreground";
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</p>
      <p className={`mt-1 font-mono tabular-nums font-semibold ${color} ${large ? "text-xl" : "text-base"}`}>{value}</p>
    </div>
  );
}

function RangeCard({ range, tone, label, description }: { range: string; tone: "good" | "bad" | "neutral"; label: string; description: string }) {
  const color = tone === "good" ? "border-emerald-300/60 bg-emerald-50 dark:bg-emerald-950/20" : tone === "bad" ? "border-rose-300/60 bg-rose-50 dark:bg-rose-950/20" : "border-border bg-muted/30";
  const textColor = tone === "good" ? "text-emerald-700 dark:text-emerald-400" : tone === "bad" ? "text-rose-700 dark:text-rose-400" : "text-foreground";
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${textColor}`}>{label}</span>
        <span className={`font-mono text-sm font-bold ${textColor}`}>{range}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
