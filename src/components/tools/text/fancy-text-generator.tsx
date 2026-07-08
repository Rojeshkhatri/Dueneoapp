"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Sparkles, Wand2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { FANCY_STYLES } from "./_unicode-maps";
import { byteLength, MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG } from "./_text-helpers";

const SAMPLE_INPUT = "Dueneo rocks";

export function FancyTextGenerator({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const tooLarge = byteLength(input) > MAX_INPUT_BYTES;

  const source = input || SAMPLE_INPUT;
  const safe = tooLarge ? "" : source;

  const loadSample = () => {
    setInput(SAMPLE_INPUT);
    toast.message("Sample text loaded.");
  };

  const reset = () => {
    setInput("");
  };

  const content: ToolContent = {
    intro:
      "Type any text and instantly see it rendered in over 30 fancy Unicode styles — bold, italic, script, double-struck, circled, fullwidth, regional flags and more. Copy any style with one click and paste it into Instagram, TikTok, Twitter, Discord or anywhere Unicode is supported. Everything runs in your browser.",
    tool: (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="ftg-input">Your text</Label>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" onClick={loadSample}>
                <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Sample
              </Button>
              <Button variant="ghost" size="sm" onClick={reset} disabled={!input}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>
          <Input
            id="ftg-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste your text here…"
            maxLength={500}
            aria-label="Input text"
          />
          {tooLarge && (
            <p className="text-xs text-destructive" role="status">
              {INPUT_TOO_LARGE_MSG}
            </p>
          )}
          {!input && (
            <p className="text-xs text-muted-foreground">
              Showing sample text — start typing to replace it.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {FANCY_STYLES.length} styles · {source.length} characters
          </p>
        </div>

        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Fancy text styles"
        >
          {FANCY_STYLES.map((style) => {
            const out = safe ? style.transform(safe) : "";
            return (
              <div
                key={style.key}
                role="listitem"
                className="group flex flex-col rounded-xl border bg-card p-4 transition hover:border-primary/50 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {style.label}
                  </span>
                  <CopyButton value={out} size="icon" aria-label={`Copy ${style.label}`} />
                </div>
                <div
                  className="mt-2 min-h-[2.25rem] break-words text-lg leading-snug"
                  aria-live="polite"
                >
                  {out ? (
                    out
                  ) : (
                    <span className="font-mono text-sm text-muted-foreground/70">
                      {style.sample}
                    </span>
                  )}
                </div>
                <div className="mt-2 font-mono text-[10px] text-muted-foreground/60">
                  {style.sample}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="h-4 w-4" /> Tip
          </div>
          <p className="mt-2 text-muted-foreground">
            These "fonts" aren't real fonts — they're Unicode characters that
            happen to look like a different typeface. They work on Instagram,
            TikTok, Twitter, Discord and most messaging apps. Some platforms
            may not render every style (especially the regional-flag letters)
            and screen readers may read them oddly.
          </p>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Type your text",
        description:
          "Enter up to 500 characters in the input box. A sample is shown until you start typing.",
      },
      {
        title: "Browse the styles",
        description:
          "All 30+ fancy Unicode styles update live as you type. Each card shows the style name, the rendered output and a static preview underneath.",
      },
      {
        title: "Copy any style",
        description:
          "Click the copy icon in the top-right of any card to copy that style to your clipboard.",
      },
      {
        title: "Paste anywhere",
        description:
          "Paste into your social-media bio, a Discord message, a tweet — anywhere Unicode is supported.",
      },
    ],
    useCases: [
      "Make your Instagram, TikTok or Twitter bio stand out with bold, script or circled letters.",
      "Decorate Discord usernames, channel names or role names with double-struck or fraktur glyphs.",
      "Create playful WhatsApp messages with upside-down or fullwidth text.",
      "Generate stylised headlines for thumbnails or posters without installing any fonts.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          These are Unicode characters, not real fonts — some platforms (or
          older browsers) may render them as plain text or "tofu" boxes.
        </li>
        <li>
          Screen readers and search engines can't read the glyphs as letters,
          so they hurt accessibility and SEO. Don't use them for body copy.
        </li>
        <li>
          Regional-flag letters (🇦–🇿) often pair up into country flag
          emojis when two letters form a valid ISO 3166 code.
        </li>
        <li>Input is capped at 500 characters for performance.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why do some styles look the same as the original?",
        a: "Unicode doesn't define a fancy variant for every letter. The small-caps, superscript and subscript ranges are missing a few letters (Q, X, lowercase q, etc.) — those fall back to the original character.",
      },
      {
        q: "Will these work on Instagram / TikTok / Twitter?",
        a: "Yes — most modern platforms support the mathematical alphanumeric and enclosed-alphanumeric Unicode blocks. A handful of styles (regional flags, negative-squared) render differently on iOS vs Android.",
      },
      {
        q: "Are these characters safe to use in passwords or code?",
        a: "No. They look like letters but they're different code-points, so they will break identifiers, logins and search. Use them for display text only.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. Conversion runs entirely in your browser. Nothing is sent to a server.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
