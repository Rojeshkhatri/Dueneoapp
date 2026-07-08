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
import { SMALL_CAPS_STYLES } from "./_unicode-maps";
import { byteLength, MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, downloadText } from "./_text-helpers";

const SAMPLE_INPUT = "Small Caps Look Tiny";

export function SmallCapsGenerator({ tool }: { tool: ToolDefinition }) {
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
    const text = SMALL_CAPS_STYLES.map(
      (s) => `${s.label}\n${"─".repeat(s.label.length)}\n${s.transform(safe)}\n`,
    ).join("\n");
    downloadText("small-caps-text.txt", text);
    toast.success("Downloaded small-caps-text.txt");
  };

  const content: ToolContent = {
    intro:
      "Convert any text to small caps, superscript or subscript using genuine Unicode characters. Tiny, raised and lowered letterforms are perfect for social-media bios, footnotes, equations and decorative headings. Three variants update live as you type.",
    tool: (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="scg-input">Your text</Label>
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
            id="scg-input"
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
          {SMALL_CAPS_STYLES.map((s) => {
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
                  className="mt-3 min-h-[5rem] break-words rounded-md bg-muted/30 p-3 text-base leading-relaxed"
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
          <p className="text-muted-foreground">
            <strong className="text-foreground">Heads up:</strong> Unicode
            doesn't define small-cap, superscript or subscript glyphs for
            every letter. Q and X have no small-cap form, lowercase q has no
            superscript, and most consonants have no subscript. Those slots
            fall back to the original character — that's expected, not a bug.
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
        title: "Compare the three variants",
        description:
          "Small caps, superscript and subscript all render live from your input.",
      },
      {
        title: "Copy or download",
        description:
          "Use the copy icon on a card for one variant, or Download all variants for a .txt file with all three.",
      },
      {
        title: "Paste anywhere",
        description:
          "These are real Unicode characters — paste them into any text field that renders Unicode.",
      },
    ],
    useCases: [
      "Style Twitter / Instagram bios with tiny small-caps lettering.",
      "Build footnote-style annotations inline without HTML <sup> or <sub> tags.",
      "Mock up mathematical expressions in plain text where real equation editors aren't available.",
      "Decorate headings or social posts with subtle raised or lowered type.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Small caps is missing the letters Q and X — those fall back to
          regular uppercase. Superscript lacks lowercase q; subscript has
          gaps for many consonants.
        </li>
        <li>
          Subscripts render very small and may be hard to read on mobile;
          combine with care.
        </li>
        <li>
          Screen readers may announce these characters oddly. Don't use them
          for accessibility-critical text.
        </li>
        <li>Output length matches the input — no extra combining marks are added.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why do Q and X stay normal in the small-caps output?",
        a: "Unicode's small-caps block (Phonetic Extensions, U+1D00–U+1D2B) only defines glyphs for most of the alphabet. Q and X were never assigned a small-cap code-point, so they fall back to the original letter.",
      },
      {
        q: "Are these characters searchable or SEO-friendly?",
        a: "No. They look like letters to humans but are different code-points to search engines, so they won't match keyword searches. Use them for display only.",
      },
      {
        q: "Will the superscript digits work for footnotes like Wikipedia?",
        a: "Yes — Unicode defines ⁰¹²³⁴⁵⁶⁷⁸⁹ specifically for this purpose, and they render consistently across platforms.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. Conversion runs in your browser. Nothing is sent to a server.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
