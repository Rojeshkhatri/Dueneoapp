"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarClock,
  Clock4,
  Globe2,
  Moon,
  RotateCcw,
  Sun,
  Sunset,
  Utensils,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  COMMON_TIMEZONES,
  toDateTimeInputValue,
} from "@/components/tools/utility/_calc-date-helpers";

interface PeakWindow {
  id: string;
  label: string;
  startHour: number; // 0-23 (inclusive)
  endHour: number; // exclusive (so 7-9 = 7..9)
  icon: React.ReactNode;
  color: string;
}

const PEAK_WINDOWS: PeakWindow[] = [
  {
    id: "morning",
    label: "Morning commute",
    startHour: 7,
    endHour: 9,
    icon: <Sun className="h-3.5 w-3.5" />,
    color: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  },
  {
    id: "lunch",
    label: "Lunch break",
    startHour: 12,
    endHour: 13,
    icon: <Utensils className="h-3.5 w-3.5" />,
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  {
    id: "evening",
    label: "Evening wind-down",
    startHour: 17,
    endHour: 19,
    icon: <Sunset className="h-3.5 w-3.5" />,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
  },
  {
    id: "night",
    label: "Late-night scroll",
    startHour: 20,
    endHour: 22,
    icon: <Moon className="h-3.5 w-3.5" />,
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",
  },
];

const TARGET_GROUPS = [...new Set(COMMON_TIMEZONES.map((t) => t.group))];

function zoneLabel(zone: string): string {
  return COMMON_TIMEZONES.find((t) => t.value === zone)?.label ?? zone;
}

/** Returns the offset (in ms) of `zone` from UTC at the given UTC timestamp. */
function getZoneOffsetMs(zone: string, utcTimestamp: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date(utcTimestamp));
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const asUTC = Date.UTC(
    parseInt(map.year, 10),
    parseInt(map.month, 10) - 1,
    parseInt(map.day, 10),
    hour,
    parseInt(map.minute, 10),
    parseInt(map.second, 10)
  );
  return asUTC - utcTimestamp;
}

/** Given wall-clock components interpreted as local time in `zone`, return the UTC Date. */
function wallClockToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  zone: string
): Date {
  const candidateUTC = Date.UTC(y, mo - 1, d, h, mi, 0);
  const offset = getZoneOffsetMs(zone, candidateUTC);
  return new Date(candidateUTC - offset);
}

function formatInZone(date: Date, zone: string, locale: string, withDate = true): string {
  try {
    const opts: Intl.DateTimeFormatOptions = withDate
      ? {
          timeZone: zone,
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      : {
          timeZone: zone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        };
    return new Intl.DateTimeFormat(locale, opts).format(date);
  } catch {
    return date.toUTCString();
  }
}

function hourInZone(date: Date, zone: string): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour: "2-digit",
      hour12: false,
    });
    const parts = dtf.formatToParts(date);
    const hourPart = parts.find((p) => p.type === "hour");
    let h = parseInt(hourPart?.value ?? "0", 10);
    if (h === 24) h = 0;
    return h;
  } catch {
    return date.getUTCHours();
  }
}

function offsetLabel(zone: string, date: Date): string {
  const offset = getZoneOffsetMs(zone, date.getTime());
  const totalMin = Math.round(offset / 60000);
  const sign = totalMin >= 0 ? "+" : "−";
  const abs = Math.abs(totalMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Returns the matching peak window for an hour, or null. */
function peakForHour(hour: number): PeakWindow | null {
  for (const w of PEAK_WINDOWS) {
    if (hour >= w.startHour && hour < w.endHour) return w;
  }
  return null;
}

export function PostSchedulingCalculator({ tool }: { tool: ToolDefinition }) {
  const initialZone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC";
  const [sourceZone, setSourceZone] = React.useState<string>(initialZone);
  const [targetZone, setTargetZone] = React.useState<string>("America/New_York");
  const [dateTime, setDateTime] = React.useState<string>(
    toDateTimeInputValue(new Date())
  );

  const locale =
    typeof navigator !== "undefined" ? navigator.language : "en-US";

  // Parse the datetime-local input as wall-clock components in the source zone.
  const parsed = React.useMemo(() => {
    if (!dateTime) return null;
    const m = dateTime.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return null;
    return {
      y: parseInt(m[1], 10),
      mo: parseInt(m[2], 10),
      d: parseInt(m[3], 10),
      h: parseInt(m[4], 10),
      mi: parseInt(m[5], 10),
      s: m[6] ? parseInt(m[6], 10) : 0,
    };
  }, [dateTime]);

  const utcDate = React.useMemo<Date | null>(() => {
    if (!parsed) return null;
    const d = wallClockToUtc(parsed.y, parsed.mo, parsed.d, parsed.h, parsed.mi, sourceZone);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [parsed, sourceZone]);

  const targetHour = utcDate ? hourInZone(utcDate, targetZone) : -1;
  const activePeak = targetHour >= 0 ? peakForHour(targetHour) : null;

  const sourceOffset = utcDate ? offsetLabel(sourceZone, utcDate) : "";
  const targetOffset = utcDate ? offsetLabel(targetZone, utcDate) : "";

  const dayDiffers =
    utcDate &&
    new Intl.DateTimeFormat("en-US", {
      timeZone: sourceZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(utcDate) !==
      new Intl.DateTimeFormat("en-US", {
        timeZone: targetZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(utcDate);

  // Recommended posting times: pick the start of each peak window in target tz,
  // for the next 7 days starting from the chosen date.
  const recommendations = React.useMemo(() => {
    if (!utcDate) return [];
    // Compute the target-zone date at the chosen UTC instant.
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: targetZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(utcDate);
    const map: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== "literal") map[p.type] = p.value;
    }
    const tYear = parseInt(map.year, 10);
    const tMonth = parseInt(map.month, 10);
    const tDay = parseInt(map.day, 10);

    const recs: {
      peak: PeakWindow;
      targetLabel: string;
      sourceLabel: string;
      dayOffset: number;
    }[] = [];

    // Helper: build UTC instant for a (year, month, day, hour) wall-clock in target zone.
    const build = (year: number, month: number, day: number, hour: number): Date => {
      const d = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
      const offset = getZoneOffsetMs(targetZone, d.getTime());
      return new Date(d.getTime() - offset);
    };

    // For each of the next 7 days (starting at chosen target day), find each peak window's midpoint hour.
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const candidate = new Date(Date.UTC(tYear, tMonth - 1, tDay + dayOffset));
      const cy = candidate.getUTCFullYear();
      const cm = candidate.getUTCMonth() + 1;
      const cd = candidate.getUTCDate();
      for (const peak of PEAK_WINDOWS) {
        const midHour = Math.floor((peak.startHour + peak.endHour) / 2);
        const instantUtc = build(cy, cm, cd, midHour);
        recs.push({
          peak,
          targetLabel: formatInZone(instantUtc, targetZone, locale),
          sourceLabel: formatInZone(instantUtc, sourceZone, locale),
          dayOffset,
        });
      }
    }
    return recs;
  }, [utcDate, targetZone, sourceZone, locale]);

  const reset = () => {
    setSourceZone(initialZone);
    setTargetZone("America/New_York");
    setDateTime(toDateTimeInputValue(new Date()));
    toast.info("Reset.");
  };

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">When are you posting?</h3>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ps-source" className="flex items-center gap-1.5">
              <Globe2 className="h-4 w-4 text-primary" /> Your time zone
            </Label>
            <select
              id="ps-source"
              value={sourceZone}
              onChange={(e) => setSourceZone(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {TARGET_GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {COMMON_TIMEZONES.filter((t) => t.group === g).map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ps-target" className="flex items-center gap-1.5">
              <Globe2 className="h-4 w-4 text-primary" /> Audience time zone
            </Label>
            <select
              id="ps-target"
              value={targetZone}
              onChange={(e) => setTargetZone(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {TARGET_GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {COMMON_TIMEZONES.filter((t) => t.group === g).map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ps-dt" className="flex items-center gap-1.5">
              <Clock4 className="h-4 w-4 text-primary" /> Posting time (in your zone)
            </Label>
            <Input
              id="ps-dt"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The time above is interpreted in your time zone ({zoneLabel(sourceZone)}).
            </p>
          </div>
        </div>

        {/* Conversion result */}
        <div className="space-y-4 rounded-xl border bg-muted/30 p-4 sm:p-5">
          <h3 className="text-sm font-semibold">Conversion result</h3>
          {!utcDate ? (
            <p className="text-sm text-muted-foreground">
              Pick a valid date and time to see the converted posting time.
            </p>
          ) : (
            <>
              <div className="rounded-lg border bg-background p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>You post at ({sourceOffset})</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>Audience sees ({targetOffset})</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] font-medium uppercase text-muted-foreground">
                      {zoneLabel(sourceZone)}
                    </div>
                    <div className="mt-0.5 font-mono text-base font-semibold tabular-nums text-foreground">
                      {formatInZone(utcDate, sourceZone, locale)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium uppercase text-muted-foreground">
                      {zoneLabel(targetZone)}
                    </div>
                    <div className="mt-0.5 font-mono text-base font-semibold tabular-nums text-foreground">
                      {formatInZone(utcDate, targetZone, locale)}
                    </div>
                  </div>
                </div>
                {dayDiffers && (
                  <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    Note: the calendar day differs between zones — your post lands on a different date for your audience.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Peak hours in {zoneLabel(targetZone)}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {PEAK_WINDOWS.map((w) => {
                    const active = activePeak?.id === w.id;
                    return (
                      <span
                        key={w.id}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                          active
                            ? w.color + " border-transparent"
                            : "bg-background text-muted-foreground"
                        }`}
                        title={`${w.startHour}:00 – ${w.endHour}:00 in ${zoneLabel(targetZone)}`}
                      >
                        {w.icon}
                        {w.label}
                        <span className="font-mono">
                          {String(w.startHour).padStart(2, "0")}:00–{String(w.endHour).padStart(2, "0")}:00
                        </span>
                        {active && <span className="ml-0.5">●</span>}
                      </span>
                    );
                  })}
                </div>
                <div className="rounded-md bg-background p-3 text-sm">
                  {activePeak ? (
                    <p>
                      <strong className="text-foreground">Good timing.</strong> Your post lands
                      in the <span className="font-medium">{activePeak.label}</span> window
                      (target hour {String(targetHour).padStart(2, "0")}:00).
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Your post lands at {String(targetHour).padStart(2, "0")}:00 in the
                      target zone — outside the typical peak windows. Consider one of the
                      recommendations below.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {utcDate && (
        <div className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">
                Recommended posting times · next 7 days
              </h3>
            </div>
            <Badge variant="secondary">
              {recommendations.length} slots · peak hours in {zoneLabel(targetZone)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Each row shows the midpoint of a peak window in the audience’s time zone, plus the
            corresponding posting time in your zone.
          </p>
          <div className="max-h-96 overflow-y-auto pr-1">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Day</th>
                  <th className="py-2 pr-3 font-medium">Peak</th>
                  <th className="py-2 pr-3 font-medium">Audience time</th>
                  <th className="py-2 font-medium">Your time</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <Badge variant="outline">
                        {r.dayOffset === 0 ? "Today" : r.dayOffset === 1 ? "Tomorrow" : `+${r.dayOffset}d`}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${r.peak.color}`}
                      >
                        {r.peak.icon}
                        {r.peak.label}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono tabular-nums">{r.targetLabel}</td>
                    <td className="py-2 font-mono tabular-nums text-muted-foreground">{r.sourceLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Pick your time zone, your audience’s time zone, and the wall-clock time you plan to post. The tool instantly shows what time it will be in the audience’s zone, whether the post lands in one of the four common peak windows (morning, lunch, evening, late-night), and a 7-day table of recommended posting slots — each peak window converted back into your local time so you can schedule without doing the maths.",
    tool: toolBody,
    howTo: [
      {
        title: "Pick your time zone",
        description:
          "Select the zone you’re posting from. The tool defaults to your browser’s local zone.",
      },
      {
        title: "Pick your audience’s time zone",
        description:
          "Choose the zone your target audience lives in. Use the most important zone if your audience spans several.",
      },
      {
        title: "Enter your planned posting time",
        description:
          "Type the wall-clock time in your zone. The tool immediately shows the equivalent time in the audience’s zone.",
      },
      {
        title: "Read the recommendation table",
        description:
          "Use the 7-day table to find a peak window that’s convenient for you to post. Each row shows the midpoint of the peak window converted into your local time.",
      },
    ],
    useCases: [
      "Schedule an Instagram post for the US East Coast morning commute while you’re in Europe.",
      "Pick a single posting time that hits the lunch break in your largest audience time zone.",
      "Avoid posting at 3am in your audience’s zone by checking the conversion first.",
      "Plan a week of content ahead of time using the 7-day recommendation table.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Peak windows are generic guidelines (morning 7–9, lunch 12–13, evening 17–19, night 20–22). Real peak times vary by platform, niche and audience demographics — always cross-check with your own analytics.</li>
        <li>DST transitions are handled by your browser’s Intl engine, but a posting time near a DST boundary can shift by an hour in either direction. Double-check the times around DST changes.</li>
        <li>The tool shows one audience time zone at a time. For a global audience, run the calculation for each major zone and pick a compromise slot.</li>
        <li>The recommendation table assumes you want to post at the midpoint of each peak window. If your analytics prefer the start or end of a window, adjust by up to an hour.</li>
      </ul>
    ),
    faq: [
      {
        q: "How are peak hours defined?",
        a: "We use four generic windows in the audience’s local time: morning commute 7–9am, lunch break 12–1pm, evening wind-down 5–7pm, and late-night scroll 8–10pm. These are common engagement peaks across most social platforms, but your own analytics are the real source of truth.",
      },
      {
        q: "Does the tool handle daylight saving time?",
        a: "Yes — all conversions use Intl.DateTimeFormat with the timeZone option, which delegates to your browser’s tzdata. As long as your operating system is up to date, DST is handled automatically. Be extra careful around DST changeover days, when an hour can shift.",
      },
      {
        q: "Can I check multiple audience time zones at once?",
        a: "Not in this version. The tool focuses on a single source and a single target zone so the recommendation table stays readable. For a multi-zone audience, run the calculator once per major zone and pick a slot that works for the largest overlap.",
      },
      {
        q: "Why is the calendar day different between zones?",
        a: "When you post late at night in your zone, it can already be the next day (or still the previous day) in the target zone. The tool flags this with an amber note so you don’t accidentally schedule a “Tuesday” post that lands on Wednesday for your audience.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
