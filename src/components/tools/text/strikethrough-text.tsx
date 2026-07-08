"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Download, Wand2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { T_STRIKETHROUGH, T_UNDERLINED, type TextTransform } from "./_unicode-maps";
import { byteLength, MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, downloadText } from "./_text-helpers";

const SAMPLE_INPUT = "Strikethrough text is great for edits.";

interface StrikeVariant {
  key: string;
  label: string;
  codePoint: number;
  char: string;
  sample: string;
  transform: TextTransform;
}

const VARIANTS: StrikeVariant[] = [
  {
    key: "strike",
    label: "Strikethrough",
    codePoint: 0x0336,
    char: "\u0336",
    sample: "h̶e̶l̶l̶o̶",
    transform: T_STRIKETHROUGH,
  },
  {
    key: "underline",
    label: "Underline",
    codePoint: 0x0332,
    char: "\u0332",
    sample: "h̲e̲l̲l̲o̲",
    transform: T_UNDERLINED,
  },
  {
    key: "double-strike",
    label: "Double strikethrough",
    codePoint: 0x0337,
    char: "\u0337",
    sample: "h̷e̷l̷l̷o̷",
    transform: (text: string): string => {
      // Combine both the long horizontal stroke (U+0336) and the short
      // solidus overlay (U+0337) for a true "double" strike effect.
      let out = "";
      for (const ch of text) {
        out += ch;
        if (/[A-Za-z0-9]/.test(ch)) {
          out += "\u0336\u0337";
        }
      }
      return out;
    },
  },
];

export function StrikethroughText({ tool }: { tool: ToolDefinition }) {
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
    const text = VARIANTS.map(
      (v) => `${v.label}\n${"─".repeat(v.label.length)}\n${v.transform(safe)}\n`,
    ).join("\n");
    downloadText("strikethrough-text.txt", text);
    toast.success("Downloaded strikethrough-text.txt");
  };

  const content: ToolContent = {
    intro:
      "Add strikethrough, underline or double-strikethrough to any text using Unicode combining diacritical marks. The result pastes cleanly into chat apps, social media, GitHub issues or markdown editors that render Unicode — no special formatting required. Three variants, live preview, copy or download.",
    tool: (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="stt-input">Your text</Label>
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
            id="stt-input"
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
          {VARIANTS.map((v) => {
            const out = safe ? v.transform(safe) : "";
            return (
              <div
                key={v.key}
                className="flex flex-col rounded-xl border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">{v.label}</h3>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      U+{v.codePoint.toString(16).toUpperCase().padStart(4, "0")} · {v.sample}
                    </p>
                  </div>
                  <CopyButton value={out} size="icon" aria-label={`Copy ${v.label}`} />
                </div>
                <div
                  className="mt-3 min-h-[5rem] break-words rounded-md bg-muted/30 p-3 text-base leading-relaxed"
                  aria-live="polite"
                >
                  {out || (
                    <span className="font-mono text-sm text-muted-foreground/70">
                      {v.sample}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {out.length} characters (incl. combining marks)
                </p>
              </div>
            );
          })}
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
          "Anything up to 2,000 characters works. A sample is shown until you start typing.",
      },
      {
        title: "Compare the three variants",
        description:
          "Each card shows strikethrough, underline and double-strikethrough rendered live from your input.",
      },
      {
        title: "Copy or download",
        description:
          "Click the copy icon on a card for one variant, or use Download all variants to save a .txt file with all three.",
      },
      {
        title: "Paste anywhere",
        description:
          "Drop it into Discord, Slack, Twitter, a GitHub issue or any text field that renders Unicode. The combining marks travel with the text.",
      },
    ],
    useCases: [
      "Cross out old pricing or to-do items in chat without deleting them.",
      "Mark deleted passages in collaborative documents where strikethrough formatting isn't available.",
      "Create stylised social-media posts that look like redacted or hand-edited text.",
      "Emphasise edits in commit messages or release notes pasted into plain-text channels.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Combining marks rely on the rendering engine to stack them on the
          base character — most modern browsers and apps handle this, but a
          few older Android email clients may show the marks separately.
        </li>
        <li>
          Each character has one extra code-point appended, so the output is
          roughly twice as long as the input.
        </li>
        <li>
          Screen readers may announce the combining marks oddly or skip them
          entirely — don't rely on this for accessibility-critical text.
        </li>
        <li>
          Strikethrough applied this way is purely visual; it does not
          semantically mark text as deleted for HTML/Markdown parsers.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What's the difference between strikethrough and double strikethrough?",
        a: "Strikethrough uses the long horizontal stroke overlay (U+0336). Double strikethrough stacks that with the short solidus overlay (U+0337), producing a horizontal line plus a diagonal slash through each letter.",
      },
      {
        q: "Why does my text look fine in the browser but broken when I paste it somewhere?",
        a: "Some apps strip or mis-render Unicode combining marks. Try pasting into a different app or use plain strikethrough (U+0336) which is the most widely supported.",
      },
      {
        q: "Does this work in Markdown?",
        a: "Not as native Markdown strikethrough (~~text~~) — these are literal Unicode characters pasted in. Most renderers will display them correctly, but they won't carry the semantic strikethrough styling.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. The combining marks are added in your browser. Nothing is sent to a server.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
