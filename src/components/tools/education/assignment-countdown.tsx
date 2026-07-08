"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, AlarmClock, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { uid, parseDateInput, dayDiff, formatDate, loadJSON, saveJSON, EDU_DISCLAIMER } from "./_edu-helpers";

type Priority = "low" | "medium" | "high";

interface Assignment {
  id: string;
  name: string;
  dueDate: string; // YYYY-MM-DD
  priority: Priority;
}

const STORAGE_KEY = "dueneo:assignments:v1";

const PRIORITY_META: Record<Priority, { label: string; color: string; weight: number }> = {
  low: { label: "Low", color: "text-slate-500", weight: 1 },
  medium: { label: "Medium", color: "text-amber-600", weight: 2 },
  high: { label: "High", color: "text-rose-600", weight: 3 },
};

function useNow(intervalMs = 1000) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function AssignmentCountdown({ tool }: { tool: ToolDefinition }) {
  const [assignments, setAssignments] = React.useState<Assignment[]>(() => loadJSON<Assignment[]>(STORAGE_KEY, []));
  const [name, setName] = React.useState("");
  const [dueDate, setDueDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  });
  const [priority, setPriority] = React.useState<Priority>("medium");
  const now = useNow(1000);

  React.useEffect(() => {
    saveJSON(STORAGE_KEY, assignments);
  }, [assignments]);

  const add = () => {
    if (!name.trim()) {
      toast.error("Give the assignment a name.");
      return;
    }
    setAssignments((p) => [...p, { id: uid(), name: name.trim(), dueDate, priority }]);
    setName("");
    toast.success("Assignment added");
  };

  const remove = (id: string) => setAssignments((p) => p.filter((a) => a.id !== id));

  const reset = () => {
    if (assignments.length === 0) return;
    if (!confirm("Delete all assignments?")) return;
    setAssignments([]);
    toast.info("Cleared.");
  };

  const sorted = React.useMemo(() => {
    return assignments.slice().sort((a, b) => {
      const da = parseDateInput(a.dueDate)?.getTime() ?? Infinity;
      const db = parseDateInput(b.dueDate)?.getTime() ?? Infinity;
      if (da !== db) return da - db;
      return PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight;
    });
  }, [assignments]);

  const status = (a: Assignment) => {
    const d = parseDateInput(a.dueDate);
    if (!d) return { level: "neutral" as const, daysAway: null, text: "No date" };
    const daysAway = dayDiff(d, new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    if (daysAway < 0) return { level: "overdue" as const, daysAway, text: "Overdue" };
    if (daysAway === 0) return { level: "red" as const, daysAway, text: "Due today" };
    if (daysAway < 3) return { level: "red" as const, daysAway, text: `${daysAway}d left` };
    if (daysAway <= 7) return { level: "amber" as const, daysAway, text: `${daysAway}d left` };
    return { level: "green" as const, daysAway, text: `${daysAway}d left` };
  };

  const levelStyles: Record<string, string> = {
    overdue: "border-rose-400 bg-rose-50 dark:bg-rose-950/20",
    red: "border-rose-400 bg-rose-50 dark:bg-rose-950/20",
    amber: "border-amber-300 bg-amber-50 dark:bg-amber-950/20",
    green: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20",
    neutral: "border-border bg-card",
  };
  const levelBadge: Record<string, string> = {
    overdue: "bg-rose-600 text-white",
    red: "bg-rose-600 text-white",
    amber: "bg-amber-500 text-white",
    green: "bg-emerald-600 text-white",
    neutral: "bg-muted text-foreground",
  };

  const content: ToolContent = {
    intro:
      "Track multiple assignment due dates with live second-by-second countdowns. Sort by due date, see priority at a glance, and get colour-coded urgency: green (>7 days), amber (3–7 days), red (<3 days) and overdue. Your list is saved to this browser automatically.",
    tool: (
      <div className="space-y-5">
        <Card>
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] pt-6">
            <div className="space-y-2">
              <Label htmlFor="ac-name">Assignment name</Label>
              <Input
                id="ac-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Essay: Industrial Revolution"
                onKeyDown={(e) => { if (e.key === "Enter") add(); }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ac-due">Due date</Label>
              <Input id="ac-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={add} className="w-full sm:w-auto">
                <Plus className="mr-1.5 h-4 w-4" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <AlarmClock className="h-4 w-4 text-primary" />
            {assignments.length} assignment{assignments.length === 1 ? "" : "s"}
          </h3>
          <Button size="sm" variant="ghost" onClick={reset} disabled={assignments.length === 0}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear all
          </Button>
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            No assignments yet. Add one above to start the countdown.
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((a) => {
              const s = status(a);
              const d = parseDateInput(a.dueDate);
              return (
                <div key={a.id} className={`rounded-xl border p-4 ${levelStyles[s.level]}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-sm font-semibold">{a.name}</h4>
                        <Badge variant="outline" className={`text-[10px] ${PRIORITY_META[a.priority].color}`}>
                          {PRIORITY_META[a.priority].label}
                        </Badge>
                        <Badge className={`text-[10px] ${levelBadge[s.level]}`}>{s.text}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Due {d ? formatDate(d, { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <CountdownPill due={d} now={now} />
                      <Button size="icon" variant="ghost" onClick={() => remove(a.id)} aria-label="Remove assignment">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Add an assignment",
        description: "Type the name, pick a due date and set a priority. Press Enter to add quickly.",
      },
      {
        title: "Watch the live countdown",
        description: "Each card shows days / hours / minutes / seconds remaining, updating every second. Overdue cards are flagged in red.",
      },
      {
        title: "Sort & prioritise",
        description: "Cards are sorted by due date, then priority. Colour coding tells you at a glance what's urgent.",
      },
    ],
    useCases: [
      "Track essay, problem-set and lab report deadlines in one place.",
      "See which assignment to start next based on time remaining and priority.",
      "Avoid late submissions with a visible countdown for each due date.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{EDU_DISCLAIMER}</li>
        <li>Deadlines are stored in this browser only — clearing site data removes them. Export by screenshot or copy if needed.</li>
        <li>Times are computed from your device's local clock. If your system clock is wrong, the countdown will be wrong too.</li>
        <li>There is no notification system — keep the page open or check back regularly to see the live countdown.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why does the countdown tick every second?",
        a: "So you can see exactly how long is left down to the second for the most urgent items. The interval is throttled automatically when the tab is in the background by most browsers.",
      },
      {
        q: "What does 'Overdue' mean?",
        a: "The due date has already passed. The card stays in your list (in red) until you delete it — handy for tracking what you still need to submit.",
      },
      {
        q: "How is priority used?",
        a: "When two assignments share a due date, the higher-priority one is sorted first. Priority is shown as a small coloured badge on each card.",
      },
      {
        q: "Are my assignments synced?",
        a: "No — they live in this browser's localStorage. The list won't appear on your phone or another computer. Use the page as a personal, private tracker.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function CountdownPill({ due, now }: { due: Date | null; now: Date }) {
  if (!due) return <span className="text-xs text-muted-foreground">—</span>;
  const diff = due.getTime() - now.getTime();
  const overdue = diff < 0;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const seconds = Math.floor((abs % 60_000) / 1000);
  return (
    <div className="text-right">
      <div className="font-mono text-sm tabular-nums tracking-tight">
        {overdue ? "- " : ""}{String(days).padStart(2, "0")}d {String(hours).padStart(2, "0")}h {String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}s
      </div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {overdue ? "overdue" : "remaining"}
      </div>
    </div>
  );
}
