"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { AtSign, Hash, RotateCcw, Twitter } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

const TWITTER_LIMIT = 280;

/**
 * Split a long string into tweets of at most `maxChars` characters, breaking
 * on word boundaries. Honours explicit blank-line paragraph breaks (each
 * blank line forces a new tweet). Returns an array of strings.
 */
function splitIntoTweets(text: string, maxChars: number): string[] {
  const cleaned = text.replace(/\r/g, "");
  if (!cleaned.trim()) return [];
  // Split on blank lines first so paragraphs stay together where possible.
  const paragraphs = cleaned.split(/\n\s*\n/);
  const tweets: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) tweets.push(current.trim());
    current = "";
  };

  const tryAdd = (chunk: string) => {
    // If chunk alone is too long, split it word-by-word.
    if (chunk.length > maxChars) {
      const words = chunk.split(/\s+/);
      for (const word of words) {
        if ((current + (current ? " " : "") + word).length > maxChars) {
          flush();
          // Word itself may be longer than maxChars — hard-split it.
          if (word.length > maxChars) {
            for (let i = 0; i < word.length; i += maxChars) {
              tweets.push(word.slice(i, i + maxChars));
            }
          } else {
            current = word;
          }
        } else {
          current += (current ? " " : "") + word;
        }
      }
    } else {
      // Try to append chunk to current tweet.
      const candidate = current ? `${current} ${chunk}` : chunk;
      if (candidate.length > maxChars) {
        flush();
        current = chunk;
      } else {
        current = candidate;
      }
    }
  };

  for (const para of paragraphs) {
    // Normalise internal single newlines to spaces.
    const normalised = para.replace(/\s*\n\s*/g, " ").trim();
    if (!normalised) continue;
    tryAdd(normalised);
  }
  flush();
  return tweets;
}

export function TwitterThreadFormatter({ tool }: { tool: ToolDefinition }) {
  const [text, setText] = React.useState<string>(
    "Writing a long post? Threads are how ideas spread on X.\n\nThe trick is to keep each tweet under 280 characters, break on word boundaries, and number each tweet so readers can follow along.\n\nThis tool does all of that for you — paste your draft, pick your options, and copy a ready-to-post thread. You can add the 🧵 thread emoji at the end of the first tweet so readers know it's a thread.\n\nTry editing the text on the left and watch the thread rebuild itself on the right."
  );
  const [numbered, setNumbered] = React.useState<boolean>(true);
  const [threadEmoji, setThreadEmoji] = React.useState<boolean>(true);
  const [showTotals, setShowTotals] = React.useState<boolean>(true);
  const [prefix, setPrefix] = React.useState<string>("");

  const tweets = React.useMemo(() => {
    const base = splitIntoTweets(text, TWITTER_LIMIT);
    const total = base.length;
    return base.map((t, i) => {
      const numberLabel = numbered && total > 1 ? `${i + 1}/${total} ` : "";
      const emojiLabel =
        threadEmoji && i === 0 && total > 1 ? " 🧵" : "";
      const prefixLabel = prefix && i === 0 ? `${prefix} ` : "";
      // If adding the prefix + number label + emoji + tweet overflows, we may
      // need to trim. Reserve space for the labels.
      const reserved = (numberLabel.length) + (emojiLabel.length) + prefixLabel.length;
      const available = TWITTER_LIMIT - reserved;
      let body = t;
      if (body.length > available) {
        body = body.slice(0, available - 1).trimEnd() + "…";
      }
      return {
        index: i + 1,
        text: `${prefixLabel}${numberLabel}${body}${emojiLabel}`,
        bodyLength: body.length,
        length: `${prefixLabel}${numberLabel}${body}${emojiLabel}`.length,
      };
    });
  }, [text, numbered, threadEmoji, prefix]);

  const fullThread = React.useMemo(
    () => tweets.map((t) => t.text).join("\n\n---\n\n"),
    [tweets]
  );

  const copyThread = () => {
    if (tweets.length === 0) {
      toast.error("Nothing to copy yet.");
      return;
    }
    navigator.clipboard
      .writeText(fullThread)
      .then(() => toast.success(`Copied ${tweets.length} tweet${tweets.length === 1 ? "" : "s"} as a thread.`))
      .catch(() => toast.error("Could not copy to clipboard."));
  };

  const copySingle = (i: number) => {
    const t = tweets[i];
    if (!t) return;
    navigator.clipboard
      .writeText(t.text)
      .then(() => toast.success(`Tweet ${i + 1} copied.`))
      .catch(() => toast.error("Could not copy."));
  };

  const reset = () => {
    setText("");
    setPrefix("");
    toast.info("Text cleared.");
  };

  const overLimitCount = tweets.filter((t) => t.length > TWITTER_LIMIT).length;

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Input */}
        <div className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <Label htmlFor="tw-input">Your long text</Label>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear
            </Button>
          </div>
          <Textarea
            id="tw-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your blog post, article draft, or long thought here…"
            className="min-h-[260px] resize-y"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tw-prefix" className="text-xs">First-tweet prefix (optional)</Label>
              <Input
                id="tw-prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="e.g. 🧵 A thread:"
                maxLength={40}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex flex-col justify-end gap-1.5">
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={numbered} onCheckedChange={setNumbered} />
                Number tweets (1/N)
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={threadEmoji} onCheckedChange={setThreadEmoji} />
                Add 🧵 to first tweet
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={showTotals} onCheckedChange={setShowTotals} />
                Show character counts
              </label>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">
              <Twitter className="mr-1 h-3 w-3" /> {tweets.length} tweet{tweets.length === 1 ? "" : "s"}
            </Badge>
            <Badge variant="secondary">{text.length.toLocaleString()} chars input</Badge>
            {overLimitCount > 0 && (
              <Badge variant="destructive">{overLimitCount} over limit</Badge>
            )}
          </div>
        </div>

        {/* Output */}
        <div className="space-y-3 rounded-xl border bg-background p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Your thread</h3>
            <Button size="sm" onClick={copyThread}>
              <AtSign className="mr-1.5 h-3.5 w-3.5" /> Copy all
            </Button>
          </div>
          {tweets.length === 0 ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Paste some text on the left to split it into a thread.
            </div>
          ) : (
            <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
              {tweets.map((t, i) => {
                const ratio = t.length / TWITTER_LIMIT;
                const colorClass =
                  t.length > TWITTER_LIMIT
                    ? "text-rose-600 dark:text-rose-400"
                    : ratio > 0.9
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400";
                return (
                  <div
                    key={i}
                    className="rounded-lg border bg-white p-3 text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {i + 1}
                        </span>
                        <span>Tweet {i + 1} of {tweets.length}</span>
                      </div>
                      {showTotals && (
                        <span className={`font-mono text-xs font-semibold ${colorClass}`}>
                          {t.length}/{TWITTER_LIMIT}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {t.text}
                    </p>
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => copySingle(i)}
                      >
                        Copy tweet
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-muted/30 p-4 sm:p-5">
        <div className="flex items-center gap-1.5">
          <Hash className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">How the splitter works</h3>
        </div>
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          <li>• Each tweet is kept under 280 characters, breaking on word boundaries.</li>
          <li>• Paragraph breaks (blank lines) are honoured — they end the current tweet.</li>
          <li>• Words longer than 280 characters are hard-split with no spaces.</li>
          <li>• If your prefix, number label or 🧵 emoji push a tweet over the limit, the body is truncated with an ellipsis (…).</li>
          <li>• When there is only one tweet, the 1/1 label is skipped.</li>
        </ul>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Turn a long piece of text into a numbered Twitter / X thread. The splitter breaks your draft into tweets of at most 280 characters on word boundaries, numbers each one (1/N), and optionally adds the 🧵 thread emoji to the first tweet. Copy the whole thread or grab individual tweets one at a time.",
    tool: toolBody,
    howTo: [
      {
        title: "Paste your long text",
        description:
          "Drop in a blog draft, article, or any block of writing. Paragraph breaks (blank lines) become natural split points.",
      },
      {
        title: "Pick your options",
        description:
          "Toggle tweet numbering (1/N), the 🧵 thread emoji, character counts, and an optional first-tweet prefix like “🧵 A thread:”.",
      },
      {
        title: "Review each tweet",
        description:
          "Each tweet is shown on its own card with a live character count. The counter turns amber near the limit and red if something overflows.",
      },
      {
        title: "Copy the thread",
        description:
          "Use Copy all to grab the whole thread as plain text separated by lines of dashes, or copy individual tweets one at a time.",
      },
    ],
    useCases: [
      "Turn a 1,000-word blog post into a 10-tweet thread for X.",
      "Split a long LinkedIn post for cross-posting to X.",
      "Prepare a launch announcement as a numbered thread.",
      "Share meeting notes or a conference recap as a sequential thread.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The 280-character limit reflects free Twitter / X accounts. X Premium subscribers can post longer tweets — this tool always splits at 280.</li>
        <li>The splitter does not detect URLs specially. URLs count toward the 280-character limit just like any other text. (Twitter shortens URLs to 23 characters on publish, but this tool cannot know which URLs will be shortened.)</li>
        <li>Images, videos, polls and quote tweets are not handled — the tool outputs plain text only.</li>
        <li>The 🧵 emoji is treated as two characters (it is rendered as a single grapheme but counts as 2 in JavaScript string length). The splitter accounts for this.</li>
      </ul>
    ),
    faq: [
      {
        q: "What is the character limit per tweet?",
        a: "280 characters for free Twitter / X accounts. The tool splits at 280 by default. If you have X Premium and want longer tweets, you can paste each tweet manually — the tool does not currently support custom limits.",
      },
      {
        q: "Why is my tweet slightly shorter than 280?",
        a: "Because the splitter reserves space for the optional number label (e.g. “7/12 ”), the 🧵 emoji, and any first-tweet prefix you set. The body is truncated with an ellipsis if it would otherwise overflow.",
      },
      {
        q: "How does the splitter handle paragraphs?",
        a: "Blank lines (paragraph breaks) act as hard splits — the current tweet ends and a new one starts. Single line breaks inside a paragraph are normalised to spaces.",
      },
      {
        q: "Can I copy individual tweets?",
        a: "Yes. Each tweet card has a Copy tweet button. The Copy all button copies the whole thread separated by lines of dashes so you can paste it into a notes app or scheduler.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
