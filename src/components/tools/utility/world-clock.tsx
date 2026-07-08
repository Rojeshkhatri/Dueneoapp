"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/dueneo/copy-button";
import { Globe2, Sun, Moon, Plus, X, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface City {
  city: string;
  country: string;
  zone: string;
}

/** Default cities shown on first load (in display order). */
const DEFAULT_CITIES: City[] = [
  { city: "New York", country: "United States", zone: "America/New_York" },
  { city: "London", country: "United Kingdom", zone: "Europe/London" },
  { city: "Tokyo", country: "Japan", zone: "Asia/Tokyo" },
  { city: "Sydney", country: "Australia", zone: "Australia/Sydney" },
  { city: "Dubai", country: "United Arab Emirates", zone: "Asia/Dubai" },
  { city: "Los Angeles", country: "United States", zone: "America/Los_Angeles" },
  { city: "Paris", country: "France", zone: "Europe/Paris" },
  { city: "Singapore", country: "Singapore", zone: "Asia/Singapore" },
];

/** Wider list users can add from. Includes every default city plus more. */
const ALL_CITIES: City[] = [
  ...DEFAULT_CITIES,
  // North America
  { city: "Toronto", country: "Canada", zone: "America/Toronto" },
  { city: "Vancouver", country: "Canada", zone: "America/Vancouver" },
  { city: "Chicago", country: "United States", zone: "America/Chicago" },
  { city: "Denver", country: "United States", zone: "America/Denver" },
  { city: "Mexico City", country: "Mexico", zone: "America/Mexico_City" },
  { city: "Honolulu", country: "United States", zone: "Pacific/Honolulu" },
  // South America
  { city: "São Paulo", country: "Brazil", zone: "America/Sao_Paulo" },
  { city: "Buenos Aires", country: "Argentina", zone: "America/Argentina/Buenos_Aires" },
  { city: "Lima", country: "Peru", zone: "America/Lima" },
  { city: "Santiago", country: "Chile", zone: "America/Santiago" },
  { city: "Bogotá", country: "Colombia", zone: "America/Bogota" },
  // Europe
  { city: "Dublin", country: "Ireland", zone: "Europe/Dublin" },
  { city: "Berlin", country: "Germany", zone: "Europe/Berlin" },
  { city: "Madrid", country: "Spain", zone: "Europe/Madrid" },
  { city: "Rome", country: "Italy", zone: "Europe/Rome" },
  { city: "Amsterdam", country: "Netherlands", zone: "Europe/Amsterdam" },
  { city: "Stockholm", country: "Sweden", zone: "Europe/Stockholm" },
  { city: "Moscow", country: "Russia", zone: "Europe/Moscow" },
  { city: "Istanbul", country: "Türkiye", zone: "Europe/Istanbul" },
  { city: "Athens", country: "Greece", zone: "Europe/Athens" },
  { city: "Lisbon", country: "Portugal", zone: "Europe/Lisbon" },
  { city: "Zurich", country: "Switzerland", zone: "Europe/Zurich" },
  { city: "Warsaw", country: "Poland", zone: "Europe/Warsaw" },
  // Africa & Middle East
  { city: "Cairo", country: "Egypt", zone: "Africa/Cairo" },
  { city: "Johannesburg", country: "South Africa", zone: "Africa/Johannesburg" },
  { city: "Lagos", country: "Nigeria", zone: "Africa/Lagos" },
  { city: "Nairobi", country: "Kenya", zone: "Africa/Nairobi" },
  { city: "Riyadh", country: "Saudi Arabia", zone: "Asia/Riyadh" },
  { city: "Tehran", country: "Iran", zone: "Asia/Tehran" },
  { city: "Jerusalem", country: "Israel", zone: "Asia/Jerusalem" },
  // Asia
  { city: "New Delhi", country: "India", zone: "Asia/Kolkata" },
  { city: "Mumbai", country: "India", zone: "Asia/Kolkata" },
  { city: "Karachi", country: "Pakistan", zone: "Asia/Karachi" },
  { city: "Dhaka", country: "Bangladesh", zone: "Asia/Dhaka" },
  { city: "Bangkok", country: "Thailand", zone: "Asia/Bangkok" },
  { city: "Jakarta", country: "Indonesia", zone: "Asia/Jakarta" },
  { city: "Hong Kong", country: "China", zone: "Asia/Hong_Kong" },
  { city: "Shanghai", country: "China", zone: "Asia/Shanghai" },
  { city: "Beijing", country: "China", zone: "Asia/Shanghai" },
  { city: "Seoul", country: "South Korea", zone: "Asia/Seoul" },
  { city: "Manila", country: "Philippines", zone: "Asia/Manila" },
  { city: "Kathmandu", country: "Nepal", zone: "Asia/Kathmandu" },
  // Oceania
  { city: "Melbourne", country: "Australia", zone: "Australia/Melbourne" },
  { city: "Perth", country: "Australia", zone: "Australia/Perth" },
  { city: "Auckland", country: "New Zealand", zone: "Pacific/Auckland" },
  { city: "Fiji", country: "Fiji", zone: "Pacific/Fiji" },
];

const STORAGE_KEY = "dueneo-world-clock-v1";

interface PersistState {
  zones: string[]; // selected zones, in display order
  hour12: boolean;
}

/** Returns the offset (in ms) of `zone` from UTC at the given instant. */
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

function formatOffset(zone: string, now: number): string {
  const offset = getZoneOffsetMs(zone, now);
  const totalMin = Math.round(offset / 60000);
  const sign = totalMin >= 0 ? "+" : "−";
  const abs = Math.abs(totalMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getZoneAbbr(zone: string, now: number): string {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "short",
    });
    const parts = dtf.formatToParts(new Date(now));
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    return tzPart?.value ?? zone;
  } catch {
    return zone;
  }
}

function getZoneHour(zone: string, now: number): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour: "2-digit",
      hour12: false,
    });
    const parts = dtf.formatToParts(new Date(now));
    const h = parts.find((p) => p.type === "hour")?.value ?? "0";
    let n = parseInt(h, 10);
    if (n === 24) n = 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function findCityByZone(zone: string): City | undefined {
  return ALL_CITIES.find((c) => c.zone === zone);
}

export function WorldClock({ tool }: { tool: ToolDefinition }) {
  const [zones, setZones] = React.useState<string[]>(
    DEFAULT_CITIES.map((c) => c.zone)
  );
  const [hour12, setHour12] = React.useState<boolean>(false);
  const [now, setNow] = React.useState<number>(Date.now());
  const [addZone, setAddZone] = React.useState<string>("");
  const [hydrated, setHydrated] = React.useState(false);

  // 1-second tick. setInterval is fine for a clock — we don't need
  // sub-second precision.
  React.useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Hydrate selection + format from localStorage.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as PersistState;
        if (Array.isArray(saved.zones) && saved.zones.length > 0) {
          setZones(saved.zones);
        }
        if (typeof saved.hour12 === "boolean") {
          setHour12(saved.hour12);
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Persist selection.
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      const state: PersistState = { zones, hour12 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [hydrated, zones, hour12]);

  const availableToAdd = React.useMemo(() => {
    const selected = new Set(zones);
    return ALL_CITIES.filter((c) => !selected.has(c.zone));
  }, [zones]);

  React.useEffect(() => {
    if (availableToAdd.length > 0 && !addZone) {
      setAddZone(availableToAdd[0].zone);
    } else if (availableToAdd.length === 0) {
      setAddZone("");
    } else if (addZone && !availableToAdd.some((c) => c.zone === addZone)) {
      setAddZone(availableToAdd[0].zone);
    }
  }, [availableToAdd, addZone]);

  const addCity = () => {
    if (!addZone) {
      toast.error("All available cities are already shown.");
      return;
    }
    setZones((prev) => [...prev, addZone]);
    const c = findCityByZone(addZone);
    if (c) toast.success(`Added ${c.city}`);
  };

  const removeCity = (zone: string) => {
    setZones((prev) => prev.filter((z) => z !== zone));
    const c = findCityByZone(zone);
    if (c) toast.success(`Removed ${c.city}`);
  };

  const reset = () => {
    setZones(DEFAULT_CITIES.map((c) => c.zone));
    setHour12(false);
    toast.success("Reset to default cities");
  };

  const summary = [
    `World clock — ${hour12 ? "12-hour" : "24-hour"} format`,
    "",
    ...zones.map((zone) => {
      const c = findCityByZone(zone);
      if (!c) return `${zone}: ${zone}`;
      const time = new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: hour12,
      }).format(new Date(now));
      return `${c.city} (${getZoneAbbr(zone, now)}, ${formatOffset(zone, now)}): ${time}`;
    }),
  ].join("\n");

  const toolBody = (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <Label
            htmlFor="wc-hour12"
            className="flex cursor-pointer items-center gap-2 text-sm font-medium"
          >
            <Switch
              id="wc-hour12"
              checked={hour12}
              onCheckedChange={setHour12}
            />
            {hour12 ? "12-hour" : "24-hour"} format
          </Label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={addZone}
            onChange={(e) => setAddZone(e.target.value)}
            aria-label="Add a city"
            disabled={availableToAdd.length === 0}
            className="h-9 max-w-[14rem] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {availableToAdd.length === 0 ? (
              <option value="">All cities added</option>
            ) : (
              availableToAdd
                .slice()
                .sort((a, b) => a.city.localeCompare(b.city))
                .map((c) => (
                  <option key={c.zone} value={c.zone}>
                    {c.city} · {c.country}
                  </option>
                ))
            )}
          </select>
          <Button
            size="sm"
            onClick={addCity}
            disabled={availableToAdd.length === 0}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      {zones.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">
          No cities selected. Add a city above to see its current time.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {zones.map((zone) => {
            const city = findCityByZone(zone) ?? { city: zone, country: zone, zone };
            const timeStr = new Intl.DateTimeFormat("en-US", {
              timeZone: zone,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: hour12,
            }).format(new Date(now));
            const dateStr = new Intl.DateTimeFormat("en-US", {
              timeZone: zone,
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(new Date(now));
            const abbr = getZoneAbbr(zone, now);
            const offset = formatOffset(zone, now);
            const localHour = getZoneHour(zone, now);
            const isDay = localHour >= 6 && localHour < 18;

            return (
              <div
                key={zone}
                className="group relative flex flex-col rounded-xl border bg-card p-4"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCity(zone)}
                  aria-label={`Remove ${city.city}`}
                  className="absolute right-2 top-2 h-7 w-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-full",
                      isDay
                        ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300"
                    )}
                    aria-hidden
                  >
                    {isDay ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {city.city}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {city.country}
                    </div>
                  </div>
                </div>

                <div className="mt-3 font-mono text-2xl font-bold tabular-nums text-foreground">
                  {timeStr}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {dateStr}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                    {abbr}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-muted-foreground">
                    {offset}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                    {isDay ? "Day" : "Night"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          <Globe2 className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
          Showing {zones.length} {zones.length === 1 ? "city" : "cities"} ·
          times update every second via{" "}
          <code className="rounded bg-muted px-1 py-0.5">Intl.DateTimeFormat</code> with{" "}
          <code className="rounded bg-muted px-1 py-0.5">timeZone</code>. DST is
          handled natively by your browser.
        </p>
        <CopyButton value={summary} size="sm" />
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "See the current time, date, timezone abbreviation and UTC offset for cities around the world — all on one page. Add or remove cities from a list of 50+ major locations, toggle 12-hour or 24-hour format, and spot at a glance which offices are in daylight and which are asleep. Times update every second using Intl.DateTimeFormat with the timeZone option, so daylight saving transitions are handled natively by your browser.",
    tool: toolBody,
    howTo: [
      {
        title: "Pick your format",
        description:
          "Toggle the 12-hour / 24-hour switch in the top bar. The choice is remembered in your browser for next time.",
      },
      {
        title: "Add more cities",
        description:
          "Use the dropdown on the right to pick a city from 50+ major locations, then click Add. The new city appears at the end of the grid.",
      },
      {
        title: "Remove cities",
        description:
          "Hover any city card and click the × in the corner to remove it. Your selection is saved to localStorage automatically.",
      },
      {
        title: "Read the cards",
        description:
          "Each card shows the city, country, current time, current date, timezone abbreviation (e.g. EST, GMT, JST), UTC offset (e.g. UTC+09:00) and a sun or moon icon indicating day or night in that city.",
      },
    ],
    useCases: [
      "Schedule a meeting across teams in New York, London and Tokyo without converting time zones manually.",
      "Check whether a customer support line in Sydney is still open before calling.",
      "Plan a trip by seeing at a glance whether your destination is in daylight or nighttime.",
      "Keep an eye on trading hours in Singapore, Dubai and New York from a single dashboard.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The available time zones and DST rules come from your browser&apos;s ICU
          library. The results match your operating system&apos;s tzdata — keep it
          updated for accuracy.
        </li>
        <li>
          The timezone abbreviation shown (EST, GMT, JST, etc.) is whatever
          your browser returns for the locale <code className="rounded bg-background px-1 py-0.5">en-US</code> with{" "}
          <code className="rounded bg-background px-1 py-0.5">timeZoneName: &quot;short&quot;</code>.
          Some zones may return a generic abbreviation like GMT instead of the
          local-standard abbreviation.
        </li>
        <li>
          Day / night is determined by the local hour being between 06:00 and
          18:00. Twilight hours and seasonal daylight variation are not modelled.
        </li>
        <li>
          The clock ticks once per second. Sub-second precision is intentionally
          not shown — a wall clock does not need it.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "How accurate are the times?",
        a: "Times are computed in your browser using Intl.DateTimeFormat with the IANA timeZone option. As long as your device clock is correct and your OS tzdata is up to date, the displayed times are accurate to the second and correctly reflect daylight saving transitions in every zone.",
      },
      {
        q: "Why does the offset change for some cities?",
        a: "Offsets reflect standard or daylight time depending on the date. A city like New York is UTC−5 in winter (EST) and UTC−4 in summer (EDT). The offset label shown reflects the offset in force right now.",
      },
      {
        q: "How is the timezone abbreviation determined?",
        a: "We pass timeZoneName: \"short\" to Intl.DateTimeFormat, which returns the abbreviation your browser’s ICU library associates with the zone — typically EST, GMT, JST and so on. Some zones may return a generic abbreviation.",
      },
      {
        q: "Is my city selection saved?",
        a: "Yes. The list of selected cities and the 12/24-hour preference are saved to localStorage on your device. Clearing site data will reset them to the eight default cities.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
