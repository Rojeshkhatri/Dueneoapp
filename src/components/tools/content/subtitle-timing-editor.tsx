"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/dueneo/copy-button";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { toast } from "sonner";
import {
  Download,
  RotateCcw,
  Upload,
  Trash2,
  ChevronUp,
  ChevronDown,
  FastForward,
  Rewind,
  AlignJustify,
  Scissors,
  AlertTriangle,
  FileText,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseSrt,
  serializeSrt,
  shiftEntries,
  fixOverlaps,
  renumberEntries,
  formatSrtTime,
  type SrtEntry,
  downloadText,
  byteLength,
  MAX_INPUT_BYTES,
  SectionLabel,
} from "./_content-helpers";

const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:04,500
Welcome back to the channel.
Today we're building something cool.

2
00:00:04,800 --> 00:00:07,200
But before we start, let me show you
what we're making.

3
00:00:07,200 --> 00:00:10,000
It's a fully client-side subtitle editor
that runs in your browser.

4
00:00:10,500 --> 00:00:13,800
No uploads, no signups — just paste
your SRT and start editing.
`;

interface EditState {
  shift: number; // seconds (can be fractional / negative)
  overlapsFixed: boolean;
  renumbered: boolean;
  removedIds: Set<number>;
  /** Per-entry inline edits keyed by entry index. */
  editedStart: Record<number, string>;
  editedEnd: Record<number, string>;
  editedText: Record<number, string>;
}

export function SubtitleTimingEditor({ tool }: { tool: ToolDefinition }) {
  const [raw, setRaw] = React.useState<string>(SAMPLE_SRT);
  const [parsed, setParsed] = React.useState<SrtEntry[]>([]);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [edit, setEdit] = React.useState<EditState>({
    shift: 0,
    overlapsFixed: false,
    renumbered: false,
    removedIds: new Set(),
    editedStart: {},
    editedEnd: {},
    editedText: {},
  });
  const [fileName, setFileName] = React.useState<string>("subtitles.srt");

  // Parse raw input whenever it changes.
  React.useEffect(() => {
    if (!raw.trim()) {
      setParsed([]);
      setParseError(null);
      return;
    }
    try {
      if (byteLength(raw) > MAX_INPUT_BYTES) {
        setParseError("Input exceeds 1 MB. Please trim it down.");
        setParsed([]);
        return;
      }
      const entries = parseSrt(raw);
      if (entries.length === 0) {
        setParseError(
          "No valid SRT entries found. Make sure each block has a line like 00:00:01,000 --> 00:00:04,500.",
        );
        setParsed([]);
      } else {
        setParseError(null);
        setParsed(entries);
      }
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Failed to parse SRT input.",
      );
      setParsed([]);
    }
  }, [raw]);

  // Reset transient edits whenever the parsed source changes.
  React.useEffect(() => {
    setEdit({
      shift: 0,
      overlapsFixed: false,
      renumbered: false,
      removedIds: new Set(),
      editedStart: {},
      editedEnd: {},
      editedText: {},
    });
  }, [raw]);

  // Apply all transformations to produce the final list.
  const finalEntries = React.useMemo(() => {
    let list = parsed.filter((_, i) => !edit.removedIds.has(i));
    // Apply inline text edits first (these don't change timing).
    list = list.map((e) => {
      const origIdx = parsed.indexOf(e);
      const newText = edit.editedText[origIdx];
      const newStart = edit.editedStart[origIdx];
      const newEnd = edit.editedEnd[origIdx];
      const next: SrtEntry = { ...e };
      if (newText != null) next.text = newText;
      if (newStart != null && newStart.trim() !== "") {
        const s = parseSrtTimeLocal(newStart);
        if (s != null) next.start = s;
      }
      if (newEnd != null && newEnd.trim() !== "") {
        const s = parseSrtTimeLocal(newEnd);
        if (s != null) next.end = s;
      }
      return next;
    });
    if (edit.shift !== 0) list = shiftEntries(list, edit.shift);
    if (edit.overlapsFixed) list = fixOverlaps(list);
    if (edit.renumbered) list = renumberEntries(list);
    else list = list.map((e, i) => ({ ...e, index: i + 1 }));
    return list;
  }, [parsed, edit]);

  const overlapCount = React.useMemo(() => {
    let count = 0;
    for (let i = 0; i < parsed.length - 1; i++) {
      if (parsed[i].end > parsed[i + 1].start) count++;
    }
    return count;
  }, [parsed]);

  const onUpload = (files: { file: File }[]) => {
    const f = files[0]?.file;
    if (!f) return;
    if (f.size > MAX_INPUT_BYTES) {
      toast.error("File exceeds 1 MB. Please use a smaller SRT file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setRaw(text);
      setFileName(f.name);
      toast.success(`Loaded ${f.name}`);
    };
    reader.onerror = () => toast.error("Failed to read file.");
    reader.readAsText(f);
  };

  const setShift = (v: number) => setEdit((e) => ({ ...e, shift: v }));

  const toggleOverlap = () =>
    setEdit((e) => ({ ...e, overlapsFixed: !e.overlapsFixed }));
  const toggleRenumber = () =>
    setEdit((e) => ({ ...e, renumbered: true }));

  const removeEntry = (origIdx: number) =>
    setEdit((e) => {
      const next = new Set(e.removedIds);
      next.add(origIdx);
      return { ...e, removedIds: next };
    });

  const restoreEntry = (origIdx: number) =>
    setEdit((e) => {
      const next = new Set(e.removedIds);
      next.delete(origIdx);
      return { ...e, removedIds: next };
    });

  const editField = (
    origIdx: number,
    field: "editedStart" | "editedEnd" | "editedText",
    value: string,
  ) =>
    setEdit((e) => ({
      ...e,
      [field]: { ...e[field], [origIdx]: value },
    }));

  const output = serializeSrt(finalEntries);

  const reset = () => {
    setRaw(SAMPLE_SRT);
    setFileName("subtitles.srt");
    toast.info("Reset to sample SRT.");
  };

  const toolBody = (
    <div className="space-y-5">
      {/* Input + actions */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>SRT input</SectionLabel>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>

          <Dropzone
            accept=".srt,.vtt,text/plain"
            onFiles={onUpload}
            label="Drop an .srt file or click to browse"
            hint="Reads the file locally in your browser — nothing is uploaded."
            maxSizeLabel="1 MB"
          />

          {fileName !== "subtitles.srt" && (
            <FileChip name={fileName} onRemove={() => setFileName("subtitles.srt")} />
          )}

          <div className="space-y-2">
            <Label htmlFor="srt-input">Or paste SRT content</Label>
            <Textarea
              id="srt-input"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={"1\n00:00:01,000 --> 00:00:04,500\nWelcome back!"}
              className="min-h-[200px] font-mono text-xs"
              spellCheck={false}
              aria-label="SRT input"
            />
          </div>

          {parseError && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
              <p>{parseError}</p>
            </div>
          )}

          {parsed.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Parsed <strong className="text-foreground">{parsed.length}</strong>{" "}
              entries · {overlapCount} overlap{overlapCount === 1 ? "" : "s"}{" "}
              detected · {byteLength(raw)} bytes
            </p>
          )}
        </div>

        {/* Transformations */}
        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <SectionLabel>Transformations</SectionLabel>

          <div className="space-y-3 rounded-lg border bg-background p-4">
            <Label>Shift all timings</Label>
            <p className="text-xs text-muted-foreground">
              Move every entry&apos;s start and end by this many seconds. Use a
              negative number to shift backwards. Times are clamped at 0.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Subtract 1 second"
                onClick={() => setShift(edit.shift - 1)}
              >
                <Rewind className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Subtract 0.1 second"
                onClick={() => setShift(parseFloat((edit.shift - 0.1).toFixed(3)))}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Input
                inputMode="decimal"
                value={edit.shift}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setShift(Number.isFinite(v) ? v : 0);
                }}
                className="text-center font-mono"
                aria-label="Shift amount in seconds"
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Add 0.1 second"
                onClick={() => setShift(parseFloat((edit.shift + 0.1).toFixed(3)))}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Add 1 second"
                onClick={() => setShift(edit.shift + 1)}
              >
                <FastForward className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShift(0)}
              >
                Clear
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Current shift:{" "}
              <code className="font-mono">
                {edit.shift > 0 ? "+" : ""}
                {edit.shift.toFixed(3)}s
              </code>
            </p>
          </div>

          <div className="space-y-2 rounded-lg border bg-background p-4">
            <Label>Fix overlapping entries</Label>
            <p className="text-xs text-muted-foreground">
              Clip each entry&apos;s end time so it doesn&apos;t overlap the next
              entry&aposs start (1 ms gap inserted).
            </p>
            <Button
              variant={edit.overlapsFixed ? "default" : "outline"}
              size="sm"
              onClick={toggleOverlap}
              disabled={parsed.length === 0}
            >
              <Scissors className="mr-1.5 h-3.5 w-3.5" />
              {edit.overlapsFixed ? "Overlaps fixed ✓" : "Fix overlaps"}
            </Button>
            {overlapCount > 0 && !edit.overlapsFixed && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {overlapCount} overlap{overlapCount === 1 ? "" : "s"} detected.
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-lg border bg-background p-4">
            <Label>Renumber entries</Label>
            <p className="text-xs text-muted-foreground">
              Rewrite each entry&apos;s index so they run 1, 2, 3… after any
              removals. Always applied automatically to the output.
            </p>
            <Button
              variant={edit.renumbered ? "default" : "outline"}
              size="sm"
              onClick={toggleRenumber}
              disabled={parsed.length === 0}
            >
              <AlignJustify className="mr-1.5 h-3.5 w-3.5" /> Renumber (auto)
            </Button>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Output:</strong>{" "}
            {finalEntries.length} entries ·{" "}
            {edit.shift !== 0 && (
              <span>
                shifted {edit.shift > 0 ? "+" : ""}
                {edit.shift.toFixed(3)}s ·{" "}
              </span>
            )}
            {edit.overlapsFixed && <span>overlaps fixed · </span>}
            {byteLength(output)} bytes
          </div>
        </div>
      </div>

      {/* Entry table */}
      {parsed.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Entries ({finalEntries.length} of{" "}
              {parsed.length})
            </span>
          </SectionLabel>
          <p className="mt-1 text-xs text-muted-foreground">
            Edit timings and text inline. Click the trash icon to remove an
            entry — it disappears from the output but you can restore it from
            the removed list below.
          </p>

          <div className="mt-3 max-h-[480px] overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/95 backdrop-blur">
                <tr className="text-left text-xs">
                  <th className="px-2 py-2 font-medium text-muted-foreground">#</th>
                  <th className="px-2 py-2 font-medium text-muted-foreground">Start</th>
                  <th className="px-2 py-2 font-medium text-muted-foreground">End</th>
                  <th className="px-2 py-2 font-medium text-muted-foreground">Text</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((e, origIdx) => {
                  const removed = edit.removedIds.has(origIdx);
                  const startVal =
                    edit.editedStart[origIdx] ?? formatSrtTime(e.start);
                  const endVal = edit.editedEnd[origIdx] ?? formatSrtTime(e.end);
                  const textVal = edit.editedText[origIdx] ?? e.text;
                  const overlapsNext =
                    origIdx < parsed.length - 1 &&
                    e.end > parsed[origIdx + 1].start;
                  return (
                    <tr
                      key={origIdx}
                      className={`border-t align-top ${
                        removed ? "opacity-40" : ""
                      } ${overlapsNext ? "bg-amber-500/5" : ""}`}
                    >
                      <td className="px-2 py-2 font-mono text-xs text-muted-foreground">
                        {origIdx + 1}
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          value={startVal}
                          onChange={(ev) =>
                            editField(origIdx, "editedStart", ev.target.value)
                          }
                          className="h-8 w-32 font-mono text-xs"
                          disabled={removed}
                          aria-label={`Entry ${origIdx + 1} start`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          value={endVal}
                          onChange={(ev) =>
                            editField(origIdx, "editedEnd", ev.target.value)
                          }
                          className="h-8 w-32 font-mono text-xs"
                          disabled={removed}
                          aria-label={`Entry ${origIdx + 1} end`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Textarea
                          value={textVal}
                          onChange={(ev) =>
                            editField(origIdx, "editedText", ev.target.value)
                          }
                          className="min-h-[40px] text-xs"
                          disabled={removed}
                          aria-label={`Entry ${origIdx + 1} text`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        {removed ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => restoreEntry(origIdx)}
                            className="text-xs"
                          >
                            Restore
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeEntry(origIdx)}
                            aria-label={`Remove entry ${origIdx + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Output */}
      {finalEntries.length > 0 && (
        <div className="rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Modified SRT output</SectionLabel>
            <div className="flex gap-1">
              <CopyButton value={output} size="sm" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const name = fileName.endsWith(".srt")
                    ? fileName.replace(/\.srt$/i, "-edited.srt")
                    : "subtitles-edited.srt";
                  downloadText(name, output, "application/x-subrip");
                  toast.success(`Downloaded ${name}`);
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Save .srt
              </Button>
            </div>
          </div>
          <pre className="mt-3 max-h-80 overflow-auto rounded-md border bg-background p-3 font-mono text-xs leading-relaxed">
            {output}
          </pre>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Paste an SRT subtitle file or upload one from disk, then shift all timings by ±N seconds, fix overlapping entries, renumber after removals, and edit any entry inline. Export the modified SRT with one click — all in your browser, no uploads.",
    tool: toolBody,
    howTo: [
      {
        title: "Load your SRT file",
        description:
          "Either drop an .srt file into the upload zone or paste the content directly. The parser handles BOMs, CRLF line endings and missing index lines.",
      },
      {
        title: "Shift all timings",
        description:
          "Use the +/- buttons to nudge every entry by 1s or 0.1s, or type an exact decimal value. Negative values shift backwards; times clamp at 0.",
      },
      {
        title: "Fix overlaps and renumber",
        description:
          "Click Fix overlaps to clip each entry's end to the next entry's start. Renumber is always applied to the output so indices stay sequential after removals.",
      },
      {
        title: "Edit or remove individual entries",
        description:
          "Edit timings and text inline in the table. Click the trash icon to remove an entry — it disappears from the output but you can restore it from the removed row.",
      },
      {
        title: "Export the modified SRT",
        description:
          "Click Copy to grab the output, or Save .srt to download it as a file with the original name plus '-edited'.",
      },
    ],
    useCases: [
      "Sync subtitles that are a few seconds early or late.",
      "Fix SRT files where automatic transcription has overlapping entries.",
      "Strip sponsor segments by removing the relevant entries.",
      "Edit typo-riddled auto-generated subtitles in place.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Only the SRT format is supported (WebVTT .vtt files need their{" "}
          <code>WEBVTT</code> header removed and their <code>.</code> decimal
          separators converted to <code>,</code> first).
        </li>
        <li>
          Inline edits to start/end times accept only the{" "}
          <code>HH:MM:SS,mmm</code> format. Invalid edits are silently ignored
          in the output.
        </li>
        <li>
          The maximum file size is 1 MB. Larger files would block the main
          thread — split them first.
        </li>
        <li>
          Style tags (<code>&lt;i&gt;</code>, <code>&lt;b&gt;</code>) and
          positioning are preserved as-is in the text but not validated.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Can I shift subtitles by a fractional second?",
        a: "Yes. Type a decimal like -0.5 or 2.3 in the shift field, or use the chevron buttons for ±0.1s steps. The output uses millisecond precision (HH:MM:SS,mmm).",
      },
      {
        q: "What does 'Fix overlaps' do?",
        a: "It clips each entry's end time so it doesn't overlap the next entry's start, leaving a 1ms gap. This is what most players expect — overlapping subtitles can render on top of each other.",
      },
      {
        q: "Why are my edits not appearing in the output?",
        a: "Inline start/end edits must be in the HH:MM:SS,mmm format (e.g. 00:00:04,500). If the format is invalid we keep the original timing rather than guessing.",
      },
      {
        q: "Can I undo an entry removal?",
        a: "Yes — removed rows stay visible at 40% opacity with a Restore button. Click it to bring the entry back.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

// ── Local SRT timestamp parser (avoids circular import confusion) ──────────
function parseSrtTimeLocal(raw: string): number | null {
  const s = raw.trim();
  const m = s.match(/^(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})$/);
  if (!m) return null;
  const [, h, mi, se, ms] = m;
  return (
    parseInt(h, 10) * 3600 +
    parseInt(mi, 10) * 60 +
    parseInt(se, 10) +
    parseInt(ms.padEnd(3, "0"), 10) / 1000
  );
}
