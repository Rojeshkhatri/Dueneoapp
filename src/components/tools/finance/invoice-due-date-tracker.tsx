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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  CalendarClock,
  AlertCircle,
  CheckCircle2,
  Clock,
  Wallet,
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

type TermsKind = "net7" | "net15" | "net30" | "net60" | "eom" | "custom";

interface Invoice {
  id: string;
  number: string;
  client: string;
  issueDate: string; // YYYY-MM-DD
  amount: string;
  terms: TermsKind;
  customDays: string;
  paid: boolean;
}

const TERMS_LABEL: Record<TermsKind, string> = {
  net7: "Net 7",
  net15: "Net 15",
  net30: "Net 30",
  net60: "Net 60",
  eom: "EOM",
  custom: "Custom",
};

const TERMS_DAYS: Record<TermsKind, number | "eom"> = {
  net7: 7,
  net15: 15,
  net30: 30,
  net60: 60,
  eom: "eom",
  custom: 0,
};

const STORAGE_KEY = "dueneo:invoices:v1";

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

function toDateInputValue(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Compute the due date for a given invoice. */
function dueDate(inv: Invoice): Date | null {
  const issue = parseDateInput(inv.issueDate);
  if (!issue) return null;
  if (inv.terms === "eom") {
    // End of the issue month.
    return new Date(issue.getFullYear(), issue.getMonth() + 1, 0);
  }
  const days =
    inv.terms === "custom"
      ? Math.max(0, parseInt(inv.customDays || "0", 10))
      : (TERMS_DAYS[inv.terms] as number);
  const d = new Date(issue);
  d.setDate(d.getDate() + days);
  return d;
}

/** Whole-day difference between today and `target`. Negative = overdue. */
function dayDiff(target: Date): number {
  const today = new Date();
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const targetUTC = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((targetUTC - todayUTC) / 86_400_000);
}

interface InvoiceStatus {
  dueDate: Date | null;
  daysUntil: number | null;
  overdue: boolean;
  status: "overdue" | "due-soon" | "upcoming" | "paid" | "invalid";
}

function statusOf(inv: Invoice): InvoiceStatus {
  if (inv.paid) {
    return { dueDate: dueDate(inv), daysUntil: null, overdue: false, status: "paid" };
  }
  const due = dueDate(inv);
  if (!due) return { dueDate: null, daysUntil: null, overdue: false, status: "invalid" };
  const diff = dayDiff(due);
  return {
    dueDate: due,
    daysUntil: diff,
    overdue: diff < 0,
    status: diff < 0 ? "overdue" : diff <= 7 ? "due-soon" : "upcoming",
  };
}

const SAMPLE_INVOICES: Invoice[] = [
  {
    id: "inv-1",
    number: "INV-1001",
    client: "Acme Corp",
    issueDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 45);
      return toDateInputValue(d);
    })(),
    amount: "2400",
    terms: "net30",
    customDays: "",
    paid: false,
  },
  {
    id: "inv-2",
    number: "INV-1002",
    client: "Globex Ltd",
    issueDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 5);
      return toDateInputValue(d);
    })(),
    amount: "1800",
    terms: "net15",
    customDays: "",
    paid: false,
  },
  {
    id: "inv-3",
    number: "INV-1003",
    client: "Initech",
    issueDate: todayInputValue(),
    amount: "3200",
    terms: "eom",
    customDays: "",
    paid: false,
  },
];

function loadInvoices(): Invoice[] {
  if (typeof window === "undefined") return SAMPLE_INVOICES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SAMPLE_INVOICES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SAMPLE_INVOICES;
    return parsed as Invoice[];
  } catch {
    return SAMPLE_INVOICES;
  }
}

let idCounter = 0;
function newId(): string {
  idCounter += 1;
  return `inv-${Date.now()}-${idCounter}`;
}

export function InvoiceDueDateTracker({ tool }: { tool: ToolDefinition }) {
  const [currencyCode, setCurrencyCode] = React.useState("USD");
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate from localStorage on mount only.
  React.useEffect(() => {
    setInvoices(loadInvoices());
    setHydrated(true);
  }, []);

  // Persist on every change after hydration.
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
    } catch {
      // storage full / disabled — silently ignore
    }
  }, [invoices, hydrated]);

  const currency = currencyCode;

  const enriched = React.useMemo(
    () =>
      invoices.map((inv) => ({
        inv,
        status: statusOf(inv),
        amountNum: Math.max(0, parseNumber(inv.amount)),
      })),
    [invoices]
  );

  // Sort by urgency: overdue first (most overdue first), then due-soon, then
  // upcoming, then paid, then invalid. Within each tier, sort by due date.
  const sorted = React.useMemo(() => {
    const rank: Record<InvoiceStatus["status"], number> = {
      overdue: 0,
      "due-soon": 1,
      upcoming: 2,
      paid: 3,
      invalid: 4,
    };
    return [...enriched].sort((a, b) => {
      if (a.status.status !== b.status.status) {
        return rank[a.status.status] - rank[b.status.status];
      }
      const ad = a.status.dueDate?.getTime() ?? 0;
      const bd = b.status.dueDate?.getTime() ?? 0;
      return ad - bd;
    });
  }, [enriched]);

  const totalOutstanding = enriched
    .filter((e) => !e.inv.paid)
    .reduce((sum, e) => sum + e.amountNum, 0);
  const totalOverdue = enriched
    .filter((e) => e.status.overdue)
    .reduce((sum, e) => sum + e.amountNum, 0);
  const totalPaid = enriched
    .filter((e) => e.inv.paid)
    .reduce((sum, e) => sum + e.amountNum, 0);

  const addInvoice = () => {
    const newInv: Invoice = {
      id: newId(),
      number: `INV-${1000 + invoices.length + 1}`,
      client: "",
      issueDate: todayInputValue(),
      amount: "",
      terms: "net30",
      customDays: "",
      paid: false,
    };
    setInvoices((prev) => [newInv, ...prev]);
    toast.success("Invoice added.");
  };

  const updateInvoice = (id: string, patch: Partial<Invoice>) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv)));
  };

  const removeInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    toast.info("Invoice removed.");
  };

  const clearAll = () => {
    if (invoices.length === 0) return;
    if (
      window.confirm("Remove all invoices? This cannot be undone.")
    ) {
      setInvoices([]);
      toast.info("All invoices cleared.");
    }
  };

  const content: ToolContent = {
    intro:
      "Track multiple invoices, compute due dates from common payment terms (Net 7/15/30/60, End of Month, or custom days) and see at a glance which invoices are overdue, due soon, or upcoming. Totals show outstanding, overdue and paid amounts. Invoices are saved in your browser's local storage so you can come back to them later — your data never leaves your device.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard
            label="Outstanding"
            value={formatCurrency(totalOutstanding, { currency })}
            icon={<Wallet className="h-4 w-4 text-primary" />}
          />
          <StatCard
            label="Overdue"
            value={formatCurrency(totalOverdue, { currency })}
            icon={<AlertCircle className="h-4 w-4 text-rose-500" />}
            tone="danger"
          />
          <StatCard
            label="Paid"
            value={formatCurrency(totalPaid, { currency })}
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            tone="success"
          />
          <div className="flex flex-col justify-between rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="it-cur" className="text-xs text-muted-foreground">Currency</Label>
            </div>
            <Select value={currencyCode} onValueChange={setCurrencyCode}>
              <SelectTrigger id="it-cur" className="w-full">
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
          <Button size="sm" onClick={addInvoice}>
            <Plus className="mr-1.5 h-4 w-4" /> Add invoice
          </Button>
          <Button size="sm" variant="outline" onClick={clearAll}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Clear all
          </Button>
          <span className="text-xs text-muted-foreground">
            {invoices.length} invoice{invoices.length === 1 ? "" : "s"} · saved locally
          </span>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="max-h-[28rem] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[8rem]">Invoice #</TableHead>
                  <TableHead className="min-w-[8rem]">Client</TableHead>
                  <TableHead className="min-w-[7rem]">Issue date</TableHead>
                  <TableHead className="min-w-[8rem]">Terms</TableHead>
                  <TableHead className="min-w-[7rem]">Due date</TableHead>
                  <TableHead className="min-w-[7rem] text-right">Amount</TableHead>
                  <TableHead className="min-w-[8rem]">Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      No invoices yet. Click <strong>Add invoice</strong> to start tracking.
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map(({ inv, status, amountNum }) => (
                    <TableRow
                      key={inv.id}
                      className={status.overdue ? "bg-rose-50/60 dark:bg-rose-950/20" : ""}
                    >
                      <TableCell>
                        <Input
                          value={inv.number}
                          onChange={(e) => updateInvoice(inv.id, { number: e.target.value })}
                          className="h-8 border-0 bg-transparent px-1 font-mono text-xs focus-visible:ring-1"
                          aria-label="Invoice number"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={inv.client}
                          onChange={(e) => updateInvoice(inv.id, { client: e.target.value })}
                          placeholder="Client"
                          className="h-8 border-0 bg-transparent px-1 text-xs focus-visible:ring-1"
                          aria-label="Client name"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={inv.issueDate}
                          onChange={(e) => updateInvoice(inv.id, { issueDate: e.target.value })}
                          className="h-8 border-0 bg-transparent px-1 text-xs focus-visible:ring-1"
                          aria-label="Issue date"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={inv.terms}
                          onValueChange={(v) => updateInvoice(inv.id, { terms: v as TermsKind })}
                        >
                          <SelectTrigger className="h-8 w-[7.5rem] text-xs" aria-label="Payment terms">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="net7">Net 7</SelectItem>
                            <SelectItem value="net15">Net 15</SelectItem>
                            <SelectItem value="net30">Net 30</SelectItem>
                            <SelectItem value="net60">Net 60</SelectItem>
                            <SelectItem value="eom">EOM</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        {inv.terms === "custom" && (
                          <Input
                            type="number"
                            min={0}
                            value={inv.customDays}
                            onChange={(e) => updateInvoice(inv.id, { customDays: e.target.value })}
                            placeholder="days"
                            className="mt-1 h-7 w-[5rem] text-xs"
                            aria-label="Custom days"
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono tabular-nums">
                        {status.dueDate ? fmtDate(status.dueDate) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        <Input
                          inputMode="decimal"
                          value={inv.amount}
                          onChange={(e) => updateInvoice(inv.id, { amount: e.target.value })}
                          placeholder="0.00"
                          className="h-8 w-20 border-0 bg-transparent px-1 text-right font-mono text-xs tabular-nums focus-visible:ring-1"
                          aria-label="Amount"
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => updateInvoice(inv.id, { paid: !inv.paid })}
                          aria-label={inv.paid ? "Mark unpaid" : "Mark paid"}
                          className="focus:outline-none"
                        >
                          <StatusBadge status={status} />
                        </button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeInvoice(inv.id)}
                          aria-label="Remove invoice"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
          Sorted by urgency: overdue first, then due-soon (within 7 days), then
          upcoming, then paid. <strong>Click any status badge</strong> to mark an
          invoice paid or unpaid.
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Click Add invoice",
        description:
          "Creates a new row with today's date and Net 30 terms. Edit any field by clicking it.",
      },
      {
        title: "Fill in invoice details",
        description:
          "Enter the invoice number, client name, issue date and amount. Choose payment terms (Net 7/15/30/60, EOM or custom days).",
      },
      {
        title: "Read the computed due date",
        description:
          "The due date is calculated from the issue date and terms — Net N = issue + N days, EOM = end of the issue month, custom = issue + your N days.",
      },
      {
        title: "Track overdue and mark paid",
        description:
          "Overdue invoices are highlighted in red. Click the status badge on any invoice to toggle paid/unpaid — paid invoices move to the bottom and are excluded from the outstanding total.",
      },
    ],
    useCases: [
      "Track outstanding client invoices and chase overdue ones proactively.",
      "Project cash flow by listing upcoming invoice due dates.",
      "Switch between Net 30, EOM and custom terms without recalculating due dates by hand.",
      "Reconcile monthly — mark everything paid by the end of the month.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{FINANCE_DISCLAIMER}</li>
        <li>
          "EOM" is interpreted as the last day of the issue month. Some
          businesses use "end of the following month" or "10th of following
          month" — switch to Custom days (e.g. 45) for those variants.
        </li>
        <li>
          Data is stored only in this browser's localStorage. Clearing your
          browser data, using private mode or a different device will lose the
          list. Export to your accounting system for a permanent record.
        </li>
        <li>
          No reminders or notifications — this is a planning view, not a
          receivables system. Pair it with your calendar for actual follow-ups.
        </li>
        <li>
          Multi-currency invoices are not modelled — every invoice is treated
          as the same currency selected at the top.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What does EOM mean here?",
        a: "End of the issue month. An invoice issued on March 15 with EOM terms is due March 31. For 'end of next month' or '15th of next month', use Custom days (e.g. 45 for ~6 weeks).",
      },
      {
        q: "Is my invoice data sent to a server?",
        a: "No. The list is saved only in your browser's localStorage. It never leaves your device. Clear your browser data and the list is gone — export it manually if you need a backup.",
      },
      {
        q: "How is 'days overdue' calculated?",
        a: "We use whole calendar days from today's local date to the due date. Weekends and holidays are not adjusted — your contract may grant a grace period that this tool does not assume.",
      },
      {
        q: "Can I track partial payments?",
        a: "Not in this version. Mark the invoice paid in full once it is settled, or reduce the amount to reflect the remaining balance.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  if (status.status === "paid") {
    return (
      <Badge variant="outline" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Paid
      </Badge>
    );
  }
  if (status.status === "overdue") {
    return (
      <Badge variant="outline" className="bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300">
        <AlertCircle className="mr-1 h-3 w-3" />
        {Math.abs(status.daysUntil ?? 0)}d overdue
      </Badge>
    );
  }
  if (status.status === "due-soon") {
    return (
      <Badge variant="outline" className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300">
        <Clock className="mr-1 h-3 w-3" /> in {status.daysUntil}d
      </Badge>
    );
  }
  if (status.status === "invalid") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        No date
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-muted text-muted-foreground hover:bg-muted">
      <CalendarClock className="mr-1 h-3 w-3" /> in {status.daysUntil}d
    </Badge>
  );
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
  tone?: "danger" | "success";
}) {
  return (
    <div
      className={
        "rounded-xl border p-4 " +
        (tone === "danger"
          ? "border-rose-300/60 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/20"
          : tone === "success"
            ? "border-emerald-300/60 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/20"
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
