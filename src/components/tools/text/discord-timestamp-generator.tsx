"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CalendarClock, Copy, Zap } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

interface DiscordFormat {
  key: "R" | "f" | "F" | "d" | "D" | "t" | "T";
  label: string;
  description: string;
  /** Intl format options used to render a localised preview. */
  intlOpts: Intl.DateTimeFormatOptions;
  /** Whether this format includes a relative-time component. */
  relative?: boolean;
}

const FORMATS: DiscordFormat[] = [
  {
    key: "R",
    label: "Relative",
    description: "in 2 hours · 5 minutes ago",
    intlOpts: {},
    relative: true,
  },
  {
    key: "f",
    label: "Short date/time",
    description: "November 4, 2023 6:39 PM",
    intlOpts: {
      year: "numeric", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit",
    },
  },
  {
    key: "F",
    label: "Full date/time",
    description: "Saturday, November 4, 2023 6:39 PM",
    intlOpts: {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit",
    },
  },
  {
    key: "d",
    label: "Short date",
    description: "11/04/2023",
    intlOpts: { year: "numeric", month: "2-digit", day: "2-digit" },
  },
  {
    key: "D",
    label: "Long date",
    description: "November 4, 2023",
    intlOpts: { year: "numeric", month: "long", day: "numeric" },
  },
  {
    key: "t",
    label: "Short time",
    description: "6:39 PM",
    intlOpts: { hour: "numeric", minute: "2-digit" },
  },
  {
    key: "T",
    label: "Long time",
    description: "6:39:39 PM",
    intlOpts: { hour: "numeric", minute: "2-digit", second: "2-digit" },
  },
];

/** Format a UNIX timestamp (seconds) as a relative-time string. */
function formatRelative(unixSec: number): string {
  const now = Date.now() / 1000;
  const diff = unixSec - now;
  const abs = Math.abs(diff);
  const sign = diff >= 0 ? "in " : "";
  const suffix = diff >= 0 ? "" : " ago";

  const minute = 60;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  let value: number;
  let unit: string;

  if (abs < minute) {
    return diff >= 0 ? "in a few seconds" : "a few seconds ago";
  } else if (abs < hour) {
    value = Math.round(abs / minute);
    unit = "minute";
  } else if (abs < day) {
    value = Math.round(abs / hour);
    unit = "hour";
  } else if (abs < week) {
    value = Math.round(abs / day);
    unit = "day";
  } else if (abs < month) {
    value = Math.round(abs / week);
    unit = "week";
  } else if (abs < year) {
    value = Math.round(abs / month);
    unit = "month";
  } else {
    value = Math.round(abs / year);
    unit = "year";
  }
  const plural = value === 1 ? "" : "s";
  return `${sign}${value} ${unit}${plural}${suffix}`;
}

/** Convert a datetime-local string (local time) to a UNIX timestamp in seconds. */
function localInputToUnix(value: string): number {
  // datetime-local gives us "YYYY-MM-DDTHH:mm" in the user's local timezone.
  // `new Date(value)` parses this as local time, which is what we want.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return Math.floor(Date.now() / 1000);
  return Math.floor(d.getTime() / 1000);
}

/** Format a datetime-local string for display (local + UTC). */
function formatDateTime(value: string): { local: string; utc: string } {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return { local: "—", utc: "—" };
  }
  return {
    local: d.toLocaleString(),
    utc: d.toUTCString(),
  };
}

/** Render a Discord-style preview of the given UNIX timestamp + format. */
function renderPreview(unixSec: number, fmt: DiscordFormat): string {
  if (fmt.relative) return formatRelative(unixSec);
  const d = new Date(unixSec * 1000);
  try {
    return new Intl.DateTimeFormat(undefined, fmt.intlOpts).format(d);
  } catch {
    return d.toUTCString();
  }
}

const QUICK_PRESETS: { label: string; offsetSec: number }[] = [
  { label: "Now", offsetSec: 0 },
  { label: "+1 hour", offsetSec: 3600 },
  { label: "+1 day", offsetSec: 86400 },
  { label: "+1 week", offsetSec: 604800 },
  { label: "+1 month", offsetSec: 2592000 },
  { label: "Christmas", offsetSec: 0 }, // handled specially
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toLocalInput(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export function DiscordTimestampGenerator({ tool }: { tool: ToolDefinition }) {
  const [value, setValue] = React.useState<string>(() => toLocalInput(new Date()));

  const unix = React.useMemo(() => localInputToUnix(value), [value]);
  const formatted = React.useMemo(() => formatDateTime(value), [value]);

  const applyPreset = (label: string, offsetSec: number) => {
    let target: Date;
    if (label === "Christmas") {
      const now = new Date();
      const year = now.getMonth() === 11 && now.getDate() >= 25 ? now.getFullYear() + 1 : now.getFullYear();
      target = new Date(year, 11, 25, 0, 0, 0);
    } else {
      target = new Date(Date.now() + offsetSec * 1000);
    }
    setValue(toLocalInput(target));
    toast.message(`Set to ${label}.`);
  };

  const useNow = () => {
    setValue(toLocalInput(new Date()));
    toast.message("Set to the current local time.");
  };

  const copyMarkdown = async (fmt: DiscordFormat) => {
    const md = `<t:${unix}:${fmt.key}>`;
    try {
      await navigator.clipboard.writeText(md);
      toast.success(`Copied ${md}`);
    } catch {
      toast.error("Copy failed — please copy manually.");
    }
  };

  const content: ToolContent = {
    intro:
      "Generate Discord timestamp markdown (<t:UNIX:R> and friends) for any date and time. All seven Discord timestamp formats are rendered live, with a preview of how the message will appear in each viewer's local timezone. Click any card to copy the markdown, paste it into a Discord message, and watch it auto-convert.",
    tool: (
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <Label htmlFor="dtg-input" className="text-sm">
                Date &amp; time (your local timezone)
              </Label>
              <Input
                id="dtg-input"
                type="datetime-local"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                step={60}
                className="w-full sm:w-72"
                aria-label="Date and time"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button variant="outline" size="sm" onClick={useNow}>
                <Zap className="mr-1.5 h-3.5 w-3.5" /> Now
              </Button>
              {QUICK_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  variant="ghost"
                  size="sm"
                  onClick={() => applyPreset(p.label, p.offsetSec)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                UNIX timestamp
              </div>
              <div className="mt-0.5 font-mono text-sm">{unix}</div>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Local
              </div>
              <div className="mt-0.5 truncate text-sm" title={formatted.local}>
                {formatted.local}
              </div>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                UTC
              </div>
              <div className="mt-0.5 truncate text-sm" title={formatted.utc}>
                {formatted.utc}
              </div>
            </div>
          </div>
        </div>

        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Discord timestamp formats"
        >
          {FORMATS.map((fmt) => {
            const md = `<t:${unix}:${fmt.key}>`;
            const preview = renderPreview(unix, fmt);
            return (
              <button
                key={fmt.key}
                type="button"
                role="listitem"
                onClick={() => copyMarkdown(fmt)}
                className="group flex flex-col rounded-xl border bg-card p-4 text-left transition hover:border-primary/50 hover:shadow-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                aria-label={`Copy ${fmt.label} markdown`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-primary">
                      :{fmt.key}
                    </span>
                    <h3 className="text-sm font-semibold">{fmt.label}</h3>
                  </div>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-primary" />
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {fmt.description}
                </p>
                <div className="mt-3 rounded-md bg-muted/40 px-2.5 py-2 text-sm">
                  <span className="font-medium">{preview}</span>
                </div>
                <div className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
                  {md}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          <div className="flex items-center gap-1.5 font-medium">
            <CalendarClock className="h-4 w-4" /> How Discord timestamps work
          </div>
          <p className="mt-2 text-muted-foreground">
            Discord renders <code>&lt;t:UNIX:STYLE&gt;</code> markdown as a
            timestamp in each viewer's own timezone and locale. The UNIX
            value is seconds since the epoch (UTC). The style letter chooses
            the format: <code>R</code> = relative, <code>f</code> = short
            date/time, <code>F</code> = full date/time with weekday,{" "}
            <code>d</code> = short date, <code>D</code> = long date,{" "}
            <code>t</code> = short time, <code>T</code> = long time with
            seconds.
          </p>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Pick a date and time",
        description:
          "Use the datetime-local picker (in your timezone), or click a quick preset like Now, +1 hour, or Christmas.",
      },
      {
        title: "Compare the formats",
        description:
          "All seven Discord timestamp styles are rendered live with a preview of what each viewer will see.",
      },
      {
        title: "Click any card to copy",
        description:
          "The full markdown (<t:UNIX:STYLE>) is copied to your clipboard.",
      },
      {
        title: "Paste into Discord",
        description:
          "Paste the markdown into a message, comment or embed — Discord auto-converts it on send.",
      },
    ],
    useCases: [
      "Schedule events in Discord servers across multiple timezones without doing the mental math.",
      "Embed expiry/countdown times in announcements that update live for each viewer.",
      "Log moderation actions with timezone-correct timestamps that every moderator sees locally.",
      "Send meeting invites that auto-convert to each participant's local time.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Discord timestamps render in the viewer's locale and timezone —
          the preview here is what <em>you</em> would see. Other viewers may
          see different formatting.
        </li>
        <li>
          The relative format (<code>:R</code>) recalculates on every
          render, so "in 2 hours" eventually becomes "2 hours ago".
        </li>
        <li>
          The datetime-local input uses seconds-resolution; sub-second
          timestamps aren't supported.
        </li>
        <li>
          UNIX timestamps are seconds since 1970-01-01 UTC. Dates before
          ~1902 or after ~2038 may behave oddly on 32-bit systems.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why does the preview differ from what my friend sees?",
        a: "Discord renders timestamps in each viewer's locale and timezone. The preview here shows what you would see — your friend in another country will see the same UNIX instant formatted in their locale and timezone.",
      },
      {
        q: "Does the relative format stay up to date?",
        a: "Yes — the :R format is recalculated by Discord every time the message is rendered. \"in 2 hours\" will eventually become \"2 hours ago\" without you editing the message.",
      },
      {
        q: "Can I use these timestamps outside Discord?",
        a: "The <t:UNIX:STYLE> syntax is Discord-specific. Other apps won't render it — but the UNIX timestamp itself is universal, so you can copy just the number for use elsewhere.",
      },
      {
        q: "Is my date or timezone uploaded anywhere?",
        a: "No. Everything is computed in your browser from your local clock. Nothing is sent to a server.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
