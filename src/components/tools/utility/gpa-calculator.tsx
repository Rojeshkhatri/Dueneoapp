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
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw, GraduationCap, Award } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { formatNum } from "./_calc-date-helpers";

interface GradeInfo {
  letter: string;
  points: number;
}

const GRADE_OPTIONS: GradeInfo[] = [
  { letter: "A", points: 4.0 },
  { letter: "A-", points: 3.7 },
  { letter: "B+", points: 3.3 },
  { letter: "B", points: 3.0 },
  { letter: "B-", points: 2.7 },
  { letter: "C+", points: 2.3 },
  { letter: "C", points: 2.0 },
  { letter: "C-", points: 1.7 },
  { letter: "D+", points: 1.3 },
  { letter: "D", points: 1.0 },
  { letter: "F", points: 0.0 },
];

interface Course {
  id: number;
  name: string;
  credits: string;
  grade: string;
}

let nextId = 4;

const STARTER_COURSES: Course[] = [
  { id: 1, name: "Calculus I", credits: "4", grade: "A" },
  { id: 2, name: "Intro to CS", credits: "3", grade: "A-" },
  { id: 3, name: "English Comp", credits: "3", grade: "B+" },
];

export function GPACalculator({ tool }: { tool: ToolDefinition }) {
  const [courses, setCourses] = React.useState<Course[]>(STARTER_COURSES);

  const addCourse = () => {
    setCourses((prev) => [
      ...prev,
      { id: nextId++, name: "", credits: "3", grade: "A" },
    ]);
  };

  const removeCourse = (id: number) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCourse = (id: number, patch: Partial<Course>) => {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const reset = () => {
    setCourses(STARTER_COURSES);
    toast.info("Reset to sample courses.");
  };

  const computed = React.useMemo(() => {
    let totalCredits = 0;
    let totalPoints = 0;
    let validCount = 0;
    for (const c of courses) {
      const credits = parseFloat(c.credits);
      const grade = GRADE_OPTIONS.find((g) => g.letter === c.grade);
      if (!Number.isFinite(credits) || credits <= 0) continue;
      if (!grade) continue;
      totalCredits += credits;
      totalPoints += credits * grade.points;
      validCount += 1;
    }
    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
    return { totalCredits, totalPoints, gpa, validCount };
  }, [courses]);

  const gradeColor = (gpa: number): string => {
    if (gpa >= 3.7) return "text-emerald-600 dark:text-emerald-400";
    if (gpa >= 3.0) return "text-sky-600 dark:text-sky-400";
    if (gpa >= 2.0) return "text-amber-600 dark:text-amber-400";
    if (gpa > 0) return "text-rose-600 dark:text-rose-400";
    return "text-foreground";
  };

  const summary = `GPA: ${formatNum(computed.gpa, 2)} / 4.0 — ${computed.validCount} course(s), ${formatNum(
    computed.totalCredits,
    1
  )} credits.`;

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 rounded-xl border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Courses</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
              <Button size="sm" onClick={addCourse}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add course
              </Button>
            </div>
          </div>

          {courses.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No courses yet. Click “Add course” to start building your GPA.
            </p>
          )}

          <div className="space-y-2">
            <div className="hidden grid-cols-12 gap-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
              <div className="col-span-5">Course name</div>
              <div className="col-span-2">Credits</div>
              <div className="col-span-4">Grade</div>
              <div className="col-span-1" />
            </div>

            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {courses.map((c) => {
                const credits = parseFloat(c.credits);
                const grade = GRADE_OPTIONS.find((g) => g.letter === c.grade);
                const points =
                  Number.isFinite(credits) && grade ? credits * grade.points : null;
                return (
                  <div
                    key={c.id}
                    className="grid grid-cols-12 items-end gap-2 rounded-lg border bg-background p-2 sm:p-3"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <Label htmlFor={`gpa-name-${c.id}`} className="sr-only">
                        Course name
                      </Label>
                      <Input
                        id={`gpa-name-${c.id}`}
                        value={c.name}
                        onChange={(e) => updateCourse(c.id, { name: e.target.value })}
                        placeholder="Course name"
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-2">
                      <Label htmlFor={`gpa-credits-${c.id}`} className="sr-only">
                        Credits
                      </Label>
                      <Input
                        id={`gpa-credits-${c.id}`}
                        inputMode="decimal"
                        value={c.credits}
                        onChange={(e) => updateCourse(c.id, { credits: e.target.value })}
                        placeholder="3"
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-4">
                      <Select
                        value={c.grade}
                        onValueChange={(v) => updateCourse(c.id, { grade: v })}
                      >
                        <SelectTrigger id={`gpa-grade-${c.id}`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADE_OPTIONS.map((g) => (
                            <SelectItem key={g.letter} value={g.letter}>
                              {g.letter} ({formatNum(g.points, 1)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1 sm:col-span-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeCourse(c.id)}
                        aria-label={`Remove ${c.name || "course"}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    {points !== null && (
                      <div className="col-span-12 -mt-1 px-1 text-xs text-muted-foreground">
                        Points: <span className="font-mono font-semibold text-foreground">{formatNum(points, 2)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Result</h3>
            <CopyButton value={summary} size="sm" />
          </div>

          <div className="rounded-lg border bg-background p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5 text-primary" /> Your GPA
            </div>
            <div className={`mt-1 font-mono text-5xl font-black tabular-nums ${gradeColor(computed.gpa)}`}>
              {formatNum(computed.gpa, 2)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">out of 4.00</div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
              <span className="text-sm text-muted-foreground">Courses counted</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {computed.validCount}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
              <span className="text-sm text-muted-foreground">Total credits</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {formatNum(computed.totalCredits, 1)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
              <span className="text-sm text-muted-foreground">Total grade points</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {formatNum(computed.totalPoints, 2)}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Award className="h-3.5 w-3.5 text-primary" /> Grade scale (4.0)
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
              {GRADE_OPTIONS.map((g) => (
                <div
                  key={g.letter}
                  className="rounded border bg-background px-1.5 py-1 text-center"
                >
                  <span className="font-mono font-semibold">{g.letter}</span>
                  <span className="ml-1 text-muted-foreground">{formatNum(g.points, 1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Compute your Grade Point Average on the standard 4.0 scale. Add courses with their credit hours and letter grade (A through F, with pluses and minuses), and the GPA, total credits and grade points update live. Remove or add rows at any time — invalid rows are silently skipped so partial entries don’t skew the result.",
    tool: toolBody,
    howTo: [
      {
        title: "Add a course",
        description:
          "Click “Add course” to append a new row. Type the course name (optional), enter the credit hours and pick a letter grade from the dropdown.",
      },
      {
        title: "Pick the letter grade",
        description:
          "Each letter grade maps to a fixed point value: A = 4.0, A- = 3.7, B+ = 3.3, B = 3.0 and so on down to F = 0.0. The points for each row are shown beneath it.",
      },
      {
        title: "Read the GPA",
        description:
          "The big number is your weighted GPA: Σ(credits × grade points) ÷ Σ(credits). Total credits and total grade points are listed below.",
      },
      {
        title: "Remove or reset",
        description:
          "Use the trash icon to remove a course, or Reset to restore the sample data. Invalid credit values are silently skipped in the calculation.",
      },
    ],
    useCases: [
      "Predict your semester GPA before transcripts are released.",
      "Work out what grade you need in your final class to hit a target GPA.",
      "Convert a foreign transcript to the 4.0 scale for a US graduate application.",
      "Track GPA recovery across semesters after a difficult term.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          This calculator uses the common US 4.0 scale with +/- modifiers. Some institutions use
          different scales (4.3, 5.0, weighted AP/IB) — check your registrar’s official scale
          before relying on the result.
        </li>
        <li>
          Plus/minus mappings follow a typical convention (A = 4.0, A- = 3.7, B+ = 3.3, …). A few
          schools omit A+ or cap it at 4.0; we treat A as 4.0 with no A+ option.
        </li>
        <li>
          The GPA is unweighted — honours, AP, IB or college-credit weighting is not applied.
        </li>
        <li>
          Courses with non-numeric or non-positive credits are silently skipped, as are rows with
          no grade selected.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What grade scale does this use?",
        a: "The standard US 4.0 scale: A = 4.0, A- = 3.7, B+ = 3.3, B = 3.0, B- = 2.7, C+ = 2.3, C = 2.0, C- = 1.7, D+ = 1.3, D = 1.0, F = 0.0. If your school uses a different scale, adjust the result accordingly.",
      },
      {
        q: "How is the GPA calculated?",
        a: "Weighted average: multiply each course’s grade points by its credit hours, sum these, then divide by the total credit hours. A 4-credit A and a 3-credit B yields (4×4.0 + 3×3.0) ÷ 7 = 3.57.",
      },
      {
        q: "Does this support weighted GPA (AP / honours)?",
        a: "No. The tool computes an unweighted GPA on the 4.0 scale. For weighted GPA, add the bonus (typically +1 for AP/IB, +0.5 for honours) to each course’s grade points and recompute by hand.",
      },
      {
        q: "What if I have an Incomplete or Pass/Fail course?",
        a: "Pass/Fail and Incomplete courses usually carry no grade points and don’t count toward GPA — simply leave them out of the list, or set their credits to 0 so they’re skipped.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
