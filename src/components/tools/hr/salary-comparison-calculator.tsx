"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RotateCcw,
  ArrowRightLeft,
  Building2,
  TrendingUp,
  TrendingDown,
  Wallet,
  MapPin,
  Coins,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { toast } from "sonner";
import {
  CITY_COL_TABLE,
  citiesByCountry,
  formatCurrency,
  formatNumber,
  formatPercent,
  parseNumber,
  type CityCol,
} from "./_hr-helpers";

interface CalcResult {
  currentCity: CityCol;
  targetCity: CityCol;
  currentSalary: number;
  equivalentSalary: number;
  purchasingPowerDeltaPct: number; // positive = target city cheaper
  recommendedSalary: number;
  ratio: number;
}

export function SalaryComparisonCalculator({ tool }: { tool: ToolDefinition }) {
  const [salary, setSalary] = React.useState("85000");
  const [currentKey, setCurrentKey] = React.useState("New York, USA");
  const [targetKey, setTargetKey] = React.useState("London, UK");

  const groups = React.useMemo(() => citiesByCountry(), []);

  const result = React.useMemo<CalcResult | null>(() => {
    const currentCity = CITY_COL_TABLE.find((c) => c.label === currentKey);
    const targetCity = CITY_COL_TABLE.find((c) => c.label === targetKey);
    const currentSalary = parseNumber(salary);
    if (!currentCity || !targetCity || currentSalary <= 0) return null;
    const ratio = targetCity.index / currentCity.index;
    const equivalentSalary = currentSalary * ratio;
    const purchasingPowerDeltaPct = (1 - ratio) * 100; // if target cheaper (ratio<1), pp goes up
    // Recommended salary: equivalent + 5% buffer for risk/relocation friction
    const recommendedSalary = equivalentSalary * 1.05;
    return {
      currentCity,
      targetCity,
      currentSalary,
      equivalentSalary,
      purchasingPowerDeltaPct,
      recommendedSalary,
      ratio,
    };
  }, [salary, currentKey, targetKey]);

  const chartData = React.useMemo(() => {
    if (!result) return [];
    return [
      {
        name: result.currentCity.label.split(",")[0],
        value: Math.round(result.currentSalary),
        city: result.currentCity.label,
      },
      {
        name: result.targetCity.label.split(",")[0],
        value: Math.round(result.equivalentSalary),
        city: result.targetCity.label,
      },
    ];
  }, [result]);

  const handleSwap = () => {
    setCurrentKey(targetKey);
    setTargetKey(currentKey);
    toast.success("Swapped cities");
  };

  const handleReset = () => {
    setSalary("85000");
    setCurrentKey("New York, USA");
    setTargetKey("London, UK");
  };

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="sal-current">Current annual salary</Label>
            <Input
              id="sal-current"
              type="number"
              inputMode="numeric"
              min={0}
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="e.g. 85000"
            />
            <p className="text-xs text-muted-foreground">
              Enter your gross annual salary in the currency of your current city. Dueneo
              does not convert currencies — the comparison is purely cost-of-living adjusted.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Current city</Label>
              <Select value={currentKey} onValueChange={setCurrentKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select current city" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {groups.map((g) => (
                    <SelectGroup key={g.country}>
                      <SelectLabel>{g.country}</SelectLabel>
                      {g.cities.map((c) => (
                        <SelectItem key={c.label} value={c.label}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target city</Label>
              <Select value={targetKey} onValueChange={setTargetKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target city" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {groups.map((g) => (
                    <SelectGroup key={g.country}>
                      <SelectLabel>{g.country}</SelectLabel>
                      {g.cities.map((c) => (
                        <SelectItem key={c.label} value={c.label}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleSwap}>
              <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" /> Swap cities
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Wallet className="h-4 w-4 text-primary" /> Comparison
          </h3>
          {!result && (
            <p className="text-sm text-muted-foreground">
              Pick a current city, a target city and enter your current salary to see the
              cost-of-living-adjusted equivalent.
            </p>
          )}
          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-background p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {result.currentCity.label.split(",")[0]}
                  </div>
                  <div className="mt-1 font-mono text-lg font-bold tabular-nums">
                    {formatCurrency(result.currentSalary, { currency: result.currentCity.currency })}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    COL index: {formatNumber(result.currentCity.index, { maximumFractionDigits: 1 })}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {result.targetCity.label.split(",")[0]}
                  </div>
                  <div className="mt-1 font-mono text-lg font-bold tabular-nums">
                    {formatCurrency(result.equivalentSalary, { currency: result.targetCity.currency })}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    COL index: {formatNumber(result.targetCity.index, { maximumFractionDigits: 1 })}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Coins className="h-3.5 w-3.5 text-primary" /> Equivalent salary
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {formatCurrency(result.equivalentSalary, { currency: result.targetCity.currency })}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Recommended ask (+5% buffer)</span>
                  <span className="font-mono font-semibold tabular-nums text-primary">
                    {formatCurrency(result.recommendedSalary, { currency: result.targetCity.currency })}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-2">
                  {result.purchasingPowerDeltaPct >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                  )}
                  <span className="text-muted-foreground">Purchasing power change</span>
                  <span
                    className={`ml-auto font-mono font-semibold tabular-nums ${
                      result.purchasingPowerDeltaPct >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {result.purchasingPowerDeltaPct >= 0 ? "+" : ""}
                    {formatPercent(result.purchasingPowerDeltaPct)}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {result.purchasingPowerDeltaPct >= 0
                    ? `Living in ${result.targetCity.label.split(",")[0]} is cheaper — your salary would buy ${formatPercent(
                        result.purchasingPowerDeltaPct
                      )} more in real goods and services.`
                    : `Living in ${result.targetCity.label.split(",")[0]} is more expensive — your salary would buy ${formatPercent(
                        Math.abs(result.purchasingPowerDeltaPct)
                      )} less in real goods and services.`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {result && chartData.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-primary" /> Salary comparison chart
          </h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  tickFormatter={(v: number) =>
                    formatCurrency(v, { maximumFractionDigits: 0, minimumFractionDigits: 0 })
                  }
                  width={80}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [
                    formatCurrency(v, { maximumFractionDigits: 0, minimumFractionDigits: 0 }),
                    "Salary",
                  ]}
                  labelFormatter={(label: string, payload) => {
                    const p = payload?.[0]?.payload as { city?: string } | undefined;
                    return p?.city ?? label;
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={140}>
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={idx === 0 ? "var(--primary)" : "var(--chart-2)"}
                    />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(v: number) =>
                      formatCurrency(v, { maximumFractionDigits: 0, minimumFractionDigits: 0 })
                    }
                    style={{ fontSize: 11, fill: "var(--foreground)", fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <Badge variant="secondary" className="gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" /> {result.currentCity.label.split(",")[0]}
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--chart-2)" }}
              />
              {result.targetCity.label.split(",")[0]}
            </Badge>
            <span className="ml-auto">
              COL ratio: {formatNumber(result.ratio, { maximumFractionDigits: 3 })}×
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Compare your salary across cities using a built-in cost-of-living index for ~70 major world cities. Enter your current salary and city, pick a target city, and see the equivalent salary that maintains your purchasing power, plus a 5% relocation-buffer recommendation. All calculations run locally in your browser — no signup, no data leaves your device.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter your current salary",
        description:
          "Type your gross annual salary in the currency of your current city. The calculator compares cost-of-living indexes — it does not perform currency conversion.",
      },
      {
        title: "Pick current and target cities",
        description:
          "Choose your current city and the city you're considering moving to from the dropdown. ~70 cities across 6 continents are included.",
      },
      {
        title: "Read the equivalent and recommended salary",
        description:
          "The equivalent salary preserves your purchasing power in the target city. The recommended ask adds a 5% buffer for relocation friction and risk.",
      },
      {
        title: "Use the chart in negotiations",
        description:
          "The bar chart visualises the salary you'd need in the target city to maintain the same standard of living. Use it as an anchor for salary negotiations or relocation planning.",
      },
    ],
    useCases: [
      "Negotiate a relocation package when your employer moves you between offices.",
      "Compare two job offers in different cities on a like-for-like basis.",
      "Decide whether a remote role with a lower nominal salary in a cheaper city is actually a raise.",
      "Plan a personal move: see how much salary you need to maintain your lifestyle abroad.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The cost-of-living index is a blended average of consumer prices, groceries, restaurants,
          transport and utilities — weighted roughly towards rent. It does not capture your specific
          spending pattern (e.g. if you own your home, rent weight should be lower for you).
        </li>
        <li>
          The tool does not perform currency conversion. If your current and target cities use
          different currencies, convert your salary to the target currency first using today&apos;s
          exchange rate, then run the comparison. The COL ratio is currency-agnostic.
        </li>
        <li>
          The index values are reasonable approximations compiled from public cost-of-living
          data sources (Numbeo, Expatistan) for general guidance. They are not official statistics
          and will drift over time with inflation.
        </li>
        <li>
          The 5% relocation buffer is a rule of thumb. Adjust based on your risk tolerance, family
          situation, visa costs and whether the employer is covering relocation.
        </li>
        <li>
          Tax differences between countries are not modelled. Two cities with the same COL index
          can have very different post-tax purchasing power depending on income tax bands.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Does this convert currencies?",
        a: "No. The comparison is purely cost-of-living adjusted. If you earn USD in New York and are considering a EUR salary in Berlin, convert your current salary to EUR using today's exchange rate first, then run the comparison. The COL ratio (Berlin/NYC) is the same regardless of currency.",
      },
      {
        q: "Where do the cost-of-living numbers come from?",
        a: "They are reasonable approximations compiled from public cost-of-living data sources (Numbeo, Expatistan) for general guidance. New York City is the baseline at index 100. The values are not official statistics and will drift with inflation — use them as a directional guide, not for tax planning.",
      },
      {
        q: "Why is the recommended salary higher than the equivalent?",
        a: "The recommended ask adds a 5% buffer for relocation friction: the risk of moving, hidden costs (deposits, setup, visa fees), and the well-documented pattern that movers systematically under-negotiate. Drop it to 0% if you're evaluating an internal transfer with full relocation support.",
      },
      {
        q: "Can I add a city that isn't in the list?",
        a: "Not in this version. The list covers ~70 major world cities. For a city not listed, pick the nearest comparable city in the same country/region as a proxy.",
      },
      {
        q: "How is purchasing power calculated?",
        a: "Purchasing power change = (1 − COL ratio) × 100. If the target city's index is 80 and your current city is 100, the ratio is 0.8, so your purchasing power would increase by 20% at the same nominal salary — the city is cheaper.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
