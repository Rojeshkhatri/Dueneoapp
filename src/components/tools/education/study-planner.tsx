"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, CalendarDays, Download, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { uid, todayInputValue, parseDateInput, addDays, isoWeekday, dayDiff, formatDate, downloadText, EDU_DISCLAIMER } from "./_edu-helpers";

interface Topic {
  id: string;
  name: string;
  hours: number; // estimated study hours
}

interface PlannedDay {
  date: Date;
  label: string;
  slots: { topicId: string; topicName: string; hours: number; done: boolean }[];
  totalHours: number;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_DAY_MAP: Record<number, boolean> = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: false, 7: false };

const STORAGE_KEY = "dueneo:study-planner:v1";

interface StoredState {
  examDate: string;
  topics: { id: string; name: string; hours: string }[];
  days: Record<number, boolean>;
  done: Record<string, boolean>;
}

export function StudyPlanner({ tool }: { tool: ToolDefinition }) {
  const [examDate, setExamDate] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 21);
    return todayInputValue().replace(/\d{2}-\d{2}$/, `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  });
  const [topics, setTopics] = React.useState<Topic[]>([
    { id: uid(), name: "Algebra review", hours: 4 },
    { id: uid(), name: "Trigonometry", hours: 3 },
    { id: uid(), name: "Calculus: limits", hours: 5 },
  ]);
  const [days, setDays] = React.useState<Record<number, boolean>>(DEFAULT_DAY_MAP);
  const [done, setDone] = React.useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = React.useState(false);

  // Load from localStorage once on mount.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as StoredState;
      if (s.examDate) setExamDate(s.examDate);
      if (Array.isArray(s.topics)) {
        setTopics(s.topics.map((t) => ({ id: t.id || uid(), name: t.name, hours: parseFloat(t.hours) || 0 })));
      }
      if (s.days) setDays({ ...DEFAULT_DAY_MAP, ...s.days });
      if (s.done) setDone(s.done);
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  // Persist on changes (after initial load).
  React.useEffect(() => {
    if (!loaded) return;
    const s: StoredState = {
      examDate,
      topics: topics.map((t) => ({ id: t.id, name: t.name, hours: String(t.hours) })),
      days,
      done,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // ignore
    }
  }, [loaded, examDate, topics, days, done]);

  const exam = parseDateInput(examDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalHours = topics.reduce((n, t) => n + t.hours, 0);

  // Compute available study days between today and exam day (inclusive of exam day if selected).
  const availableDays = React.useMemo(() => {
    if (!exam) return [] as Date[];
    const out: Date[] = [];
    const end = exam.getTime() < today.getTime() ? today : exam;
    let d = new Date(today);
    let safety = 0;
    while (d.getTime() <= end.getTime() && safety < 400) {
      const wd = isoWeekday(d);
      if (days[wd]) out.push(new Date(d));
      d = addDays(d, 1);
      safety++;
    }
    return out;
  }, [exam, days, today]);

  // Allocate topics to days using a balanced fill — sort topics by hours desc,
  // then assign to the day with the lowest load so far.
  const plan = React.useMemo<PlannedDay[]>(() => {
    if (availableDays.length === 0 || topics.length === 0) {
      return availableDays.map((d) => ({ date: d, label: formatDate(d, { weekday: "short", month: "short", day: "numeric" }), slots: [], totalHours: 0 }));
    }
    const dayLoads: number[] = availableDays.map(() => 0);
    const daySlots: { topicId: string; topicName: string; hours: number }[][] = availableDays.map(() => []);
    const sorted = topics.slice().sort((a, b) => b.hours - a.hours);
    for (const t of sorted) {
      let remaining = Math.max(0, t.hours);
      // Find the day with the lowest load and assign 1-hour blocks until done.
      while (remaining > 0) {
        let minIdx = 0;
        for (let i = 1; i < dayLoads.length; i++) {
          if (dayLoads[i] < dayLoads[minIdx]) minIdx = i;
        }
        const block = Math.min(2, remaining); // cap each block at 2h for focus
        dayLoads[minIdx] += block;
        daySlots[minIdx].push({ topicId: t.id, topicName: t.name, hours: block });
        remaining -= block;
        // Spread across days: nudge the next assignment off this day if there's another.
        if (dayLoads.length > 1 && remaining > 0) {
          // rotate by bumping this day's load temporarily so next iteration picks another day
          dayLoads[minIdx] += 0.001;
        }
      }
    }
    return availableDays.map((d, i) => ({
      date: d,
      label: formatDate(d, { weekday: "short", month: "short", day: "numeric" }),
      slots: daySlots[i].map((s) => ({ ...s, done: !!done[`${d.toISOString().slice(0, 10)}_${s.topicId}_${s.hours}`] })),
      totalHours: dayLoads[i],
    }));
  }, [availableDays, topics, done]);

  const doneSlots = plan.reduce((n, d) => n + d.slots.filter((s) => s.done).length, 0);
  const totalSlots = plan.reduce((n, d) => n + d.slots.length, 0);
  const progressPct = totalSlots > 0 ? (doneSlots / totalSlots) * 100 : 0;

  const toggleDone = (dateKey: string, topicId: string, hours: number, current: boolean) => {
    setDone((p) => {
      const next = { ...p };
      const key = `${dateKey}_${topicId}_${hours}`;
      if (current) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  const addTopic = () => setTopics((p) => [...p, { id: uid(), name: "", hours: 2 }]);
  const updateTopic = (id: string, patch: Partial<Topic>) =>
    setTopics((p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const removeTopic = (id: string) => setTopics((p) => p.filter((t) => t.id !== id));

  const reset = () => {
    if (!confirm("Clear the plan? This removes all topics and progress.")) return;
    setTopics([]);
    setDone({});
    setDays(DEFAULT_DAY_MAP);
    toast.info("Cleared.");
  };

  const exportSchedule = () => {
    if (plan.length === 0) {
      toast.error("Nothing to export — add topics and an exam date first.");
      return;
    }
    const lines: string[] = [];
    lines.push(`Study plan — exam on ${exam ? formatDate(exam) : "?"}`);
    lines.push(`Total topics: ${topics.length} | Total hours: ${totalHours} | Days: ${plan.length}`);
    lines.push("");
    for (const day of plan) {
      lines.push(day.label + (day.totalHours > 0 ? `  (${day.totalHours.toFixed(1)}h)` : ""));
      for (const s of day.slots) {
        lines.push(`  [${s.done ? "x" : " "}] ${s.hours}h — ${s.topicName}`);
      }
      lines.push("");
    }
    downloadText("study-plan.txt", lines.join("\n"));
    toast.success("Exported plan");
  };

  const examDaysAway = exam ? Math.max(0, dayDiff(exam, today)) : null;

  const content: ToolContent = {
    intro:
      "Enter your exam date, list the topics you need to cover with an estimated study time each, and pick which weekdays you can study. The planner balances the load across your available days, shows a calendar-style grid, and lets you tick off sessions as you complete them — progress is saved in your browser.",
    tool: (
      <div className="space-y-5">
        <Card>
          <CardContent className="grid gap-3 sm:grid-cols-2 pt-6">
            <div className="space-y-2">
              <Label htmlFor="sp-exam">Exam date</Label>
              <Input id="sp-exam" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
              {exam && examDaysAway !== null && (
                <p className="text-xs text-muted-foreground">
                  {examDaysAway === 0 ? "Exam is today." : `${examDaysAway} day${examDaysAway === 1 ? "" : "s"} away.`}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Study days per week</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((wd, i) => {
                  const iso = i + 1;
                  const on = !!days[iso];
                  return (
                    <Button
                      key={wd}
                      size="sm"
                      variant={on ? "default" : "outline"}
                      onClick={() => setDays((p) => ({ ...p, [iso]: !p[iso] }))}
                      className="h-8 px-2.5 text-xs"
                    >
                      {wd}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Toggle which weekdays you can study on.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Topics to cover</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topics.map((t, i) => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="w-6 text-xs text-muted-foreground">{i + 1}.</span>
                <Input
                  value={t.name}
                  onChange={(e) => updateTopic(t.id, { name: e.target.value })}
                  placeholder="Topic name"
                  className="flex-1"
                  aria-label={`Topic ${i + 1} name`}
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  value={String(t.hours)}
                  onChange={(e) => updateTopic(t.id, { hours: parseFloat(e.target.value) || 0 })}
                  className="w-20"
                  aria-label={`Hours for topic ${i + 1}`}
                />
                <span className="text-xs text-muted-foreground">h</span>
                <Button size="icon" variant="ghost" onClick={() => removeTopic(t.id)} aria-label="Remove topic">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={addTopic}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add topic
              </Button>
              <Badge variant="secondary">{topics.length} topics · {totalHours}h total</Badge>
              {plan.length > 0 && <Badge variant="secondary">{plan.length} study days</Badge>}
              <Button size="sm" variant="outline" onClick={exportSchedule} className="ml-auto">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export plan
              </Button>
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {plan.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-primary" /> Study calendar
                </CardTitle>
                <Badge variant={progressPct >= 100 ? "default" : "outline"}>
                  {doneSlots}/{totalSlots} sessions · {progressPct.toFixed(0)}%
                </Badge>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {plan.map((day) => (
                  <div
                    key={day.date.toISOString()}
                    className="rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">{day.label}</p>
                      {day.totalHours > 0 && (
                        <Badge variant="outline" className="text-[10px]">{day.totalHours.toFixed(1)}h</Badge>
                      )}
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {day.slots.length === 0 && (
                        <li className="text-xs italic text-muted-foreground">Rest day</li>
                      )}
                      {day.slots.map((s, idx) => {
                        const key = `${day.date.toISOString().slice(0, 10)}_${s.topicId}_${s.hours}`;
                        return (
                          <li key={idx} className="flex items-start gap-2 text-xs">
                            <Checkbox
                              id={`sp-${key}`}
                              checked={s.done}
                              onCheckedChange={(v) => toggleDone(day.date.toISOString().slice(0, 10), s.topicId, s.hours, s.done)}
                              className="mt-0.5"
                            />
                            <label htmlFor={`sp-${key}`} className="flex-1 cursor-pointer leading-snug">
                              <span className={s.done ? "line-through text-muted-foreground" : ""}>
                                <span className="font-mono">{s.hours}h</span> · {s.topicName}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {plan.length === 0 && exam && (
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            No study days available before the exam. Try toggling more weekdays on above.
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Set your exam date",
        description: "Pick the date of the exam. The planner counts available study days from today up to and including the exam date.",
      },
      {
        title: "List topics and hours",
        description: "Add each topic with an estimated study time in hours. Half-hours are allowed (e.g. 1.5).",
      },
      {
        title: "Pick your study weekdays",
        description: "Toggle Mon–Sun to mark which days you can study. The plan will only schedule sessions on those days.",
      },
      {
        title: "Tick off sessions as you go",
        description: "Each study block has a checkbox. Your progress bar updates live and is saved to this browser automatically.",
      },
    ],
    useCases: [
      "Lay out a 2-week revision plan before finals.",
      "Balance a heavy topic against many small ones — the planner fills the lowest-load day first.",
      "Track sticking to a study schedule by ticking off sessions as you complete them.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{EDU_DISCLAIMER}</li>
        <li>The allocator spreads topics in 1–2 hour blocks across your selected days. It does not model spaced repetition, interleaving or topic dependencies — re-order blocks manually if needed.</li>
        <li>If the exam date is today or in the past, the planner shows the plan as if starting today.</li>
        <li>Your plan is stored in this browser only — export to text for a backup or to share.</li>
      </ul>
    ),
    faq: [
      {
        q: "How are topics allocated to days?",
        a: "Topics are sorted by size (largest first), then assigned in 1–2 hour blocks to the day with the lowest current load. This balances the plan and front-loads the heaviest topics.",
      },
      {
        q: "Can I include weekends?",
        a: "Yes — toggle Sat and/or Sun on in the 'Study days per week' row. Days default to Mon–Fri only.",
      },
      {
        q: "Is my plan saved between visits?",
        a: "Yes — your topics, weekdays, exam date and progress checkboxes are stored in localStorage and reloaded next time you visit this page in the same browser.",
      },
      {
        q: "Can I export to a calendar app?",
        a: "The current export is plain text. For a calendar import, copy the plan into your calendar app manually or save the .txt file as a reference.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
