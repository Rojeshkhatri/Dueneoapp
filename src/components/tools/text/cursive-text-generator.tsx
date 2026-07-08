"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Download, Wand2, PenLine } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { CURSIVE_STYLES } from "./_unicode-maps";
import { byteLength, MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, downloadText } from "./_text-helpers";

const SAMPLE_INPUT = "Cursive looks lovely";

export function CursiveTextGenerator({ tool }: { tool: ToolDefinition }) {
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

  const downloadAll = () => {
    if (!safe) {
      toast.error("Nothing to download yet.");
      return;
    }
    const text = CURSIVE_STYLES.map(
      (s) => `${s.label}\n${"─".repeat(s.label.length)}\n${s.transform(safe)}\n`,
    ).join("\n");
    downloadText("cursive-text.txt", text);
    toast.success("Downloaded cursive-text.txt");
  };

  const content: ToolContent = {
    intro:
      "Convert any text into flowing cursive and blackletter Unicode fonts. Choose from regular cursive (script), bold cursive, or traditional fraktur blackletter — all rendered with genuine Unicode mathematical alphanumeric characters. Perfect for wedding invitations, elegant headings, social-media bios or anywhere a handwritten look is wanted. Copy and paste into any Unicode-aware app.",
    tool: (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="ctg-input">Your text</Label>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" onClick={loadSample}>
                <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Sample
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                disabled={!input}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>
          <Textarea
            id="ctg-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste text here…"
            className="min-h-[120px]"
            maxLength={2000}
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
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {CURSIVE_STYLES.map((s) => {
            const out = safe ? s.transform(safe) : "";
            return (
              <div
                key={s.key}
                className="flex flex-col rounded-xl border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">{s.label}</h3>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {s.sample}
                    </p>
                  </div>
                  <CopyButton value={out} size="icon" aria-label={`Copy ${s.label}`} />
                </div>
                <div
                  className="mt-3 min-h-[5rem] break-words rounded-md bg-muted/30 p-3 text-xl leading-relaxed"
                  aria-live="polite"
                >
                  {out || (
                    <span className="font-mono text-sm text-muted-foreground/70">
                      {s.sample}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {out.length} characters
                </p>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          <div className="flex items-center gap-1.5 font-medium">
            <PenLine className="h-4 w-4" /> About these styles
          </div>
          <p className="mt-2 text-muted-foreground">
            Regular cursive uses the Unicode <em>Mathematical Script</em>
            block (U+1D49C–U+1D4C7), with the eight "hole" letters that
            overlap with Letterlike Symbols (ℬ, ℰ, ℱ, ℋ, ℐ, ℒ, ℳ, ℛ)
            mapped correctly. Bold cursive uses <em>Bold Mathematical
            Script</em> (U+1D4D0–U+1D503). Blackletter uses <em>Mathematical
            Fraktur</em> (U+1D504–U+1D537) — a heavy gothic style rather
            than true handwriting.
          </p>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={downloadAll} disabled={!safe}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Download all variants
          </Button>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Type or paste your text",
        description:
          "Up to 2,000 characters. A sample is shown until you start typing.",
      },
      {
        title: "Compare the three styles",
        description:
          "Regular cursive, bold cursive and blackletter (fraktur) all render live as you type.",
      },
      {
        title: "Copy or download",
        description:
          "Click the copy icon on a card for one variant, or Download all variants for a .txt file with all three.",
      },
      {
        title: "Paste anywhere",
        description:
          "These are real Unicode characters — paste them into Instagram, TikTok, Discord, Twitter or any text field that renders Unicode.",
      },
    ],
    useCases: [
      "Style wedding or event invitations with elegant cursive headings.",
      "Decorate Instagram and TikTok bios with a handwritten look.",
      "Add old-world flair to logos, posters or menus with blackletter.",
      "Create distinctive usernames or display names for social media.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Cursive Unicode glyphs are based on the mathematical script block,
          so the aesthetic is closer to a typeset script font than to
          handwritten cursive.
        </li>
        <li>
          Blackletter (fraktur) renders as a heavy gothic style — it can be
          hard to read at small sizes and is best used for short headings.
        </li>
        <li>
          Some platforms (older Android email clients, certain game chats)
          may fall back to plain text for these code-points.
        </li>
        <li>
          Screen readers won't recognise these as letters — don't use them
          for accessibility-critical text.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What's the difference between regular cursive and bold cursive?",
        a: "Both use Unicode's mathematical script block. Bold cursive uses the dedicated Bold Mathematical Script range (U+1D4D0+), which is a heavier version of the same letterforms.",
      },
      {
        q: "Is fraktur really cursive?",
        a: "Not strictly. Fraktur is a blackletter/gothic typeface that predates modern cursive. We include it here because it's the closest Unicode equivalent to a stylised old-world script and pairs well with cursive for decorative text.",
      },
      {
        q: "Why do some letters in my cursive output look different from the rest?",
        a: "Unicode reserves a few code-points in the mathematical script block (B, E, F, H, I, L, M, R for uppercase; e, g, o for lowercase) because those letters already exist in the Letterlike Symbols block. We map them correctly, but they may render in a slightly different style depending on your font.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. Conversion runs entirely in your browser. Nothing is sent to a server.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
