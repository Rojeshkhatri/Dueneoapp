"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { RotateCcw, Monitor, Smartphone } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

const TITLE_IDEAL = 60;
const TITLE_MAX = 70;
const DESC_IDEAL = 160;
const DESC_MAX = 200;

interface SerpState {
  title: string;
  url: string;
  description: string;
}

const DEFAULT_STATE: SerpState = {
  title: "How to Write Better Headlines That Convert | Dueneo Blog",
  url: "https://example.com/blog/better-headlines",
  description:
    "A practical guide to writing headlines that grab attention, rank in search and drive clicks — with 12 worked examples and a free template.",
};

/**
 * Rough pixel-width estimate for the Google SERP.
 *
 * The SERP uses Arial for the title. We approximate the average character
 * width at ~8.5 px for desktop (size ~18px) and ~7.2 px for mobile (size
 * ~16px). CJK characters are wider (~16 px). This is intentionally a rough
 * estimate — Google measures real rendered width.
 */
function pixelWidth(text: string, mobile: boolean): number {
  let w = 0;
  for (const ch of text) {
    const isCJK = /[\u3000-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/.test(ch);
    if (isCJK) {
      w += mobile ? 16 : 18;
    } else if (/[MW@]/.test(ch)) {
      w += mobile ? 11 : 13;
    } else if (/[mw]/.test(ch)) {
      w += mobile ? 8.5 : 10;
    } else if (ch === "i" || ch === "l" || ch === "I" || ch === "1" || ch === "|") {
      w += mobile ? 3.5 : 4;
    } else {
      w += mobile ? 7.2 : 8.5;
    }
  }
  return Math.round(w);
}

const TITLE_PIXEL_LIMIT_DESKTOP = 600;
const TITLE_PIXEL_LIMIT_MOBILE = 520;
const DESC_PIXEL_LIMIT_DESKTOP = 980;
const DESC_PIXEL_LIMIT_MOBILE = 700;

function truncateByPixels(text: string, limit: number, mobile: boolean): string {
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const isCJK = /[\u3000-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/.test(ch);
    const cw = isCJK ? (mobile ? 16 : 18) : mobile ? 7.2 : 8.5;
    if (w + cw > limit) {
      return text.slice(0, Math.max(0, i - 1)).trimEnd() + "…";
    }
    w += cw;
  }
  return text;
}

function formatUrl(url: string): { crumbs: string[]; display: string } {
  if (!url) return { crumbs: [], display: "example.com" };
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    return {
      crumbs: [u.hostname, ...path.map((p) => decodeURIComponent(p))],
      display: u.hostname,
    };
  } catch {
    return { crumbs: [url], display: url };
  }
}

function lengthStatus(
  len: number,
  ideal: number,
  max: number
): { label: string; cls: string } {
  if (len === 0) return { label: "empty", cls: "text-rose-500" };
  if (len <= ideal) return { label: "ideal", cls: "text-emerald-600 dark:text-emerald-400" };
  if (len <= max) return { label: "ok", cls: "text-amber-600 dark:text-amber-400" };
  return { label: "too long", cls: "text-rose-500" };
}

export function SerpSnippetPreview({ tool }: { tool: ToolDefinition }) {
  const [state, setState] = React.useState<SerpState>(DEFAULT_STATE);
  const [mobile, setMobile] = React.useState(false);
  const update = (patch: Partial<SerpState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const reset = () => {
    setState(DEFAULT_STATE);
    setMobile(false);
    toast.info("Reset to defaults.");
  };

  const titlePx = pixelWidth(state.title, mobile);
  const descPx = pixelWidth(state.description, mobile);
  const titleLimit = mobile ? TITLE_PIXEL_LIMIT_MOBILE : TITLE_PIXEL_LIMIT_DESKTOP;
  const descLimit = mobile ? DESC_PIXEL_LIMIT_MOBILE : DESC_PIXEL_LIMIT_DESKTOP;
  const titleDisplay = truncateByPixels(state.title, titleLimit, mobile);
  const descDisplay = truncateByPixels(state.description, descLimit, mobile);
  const { crumbs } = formatUrl(state.url);

  const titleLenStatus = lengthStatus(state.title.length, TITLE_IDEAL, TITLE_MAX);
  const descLenStatus = lengthStatus(state.description.length, DESC_IDEAL, DESC_MAX);

  const content: ToolContent = {
    intro:
      "Enter your page title, URL and meta description to preview how Google may render them in search results. The tool estimates pixel width, flags truncation, and lets you toggle between desktop and mobile previews (which use different limits).",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Inputs */}
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sp-title">Title</Label>
                <Badge variant="outline" className={`text-xs ${titleLenStatus.cls}`}>
                  {state.title.length} / {TITLE_IDEAL} chars · {titleLenStatus.label}
                </Badge>
              </div>
              <Input
                id="sp-title"
                value={state.title}
                onChange={(e) => update({ title: e.target.value })}
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground">
                ~{titlePx}px wide · Google truncates around {titleLimit}px ({mobile ? "mobile" : "desktop"}).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sp-url">URL</Label>
              <Input
                id="sp-url"
                value={state.url}
                onChange={(e) => update({ url: e.target.value })}
                type="url"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sp-desc">Meta description</Label>
                <Badge variant="outline" className={`text-xs ${descLenStatus.cls}`}>
                  {state.description.length} / {DESC_IDEAL} chars · {descLenStatus.label}
                </Badge>
              </div>
              <Textarea
                id="sp-desc"
                value={state.description}
                onChange={(e) => update({ description: e.target.value })}
                rows={4}
                maxLength={300}
              />
              <p className="text-xs text-muted-foreground">
                ~{descPx}px wide · Google truncates around {descLimit}px ({mobile ? "mobile" : "desktop"}).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Tabs value={mobile ? "mobile" : "desktop"} onValueChange={(v) => setMobile(v === "mobile")}>
                <TabsList>
                  <TabsTrigger value="desktop" className="gap-1.5">
                    <Monitor className="h-3.5 w-3.5" /> Desktop
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="gap-1.5">
                    <Smartphone className="h-3.5 w-3.5" /> Mobile
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          {/* Preview */}
          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <h3 className="text-sm font-semibold">
              Google preview ({mobile ? "mobile" : "desktop"})
            </h3>

            <div className={mobile ? "max-w-[380px]" : ""}>
              <div className="rounded-lg border bg-[#ffffff] p-4 dark:bg-[#1f1f1f]">
                {/* URL breadcrumb */}
                <div className="flex items-center gap-1 text-xs text-[#4d5156] dark:text-[#bdc1c6]">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#4d5156]/30 dark:border-[#bdc1c6]/30">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </span>
                  {crumbs.length > 0 ? (
                    <span className="flex flex-wrap items-center gap-0.5">
                      {crumbs.map((c, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="mx-0.5 text-[#70757a]">›</span>}
                          <span>{c}</span>
                        </React.Fragment>
                      ))}
                    </span>
                  ) : (
                    <span>example.com</span>
                  )}
                </div>

                {/* Title */}
                <p
                  className="mt-1 font-medium leading-tight text-[#1a0dab] dark:text-[#8ab4f8]"
                  style={{ fontSize: mobile ? "16px" : "20px", lineHeight: 1.3 }}
                >
                  {titleDisplay || "Your title appears here"}
                </p>

                {/* Description */}
                <p
                  className="mt-1 text-[#4d5156] dark:text-[#bdc1c6]"
                  style={{ fontSize: mobile ? "13px" : "14px", lineHeight: 1.58 }}
                >
                  {descDisplay || "Your meta description appears here. Keep it under 160 characters."}
                </p>
              </div>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                Title shown: <span className="font-mono">{titleDisplay.length}</span> of{" "}
                <span className="font-mono">{state.title.length}</span> chars
                {titleDisplay.length < state.title.length && " (truncated)"}
              </p>
              <p>
                Description shown: <span className="font-mono">{descDisplay.length}</span> of{" "}
                <span className="font-mono">{state.description.length}</span> chars
                {descDisplay.length < state.description.length && " (truncated)"}
              </p>
              <p className="mt-1">
                Pixel-width estimates are approximations. Google measures the
                actual rendered width, which varies by font and locale.
              </p>
            </div>
          </div>
        </div>

        {/* Length guidelines */}
        <div className="grid gap-3 rounded-xl border bg-card p-5 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Title guidelines</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li><span className="text-emerald-600 dark:text-emerald-400">≤ {TITLE_IDEAL} chars</span> — ideal, rarely truncated.</li>
              <li><span className="text-amber-600 dark:text-amber-400">{TITLE_IDEAL + 1}–{TITLE_MAX} chars</span> — may truncate on some layouts.</li>
              <li><span className="text-rose-500">&gt; {TITLE_MAX} chars</span> — usually truncated with an ellipsis.</li>
              <li>Mobile uses a smaller font and tighter pixel limit ({TITLE_PIXEL_LIMIT_MOBILE}px).</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Description guidelines</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li><span className="text-emerald-600 dark:text-emerald-400">≤ {DESC_IDEAL} chars</span> — ideal, full snippet shown.</li>
              <li><span className="text-amber-600 dark:text-amber-400">{DESC_IDEAL + 1}–{DESC_MAX} chars</span> — may truncate.</li>
              <li><span className="text-rose-500">&gt; {DESC_MAX} chars</span> — almost always truncated.</li>
              <li>Google may rewrite descriptions entirely based on the query.</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter your title",
        description:
          "Type the page's <title>. The character and pixel counters update live and flag when you're over Google's typical limits.",
      },
      {
        title: "Set the URL",
        description:
          "Paste the absolute canonical URL. The preview renders it as a breadcrumb-style display (host › path › segments) like Google does.",
      },
      {
        title: "Write the meta description",
        description:
          "Keep it 120–160 characters. The tool shows whether Google will display it in full or truncate it.",
      },
      {
        title: "Toggle desktop / mobile",
        description:
          "Mobile uses smaller fonts and tighter pixel limits. Switch between the two to see how truncation differs.",
      },
    ],
    useCases: [
      "Preview a blog post title and description before publishing.",
      "Spot titles that get truncated to \u2026| Brand on mobile.",
      "Write a meta description that uses the full snippet width.",
      "Compare two title variants by pasting them and reading the pixel counter.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Pixel width is an estimate based on average character widths. Google
          measures the real rendered text, which varies by font, locale and
          device. Use this as a guide, not a guarantee.
        </li>
        <li>
          Google may rewrite titles and descriptions based on the user's query
          — your snippet is not guaranteed to appear as written.
        </li>
        <li>
          The preview does not simulate sitelinks, featured snippets, image
          packs or other SERP features.
        </li>
        <li>
          Date prefixes (e.g. "3 days ago —") that Google sometimes prepends
          are not modelled.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why does my title show 'ideal' but still get truncated in Google?",
        a: "The pixel estimate is approximate. Google measures real rendered width with its own font stack and locale, so a 58-char title with many wide letters (M, W) may truncate while a 62-char title with narrow letters (i, l) may not.",
      },
      {
        q: "Should I write the description to exactly 160 chars?",
        a: "Aim for 120–160. Slightly shorter is fine; longer risks truncation. Google often rewrites descriptions to match the query, so optimise for relevance, not exact length.",
      },
      {
        q: "Why are mobile and desktop limits different?",
        a: "Mobile uses a smaller font and narrower viewport, so the pixel budget is tighter (~520px for titles vs ~600px on desktop). The toggle lets you preview both.",
      },
      {
        q: "Does the URL format matter for SEO?",
        a: "Short, descriptive, lowercase URLs with hyphens are best. The breadcrumb-style display Google shows is derived from your URL path, so clean paths help users and search engines.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
