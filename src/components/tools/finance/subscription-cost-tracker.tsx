"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  CreditCard,
  CalendarDays,
  Sparkles,
  TrendingUp,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  FINANCE_DISCLAIMER,
} from "./_finance-helpers";

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "CAD", symbol: "$" },
  { code: "AUD", symbol: "$" },
  { code: "INR", symbol: "₹" },
];

type Period = "weekly" | "monthly" | "yearly";
type Status = "active" | "cancelled";

interface Subscription {
  id: string;
  name: string;
  cost: string;
  period: Period;
  startDate: string; // YYYY-MM-DD
  status: Status;
}

const STORAGE_KEY = "dueneo:subscriptions:v1";
const EXPENSIVE_THRESHOLD_USD = 20; // monthly cost above this = "expensive" highlight

function todayInputValue(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseDateInput(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Number of whole billing periods elapsed since `start` up to today. */
function periodsElapsed(start: Date, period: Period): number {
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    // Add days of previous month — approximate is fine for an estimator.
    days += 30;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const totalMonths = years * 12 + months;
  switch (period) {
    case "weekly":
      return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (7 * 86_400_000)));
    case "monthly":
      return Math.max(0, totalMonths);
    case "yearly":
      // Whole years elapsed; partial years don't count.
      return Math.max(0, years);
  }
}

/** Convert any-period cost to a monthly-equivalent cost. */
function monthlyOf(cost: number, period: Period): number {
  switch (period) {
    case "weekly":
      return (cost * 52) / 12;
    case "monthly":
      return cost;
    case "yearly":
      return cost / 12;
  }
}

function annualOf(cost: number, period: Period): number {
  return monthlyOf(cost, period) * 12;
}

const SAMPLE_SUBS: Subscription[] = [
  {
    id: "sub-1",
    name: "Netflix",
    cost: "22.99",
    period: "monthly",
    startDate: "2022-06-01",
    status: "active",
  },
  {
    id: "sub-2",
    name: "Adobe Creative Cloud",
    cost: "599.88",
    period: "yearly",
    startDate: "2021-11-15",
    status: "active",
  },
  {
    id: "sub-3",
    name: "Gym membership",
    cost: "39.99",
    period: "monthly",
    startDate: "2023-01-10",
    status: "active",
  },
  {
    id: "sub-4",
    name: "Old news app",
    cost: "9.99",
    period: "monthly",
    startDate: "2020-03-01",
    status: "cancelled",
  },
];

function loadSubs(): Subscription[] {
  if (typeof window === "undefined") return SAMPLE_SUBS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SAMPLE_SUBS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SAMPLE_SUBS;
    return parsed as Subscription[];
  } catch {
    return SAMPLE_SUBS;
  }
}

let idCounter = 0;
function newId(): string {
  idCounter += 1;
  return `sub-${Date.now()}-${idCounter}`;
}

interface ComputedSub {
  sub: Subscription;
  costNum: number;
  monthly: number;
  annual: number;
  lifetime: number;
  periodsPaid: number;
  expensive: boolean;
}

export function SubscriptionCostTracker({ tool }: { tool: ToolDefinition }) {
  const [currencyCode, setCurrencyCode] = React.useState("USD");
  const [subs, setSubs] = React.useState<Subscription[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setSubs(loadSubs());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
    } catch {
      // storage full / disabled
    }
  }, [subs, hydrated]);

  const currency = currencyCode;

  const computed = React.useMemo<ComputedSub[]>(() => {
    return subs.map((sub) => {
      const costNum = Math.max(0, parseNumber(sub.cost));
      const monthly = monthlyOf(costNum, sub.period);
      const annual = annualOf(costNum, sub.period);
      const start = parseDateInput(sub.startDate);
      const periodsPaid = start ? periodsElapsed(start, sub.period) : 0;
      const lifetime = costNum * periodsPaid;
      return {
        sub,
        costNum,
        monthly,
        annual,
        lifetime,
        periodsPaid,
        expensive: monthly >= EXPENSIVE_THRESHOLD_USD && sub.status === "active",
      };
    });
  }, [subs]);

  // Sort by monthly cost descending (active first, then cancelled).
  const sorted = React.useMemo(() => {
    return [...computed].sort((a, b) => {
      if (a.sub.status !== b.sub.status) {
        return a.sub.status === "active" ? -1 : 1;
      }
      return b.monthly - a.monthly;
    });
  }, [computed]);

  const activeTotalMonthly = computed
    .filter((c) => c.sub.status === "active")
    .reduce((s, c) => s + c.monthly, 0);
  const activeTotalAnnual = computed
    .filter((c) => c.sub.status === "active")
    .reduce((s, c) => s + c.annual, 0);
  const totalLifetimeAll = computed.reduce((s, c) => s + c.lifetime, 0);

  const addSub = () => {
    const newSub: Subscription = {
      id: newId(),
      name: "",
      cost: "",
      period: "monthly",
      startDate: todayInputValue(),
      status: "active",
    };
    setSubs((prev) => [newSub, ...prev]);
    toast.success("Subscription added.");
  };

  const updateSub = (id: string, patch: Partial<Subscription>) => {
    setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSub = (id: string) => {
    setSubs((prev) => prev.filter((s) => s.id !== id));
    toast.info("Subscription removed.");
  };

  const clearAll = () => {
    if (subs.length === 0) return;
    if (window.confirm("Remove all subscriptions? This cannot be undone.")) {
      setSubs([]);
      toast.info("All subscriptions cleared.");
    }
  };

  const content: ToolContent = {
    intro:
      "Track every recurring subscription — streaming, software, gym, apps, memberships. Add the cost, billing period (weekly, monthly or yearly), start date and status. The tracker computes the monthly and annual equivalents, the lifetime cost to date, and flags your most expensive active subscriptions. Everything is saved locally in your browser.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard
            label="Monthly (active)"
            value={formatCurrency(activeTotalMonthly, { currency })}
            icon={<CreditCard className="h-4 w-4 text-primary" />}
          />
          <StatCard
            label="Annual (active)"
            value={formatCurrency(activeTotalAnnual, { currency })}
            icon={<CalendarDays className="h-4 w-4 text-primary" />}
          />
          <StatCard
            label="Lifetime (all)"
            value={formatCurrency(totalLifetimeAll, { currency })}
            icon={<TrendingUp className="h-4 w-4 text-amber-500" />}
            tone="warning"
          />
          <div className="flex flex-col justify-between rounded-xl border bg-card p-4">
            <Label htmlFor="st-cur" className="text-xs text-muted-foreground">Currency</Label>
            <Select value={currencyCode} onValueChange={setCurrencyCode}>
              <SelectTrigger id="st-cur" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={addSub}>
            <Plus className="mr-1.5 h-4 w-4" /> Add subscription
          </Button>
          <Button size="sm" variant="outline" onClick={clearAll}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Clear all
          </Button>
          <span className="text-xs text-muted-foreground">
            {subs.length} subscription{subs.length === 1 ? "" : "s"} · saved locally
          </span>
        </div>

        <div className="space-y-3">
          {sorted.length === 0 ? (
            <div className="rounded-xl border bg-card py-12 text-center text-sm text-muted-foreground">
              No subscriptions yet. Click <strong>Add subscription</strong> to start tracking.
            </div>
          ) : (
            sorted.map(
              ({ sub, costNum, monthly, annual, lifetime, periodsPaid, expensive }) => (
                <div
                  key={sub.id}
                  className={
                    "rounded-xl border p-4 transition " +
                    (sub.status === "cancelled"
                      ? "bg-muted/30 opacity-70"
                      : expensive
                        ? "border-amber-400/60 bg-amber-50/60 dark:bg-amber-950/20"
                        : "bg-card")
                  }
                >
                  <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
                    <div className="space-y-1">
                      <Label htmlFor={`s-${sub.id}-name`} className="text-xs text-muted-foreground">
                        Name
                      </Label>
                      <Input
                        id={`s-${sub.id}-name`}
                        value={sub.name}
                        onChange={(e) => updateSub(sub.id, { name: e.target.value })}
                        placeholder="e.g. Netflix"
                        className="h-9 font-medium"
                      />
                      <div className="flex flex-wrap items-center gap-1.5">
                        {sub.status === "active" ? (
                          <Badge variant="outline" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            <XCircle className="mr-1 h-3 w-3" /> Cancelled
                          </Badge>
                        )}
                        {expensive && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300">
                            <Sparkles className="mr-1 h-3 w-3" /> Expensive
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`s-${sub.id}-cost`} className="text-xs text-muted-foreground">
                        Cost
                      </Label>
                      <Input
                        id={`s-${sub.id}-cost`}
                        inputMode="decimal"
                        value={sub.cost}
                        onChange={(e) => updateSub(sub.id, { cost: e.target.value })}
                        placeholder="0.00"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`s-${sub.id}-period`} className="text-xs text-muted-foreground">
                        Period
                      </Label>
                      <Select
                        value={sub.period}
                        onValueChange={(v) => updateSub(sub.id, { period: v as Period })}
                      >
                        <SelectTrigger id={`s-${sub.id}-period`} className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`s-${sub.id}-start`} className="text-xs text-muted-foreground">
                        Start date
                      </Label>
                      <Input
                        id={`s-${sub.id}-start`}
                        type="date"
                        value={sub.startDate}
                        onChange={(e) => updateSub(sub.id, { startDate: e.target.value })}
                        className="h-9"
                      />
                    </div>

                    <div className="flex items-end gap-2">
                      <Select
                        value={sub.status}
                        onValueChange={(v) => updateSub(sub.id, { status: v as Status })}
                      >
                        <SelectTrigger id={`s-${sub.id}-status`} className="h-9 w-28" aria-label="Status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 flex-none"
                        onClick={() => removeSub(sub.id)}
                        aria-label="Remove subscription"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat label="Monthly equiv." value={formatCurrency(monthly, { currency })} />
                    <Stat label="Annual equiv." value={formatCurrency(annual, { currency })} />
                    <Stat label="Periods paid" value={`${periodsPaid}`} />
                    <Stat
                      label="Lifetime cost"
                      value={formatCurrency(lifetime, { currency })}
                      highlight
                    />
                  </div>
                  {costNum === 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Enter a cost above to see monthly, annual and lifetime totals.
                    </p>
                  )}
                </div>
              )
            )
          )}
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
          Sorted by monthly cost (active first). Subscriptions above{" "}
          {formatCurrency(EXPENSIVE_THRESHOLD_USD, { currency })}/month are
          highlighted with an amber border. Cancelled subscriptions stay in your
          list for lifetime-cost accounting but are excluded from monthly and
          annual totals.
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Click Add subscription",
        description:
          "Creates a new row with today's start date, monthly billing and active status. Edit any field by clicking it.",
      },
      {
        title: "Enter name, cost and billing period",
        description:
          "Type the subscription name, the per-period cost (what you actually pay each billing cycle) and choose weekly, monthly or yearly.",
      },
      {
        title: "Set the start date",
        description:
          "The start date drives the lifetime cost: the number of full billing periods elapsed × per-period cost.",
      },
      {
        title: "Mark cancelled subs",
        description:
          "Change status to Cancelled to exclude a sub from monthly/annual totals while keeping its lifetime cost visible.",
      },
    ],
    useCases: [
      "Audit all your recurring spending in one place — the monthly total is often eye-watering.",
      "Decide which subscriptions to cancel by comparing monthly cost vs usage.",
      "Spot forgotten subscriptions still charging you months or years after you stopped using them.",
      "Annual planning: project next year's subscription spend from the annual total.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          Lifetime cost counts whole billing periods elapsed since the start
          date. Partial periods (e.g. 15 days into a monthly subscription) are
          not counted — the actual lifetime cost is slightly higher.
        </li>
        <li>
          Cost is assumed constant since the start date. Real subscriptions
          often have price increases, free trials, intro rates or annual
          discounts that this tracker does not model.
        </li>
        <li>
          Data is stored only in this browser's localStorage. Clearing your
          browser data, using private mode or a different device will lose the
          list. Export manually if you need a backup.
        </li>
        <li>
          All subscriptions are treated as the same currency selected at the
          top. Multi-currency tracking is not supported.
        </li>
        <li>
          The "expensive" threshold is hardcoded at{" "}
          {formatCurrency(EXPENSIVE_THRESHOLD_USD, { currency })}/month for
          highlighting — adjust your own definition of expensive mentally when
          reviewing the list.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "How is the monthly equivalent calculated?",
        a: "Weekly cost × 52 ÷ 12 (a week is treated as 1/52 of a year). Monthly is the cost as-is. Yearly is divided by 12. This gives a normalised monthly figure you can compare across subscriptions with different billing periods.",
      },
      {
        q: "What counts as 'expensive'?",
        a: "Any active subscription whose monthly-equivalent cost is at or above the threshold (currently $20/month). These are highlighted with an amber border so you can spot your biggest line items at a glance.",
      },
      {
        q: "How is lifetime cost computed?",
        a: "We count the number of whole billing periods elapsed since your start date and multiply by the per-period cost. A monthly sub started 18 months ago at $10/month has a lifetime cost of $180.",
      },
      {
        q: "Is my subscription data sent to a server?",
        a: "No. The list is saved only in your browser's localStorage. It never leaves your device. Use a password manager or spreadsheet if you need cross-device sync.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "warning";
}) {
  return (
    <div
      className={
        "rounded-xl border p-4 " +
        (tone === "warning"
          ? "border-amber-300/60 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20"
          : "bg-card")
      }
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={
          "font-mono text-sm font-semibold tabular-nums " +
          (highlight ? "text-amber-600 dark:text-amber-500" : "text-foreground")
        }
      >
        {value}
      </div>
    </div>
  );
}
