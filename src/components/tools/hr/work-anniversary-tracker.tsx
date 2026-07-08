"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  RotateCcw,
  Download,
  Cake,
  Award,
  CalendarHeart,
  CalendarClock,
  TrendingUp,
  Users,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { toast } from "sonner";
import {
  csvField,
  downloadText,
  formatInt,
  formatPrettyDate,
  nextAnniversary,
  parseDateInput,
  toDateInputValue,
  totalDaysBetween,
  yearsOfService,
} from "./_hr-helpers";

interface Employee {
  id: string;
  name: string;
  startDate: string; // yyyy-mm-dd
}

const STORAGE_KEY = "dueneo:work-anniversaries:v1";

const MILESTONES = [1, 5, 10, 15, 20, 25];

function uid(): string {
  return `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const DEFAULT_EMPLOYEES: Employee[] = [
  { id: "e1", name: "Alice Chen", startDate: "2019-03-15" },
  { id: "e2", name: "Bob Patel", startDate: "2021-07-01" },
  { id: "e3", name: "Carol Singh", startDate: "2014-11-23" },
  { id: "e4", name: "David Garcia", startDate: "2023-01-09" },
  { id: "e5", name: "Eve Müller", startDate: "2009-06-12" },
];

interface Row extends Employee {
  start: Date;
  years: number;
  nextAnniv: Date;
  daysUntil: number;
  isMilestone: boolean;
  milestoneYear: number | null;
}

export function WorkAnniversaryTracker({ tool }: { tool: ToolDefinition }) {
  const today = React.useMemo(() => new Date(), []);
  const [employees, setEmployees] = React.useState<Employee[]>(DEFAULT_EMPLOYEES);

  // Load from localStorage on mount.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Employee[];
        if (Array.isArray(parsed)) {
          setEmployees(parsed);
          toast.info("Loaded saved employee list");
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const addEmployee = () => {
    setEmployees((p) => [
      ...p,
      { id: uid(), name: "", startDate: toDateInputValue(new Date()) },
    ]);
  };

  const updateEmployee = (id: string, patch: Partial<Employee>) => {
    setEmployees((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const removeEmployee = (id: string) => {
    setEmployees((p) => p.filter((e) => e.id !== id));
  };

  const reset = () => {
    setEmployees(DEFAULT_EMPLOYEES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    toast.success("Reset to sample list");
  };

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
      toast.success(`Saved ${employees.length} employee(s) to this browser`);
    } catch {
      toast.error("Could not save — browser storage unavailable");
    }
  };

  const rows: Row[] = React.useMemo(() => {
    const out: Row[] = [];
    for (const e of employees) {
      const start = parseDateInput(e.startDate);
      if (!start) continue;
      const years = yearsOfService(start, today);
      const anniv = nextAnniversary(start, today);
      const daysUntil = totalDaysBetween(today, anniv);
      // Is the upcoming anniversary a milestone year? years + 1 = milestone year.
      const upcomingYears = years + 1;
      const isMilestone = MILESTONES.includes(upcomingYears);
      const milestoneYear = isMilestone ? upcomingYears : null;
      out.push({
        ...e,
        start,
        years,
        nextAnniv: anniv,
        daysUntil,
        isMilestone,
        milestoneYear,
      });
    }
    // Sort by days until next anniversary (ascending).
    out.sort((a, b) => a.daysUntil - b.daysUntil);
    return out;
  }, [employees, today]);

  const upcoming = React.useMemo(() => rows.filter((r) => r.daysUntil <= 60), [rows]);
  const milestoneRows = React.useMemo(() => rows.filter((r) => r.isMilestone), [rows]);

  const exportCsv = () => {
    if (rows.length === 0) {
      toast.error("Nothing to export yet");
      return;
    }
    const header = [
      "Name",
      "Start date",
      "Years of service",
      "Next anniversary",
      "Days until",
      "Upcoming milestone",
    ];
    const lines: string[] = [header.map(csvField).join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.name,
          r.startDate,
          r.years,
          formatPrettyDate(r.nextAnniv),
          r.daysUntil,
          r.milestoneYear ?? "",
        ]
          .map(csvField)
          .join(",")
      );
    }
    const filename = `work-anniversaries-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadText(filename, lines.join("\n"), "text/csv");
    toast.success(`Exported ${filename}`);
  };

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" /> Employees
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={addEmployee}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add employee
              </Button>
              <Button variant="outline" size="sm" onClick={save}>
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>

          <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
            {employees.length === 0 && (
              <p className="rounded-md border border-dashed bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
                No employees yet. Click &ldquo;Add employee&rdquo; to start tracking anniversaries.
              </p>
            )}
            {employees.map((e) => (
              <div key={e.id} className="flex items-center gap-2">
                <Input
                  value={e.name}
                  onChange={(ev) => updateEmployee(e.id, { name: ev.target.value })}
                  placeholder="Employee name"
                  className="h-9 flex-1"
                  aria-label="Employee name"
                />
                <Input
                  type="date"
                  value={e.startDate}
                  onChange={(ev) => updateEmployee(e.id, { startDate: ev.target.value })}
                  className="h-9 w-44"
                  aria-label="Start date"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEmployee(e.id)}
                  aria-label={`Remove ${e.name || "employee"}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming panel */}
        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarHeart className="h-4 w-4 text-primary" /> Upcoming (next 60 days)
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No anniversaries in the next 60 days.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((r) => (
                <li
                  key={r.id}
                  className={`rounded-lg border p-3 ${
                    r.isMilestone ? "border-amber-500/40 bg-amber-500/10" : "bg-background"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{r.name || "(unnamed)"}</span>
                    {r.isMilestone ? (
                      <Badge className="gap-1 bg-amber-500 text-amber-950 hover:bg-amber-500">
                        <Award className="h-3 w-3" /> {r.milestoneYear} yr
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{r.years + 1} yr</Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatPrettyDate(r.nextAnniv)}</span>
                    <span className="font-mono">
                      {r.daysUntil === 0 ? "today!" : `in ${formatInt(r.daysUntil)} day(s)`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {milestoneRows.length > 0 && (
            <>
              <h4 className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Award className="h-3.5 w-3.5 text-amber-500" /> Upcoming milestones
              </h4>
              <ul className="space-y-1.5">
                {milestoneRows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <Cake className="h-3.5 w-3.5 text-amber-500" />
                      {r.name || "(unnamed)"}
                    </span>
                    <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-700 dark:text-amber-300">
                      {r.milestoneYear} years
                    </Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Full table sorted by upcoming */}
      {rows.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="h-4 w-4 text-primary" /> All anniversaries (sorted by upcoming)
          </h3>
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start date</TableHead>
                  <TableHead className="text-right">Years of service</TableHead>
                  <TableHead>Next anniversary</TableHead>
                  <TableHead className="text-right">Days until</TableHead>
                  <TableHead>Milestone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className={r.isMilestone ? "bg-amber-500/5" : ""}>
                    <TableCell className="font-medium">{r.name || "(unnamed)"}</TableCell>
                    <TableCell className="font-mono text-xs">{formatPrettyDate(r.start)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      <span className="flex items-center justify-end gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-primary" />
                        {formatInt(r.years)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{formatPrettyDate(r.nextAnniv)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {r.daysUntil === 0 ? (
                        <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          today!
                        </Badge>
                      ) : (
                        formatInt(r.daysUntil)
                      )}
                    </TableCell>
                    <TableCell>
                      {r.isMilestone ? (
                        <Badge variant="outline" className="gap-1 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          <Award className="h-3 w-3" /> {r.milestoneYear} years
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="gap-1.5">
              <Users className="h-3 w-3" /> {rows.length} employee(s)
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Award className="h-3 w-3 text-amber-500" /> {milestoneRows.length} milestone(s) upcoming
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <CalendarHeart className="h-3 w-3" /> {upcoming.length} in next 60 days
            </Badge>
          </div>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Track work anniversaries for your team. Add employees with name and start date, and Dueneo calculates years of service, next anniversary date, days until the next anniversary and highlights upcoming milestones (1, 5, 10, 15, 20, 25 years). The list is sorted by upcoming anniversary so you always know who to celebrate next. Save the list to localStorage to persist between visits, and export as CSV for HR records. Everything runs locally in your browser.",
    tool: toolBody,
    howTo: [
      {
        title: "Add employees with name and start date",
        description:
          "Click \"Add employee\" for each team member. Enter their name and pick their start date using the date picker. The list updates live as you type.",
      },
      {
        title: "Read the upcoming panel",
        description:
          "The right panel shows anniversaries in the next 60 days, with milestone anniversaries (1, 5, 10, 15, 20, 25 years) highlighted in amber.",
      },
      {
        title: "Review the full table",
        description:
          "The bottom table shows every employee sorted by days-until-next-anniversary, with years of service, next anniversary date, days until and the milestone badge.",
      },
      {
        title: "Save to localStorage and export CSV",
        description:
          "Click Save to persist the list in this browser (so you don't have to re-enter it next visit). Click Export CSV to download a spreadsheet for HR records.",
      },
    ],
    useCases: [
      "Plan recognition gifts or shoutouts for upcoming work anniversaries.",
      "Identify employees approaching milestone anniversaries (5, 10, 15, 20, 25 years) for special celebrations.",
      "Maintain a service-awards tracker for HR compliance and audit.",
      "Generate a monthly \"anniversaries this month\" report for team all-hands.",
      "Onboard a new HR manager by exporting the full anniversary list as CSV.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Milestones are hardcoded at 1, 5, 10, 15, 20, 25 years — the most common corporate
          service-award tiers. Custom tiers (e.g. 3, 7, 30 years) are not supported in this version.
        </li>
        <li>
          Saved data lives in localStorage (per-browser, per-device). It does not sync across
          devices or browsers. Export to CSV for a portable backup.
        </li>
        <li>
          The list is sorted by days-until-next-anniversary. To sort alphabetically or by tenure,
          export to CSV and sort in your spreadsheet app.
        </li>
        <li>
          Re-hires with a gap in service are treated as a single continuous tenure from the start
          date. To model a gap, add the employee twice with the two separate start dates.
        </li>
        <li>
          No email or calendar integration — for automated reminders, export the CSV and import
          the dates into your calendar or HRIS.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "How are years of service calculated?",
        a: "Calendar years, floored. If an employee started 15 March 2021 and today is 14 March 2024, that's 2 years of service — the 3-year anniversary is the next day. If today is 15 March 2024 (the anniversary), years of service becomes 3 and the next anniversary rolls to 15 March 2025.",
      },
      {
        q: "What counts as a milestone?",
        a: "The upcoming anniversary is a milestone if it lands on year 1, 5, 10, 15, 20 or 25. These are the most common corporate service-award tiers. If you've already passed your 25-year anniversary, no future milestone will be flagged — those are the highest tiers tracked.",
      },
      {
        q: "Where is my employee list stored?",
        a: "In localStorage in this browser only. Nothing is uploaded to Dueneo. To move the list to another device or browser, click Export CSV and re-enter from the export. Clicking Save overwrites any previously saved list in this browser.",
      },
      {
        q: "Why does the table show '(unnamed)' for some rows?",
        a: "You added an employee but didn't fill in their name yet. Type a name in the input and it'll replace the placeholder.",
      },
      {
        q: "Can I track contractors or temporary staff?",
        a: "Yes — just add them with their contract start date. Years of service will track their tenure from that date. There's no distinction between employee types in this tool.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
