"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw, Trophy, Home } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { uid, parseNumber, formatCurrency, formatNumber, formatPercent, RE_DISCLAIMER } from "./_re-helpers";
import { useCurrency, CurrencySelector } from "@/components/dueneo/currency-selector";

interface Property {
  id: string;
  address: string;
  price: string;
  sqft: string;
  beds: string;
  baths: string;
  monthlyRent: string;
}

export function PropertyComparisonDashboard({ tool }: { tool: ToolDefinition }) {
  const [properties, setProperties] = React.useState<Property[]>([
    { id: uid(), address: "12 Oak St", price: "425000", sqft: "1800", beds: "3", baths: "2", monthlyRent: "2400" },
    { id: uid(), address: "45 Pine Ave", price: "395000", sqft: "1550", beds: "3", baths: "2", monthlyRent: "2200" },
    { id: uid(), address: "8 Maple Rd", price: "510000", sqft: "2100", beds: "4", baths: "3", monthlyRent: "2900" },
  ]);
  const { code: currency, setCode: setCurrency } = useCurrency();

  const computed = React.useMemo(() => {
    return properties.map((p) => {
      const price = Math.max(0, parseNumber(p.price));
      const sqft = Math.max(1, parseNumber(p.sqft));
      const rent = Math.max(0, parseNumber(p.monthlyRent));
      const pricePerSqft = price / sqft;
      const annualRent = rent * 12;
      const rentalYield = price > 0 ? (annualRent / price) * 100 : 0;
      return { ...p, price, sqft, rent, pricePerSqft, annualRent, rentalYield };
    });
  }, [properties]);

  const add = () => setProperties((p) => [...p, { id: uid(), address: "", price: "", sqft: "", beds: "", baths: "", monthlyRent: "" }]);
  const update = (id: string, patch: Partial<Property>) => setProperties((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const remove = (id: string) => setProperties((p) => p.filter((x) => x.id !== id));

  const reset = () => {
    setProperties([]);
    toast.info("Cleared.");
  };

  const withRental = computed.filter((p) => p.rent > 0 && p.price > 0);
  const bestValue = computed.length > 0 ? computed.reduce((a, b) => (b.pricePerSqft < a.pricePerSqft ? b : a)) : null;
  const bestYield = withRental.length > 0 ? withRental.reduce((a, b) => (b.rentalYield > a.rentalYield ? b : a)) : null;

  const content: ToolContent = {
    intro:
      "Compare up to four properties side by side — price, sqft, beds/baths, price per sqft, and rental yield if it's an investment. The dashboard highlights the best value (lowest price/sqft) and the best rental yield automatically, with a colour-coded pros-and-cons table.",
    tool: (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end gap-2">
          <CurrencySelector value={currency} onChange={setCurrency} id="pc-currency" />
          <Button size="sm" variant="outline" onClick={add} disabled={properties.length >= 4}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add property
          </Button>
          <Button size="sm" variant="ghost" onClick={reset} disabled={properties.length === 0}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">{properties.length}/4 properties</span>
        </div>

        {computed.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            No properties yet. Add one above to start comparing.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {bestValue && (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-300/60 bg-emerald-50 p-3 dark:bg-emerald-950/20">
                  <Trophy className="h-5 w-5 flex-none text-amber-500" />
                  <div className="text-sm">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300">Best value (lowest price/sqft)</p>
                    <p className="text-xs text-muted-foreground">{bestValue.address || "Property"} — {formatCurrency(bestValue.pricePerSqft, { currency })}/sqft</p>
                  </div>
                </div>
              )}
              {bestYield && (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-300/60 bg-emerald-50 p-3 dark:bg-emerald-950/20">
                  <Trophy className="h-5 w-5 flex-none text-amber-500" />
                  <div className="text-sm">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300">Best rental yield</p>
                    <p className="text-xs text-muted-foreground">{bestYield.address || "Property"} — {formatPercent(bestYield.rentalYield)}</p>
                  </div>
                </div>
              )}
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Property details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3">Field</th>
                        {computed.map((p) => (
                          <th key={p.id} className="py-2 pr-3 min-w-[140px]">
                            <div className="flex items-center gap-1">
                              <Home className="h-3.5 w-3.5 text-primary" />
                              <Input
                                value={p.address}
                                onChange={(e) => update(p.id, { address: e.target.value })}
                                placeholder={`Property ${computed.indexOf(p) + 1}`}
                                className="h-7 text-sm font-semibold"
                                aria-label={`Property ${computed.indexOf(p) + 1} address`}
                              />
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <Row label="Price">
                        {computed.map((p) => (
                          <td key={p.id} className="py-1.5 pr-3">
                            <Input inputMode="decimal" value={p.price} onChange={(e) => update(p.id, { price: e.target.value })} className="h-8 text-right font-mono text-xs" aria-label="Price" />
                          </td>
                        ))}
                      </Row>
                      <Row label="Sqft">
                        {computed.map((p) => (
                          <td key={p.id} className="py-1.5 pr-3">
                            <Input inputMode="decimal" value={p.sqft} onChange={(e) => update(p.id, { sqft: e.target.value })} className="h-8 text-right font-mono text-xs" aria-label="Square footage" />
                          </td>
                        ))}
                      </Row>
                      <Row label="Beds">
                        {computed.map((p) => (
                          <td key={p.id} className="py-1.5 pr-3">
                            <Input inputMode="numeric" value={p.beds} onChange={(e) => update(p.id, { beds: e.target.value })} className="h-8 text-right font-mono text-xs" aria-label="Bedrooms" />
                          </td>
                        ))}
                      </Row>
                      <Row label="Baths">
                        {computed.map((p) => (
                          <td key={p.id} className="py-1.5 pr-3">
                            <Input inputMode="decimal" value={p.baths} onChange={(e) => update(p.id, { baths: e.target.value })} className="h-8 text-right font-mono text-xs" aria-label="Bathrooms" />
                          </td>
                        ))}
                      </Row>
                      <Row label="Monthly rent">
                        {computed.map((p) => (
                          <td key={p.id} className="py-1.5 pr-3">
                            <Input inputMode="decimal" value={p.monthlyRent} onChange={(e) => update(p.id, { monthlyRent: e.target.value })} className="h-8 text-right font-mono text-xs" placeholder="(if rental)" aria-label="Monthly rent" />
                          </td>
                        ))}
                      </Row>
                      <Row label="Price / sqft" computed>
                        {computed.map((p) => (
                          <td key={p.id} className="py-1.5 pr-3 text-right font-mono tabular-nums text-xs">
                            <Badge variant={bestValue && p.id === bestValue.id ? "default" : "outline"} className="text-[10px]">
                              {p.pricePerSqft > 0 ? formatCurrency(p.pricePerSqft, { currency }) : "—"}
                            </Badge>
                          </td>
                        ))}
                      </Row>
                      <Row label="Rental yield" computed>
                        {computed.map((p) => (
                          <td key={p.id} className="py-1.5 pr-3 text-right font-mono tabular-nums text-xs">
                            <Badge variant={bestYield && p.id === bestYield.id ? "default" : "outline"} className="text-[10px]">
                              {p.rentalYield > 0 ? formatPercent(p.rentalYield) : "—"}
                            </Badge>
                          </td>
                        ))}
                      </Row>
                      <Row label="Annual rent" computed>
                        {computed.map((p) => (
                          <td key={p.id} className="py-1.5 pr-3 text-right font-mono tabular-nums text-xs text-muted-foreground">
                            {p.annualRent > 0 ? formatCurrency(p.annualRent, { currency }) : "—"}
                          </td>
                        ))}
                      </Row>
                      <Row label="">
                        {computed.map((p) => (
                          <td key={p.id} className="py-1.5 pr-3 text-right">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(p.id)} aria-label="Remove property">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </td>
                        ))}
                      </Row>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Pros &amp; cons (relative to the others)</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {computed.map((p) => {
                  const pros: string[] = [];
                  const cons: string[] = [];
                  if (bestValue && p.id === bestValue.id) pros.push("Lowest price/sqft");
                  else if (bestValue) cons.push(`+${formatCurrency(p.pricePerSqft - bestValue.pricePerSqft, { currency })}/sqft vs cheapest`);
                  if (bestYield && p.id === bestYield.id) pros.push("Highest rental yield");
                  else if (bestYield && p.rentalYield > 0) cons.push(`-${formatPercent(bestYield.rentalYield - p.rentalYield)} yield vs best`);
                  if (p.sqft >= Math.max(...computed.map((x) => x.sqft))) pros.push(`Largest (${formatNumber(p.sqft, { digits: 0 })} sqft)`);
                  if (parseNumber(p.beds) >= Math.max(...computed.map((x) => parseNumber(x.beds)))) pros.push(`Most beds (${p.beds || 0})`);
                  return (
                    <div key={p.id} className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-sm font-semibold">{p.address || `Property ${computed.indexOf(p) + 1}`}</p>
                      <div className="mt-2 space-y-1.5">
                        {pros.length === 0 && cons.length === 0 && <p className="text-xs text-muted-foreground">No clear edge.</p>}
                        {pros.map((x, i) => (
                          <p key={i} className="flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                            <span className="mt-0.5">+</span>{x}
                          </p>
                        ))}
                        {cons.map((x, i) => (
                          <p key={i} className="flex items-start gap-1.5 text-xs text-rose-700 dark:text-rose-400">
                            <span className="mt-0.5">−</span>{x}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}

        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {RE_DISCLAIMER}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Add up to four properties",
        description: "Click Add property to add rows. Type the address (or any nickname) for each — it shows up in the table header.",
      },
      {
        title: "Enter price, sqft, beds, baths",
        description: "Fill in the basic specs for each property. Price/sqft is computed automatically and the lowest is highlighted.",
      },
      {
        title: "Optionally enter monthly rent",
        description: "If you're comparing investment properties, enter the expected monthly rent to see annual rent and rental yield.",
      },
      {
        title: "Read the pros & cons",
        description: "Each property gets a card listing its relative strengths and weaknesses vs the others — best value, biggest, most beds, etc.",
      },
    ],
    useCases: [
      "Compare three listings you're considering buying.",
      "Decide between a primary residence and an investment property.",
      "See which of your rental properties is the strongest performer.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{RE_DISCLAIMER}</li>
        <li>The dashboard shows raw specs — it doesn't factor in condition, location quality, school district, taxes or HOA. Weigh those separately.</li>
        <li>Rental yield is gross (no expenses). For net yield, use the rental-yield-calculator tool on each property.</li>
      </ul>
    ),
    faq: [
      {
        q: "How is 'best value' determined?",
        a: "By the lowest price per square foot. Cheaper-per-sqft properties are typically better value, but consider condition and layout — a cheap property that needs a full renovation may not actually be a better deal.",
      },
      {
        q: "How is rental yield computed?",
        a: "Annual rent (monthly × 12) divided by price, × 100. This is gross yield — see the rental-yield-calculator for the net figure after expenses.",
      },
      {
        q: "Can I compare more than four properties?",
        a: "The dashboard is capped at four for readability. To compare more, run it twice or export the data into a spreadsheet.",
      },
      {
        q: "Where does my comparison get saved?",
        a: "It doesn't — the dashboard is for live comparison only. Refresh the page to clear. Nothing is uploaded.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Row({ label, children, computed }: { label: string; children: React.ReactNode; computed?: boolean }) {
  return (
    <tr className="border-b last:border-0">
      <td className={"py-1.5 pr-3 text-xs " + (computed ? "font-medium text-muted-foreground" : "text-muted-foreground")}>{label}</td>
      {children}
    </tr>
  );
}
