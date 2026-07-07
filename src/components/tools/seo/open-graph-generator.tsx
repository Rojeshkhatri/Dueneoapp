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
import { RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

interface OgState {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  url: string;
  type: string;
  siteName: string;
  twitterSite: string;
  twitterCreator: string;
}

const DEFAULT_STATE: OgState = {
  title: "Dueneo — 100 Browser-Only Tools and 15 Classic Games",
  description:
    "Free, browser-based tools and games. No signups, no uploads, no tracking.",
  image: "https://example.com/og.png",
  imageAlt: "Dueneo logo",
  url: "https://example.com/",
  type: "website",
  siteName: "Dueneo",
  twitterSite: "@dueneo",
  twitterCreator: "@dueneo",
};

const OG_TYPES = ["website", "article", "product", "profile", "book", "music.song", "video.other"];

function escAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function OpenGraphGenerator({ tool }: { tool: ToolDefinition }) {
  const [state, setState] = React.useState<OgState>(DEFAULT_STATE);
  const update = (patch: Partial<OgState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const generated = React.useMemo(() => {
    const lines: string[] = [];
    lines.push("<!-- Open Graph -->");
    if (state.title)
      lines.push(`<meta property="og:title" content="${escAttr(state.title)}">`);
    if (state.description)
      lines.push(
        `<meta property="og:description" content="${escAttr(state.description)}">`
      );
    if (state.image)
      lines.push(`<meta property="og:image" content="${escAttr(state.image)}">`);
    if (state.imageAlt)
      lines.push(
        `<meta property="og:image:alt" content="${escAttr(state.imageAlt)}">`
      );
    if (state.url)
      lines.push(`<meta property="og:url" content="${escAttr(state.url)}">`);
    if (state.siteName)
      lines.push(
        `<meta property="og:site_name" content="${escAttr(state.siteName)}">`
      );
    lines.push(
      `<meta property="og:type" content="${escAttr(state.type || "website")}">`
    );

    lines.push("");
    lines.push("<!-- Twitter Card -->");
    lines.push(`<meta name="twitter:card" content="summary_large_image">`);
    if (state.title)
      lines.push(`<meta name="twitter:title" content="${escAttr(state.title)}">`);
    if (state.description)
      lines.push(
        `<meta name="twitter:description" content="${escAttr(state.description)}">`
      );
    if (state.image)
      lines.push(`<meta name="twitter:image" content="${escAttr(state.image)}">`);
    if (state.imageAlt)
      lines.push(
        `<meta name="twitter:image:alt" content="${escAttr(state.imageAlt)}">`
      );
    if (state.twitterSite)
      lines.push(
        `<meta name="twitter:site" content="${escAttr(state.twitterSite)}">`
      );
    if (state.twitterCreator)
      lines.push(
        `<meta name="twitter:creator" content="${escAttr(state.twitterCreator)}">`
      );

    return lines.join("\n");
  }, [state]);

  const reset = () => {
    setState(DEFAULT_STATE);
    toast.info("Reset to defaults.");
  };

  const displayUrl = state.url
    ? state.url.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : "example.com";

  const content: ToolContent = {
    intro:
      "Fill in og:title, og:description, og:image, og:url, og:type and optional Twitter handle fields to generate a ready-to-paste block of Open Graph and Twitter Card meta tags. A live preview shows how the link card will look on Facebook and Twitter.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Form */}
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="og-title">og:title</Label>
              <Input
                id="og-title"
                value={state.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Your link card title"
              />
              <p className="text-xs text-muted-foreground">
                {state.title.length} chars — keep it under 60 for best display.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="og-desc">og:description</Label>
              <Textarea
                id="og-desc"
                value={state.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="A short description shown on the link card"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {state.description.length} chars — keep it under 200.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="og-image">og:image URL</Label>
              <Input
                id="og-image"
                value={state.image}
                onChange={(e) => update({ image: e.target.value })}
                placeholder="https://example.com/og.png"
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Recommended 1200×630 px, ≤ 1 MB, absolute URL.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="og-imagealt">og:image:alt</Label>
              <Input
                id="og-imagealt"
                value={state.imageAlt}
                onChange={(e) => update({ imageAlt: e.target.value })}
                placeholder="A description of the image for screen readers"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="og-url">og:url</Label>
                <Input
                  id="og-url"
                  value={state.url}
                  onChange={(e) => update({ url: e.target.value })}
                  placeholder="https://example.com/page"
                  type="url"
                />
              </div>
              <div className="space-y-2">
                <Label>og:type</Label>
                <Select
                  value={state.type}
                  onValueChange={(v) => update({ type: v })}
                >
                  <SelectTrigger id="og-type">
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

            <div className="space-y-2">
              <Label htmlFor="og-site">og:site_name</Label>
              <Input
                id="og-site"
                value={state.siteName}
                onChange={(e) => update({ siteName: e.target.value })}
                placeholder="Your site or brand name"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="og-tsite">twitter:site</Label>
                <Input
                  id="og-tsite"
                  value={state.twitterSite}
                  onChange={(e) => update({ twitterSite: e.target.value })}
                  placeholder="@yourhandle"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="og-tcreator">twitter:creator</Label>
                <Input
                  id="og-tcreator"
                  value={state.twitterCreator}
                  onChange={(e) => update({ twitterCreator: e.target.value })}
                  placeholder="@authorhandle"
                />
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          {/* Preview + output */}
          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Link card preview</h3>
              <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
                <div className="aspect-[1.91/1] w-full bg-muted">
                  {state.image ? (
                    <img
                      src={state.image}
                      alt={state.imageAlt || state.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No image set
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {displayUrl}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-[#1a0dab]">
                    {state.title || "Your title appears here"}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-[#4d5156]">
                    {state.description ||
                      "Your description appears here. Keep it under 200 characters."}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Generated tags</h3>
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
        title: "Enter the link card title and description",
        description:
          "These appear in bold and as supporting text on Facebook, Twitter, LinkedIn and Slack link cards. Aim for ≤ 60 and ≤ 200 characters respectively.",
      },
      {
        title: "Provide an absolute og:image URL",
        description:
          "Use a 1200×630 PNG or JPG under 1 MB, hosted on a public HTTPS URL. Add an image:alt for accessibility.",
      },
      {
        title: "Set the canonical og:url and og:type",
        description:
          "og:url should be the absolute canonical URL of the page. og:type defaults to website; switch to article, product or another type when appropriate.",
      },
      {
        title: "Copy and preview",
        description:
          "The link-card preview shows how your card will render. Use Copy to put the full OG + Twitter Card tag block on your clipboard.",
      },
    ],
    useCases: [
      "Set up share previews for a marketing landing page before a campaign launch.",
      "Audit existing Open Graph tags on a blog post that shows broken images on social.",
      "Generate a Twitter summary_large_image card alongside standard OG tags.",
      "Produce a consistent link-card look across Facebook, LinkedIn and Slack.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Social platforms cache link cards aggressively. After deploying, use Facebook's Sharing Debugger or Twitter's Card Validator to force a refresh.</li>
        <li>This tool does not produce article-specific OG tags (article:published_time, article:author, etc.). Add them by hand for blog posts.</li>
        <li>The preview uses an <code>&lt;img&gt;</code> tag with your URL — if the URL is unreachable from your browser, the image will not render in the preview.</li>
        <li>Twitter's <code>twitter:card</code> is always emitted as <code>summary_large_image</code>. Switch to <code>summary</code> manually for square images.</li>
      </ul>
    ),
    faq: [
      {
        q: "What image size should I use?",
        a: "1200×630 px is the de-facto standard for og:image. Keep the file under 1 MB and use HTTPS. Square 512×512 images work for the smaller Twitter summary card.",
      },
      {
        q: "Why doesn't my card update after I deploy?",
        a: "Facebook and Twitter cache link cards for hours or days. Use the Facebook Sharing Debugger and Twitter Card Validator to refresh the cache after deploying.",
      },
      {
        q: "Do I need both Open Graph and Twitter Card tags?",
        a: "Twitter falls back to Open Graph tags for title/description/image, but emitting explicit twitter:* tags is good practice. This tool generates both blocks.",
      },
      {
        q: "What og:type should I use?",
        a: "Use website for marketing pages, article for blog posts and news, product for e-commerce product pages. Other types (profile, book, music) have additional required fields that this tool does not generate.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
