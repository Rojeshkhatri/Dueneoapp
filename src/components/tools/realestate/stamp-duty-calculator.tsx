"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Landmark } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatPercent,
  STAMP_DUTY_REGIONS,
  STAMP_DUTY_TABLE,
  computeStampDuty,
  type StampDutyRegion,
  RE_DISCLAIMER,
} from "./_re-helpers";

const REGION_CURRENCY: Record<StampDutyRegion, string> = {
  uk: "GBP",
  nsw: "AUD",
  vic: "AUD",
  india: "INR",
  ireland: "EUR",
  us: "USD",
};

export function StampDutyCalculator({ tool }: { tool: ToolDefinition }) {
  const [region, setRegion] = React.useState<StampDutyRegion>("uk");
  const [price, setPrice] = React.useState<string>("425000");
  const [firstTimeBuyer, setFirstTimeBuyer] = React.useState<boolean>(false);

  const priceNum = Math.max(0, parseNumber(price));
  const currency = REGION_CURRENCY[region];
  const { total, breakdown, effectiveRate } = computeStampDuty(region, priceNum, firstTimeBuyer);

  const table = STAMP_DUTY_TABLE[region];
  const ftbAvailable = !!table.firstTimeBuyer && table.firstTimeBuyer.reliefUpTo > 0;

  const reset = () => {
    setPrice("425000");
    setFirstTimeBuyer(false);
    toast.info("Reset.");
  };

  const summary = `Stamp duty estimate
Region: ${STAMP_DUTY_REGIONS.find((r) => r.value === region)?.label}
Property price: ${formatCurrency(priceNum, { currency })}
First-time buyer: ${firstTimeBuyer && ftbAvailable ? "Yes" : "No"}

Breakdown by bracket:
${breakdown.length === 0 ? "  (no duty payable)" : breakdown.map((b) => `  ${b.label} = ${formatCurrency(b.amount, { currency })}`).join("\n")}

Total stamp duty: ${formatCurrency(total, { currency })}
Effective rate: ${formatPercent(effectiveRate)}`;

  const content: ToolContent = {
    intro:
      "Estimate stamp duty (land transfer tax) for a property purchase across six regions: UK, Australia (NSW & VIC), India, Ireland and a US average. Marginal brackets are applied exactly like income tax, and first-time-buyer relief is applied where available. Results are an estimate only — confirm with your conveyancer before budgeting.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Purchase details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="sd-region">Region</Label>
                <select
                  id="sd-region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value as StampDutyRegion)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {STAMP_DUTY_REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sd-price">Property price ({currency})</Label>
                <Input id="sd-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="425000" />
              </div>
              <label
                htmlFor="sd-ftb"
                className={"flex items-center gap-2 text-sm " + (ftbAvailable ? "" : "cursor-not-allowed opacity-50")}
              >
                <Checkbox
                  id="sd-ftb"
                  checked={firstTimeBuyer && ftbAvailable}
                  disabled={!ftbAvailable}
                  onCheckedChange={(v) => setFirstTimeBuyer(v === true)}
                />
                First-time buyer relief
                {!ftbAvailable && <span className="text-xs text-muted-foreground">(not available in this region)</span>}
              </label>
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Stamp duty estimate</CardTitle>
                <CopyButton value={summary} size="sm" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total stamp duty</span>
                <span className="flex items-center gap-1.5 font-mono text-3xl font-bold tabular-nums">
                  <Landmark className="h-5 w-5" />{formatCurrency(total, { currency })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Effective rate</span>
                <span className="font-mono text-sm tabular-nums">{formatPercent(effectiveRate)}</span>
              </div>
              <div className="border-t pt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Breakdown by bracket</p>
                {breakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No duty payable at this price.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {breakdown.map((b, i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{b.label}</span>
                        <span className="font-mono tabular-nums">{formatCurrency(b.amount, { currency })}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{STAMP_DUTY_REGIONS.find((r) => r.value === region)?.label} — marginal brackets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4">Bracket</th>
                    <th className="py-2 pr-4">Up to</th>
                    <th className="py-2 pr-4 text-right">Marginal rate</th>
                  </tr>
                </thead>
                <tbody>
                  {table.brackets.map((b, i) => {
                    const prev = i === 0 ? 0 : table.brackets[i - 1].upTo;
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-4">{i + 1}</td>
                        <td className="py-2 pr-4 font-mono">
                          {b.upTo === Infinity ? "and above" : formatCurrency(b.upTo, { currency })}
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({prev === 0 ? "0" : formatCurrency(prev, { currency })} – {b.upTo === Infinity ? "∞" : formatCurrency(b.upTo, { currency })})
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">{formatPercent(b.rate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {ftbAvailable && (
              <p className="mt-3 rounded-md border border-emerald-300/60 bg-emerald-50 p-2 text-xs text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
                First-time buyer relief: 0% up to {formatCurrency(table.firstTimeBuyer!.reliefUpTo, { currency })}, then {formatPercent(table.firstTimeBuyer!.reducedRate)} up to {formatCurrency(table.firstTimeBuyer!.reducedUpTo, { currency })}.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {RE_DISCLAIMER} Rates shown are simplified estimates for educational use only — they don't include surcharges (e.g. additional-property surcharge), exemptions, or recent policy changes.
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Pick your region",
        description: "Choose UK, NSW, VIC, India, Ireland or US average. Each uses its own marginal bracket table.",
      },
      {
        title: "Enter the property price",
        description: "Type the purchase price in the region's local currency. Duty is computed using marginal brackets like income tax.",
      },
      {
        title: "Apply first-time-buyer relief",
        description: "If you're a first-time buyer in a region that offers relief (UK, NSW, VIC), tick the box to apply the reduced bands.",
      },
      {
        title: "Read the breakdown",
        description: "Total duty, effective rate and a per-bracket breakdown are shown. The bracket table below shows how each region's rates stack up.",
      },
    ],
    useCases: [
      "Budget the cash you'll need at closing — not just the deposit but the duty too.",
      "Compare stamp duty between two regions before relocating.",
      "See whether staying just below a bracket boundary saves meaningful duty.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{RE_DISCLAIMER}</li>
        <li>Bracket thresholds and first-time-buyer bands are simplified to the most common 2024 rates and change frequently. Always confirm with the relevant revenue authority.</li>
        <li>Surcharges for additional properties (second homes, buy-to-let, foreign buyers) and corporate purchases are not included.</li>
        <li>India and US use a single blended rate — actual state-by-state duty can vary widely.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why does my final bill differ from this estimate?",
        a: "Stamp-duty rules change often, vary by property type (residential vs non-residential), and include surcharges for additional properties, foreign buyers, and corporate entities. Use this as a ballpark, then confirm with your conveyancer.",
      },
      {
        q: "What is first-time-buyer relief?",
        a: "Many regions offer a reduced or zero rate up to a higher threshold for first-time buyers. The relief typically tapers off above a price ceiling — buying above the ceiling means you pay the standard rate on the whole price.",
      },
      {
        q: "Why is the India rate just one number?",
        a: "Indian stamp duty varies 3–8% by state and even by gender of the buyer. We use a 5% blended average; check your state's registration department for the exact rate.",
      },
      {
        q: "Is the US 'stamp duty'?",
        a: "The US doesn't have a national stamp duty — most states charge a recording or transfer tax instead. The 0.5% average here blends common state rates; check your county recorder for the exact figure.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
