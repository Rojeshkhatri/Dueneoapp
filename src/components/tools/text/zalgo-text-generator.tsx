"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Download, Wand2, RefreshCw, Ghost } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { generateZalgo } from "./_unicode-maps";
import { byteLength, MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, downloadText } from "./_text-helpers";

const SAMPLE_INPUT = "The cursed text awakens";

export function ZalgoTextGenerator({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [intensity, setIntensity] = React.useState(5);
  const [up, setUp] = React.useState(true);
  const [down, setDown] = React.useState(true);
  const [middle, setMiddle] = React.useState(false);
  const [seed, setSeed] = React.useState(0);

  const tooLarge = byteLength(input) > MAX_INPUT_BYTES;
  const source = input || SAMPLE_INPUT;
  const safe = tooLarge ? "" : source;

  // `seed` is only here to force re-render so generateZalgo re-rolls the
  // random marks when the user clicks Regenerate.
  const output = React.useMemo(() => {
    if (!safe) return "";
    return generateZalgo(safe, intensity, { up, down, middle });
  }, [safe, intensity, up, down, middle, seed]);

  const loadSample = () => {
    setInput(SAMPLE_INPUT);
    toast.message("Sample text loaded.");
  };

  const reset = () => {
    setInput("");
  };

  const regenerate = () => {
    setSeed((s) => s + 1);
    toast.message("Re-rolled the glitch marks.");
  };

  const download = () => {
    if (!output) {
      toast.error("Nothing to download yet.");
      return;
    }
    downloadText("zalgo-text.txt", output);
    toast.success("Downloaded zalgo-text.txt");
  };

  const atLeastOneDirection = up || down || middle;

  const content: ToolContent = {
    intro:
      "Stack dozens of Unicode combining diacritical marks above, below and through each character to summon the cursed " +
      "“zalgo” glitch aesthetic. Perfect for memes, creepypasta, Halloween posts, or just confusing your friends in chat. " +
      "Control the intensity, choose which directions to fill, and re-roll the randomness for endless variations.",
    tool: (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="ztg-input">Your text</Label>
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
            id="ztg-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste text here…"
            className="min-h-[100px]"
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
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="ztg-intensity" className="text-sm">
                Intensity
              </Label>
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
                {intensity} marks/char
              </span>
            </div>
            <Slider
              id="ztg-intensity"
              min={1}
              max={20}
              step={1}
              value={[intensity]}
              onValueChange={(v) => setIntensity(v[0] ?? 5)}
              aria-label="Intensity (marks per character)"
            />
            <p className="text-xs text-muted-foreground">
              Higher values stack more combining marks per character — slow
              to render at the extreme end.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="ztg-up" className="text-sm">
                Above marks
              </Label>
              <Switch id="ztg-up" checked={up} onCheckedChange={setUp} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ztg-down" className="text-sm">
                Below marks
              </Label>
              <Switch id="ztg-down" checked={down} onCheckedChange={setDown} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ztg-middle" className="text-sm">
                Middle (overlay) marks
              </Label>
              <Switch id="ztg-middle" checked={middle} onCheckedChange={setMiddle} />
            </div>
            {!atLeastOneDirection && (
              <p className="text-xs text-destructive">
                Pick at least one direction — falling back to above marks.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="ztg-output">Glitchy output</Label>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={regenerate}
                disabled={!safe}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Re-roll
              </Button>
              <CopyButton value={output} size="sm" />
              <Button
                variant="outline"
                size="sm"
                onClick={download}
                disabled={!output}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Save
              </Button>
            </div>
          </div>
          <div
            id="ztg-output"
            className="min-h-[140px] max-h-96 overflow-y-auto break-words rounded-md border bg-background p-4 text-lg leading-relaxed"
            aria-live="polite"
          >
            {output ? (
              output
            ) : (
              <span className="font-mono text-sm text-muted-foreground/60">
                Your zalgo text will appear here…
              </span>
            )}
          </div>
          {output && (
            <p className="text-xs text-muted-foreground">
              {output.length} characters (combining marks inflate the length).
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          <div className="flex items-center gap-1.5 font-medium">
            <Ghost className="h-4 w-4" /> Glitch responsibly
          </div>
          <p className="mt-2 text-muted-foreground">
            Zalgo text is created by stacking many Unicode combining
            diacritical marks (U+0300–U+036F) on each base character. The
            effect is purely visual — the underlying text is still readable
            to a computer. Heavy stacking can render slowly on older
            devices, and screen readers will struggle.
          </p>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Type your text",
        description:
          "Anything up to 500 characters works. A sample is shown until you start typing.",
      },
      {
        title: "Set the intensity",
        description:
          "Drag the slider from 1 (subtle) to 20 (deeply cursed). Each value is the number of combining marks stacked per character.",
      },
      {
        title: "Toggle mark directions",
        description:
          "Enable above, below and/or middle (overlay) marks. At least one direction must be on.",
      },
      {
        title: "Re-roll, copy or download",
        description:
          "Click Re-roll to randomise the marks again, Copy to clipboard, or Save to download a .txt file.",
      },
    ],
    useCases: [
      "Spice up creepypasta, Halloween posts and horror-themed content.",
      "Add chaotic energy to meme captions or Discord messages.",
      "Generate stylistic usernames or display names that stand out.",
      "Stress-test how your app renders Unicode combining marks.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Zalgo text is notoriously hard to render — high intensities can
          cause the marks to overflow into neighbouring lines or look
          different across operating systems and fonts.
        </li>
        <li>
          Each character has 1–20 extra code-points appended, so the output
          is much longer than the input and uses more memory.
        </li>
        <li>
          Screen readers and search engines see only the base characters;
          the glitch effect is invisible to assistive technology.
        </li>
        <li>
          Some platforms strip or normalise combining marks, flattening the
          effect. Discord, Twitter and most modern chat apps render it
          faithfully.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What does \"intensity\" actually do?",
        a: "It's the number of combining diacritical marks stacked on each character. 1–3 is subtle, 5–8 is the classic zalgo look, 15+ is overflowing chaos.",
      },
      {
        q: "Why does the same input give a different output each time?",
        a: "The marks are picked randomly from a pool of about 100 combining characters. Use Re-roll to generate a new variation, or copy a result you like.",
      },
      {
        q: "Is zalgo text safe to paste in chat?",
        a: "Yes — it's just regular Unicode. It won't break anything, but some apps may strip the combining marks or display them oddly.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. All glitch generation runs in your browser. Nothing is sent to a server.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
