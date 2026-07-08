"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import { Globe2, RotateCcw, Clock4, ArrowRight } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { COMMON_TIMEZONES, toDateTimeInputValue } from "./_calc-date-helpers";

const TARGET_GROUPS = [...new Set(COMMON_TIMEZONES.map((t) => t.group))];

const DEFAULT_TARGETS = [
  "UTC",
  "Europe/London",
  "America/New_York",
  "Asia/Tokyo",
  "Australia/Sydney",
];

/**
 * Returns the offset (in ms) of `zone` from UTC at the given UTC timestamp.
 * Uses Intl.DateTimeFormat to read the zone's wall-clock for that instant.
 */
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
  if (hour === 24) hour = 0; // some environments emit "24" at midnight
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

/**
 * Given wall-clock components interpreted as local time in `sourceZone`,
 * return the corresponding UTC Date.
 */
function wallClockToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  sourceZone: string
): Date {
  // Treat the wall-clock components as UTC first to get a candidate timestamp.
  const candidateUTC = Date.UTC(y, mo - 1, d, h, mi, 0);
  // Source zone's offset at that candidate instant.
  const offset = getZoneOffsetMs(sourceZone, candidateUTC);
  // Real UTC = candidate − offset (because the candidate treated wall-clock as UTC,
  // so we need to shift by the source zone's offset to get the real UTC instant).
  return new Date(candidateUTC - offset);
}

function formatInZone(date: Date, zone: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: zone,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return date.toUTCString();
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

function zoneLabel(zone: string): string {
  return COMMON_TIMEZONES.find((t) => t.value === zone)?.label ?? zone;
}

export function TimeZoneConverter({ tool }: { tool: ToolDefinition }) {
  const now = React.useMemo(() => new Date(), []);
  const [sourceZone, setSourceZone] = React.useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [dateTime, setDateTime] = React.useState<string>(toDateTimeInputValue(now));
  const [targets, setTargets] = React.useState<string[]>(DEFAULT_TARGETS);
  const [nowTick, setNowTick] = React.useState<number>(0);

  // Parse the datetime-local input as wall-clock components.
  const parsed = React.useMemo(() => {
    if (!dateTime) return null;
    // datetime-local gives "yyyy-mm-ddTHH:mm" (or with seconds)
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

  const [useNow, setUseNow] = React.useState<boolean>(false);

  const utcDate = React.useMemo<Date | null>(() => {
    if (!parsed) return null;
    const d = wallClockToUtc(parsed.y, parsed.mo, parsed.d, parsed.h, parsed.mi, sourceZone);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }, [parsed, sourceZone]);

  // If "use now" mode is on, refresh the displayed time every 30s.
  React.useEffect(() => {
    if (!useNow) return;
    const id = window.setInterval(() => setNowTick((t) => t + 1), 30000);
    return () => window.clearInterval(id);
  }, [useNow]);

  // When useNow is true, override the dateTime with current time every tick.
  React.useEffect(() => {
    if (useNow) {
      setDateTime(toDateTimeInputValue(new Date()));
    }
  }, [useNow, nowTick]);

  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";

  const reset = () => {
    setSourceZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    setDateTime(toDateTimeInputValue(new Date()));
    setTargets(DEFAULT_TARGETS);
    setUseNow(false);
  };

  const setTarget = (index: number, zone: string) => {
    setTargets((prev) => {
      const next = [...prev];
      next[index] = zone;
      return next;
    });
  };

  const summary = utcDate
    ? [
        `Source: ${zoneLabel(sourceZone)} (${offsetLabel(sourceZone, utcDate)})`,
        `Time: ${formatInZone(utcDate, sourceZone, locale)}`,
        "",
        ...targets.map(
          (t) => `${zoneLabel(t)} (${offsetLabel(t, utcDate)}): ${formatInZone(utcDate, t, locale)}`
        ),
      ].join("\n")
    : "";

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="tz-source" className="flex items-center gap-1.5">
              <Globe2 className="h-4 w-4 text-primary" /> Source time zone
            </Label>
            <select
              id="tz-source"
              value={sourceZone}
              onChange={(e) => setSourceZone(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
            <p className="text-xs text-muted-foreground">
              The wall-clock time below is interpreted as local time in this zone.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tz-dt" className="flex items-center gap-1.5">
              <Clock4 className="h-4 w-4 text-primary" /> Date & time
            </Label>
            <Input
              id="tz-dt"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => {
                setDateTime(e.target.value);
                setUseNow(false);
              }}
              disabled={useNow}
            />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                variant={useNow ? "default" : "outline"}
                onClick={() => {
                  setUseNow((v) => !v);
                  setDateTime(toDateTimeInputValue(new Date()));
                }}
              >
                {useNow ? "Live (now)" : "Use now"}
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>

          {utcDate && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="text-xs font-medium text-muted-foreground">
                Source ({offsetLabel(sourceZone, utcDate)})
              </div>
              <div className="mt-1 font-mono text-base font-semibold text-foreground">
                {formatInZone(utcDate, sourceZone, locale)}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Converted times</h3>
            {utcDate && <CopyButton value={summary} size="sm" />}
          </div>

          {!utcDate && (
            <p className="text-sm text-muted-foreground">
              Pick a valid date and time to see converted times.
            </p>
          )}

          {utcDate && (
            <div className="space-y-3">
              {targets.map((zone, i) => {
                const sourceOffset = getZoneOffsetMs(sourceZone, utcDate.getTime());
                const targetOffset = getZoneOffsetMs(zone, utcDate.getTime());
                const diffMin = Math.round((targetOffset - sourceOffset) / 60000);
                const diffH = Math.floor(Math.abs(diffMin) / 60);
                const diffM = Math.abs(diffMin) % 60;
                const diffStr =
                  diffMin === 0
                    ? "same time"
                    : `${diffMin > 0 ? "+" : "−"}${diffH}h${diffM > 0 ? ` ${diffM}m` : ""}`;
                // Determine if the calendar day differs between source and target zones
                // at this UTC instant.
                const sourceDayStr = new Intl.DateTimeFormat("en-US", {
                  timeZone: sourceZone,
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(utcDate);
                const targetDayStr = new Intl.DateTimeFormat("en-US", {
                  timeZone: zone,
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(utcDate);
                const dayDiffers = sourceDayStr !== targetDayStr;

                return (
                  <div key={i} className="rounded-lg border bg-background p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <select
                        value={zone}
                        onChange={(e) => setTarget(i, e.target.value)}
                        className="h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        aria-label={`Target time zone ${i + 1}`}
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
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {offsetLabel(zone, utcDate)} · {diffStr}
                        {dayDiffers ? " · ±1 day" : ""}
                      </span>
                    </div>
                    <div className="mt-2 font-mono text-base font-semibold tabular-nums text-foreground">
                      {formatInZone(utcDate, zone, locale)}
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
                <span className="font-mono">{zoneLabel(sourceZone)}</span>
                <ArrowRight className="h-3 w-3" />
                <span>5 target zones</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">How it works:</span> the source
          date/time is interpreted as wall-clock time in the source zone using{" "}
          <code className="rounded bg-background px-1 py-0.5">Intl.DateTimeFormat</code> with the{" "}
          <code className="rounded bg-background px-1 py-0.5">timeZone</code> option. Each target
          zone’s converted time is computed from the resulting UTC instant, so DST transitions
          are handled natively by your browser.
        </p>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Convert a date and time from one IANA time zone to up to five target zones simultaneously. Choose the source zone, type the wall-clock time and instantly see it in UTC, London, New York, Tokyo, Sydney and dozens more. Daylight Saving Time is handled natively by your browser’s Intl engine — no stale timezone database required.",
    tool: toolBody,
    howTo: [
      {
        title: "Pick the source zone",
        description:
          "Select the time zone in which your input wall-clock time should be interpreted. Defaults to your browser’s local zone.",
      },
      {
        title: "Enter the date & time",
        description:
          "Use the datetime-local input, or click “Use now” to live-track the current time in every zone (refreshes every 30 seconds).",
      },
      {
        title: "Read the converted times",
        description:
          "Each target card shows the converted wall-clock time, the UTC offset and the offset difference versus the source zone.",
      },
      {
        title: "Customise target zones",
        description:
          "Each target has its own dropdown — pick any of the 50+ zones grouped by region to build your personal world-clock panel.",
      },
    ],
    useCases: [
      "Schedule a Zoom call across teams in San Francisco, London and Bangalore.",
      "Find a flight arrival time in your destination’s local zone.",
      "Track live “now” across remote teams during a global rollout.",
      "Avoid calling a colleague at 3am by checking their local time first.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The available time zones and DST rules come from your browser’s ICU library. The
          results match your operating system’s tzdata — keep it updated for accuracy.
        </li>
        <li>
          The “Use now” live mode refreshes every 30 seconds, not every second, to limit
          background work. Switch it off for an exact snapshot.
        </li>
        <li>
          Offset labels reflect standard or daylight time depending on the chosen instant. The
          difference shown versus the source zone is the offset gap at that moment, not a
          fixed hour count.
        </li>
        <li>
          We do not support historical or pre-1970 timestamps — the Intl engine’s tzdata is
          authoritative only for the modern era.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "How are DST transitions handled?",
        a: "Entirely by your browser. We use Intl.DateTimeFormat with the timeZone option, which delegates to your operating system’s tzdata. As long as your OS is up to date, the converted times reflect current DST rules.",
      },
      {
        q: "Why is the offset different from what I expected?",
        a: "Offsets change with DST. A zone like Europe/London is UTC+0 in winter and UTC+1 in summer. The offset label shown reflects the offset in force at the chosen instant.",
      },
      {
        q: "Can I convert from UTC to my local time?",
        a: "Yes — select “UTC” as the source zone and your local zone as one of the targets. The datetime input is then interpreted as UTC wall-clock time.",
      },
      {
        q: "Does the live “Use now” mode drain my battery?",
        a: "It refreshes only every 30 seconds, so the impact is negligible. Switch it off when you don’t need live updates.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
