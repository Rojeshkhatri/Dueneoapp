"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  ExternalLink,
  Facebook,
  Instagram,
  MessageCircle,
  RotateCcw,
  Twitter,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

interface LinkData {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
}

interface PlatformLimit {
  title: number;
  description: number;
}

const PLATFORM_LIMITS: Record<string, PlatformLimit & { label: string }> = {
  instagram: { label: "Instagram bio", title: 30, description: 80 },
  twitter: { label: "Twitter / X card", title: 70, description: 200 },
  facebook: { label: "Facebook share", title: 100, description: 200 },
  imessage: { label: "iMessage rich link", title: 60, description: 140 },
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function BioLinkPreview({ tool }: { tool: ToolDefinition }) {
  const [data, setData] = React.useState<LinkData>({
    title: "Dueneo — 100 free browser tools",
    description:
      "Compress images, format JSON, generate QR codes and more. All tools run locally in your browser. No signup, no upload.",
    imageUrl:
      "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&h=630&fit=crop",
    url: "https://dueneo.example.com",
  });

  const update = <K extends keyof LinkData>(key: K, value: LinkData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => {
    setData({ title: "", description: "", imageUrl: "", url: "" });
    toast.info("Cleared.");
  };

  const urlValid = data.url ? isValidUrl(data.url) : true;
  const imageValid = data.imageUrl ? isValidUrl(data.imageUrl) : true;

  const warnings: string[] = [];
  if (data.url && !urlValid) warnings.push("URL is not valid. Use a full https:// URL.");
  if (data.imageUrl && !imageValid) warnings.push("Image URL is not valid. Use a full https:// URL.");
  if (!data.imageUrl) warnings.push("Add an image URL — most platforms show a bigger card with an image.");
  if (data.imageUrl && imageValid) {
    const lower = data.imageUrl.toLowerCase();
    if (!lower.match(/\.(jpg|jpeg|png|webp|gif)/) && !lower.includes("unsplash")) {
      warnings.push("Image should be JPG, PNG or WebP for the best card preview.");
    }
  }
  if (data.title && data.title.length > 70) {
    warnings.push(`Title is ${data.title.length} chars — Twitter truncates at 70.`);
  }

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* Inputs */}
        <div className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Link details</h3>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bl-title">Title</Label>
            <Input
              id="bl-title"
              value={data.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="A short, catchy page title"
              maxLength={150}
            />
            <CharMeter value={data.title.length} max={70} ideal={50} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bl-desc">Description</Label>
            <Textarea
              id="bl-desc"
              value={data.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="A one-sentence summary that appears under the title."
              className="min-h-[80px] resize-y"
              maxLength={300}
            />
            <CharMeter value={data.description.length} max={200} ideal={140} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bl-img">Image URL</Label>
            <Input
              id="bl-img"
              value={data.imageUrl}
              onChange={(e) => update("imageUrl", e.target.value)}
              placeholder="https://example.com/og-image.jpg"
              className={!imageValid ? "border-rose-500" : ""}
            />
            <p className="text-xs text-muted-foreground">Recommended 1200 × 630px, under 5 MB.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bl-url">URL</Label>
            <Input
              id="bl-url"
              value={data.url}
              onChange={(e) => update("url", e.target.value)}
              placeholder="https://example.com/page"
              className={!urlValid ? "border-rose-500" : ""}
            />
          </div>

          {warnings.length > 0 && (
            <div className="space-y-1 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              {warnings.map((w, i) => (
                <p key={i}>• {w}</p>
              ))}
            </div>
          )}
        </div>

        {/* Previews */}
        <div className="space-y-4">
          {/* Instagram bio */}
          <PreviewCard platform="instagram" icon={<Instagram className="h-4 w-4" />}>
            <div className="rounded-lg border bg-white p-3 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
              <div className="flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
                <ExternalLink className="h-3 w-3" />
                {data.url ? domainOf(data.url) : "example.com"}
              </div>
              <p className="mt-1 text-sm font-semibold leading-snug">
                {truncate(data.title, PLATFORM_LIMITS.instagram.title) || "Your page title"}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {truncate(data.description, PLATFORM_LIMITS.instagram.description) || "Your description appears here."}
              </p>
            </div>
          </PreviewCard>

          {/* Twitter card */}
          <PreviewCard platform="twitter" icon={<Twitter className="h-4 w-4" />}>
            <div className="overflow-hidden rounded-lg border bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
              <div className="aspect-[1.91/1] w-full overflow-hidden bg-muted">
                {data.imageUrl && imageValid ? (
                  <img
                    src={data.imageUrl}
                    alt="Link preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Image preview
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-[11px] uppercase text-muted-foreground">
                  {data.url ? domainOf(data.url) : "example.com"}
                </p>
                <p className="mt-0.5 text-sm font-semibold leading-snug">
                  {truncate(data.title, PLATFORM_LIMITS.twitter.title) || "Your page title"}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {truncate(data.description, PLATFORM_LIMITS.twitter.description) || "Your description appears here."}
                </p>
              </div>
            </div>
          </PreviewCard>

          {/* Facebook share */}
          <PreviewCard platform="facebook" icon={<Facebook className="h-4 w-4" />}>
            <div className="overflow-hidden rounded-lg border bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
              <div className="aspect-[1.91/1] w-full overflow-hidden bg-muted">
                {data.imageUrl && imageValid ? (
                  <img
                    src={data.imageUrl}
                    alt="Link preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Image preview
                  </div>
                )}
              </div>
              <div className="bg-zinc-50 p-3 dark:bg-zinc-900">
                <p className="text-[11px] uppercase text-muted-foreground">
                  {data.url ? domainOf(data.url) : "example.com"}
                </p>
                <p className="mt-0.5 text-base font-semibold leading-snug">
                  {truncate(data.title, PLATFORM_LIMITS.facebook.title) || "Your page title"}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {truncate(data.description, PLATFORM_LIMITS.facebook.description) || "Your description appears here."}
                </p>
              </div>
            </div>
          </PreviewCard>

          {/* iMessage */}
          <PreviewCard platform="imessage" icon={<MessageCircle className="h-4 w-4" />}>
            <div className="rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-900">
              <div className="ml-auto max-w-[85%] overflow-hidden rounded-2xl rounded-br-sm bg-blue-500 text-white shadow-sm">
                <div className="aspect-[1.91/1] w-full overflow-hidden bg-blue-400">
                  {data.imageUrl && imageValid ? (
                    <img
                      src={data.imageUrl}
                      alt="Link preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold leading-snug">
                    {truncate(data.title, PLATFORM_LIMITS.imessage.title) || "Your page title"}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-blue-100">
                    {truncate(data.description, PLATFORM_LIMITS.imessage.description) || "Your description appears here."}
                  </p>
                  <p className="mt-1 text-[11px] text-blue-200">
                    {data.url ? domainOf(data.url) : "example.com"}
                  </p>
                </div>
              </div>
              <p className="mt-1 text-right text-[10px] text-muted-foreground">iMessage · now</p>
            </div>
          </PreviewCard>
        </div>
      </div>

      {/* Limits reference */}
      <div className="space-y-2 rounded-xl border bg-card p-4 sm:p-5">
        <h3 className="text-sm font-semibold">Character limits at a glance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Platform</th>
                <th className="py-2 pr-4 font-medium">Title</th>
                <th className="py-2 pr-4 font-medium">Description</th>
                <th className="py-2 font-medium">Image</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-4 font-medium">Instagram bio</td>
                <td className="py-2 pr-4">~30 chars</td>
                <td className="py-2 pr-4">~80 chars</td>
                <td className="py-2">Square 1:1, 1080px</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-medium">Twitter / X card</td>
                <td className="py-2 pr-4">~70 chars</td>
                <td className="py-2 pr-4">~200 chars</td>
                <td className="py-2">1200 × 630 (1.91:1)</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-medium">Facebook share</td>
                <td className="py-2 pr-4">~100 chars</td>
                <td className="py-2 pr-4">~200 chars</td>
                <td className="py-2">1200 × 630 (1.91:1)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">iMessage rich link</td>
                <td className="py-2 pr-4">~60 chars</td>
                <td className="py-2 pr-4">~140 chars</td>
                <td className="py-2">Varies; 1.91:1 safe</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Values are approximate and reflect common truncation thresholds. Each platform
          periodically revises its card layout.
        </p>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Type a title, description, image URL and target URL and instantly see how the link card will render on Instagram bio, Twitter / X, Facebook share and iMessage. Each preview truncates the text at that platform’s real-world character limits so you can spot truncation before you publish. Warnings flag missing images, bad URLs and titles that will be cut off.",
    tool: toolBody,
    howTo: [
      {
        title: "Enter the link details",
        description:
          "Type a page title, one-line description, image URL and the destination URL. Use full https:// URLs for both image and link.",
      },
      {
        title: "Inspect each preview",
        description:
          "Scroll through the four platform cards. Each preview shows exactly how much of your title and description will be visible after the platform’s truncation rules apply.",
      },
      {
        title: "Read the warnings",
        description:
          "Warnings flag missing images, invalid URLs, non-image file extensions and titles longer than 70 characters (the Twitter truncation point).",
      },
      {
        title: "Tune and ship",
        description:
          "Adjust your title and description until the previews look right across all four platforms, then publish your meta tags.",
      },
    ],
    useCases: [
      "Preview how a blog post will look when shared on Twitter before publishing.",
      "Confirm your Open Graph image displays correctly on Facebook.",
      "Tune a link-in-bio caption so it doesn’t truncate on Instagram.",
      "Check that an iMessage rich link card shows the right title and image.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Previews approximate each platform’s actual card layout. Real rendering depends on the platform’s current cache, theme and A/B tests.</li>
        <li>Instagram does not show unfurled link cards in feed posts — the “Instagram bio” preview reflects the short bio link card.</li>
        <li>Image URLs must be publicly accessible. Locally hosted or auth-gated images will not load.</li>
        <li>For the best social cards, also set og:title, og:description, og:image and twitter:card meta tags on your page — use the Meta Tag Generator and Open Graph Generator for that.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why is my image not showing in the preview?",
        a: "Most likely the image URL is not publicly accessible, or the file is not a recognised image format. Make sure the URL starts with https://, points to a JPG/PNG/WebP, and can be loaded in an incognito window.",
      },
      {
        q: "What size should my preview image be?",
        a: "1200 × 630 pixels (1.91:1 aspect ratio) is the safest size — it works for Twitter, Facebook and iMessage. Instagram bio prefers a square 1:1 image.",
      },
      {
        q: "Why is my title cut off on Twitter but not Facebook?",
        a: "Twitter truncates titles around 70 characters; Facebook allows roughly 100. The previews show the truncation point for each platform so you can write a title that fits the tightest constraint.",
      },
      {
        q: "Do these previews use my real Open Graph tags?",
        a: "No. The previews use the values you type in the form, not your page’s actual meta tags. Once you publish your meta tags, use the platform’s official debugger (Twitter Card Validator, Facebook Sharing Debugger) to verify the live card.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function CharMeter({
  value,
  max,
  ideal,
}: {
  value: number;
  max: number;
  ideal: number;
}) {
  const ratio = value / max;
  const color =
    value > max
      ? "text-rose-600 dark:text-rose-400"
      : ratio > 0.9
      ? "text-amber-600 dark:text-amber-400"
      : "text-emerald-600 dark:text-emerald-400";
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={`font-mono ${color}`}>
        {value}/{max}
      </span>
      <span className="text-muted-foreground">
        {value > max
          ? `${value - max} over`
          : value > ideal
          ? "tight"
          : "good"}
      </span>
    </div>
  );
}

function PreviewCard({
  platform,
  icon,
  children,
}: {
  platform: keyof typeof PLATFORM_LIMITS;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const meta = PLATFORM_LIMITS[platform];
  return (
    <div className="space-y-2 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {icon}
          <h3 className="text-sm font-semibold">{meta.label}</h3>
        </div>
        <div className="flex gap-1.5">
          <Badge variant="secondary">title ≤ {meta.title}</Badge>
          <Badge variant="secondary">desc ≤ {meta.description}</Badge>
        </div>
      </div>
      {children}
    </div>
  );
}
