"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { RotateCcw, Download } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { downloadText } from "../developer/_dev-helpers";

const SAMPLE_URLS = `https://example.com/
https://example.com/about
https://example.com/blog
https://example.com/blog/hello-world
https://example.com/contact`;

const CHANGE_FREQS = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];
const OMIT_SENTINEL = "__omit__";

interface SitemapOptions {
  lastmod: string;       // YYYY-MM-DD or blank
  changefreq: string;    // "" | always | hourly | ...
  priority: string;      // "" or 0.0-1.0
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidDate(value: string): boolean {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function SitemapGenerator({ tool }: { tool: ToolDefinition }) {
  const [urlsText, setUrlsText] = React.useState(SAMPLE_URLS);
  const [options, setOptions] = React.useState<SitemapOptions>({
    lastmod: "",
    changefreq: "weekly",
    priority: "0.8",
  });

  const { generated, warning } = React.useMemo(() => {
    const lines = urlsText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return { generated: "", warning: null as string | null };

    let warn: string | null = null;
    if (lines.length > 50000) {
      warn = "Google limits sitemaps to 50,000 URLs per file. Split your sitemap.";
    }

    const valid: string[] = [];
    const invalid: string[] = [];
    for (const l of lines) {
      if (isValidUrl(l)) valid.push(l);
      else invalid.push(l);
    }
    if (invalid.length > 0) {
      const skipWarn = `Skipped ${invalid.length} invalid URL${invalid.length === 1 ? "" : "s"}: ${invalid.slice(0, 3).join(", ")}${invalid.length > 3 ? "…" : ""}`;
      warn = warn ? `${warn} · ${skipWarn}` : skipWarn;
    }

    if (valid.length === 0) return { generated: "", warning: warn };

    const changeFreqValue =
      options.changefreq === OMIT_SENTINEL ? "" : options.changefreq;

    const out: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ];
    for (const url of valid) {
      out.push("  <url>");
      out.push(`    <loc>${escapeXml(url)}</loc>`);
      if (options.lastmod && isValidDate(options.lastmod)) {
        out.push(`    <lastmod>${options.lastmod}</lastmod>`);
      }
      if (changeFreqValue) {
        out.push(`    <changefreq>${changeFreqValue}</changefreq>`);
      }
      if (options.priority) {
        const p = Number(options.priority);
        if (Number.isFinite(p) && p >= 0 && p <= 1) {
          out.push(`    <priority>${p.toFixed(1)}</priority>`);
        }
      }
      out.push("  </url>");
    }
    out.push("</urlset>");
    return { generated: out.join("\n"), warning: warn };
  }, [urlsText, options]);

  const urlCount = React.useMemo(
    () => urlsText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).length,
    [urlsText]
  );

  const reset = () => {
    setUrlsText(SAMPLE_URLS);
    setOptions({ lastmod: "", changefreq: "weekly", priority: "0.8" });
    toast.info("Reset to defaults.");
  };

  const content: ToolContent = {
    intro:
      "Paste a list of URLs (one per line) and optionally set a global lastmod, changefreq and priority. The tool emits a valid XML sitemap ready to upload to your site root and submit to Google Search Console.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Input */}
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sm-urls">URLs (one per line)</Label>
                <span className="text-xs text-muted-foreground">
                  {urlCount} URL{urlCount === 1 ? "" : "s"}
                </span>
              </div>
              <Textarea
                id="sm-urls"
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                placeholder={SAMPLE_URLS}
                rows={10}
                spellCheck={false}
                className="font-mono text-xs"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="sm-lastmod">lastmod (optional)</Label>
                <Input
                  id="sm-lastmod"
                  type="date"
                  value={options.lastmod}
                  onChange={(e) =>
                    setOptions((p) => ({ ...p, lastmod: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>changefreq</Label>
                <Select
                  value={options.changefreq}
                  onValueChange={(v) =>
                    setOptions((p) => ({ ...p, changefreq: v }))
                  }
                >
                  <SelectTrigger id="sm-changefreq">
                    <SelectValue placeholder="(omit)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={OMIT_SENTINEL}>(omit)</SelectItem>
                    {CHANGE_FREQS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sm-priority">priority</Label>
                <Input
                  id="sm-priority"
                  inputMode="decimal"
                  value={options.priority}
                  onChange={(e) =>
                    setOptions((p) => ({ ...p, priority: e.target.value }))
                  }
                  placeholder="0.0 – 1.0"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              These values are applied to every URL in the list. To set per-URL values, hand-edit the generated XML.
            </p>

            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          {/* Output */}
          <div className="space-y-3 rounded-xl border bg-muted/30 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">sitemap.xml</h3>
              <div className="flex gap-1.5">
                <CopyButton value={generated} size="sm" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!generated}
                  onClick={() => {
                    downloadText("sitemap.xml", generated, "application/xml");
                    toast.success("Downloaded sitemap.xml");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                </Button>
              </div>
            </div>

            {warning && (
              <div
                role="alert"
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300"
              >
                {warning}
              </div>
            )}

            <pre className="max-h-[28rem] overflow-auto rounded-lg border bg-background p-3 font-mono text-xs">
              <code>{generated || "Paste URLs on the left to generate a sitemap."}</code>
            </pre>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Paste your URLs",
        description:
          "Enter one absolute URL per line (https:// or http://). Relative paths and non-http URLs are skipped with a warning.",
      },
      {
        title: "Set global options",
        description:
          "Optionally pick a lastmod date, a changefreq and a priority. These are applied to every URL. Leave them blank to omit them.",
      },
      {
        title: "Review the XML",
        description:
          "The generated sitemap.xml appears on the right, with a warning if any URLs were skipped or if the list exceeds 50,000 entries.",
      },
      {
        title: "Copy or download",
        description:
          "Use Copy to put the XML on your clipboard, or Download to save it as sitemap.xml. Upload it to your site root and submit it to Google Search Console.",
      },
    ],
    useCases: [
      "Generate a sitemap for a small static site without a CMS.",
      "Audit a hand-written sitemap by regenerating it from a clean URL list.",
      "Produce a quick sitemap.xml for a prototype before wiring up server-side generation.",
      "Generate a sitemap for a blog by pasting all post URLs exported from your CMS.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>lastmod, changefreq and priority are applied globally. Per-URL values require hand-editing the generated XML.</li>
        <li>Google limits a single sitemap to 50,000 URLs and 50 MB uncompressed. This tool warns at 50,000 URLs but does not split the file.</li>
        <li>Only absolute http/https URLs are emitted. Relative paths and other protocols are skipped.</li>
        <li>The tool does not generate a sitemap index file. For multi-sitemap sites, build the index by hand or with a separate tool.</li>
      </ul>
    ),
    faq: [
      {
        q: "Where do I upload the sitemap?",
        a: "Upload sitemap.xml to the root of your site, e.g. https://example.com/sitemap.xml. Then submit the URL in Google Search Console → Sitemaps.",
      },
      {
        q: "Does Google care about changefreq and priority?",
        a: "Not much. Google mostly uses lastmod to decide when to recrawl. changefreq and priority are hints that are largely ignored, but they are still emitted for completeness.",
      },
      {
        q: "What lastmod value should I use?",
        a: "Use the date the page was last meaningfully updated, in YYYY-MM-DD format. Do not set lastmod to today's date unless the page actually changed — Google learns to ignore unreliable lastmod values.",
      },
      {
        q: "What if I have more than 50,000 URLs?",
        a: "Split the list into multiple sitemap files and create a sitemap index file that lists them. This tool does not generate index files — use a dedicated sitemap splitter for large sites.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
