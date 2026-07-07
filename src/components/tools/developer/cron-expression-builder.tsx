"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, Wand2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

type FieldKey = "minute" | "hour" | "dom" | "month" | "dow";

interface Preset {
  label: string;
  value: string;
}

const FIELD_PRESETS: Record<FieldKey, Preset[]> = {
  minute: [
    { label: "Every minute", value: "*" },
    { label: "Every 5 minutes", value: "*/5" },
    { label: "Every 10 minutes", value: "*/10" },
    { label: "Every 15 minutes", value: "*/15" },
    { label: "Every 30 minutes", value: "*/30" },
    { label: "At minute 0", value: "0" },
    { label: "At minute 30", value: "30" },
    { label: "Twice an hour (0,30)", value: "0,30" },
  ],
  hour: [
    { label: "Every hour", value: "*" },
    { label: "Every 2 hours", value: "*/2" },
    { label: "Every 6 hours", value: "*/6" },
    { label: "Every 12 hours", value: "*/12" },
    { label: "At midnight (0)", value: "0" },
    { label: "At noon (12)", value: "12" },
    { label: "9 to 17 (hourly)", value: "9-17" },
    { label: "Off-hours (18-23,0-7)", value: "18-23,0-7" },
  ],
  dom: [
    { label: "Every day", value: "*" },
    { label: "1st of month", value: "1" },
    { label: "15th of month", value: "15" },
    { label: "1st and 15th", value: "1,15" },
    { label: "Last 7 days (25-31)", value: "25-31" },
  ],
  month: [
    { label: "Every month", value: "*" },
    { label: "January", value: "1" },
    { label: "July", value: "7" },
    { label: "Jan-Jun", value: "1-6" },
    { label: "Jul-Dec", value: "7-12" },
    { label: "Quarterly (1,4,7,10)", value: "1,4,7,10" },
  ],
  dow: [
    { label: "Every day", value: "*" },
    { label: "Sunday (0)", value: "0" },
    { label: "Monday (1)", value: "1" },
    { label: "Friday (5)", value: "5" },
    { label: "Weekdays Mon-Fri (1-5)", value: "1-5" },
    { label: "Weekends (0,6)", value: "0,6" },
    { label: "Sat & Wed (3,6)", value: "3,6" },
  ],
};

const FIELD_RANGE: Record<FieldKey, [number, number]> = {
  minute: [0, 59],
  hour: [0, 23],
  dom: [1, 31],
  month: [1, 12],
  dow: [0, 6],
};

const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Parse a single cron field into a Set of allowed integers. */
function parseField(field: string, key: FieldKey): Set<number> {
  const out = new Set<number>();
  const [min, max] = FIELD_RANGE[key];
  const parts = field.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === "*") {
      for (let i = min; i <= max; i++) out.add(i);
      continue;
    }
    const stepMatch = trimmed.match(/^\*\/(\d+)$/);
    if (stepMatch) {
      const step = Number(stepMatch[1]);
      for (let i = min; i <= max; i += step) out.add(i);
      continue;
    }
    const rangeMatch = trimmed.match(/^(\d+)-(\d+)(?:\/(\d+))?$/);
    if (rangeMatch) {
      let lo = Number(rangeMatch[1]);
      let hi = Number(rangeMatch[2]);
      if (key === "dow" && hi === 7) hi = 0; // 7 also means Sunday
      const step = rangeMatch[3] ? Number(rangeMatch[3]) : 1;
      for (let i = lo; i <= hi; i += step) out.add(i);
      continue;
    }
    const valueMatch = trimmed.match(/^(\d+)$/);
    if (valueMatch) {
      const v = Number(valueMatch[1]);
      if (key === "dow" && v === 7) out.add(0);
      else out.add(v);
      continue;
    }
    throw new Error(`Unrecognised cron fragment: "${trimmed}" in field ${key}`);
  }
  return out;
}

interface CronParts {
  minute: Set<number>;
  hour: Set<number>;
  dom: Set<number>;
  month: Set<number>;
  dow: Set<number>;
}

function parseCron(expr: string): CronParts {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(
      `Cron expressions must have exactly 5 fields (minute hour day-of-month month day-of-week). Got ${parts.length}.`
    );
  }
  const [minute, hour, dom, month, dow] = parts;
  return {
    minute: parseField(minute, "minute"),
    hour: parseField(hour, "hour"),
    dom: parseField(dom, "dom"),
    month: parseField(month, "month"),
    dow: parseField(dow, "dow"),
  };
}

/** Compute the next N run times starting from `from`. */
function nextRuns(expr: string, from: Date, count: number): Date[] {
  const parts = parseCron(expr);
  const out: Date[] = [];
  const cursor = new Date(from.getTime());
  // Truncate to the next whole minute.
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  // Safety cap: scan at most 366 * 24 * 60 minutes (~1 year).
  const cap = 366 * 24 * 60;
  let scanned = 0;
  while (out.length < count && scanned < cap) {
    if (
      parts.minute.has(cursor.getMinutes()) &&
      parts.hour.has(cursor.getHours()) &&
      parts.month.has(cursor.getMonth() + 1) &&
      parts.dow.has(cursor.getDay()) &&
      // day-of-month and day-of-week follow standard cron semantics:
      // if both are restricted (not "*"), an OR match applies.
      matchDay(cursor, parts, expr)
    ) {
      out.push(new Date(cursor.getTime()));
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
    scanned++;
  }
  return out;
}

function matchDay(date: Date, parts: CronParts, expr: string): boolean {
  const fields = expr.trim().split(/\s+/);
  const domRestricted = fields[2] !== "*";
  const dowRestricted = fields[4] !== "*";
  const domMatch = parts.dom.has(date.getDate());
  const dowMatch = parts.dow.has(date.getDay());
  if (domRestricted && dowRestricted) return domMatch || dowMatch;
  if (domRestricted) return domMatch;
  if (dowRestricted) return dowMatch;
  return true;
}

function describe(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return "Invalid cron expression.";
  const [minute, hour, dom, month, dow] = parts;

  const timePart = describeTime(minute, hour);
  const dayPart = describeDay(dom, dow);
  const monthPart = describeMonth(month);

  return [timePart, dayPart, monthPart].filter(Boolean).join(", ");
}

function describeTime(minute: string, hour: string): string {
  if (minute === "*" && hour === "*") return "every minute";
  if (minute === "0" && hour === "*") return "at the top of every hour";
  if (minute === "0" && hour === "0") return "at midnight";
  if (minute === "0" && hour === "12") return "at noon";
  if (minute.startsWith("*/")) return `every ${minute.slice(2)} minutes past the hour`;
  if (hour.startsWith("*/")) return `at minute ${minute === "*" ? "0" : minute}, every ${hour.slice(2)} hours`;
  if (hour.includes("-")) {
    return `at minute ${minute === "*" ? "0" : minute}, every hour from ${hour.replace("-", " to ")}`;
  }
  if (minute === "*" && hour !== "*") return `every minute during hour ${hour}`;
  return `at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function describeDay(dom: string, dow: string): string {
  const bits: string[] = [];
  if (dom !== "*") bits.push(`on day-of-month ${dom}`);
  if (dow !== "*") {
    // Translate numeric dow values to names where possible.
    const translated = dow
      .split(",")
      .map((p) => {
        const n = Number(p);
        return Number.isInteger(n) && n >= 0 && n <= 6 ? DOW_NAMES[n] : p;
      })
      .join(", ");
    bits.push(`on ${translated}`);
  }
  return bits.join(" and ");
}

function describeMonth(month: string): string {
  if (month === "*") return "";
  if (month.includes(",")) {
    return `in months ${month}`;
  }
  if (month.includes("-")) {
    return `from month ${month.replace("-", " to ")}`;
  }
  const n = Number(month);
  if (Number.isInteger(n) && n >= 1 && n <= 12) return `in ${MONTH_NAMES[n - 1]}`;
  return `in month ${month}`;
}

const SAMPLE = "*/5 9-17 * * 1-5";

export function CronExpressionBuilder({ tool }: { tool: ToolDefinition }) {
  const [minute, setMinute] = React.useState("*/5");
  const [hour, setHour] = React.useState("9-17");
  const [dom, setDom] = React.useState("*");
  const [month, setMonth] = React.useState("*");
  const [dow, setDow] = React.useState("1-5");
  const [customExpr, setCustomExpr] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [runs, setRuns] = React.useState<Date[]>([]);

  const activeExpr = customExpr.trim() || `${minute} ${hour} ${dom} ${month} ${dow}`;

  const description = React.useMemo(() => {
    try {
      return describe(activeExpr);
    } catch {
      return "Invalid expression.";
    }
  }, [activeExpr]);

  const compute = React.useCallback(() => {
    setError(null);
    try {
      const next = nextRuns(activeExpr, new Date(), 5);
      if (next.length === 0) {
        setError("No runs found in the next year. Check the expression — some combinations (e.g. Feb 30) never match.");
        setRuns([]);
        return;
      }
      setRuns(next);
      toast.success("Computed the next 5 run times.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid cron expression.");
      setRuns([]);
      toast.error("Invalid cron expression.");
    }
  }, [activeExpr]);

  const loadSample = () => {
    setMinute("*/5");
    setHour("9-17");
    setDom("*");
    setMonth("*");
    setDow("1-5");
    setCustomExpr("");
    setError(null);
    setRuns([]);
  };

  const content: ToolContent = {
    intro:
      "Build a cron schedule expression field-by-field and get a plain-English description plus the next 5 run times. Use the dropdowns for common patterns, or paste a custom expression to override them. Everything is computed locally with JavaScript's Date object.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(["minute", "hour", "dom", "month", "dow"] as FieldKey[]).map((key) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`cb-${key}`}>
                {key === "dom" ? "Day of month" : key === "dow" ? "Day of week" : key.charAt(0).toUpperCase() + key.slice(1)}
              </Label>
              <Select
                value={currentValue(key, { minute, hour, dom, month, dow })}
                onValueChange={(v) => applyPreset(key, v, {
                  minute, setMinute,
                  hour, setHour,
                  dom, setDom,
                  month, setMonth,
                  dow, setDow,
                })}
              >
                <SelectTrigger id={`cb-${key}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_PRESETS[key].map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label} <span className="ml-1 font-mono text-xs text-muted-foreground">({p.value})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
          <Label htmlFor="cb-expr">Generated expression</Label>
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 min-w-[200px] rounded-md border bg-background px-3 py-2 font-mono text-sm">
              {activeExpr}
            </code>
            <CopyButton value={activeExpr} size="sm" label="Copy" />
            <Button variant="ghost" size="sm" onClick={loadSample}>
              Sample
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">In plain English:</span> {description}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cb-custom">Custom expression (overrides the dropdowns)</Label>
          <Input
            id="cb-custom"
            value={customExpr}
            onChange={(e) => setCustomExpr(e.target.value)}
            placeholder="e.g. 0 2 * * 1  —  leave blank to use the dropdowns"
            className="font-mono"
            spellCheck={false}
            aria-label="Custom cron expression"
          />
          <p className="text-xs text-muted-foreground">
            Five space-separated fields: minute, hour, day-of-month, month, day-of-week.
            Supports <code>*</code>, <code>*/N</code>, <code>N</code>, <code>N-M</code> and <code>N,M,K</code>.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={compute}>
            <Wand2 className="mr-1.5 h-4 w-4" /> Show next 5 runs
          </Button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {runs.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4" /> Next 5 runs (local time)
            </h3>
            <ul className="divide-y rounded-lg border">
              {runs.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                >
                  <span className="font-mono">{formatRun(r)}</span>
                  <span className="text-xs text-muted-foreground">
                    {DOW_NAMES[r.getDay()]}, {MONTH_NAMES[r.getMonth()]} {r.getDate()}, {r.getFullYear()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Set each field",
        description:
          "Use the five dropdowns (minute, hour, day-of-month, month, day-of-week) to pick a common pattern. The generated expression updates instantly.",
      },
      {
        title: "Optionally enter a custom expression",
        description:
          "If the dropdowns do not cover your case, type a custom expression in the text field. It takes priority over the dropdowns when present.",
      },
      {
        title: "Read the plain-English description",
        description:
          "Below the expression you will see a friendly summary like “at minute 0, every hour from 9 to 17, on Monday-Friday”.",
      },
      {
        title: "Preview the next 5 runs",
        description:
          "Click Show next 5 runs to compute the upcoming fire times in your local timezone. The scan covers up to one year.",
      },
    ],
    useCases: [
      "Schedule a cron job on a Linux server or Kubernetes CronJob.",
      "Document a recurring job in a README or runbook.",
      "Verify a cron expression produces the times you expect before deploying.",
      "Translate an English schedule like “every weekday at 9am” into a cron expression.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Five-field standard cron only — seconds, years, and special macros like <code>@daily</code> are not supported.</li>
        <li>Special characters <code>L</code>, <code>W</code> and <code>#</code> are not supported.</li>
        <li>Next-run scanning checks one minute at a time and caps at one year, so impossible combinations (e.g. Feb 30) return no runs.</li>
        <li>Times are shown in your browser's local timezone, not UTC.</li>
      </ul>
    ),
    faq: [
      {
        q: "What do the five fields mean?",
        a: "In order: minute (0-59), hour (0-23), day of month (1-31), month (1-12), day of week (0-6 where 0 is Sunday). An asterisk means every possible value.",
      },
      {
        q: "What does */5 mean?",
        a: "It means every 5 units of the field. So */5 in the minute field means every 5 minutes (0, 5, 10, ...). */15 means every 15.",
      },
      {
        q: "What if both day-of-month and day-of-week are set?",
        a: "Standard cron uses an OR match: the job runs on days that satisfy either restriction. The tool follows the same rule when computing next runs.",
      },
      {
        q: "Is my cron expression uploaded anywhere?",
        a: "No. Parsing and next-run calculation happen entirely in your browser. Nothing is transmitted.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

interface FieldState {
  minute: string;
  hour: string;
  dom: string;
  month: string;
  dow: string;
}

interface FieldSetters extends FieldState {
  setMinute: (v: string) => void;
  setHour: (v: string) => void;
  setDom: (v: string) => void;
  setMonth: (v: string) => void;
  setDow: (v: string) => void;
}

function currentValue(key: FieldKey, state: FieldState): string {
  return state[key];
}

function applyPreset(key: FieldKey, value: string, setters: FieldSetters): void {
  const map: Record<FieldKey, (v: string) => void> = {
    minute: setters.setMinute,
    hour: setters.setHour,
    dom: setters.setDom,
    month: setters.setMonth,
    dow: setters.setDow,
  };
  map[key](value);
}

function formatRun(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
