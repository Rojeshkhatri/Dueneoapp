"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
  Smartphone,
  Type,
  AlignLeft,
  Maximize2,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { downloadText, SectionLabel } from "./_content-helpers";

const SAMPLE =
  "POV: you just discovered the fastest way to grow on TikTok in 2025 — and it's not what you think. Save this before it disappears.";

type LineBreakMode = "soft" | "hard";
type Alignment = "left" | "center" | "right";

interface LineInfo {
  text: string;
  chars: number;
}

function breakLines(
  text: string,
  maxChars: number,
  mode: LineBreakMode,
): LineInfo[] {
  if (!text.trim()) return [];
  // Normalise whitespace inside the source so each "word" is well-formed.
  const normalised = text.replace(/\s+/g, " ").trim();
  const words = normalised.split(" ");
  const lines: LineInfo[] = [];
  let current = "";

  for (const word of words) {
    if (current === "") {
      current = word;
      continue;
    }
    const candidate = current + " " + word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      lines.push({ text: current, chars: current.length });
      current = word;
    }
  }
  if (current !== "") {
    lines.push({ text: current, chars: current.length });
  }

  // Hard mode: any single word longer than maxChars gets force-split.
  if (mode === "hard") {
    const out: LineInfo[] = [];
    for (const line of lines) {
      if (line.chars <= maxChars) {
        out.push(line);
        continue;
      }
      // The line contains a single very long word — split it.
      let s = line.text;
      while (s.length > maxChars) {
        out.push({ text: s.slice(0, maxChars), chars: maxChars });
        s = s.slice(maxChars);
      }
      if (s.length > 0) out.push({ text: s, chars: s.length });
    }
    return out;
  }

  return lines;
}

export function CaptionLineBreaker({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState<string>(SAMPLE);
  const [maxChars, setMaxChars] = React.useState<number>(28);
  const [mode, setMode] = React.useState<LineBreakMode>("soft");
  const [alignment, setAlignment] = React.useState<Alignment>("center");
  const [uppercase, setUppercase] = React.useState<boolean>(false);
  const [showChars, setShowChars] = React.useState<boolean>(true);
  const [previewBg, setPreviewBg] = React.useState<"light" | "dark">("dark");

  const lines = React.useMemo(() => {
    const processed = uppercase
      ? input.replace(/\s+/g, " ").toUpperCase()
      : input;
    return breakLines(processed, maxChars, mode);
  }, [input, maxChars, mode, uppercase]);

  const output = lines.map((l) => l.text).join("\n");

  const maxLineChars = React.useMemo(
    () => lines.reduce((m, l) => Math.max(m, l.chars), 0),
    [lines],
  );
  const overLimit = lines.filter((l) => l.chars > maxChars).length;

  const reset = () => {
    setInput(SAMPLE);
    setMaxChars(28);
    setMode("soft");
    setAlignment("center");
    setUppercase(false);
    setShowChars(true);
    setPreviewBg("dark");
    toast.info("Reset.");
  };

  const alignmentClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[alignment];

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Input + settings */}
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Caption</SectionLabel>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your caption text…"
            className="min-h-[120px] text-sm"
            aria-label="Caption input"
          />

          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <SectionLabel>Settings</SectionLabel>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <Label htmlFor="clb-maxchars" className="text-muted-foreground">
                  Max characters per line
                </Label>
                <span className="font-mono font-medium">{maxChars}</span>
              </div>
              <Slider
                id="clb-maxchars"
                value={[maxChars]}
                onValueChange={(v) => setMaxChars(v[0] ?? 28)}
                min={12}
                max={60}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                28 chars is the standard for short-form video captions (Reels,
                TikTok, Shorts). Longer lines wrap awkwardly on phones.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clb-mode">Break mode</Label>
                <Select
                  value={mode}
                  onValueChange={(v) => setMode(v as LineBreakMode)}
                >
                  <SelectTrigger id="clb-mode" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soft">
                      Soft — never split words
                    </SelectItem>
                    <SelectItem value="hard">
                      Hard — force-split long words
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clb-align">Preview alignment</Label>
                <Select
                  value={alignment}
                  onValueChange={(v) => setAlignment(v as Alignment)}
                >
                  <SelectTrigger id="clb-align" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={uppercase}
                  onCheckedChange={setUppercase}
                  aria-label="Uppercase"
                />
                <span>UPPERCASE</span>
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={showChars}
                  onCheckedChange={setShowChars}
                  aria-label="Show character counts"
                />
                <span>Show char counts</span>
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={previewBg === "dark"}
                  onCheckedChange={(v) => setPreviewBg(v ? "dark" : "light")}
                  aria-label="Dark preview background"
                />
                <span>Dark preview BG</span>
              </label>
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Output</SectionLabel>
            <div className="flex gap-1">
              <CopyButton value={output} size="sm" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  downloadText("captions.txt", output);
                  toast.success("Downloaded captions.txt");
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Save
              </Button>
            </div>
          </div>

          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Type a caption on the left to see line-broken output.
            </p>
          ) : (
            <>
              <div className="rounded-md border bg-background p-4">
                <div className="space-y-1">
                  {lines.map((l, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 font-mono text-xs"
                    >
                      <span className="w-6 flex-none text-right text-[10px] text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="flex-1 break-all">{l.text}</span>
                      <span
                        className={`flex-none text-[10px] ${
                          l.chars > maxChars
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {l.chars}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md border bg-background p-2">
                  <div className="text-muted-foreground">Lines</div>
                  <div className="font-mono text-lg font-bold">
                    {lines.length}
                  </div>
                </div>
                <div className="rounded-md border bg-background p-2">
                  <div className="text-muted-foreground">Max chars</div>
                  <div className="font-mono text-lg font-bold">
                    {maxLineChars}
                  </div>
                </div>
                <div className="rounded-md border bg-background p-2">
                  <div className="text-muted-foreground">Over limit</div>
                  <div
                    className={`font-mono text-lg font-bold ${
                      overLimit > 0 ? "text-destructive" : "text-emerald-500"
                    }`}
                  >
                    {overLimit}
                  </div>
                </div>
              </div>

              <div className="rounded-md border bg-background p-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  Plain text (copy-paste into your video editor)
                </div>
                <pre className="overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">
                  {output}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 9:16 Preview */}
      {lines.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" /> 9:16 preview
              </span>
            </SectionLabel>
            <span className="text-xs text-muted-foreground">
              Roughly how the caption will appear mid-screen on a phone.
            </span>
          </div>

          <div className="mt-3 flex justify-center">
            <div
              className={`relative aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-xl border ${
                previewBg === "dark"
                  ? "bg-neutral-950 border-neutral-800"
                  : "bg-white border-neutral-200"
              }`}
            >
              {/* Subtle phone-frame guides */}
              <div
                className={`absolute inset-x-3 top-3 h-1 rounded-full ${
                  previewBg === "dark" ? "bg-neutral-800" : "bg-neutral-200"
                }`}
              />
              <div
                className={`absolute inset-x-3 bottom-3 h-1 rounded-full ${
                  previewBg === "dark" ? "bg-neutral-800" : "bg-neutral-200"
                }`}
              />

              {/* Vertical centre area where captions typically appear */}
              <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-stretch px-3">
                <div
                  className={`mx-auto inline-block max-w-full rounded-md px-3 py-2 ${
                    previewBg === "dark"
                      ? "bg-black/60"
                      : "bg-white/80 shadow-sm"
                  }`}
                >
                  <div
                    className={`space-y-0.5 font-bold leading-snug ${alignmentClass} ${
                      previewBg === "dark" ? "text-white" : "text-neutral-900"
                    }`}
                    style={{ fontSize: "13px" }}
                  >
                    {lines.map((l, i) => (
                      <div key={i} className="break-words">
                        {l.text}
                        {showChars && (
                          <span
                            className={`ml-1.5 align-top text-[8px] font-mono ${
                              previewBg === "dark"
                                ? "text-neutral-500"
                                : "text-neutral-400"
                            }`}
                          >
                            {l.chars}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Frame label */}
              <div
                className={`absolute bottom-6 left-0 right-0 text-center text-[10px] ${
                  previewBg === "dark" ? "text-neutral-600" : "text-neutral-400"
                }`}
              >
                9:16 short-form frame · {maxChars} chars/line
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <HintCard
              icon={<Type className="h-3.5 w-3.5" />}
              title="Keep ≤ 28 chars"
              body="Most phones fit 28 chars per line in captions without wrapping. Lower for older audiences."
            />
            <HintCard
              icon={<AlignLeft className="h-3.5 w-3.5" />}
              title="Break on words"
              body="Never split a word mid-character — viewers read in word-chunks, not letter-chunks."
            />
            <HintCard
              icon={<Maximize2 className="h-3.5 w-3.5" />}
              title="Centre for short-form"
              body="Centre-aligned captions work best for vertical video. Use left-align for talking-head captions."
            />
          </div>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Break a long caption into readable lines for short-form video (Reels, TikTok, Shorts). Set the max characters per line (28 by default), choose soft or hard break mode, see character counts per line, and preview the result as an overlay on a 9:16 phone frame before you copy or download.",
    tool: toolBody,
    howTo: [
      {
        title: "Paste your caption",
        description:
          "Drop in your full caption text. We'll normalise whitespace and split on word boundaries.",
      },
      {
        title: "Set max characters per line",
        description:
          "28 is the short-form video standard. Lower it for older audiences, raise it for desktop-first content. Watch the 'Over limit' counter — anything above 0 means a word didn't fit.",
      },
      {
        title: "Choose soft or hard break mode",
        description:
          "Soft mode never splits words (recommended). Hard mode force-splits long words character-by-character when nothing else fits — useful for URLs or long hashtags.",
      },
      {
        title: "Preview on the 9:16 frame",
        description:
          "The phone-frame preview shows roughly how the caption will appear mid-screen on a vertical video. Toggle dark/light background to match your video.",
      },
      {
        title: "Copy or download",
        description:
          "Click Copy to grab the line-broken text, or Save to download as captions.txt. Paste directly into CapCut, Premiere, or your video editor of choice.",
      },
    ],
    useCases: [
      "Format Reels / TikTok / Shorts captions for maximum readability.",
      "Split a long script line into on-screen text chunks.",
      "Generate captions for accessibility overlays on social video.",
      "Test how a caption will look before recording the video.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The 9:16 preview is approximate — actual rendering depends on your
          video editor&apos;s font, size, position and padding. Use it as a
          sanity check, not a pixel-perfect preview.
        </li>
        <li>
          Soft break mode may produce lines longer than the max if a single
          word exceeds the limit (e.g. a long URL). Switch to hard mode to
          force-split.
        </li>
        <li>
          The tool normalises whitespace (collapses runs of spaces/newlines
          into single spaces). If your caption relies on intentional double
          spacing, preserve it manually after copying.
        </li>
        <li>
          Emoji width varies by font and platform — a line with emoji may
          render shorter or longer than the character count suggests.
        </li>
        <li>
          No SRT or ASS export — output is plain text. Use the subtitle timing
          editor for captioned video files.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why 28 characters per line?",
        a: "28 is the sweet spot for short-form video on phones. At typical caption font sizes (14–18px), 28 chars fit comfortably within the safe area of a 9:16 frame without wrapping or getting cut off by engagement UI (likes, comments).",
      },
      {
        q: "What's the difference between soft and hard break mode?",
        a: "Soft mode never splits a word — if the next word doesn't fit on the current line, it starts a new line. This can produce a line longer than max chars if a single word exceeds the limit. Hard mode force-splits long words character-by-character to stay under the limit.",
      },
      {
        q: "Should I use UPPERCASE for captions?",
        a: "It depends. Uppercase is more legible at small sizes and is standard for short-form video captions on TikTok and Reels. Mixed case is better for longer reading (YouTube CC, accessibility overlays) — it preserves word shape, which speeds up recognition.",
      },
      {
        q: "Can I preview on a 1:1 or 16:9 frame instead?",
        a: "Not in this tool. The 9:16 frame matches the most common short-form use case (Reels, TikTok, Shorts). For 1:1 (Instagram feed) or 16:9 (YouTube), use the same character limit but adjust the line position in your editor.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function HintCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
