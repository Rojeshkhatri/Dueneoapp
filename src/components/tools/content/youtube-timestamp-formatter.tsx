"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  Download,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Youtube,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseTimestamp,
  formatYouTubeTime,
  downloadText,
  SectionLabel,
} from "./_content-helpers";

interface Row {
  id: string;
  timestamp: string;
  title: string;
}

const SAMPLE_ROWS: Row[] = [
  { id: "y1", timestamp: "0:00", title: "Intro" },
  { id: "y2", timestamp: "1:23", title: "Setup & install" },
  { id: "y3", timestamp: "4:15", title: "The main technique" },
  { id: "y4", timestamp: "9:30", title: "Common mistakes to avoid" },
  { id: "y5", timestamp: "14:48", title: "Final result & recap" },
];

const newId = () =>
  `y-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type ListStyle = "yt" | "plain" | "numbered";

export function YoutubeTimestampFormatter({ tool }: { tool: ToolDefinition }) {
  const [rows, setRows] = React.useState<Row[]>(SAMPLE_ROWS);
  const [intro, setIntro] = React.useState<string>(
    "In this video we walk through the entire process step by step. Skip ahead using the chapters below 👇",
  );
  const [outro, setOutro] = React.useState<string>(
    "If this helped, drop a like and subscribe for more!",
  );
  const [listStyle, setListStyle] = React.useState<ListStyle>("yt");

  const parsed = React.useMemo(
    () =>
      rows
        .map((r) => ({
          id: r.id,
          timestamp: r.timestamp,
          title: r.title,
          seconds: parseTimestamp(r.timestamp),
        }))
        .filter((r) => r.seconds != null)
        .sort((a, b) => (a.seconds as number) - (b.seconds as number)),
    [rows],
  );

  const invalidRows = React.useMemo(
    () => rows.filter((r) => r.timestamp.trim() !== "" && parseTimestamp(r.timestamp) == null),
    [rows],
  );

  const addRow = () =>
    setRows((rs) => [...rs, { id: newId(), timestamp: "", title: "" }]);

  const removeRow = (id: string) =>
    setRows((rs) => rs.filter((r) => r.id !== id));

  const update = (id: string, field: keyof Row, value: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  // Paste detection — accepts lines like "1:23 Title" or "1:23 - Title".
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Only intercept when the paste target is the "bulk import" textarea.
    const text = e.clipboardData.getData("text");
    if (!text || !text.includes("\n")) return;
    e.preventDefault();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const imported: Row[] = [];
    for (const line of lines) {
      const m = line.match(
        /^\s*(\d{1,2}:\d{2}(?::\d{2})?|\d{1,2}\s*min\s*\d{0,2}s?)\s*(?:[-–—]\s*|\.\s*|\s+)(.*)$/,
      );
      if (m) {
        imported.push({
          id: newId(),
          timestamp: m[1],
          title: m[2].trim(),
        });
      } else {
        // Couldn't parse — leave as a title-only row.
        imported.push({ id: newId(), timestamp: "", title: line });
      }
    }
    if (imported.length > 0) {
      setRows(imported);
      toast.success(`Imported ${imported.length} rows.`);
    }
  };

  const output = React.useMemo(() => {
    const parts: string[] = [];
    if (intro.trim()) {
      parts.push(intro.trim());
      parts.push("");
    }
    for (let i = 0; i < parsed.length; i++) {
      const r = parsed[i];
      const t = formatYouTubeTime(r.seconds as number);
      const title = r.title || "(chapter)";
      if (listStyle === "yt") {
        parts.push(`${t} ${title}`);
      } else if (listStyle === "plain") {
        parts.push(`${t}  ${title}`);
      } else {
        // numbered
        parts.push(`${i + 1}. ${t} ${title}`);
      }
    }
    if (outro.trim()) {
      parts.push("");
      parts.push(outro.trim());
    }
    return parts.join("\n");
  }, [parsed, intro, outro, listStyle]);

  const reset = () => {
    setRows(SAMPLE_ROWS);
    setIntro(
      "In this video we walk through the entire process step by step. Skip ahead using the chapters below 👇",
    );
    setOutro("If this helped, drop a like and subscribe for more!");
    setListStyle("yt");
    toast.info("Reset.");
  };

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Input panel */}
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Chapters</SectionLabel>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
              <Button size="sm" onClick={addRow}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {rows.map((r, idx) => {
              const sec = parseTimestamp(r.timestamp);
              const invalid = r.timestamp.trim() !== "" && sec == null;
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-2 rounded-lg border bg-background p-2"
                >
                  <span className="w-6 flex-none text-center text-xs font-mono text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div className="relative">
                    <Input
                      value={r.timestamp}
                      onChange={(e) =>
                        update(r.id, "timestamp", e.target.value)
                      }
                      placeholder="0:00"
                      className={`h-9 w-24 flex-none font-mono text-sm pl-6 ${
                        invalid
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }`}
                      aria-label={`Row ${idx + 1} timestamp`}
                    />
                    {sec != null ? (
                      <Check className="pointer-events-none absolute left-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-500" />
                    ) : null}
                  </div>
                  <Input
                    value={r.title}
                    onChange={(e) => update(r.id, "title", e.target.value)}
                    placeholder="Chapter title"
                    className="h-9 flex-1 text-sm"
                    aria-label={`Row ${idx + 1} title`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-none text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(r.id)}
                    aria-label={`Remove row ${idx + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            {rows.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No chapters yet. Click <strong>Add</strong> to start.
              </p>
            )}
          </div>

          {invalidRows.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
              <p>
                {invalidRows.length} timestamp{invalidRows.length === 1 ? "" : "s"}{" "}
                could not be parsed. Use <code>M:SS</code>, <code>MM:SS</code> or{" "}
                <code>H:MM:SS</code> (e.g. <code>1:23</code>, <code>0:00</code>,{" "}
                <code>1:02:03</code>). Invalid rows are skipped in the output.
              </p>
            </div>
          )}

          {/* Bulk paste */}
          <details className="rounded-lg border bg-muted/30 p-3 text-sm">
            <summary className="cursor-pointer font-medium">
              Bulk paste a chapter list
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              Paste lines like <code>1:23 Topic name</code> or{" "}
              <code>1:23 - Topic name</code>. We&apos;ll split each line into a
              timestamp + title row.
            </p>
            <Textarea
              className="mt-2 min-h-[120px] font-mono text-xs"
              placeholder={"0:00 Intro\n1:23 Setup\n4:15 The main technique"}
              onPaste={handlePaste}
              onChange={(e) => {
                // Allow typing to update nothing — the field is paste-only —
                // but we still let the user clear it manually.
                if (e.target.value === "") {
                  e.target.value = "";
                }
              }}
              aria-label="Bulk paste area"
            />
          </details>

          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="ytf-intro">Intro text (optional)</Label>
              <Textarea
                id="ytf-intro"
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                className="min-h-[60px] text-sm"
                placeholder="What viewers will learn…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ytf-outro">Outro text (optional)</Label>
              <Textarea
                id="ytf-outro"
                value={outro}
                onChange={(e) => setOutro(e.target.value)}
                className="min-h-[60px] text-sm"
                placeholder="Like, subscribe, links…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ytf-style">List style</Label>
              <Select
                value={listStyle}
                onValueChange={(v) => setListStyle(v as ListStyle)}
              >
                <SelectTrigger id="ytf-style" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yt">YouTube auto-link (M:SS Title)</SelectItem>
                  <SelectItem value="plain">Plain (M:SS  Title)</SelectItem>
                  <SelectItem value="numbered">Numbered (1. M:SS Title)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Output panel */}
        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>
              <span className="inline-flex items-center gap-1.5">
                <Youtube className="h-3.5 w-3.5" /> Description output
              </span>
            </SectionLabel>
            <div className="flex gap-1">
              <CopyButton value={output} size="sm" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  downloadText("youtube-description.txt", output);
                  toast.success("Downloaded youtube-description.txt");
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Save
              </Button>
            </div>
          </div>

          {parsed.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Add at least one row with a valid timestamp to see output.
            </p>
          ) : (
            <pre className="min-h-[260px] whitespace-pre-wrap rounded-md border bg-background p-4 font-mono text-xs leading-relaxed">
              {output}
            </pre>
          )}

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md border bg-background p-2">
              <div className="text-muted-foreground">Chapters</div>
              <div className="font-mono text-lg font-bold">{parsed.length}</div>
            </div>
            <div className="rounded-md border bg-background p-2">
              <div className="text-muted-foreground">Characters</div>
              <div className="font-mono text-lg font-bold">{output.length}</div>
            </div>
            <div className="rounded-md border bg-background p-2">
              <div className="text-muted-foreground">Lines</div>
              <div className="font-mono text-lg font-bold">
                {output.split("\n").length}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            YouTube only auto-links timestamps in the formats{" "}
            <code>H:MM:SS</code>, <code>M:SS</code> or <code>MM:SS</code>. The
            first chapter must start at <code>0:00</code> to render the chapter
            bar on the video player.
          </p>
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Paste your video's timestamps and chapter titles, get a clean YouTube-ready description with auto-linking timestamps. Validate format on the fly, add intro and outro copy, choose between three list styles, and copy or download with one click.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter each timestamp and title",
        description:
          "Use formats like 0:00, 1:23 or 1:02:03. A green checkmark confirms the timestamp parsed successfully.",
      },
      {
        title: "Bulk-paste an existing list (optional)",
        description:
          "Expand Bulk paste and paste lines like '1:23 Topic name' or '1:23 - Topic name'. We'll split them into rows automatically.",
      },
      {
        title: "Add intro and outro copy",
        description:
          "Optional text fields above and below the chapter list. Use them for hooks, links and calls to action.",
      },
      {
        title: "Pick a list style and copy",
        description:
          "YouTube auto-link (default), plain two-space separator, or numbered. Click Copy or Save to download as a .txt file.",
      },
    ],
    useCases: [
      "Format chapter lists for long-form YouTube videos so chapters auto-link.",
      "Bulk-paste show notes from a script and convert to a description block.",
      "Add a consistent intro/outro template to every video description.",
      "Count characters to stay within YouTube's 5,000-character description limit.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          YouTube only auto-links timestamps in the formats{" "}
          <code>H:MM:SS</code>, <code>M:SS</code> or <code>MM:SS</code> —
          leading zeros on hours (<code>00:01:23</code>) will not link.
        </li>
        <li>
          The first chapter must start at <code>0:00</code> for the chapter bar
          to appear on the video player. We don&apos;t enforce this — make sure
          your first row uses <code>0:00</code>.
        </li>
        <li>
          Timestamps are auto-sorted ascending; duplicate or out-of-order rows
          are silently reordered in the output.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why is my timestamp not auto-linking on YouTube?",
        a: "Check the format — YouTube only recognises H:MM:SS, M:SS or MM:SS (no leading zeros on the hours). Make sure there's a single space between the timestamp and the title, and that the first chapter starts at 0:00.",
      },
      {
        q: "How many chapters can I have?",
        a: "YouTube has no hard chapter limit, but descriptions are capped at 5,000 characters. The character counter in the output panel shows your current length.",
      },
      {
        q: "Can I import chapters from a podcast chapter file?",
        a: "Yes — open the Bulk paste section and paste lines like '00:00 Intro' or '01:23 - Why this matters'. We'll parse each line into a row.",
      },
      {
        q: "What's the difference between the three list styles?",
        a: "YouTube auto-link is the standard format that auto-links on YouTube. Plain uses a two-space separator (no auto-link). Numbered prefixes each line with a 1., 2., etc. — useful for podcast show notes or email.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
