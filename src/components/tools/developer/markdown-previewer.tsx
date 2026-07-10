"use client";

import * as React from "react";
import Markdown from "react-markdown";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Download, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  byteLength,
  formatBytes,
  downloadText,
} from "./_dev-helpers";

const SAMPLE = `## Hello, Dueneo

A **live** Markdown previewer — _nothing_ leaves your browser.

### Why use it?

- Type on the left, see the result on the right.
- Supports headings, **bold**, _italic_, \`code\`, lists and links.
- > Block quotes are rendered too.

\`\`\`
function hello(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

1. First
2. Second
3. Third

[Visit Dueneo](#)
`;

export function MarkdownPreviewer({ tool }: { tool: ToolDefinition }) {
  const [source, setSource] = React.useState<string>(SAMPLE);

  const reset = () => setSource("");
  const loadSample = () => setSource(SAMPLE);

  const words = source.trim() ? source.trim().split(/\s+/).length : 0;
  const lines = source ? source.split("\n").length : 0;

  const content: ToolContent = {
    intro:
      "Write Markdown on the left and watch the rendered HTML appear instantly on the right. Live preview, no server round-trip — powered by react-markdown. Great for README drafts, blog posts and documentation snippets.",
    tool: (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadSample}>
            Load sample
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
          <CopyButton value={source} size="sm" label="Copy source" />
          <Button
            variant="outline"
            size="sm"
            disabled={!source}
            onClick={() => {
              downloadText("document.md", source, "text/markdown");
              toast.success("Downloaded document.md");
            }}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> Save .md
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            {words} word{words === 1 ? "" : "s"} · {lines} line{lines === 1 ? "" : "s"} ·{" "}
            {formatBytes(byteLength(source))}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mp-source">Markdown source</Label>
            <Textarea
              id="mp-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="# Start typing Markdown..."
              className="min-h-[480px] font-mono text-xs"
              spellCheck={false}
              aria-label="Markdown source"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mp-preview">Live preview</Label>
            <div
              id="mp-preview"
              className="min-h-[480px] overflow-auto rounded-md border bg-background p-4 text-sm leading-relaxed
                [&_a]:font-medium [&_a]:text-primary [&_a]:underline
                [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground
                [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs
                [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:first:mt-0
                [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:first:mt-0
                [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:first:mt-0
                [&_hr]:my-4 [&_hr]:border-border
                [&_img]:max-w-full [&_img]:rounded
                [&_li]:ml-6 [&_li]:list-disc
                [&_ol]:my-2 [&_ol]:list-decimal
                [&_ol_li]:list-decimal
                [&_p]:my-2 [&_p]:first:mt-0 [&_p]:last:mb-0
                [&_pre]:my-3 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs
                [&_pre_code]:bg-transparent [&_pre_code]:p-0
                [&_ul]:my-2 [&_ul]:list-disc
                [&_ul_li]:list-disc"
              aria-label="Live HTML preview"
            >
              <Markdown>{source}</Markdown>
            </div>
          </div>
        </div>

        <details className="rounded-lg border bg-muted/30 p-3 text-sm">
          <summary className="cursor-pointer font-medium">Supported Markdown features</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Headings (<code>#</code>, <code>##</code>, <code>###</code>...)</li>
            <li>Bold (<code>**text**</code>), italics (<code>_text_</code>) and inline code (<code>`code`</code>)</li>
            <li>Ordered and unordered lists</li>
            <li>Links, images and horizontal rules</li>
            <li>Fenced code blocks with triple backticks</li>
            <li>Block quotes with <code>{">"}</code></li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Tables, strikethrough and other GitHub-flavoured Markdown features are
            not enabled in this previewer to keep the bundle small.
          </p>
        </details>
      </div>
    ),
    howTo: [
      {
        title: "Type or paste Markdown",
        description:
          "Use the left-hand editor. The preview on the right updates instantly as you type — there is no submit button.",
      },
      {
        title: "Use the sample as a reference",
        description:
          "Click Load sample to see every supported feature in one document. Use it as a cheat sheet while you write.",
      },
      {
        title: "Copy or save the source",
        description:
          "Use Copy source to grab the Markdown text, or Save .md to download it as document.md.",
      },
      {
        title: "Reset to start fresh",
        description:
          "Click Reset to clear the editor. Nothing is saved between visits — refresh the page and the sample comes back.",
      },
    ],
    useCases: [
      "Draft a GitHub README before pushing it.",
      "Preview a blog post or documentation snippet.",
      "Check how a Markdown email will render in a client.",
      "Teach Markdown syntax with live feedback.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>GitHub-flavoured Markdown features (tables, strikethrough, task lists, autolinks) are not enabled — the previewer uses core CommonMark.</li>
        <li>HTML inside the Markdown source is escaped, not rendered, to keep the preview safe.</li>
        <li>Syntax highlighting inside fenced code blocks is not applied.</li>
      </ul>
    ),
    faq: [
      {
        q: "Are tables supported?",
        a: "No. Tables are part of GitHub-Flavoured Markdown, which requires an additional plugin. This previewer sticks to core CommonMark to keep the bundle small.",
      },
      {
        q: "Can I write HTML inside the Markdown?",
        a: "Raw HTML is escaped rather than rendered, so it appears as text. This keeps the preview safe when pasting untrusted Markdown.",
      },
      {
        q: "Does the preview update as I type?",
        a: "Yes. The Markdown is re-parsed on every keystroke with react-markdown, so the preview is always in sync.",
      },
      {
        q: "Is my Markdown uploaded anywhere?",
        a: "No. Parsing happens entirely in your browser. The source never leaves your tab.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
