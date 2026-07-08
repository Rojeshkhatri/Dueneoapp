"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Hash, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

const TIKTOK_LIMIT = 2200;

/** Extract #hashtags (letters, digits, underscores, emoji allowed). */
function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\p{L}\p{N}_]+/gu);
  return matches ?? [];
}

/** Strip hashtags out of a caption, returning the clean body text. */
function stripHashtags(text: string): string {
  return text.replace(/#[\p{L}\p{N}_]+/gu, "").replace(/[ \t]+/g, " ").trim();
}

/** Count the number of "words" in a string (Unicode-aware). */
function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  const matches = cleaned.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu);
  return matches ? matches.length : 0;
}

/** Count the number of lines in a string. */
function countLines(text: string): number {
  if (!text) return 0;
  return text.split(/\r\n|\r|\n/).length;
}

/** Format the final caption: clean body + grouped hashtags at the end. */
function formatCaption(text: string): string {
  const body = stripHashtags(text);
  const hashtags = extractHashtags(text);
  if (hashtags.length === 0) return body;
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const h of hashtags) {
    const key = h.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(h);
    }
  }
  const separator = body ? "\n\n" : "";
  return `${body}${separator}${deduped.join(" ")}`;
}

export function TiktokCaptionFormatter({ tool }: { tool: ToolDefinition }) {
  const [caption, setCaption] = React.useState<string>(
    "Day 12 of learning to code 👩‍💻\nToday I built my first React app! So proud of this moment.\n\n#learnreact #coding #developer #100daysofcode #codingjourney #womenintech #react #learntocode #developer #coding"
  );

  const stats = React.useMemo(() => {
    const formatted = formatCaption(caption);
    const hashtags = extractHashtags(caption);
    const unique = new Set(hashtags.map((h) => h.toLowerCase()));
    const duplicateCount = hashtags.length - unique.size;
    const chars = caption.length;
    const remaining = TIKTOK_LIMIT - chars;
    return {
      formatted,
      hashtags,
      uniqueCount: unique.size,
      duplicateCount,
      chars,
      remaining,
      words: countWords(caption),
      lines: countLines(caption),
      over: chars > TIKTOK_LIMIT,
    };
  }, [caption]);

  const reset = () => {
    setCaption("");
    toast.info("Caption cleared.");
  };

  const copyFormatted = () => {
    if (!stats.formatted) {
      toast.error("Nothing to copy yet.");
      return;
    }
    navigator.clipboard
      .writeText(stats.formatted)
      .then(() => toast.success("Formatted caption copied."))
      .catch(() => toast.error("Could not copy to clipboard."));
  };

  const autoFormat = () => {
    setCaption(stats.formatted);
    toast.success("Caption auto-formatted.");
  };

  const charColor = stats.over
    ? "text-rose-600 dark:text-rose-400"
    : stats.remaining < 200
    ? "text-amber-600 dark:text-amber-400"
    : "text-emerald-600 dark:text-emerald-400";

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Editor */}
        <div className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <Label htmlFor="tt-caption">Your caption</Label>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear
            </Button>
          </div>
          <Textarea
            id="tt-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Type your TikTok caption and hashtags here…"
            className="min-h-[220px] resize-y font-sans"
            maxLength={TIKTOK_LIMIT + 500}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className={`font-mono font-semibold ${charColor}`}>
              {stats.chars.toLocaleString()} / {TIKTOK_LIMIT.toLocaleString()} characters
              {stats.over
                ? ` · ${Math.abs(stats.remaining)} over`
                : ` · ${stats.remaining.toLocaleString()} left`}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{stats.words} words</Badge>
              <Badge variant="secondary">{stats.lines} lines</Badge>
              <Badge variant="secondary">{stats.hashtags.length} hashtags</Badge>
              <Badge variant="secondary">{stats.uniqueCount} unique</Badge>
              {stats.duplicateCount > 0 && (
                <Badge variant="destructive">{stats.duplicateCount} duplicate{stats.duplicateCount === 1 ? "" : "s"}</Badge>
              )}
            </div>
          </div>
          {stats.over && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <strong>Over the TikTok limit.</strong> Trim {Math.abs(stats.remaining)} characters before posting or TikTok will block the caption.
            </p>
          )}
        </div>

        {/* Preview */}
        <div className="space-y-3 rounded-xl border bg-background p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Preview</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={autoFormat}>
                <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Auto-format
              </Button>
              <CopyButton value={stats.formatted} size="sm" />
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
            {/* Mock TikTok video area */}
            <div className="relative aspect-[9/16] max-h-[280px] w-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900">
              <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500">
                Video preview area
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 text-[10px] font-semibold text-white drop-shadow">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="h-7 w-7 rounded-full bg-zinc-500" />
                  <div className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[8px]">+</div>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span>♥</span>
                  <span>1.2K</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span>💬</span>
                  <span>34</span>
                </div>
              </div>
            </div>
            {/* Caption text */}
            <div className="p-3">
              <p className="mb-1 text-xs font-semibold">@yourhandle</p>
              <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                {stats.formatted ? (
                  <>
                    {stripHashtags(caption).trim()}
                    {stats.hashtags.length > 0 && (
                      <span className="mt-1 block">
                        {Array.from(new Set(stats.hashtags.map((h) => h.toLowerCase())))
                          .map((h) => stats.hashtags.find((x) => x.toLowerCase() === h)!)
                          .map((h) => (
                            <span key={h} className="mr-1 text-sky-600 dark:text-sky-400">
                              {h}
                            </span>
                          ))}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">Your formatted caption will appear here…</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hashtag panel */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-1.5">
            <Hash className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Hashtags detected</h3>
            <Badge variant="secondary" className="ml-auto">{stats.hashtags.length}</Badge>
          </div>
          {stats.hashtags.length === 0 ? (
            <p className="text-xs text-muted-foreground">No hashtags yet — add some with a leading # to group them at the end of your caption.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {stats.hashtags.map((h, i) => (
                <span
                  key={`${h}-${i}`}
                  className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                >
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">What the formatter does</h3>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>• Strips hashtags out of the body text.</li>
            <li>• De-duplicates hashtags (case-insensitive).</li>
            <li>• Groups them at the end with a blank line separator.</li>
            <li>• Counts characters, words, lines, hashtags and duplicates against the 2,200-character TikTok limit.</li>
          </ul>
          <Button size="sm" variant="outline" className="w-full" onClick={copyFormatted}>
            Copy formatted caption
          </Button>
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Write a TikTok caption and instantly see character, word, line and hashtag counts against the 2,200-character limit. The formatter pulls every #hashtag out of the body text, de-duplicates them, and groups them at the end with a clean blank line — the layout TikTok’s algorithm and readers both prefer. Preview the result on a mock TikTok card and copy it ready to paste.",
    tool: toolBody,
    howTo: [
      {
        title: "Type your caption",
        description:
          "Paste or write your caption and hashtags in the editor. Hashtags can go anywhere — the formatter will collect them.",
      },
      {
        title: "Watch the counts",
        description:
          "The character counter turns amber under 200 characters remaining and red when you exceed the 2,200-character TikTok limit.",
      },
      {
        title: "Auto-format",
        description:
          "Click Auto-format to strip hashtags from the body, de-duplicate them, and regroup them at the end of the caption.",
      },
      {
        title: "Copy and paste",
        description:
          "Use Copy formatted caption to grab the cleaned caption with hashtags grouped at the bottom, ready to paste into TikTok.",
      },
    ],
    useCases: [
      "Make sure your caption stays under TikTok’s 2,200-character cap before publishing.",
      "Move scattered hashtags to the end of your caption so the body reads cleanly.",
      "Spot duplicate hashtags that look spammy and hurt reach.",
      "Get an instant word and line count when scripting captions for client review.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The 2,200-character limit is TikTok’s current published maximum for caption text — TikTok occasionally revises it and applies different limits in some regions.</li>
        <li>The TikTok preview is a mock — actual fonts, colours and spacing vary by device and TikTok app version.</li>
        <li>Hashtag detection requires a leading # character. Plain words are not treated as hashtags.</li>
        <li>The formatter does not transliterate hashtags, suggest trending tags, or check whether a tag is banned on TikTok.</li>
      </ul>
    ),
    faq: [
      {
        q: "What is TikTok’s caption character limit?",
        a: "2,200 characters including spaces and hashtags. This tool shows a live count against that limit and warns you when you go over.",
      },
      {
        q: "Why group hashtags at the end?",
        a: "TikTok reads the whole caption, but a clean body reads better to humans and lets the algorithm focus on the body text first. Grouping hashtags at the bottom with a blank line is the convention used by most high-performing accounts.",
      },
      {
        q: "How many hashtags should I use on TikTok?",
        a: "TikTok does not publish a hard cap, but 3–5 relevant hashtags per post is a common sweet spot. Spamming 20+ hashtags can hurt reach. Use the duplicate counter to catch accidental repeats.",
      },
      {
        q: "Does this tool suggest hashtags?",
        a: "No — for suggestions, use the dedicated Hashtag Analyzer. This tool only formats and counts what you write.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
