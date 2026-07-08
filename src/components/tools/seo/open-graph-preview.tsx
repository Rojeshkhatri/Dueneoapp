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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { RotateCcw, Globe } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

interface OgState {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName: string;
  type: string;
}

const DEFAULT_STATE: OgState = {
  title: "How to Write Better Headlines That Convert",
  description:
    "A practical guide to writing headlines that grab attention, rank in search and drive clicks — with 12 worked examples.",
  image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=630&fit=crop",
  url: "https://example.com/blog/better-headlines",
  siteName: "Dueneo Blog",
  type: "article",
};

const OG_TYPES = ["website", "article", "product", "profile", "book"];

function displayUrl(url: string): string {
  if (!url) return "example.com";
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}

function domainOf(url: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function ImageBlock({
  src,
  alt,
  className,
  placeholder = "No og:image set",
}: {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
}) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-xs text-muted-foreground ${className ?? ""}`}
      >
        {placeholder}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).style.visibility = "hidden";
      }}
    />
  );
}

export function OpenGraphPreview({ tool }: { tool: ToolDefinition }) {
  const [state, setState] = React.useState<OgState>(DEFAULT_STATE);
  const update = (patch: Partial<OgState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const reset = () => {
    setState(DEFAULT_STATE);
    toast.info("Reset to defaults.");
  };

  const titleOr = state.title || "Your title appears here";
  const descOr =
    state.description || "Your description appears here. Keep it under 200 characters.";
  const siteOrDomain = state.siteName || domainOf(state.url) || "example.com";

  const content: ToolContent = {
    intro:
      "Fill in your og:title, og:description, og:image, og:url, og:site_name and og:type, then see how the link card renders on Facebook, Twitter/X, LinkedIn and Slack/iMessage. Each platform sizes and clips the card differently.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Inputs */}
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="op-title">og:title</Label>
              <Input
                id="op-title"
                value={state.title}
                onChange={(e) => update({ title: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {state.title.length} chars
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="op-desc">og:description</Label>
              <Textarea
                id="op-desc"
                value={state.description}
                onChange={(e) => update({ description: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {state.description.length} chars
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="op-image">og:image URL</Label>
              <Input
                id="op-image"
                value={state.image}
                onChange={(e) => update({ image: e.target.value })}
                type="url"
                placeholder="https://example.com/og.png (1200×630)"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="op-url">og:url</Label>
                <Input
                  id="op-url"
                  value={state.url}
                  onChange={(e) => update({ url: e.target.value })}
                  type="url"
                />
              </div>
              <div className="space-y-2">
                <Label>og:type</Label>
                <Select value={state.type} onValueChange={(v) => update({ type: v })}>
                  <SelectTrigger id="op-type">
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
              <Label htmlFor="op-site">og:site_name</Label>
              <Input
                id="op-site"
                value={state.siteName}
                onChange={(e) => update({ siteName: e.target.value })}
              />
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          {/* Previews */}
          <div className="rounded-xl border bg-muted/30 p-5">
            <Tabs defaultValue="facebook" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="facebook">Facebook</TabsTrigger>
                <TabsTrigger value="twitter">Twitter / X</TabsTrigger>
                <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
                <TabsTrigger value="slack">Slack</TabsTrigger>
              </TabsList>

              {/* Facebook */}
              <TabsContent value="facebook" className="mt-4">
                <div className="overflow-hidden rounded-lg border bg-[#f0f2f5] dark:bg-[#18191a]">
                  <div className="aspect-[1.91/1] w-full bg-muted">
                    <ImageBlock src={state.image} alt={state.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="bg-[#ffffff] p-3 dark:bg-[#242526]">
                    <p className="text-[11px] uppercase tracking-wide text-[#65676b] dark:text-[#b0b3b8]">
                      {displayUrl(state.url).toUpperCase()}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-base font-semibold text-[#050505] dark:text-[#e4e6eb]">
                      {titleOr}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-[#65676b] dark:text-[#b0b3b8]">
                      {descOr}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Facebook shows a large image (1.91:1), title (2 lines), description (2 lines) and uppercase URL.
                </p>
              </TabsContent>

              {/* Twitter / X */}
              <TabsContent value="twitter" className="mt-4">
                <div className="overflow-hidden rounded-2xl border bg-[#ffffff] dark:bg-[#15202b]">
                  <div className="aspect-[2/1] w-full bg-muted">
                    <ImageBlock src={state.image} alt={state.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-[#536471] dark:text-[#71767b]">
                      {displayUrl(state.url)}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-base font-semibold text-[#0f1419] dark:text-[#e7e9ea]">
                      {titleOr}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-[#536471] dark:text-[#71767b]">
                      {descOr}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Twitter summary_large_image uses a 2:1 image and shows title (1 line) + description (2 lines).
                </p>
              </TabsContent>

              {/* LinkedIn */}
              <TabsContent value="linkedin" className="mt-4">
                <div className="overflow-hidden rounded-md border bg-[#ffffff] dark:bg-[#1d2226]">
                  <div className="aspect-[1.91/1] w-full bg-muted">
                    <ImageBlock src={state.image} alt={state.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="border-t bg-[#edf3f8] p-3 dark:bg-[#1d2226]">
                    <p className="text-xs font-semibold uppercase text-[#5e6a75] dark:text-[#b0b3b8]">
                      {siteOrDomain}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#000000] dark:text-[#e4e6eb]">
                      {titleOr}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-[#5e6a75] dark:text-[#b0b3b8]">
                      {descOr}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  LinkedIn shows the site name above a 2-line title and 2-line description, on a tinted footer.
                </p>
              </TabsContent>

              {/* Slack / iMessage */}
              <TabsContent value="slack" className="mt-4">
                <div className="flex gap-3 rounded-md border bg-[#ffffff] p-3 dark:bg-[#1a1d21]">
                  <div className="h-20 w-20 flex-none overflow-hidden rounded bg-muted">
                    <ImageBlock src={state.image} alt={state.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[#1d9bd1] dark:text-[#1d9bd1]">
                      {domainOf(state.url) || "example.com"}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-[#1d1c1d] dark:text-[#f1f1f1]">
                      {titleOr}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[#616061] dark:text-[#c7c7c7]">
                      {descOr}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Slack and iMessage show a small square thumbnail beside a 1-line title and 2-line description.
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Tips */}
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm">
          <Globe className="mt-0.5 h-5 w-5 flex-none text-muted-foreground" />
          <div className="space-y-1 text-muted-foreground">
            <p className="font-medium text-foreground">Image best practices</p>
            <p>
              Use a 1200×630 px (1.91:1) PNG or JPG under 1 MB, hosted on HTTPS.
              Twitter's <code>summary_large_image</code> uses 2:1 (1200×600), so a 1.91:1 image is the safer shared choice.
            </p>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Fill in the Open Graph fields",
        description:
          "Enter og:title, og:description, og:image URL, og:url, og:site_name and og:type. These power link cards across Facebook, Twitter/X, LinkedIn and Slack.",
      },
      {
        title: "Switch between platforms",
        description:
          "Each tab renders the card with that platform's dimensions, colours and clipping rules. Toggle between them to spot truncation or image-fit issues.",
      },
      {
        title: "Check your image",
        description:
          "If your image URL is unreachable from this browser, the preview shows an empty placeholder. Use a public HTTPS URL to see the real image.",
      },
      {
        title: "Iterate and deploy",
        description:
          "Once you're happy with all four previews, use the Open Graph Generator tool to emit the actual <meta> tag block to paste into your HTML.",
      },
    ],
    useCases: [
      "Preview a campaign landing page card before launch.",
      "Spot a missing or undersized og:image that breaks Slack thumbnails.",
      "Compare how the same card renders on Twitter vs LinkedIn for a blog post.",
      "Test og:title and og:description length against each platform's clipping.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The previews are visual approximations. Each platform caches and
          re-renders cards server-side, so the live card may differ slightly.
        </li>
        <li>
          Images load from your browser. If the URL is blocked by CORS or
          authentication, the preview placeholder will appear.
        </li>
        <li>
          Line-clamp limits (1–2 lines) are estimates. Real platforms measure
          pixel width, not character count.
        </li>
        <li>
          Twitter's small <code>summary</code> card (square image) is not
          shown here — only <code>summary_large_image</code>.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why does my image not show up?",
        a: "The URL must be a public HTTPS image. If your browser can't load it (CORS, auth, or wrong URL), the preview shows a placeholder. Open the image URL directly in a new tab to verify.",
      },
      {
        q: "Do I still need twitter:* tags?",
        a: "Twitter falls back to og:* tags for title, description and image, but emitting explicit twitter:card=summary_large_image is good practice. Use the Open Graph Generator to produce both blocks.",
      },
      {
        q: "How do I refresh the card after deploying?",
        a: "Facebook: Sharing Debugger. Twitter: Card Validator. LinkedIn: Post Inspector. Slack: slack.com/app-unfurl. Each platform caches aggressively — force a refresh there after deploying.",
      },
      {
        q: "What image dimensions should I use?",
        a: "1200×630 (1.91:1) is the safest shared size. Twitter prefers 1200×600 (2:1) for summary_large_image. Square 512×512 works for the small Twitter summary card.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
