"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  RotateCcw,
  Download,
  Film,
  Mic,
  Clapperboard,
  Video,
  AlignLeft,
  Columns2,
  Clock,
  Eye,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { downloadText, SectionLabel } from "./_content-helpers";

const SAMPLE = `[INTRO - 0:00]
HOST (on camera): Hey everyone, welcome back. Today we're building a subtitle editor that runs entirely in the browser.

[B-ROLL: typing on laptop, close-up of code on screen]

HOST (V.O.): The goal is to make a tool that respects user privacy — no uploads, no servers, no tracking.

[MAIN - 0:45]
HOST (on camera): Let's start with the parser. We need to read an SRT file and turn it into structured entries.

[SCREEN RECORDING: code editor showing parseSrt function]

HOST (V.O.): Each block has an index, a time line, and the subtitle text. We split on blank lines.

[CTA - 4:30]
HOST (on camera): If this is useful, smash the like button. Link to the full source in the description.`;

type SegmentType = "scene" | "visual" | "dialogue" | "timestamp" | "other";

interface Segment {
  type: SegmentType;
  /** Raw line content for that segment. */
  raw: string;
  /** Parsed label (scene heading, visual note, speaker, etc.). */
  label: string;
  /** Parsed body (the dialogue text or visual description). */
  body: string;
  /** Optional timestamp string if the segment has one. */
  timestamp?: string;
}

const SCENE_RE = /^\s*(?:\[|(?:INT\.|EXT\.|INT\.\/EXT\.))(.+?)\]?\s*$/i;
const VISUAL_RE = /^\s*\[(.+?)\]\s*$/;
const DIALOGUE_RE = /^\s*([A-Z][A-Z0-9 .'\-]{1,40})(?:\s*\(([^)]+)\))?\s*:\s*(.*)$/;
const TIMESTAMP_RE = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;

function parseScript(input: string): Segment[] {
  const lines = input.split(/\r?\n/);
  const segments: Segment[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") continue;

    // Scene heading: starts with [SOMETHING] or INT./EXT.
    const sceneMatch = line.match(SCENE_RE);
    if (sceneMatch && /^(INT|EXT)/i.test(line)) {
      segments.push({
        type: "scene",
        raw: line,
        label: "Scene",
        body: line,
      });
      continue;
    }
    if (line.startsWith("[") && line.endsWith("]")) {
      const inner = line.slice(1, -1).trim();
      // Scene-style [INTRO - 0:00]
      const tsMatch = inner.match(TIMESTAMP_RE);
      if (tsMatch) {
        segments.push({
          type: "scene",
          raw: line,
          label: "Scene",
          body: inner,
          timestamp: tsMatch[0],
        });
      } else {
        segments.push({
          type: "visual",
          raw: line,
          label: "B-roll / visual",
          body: inner,
        });
      }
      continue;
    }

    // Dialogue: SPEAKER: text or SPEAKER (V.O.): text
    const dialogueMatch = line.match(DIALOGUE_RE);
    if (dialogueMatch) {
      const [, speaker, modifier, text] = dialogueMatch;
      // Only treat as dialogue if there is body text.
      if (text && text.trim().length > 0) {
        segments.push({
          type: "dialogue",
          raw: line,
          label: modifier ? `${speaker.trim()} (${modifier.trim()})` : speaker.trim(),
          body: text.trim(),
        });
        continue;
      }
    }

    // Timestamp-only line or inline timestamp.
    const tsOnly = line.match(TIMESTAMP_RE);
    if (tsOnly && line === tsOnly[0]) {
      segments.push({
        type: "timestamp",
        raw: line,
        label: "Timestamp",
        body: line,
        timestamp: line,
      });
      continue;
    }

    // Default — treat as action/narration line.
    segments.push({
      type: "other",
      raw: line,
      label: "Action",
      body: line,
    });
  }

  return segments;
}

function sceneHeadingFor(seg: Segment, index: number): string {
  // Synthesise a numbered scene heading like "SCENE 1 — INTRO (0:00)".
  if (seg.type === "scene") {
    const label = seg.body.replace(/\s*-\s*\d{1,2}:\d{2}(?::\d{2})?\s*$/i, "").trim();
    return seg.timestamp
      ? `SCENE ${index + 1} — ${label} (${seg.timestamp})`
      : `SCENE ${index + 1} — ${label}`;
  }
  return `SCENE ${index + 1}`;
}

function formatTwoColumn(segments: Segment[]): string {
  const lines: string[] = [];
  lines.push("VISUAL".padEnd(40) + " | AUDIO");
  lines.push("-".repeat(40) + "-+-" + "-".repeat(40));
  for (const seg of segments) {
    if (seg.type === "scene") {
      lines.push("");
      lines.push(
        `[${seg.body}${seg.timestamp ? ` @ ${seg.timestamp}` : ""}]`.padEnd(40) +
          " | ",
      );
      continue;
    }
    if (seg.type === "visual") {
      lines.push(`(B-roll: ${seg.body})`.padEnd(40) + " | ");
      continue;
    }
    if (seg.type === "dialogue") {
      lines.push("".padEnd(40) + ` | ${seg.label}: ${seg.body}`);
      continue;
    }
    if (seg.type === "timestamp") {
      lines.push(`[ ${seg.body} ]`.padEnd(40) + " | ");
      continue;
    }
    // action / narration
    lines.push(`(Action: ${seg.body})`.padEnd(40) + " | ");
  }
  return lines.join("\n");
}

function formatStructured(segments: Segment[]): string {
  const lines: string[] = [];
  let sceneIdx = 0;
  for (const seg of segments) {
    if (seg.type === "scene") {
      sceneIdx++;
      lines.push("");
      lines.push(
        `=== SCENE ${sceneIdx}: ${seg.body}${
          seg.timestamp ? ` @ ${seg.timestamp}` : ""
        } ===`,
      );
      continue;
    }
    if (seg.type === "visual") {
      lines.push(`  [B-ROLL] ${seg.body}`);
      continue;
    }
    if (seg.type === "dialogue") {
      lines.push(`  ${seg.label}: ${seg.body}`);
      continue;
    }
    if (seg.type === "timestamp") {
      lines.push(`  [TIME] ${seg.body}`);
      continue;
    }
    lines.push(`  (action) ${seg.body}`);
  }
  return lines.join("\n").trim();
}

const TYPE_META: Record<
  SegmentType,
  { label: string; icon: React.ReactNode; tone: string }
> = {
  scene: {
    label: "Scene",
    icon: <Clapperboard className="h-3.5 w-3.5" />,
    tone: "border-primary/40 bg-primary/5 text-primary",
  },
  visual: {
    label: "Visual / B-roll",
    icon: <Video className="h-3.5 w-3.5" />,
    tone: "border-sky-500/40 bg-sky-500/5 text-sky-600 dark:text-sky-300",
  },
  dialogue: {
    label: "Dialogue",
    icon: <Mic className="h-3.5 w-3.5" />,
    tone: "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
  },
  timestamp: {
    label: "Timestamp",
    icon: <Clock className="h-3.5 w-3.5" />,
    tone: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  },
  other: {
    label: "Action",
    icon: <Film className="h-3.5 w-3.5" />,
    tone: "border-border bg-muted/40 text-muted-foreground",
  },
};

export function ScriptFormatter({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState<string>(SAMPLE);

  const segments = React.useMemo(() => parseScript(input), [input]);

  const twoColumn = React.useMemo(
    () => formatTwoColumn(segments),
    [segments],
  );
  const structured = React.useMemo(
    () => formatStructured(segments),
    [segments],
  );

  const stats = React.useMemo(() => {
    const counts: Record<SegmentType, number> = {
      scene: 0,
      visual: 0,
      dialogue: 0,
      timestamp: 0,
      other: 0,
    };
    for (const s of segments) counts[s.type]++;
    return counts;
  }, [segments]);

  const reset = () => {
    setInput(SAMPLE);
    toast.info("Reset to sample script.");
  };

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Input */}
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Raw script</SectionLabel>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`[INTRO - 0:00]\nHOST (on camera): Welcome back to the channel.\n\n[B-ROLL: typing on laptop]\nHOST (V.O.): Today we're building a subtitle editor.`}
            className="min-h-[320px] font-mono text-xs"
            spellCheck={false}
            aria-label="Raw script input"
          />
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Format conventions</p>
            <ul className="mt-2 space-y-1">
              <li>
                • <code>[SCENE NAME - timestamp]</code> → scene heading
              </li>
              <li>
                • <code>[B-roll description]</code> → visual / B-roll note
              </li>
              <li>
                • <code>SPEAKER (V.O.): text</code> → dialogue (modifier
                optional)
              </li>
              <li>• Bare <code>M:SS</code> lines → timestamp markers</li>
              <li>• Anything else → action / narration line</li>
            </ul>
          </div>
        </div>

        {/* Output */}
        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Formatted output</SectionLabel>
            <div className="flex gap-1">
              <CopyButton value={twoColumn} size="sm" label="Copy 2-col" />
              <CopyButton value={structured} size="sm" label="Copy text" />
            </div>
          </div>

          {segments.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Paste a script on the left to see the formatted output.
            </p>
          ) : (
            <Tabs defaultValue="two">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="two" className="text-xs">
                  <Columns2 className="mr-1.5 h-3.5 w-3.5" /> Two-column
                </TabsTrigger>
                <TabsTrigger value="text" className="text-xs">
                  <AlignLeft className="mr-1.5 h-3.5 w-3.5" /> Structured text
                </TabsTrigger>
              </TabsList>

              <TabsContent value="two" className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Classic A/V script layout — visuals on the left, audio /
                  dialogue on the right.
                </p>
                <pre className="max-h-[400px] overflow-auto rounded-md border bg-background p-3 font-mono text-[11px] leading-relaxed">
                  {twoColumn}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    downloadText("script-twocolumn.txt", twoColumn);
                    toast.success("Downloaded script-twocolumn.txt");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save two-column
                </Button>
              </TabsContent>

              <TabsContent value="text" className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Linear text format with scene headings and inline B-roll
                  notes — good for handing to a teleprompter.
                </p>
                <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap rounded-md border bg-background p-3 text-xs leading-relaxed">
                  {structured}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    downloadText("script-formatted.txt", structured);
                    toast.success("Downloaded script-formatted.txt");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save structured
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Segment overview */}
      {segments.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Parsed segments
              </span>
            </SectionLabel>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {(["scene", "visual", "dialogue", "timestamp", "other"] as const).map(
                (t) =>
                  stats[t] > 0 ? (
                    <span
                      key={t}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${TYPE_META[t].tone}`}
                    >
                      {TYPE_META[t].icon}
                      {TYPE_META[t].label}
                      <strong className="ml-1 font-mono">{stats[t]}</strong>
                    </span>
                  ) : null,
              )}
            </div>
          </div>

          <div className="mt-3 max-h-[400px] overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/95 backdrop-blur">
                <tr className="text-left text-xs">
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    #
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    Content
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {segments.map((seg, idx) => {
                  const meta = TYPE_META[seg.type];
                  return (
                    <tr key={idx} className="border-t align-top">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium ${meta.tone}`}
                        >
                          {meta.icon}
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {seg.type === "dialogue" ? (
                          <>
                            <strong className="text-foreground">{seg.label}:</strong>{" "}
                            <span>{seg.body}</span>
                          </>
                        ) : (
                          <span>{seg.body}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {seg.timestamp ?? ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Paste your raw video or podcast script and the formatter splits it into scene headings, B-roll / visual notes, dialogue, timestamps and action lines. Export as a classic two-column A/V script (visual | audio) or as structured linear text — perfect for handing to a teleprompter or co-producer.",
    tool: toolBody,
    howTo: [
      {
        title: "Paste your raw script",
        description:
          "Use the conventions shown in the sample: [SCENE - timestamp] for scene headings, [B-roll description] for visuals, SPEAKER (modifier): text for dialogue.",
      },
      {
        title: "Review the parsed segments",
        description:
          "The Parsed segments table shows every line classified as a scene, visual, dialogue, timestamp or action line — so you can spot anything that didn't parse the way you intended.",
      },
      {
        title: "Pick an output format",
        description:
          "Two-column A/V layout (visual on the left, audio on the right) or structured text with scene headings and inline B-roll notes.",
      },
      {
        title: "Copy or download",
        description:
          "Use the Copy buttons to grab either format, or click Save to download as a .txt file.",
      },
    ],
    useCases: [
      "Turn a rough draft into a clean A/V script for a video shoot.",
      "Convert a podcast script into teleprompter-ready text.",
      "Hand off a structured script to an editor with clear B-roll notes.",
      "Audit an existing script to make sure every scene has visual variety.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The parser is line-based — multi-line dialogue (one speaker talking
          across several paragraphs) is treated as separate dialogue lines.
          Join them in the source if you want them grouped.
        </li>
        <li>
          Speaker names must be in ALL CAPS or Title Case followed by a colon
          to be recognised as dialogue. Lowercase speaker names are treated as
          action lines.
        </li>
        <li>
          Scene headings must be wrapped in <code>[brackets]</code> or use the
          standard <code>INT.</code> / <code>EXT.</code> screenplay prefix.
          Plain <code>SCENE 1:</code> without brackets is not recognised.
        </li>
        <li>
          The two-column layout uses fixed 40-char columns. Long B-roll
          descriptions or dialogue lines will overflow — wrap them manually in
          the source.
        </li>
        <li>
          No PDF or Fountain export — output is plain text. Paste into Google
          Docs or a screenwriting tool for further formatting.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What's the difference between the two output formats?",
        a: "Two-column is the classic A/V script layout — visuals on the left, audio on the right, separated by a pipe. It's what professional video producers hand to editors. Structured text is a linear format with scene headings and inline B-roll notes — better for teleprompters or sharing as a document.",
      },
      {
        q: "How does it detect dialogue vs action lines?",
        a: "Dialogue is a line that matches 'SPEAKER:' or 'SPEAKER (modifier):' where SPEAKER is in ALL CAPS or Title Case. Anything else (including lowercase narration) is treated as an action line. If your speakers use lowercase names, capitalise them in the source.",
      },
      {
        q: "Can I use Fountain screenplay format?",
        a: "Not directly. Fountain uses different conventions (e.g. scene headings start with INT./EXT. on a bare line, character names are forced uppercase by a leading tab). This formatter only recognises bracketed scene headings and `SPEAKER:` dialogue — convert your Fountain file first.",
      },
      {
        q: "Why are my B-roll notes not appearing in the two-column output?",
        a: "B-roll notes must be wrapped in square brackets on their own line: `[B-roll: typing on laptop]`. If they're inline with dialogue or unbracketed, the parser treats them as action lines and they appear under the visual column with an 'Action:' prefix instead.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
