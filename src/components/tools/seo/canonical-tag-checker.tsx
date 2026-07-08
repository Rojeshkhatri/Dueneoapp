"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Sample Article — Dueneo Blog</title>
  <meta name="description" content="A sample article about SEO best practices.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://example.com/blog/seo-best-practices">
  <link rel="alternate" hreflang="en" href="https://example.com/blog/seo-best-practices">
  <link rel="alternate" hreflang="es" href="https://example.com/es/blog/seo-best-practices">
  <meta property="og:title" content="SEO Best Practices">
  <meta property="og:description" content="A sample article about SEO best practices.">
  <meta property="og:image" content="https://example.com/og.png">
  <meta property="og:url" content="https://example.com/blog/seo-best-practices">
</head>
<body>
  <h1>SEO Best Practices</h1>
</body>
</html>`;

interface Hreflang {
  hreflang: string;
  href: string;
}

interface OgTag {
  property: string;
  content: string;
}

interface ParsedHead {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;
  hreflang: Hreflang[];
  og: OgTag[];
  viewport?: string;
  charset?: string;
}

type Severity = "error" | "warning" | "info";

interface Issue {
  severity: Severity;
  message: string;
}

function parseHead(html: string): ParsedHead {
  const empty: ParsedHead = { hreflang: [], og: [] };
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return empty;
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = doc.querySelector("title")?.textContent?.trim() || undefined;
  const description =
    doc.querySelector('meta[name="description" i]')?.getAttribute("content") ??
    undefined;
  const canonical =
    doc.querySelector('link[rel="canonical" i]')?.getAttribute("href") ??
    undefined;
  const robots =
    doc.querySelector('meta[name="robots" i]')?.getAttribute("content") ??
    undefined;
  const viewport =
    doc.querySelector('meta[name="viewport" i]')?.getAttribute("content") ??
    undefined;
  const charsetMeta = doc.querySelector("meta[charset]");
  const charset = charsetMeta?.getAttribute("charset") ?? undefined;

  const hreflang: Hreflang[] = Array.from(
    doc.querySelectorAll('link[rel="alternate" i][hreflang]')
  ).map((el) => ({
    hreflang: el.getAttribute("hreflang") ?? "",
    href: el.getAttribute("href") ?? "",
  }));

  const og: OgTag[] = Array.from(
    doc.querySelectorAll('meta[property^="og:"]')
  ).map((el) => ({
    property: el.getAttribute("property") ?? "",
    content: el.getAttribute("content") ?? "",
  }));

  return { title, description, canonical, robots, hreflang, og, viewport, charset };
}

function validate(head: ParsedHead): Issue[] {
  const issues: Issue[] = [];

  // Title checks.
  if (!head.title) {
    issues.push({
      severity: "error",
      message: "Missing <title> tag. Every page needs a unique, descriptive title.",
    });
  } else {
    if (head.title.length > 60) {
      issues.push({
        severity: "warning",
        message: `Title is ${head.title.length} chars — Google truncates around 60. Consider shortening.`,
      });
    } else if (head.title.length < 30) {
      issues.push({
        severity: "info",
        message: `Title is only ${head.title.length} chars. You have room to add keywords or branding.`,
      });
    }
  }

  // Description checks.
  if (!head.description) {
    issues.push({
      severity: "error",
      message: "Missing <meta name=\"description\">. Add a 120–160 char description.",
    });
  } else if (head.description.length > 160) {
    issues.push({
      severity: "warning",
      message: `Description is ${head.description.length} chars — Google truncates around 160.`,
    });
  } else if (head.description.length < 70) {
    issues.push({
      severity: "info",
      message: `Description is only ${head.description.length} chars. Aim for 120–160 to use the full snippet.`,
    });
  }

  // Canonical checks.
  if (!head.canonical) {
    issues.push({
      severity: "warning",
      message: "Missing <link rel=\"canonical\">. Add a canonical URL to prevent duplicate-content issues.",
    });
  } else {
    try {
      const u = new URL(head.canonical);
      if (u.protocol !== "https:") {
        issues.push({
          severity: "warning",
          message: "Canonical URL is not HTTPS. Use https:// for the canonical.",
        });
      }
    } catch {
      issues.push({
        severity: "error",
        message: `Canonical is not a valid absolute URL: "${head.canonical}".`,
      });
    }
  }

  // Robots checks.
  if (head.robots) {
    const r = head.robots.toLowerCase();
    if (r.includes("noindex")) {
      issues.push({
        severity: "warning",
        message: 'Meta robots contains "noindex". Search engines will not index this page.',
      });
      if (head.canonical) {
        issues.push({
          severity: "info",
          message: "Page is noindex but has a canonical. noindex usually overrides canonical — Google will not follow it.",
        });
      }
    }
    if (r.includes("none")) {
      issues.push({
        severity: "warning",
        message: 'Meta robots "none" is equivalent to "noindex, nofollow". Page will not be indexed or crawled.',
      });
    }
    if (!r.includes("noindex") && !r.includes("index") && !r.includes("follow") && !r.includes("nofollow")) {
      issues.push({
        severity: "info",
        message: `Meta robots value "${head.robots}" does not contain any recognised directives.`,
      });
    }
  }

  // Hreflang checks.
  if (head.hreflang.length > 0) {
    const hasDefault = head.hreflang.some((h) => h.hreflang.toLowerCase() === "x-default");
    if (!hasDefault) {
      issues.push({
        severity: "info",
        message: "hreflang tags present but no x-default. Add one to specify the fallback URL for unmatched locales.",
      });
    }
    for (const h of head.hreflang) {
      if (!h.href) {
        issues.push({
          severity: "error",
          message: `hreflang "${h.hreflang}" has an empty href attribute.`,
        });
      }
    }
  }

  // Open Graph checks.
  const ogMap = new Map(head.og.map((o) => [o.property.toLowerCase(), o.content]));
  const requiredOg = ["og:title", "og:description", "og:image", "og:url"];
  for (const key of requiredOg) {
    if (!ogMap.has(key)) {
      issues.push({
        severity: "warning",
        message: `Missing <meta property="${key}">. Required for rich social-media link cards.`,
      });
    }
  }
  if (ogMap.has("og:title") && head.title && ogMap.get("og:title") !== head.title) {
    issues.push({
      severity: "info",
      message: "og:title differs from <title>. That's fine, but make sure both are intentional.",
    });
  }
  if (ogMap.has("og:url") && head.canonical && ogMap.get("og:url") !== head.canonical) {
    issues.push({
      severity: "warning",
      message: "og:url and canonical differ. They should usually point to the same absolute URL.",
    });
  }
  if (ogMap.has("og:image")) {
    const img = ogMap.get("og:image")!;
    if (!/^https:\/\//i.test(img)) {
      issues.push({
        severity: "warning",
        message: "og:image is not an HTTPS URL. Most social platforms require HTTPS images.",
      });
    }
  }

  return issues;
}

function countBySeverity(issues: Issue[]): { error: number; warning: number; info: number } {
  return {
    error: issues.filter((i) => i.severity === "error").length,
    warning: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length,
  };
}

const SEVERITY_STYLE: Record<
  Severity,
  { icon: React.ReactNode; cls: string }
> = {
  error: {
    icon: <XCircle className="mt-0.5 h-4 w-4 flex-none text-rose-600 dark:text-rose-400" />,
    cls: "border-rose-500/30 bg-rose-500/5",
  },
  warning: {
    icon: <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600 dark:text-amber-400" />,
    cls: "border-amber-500/30 bg-amber-500/5",
  },
  info: {
    icon: <Info className="mt-0.5 h-4 w-4 flex-none text-sky-600 dark:text-sky-400" />,
    cls: "border-sky-500/30 bg-sky-500/5",
  },
};

function FieldRow({
  label,
  value,
  hint,
}: {
  label: string;
  value?: string;
  hint?: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 border-t px-3 py-2 text-xs first:border-t-0">
      <div className="font-medium text-muted-foreground">{label}</div>
      <div className="col-span-2 break-all font-mono">
        {value ? (
          value
        ) : (
          <span className="text-rose-500">— missing —</span>
        )}
        {hint && <span className="ml-2 text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

export function CanonicalTagChecker({ tool }: { tool: ToolDefinition }) {
  const [htmlText, setHtmlText] = React.useState(SAMPLE_HTML);

  const head = React.useMemo(() => parseHead(htmlText), [htmlText]);
  const issues = React.useMemo(() => validate(head), [head]);
  const counts = React.useMemo(() => countBySeverity(issues), [issues]);

  const reset = () => {
    setHtmlText(SAMPLE_HTML);
    toast.info("Reset to sample HTML.");
  };

  const ogTitle = head.og.find((o) => o.property.toLowerCase() === "og:title")?.content;
  const ogDescription = head.og.find((o) => o.property.toLowerCase() === "og:description")?.content;
  const ogImage = head.og.find((o) => o.property.toLowerCase() === "og:image")?.content;
  const ogUrl = head.og.find((o) => o.property.toLowerCase() === "og:url")?.content;
  const ogType = head.og.find((o) => o.property.toLowerCase() === "og:type")?.content;
  const ogSiteName = head.og.find((o) => o.property.toLowerCase() === "og:site_name")?.content;

  const hasError = counts.error > 0;
  const hasWarning = counts.warning > 0;
  const allClear = !hasError && !hasWarning;

  const content: ToolContent = {
    intro:
      "Paste your page HTML to inspect canonical, hreflang, robots, Open Graph, title and description tags all in one place. The tool flags missing canonicals, conflicting robots directives, length issues and Open Graph gaps.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Input */}
          <div className="space-y-3 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="cc-html">Page HTML</Label>
              <Textarea
                id="cc-html"
                value={htmlText}
                onChange={(e) => setHtmlText(e.target.value)}
                rows={18}
                spellCheck={false}
                className="font-mono text-xs"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          {/* Status + issues */}
          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                allClear
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : hasError
                    ? "border-rose-500/40 bg-rose-500/10"
                    : "border-amber-500/40 bg-amber-500/10"
              }`}
            >
              {allClear ? (
                <CheckCircle2 className="h-6 w-6 flex-none text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="h-6 w-6 flex-none text-amber-600 dark:text-amber-400" />
              )}
              <div className="text-sm">
                <div className="font-semibold">
                  {allClear
                    ? "No critical issues"
                    : hasError
                      ? `${counts.error} error${counts.error === 1 ? "" : "s"} found`
                      : `${counts.warning} warning${counts.warning === 1 ? "" : "s"}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {counts.error} error(s) · {counts.warning} warning(s) · {counts.info} info
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Issues</h3>
              {issues.length === 0 ? (
                <p className="text-sm text-muted-foreground">No issues detected.</p>
              ) : (
                <ul className="space-y-2">
                  {issues.map((iss, i) => {
                    const style = SEVERITY_STYLE[iss.severity];
                    return (
                      <li
                        key={i}
                        className={`flex gap-2 rounded-lg border p-2 text-xs ${style.cls}`}
                      >
                        {style.icon}
                        <span>{iss.message}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Extracted tags */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Extracted tags</h3>
          <div className="divide-y rounded-lg border bg-background">
            <FieldRow label="<title>" value={head.title} hint={head.title ? `(${head.title.length} chars)` : undefined} />
            <FieldRow label="description" value={head.description} hint={head.description ? `(${head.description.length} chars)` : undefined} />
            <FieldRow label="canonical" value={head.canonical} />
            <FieldRow label="robots" value={head.robots} />
            <FieldRow label="charset" value={head.charset} />
            <FieldRow label="viewport" value={head.viewport} />
            <FieldRow label="og:title" value={ogTitle} />
            <FieldRow label="og:description" value={ogDescription} />
            <FieldRow label="og:image" value={ogImage} />
            <FieldRow label="og:url" value={ogUrl} />
            <FieldRow label="og:type" value={ogType} />
            <FieldRow label="og:site_name" value={ogSiteName} />
          </div>

          {head.hreflang.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                hreflang ({head.hreflang.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {head.hreflang.map((h, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {h.hreflang || "(empty)"} → {h.href || "(empty)"}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {head.og.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                All Open Graph tags ({head.og.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {head.og.map((o, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {o.property}={o.content.slice(0, 40) || "(empty)"}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Paste your HTML",
        description:
          "Copy the full page HTML or just the <head>. The tool extracts canonical, hreflang, robots, Open Graph, title and description tags with the browser's DOMParser.",
      },
      {
        title: "Read the status banner",
        description:
          "The banner summarises errors, warnings and info notes. Errors block rich-result eligibility; warnings should be fixed; info is advisory.",
      },
      {
        title: "Review the extracted tags",
        description:
          "Every detected tag is listed with its value and character count. Missing fields are highlighted in red so you can spot gaps at a glance.",
      },
      {
        title: "Fix issues and re-paste",
        description:
          "Each issue lists what to fix. Update your HTML and paste it again — the tool re-validates instantly.",
      },
    ],
    useCases: [
      "Audit a page before launch for missing canonical, hreflang or OG tags.",
      "Catch conflicting robots + canonical directives (e.g. noindex with a canonical).",
      "Verify title and description lengths are within Google's snippet limits.",
      "Confirm hreflang pairs include an x-default fallback.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Only tags inside the pasted HTML are checked. Server-rendered or
          JS-injected tags added after parse time are not detected.
        </li>
        <li>
          The tool does not fetch live pages — paste the HTML yourself (View
          Source in your browser, then copy).
        </li>
        <li>
          Schema.org JSON-LD is not checked here — use the Schema Validator
          tool for structured data.
        </li>
        <li>Length thresholds (60 for title, 160 for description) are guidelines, not hard limits.</li>
      </ul>
    ),
    faq: [
      {
        q: "Should og:url and canonical match?",
        a: "Yes, in almost all cases. Both should point to the same absolute canonical URL. A mismatch usually indicates a copy-paste error or a misconfigured CMS.",
      },
      {
        q: "Is noindex + canonical valid?",
        a: "Technically yes, but Google treats noindex as the stronger signal — it will not index the page and effectively ignores the canonical. If you want the canonical to be respected, remove noindex.",
      },
      {
        q: "Do I need hreflang x-default?",
        a: "It's strongly recommended. x-default tells search engines which URL to serve for users whose locale does not match any declared hreflang variant.",
      },
      {
        q: "Why is my title showing a length warning?",
        a: "Google typically truncates titles around 60 characters (roughly 600 pixels). Longer titles may still display but get cut off. Shorten to keep the full title visible.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
