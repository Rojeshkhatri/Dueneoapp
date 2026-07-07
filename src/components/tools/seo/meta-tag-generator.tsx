"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Globe } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

interface MetaState {
  title: string;
  description: string;
  keywords: string;
  author: string;
  canonical: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  ogType: string;
}

const DEFAULT_STATE: MetaState = {
  title: "Dueneo — 100 Browser-Only Tools and 15 Classic Games",
  description:
    "Free, browser-based tools and games. No signups, no uploads, no tracking. Pick a colour, optimise an SVG, generate a sitemap — all in your browser.",
  keywords: "browser tools, free tools, online tools, no signup",
  author: "Dueneo",
  canonical: "https://example.com/",
  robots: "index, follow",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  ogUrl: "",
  ogType: "website",
};

const ROBOTS_OPTIONS = [
  "index, follow",
  "noindex, follow",
  "index, nofollow",
  "noindex, nofollow",
];

const OG_TYPES = ["website", "article", "product", "profile", "video.other"];

function escAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function MetaTagGenerator({ tool }: { tool: ToolDefinition }) {
  const [state, setState] = React.useState<MetaState>(DEFAULT_STATE);

  const update = (patch: Partial<MetaState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const generated = React.useMemo(() => {
    const lines: string[] = [];
    if (state.title) lines.push(`<title>${state.title}</title>`);
    if (state.description)
      lines.push(
        `<meta name="description" content="${escAttr(state.description)}">`
      );
    if (state.keywords)
      lines.push(
        `<meta name="keywords" content="${escAttr(state.keywords)}">`
      );
    if (state.author)
      lines.push(`<meta name="author" content="${escAttr(state.author)}">`);
    lines.push(
      `<meta name="robots" content="${escAttr(state.robots || "index, follow")}">`
    );
    if (state.canonical)
      lines.push(`<link rel="canonical" href="${escAttr(state.canonical)}">`);
    lines.push(`<meta name="viewport" content="width=device-width, initial-scale=1">`);
    lines.push(`<meta charset="utf-8">`);

    // Open Graph (use main fields if og-* are blank).
    const ogTitle = state.ogTitle || state.title;
    const ogDesc = state.ogDescription || state.description;
    const ogUrl = state.ogUrl || state.canonical;
    if (ogTitle)
      lines.push(`<meta property="og:title" content="${escAttr(ogTitle)}">`);
    if (ogDesc)
      lines.push(`<meta property="og:description" content="${escAttr(ogDesc)}">`);
    if (state.ogImage)
      lines.push(`<meta property="og:image" content="${escAttr(state.ogImage)}">`);
    if (ogUrl)
      lines.push(`<meta property="og:url" content="${escAttr(ogUrl)}">`);
    lines.push(
      `<meta property="og:type" content="${escAttr(state.ogType || "website")}">`
    );

    // Twitter card summary.
    if (ogTitle)
      lines.push(`<meta name="twitter:card" content="summary_large_image">`);
    if (ogTitle)
      lines.push(`<meta name="twitter:title" content="${escAttr(ogTitle)}">`);
    if (ogDesc)
      lines.push(`<meta name="twitter:description" content="${escAttr(ogDesc)}">`);
    if (state.ogImage)
      lines.push(`<meta name="twitter:image" content="${escAttr(state.ogImage)}">`);

    return lines.join("\n");
  }, [state]);

  const reset = () => {
    setState(DEFAULT_STATE);
    toast.info("Reset to defaults.");
  };

  // Google SERP preview uses ~60 chars for title, ~155-160 for description.
  const titlePreview = state.title.slice(0, 60);
  const descPreview = state.description.slice(0, 158);
  const displayUrl = state.canonical
    ? state.canonical.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : "example.com";

  const content: ToolContent = {
    intro:
      "Fill in your page's title, description, keywords, author, robots directive and canonical URL — and optionally Open Graph overrides — to generate a ready-to-paste block of HTML meta tags. A Google-style search-result preview shows how your title and description will look.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Form */}
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="mt-title">Page title</Label>
              <Input
                id="mt-title"
                value={state.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Free Color Picker — Browser-Based, Private & Fast"
              />
              <p className="text-xs text-muted-foreground">
                {state.title.length}/60 chars (Google truncates around 60)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mt-desc">Meta description</Label>
              <Textarea
                id="mt-desc"
                value={state.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Use Dueneo's free color picker to pick colors and convert between HEX, RGB, HSL."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {state.description.length}/160 chars (Google truncates around 155–160)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mt-keywords">Keywords (comma-separated)</Label>
              <Input
                id="mt-keywords"
                value={state.keywords}
                onChange={(e) => update({ keywords: e.target.value })}
                placeholder="color picker, hex color picker"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mt-author">Author</Label>
                <Input
                  id="mt-author"
                  value={state.author}
                  onChange={(e) => update({ author: e.target.value })}
                  placeholder="Your name or company"
                />
              </div>
              <div className="space-y-2">
                <Label>Robots</Label>
                <Select
                  value={state.robots}
                  onValueChange={(v) => update({ robots: v })}
                >
                  <SelectTrigger id="mt-robots">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROBOTS_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mt-canonical">Canonical URL</Label>
              <Input
                id="mt-canonical"
                value={state.canonical}
                onChange={(e) => update({ canonical: e.target.value })}
                placeholder="https://example.com/page"
                type="url"
              />
            </div>

            <details className="rounded-lg border bg-muted/30 p-3 text-sm">
              <summary className="cursor-pointer font-medium">
                Open Graph overrides (optional)
              </summary>
              <div className="mt-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Leave blank to reuse the page title / description / canonical URL above.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="mt-ogtitle">og:title</Label>
                  <Input
                    id="mt-ogtitle"
                    value={state.ogTitle}
                    onChange={(e) => update({ ogTitle: e.target.value })}
                    placeholder="(uses page title if blank)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mt-ogdesc">og:description</Label>
                  <Textarea
                    id="mt-ogdesc"
                    value={state.ogDescription}
                    onChange={(e) => update({ ogDescription: e.target.value })}
                    placeholder="(uses meta description if blank)"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mt-ogimage">og:image URL</Label>
                  <Input
                    id="mt-ogimage"
                    value={state.ogImage}
                    onChange={(e) => update({ ogImage: e.target.value })}
                    placeholder="https://example.com/og.png"
                    type="url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mt-ogurl">og:url</Label>
                  <Input
                    id="mt-ogurl"
                    value={state.ogUrl}
                    onChange={(e) => update({ ogUrl: e.target.value })}
                    placeholder="(uses canonical URL if blank)"
                    type="url"
                  />
                </div>
                <div className="space-y-2">
                  <Label>og:type</Label>
                  <Select
                    value={state.ogType}
                    onValueChange={(v) => update({ ogType: v })}
                  >
                    <SelectTrigger id="mt-ogtype">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OG_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </details>

            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          {/* Output + preview */}
          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Google SERP preview</h3>
              <div className="rounded-lg border bg-background p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" />
                  <span>{displayUrl}</span>
                </div>
                <p className="mt-1 text-lg leading-tight text-[#1a0dab] line-clamp-2">
                  {titlePreview || "Your page title appears here"}
                </p>
                <p className="mt-0.5 text-sm text-[#4d5156] line-clamp-2">
                  {descPreview || "Your meta description appears here. Keep it under 160 characters."}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Generated meta tags</h3>
                <CopyButton value={generated} size="sm" />
              </div>
              <pre className="max-h-72 overflow-auto rounded-lg border bg-background p-3 font-mono text-xs">
                <code>{generated || "Fill in the form to generate tags."}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Fill in the basics",
        description:
          "Enter a page title (≤ 60 chars), a meta description (≤ 160 chars), keywords, an author and a canonical URL. Pick a robots directive from the dropdown.",
      },
      {
        title: "Optionally override Open Graph fields",
        description:
          "Expand the Open Graph section if you want og:title, og:description, og:image, og:url or og:type to differ from the page-level values.",
      },
      {
        title: "Preview the SERP snippet",
        description:
          "The Google SERP preview shows how your title and description will look in search results — truncation is automatic at 60 and 158 characters.",
      },
      {
        title: "Copy and paste",
        description:
          "Use Copy to put the full meta-tag block on your clipboard, then paste it into the <head> of your HTML document.",
      },
    ],
    useCases: [
      "Generate SEO meta tags for a new landing page before publishing.",
      "Audit and refresh meta tags on an existing page that is underperforming in search.",
      "Produce a social-friendly Open Graph card alongside standard meta tags.",
      "Test how a longer title or description will be truncated in Google's results.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The SERP preview is an approximation. Google may rewrite titles or descriptions at its own discretion.</li>
        <li>The keywords meta tag is ignored by Google but still emitted for legacy search engines and tooling.</li>
        <li>This tool does not produce JSON-LD structured data — use a dedicated schema generator for that.</li>
        <li>Twitter card tags are emitted only when an og:title is present; advanced Twitter-specific fields (site, creator) are not generated here.</li>
      </ul>
    ),
    faq: [
      {
        q: "How long should my title tag be?",
        a: "Aim for 50–60 characters. Google truncates titles around the 60-character mark on most desktop results. The character counter under the field helps you stay within the limit.",
      },
      {
        q: "Why does the keywords tag still get generated?",
        a: "Google ignores it, but some legacy search engines and SEO auditing tools still expect it. If you do not want it, leave the keywords field blank and no tag will be emitted.",
      },
      {
        q: "What should the canonical URL be?",
        a: "The absolute URL of the canonical (preferred) version of the page — including https://. If the same content is reachable via multiple URLs, point them all at the canonical one.",
      },
      {
        q: "Do I need separate Open Graph tags?",
        a: "Not necessarily. If you leave the Open Graph overrides blank, the tool reuses your page title, description and canonical URL. Override them only when you want the social card to differ from the search snippet.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
