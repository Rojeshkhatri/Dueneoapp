"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, CalendarCheck, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { parseNumber, formatNumber, EDU_DISCLAIMER } from "./_edu-helpers";

type Status = "safe" | "warning" | "critical";

export function AttendanceCalculator({ tool }: { tool: ToolDefinition }) {
  const [totalHeld, setTotalHeld] = React.useState<string>("60");
  const [attended, setAttended] = React.useState<string>("52");
  const [required, setRequired] = React.useState<string>("75");

  const heldNum = Math.max(0, Math.floor(parseNumber(totalHeld)));
  const attendedNum = Math.max(0, Math.floor(parseNumber(attended)));
  const requiredNum = Math.max(0, Math.min(100, parseNumber(required)));
  const missedNum = Math.max(0, heldNum - attendedNum);

  const currentPct = heldNum > 0 ? (attendedNum / heldNum) * 100 : 0;
  const safePct = requiredNum;

  // How many more classes can I miss while staying >= required?
  // Let x = additional classes missed; (attended) / (held + x) >= required/100
  // 100 * attended >= required * (held + x)
  // x <= (100 * attended / required) - held
  const canMiss = requiredNum > 0 ? Math.floor((100 * attendedNum) / requiredNum - heldNum) : Infinity;

  // How many more classes must I attend in a row (no misses) to reach required?
  // Let y = consecutive attends from now; (attended + y) / (held + y) >= required/100
  // 100 * (attended + y) >= required * (held + y)
  // 100 * attended + 100 y >= required * held + required y
  // y (100 - required) >= required * held - 100 * attended
  // y >= (required * held - 100 * attended) / (100 - required)
  const mustAttend = requiredNum < 100
    ? Math.max(0, Math.ceil((requiredNum * heldNum - 100 * attendedNum) / (100 - requiredNum)))
    : currentPct >= 100 ? 0 : Infinity;

  const status: Status =
    currentPct >= safePct + 5
      ? "safe"
      : currentPct >= safePct
        ? "warning"
        : "critical";

  const statusMeta: Record<Status, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    safe: { label: "Safe", color: "text-emerald-700 dark:text-emerald-400", bg: "border-emerald-300/60 bg-emerald-50 dark:bg-emerald-950/20", icon: CheckCircle2 },
    warning: { label: "Warning", color: "text-amber-700 dark:text-amber-400", bg: "border-amber-300/60 bg-amber-50 dark:bg-amber-950/20", icon: AlertTriangle },
    critical: { label: "Critical", color: "text-rose-700 dark:text-rose-400", bg: "border-rose-300/60 bg-rose-50 dark:bg-rose-950/20", icon: ShieldAlert },
  };
  const meta = statusMeta[status];
  const StatusIcon = meta.icon;

  const summary = `Attendance summary
Classes held: ${heldNum}
Classes attended: ${attendedNum}
Classes missed: ${missedNum}
Current attendance: ${currentPct.toFixed(2)}%
Minimum required: ${requiredNum.toFixed(2)}%
Status: ${meta.label}
${status === "critical" ? `Classes to attend in a row to recover: ${mustAttend === Infinity ? "—" : mustAttend}` : `Classes you can still miss: ${canMiss === Infinity ? "unlimited" : canMiss}`}`;

  const reset = () => {
    setTotalHeld("60");
    setAttended("52");
    setRequired("75");
    toast.info("Reset.");
  };

  const content: ToolContent = {
    intro:
      "Track your class attendance against the minimum required percentage. See your current attendance, exactly how many more classes you can safely miss, or how many you must attend in a row to recover if you're below the threshold. A traffic-light status — safe / warning / critical — tells you at a glance where you stand.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Attendance figures</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="at-held">Classes held</Label>
                <Input id="at-held" inputMode="numeric" value={totalHeld} onChange={(e) => setTotalHeld(e.target.value)} placeholder="60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="at-attended">Classes attended</Label>
                <Input id="at-attended" inputMode="numeric" value={attended} onChange={(e) => setAttended(e.target.value)} placeholder="52" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="at-required">Required (%)</Label>
                <Input id="at-required" inputMode="decimal" value={required} onChange={(e) => setRequired(e.target.value)} placeholder="75" />
              </div>
              <div className="sm:col-span-3">
                <Button size="sm" variant="ghost" onClick={reset}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className={meta.bg}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CalendarCheck className="h-4 w-4" /> Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current attendance</span>
                <span className={`font-mono text-3xl font-bold tabular-nums ${meta.color}`}>
                  {currentPct.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Required minimum</span>
                <span className="font-mono text-sm tabular-nums">{requiredNum.toFixed(2)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-5 w-5 ${meta.color}`} />
                <Badge variant="outline" className={`font-semibold ${meta.color}`}>{meta.label}</Badge>
                <span className="text-xs text-muted-foreground">
                  {status === "safe" && `+${(currentPct - safePct).toFixed(2)}% above the minimum`}
                  {status === "warning" && `Right on the threshold`}
                  {status === "critical" && `${(safePct - currentPct).toFixed(2)}% below the minimum`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${
                    status === "safe" ? "bg-emerald-500" : status === "warning" ? "bg-amber-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.min(100, currentPct)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span className={`font-semibold ${meta.color}`}>Now: {currentPct.toFixed(1)}%</span>
                <span>Required: {requiredNum.toFixed(0)}%</span>
                <span>100%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">What it means for you</CardTitle>
              <CopyButton value={summary} size="sm" />
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {status === "critical" ? (
              <div className="rounded-lg border border-rose-300/60 bg-rose-50 p-4 dark:bg-rose-950/20">
                <div className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-400">
                  <ShieldAlert className="h-4 w-4" /> Below minimum — recover now
                </div>
                <p className="mt-2 text-sm">
                  You need to attend{" "}
                  <span className="font-mono text-lg font-bold">
                    {mustAttend === Infinity ? "—" : mustAttend}
                  </span>{" "}
                  more class{mustAttend === 1 ? "" : "es"} in a row without missing any to reach {requiredNum.toFixed(0)}%.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-300/60 bg-emerald-50 p-4 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Above minimum — you have room
                </div>
                <p className="mt-2 text-sm">
                  You can still miss{" "}
                  <span className="font-mono text-lg font-bold">
                    {canMiss === Infinity ? "∞" : canMiss}
                  </span>{" "}
                  more class{canMiss === 1 ? "" : "es"} (attending all others) and stay at or above {requiredNum.toFixed(0)}%.
                </p>
              </div>
            )}

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Classes held" value={String(heldNum)} />
                <Metric label="Classes attended" value={String(attendedNum)} />
                <Metric label="Classes missed" value={String(missedNum)} />
                <Metric label="Current %" value={`${currentPct.toFixed(2)}%`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
    howTo: [
      {
        title: "Enter classes held and attended",
        description: "Type the total number of classes held so far and how many you attended. Both are whole numbers.",
      },
      {
        title: "Set the required minimum",
        description: "Enter the minimum attendance percentage your institution requires (often 75% or 80%).",
      },
      {
        title: "Read the traffic-light status",
        description: "Green (safe) = at least 5% above the minimum. Amber (warning) = within 5% of the threshold. Red (critical) = below the minimum.",
      },
      {
        title: "See what to do next",
        description: "If you're below: see how many classes you must attend in a row. If you're above: see how many more you can miss.",
      },
    ],
    useCases: [
      "Check whether you can skip tomorrow's lecture without dropping below 75%.",
      "Plan recovery after missing a week of classes due to illness.",
      "Track attendance across a semester to stay above the debar threshold.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{EDU_DISCLAIMER}</li>
        <li>The model treats all future classes as either attended or missed. It doesn't account for medical leave, condonation or makeup classes — check your institution's specific policy.</li>
        <li>'Classes you can still miss' assumes you attend every other class from now on. If you miss more, the number drops further.</li>
      </ul>
    ),
    faq: [
      {
        q: "What's the difference between 'safe', 'warning' and 'critical'?",
        a: "Safe = at least 5% above your required minimum. Warning = within 5% of it (one or two absences could push you under). Critical = below the minimum — you need to act now.",
      },
      {
        q: "Why does 'classes you can miss' sometimes show ∞?",
        a: "If your required minimum is 0% (some seminars don't have one), the calculator treats the limit as unlimited. Otherwise the formula solves (attended) ÷ (held + missed) ≥ required % for the maximum additional misses.",
      },
      {
        q: "How is 'classes to attend in a row' calculated?",
        a: "It solves (attended + y) ÷ (held + y) ≥ required % for the smallest integer y. That's the minimum run of consecutive attendances you need (with zero further misses) to climb back over the threshold.",
      },
      {
        q: "Does this account for excused absences?",
        a: "No — it treats every missed class the same. If your institution excuses medical or sports absences, subtract those from the 'missed' count manually before calculating.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
