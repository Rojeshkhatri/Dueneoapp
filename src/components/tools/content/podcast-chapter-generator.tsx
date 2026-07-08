"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  GripVertical,
  RotateCcw,
  Download,
  Clock,
  ListMusic,
  FileJson,
  Film,
  AlignLeft,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseTimestamp,
  formatHMS,
  formatYouTubeTime,
  downloadText,
  SectionLabel,
} from "./_content-helpers";

interface Chapter {
  id: string;
  timestamp: string;
  title: string;
}

const SAMPLE_CHAPTERS: Chapter[] = [
  { id: "c1", timestamp: "00:00", title: "Intro" },
  { id: "c2", timestamp: "01:23", title: "Why this matters" },
  { id: "c3", timestamp: "07:45", title: "The framework explained" },
  { id: "c4", timestamp: "18:12", title: "Real-world example" },
  { id: "c5", timestamp: "32:50", title: "Q&A and listener questions" },
  { id: "c6", timestamp: "45:18", title: "Outro & where to find more" },
];

const newId = () =>
  `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function PodcastChapterGenerator({ tool }: { tool: ToolDefinition }) {
  const [chapters, setChapters] = React.useState<Chapter[]>(SAMPLE_CHAPTERS);
  const [podcastTitle, setPodcastTitle] = React.useState<string>("");
  const [podcastUrl, setPodcastUrl] = React.useState<string>("");
  const [dragId, setDragId] = React.useState<string | null>(null);

  const parsed = React.useMemo(() => {
    return chapters
      .map((c) => ({
        id: c.id,
        timestamp: c.timestamp,
        title: c.title.trim(),
        seconds: parseTimestamp(c.timestamp),
      }))
      .filter((c) => c.seconds != null)
      .sort((a, b) => (a.seconds as number) - (b.seconds as number));
  }, [chapters]);

  const hasError = React.useMemo(
    () => chapters.some((c) => c.timestamp.trim() !== "" && parseTimestamp(c.timestamp) == null),
    [chapters],
  );

  const addChapter = () =>
    setChapters((cs) => [
      ...cs,
      { id: newId(), timestamp: "", title: "" },
    ]);

  const removeChapter = (id: string) =>
    setChapters((cs) => cs.filter((c) => c.id !== id));

  const update = (id: string, field: keyof Chapter, value: string) =>
    setChapters((cs) =>
      cs.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );

  const onDragStart = (id: string) => setDragId(id);
  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id === dragId) return;
    setChapters((cs) => {
      const fromIdx = cs.findIndex((c) => c.id === dragId);
      const toIdx = cs.findIndex((c) => c.id === id);
      if (fromIdx === -1 || toIdx === -1) return cs;
      const next = [...cs];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  // ── Output formats ────────────────────────────────────────────────────────

  const jsonChapters = React.useMemo(() => {
    const version = "1.2.0";
    const chaptersArr = parsed.map((c) => ({
      startTime: c.seconds,
      title: c.title || "(untitled)",
    }));
    const doc: Record<string, unknown> = {
      version,
      chapters: chaptersArr,
    };
    if (podcastTitle.trim()) doc.title = podcastTitle.trim();
    return JSON.stringify(doc, null, 2);
  }, [parsed, podcastTitle]);

  const mp4Chapters = React.useMemo(() => {
    // MP4 / QuickTime chapter text track format: one line per chapter,
    // "TITLE|start|end" using absolute seconds. We synthesise end times as
    // the next chapter's start (or start + 60s for the last one).
    const lines: string[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const cur = parsed[i];
      const next = parsed[i + 1];
      const start = cur.seconds as number;
      const end = next ? (next.seconds as number) : start + 60;
      const title = (cur.title || "(untitled)").replace(/\|/g, "/");
      lines.push(`${title}|${start.toFixed(3)}|${end.toFixed(3)}`);
    }
    return lines.join("\n");
  }, [parsed]);

  const descriptionText = React.useMemo(() => {
    const head =
      podcastTitle.trim() || "Episode chapters";
    const url = podcastUrl.trim();
    const header = url ? `${head}\n${url}\n` : `${head}\n`;
    const lines = parsed.map((c) => {
      const t = formatYouTubeTime(c.seconds as number);
      return `${t} ${c.title || "(untitled)"}`;
    });
    return header + "\n" + lines.join("\n");
  }, [parsed, podcastTitle, podcastUrl]);

  const plainText = React.useMemo(() => {
    const lines = parsed.map((c) => {
      const t = formatHMS(c.seconds as number);
      return `${t}  ${c.title || "(untitled)"}`;
    });
    return lines.join("\n");
  }, [parsed]);

  const reset = () => {
    setChapters(SAMPLE_CHAPTERS);
    setPodcastTitle("");
    setPodcastUrl("");
    toast.info("Reset to sample chapters.");
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
              <Button size="sm" onClick={addChapter}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pcg-podtitle">Episode title (optional)</Label>
              <Input
                id="pcg-podtitle"
                value={podcastTitle}
                onChange={(e) => setPodcastTitle(e.target.value)}
                placeholder="The Dueneo Show #42"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pcg-podurl">Episode URL (optional)</Label>
              <Input
                id="pcg-podurl"
                value={podcastUrl}
                onChange={(e) => setPodcastUrl(e.target.value)}
                placeholder="https://episode.link/abc"
              />
            </div>
          </div>

          <div className="space-y-2">
            {chapters.map((c, idx) => {
              const sec = parseTimestamp(c.timestamp);
              const invalid = c.timestamp.trim() !== "" && sec == null;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg border bg-background p-2"
                  draggable
                  onDragStart={() => onDragStart(c.id)}
                  onDragOver={(e) => onDragOver(e, c.id)}
                >
                  <GripVertical
                    className="h-4 w-4 flex-none cursor-grab text-muted-foreground/60"
                    aria-hidden
                  />
                  <span className="w-6 flex-none text-center text-xs font-mono text-muted-foreground">
                    {idx + 1}
                  </span>
                  <Input
                    value={c.timestamp}
                    onChange={(e) => update(c.id, "timestamp", e.target.value)}
                    placeholder="00:00"
                    className={`h-9 w-28 flex-none font-mono text-sm ${
                      invalid ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                    aria-label={`Chapter ${idx + 1} timestamp`}
                  />
                  <Input
                    value={c.title}
                    onChange={(e) => update(c.id, "title", e.target.value)}
                    placeholder="Chapter title"
                    className="h-9 flex-1 text-sm"
                    aria-label={`Chapter ${idx + 1} title`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-none text-muted-foreground hover:text-destructive"
                    onClick={() => removeChapter(c.id)}
                    aria-label={`Remove chapter ${idx + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            {chapters.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No chapters yet. Click <strong>Add</strong> to create your first.
              </p>
            )}
          </div>

          {hasError && (
            <p className="text-xs text-destructive">
              One or more timestamps are invalid. Use MM:SS or HH:MM:SS format.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Tip: drag the <GripVertical className="inline h-3 w-3 align-text-bottom" />{" "}
            handle to reorder. Timestamps accept <code>MM:SS</code>,{" "}
            <code>HH:MM:SS</code> or plain seconds. Output is auto-sorted by
            start time.
          </p>
        </div>

        {/* Output panel */}
        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Generated formats</SectionLabel>
            <span className="text-xs text-muted-foreground">
              {parsed.length} chapter{parsed.length === 1 ? "" : "s"}
            </span>
          </div>

          {parsed.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Add at least one chapter with a valid timestamp to see output.
            </p>
          ) : (
            <Tabs defaultValue="json">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="json" className="text-xs">
                  <FileJson className="mr-1 h-3.5 w-3.5" /> JSON
                </TabsTrigger>
                <TabsTrigger value="mp4" className="text-xs">
                  <Film className="mr-1 h-3.5 w-3.5" /> MP4
                </TabsTrigger>
                <TabsTrigger value="yt" className="text-xs">
                  <ListMusic className="mr-1 h-3.5 w-3.5" /> YT
                </TabsTrigger>
                <TabsTrigger value="text" className="text-xs">
                  <AlignLeft className="mr-1 h-3.5 w-3.5" /> Text
                </TabsTrigger>
              </TabsList>

              <TabsContent value="json" className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Podcasting 2.0 chapters JSON — embed in your feed&apos;s{" "}
                    <code>&lt;podcast:chapters&gt;</code> tag.
                  </span>
                  <div className="flex gap-1">
                    <CopyButton value={jsonChapters} size="sm" label="Copy" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        downloadText("chapters.json", jsonChapters, "application/json");
                        toast.success("Downloaded chapters.json");
                      }}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> .json
                    </Button>
                  </div>
                </div>
                <pre className="max-h-80 overflow-auto rounded-md border bg-background p-3 font-mono text-xs leading-relaxed">
                  {jsonChapters}
                </pre>
              </TabsContent>

              <TabsContent value="mp4" className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    MP4 text chapter track — pipe-separated{" "}
                    <code>title|start|end</code> (seconds).
                  </span>
                  <div className="flex gap-1">
                    <CopyButton value={mp4Chapters} size="sm" label="Copy" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        downloadText("chapters.mp4.txt", mp4Chapters);
                        toast.success("Downloaded chapters.mp4.txt");
                      }}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                    </Button>
                  </div>
                </div>
                <pre className="max-h-80 overflow-auto rounded-md border bg-background p-3 font-mono text-xs leading-relaxed">
                  {mp4Chapters}
                </pre>
              </TabsContent>

              <TabsContent value="yt" className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    YouTube / podcast-app description style — auto-links on most
                    platforms.
                  </span>
                  <div className="flex gap-1">
                    <CopyButton value={descriptionText} size="sm" label="Copy" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        downloadText("chapters-youtube.txt", descriptionText);
                        toast.success("Downloaded chapters-youtube.txt");
                      }}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                    </Button>
                  </div>
                </div>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border bg-background p-3 font-mono text-xs leading-relaxed">
                  {descriptionText}
                </pre>
              </TabsContent>

              <TabsContent value="text" className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Plain text — <code>HH:MM:SS  Title</code> per line.</span>
                  <div className="flex gap-1">
                    <CopyButton value={plainText} size="sm" label="Copy" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        downloadText("chapters.txt", plainText);
                        toast.success("Downloaded chapters.txt");
                      }}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                    </Button>
                  </div>
                </div>
                <pre className="max-h-80 overflow-auto rounded-md border bg-background p-3 font-mono text-xs leading-relaxed">
                  {plainText}
                </pre>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Live preview list */}
      {parsed.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Sorted chapter list
            </span>
          </SectionLabel>
          <ol className="mt-3 space-y-1.5">
            {parsed.map((c, i) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm"
              >
                <span className="w-6 flex-none text-xs font-mono text-muted-foreground">
                  {i + 1}.
                </span>
                <span className="w-20 flex-none font-mono text-xs text-primary">
                  {formatHMS(c.seconds as number)}
                </span>
                <span className="flex-1">{c.title || "(untitled)"}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {Math.round(c.seconds as number)}s
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Turn a list of timestamps and titles into Podcasting 2.0 chapters JSON, an MP4 chapter track, a YouTube-style description block and plain text. Drag to reorder, watch the output update live, and copy or download any format with a click.",
    tool: toolBody,
    howTo: [
      {
        title: "Add your timestamps and titles",
        description:
          "Type each chapter's start time as MM:SS or HH:MM:SS, plus a short title. Click Add to insert more rows.",
      },
      {
        title: "Drag to reorder",
        description:
          "Grab the handle on the left of a row to move it. The output is always re-sorted by start time, so order in the list doesn't matter — but reordering helps you spot gaps.",
      },
      {
        title: "Pick a format and copy",
        description:
          "Switch between JSON (Podcasting 2.0), MP4 text track, YouTube description or plain text. Click Copy to grab it, or Save to download as a file.",
      },
      {
        title: "Optional: episode title and URL",
        description:
          "If you fill in the episode title and URL, they appear at the top of the YouTube/description output. The JSON output also includes the title field.",
      },
    ],
    useCases: [
      "Generate Podcasting 2.0 chapters JSON for your RSS feed.",
      "Produce a YouTube-ready description block with auto-linking timestamps.",
      "Export an MP4 text chapter track to mux into your video file.",
      "Quickly share a plain-text chapter list in show notes or emails.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The MP4 chapter output is a plain text track (<code>title|start|end</code>).
          Embedding it into an MP4 container as a proper chapter atom requires
          a muxer like <code>mp4chaps</code> or ffmpeg&apos;s{" "}
          <code>-metadata:s:v</code> handler.
        </li>
        <li>
          Timestamps are auto-sorted ascending. Duplicate or out-of-order
          entries are silently reordered.
        </li>
        <li>
          URLs and image attachments (supported by the Podcasting 2.0 spec) are
          not generated here — add them to the JSON by hand if you need rich
          chapters.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What is Podcasting 2.0 chapters JSON?",
        a: "It's a JSON format (version 1.2.0) defined by the Podcasting 2.0 namespace. You host it at a public URL and reference it from your RSS feed via <podcast:chapters url=\"…\" type=\"application/json+chapters\"/>. Apps like Pocket Casts, Podverse and Castamatic read it to show native chapter markers.",
      },
      {
        q: "Why does YouTube need timestamps without leading zeros?",
        a: "YouTube only auto-links timestamps in the format H:MM:SS, M:SS or MM:SS — leading zeros on the hours (like 00:01:23) break the auto-link. The YouTube tab uses the correct format.",
      },
      {
        q: "How is the MP4 chapter end time chosen?",
        a: "Each chapter's end is the next chapter's start. For the last chapter, we add 60 seconds — change this manually in the output if you know the episode's true length.",
      },
      {
        q: "Can I import an existing chapter list?",
        a: "Yes — paste each line as `timestamp Title` into the title field after typing the timestamp, or use the YouTube-timestamp-formatter tool to parse an existing description first.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
