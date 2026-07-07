"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Link2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { slugify, type SlugOptions } from "./_text-helpers";

const SAMPLE_TITLE = "The Quick Brown Fox Jumps Over the Lazy Dog!";

export function SlugGenerator({ tool }: { tool: ToolDefinition }) {
  const [title, setTitle] = React.useState("");
  const [separator, setSeparator] = React.useState<string>("-");
  const [lowercase, setLowercase] = React.useState(true);
  const [removeStopWords, setRemoveStopWords] = React.useState(false);
  const [stripAccents, setStripAccents] = React.useState(true);

  const opts: SlugOptions = React.useMemo(
    () => ({ separator, lowercase, removeStopWords, stripAccents }),
    [separator, lowercase, removeStopWords, stripAccents]
  );

  const slug = React.useMemo(() => slugify(title, opts), [title, opts]);

  const reset = () => {
    setTitle("");
    setSeparator("-");
    setLowercase(true);
    setRemoveStopWords(false);
    setStripAccents(true);
  };

  const loadSample = () => setTitle(SAMPLE_TITLE);

  const content: ToolContent = {
    intro:
      "Turn any title into a clean, URL-friendly slug. Choose between hyphen or underscore separators, strip accents, remove common stop words, and force lower-case for consistent, SEO-friendly URLs.",
    tool: (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="sl-title">Title or heading</Label>
            <button
              type="button"
              onClick={loadSample}
              className="text-xs text-primary hover:underline"
            >
              Load sample
            </button>
          </div>
          <Input
            id="sl-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 10 Tips for Better Sleep (Science-Backed!)"
            className="text-base"
            aria-label="Title to slugify"
          />
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Separator</Label>
              <RadioGroup
                value={separator}
                onValueChange={setSeparator}
                className="flex flex-row gap-4"
              >
                <Label className="flex items-center gap-1.5 text-sm font-normal">
                  <RadioGroupItem value="-" id="sl-sep-dash" /> Hyphen (kebab-case)
                </Label>
                <Label className="flex items-center gap-1.5 text-sm font-normal">
                  <RadioGroupItem value="_" id="sl-sep-under" /> Underscore (snake_case)
                </Label>
              </RadioGroup>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
              <div className="flex items-center gap-2">
                <Switch
                  id="sl-lower"
                  checked={lowercase}
                  onCheckedChange={setLowercase}
                  aria-label="Lowercase"
                />
                <Label htmlFor="sl-lower" className="text-sm font-normal">
                  Lower-case
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="sl-strips"
                  checked={stripAccents}
                  onCheckedChange={setStripAccents}
                  aria-label="Strip accents"
                />
                <Label htmlFor="sl-strips" className="text-sm font-normal">
                  Strip accents
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="sl-stop"
                  checked={removeStopWords}
                  onCheckedChange={setRemoveStopWords}
                  aria-label="Remove stop words"
                />
                <Label htmlFor="sl-stop" className="text-sm font-normal">
                  Remove stop words
                </Label>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sl-output">Generated slug</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="sl-output"
              value={slug}
              readOnly
              placeholder="your-slug-will-appear-here"
              className="font-mono text-base"
              aria-label="Generated slug"
              spellCheck={false}
            />
            <CopyButton value={slug} size="default" label="Copy slug" />
          </div>
          {slug && (
            <p className="text-xs text-muted-foreground">
              <Link2 className="mr-1 inline h-3.5 w-3.5" />
              {slug.length} characters · looks like{" "}
              <code className="font-mono text-foreground">https://example.com/{slug}</code>
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Type your title",
        description:
          "Enter the heading of a blog post, product name or any text you want to turn into a URL.",
      },
      {
        title: "Pick options",
        description:
          "Choose a separator (hyphen or underscore), toggle lower-case, strip accents (so é becomes e) and optionally remove common stop words like \"the\" and \"of\".",
      },
      {
        title: "Copy the slug",
        description:
          "The slug updates live as you type and toggle. Click Copy slug to put it on your clipboard.",
      },
    ],
    useCases: [
      "Generate SEO-friendly URLs for blog posts and news articles.",
      "Create safe file names from document titles on systems that reject spaces and accents.",
      "Build anchor links for headings in a documentation site.",
      "Produce YouTube-style video IDs from titles (with an extra unique suffix).",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The slug is built from ASCII letters and digits only; emoji and other non-ASCII characters are removed.</li>
        <li>Stop words list is a small built-in set (a, an, the, and, of, …) — extend it in code if you need a longer list.</li>
        <li>The tool does not check for slug uniqueness against your database — verify before publishing.</li>
      </ul>
    ),
    faq: [
      {
        q: "Should I use hyphens or underscores?",
        a: "Google recommends hyphens (kebab-case) for URL slugs because it treats them as word separators. Underscores are valid but Google treats them as part of a single word, so hyphens are better for SEO.",
      },
      {
        q: "What does Strip accents do?",
        a: "It normalises accented characters to their ASCII equivalents using Unicode NFKD decomposition — so é, è, ê and ë all become a plain e.",
      },
      {
        q: "Which stop words are removed?",
        a: "A small built-in list of common English function words: a, an, the, and, or, but, on, in, at, to, for, of, with, by, from, is, are, was, were, be, been, being, it, as, this, that, these, those, into, than, then, so, such, no, nor, not, too, very, can, will, just, should, now.",
      },
      {
        q: "Is my title uploaded anywhere?",
        a: "No. Slug generation runs entirely in your browser. Your text never leaves the tab.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
