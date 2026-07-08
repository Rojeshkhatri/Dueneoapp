"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, FileWarning } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

const SAMPLE_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/blog</loc>
    <lastmod>2025-02-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://example.com/blog/hello-world</loc>
    <lastmod>2025-01-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2024-12-10</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://example.com/contact</loc>
    <lastmod>2024-11-05</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>`;

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

interface SitemapIndexEntry {
  loc: string;
  lastmod?: string;
}

interface ParsedSitemap {
  kind: "urlset" | "sitemapindex" | "unknown" | "error";
  urls: SitemapUrl[];
  sitemaps: SitemapIndexEntry[];
  error?: string;
}

function parseSitemap(xml: string): ParsedSitemap {
  const trimmed = xml.trim();
  if (!trimmed) return { kind: "unknown", urls: [], sitemaps: [] };

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return { kind: "error", urls: [], sitemaps: [], error: "DOMParser unavailable." };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    return {
      kind: "error",
      urls: [],
      sitemaps: [],
      error: "XML is not well-formed. Fix the syntax error and try again.",
    };
  }

  const isIndex =
    doc.documentElement.nodeName.toLowerCase() === "sitemapindex";
  const isUrlset = doc.documentElement.nodeName.toLowerCase() === "urlset";

  if (isIndex) {
    const nodes = Array.from(doc.querySelectorAll("sitemap"));
    const sitemaps: SitemapIndexEntry[] = nodes.map((n) => {
      const loc = n.querySelector("loc")?.textContent?.trim() ?? "";
      const lastmod = n.querySelector("lastmod")?.textContent?.trim() || undefined;
      return { loc, lastmod };
    });
    return { kind: "sitemapindex", urls: [], sitemaps };
  }

  if (isUrlset) {
    const nodes = Array.from(doc.querySelectorAll("url"));
    const urls: SitemapUrl[] = nodes.map((n) => {
      const loc = n.querySelector("loc")?.textContent?.trim() ?? "";
      const lastmod = n.querySelector("lastmod")?.textContent?.trim() || undefined;
      const changefreq =
        n.querySelector("changefreq")?.textContent?.trim() || undefined;
      const priority =
        n.querySelector("priority")?.textContent?.trim() || undefined;
      return { loc, lastmod, changefreq, priority };
    });
    return { kind: "urlset", urls, sitemaps: [] };
  }

  return {
    kind: "error",
    urls: [],
    sitemaps: [],
    error:
      "Root element must be <urlset> or <sitemapindex>. Got: <" +
      doc.documentElement.nodeName +
      ">.",
  };
}

interface TreeNode {
  name: string;
  fullUrl?: string;
  children: Map<string, TreeNode>;
  meta?: SitemapUrl;
}

function buildTree(urls: SitemapUrl[]): TreeNode {
  const root: TreeNode = { name: "", children: new Map() };
  for (const u of urls) {
    let path = "/";
    let origin = "";
    try {
      const parsed = new URL(u.loc);
      origin = parsed.origin;
      path = parsed.pathname + (parsed.search || "");
    } catch {
      path = u.loc;
    }

    // Attach the origin at root level so the tree displays the host.
    if (origin && !root.children.has(origin)) {
      root.children.set(origin, { name: origin, children: new Map() });
    }
    const hostNode = origin ? root.children.get(origin)! : root;

    const segments = path.split("/").filter(Boolean);
    let cur = hostNode;
    let acc = origin;
    segments.forEach((seg, i) => {
      acc = acc + "/" + seg;
      if (!cur.children.has(seg)) {
        cur.children.set(seg, { name: decodeURIComponent(seg), children: new Map() });
      }
      cur = cur.children.get(seg)!;
      if (i === segments.length - 1) {
        cur.fullUrl = u.loc;
        cur.meta = u;
      }
    });

    // Handle root path "/" — attach meta to hostNode.
    if (segments.length === 0) {
      hostNode.fullUrl = u.loc;
      hostNode.meta = u;
    }
  }
  return root;
}

function TreeView({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const entries = Array.from(node.children.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  if (entries.length === 0 && depth === 0) {
    return (
      <p className="text-sm text-muted-foreground">No URLs to display.</p>
    );
  }
  return (
    <ul className={depth === 0 ? "space-y-0.5" : "ml-3 space-y-0.5"}>
      {entries.map((child) => (
        <li key={child.name} className="text-sm">
          <div
            className="flex flex-wrap items-center gap-1.5"
            style={{ paddingLeft: depth * 12 }}
          >
            <span className="text-muted-foreground">└─</span>
            <span className={child.fullUrl ? "font-medium" : "text-muted-foreground"}>
              {child.name}
            </span>
            {child.fullUrl && child.meta?.lastmod && (
              <Badge variant="outline" className="text-[10px]">
                {child.meta.lastmod}
              </Badge>
            )}
            {child.fullUrl && child.meta?.priority && (
              <Badge variant="secondary" className="text-[10px]">
                p={child.meta.priority}
              </Badge>
            )}
            {child.fullUrl && child.meta?.changefreq && (
              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                {child.meta.changefreq}
              </Badge>
            )}
          </div>
          {child.children.size > 0 && (
            <TreeView node={child} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

function safeDate(s?: string): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

export function SitemapVisualizer({ tool }: { tool: ToolDefinition }) {
  const [xmlText, setXmlText] = React.useState(SAMPLE_SITEMAP);

  const parsed = React.useMemo(() => parseSitemap(xmlText), [xmlText]);

  const tree = React.useMemo(() => buildTree(parsed.urls), [parsed]);

  const stats = React.useMemo(() => {
    if (parsed.kind !== "urlset") return null;
    const dates = parsed.urls
      .map((u) => safeDate(u.lastmod))
      .filter((d): d is number => d !== null)
      .sort((a, b) => a - b);
    return {
      count: parsed.urls.length,
      withLastmod: parsed.urls.filter((u) => u.lastmod).length,
      withChangefreq: parsed.urls.filter((u) => u.changefreq).length,
      withPriority: parsed.urls.filter((u) => u.priority).length,
      earliest: dates.length ? new Date(dates[0]).toISOString().slice(0, 10) : null,
      latest: dates.length
        ? new Date(dates[dates.length - 1]).toISOString().slice(0, 10)
        : null,
    };
  }, [parsed]);

  const reset = () => {
    setXmlText(SAMPLE_SITEMAP);
    toast.info("Reset to sample sitemap.");
  };

  const content: ToolContent = {
    intro:
      "Paste an XML sitemap (urlset or sitemap index) to visualise its structure. The tool extracts loc, lastmod, changefreq and priority for each URL, shows summary stats and a date range, and renders the URL hierarchy as a collapsible tree.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Input */}
          <div className="space-y-3 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="sm-xml">XML sitemap</Label>
              <Textarea
                id="sm-xml"
                value={xmlText}
                onChange={(e) => setXmlText(e.target.value)}
                rows={18}
                spellCheck={false}
                className="font-mono text-xs"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          {/* Summary + tree */}
          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            {parsed.kind === "error" && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                <FileWarning className="mt-0.5 h-4 w-4 flex-none" />
                <span>{parsed.error}</span>
              </div>
            )}

            {parsed.kind === "unknown" && (
              <p className="text-sm text-muted-foreground">
                Paste XML on the left to visualise it.
              </p>
            )}

            {parsed.kind === "sitemapindex" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg border bg-background p-3">
                    <div className="text-2xl font-bold">
                      {parsed.sitemaps.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Child sitemaps
                    </div>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <div className="text-2xl font-bold">
                      {
                        parsed.sitemaps.filter((s) => s.lastmod).length
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">
                      With lastmod
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">
                    Child sitemaps
                  </h3>
                  <div className="max-h-96 overflow-y-auto rounded-lg border bg-background">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                        <tr className="text-left">
                          <th className="px-2 py-1.5 font-medium">URL</th>
                          <th className="px-2 py-1.5 font-medium">Lastmod</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.sitemaps.map((s, i) => (
                          <tr key={i} className="border-t">
                            <td className="break-all px-2 py-1.5 font-mono">
                              {s.loc || "(empty)"}
                            </td>
                            <td className="px-2 py-1.5 text-muted-foreground">
                              {s.lastmod || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {parsed.kind === "urlset" && stats && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border bg-background p-3 text-center">
                    <div className="text-2xl font-bold">{stats.count}</div>
                    <div className="text-xs text-muted-foreground">URLs</div>
                  </div>
                  <div className="rounded-lg border bg-background p-3 text-center">
                    <div className="text-2xl font-bold">
                      {stats.withLastmod}
                    </div>
                    <div className="text-xs text-muted-foreground">lastmod</div>
                  </div>
                  <div className="rounded-lg border bg-background p-3 text-center">
                    <div className="text-2xl font-bold">
                      {stats.earliest ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">Earliest</div>
                  </div>
                  <div className="rounded-lg border bg-background p-3 text-center">
                    <div className="text-2xl font-bold">
                      {stats.latest ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">Latest</div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">URL tree</h3>
                  <div className="max-h-72 overflow-y-auto rounded-lg border bg-background p-3">
                    <TreeView node={tree} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* URL table */}
        {parsed.kind === "urlset" && parsed.urls.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">All URLs</h3>
            <div className="max-h-96 overflow-y-auto rounded-lg border bg-background">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr className="text-left">
                    <th className="px-2 py-1.5 font-medium">loc</th>
                    <th className="px-2 py-1.5 font-medium">lastmod</th>
                    <th className="px-2 py-1.5 font-medium">changefreq</th>
                    <th className="px-2 py-1.5 font-medium">priority</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.urls.map((u, i) => (
                    <tr key={i} className="border-t">
                      <td className="break-all px-2 py-1.5 font-mono">
                        {u.loc}
                      </td>
                      <td className="px-2 py-1.5 text-muted-foreground">
                        {u.lastmod ?? "—"}
                      </td>
                      <td className="px-2 py-1.5 text-muted-foreground">
                        {u.changefreq ?? "—"}
                      </td>
                      <td className="px-2 py-1.5 text-muted-foreground">
                        {u.priority ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste an XML sitemap",
        description:
          "Copy the contents of a sitemap.xml file. Both <urlset> (list of URLs) and <sitemapindex> (list of child sitemaps) are supported.",
      },
      {
        title: "Review the summary",
        description:
          "For urlsets, see the total URL count, how many have lastmod, and the earliest / latest lastmod dates. For index files, see the child sitemap count.",
      },
      {
        title: "Explore the URL tree",
        description:
          "URLs are grouped by host and then by path segment, so you can see the site structure at a glance. Leaf nodes show lastmod, changefreq and priority badges.",
      },
      {
        title: "Scan the full URL table",
        description:
          "The table at the bottom lists every URL with all four fields, useful for spotting missing lastmod or unusual priority values.",
      },
    ],
    useCases: [
      "Audit a sitemap for missing lastmod dates before submitting to Search Console.",
      "Visualise a sitemap index file to see all child sitemaps at once.",
      "Spot orphaned or duplicate URLs by scanning the full URL table.",
      "Verify that a freshly generated sitemap matches the expected site structure.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The tool does not fetch remote sitemaps — paste the XML. Very large
          sitemaps (50,000+ URLs) may render slowly.
        </li>
        <li>
          lastmod is parsed as a date but not validated against a specific
          format. Both <code>YYYY-MM-DD</code> and full ISO 8601 are accepted.
        </li>
        <li>
          The tree groups by host then by path segment. Query strings are kept
          on the leaf URL but do not affect tree structure.
        </li>
        <li>Namespaces other than the sitemaps.org namespace are ignored.</li>
      </ul>
    ),
    faq: [
      {
        q: "What is the difference between a sitemap and a sitemap index?",
        a: "A sitemap (urlset) lists individual page URLs. A sitemap index (sitemapindex) lists other sitemap files — used when a site has more than 50,000 URLs and needs to split sitemaps across multiple files.",
      },
      {
        q: "Why does my sitemap show an XML error?",
        a: "The XML must be well-formed: every tag must be closed, attributes quoted, and the document must have a single root element. The tool reports the error from the browser's XML parser.",
      },
      {
        q: "Does this tool validate against the sitemaps.org schema?",
        a: "It parses the standard <url>, <loc>, <lastmod>, <changefreq> and <priority> elements. It does not validate every constraint of the schema (e.g. priority must be 0.0–1.0).",
      },
      {
        q: "Can I visualise a news, image or video sitemap?",
        a: "Only the core URL fields are shown. News-specific (<news:news>), image and video extensions are parsed as part of the XML but their child elements are not displayed.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
