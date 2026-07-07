"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { AlertTriangle, RotateCcw, Clock, RefreshCw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

type Unit = "seconds" | "milliseconds";

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatLocal(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

function formatUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

function isoLocal(d: Date): string {
  // toISOString gives Z; convert to local offset equivalent for the input field.
  const tzOffsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 19);
}

export function UnixTimestampConverter({ tool }: { tool: ToolDefinition }) {
  const [now, setNow] = React.useState<number>(Math.floor(Date.now() / 1000));
  const [stamp, setStamp] = React.useState<string>(String(Math.floor(Date.now() / 1000)));
  const [unit, setUnit] = React.useState<Unit>("seconds");
  const [dateStr, setDateStr] = React.useState<string>(isoLocal(new Date()));
  const [error, setError] = React.useState<string | null>(null);

  // Live ticking clock.
  React.useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const parsedTimestamp = React.useMemo<number | null>(() => {
    if (!stamp.trim()) return null;
    const n = Number(stamp.trim());
    if (!Number.isFinite(n)) return null;
    return n;
  }, [stamp]);

  const tsToDate = React.useMemo<Date | null>(() => {
    if (parsedTimestamp === null) return null;
    const ms = unit === "seconds" ? parsedTimestamp * 1000 : parsedTimestamp;
    if (ms < -8.64e15 || ms > 8.64e15) return null;
    return new Date(ms);
  }, [parsedTimestamp, unit]);

  const parsedDate = React.useMemo<Date | null>(() => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [dateStr]);

  const stampFromMs = (ms: number): number =>
    unit === "seconds" ? Math.floor(ms / 1000) : ms;

  const useCurrent = () => {
    const s = Math.floor(Date.now() / 1000);
    setStamp(String(s));
    setUnit("seconds");
    setError(null);
    toast.success("Loaded the current Unix timestamp.");
  };

  const reset = () => {
    setStamp("");
    setDateStr("");
    setError(null);
  };

  const content: ToolContent = {
    intro:
      "Convert Unix timestamps to human-readable dates — and back again — entirely in your browser. A live ticking clock shows the current epoch value, and both local and UTC formats are displayed so you can compare them at a glance.",
    tool: (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-primary/5 p-4">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Current Unix timestamp
            </p>
            <p className="font-mono text-2xl font-semibold tabular-nums">{now}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">{formatLocal(new Date(now * 1000))}</p>
            <p className="text-xs text-muted-foreground">{formatUtc(new Date(now * 1000))} UTC</p>
          </div>
          <CopyButton value={String(now)} size="sm" label="Copy" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold">Timestamp → Date</h3>
            <div className="space-y-2">
              <Label htmlFor="utc-stamp">Unix timestamp</Label>
              <Input
                id="utc-stamp"
                value={stamp}
                onChange={(e) => setStamp(e.target.value)}
                placeholder="1690000000"
                inputMode="numeric"
                className="font-mono"
                aria-label="Unix timestamp"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={unit === "seconds" ? "default" : "outline"}
                onClick={() => setUnit("seconds")}
              >
                Seconds
              </Button>
              <Button
                size="sm"
                variant={unit === "milliseconds" ? "default" : "outline"}
                onClick={() => setUnit("milliseconds")}
              >
                Milliseconds
              </Button>
              <Button size="sm" variant="ghost" onClick={useCurrent}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Now
              </Button>
            </div>

            {tsToDate ? (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                <Row label="Local" value={formatLocal(tsToDate)} />
                <Row label="UTC" value={`${formatUtc(tsToDate)} UTC`} />
                <Row label="ISO 8601" value={tsToDate.toISOString()} />
                <Row label="Relative" value={relative(tsToDate.getTime() - Date.now())} />
              </div>
            ) : (
              parsedTimestamp !== null && (
                <p className="text-xs text-destructive">Out of range for a JavaScript Date.</p>
              )
            )}
          </div>

          <div className="space-y-3 rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold">Date → Timestamp</h3>
            <div className="space-y-2">
              <Label htmlFor="utc-date">Local date &amp; time</Label>
              <Input
                id="utc-date"
                type="datetime-local"
                step={1}
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                aria-label="Local date and time"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Time is interpreted in your browser's local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone || "local"}).
            </p>

            {parsedDate && (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                <Row label="Seconds" value={String(Math.floor(parsedDate.getTime() / 1000))} />
                <Row label="Milliseconds" value={String(parsedDate.getTime())} />
                <Row label="UTC" value={`${formatUtc(parsedDate)} UTC`} />
                <div className="flex items-center justify-between pt-1">
                  <CopyButton
                    size="sm"
                    value={String(Math.floor(parsedDate.getTime() / 1000))}
                    label="Copy seconds"
                  />
                  <CopyButton
                    size="sm"
                    value={String(parsedDate.getTime())}
                    label="Copy ms"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
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
      </div>
    ),
    howTo: [
      {
        title: "Read the current timestamp",
        description:
          "A live ticking clock at the top shows the current Unix epoch value in seconds, plus the equivalent local and UTC times.",
      },
      {
        title: "Convert timestamp → date",
        description:
          "Type a Unix timestamp (in seconds or milliseconds) and the local, UTC, ISO 8601 and relative formats appear instantly.",
      },
      {
        title: "Convert date → timestamp",
        description:
          "Pick a local date and time. The corresponding Unix value in both seconds and milliseconds is shown with copy buttons.",
      },
      {
        title: "Copy whatever you need",
        description:
          "Every output value has a Copy button — use it to grab the seconds, milliseconds, or formatted string for your code or notes.",
      },
    ],
    useCases: [
      "Decode a Unix timestamp from a log file or API response into a readable date.",
      "Generate a timestamp for a specific scheduled date in your local timezone.",
      "Verify whether a stored value is in seconds or milliseconds before using it.",
      "Cross-check UTC vs local time when working with multi-region systems.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Dates outside the range ±100,000,000 days from 1 January 1970 cannot be represented by JavaScript's Date object.</li>
        <li>Conversions use your browser's local timezone; manually entering an offset is not supported.</li>
        <li>Sub-second precision is not shown — milliseconds are preserved in the value but not displayed in the formatted string.</li>
      </ul>
    ),
    faq: [
      {
        q: "Seconds or milliseconds?",
        a: "Use the toggle button to switch. JavaScript's Date.now() returns milliseconds; many Unix systems and APIs use seconds. The tool tells you which mode is active.",
      },
      {
        q: "Which timezone is used?",
        a: "Timestamp → Date uses your browser's local timezone for the Local line and shows UTC separately. Date → Timestamp interprets the date picker in your local timezone.",
      },
      {
        q: "Why does my timestamp show a date in the future?",
        a: "If you typed a millisecond value while the tool was in seconds mode (or vice versa), the result will be wildly off. Toggle the unit and try again.",
      },
      {
        q: "Is my input sent anywhere?",
        a: "No. Conversion happens with the browser's Date object entirely on your device.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <code className="font-mono text-xs break-all text-right">{value}</code>
    </div>
  );
}

function relative(ms: number): string {
  const seconds = Math.round(ms / 1000);
  const abs = Math.abs(seconds);
  const sign = seconds < 0 ? "ago" : "from now";
  if (abs < 60) return `${abs}s ${sign}`;
  if (abs < 3600) return `${Math.floor(abs / 60)}m ${sign}`;
  if (abs < 86400) return `${Math.floor(abs / 3600)}h ${sign}`;
  if (abs < 2592000) return `${Math.floor(abs / 86400)}d ${sign}`;
  if (abs < 31536000) return `${Math.floor(abs / 2592000)}mo ${sign}`;
  return `${Math.floor(abs / 31536000)}y ${sign}`;
}
