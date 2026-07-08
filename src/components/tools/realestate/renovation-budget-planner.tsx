"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Download, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { uid, parseNumber, formatCurrency, toCsv, downloadText, loadJSON, saveJSON, RE_DISCLAIMER } from "./_re-helpers";

type Room = "Kitchen" | "Bathroom" | "Bedroom" | "Living Room" | "Garage" | "Garden" | "Whole House" | "Other";

interface RenoItem {
  id: string;
  room: Room;
  description: string;
  estimated: string;
  actual: string;
}

const ROOMS: Room[] = ["Kitchen", "Bathroom", "Bedroom", "Living Room", "Garage", "Garden", "Whole House", "Other"];

const STORAGE_KEY = "dueneo:reno-budget:v1";

export function RenovationBudgetPlanner({ tool }: { tool: ToolDefinition }) {
  const [items, setItems] = React.useState<RenoItem[]>(() =>
    loadJSON<RenoItem[]>(STORAGE_KEY, [
      { id: uid(), room: "Kitchen", description: "Cabinets + worktops", estimated: "8000", actual: "" },
      { id: uid(), room: "Kitchen", description: "Appliances", estimated: "2500", actual: "" },
      { id: uid(), room: "Bathroom", description: "Full refit", estimated: "5000", actual: "" },
    ])
  );
  const [currency, setCurrency] = React.useState<string>("USD");
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setLoaded(true);
  }, []);
  React.useEffect(() => {
    if (!loaded) return;
    saveJSON(STORAGE_KEY, items);
  }, [loaded, items]);

  const add = () =>
    setItems((p) => [...p, { id: uid(), room: "Kitchen", description: "", estimated: "", actual: "" }]);
  const update = (id: string, patch: Partial<RenoItem>) =>
    setItems((p) => p.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => setItems((p) => p.filter((it) => it.id !== id));

  const totals = React.useMemo(() => {
    let est = 0;
    let act = 0;
    let actCount = 0;
    for (const it of items) {
      const e = parseNumber(it.estimated);
      const a = parseNumber(it.actual);
      est += e;
      if (it.actual.trim() !== "") {
        act += a;
        actCount++;
      }
    }
    const variance = actCount > 0 ? act - est : 0;
    const variancePct = est > 0 && actCount > 0 ? (variance / est) * 100 : 0;
    return { est, act, actCount, variance, variancePct };
  }, [items]);

  const byRoom = React.useMemo(() => {
    const map = new Map<Room, { items: RenoItem[]; est: number; act: number; actCount: number }>();
    for (const r of ROOMS) map.set(r, { items: [], est: 0, act: 0, actCount: 0 });
    for (const it of items) {
      const e = parseNumber(it.estimated);
      const a = it.actual.trim() !== "" ? parseNumber(it.actual) : 0;
      const hasActual = it.actual.trim() !== "";
      const entry = map.get(it.room) ?? { items: [], est: 0, act: 0, actCount: 0 };
      entry.items.push(it);
      entry.est += e;
      if (hasActual) {
        entry.act += a;
        entry.actCount++;
      }
      map.set(it.room, entry);
    }
    return Array.from(map.entries()).filter(([, v]) => v.items.length > 0);
  }, [items]);

  const reset = () => {
    if (!confirm("Delete all renovation items?")) return;
    setItems([]);
    toast.info("Cleared.");
  };

  const exportCsv = () => {
    if (items.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    const rows: string[][] = [["Room", "Description", "Estimated", "Actual", "Variance"]];
    for (const it of items) {
      const e = parseNumber(it.estimated);
      const a = it.actual.trim() !== "" ? parseNumber(it.actual) : 0;
      const hasActual = it.actual.trim() !== "";
      const v = hasActual ? a - e : 0;
      rows.push([
        it.room,
        it.description,
        String(e),
        hasActual ? String(a) : "",
        hasActual ? String(v) : "",
      ]);
    }
    rows.push([]);
    rows.push(["TOTAL", "", String(totals.est), totals.actCount > 0 ? String(totals.act) : "", totals.actCount > 0 ? String(totals.variance) : ""]);
    downloadText("renovation-budget.csv", toCsv(rows), "text/csv");
    toast.success("Exported CSV");
  };

  const content: ToolContent = {
    intro:
      "Plan and track renovation costs by room. Add line items with an estimated cost, fill in actuals as you go, and see the variance per room and overall. Export the whole budget as CSV for your spreadsheet — your list is saved to this browser automatically.",
    tool: (
      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-sm">Budget summary</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["USD", "GBP", "EUR", "CAD", "AUD", "INR"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={exportCsv} disabled={items.length === 0}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
                </Button>
                <Button size="sm" variant="ghost" onClick={reset} disabled={items.length === 0}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-4">
              <Tile label="Estimated total" value={formatCurrency(totals.est, { currency })} />
              <Tile label={`Actual (${totals.actCount} ${totals.actCount === 1 ? "item" : "items"})`} value={totals.actCount > 0 ? formatCurrency(totals.act, { currency }) : "—"} />
              <Tile
                label="Variance"
                value={totals.actCount > 0 ? formatCurrency(totals.variance, { currency }) : "—"}
                tone={totals.actCount === 0 ? "neutral" : totals.variance > 0 ? "bad" : totals.variance < 0 ? "good" : "neutral"}
              />
              <Tile
                label="Variance %"
                value={totals.actCount > 0 && totals.est > 0 ? `${totals.variancePct.toFixed(1)}%` : "—"}
                tone={totals.actCount === 0 || totals.est === 0 ? "neutral" : totals.variance > 0 ? "bad" : totals.variance < 0 ? "good" : "neutral"}
              />
            </div>
          </CardContent>
        </Card>

        {byRoom.map(([room, data]) => {
          const roomVariance = data.actCount > 0 ? data.act - data.est : 0;
          return (
            <Card key={room}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm">
                    {room} <Badge variant="secondary" className="ml-1 text-[10px]">{data.items.length}</Badge>
                  </CardTitle>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="text-muted-foreground">Est: <span className="font-mono">{formatCurrency(data.est, { currency })}</span></span>
                    <span className="text-muted-foreground">Actual: <span className="font-mono">{data.actCount > 0 ? formatCurrency(data.act, { currency }) : "—"}</span></span>
                    <span className={data.actCount === 0 ? "text-muted-foreground" : roomVariance > 0 ? "text-rose-600 dark:text-rose-400" : roomVariance < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                      Var: <span className="font-mono">{data.actCount > 0 ? formatCurrency(roomVariance, { currency }) : "—"}</span>
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-[1fr_120px_120px_120px_32px] gap-2 text-xs font-medium text-muted-foreground">
                  <span>Description</span>
                  <span className="text-right">Estimated</span>
                  <span className="text-right">Actual</span>
                  <span className="text-right">Variance</span>
                  <span />
                </div>
                {data.items.map((it) => {
                  const e = parseNumber(it.estimated);
                  const a = it.actual.trim() !== "" ? parseNumber(it.actual) : 0;
                  const hasActual = it.actual.trim() !== "";
                  const v = hasActual ? a - e : 0;
                  return (
                    <div key={it.id} className="grid grid-cols-[1fr_120px_120px_120px_32px] items-center gap-2">
                      <Input
                        value={it.description}
                        onChange={(e2) => update(it.id, { description: e2.target.value })}
                        placeholder="What's being done"
                        className="h-8"
                      />
                      <Input
                        inputMode="decimal"
                        value={it.estimated}
                        onChange={(e2) => update(it.id, { estimated: e2.target.value })}
                        placeholder="0"
                        className="h-8 text-right"
                      />
                      <Input
                        inputMode="decimal"
                        value={it.actual}
                        onChange={(e2) => update(it.id, { actual: e2.target.value })}
                        placeholder="0"
                        className="h-8 text-right"
                      />
                      <span className={"text-right font-mono text-xs " + (hasActual ? (v > 0 ? "text-rose-600 dark:text-rose-400" : v < 0 ? "text-emerald-600 dark:text-emerald-400" : "") : "text-muted-foreground")}>
                        {hasActual ? formatCurrency(v, { currency }) : "—"}
                      </span>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(it.id)} aria-label="Remove">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        <div className="flex flex-wrap gap-2">
          <Button onClick={add}>
            <Plus className="mr-1.5 h-4 w-4" /> Add line item
          </Button>
        </div>

        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {RE_DISCLAIMER}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Add line items",
        description: "Each item belongs to a room and has a description plus an estimated cost. Add as many as you need.",
      },
      {
        title: "Fill in actuals as you go",
        description: "Once a contractor invoice lands, type the actual cost. The variance is computed automatically per item and per room.",
      },
      {
        title: "Watch the totals",
        description: "The summary card shows estimated vs actual totals, the variance and variance percentage across the whole project.",
      },
      {
        title: "Export to CSV",
        description: "Click Export CSV to download a flat spreadsheet-friendly file with every line plus a TOTAL row at the bottom.",
      },
    ],
    useCases: [
      "Plan a full house renovation budget before talking to contractors.",
      "Track whether your kitchen reno is on budget as invoices arrive.",
      "Export the budget for your accountant or a home-equity loan application.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{RE_DISCLAIMER}</li>
        <li>Per-room totals don't include contingency — add a 'Whole House' contingency line item to model a 10–20% buffer.</li>
        <li>Your budget is stored in this browser only. Export to CSV regularly to back it up or move it to another device.</li>
      </ul>
    ),
    faq: [
      {
        q: "How is variance calculated?",
        a: "Variance = actual − estimated for each line. A positive number means you went over budget; a negative number means you came in under. The room and overall variance roll up only items that have an actual entered.",
      },
      {
        q: "What's a realistic contingency?",
        a: "Most contractors recommend 10–20% on top of the estimate for surprises. Add a 'Whole House' line item with the contingency percentage as its estimated cost.",
      },
      {
        q: "Can I add a custom room?",
        a: "Use 'Other' for anything not in the preset list (Kitchen, Bathroom, Bedroom, Living Room, Garage, Garden, Whole House).",
      },
      {
        q: "Where is my budget saved?",
        a: "In your browser's localStorage under 'dueneo:reno-budget:v1'. It persists across reloads but isn't synced — export to CSV for a backup.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Tile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const color = tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "bad" ? "text-rose-600 dark:text-rose-400" : "text-foreground";
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
