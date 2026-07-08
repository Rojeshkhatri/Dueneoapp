"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Download,
  RotateCcw,
  Shuffle,
  Sun,
  Moon,
  Sunset,
  Users,
  CalendarRange,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { toast } from "sonner";
import { DOW_LABELS, addDays, csvField, downloadText, formatPrettyDate, toDateInputValue } from "./_hr-helpers";

type ShiftType = "M" | "E" | "N" | "OFF";

interface ShiftDef {
  code: ShiftType;
  label: string;
  start: string;
  end: string;
  color: string;
  bg: string;
  text: string;
}

const SHIFTS: Record<Exclude<ShiftType, "OFF">, ShiftDef> = {
  M: {
    code: "M",
    label: "Morning",
    start: "06:00",
    end: "14:00",
    color: "var(--chart-3)",
    bg: "bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-300",
  },
  E: {
    code: "E",
    label: "Evening",
    start: "14:00",
    end: "22:00",
    color: "var(--chart-5)",
    bg: "bg-sky-500/15",
    text: "text-sky-700 dark:text-sky-300",
  },
  N: {
    code: "N",
    label: "Night",
    start: "22:00",
    end: "06:00",
    color: "var(--chart-4)",
    bg: "bg-violet-500/15",
    text: "text-violet-700 dark:text-violet-300",
  },
};

const SHIFT_ICON: Record<Exclude<ShiftType, "OFF">, React.ComponentType<{ className?: string }>> = {
  M: Sun,
  E: Sunset,
  N: Moon,
};

type AssignMode = "manual" | "round-robin";

/** Per-day assignment: `grid[dayIndex][employeeIndex] = shiftCode | "OFF"`. */
type Grid = ShiftType[][];

function detectConflicts(grid: Grid, employees: string[]): { dayIdx: number; empIdx: number; reason: string }[] {
  const conflicts: { dayIdx: number; empIdx: number; reason: string }[] = [];
  for (let empIdx = 0; empIdx < employees.length; empIdx++) {
    for (let dayIdx = 0; dayIdx < grid.length; dayIdx++) {
      const cur = grid[dayIdx]?.[empIdx];
      if (cur === "N") {
        // Night shift followed by morning shift = back-to-back conflict
        const next = grid[dayIdx + 1]?.[empIdx];
        if (next === "M") {
          conflicts.push({
            dayIdx: dayIdx + 1,
            empIdx,
            reason: "Morning after night — only 8h gap (need 12h+)",
          });
        }
      }
      // 6+ consecutive work days
      let run = 0;
      let startDay = dayIdx;
      while (startDay < grid.length && grid[startDay]?.[empIdx] && grid[startDay]?.[empIdx] !== "OFF") {
        run++;
        startDay++;
      }
      if (run >= 6 && (dayIdx === 0 || grid[dayIdx - 1]?.[empIdx] === "OFF" || !grid[dayIdx - 1]?.[empIdx])) {
        conflicts.push({
          dayIdx,
          empIdx,
          reason: `${run} consecutive work days — fatigue risk`,
        });
      }
    }
  }
  return conflicts;
}

export function ShiftPlanner({ tool }: { tool: ToolDefinition }) {
  const today = React.useMemo(() => new Date(), []);
  const [startDateStr, setStartDateStr] = React.useState(toDateInputValue(today));
  const [days, setDays] = React.useState(7);
  const [employeeText, setEmployeeText] = React.useState(
    "Alice\nBob\nCarol\nDavid\nEve"
  );
  const [mode, setMode] = React.useState<AssignMode>("manual");
  const [grid, setGrid] = React.useState<Grid>([]);

  const employees = React.useMemo(
    () => employeeText.split(/\n/).map((s) => s.trim()).filter(Boolean),
    [employeeText]
  );

  // Keep grid dimensions in sync with employees / days.
  React.useEffect(() => {
    setGrid((prev) => {
      const next: Grid = [];
      for (let d = 0; d < days; d++) {
        const row: ShiftType[] = [];
        for (let e = 0; e < employees.length; e++) {
          row.push(prev[d]?.[e] ?? "OFF");
        }
        next.push(row);
      }
      return next;
    });
  }, [days, employees.length]);

  const conflicts = React.useMemo(() => detectConflicts(grid, employees), [grid, employees]);

  const setCell = (dayIdx: number, empIdx: number, shift: ShiftType) => {
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      if (!next[dayIdx]) next[dayIdx] = new Array(employees.length).fill("OFF");
      // Toggle off if same shift clicked.
      next[dayIdx][empIdx] = next[dayIdx][empIdx] === shift ? "OFF" : shift;
      return next;
    });
  };

  const autoAssign = () => {
    if (employees.length === 0) {
      toast.error("Add at least one employee first");
      return;
    }
    // Round-robin: cycle through shifts M/E/N for each day, distribute across employees.
    const shiftCycle: ShiftType[] = ["M", "E", "N"];
    const next: Grid = [];
    for (let d = 0; d < days; d++) {
      const row: ShiftType[] = [];
      for (let e = 0; e < employees.length; e++) {
        // For 3+ employees, leave some on OFF to ensure coverage is feasible.
        if (employees.length >= 3 && e >= shiftCycle.length) {
          row.push("OFF");
        } else {
          // Rotate so the same person doesn't always get morning.
          const idx = (d + e) % shiftCycle.length;
          row.push(shiftCycle[idx]);
        }
      }
      // Shuffle row so the same person isn't always first
      next.push(row);
    }
    setGrid(next);
    toast.success(`Auto-assigned ${days} day(s) for ${employees.length} employee(s)`);
  };

  const clearGrid = () => {
    setGrid((prev) => prev.map((row) => row.map(() => "OFF")));
    toast.success("Cleared all shifts");
  };

  const reset = () => {
    setStartDateStr(toDateInputValue(new Date()));
    setDays(7);
    setEmployeeText("Alice\nBob\nCarol\nDavid\nEve");
    setMode("manual");
    setGrid([]);
  };

  const exportCsv = () => {
    if (employees.length === 0 || grid.length === 0) {
      toast.error("Nothing to export yet");
      return;
    }
    const start = new Date(startDateStr);
    const header = ["Employee", ...grid.map((_, d) => formatPrettyDate(addDays(start, d)).replace(/,/g, ""))];
    const rows: string[] = [header.map(csvField).join(",")];
    for (let e = 0; e < employees.length; e++) {
      const row = [
        employees[e],
        ...grid.map((dayRow) => {
          const code = dayRow[e] ?? "OFF";
          if (code === "OFF") return "OFF";
          const s = SHIFTS[code];
          return `${code} (${s.start}-${s.end})`;
        }),
      ];
      rows.push(row.map(csvField).join(","));
    }
    // Coverage summary row
    rows.push("");
    rows.push(["Coverage summary"].map(csvField).join(","));
    for (let d = 0; d < grid.length; d++) {
      const counts: Record<string, number> = { M: 0, E: 0, N: 0, OFF: 0 };
      for (let e = 0; e < employees.length; e++) {
        counts[grid[d]?.[e] ?? "OFF"]++;
      }
      const dateLabel = formatPrettyDate(addDays(start, d)).replace(/,/g, "");
      rows.push(
        [dateLabel, `M:${counts.M}`, `E:${counts.E}`, `N:${counts.N}`, `OFF:${counts.OFF}`]
          .map(csvField)
          .join(",")
      );
    }
    const csv = rows.join("\n");
    const filename = `shift-plan-${startDateStr || "export"}.csv`;
    downloadText(filename, csv, "text/csv");
    toast.success(`Exported ${filename}`);
  };

  // Coverage stats per shift per day
  const coverageByDay = React.useMemo(() => {
    return grid.map((row) => {
      const counts: Record<ShiftType, number> = { M: 0, E: 0, N: 0, OFF: 0 };
      for (const cell of row) {
        counts[cell]++;
      }
      return counts;
    });
  }, [grid]);

  const start = new Date(startDateStr);

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="sp-employees" className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" /> Employees (one per line)
            </Label>
            <Textarea
              id="sp-employees"
              value={employeeText}
              onChange={(e) => setEmployeeText(e.target.value)}
              placeholder={"Alice\nBob\nCarol"}
              className="min-h-[140px] resize-y font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {employees.length} employee(s) detected.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sp-start" className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-primary" /> Start date
              </Label>
              <Input
                id="sp-start"
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-days" className="flex items-center gap-1.5">
                <CalendarRange className="h-4 w-4 text-primary" /> Days to plan
              </Label>
              <Input
                id="sp-days"
                type="number"
                min={1}
                max={31}
                value={days}
                onChange={(e) => setDays(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assignment mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as AssignMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual — click cells to assign</SelectItem>
                <SelectItem value="round-robin">Round-robin auto-assign</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            {mode === "round-robin" && (
              <Button variant="outline" size="sm" onClick={autoAssign}>
                <Shuffle className="mr-1.5 h-3.5 w-3.5" /> Auto-assign
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={clearGrid}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear grid
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Sun className="h-4 w-4 text-amber-500" /> Shift types
          </h3>
          <div className="grid gap-2">
            {Object.values(SHIFTS).map((s) => {
              const Icon = SHIFT_ICON[s.code];
              return (
                <div
                  key={s.code}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${s.bg}`}
                >
                  <Icon className={`h-5 w-5 ${s.text}`} />
                  <div className="flex-1">
                    <div className={`text-sm font-semibold ${s.text}`}>
                      {s.code} — {s.label}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {s.start}–{s.end}
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {s.code}
                  </Badge>
                </div>
              );
            })}
            <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/40">
              <div className="h-5 w-5" />
              <div className="flex-1">
                <div className="text-sm font-semibold">OFF — Day off</div>
                <div className="font-mono text-xs text-muted-foreground">No shift assigned</div>
              </div>
              <Badge variant="outline" className="font-mono">OFF</Badge>
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" /> {conflicts.length} conflict(s) detected
              </div>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1 text-xs text-amber-800 dark:text-amber-200" style={{ scrollbarWidth: "thin" }}>
                {conflicts.map((c, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="font-mono">{employees[c.empIdx] ?? `Emp ${c.empIdx + 1}`} · Day {c.dayIdx + 1}:</span>
                    <span>{c.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Schedule grid */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarRange className="h-4 w-4 text-primary" /> Schedule
          </h3>
          <Badge variant="secondary">{days} day(s) × {employees.length} employee(s)</Badge>
        </div>

        {employees.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
            Add at least one employee above to start planning shifts.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-[100px] border-b border-r bg-card p-2 text-left font-medium text-muted-foreground">
                    Employee
                  </th>
                  {grid.map((_, d) => {
                    const date = addDays(start, d);
                    const dow = DOW_LABELS[date.getDay()].slice(0, 3);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    return (
                      <th
                        key={d}
                        className={`border-b border-r p-2 text-center font-medium ${
                          isWeekend ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "text-muted-foreground"
                        }`}
                      >
                        <div className="text-[10px] uppercase">{dow}</div>
                        <div className="font-mono text-sm font-semibold text-foreground">{date.getDate()}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, empIdx) => (
                  <tr key={empIdx}>
                    <td className="sticky left-0 z-10 border-b border-r bg-card p-2 font-medium">
                      {emp}
                    </td>
                    {grid.map((dayRow, d) => {
                      const cell = dayRow[empIdx] ?? "OFF";
                      const hasConflict = conflicts.some(
                        (c) => c.dayIdx === d && c.empIdx === empIdx
                      );
                      if (cell === "OFF") {
                        return (
                          <td key={d} className="border-b border-r p-1">
                            <button
                              type="button"
                              onClick={() => mode === "manual" && setCell(d, empIdx, "M")}
                              disabled={mode !== "manual"}
                              className={`flex h-12 w-full items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground ${
                                mode === "manual" ? "cursor-pointer hover:border-primary hover:bg-primary/5" : "cursor-default"
                              }`}
                              aria-label={`Day ${d + 1} ${emp} — OFF`}
                            >
                              —
                            </button>
                          </td>
                        );
                      }
                      const s = SHIFTS[cell];
                      const Icon = SHIFT_ICON[cell];
                      return (
                        <td key={d} className="border-b border-r p-1">
                          <button
                            type="button"
                            onClick={() => mode === "manual" && setCell(d, empIdx, cell)}
                            disabled={mode !== "manual"}
                            className={`relative flex h-12 w-full flex-col items-center justify-center rounded-md border ${s.bg} ${s.text} ${
                              hasConflict ? "border-amber-500" : "border-transparent"
                            } ${mode === "manual" ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                            aria-label={`Day ${d + 1} ${emp} — ${s.label} ${s.start}-${s.end}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span className="font-mono text-[10px] font-bold">{cell}</span>
                            {hasConflict && (
                              <AlertTriangle className="absolute -right-1 -top-1 h-3 w-3 text-amber-500" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Coverage row */}
                <tr>
                  <td className="sticky left-0 z-10 border-r bg-muted/40 p-2 text-[10px] font-medium uppercase text-muted-foreground">
                    Coverage
                  </td>
                  {coverageByDay.map((c, d) => (
                    <td key={d} className="border-r p-2 text-center text-[10px]">
                      <div className="flex flex-col gap-0.5 font-mono">
                        <span className="text-amber-600 dark:text-amber-400">M:{c.M}</span>
                        <span className="text-sky-600 dark:text-sky-400">E:{c.E}</span>
                        <span className="text-violet-600 dark:text-violet-400">N:{c.N}</span>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {mode === "manual" && employees.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Click a cell to cycle through shift codes. Click an assigned cell to clear it. Switch to
            round-robin mode and click <em>Auto-assign</em> for a quick starting point you can then
            fine-tune.
          </p>
        )}
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Plan work shifts for your team across 1–31 days. Enter your employees (one per line), pick a start date and number of days, then either auto-assign shifts round-robin or click cells manually. Three shift types are predefined (Morning 06–14, Evening 14–22, Night 22–06). Conflicts (morning after night, 6+ consecutive work days) are flagged automatically. Export the final schedule as CSV. Everything runs locally in your browser.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter your employees",
        description:
          "Type one employee name per line in the employees textarea. The grid updates live as you add or remove names.",
      },
      {
        title: "Pick start date and number of days",
        description:
          "Choose the first day of the schedule and the number of days to plan (1–31). Weekends are highlighted amber in the grid.",
      },
      {
        title: "Auto-assign or assign manually",
        description:
          "Switch to round-robin mode and click Auto-assign for a quick rotating schedule, or stay in manual mode and click each cell to cycle through Morning/Evening/Night/Off.",
      },
      {
        title: "Check conflicts and export",
        description:
          "Dueneo flags morning-after-night shifts and 6+ consecutive work days. Fix any conflicts, then click Export CSV to download the schedule.",
      },
    ],
    useCases: [
      "Plan a 7-day rotating shift schedule for a small support team.",
      "Build a 14-day hospital roster with morning/evening/night coverage.",
      "Schedule retail staff for a busy weekend with even coverage across shifts.",
      "Generate a printable CSV rota to pin on the staff noticeboard.",
      "Verify that no employee is scheduled for a morning shift the day after a night shift.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Shift types are fixed at Morning (06–14), Evening (14–22) and Night (22–06). Custom shift
          windows are not supported in this version — pick the closest predefined shift.
        </li>
        <li>
          Round-robin auto-assign is a simple rotation. It does not respect fairness across weeks,
          preferred shift patterns, or labour-law maximum-hours rules. Always review the auto-assigned
          schedule before publishing.
        </li>
        <li>
          Conflict detection covers two cases: morning shift the day after a night shift (insufficient
          rest), and 6+ consecutive work days (fatigue risk). It does not model legal max-hours,
          minimum-rest, or per-week rest-day requirements — check your local labour law.
        </li>
        <li>
          Up to 31 days can be planned in one grid. For longer schedules, plan in 28-day blocks and
          export each block separately.
        </li>
        <li>
          Coverage stats count employees per shift per day. They do not check whether coverage meets
          a minimum staffing requirement — set your own target and verify visually.
        </li>
        <li>
          CSV export uses local date formatting — open in Excel/Sheets and adjust timezone if needed.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "How do I assign shifts manually?",
        a: "Switch the assignment-mode dropdown to \"Manual — click cells to assign\". Each click on an empty cell assigns the next shift code (M → E → N → OFF). Click an assigned cell to cycle forward, or click it when it's the same shift to clear back to OFF.",
      },
      {
        q: "How does round-robin auto-assign work?",
        a: "Dueneo cycles through M/E/N for each employee per day, rotating the starting shift so no one is always on mornings. For 3+ employees, extras are left OFF to keep coverage feasible. Always review the result and adjust for fairness — it's a starting point, not a final schedule.",
      },
      {
        q: "What conflicts are flagged?",
        a: "Two patterns: (1) morning shift the day after a night shift (less than 12-hour rest gap), (2) 6+ consecutive work days without a day off. Both are flagged with an amber triangle on the cell and listed in the conflicts panel. Other labour-law rules (max hours/week, min rest between shifts) are not checked.",
      },
      {
        q: "Can I plan more than 31 days?",
        a: "Not in a single grid — 31 is the cap to keep the table readable. For longer schedules, plan in 28-day blocks and export each block as a separate CSV.",
      },
      {
        q: "Does this handle part-time or custom shifts?",
        a: "Not directly. Shift windows are fixed at 06–14, 14–22, 22–06. For part-time or split shifts, assign the closest predefined shift and annotate the CSV manually. A future version may add custom shift windows.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
