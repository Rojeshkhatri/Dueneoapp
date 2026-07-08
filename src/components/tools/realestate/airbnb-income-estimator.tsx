"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, TrendingDown, TrendingUp, Bed } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { parseNumber, formatCurrency, formatPercent, RE_DISCLAIMER } from "./_re-helpers";

export function AirbnbIncomeEstimator({ tool }: { tool: ToolDefinition }) {
  const [nightly, setNightly] = React.useState<string>("180");
  const [occupancy, setOccupancy] = React.useState<string>("65");
  const [cleaning, setCleaning] = React.useState<string>("60");
  const [platformFee, setPlatformFee] = React.useState<string>("3");
  const [monthlyExpenses, setMonthlyExpenses] = React.useState<string>("350");
  const currency = "USD";

  const nightlyNum = Math.max(0, parseNumber(nightly));
  const occNum = Math.max(0, Math.min(100, parseNumber(occupancy)));
  const cleaningNum = Math.max(0, parseNumber(cleaning));
  const feePct = Math.max(0, Math.min(100, parseNumber(platformFee)));
  const monthlyExpNum = Math.max(0, parseNumber(monthlyExpenses));

  // nights per month = 30.4 average
  const NIGHTS_PER_MONTH = 30.4;
  const bookedNights = (occNum / 100) * NIGHTS_PER_MONTH;
  const monthlyGross = nightlyNum * bookedNights + (cleaningNum * bookedNights);
  const monthlyPlatformFee = monthlyGross * (feePct / 100);
  const monthlyNet = monthlyGross - monthlyPlatformFee - monthlyExpNum;
  const annualGross = monthlyGross * 12;
  const annualNet = monthlyNet * 12;

  // Sensitivity: -10% occupancy
  const occLow = Math.max(0, occNum - 10);
  const bookedNightsLow = (occLow / 100) * NIGHTS_PER_MONTH;
  const monthlyGrossLow = nightlyNum * bookedNightsLow + (cleaningNum * bookedNightsLow);
  const monthlyNetLow = monthlyGrossLow - monthlyGrossLow * (feePct / 100) - monthlyExpNum;
  const delta = monthlyNet - monthlyNetLow;

  const reset = () => {
    setNightly("180");
    setOccupancy("65");
    setCleaning("60");
    setPlatformFee("3");
    setMonthlyExpenses("350");
    toast.info("Reset.");
  };

  const summary = `Airbnb income estimate
Nightly rate: ${formatCurrency(nightlyNum, { currency })}
Occupancy: ${formatPercent(occNum, 0)}
Cleaning fee / stay: ${formatCurrency(cleaningNum, { currency })}
Platform fee: ${formatPercent(feePct, 1)}
Monthly expenses: ${formatCurrency(monthlyExpNum, { currency })}

Monthly gross: ${formatCurrency(monthlyGross, { currency })}
Monthly platform fee: ${formatCurrency(monthlyPlatformFee, { currency })}
Monthly net: ${formatCurrency(monthlyNet, { currency })}
Annual gross: ${formatCurrency(annualGross, { currency })}
Annual net: ${formatCurrency(annualNet, { currency })}

Sensitivity (occupancy −10%):
  Monthly net at ${formatPercent(occLow, 0)}: ${formatCurrency(monthlyNetLow, { currency })}
  Delta: ${formatCurrency(delta, { currency })}`;

  const content: ToolContent = {
    intro:
      "Estimate Airbnb / short-term rental income from nightly rate, occupancy, cleaning fee, platform fees and monthly expenses. See monthly and annual gross and net, plus a sensitivity check that shows what your income would be if occupancy dropped 10%.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Listing assumptions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="Nightly rate" value={nightly} onChange={setNightly} />
              <Field label="Occupancy (%)" value={occupancy} onChange={setOccupancy} />
              <Field label="Cleaning fee / stay" value={cleaning} onChange={setCleaning} />
              <Field label="Platform fee (%)" value={platformFee} onChange={setPlatformFee} />
              <div className="space-y-2 sm:col-span-2">
                <Label>Monthly operating expenses</Label>
                <Input inputMode="decimal" value={monthlyExpenses} onChange={(e) => setMonthlyExpenses(e.target.value)} placeholder="Utilities, supplies, mgmt, etc." />
              </div>
              <Button size="sm" variant="ghost" onClick={reset} className="sm:col-span-2">
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Projected income</CardTitle>
                <CopyButton value={summary} size="sm" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Big label="Monthly net" value={formatCurrency(monthlyNet, { currency })} tone={monthlyNet >= 0 ? "good" : "bad"} icon={<Bed className="h-4 w-4" />} />
              <Big label="Annual net" value={formatCurrency(annualNet, { currency })} tone={annualNet >= 0 ? "good" : "bad"} />
              <div className="border-t pt-3 space-y-2 text-sm">
                <Row label="Booked nights / month" value={bookedNights.toFixed(1)} muted />
                <Row label="Monthly gross" value={formatCurrency(monthlyGross, { currency })} icon={<TrendingUp className="h-3.5 w-3.5" />} />
                <Row label="Monthly platform fee" value={formatCurrency(monthlyPlatformFee, { currency })} muted />
                <Row label="Monthly expenses" value={formatCurrency(monthlyExpNum, { currency })} muted />
                <Row label="Annual gross" value={formatCurrency(annualGross, { currency })} highlight icon={<TrendingUp className="h-3.5 w-3.5" />} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingDown className="h-4 w-4 text-amber-600" /> Occupancy sensitivity
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Tile label={`Current (${formatPercent(occNum, 0)})`} value={formatCurrency(monthlyNet, { currency })} />
            <Tile label={`−10% (${formatPercent(occLow, 0)})`} value={formatCurrency(monthlyNetLow, { currency })} tone={monthlyNetLow < monthlyNet ? "bad" : "neutral"} />
            <Tile label="Monthly delta" value={formatCurrency(delta, { currency })} tone="bad" />
          </CardContent>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Short-term rental occupancy is volatile — a 10% drop in bookings reduces your monthly net by{" "}
              <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(delta, { currency })}</span>.
              Use this as a stress test before counting on the headline number.
            </p>
          </CardContent>
        </Card>

        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {RE_DISCLAIMER}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter nightly rate and occupancy",
        description: "Your average nightly rate and the percentage of nights you expect to be booked (typically 50–75% for active listings).",
      },
      {
        title: "Add cleaning fee and platform fee",
        description: "Cleaning fee is per stay (added to gross). Platform fee (e.g. Airbnb 3% host-only or 14–16% split) is a percentage of gross.",
      },
      {
        title: "Add monthly operating expenses",
        description: "Utilities, supplies, cleaning service, property management, and a reserve for maintenance.",
      },
      {
        title: "Read the projection and sensitivity",
        description: "Monthly and annual net are shown, plus a stress test at 10% lower occupancy.",
      },
    ],
    useCases: [
      "Compare a long-term rental vs Airbnb listing on the same property.",
      "Stress-test whether the listing still cash-flows at lower occupancy.",
      "Decide whether the extra work of Airbnb is worth the premium over a long-term tenant.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{RE_DISCLAIMER}</li>
        <li>The model uses 30.4 nights/month and ignores seasonal swings, turnover gaps, and dynamic-pricing variance. Real occupancy varies month to month.</li>
        <li>Lodging tax, local short-term-rental permitting fees, and host-provided amenities are not included. Add them to monthly expenses.</li>
        <li>Platform fee varies — Airbnb's host-only fee is 3%, split-fee is 14–16% total (guest + host). Check your host dashboard.</li>
      </ul>
    ),
    faq: [
      {
        q: "What's a realistic occupancy rate?",
        a: "Active, well-priced listings in popular destinations often run 60–80%. New or off-season listings can be 30–50%. Use your market's average as a starting point and stress-test with the sensitivity check.",
      },
      {
        q: "What's the difference between gross and net here?",
        a: "Gross = nightly rate × booked nights + cleaning fees. Net = gross − platform fee − monthly operating expenses. Net is what hits your bank account before tax and mortgage.",
      },
      {
        q: "Should I include the mortgage?",
        a: "Not in this calculator — it's an operating-income estimate. Subtract your mortgage P&I from the monthly net to see true cash flow.",
      },
      {
        q: "How accurate is the sensitivity check?",
        a: "It's a simple linear stress test: same nightly rate and expenses, 10% fewer booked nights. Real markets may drop more or less than 10% in a downturn — use it as a sanity check, not a forecast.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Big({ label, value, icon, tone = "neutral" }: { label: string; value: string; icon?: React.ReactNode; tone?: "good" | "bad" | "neutral" }) {
  const color = tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "bad" ? "text-rose-600 dark:text-rose-400" : "text-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1.5 font-mono text-2xl font-bold tabular-nums ${color}`}>
        {icon}{value}
      </span>
    </div>
  );
}

function Tile({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "good" | "bad" | "neutral" }) {
  const color = tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "bad" ? "text-rose-600 dark:text-rose-400" : "text-foreground";
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-lg font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  muted,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={"text-sm " + (highlight ? "font-medium text-primary" : muted ? "text-muted-foreground/80" : "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={
          "flex items-center gap-1.5 font-mono tabular-nums " +
          (highlight ? "text-base font-semibold text-primary" : muted ? "text-sm text-muted-foreground" : "text-base text-foreground")
        }
      >
        {icon}{value}
      </span>
    </div>
  );
}
