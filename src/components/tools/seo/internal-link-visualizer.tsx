"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw, ExternalLink, Anchor, Link2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Sample Page</title>
  <base href="https://example.com/blog/hello-world">
</head>
<body>
  <h1>Hello World</h1>
  <p>Read our <a href="/about">about page</a> or visit
  <a href="https://google.com" rel="nofollow noopener">Google</a>.</p>
  <p>See also <a href="#section-2">section 2</a> below and
  <a href="/blog/hello-world.pdf">the PDF version</a>.</p>
  <p>External: <a href="https://github.com" rel="noopener">GitHub</a>.</p>
  <footer>
    <a href="mailto:hello@example.com">Email us</a>
  </footer>
</body>
</html>`;

type LinkType = "internal" | "external" | "anchor" | "mailto" | "other";

interface LinkInfo {
  href: string;
  text: string;
  rel: string;
  type: LinkType;
  target: string;
}

function classifyLink(
  href: string,
  baseOrigin: string,
  baseHost: string
): LinkType {
  const lower = href.toLowerCase();
  if (href.startsWith("#")) return "anchor";
  if (lower.startsWith("mailto:")) return "mailto";
  if (lower.startsWith("tel:")) return "other";
  if (lower.startsWith("javascript:")) return "other";
  try {
    const u = new URL(href, baseOrigin);
    if (u.host === baseHost) return "internal";
    return "external";
  } catch {
    // Relative URL that failed to resolve — treat as internal.
    return "internal";
  }
}

function extractLinks(html: string, baseUrl: string): {
  links: LinkInfo[];
  baseOrigin: string;
  baseHost: string;
} {
  let baseOrigin = "";
  let baseHost = "";
  try {
    const u = new URL(baseUrl);
    baseOrigin = u.origin;
    baseHost = u.host;
  } catch {
    // No usable URL — internal/external classification falls back.
  }

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return { links: [], baseOrigin, baseHost };
  }

  const doc = new DOMParser().parseFromString(html, "text/html");

  // Pick up <base href> if present.
  const baseEl = doc.querySelector("base[href]");
  if (baseEl) {
    const href = baseEl.getAttribute("href") ?? "";
    try {
      const u = new URL(href, baseOrigin || undefined);
      baseOrigin = u.origin;
      baseHost = u.host;
    } catch {
      // ignore
    }
  }

  const anchors = Array.from(doc.querySelectorAll("a[href]"));
  const links: LinkInfo[] = anchors.map((a) => {
    const href = a.getAttribute("href") ?? "";
    const rel = a.getAttribute("rel") ?? "";
    const target = a.getAttribute("target") ?? "";
    const text = (a.textContent ?? "").replace(/\s+/g, " ").trim();
    const type = baseHost
      ? classifyLink(href, baseOrigin, baseHost)
      : href.startsWith("#")
        ? "anchor"
        : href.toLowerCase().startsWith("mailto:")
          ? "mailto"
          : "other";
    return { href, text, rel, type, target };
  });

  return { links, baseOrigin, baseHost };
}

interface GraphNode {
  id: string;
  label: string;
  type: "page" | "internal" | "external" | "anchor";
}

interface GraphEdge {
  from: string;
  to: string;
}

function buildGraph(links: LinkInfo[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes = new Map<string, GraphNode>();
  nodes.set("page", { id: "page", label: "This page", type: "page" });

  const seenTargets = new Set<string>();
  const edges: GraphEdge[] = [];

  links.forEach((l, i) => {
    const targetId = `t${i}`;
    if (seenTargets.has(l.href)) return;
    seenTargets.add(l.href);
    let label = l.href;
    if (label.length > 32) label = label.slice(0, 30) + "…";
    nodes.set(targetId, {
      id: targetId,
      label,
      type:
        l.type === "internal"
          ? "internal"
          : l.type === "anchor"
            ? "anchor"
            : "external",
    });
    edges.push({ from: "page", to: targetId });
  });

  return { nodes: Array.from(nodes.values()), edges };
}

const NODE_FILL: Record<GraphNode["type"], string> = {
  page: "#2563eb",
  internal: "#10b981",
  external: "#f59e0b",
  anchor: "#8b5cf6",
};

const TYPE_BADGE: Record<LinkType, { label: string; cls: string; icon: React.ReactNode }> = {
  internal: {
    label: "internal",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: <Link2 className="h-3 w-3" />,
  },
  external: {
    label: "external",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: <ExternalLink className="h-3 w-3" />,
  },
  anchor: {
    label: "anchor",
    cls: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    icon: <Anchor className="h-3 w-3" />,
  },
  mailto: {
    label: "mailto",
    cls: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    icon: <Link2 className="h-3 w-3" />,
  },
  other: {
    label: "other",
    cls: "border-muted bg-muted text-muted-foreground",
    icon: <Link2 className="h-3 w-3" />,
  },
};

export function InternalLinkVisualizer({ tool }: { tool: ToolDefinition }) {
  const [htmlText, setHtmlText] = React.useState(SAMPLE_HTML);
  const [baseUrl, setBaseUrl] = React.useState("https://example.com/blog/hello-world");

  const { links, baseHost } = React.useMemo(
    () => extractLinks(htmlText, baseUrl),
    [htmlText, baseUrl]
  );

  const graph = React.useMemo(() => buildGraph(links), [links]);

  const stats = React.useMemo(() => {
    const byType = (t: LinkType) => links.filter((l) => l.type === t).length;
    return {
      total: links.length,
      internal: byType("internal"),
      external: byType("external"),
      anchor: byType("anchor"),
      mailto: byType("mailto"),
      other: byType("other"),
      nofollow: links.filter((l) => /\bnofollow\b/i.test(l.rel)).length,
    };
  }, [links]);

  // SVG layout: central node, targets arranged in a circle around it.
  const layout = React.useMemo(() => {
    const W = 520;
    const H = 360;
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) / 2 - 60;
    const targets = graph.nodes.filter((n) => n.id !== "page");
    const positions = new Map<string, { x: number; y: number }>();
    positions.set("page", { x: cx, y: cy });
    const n = targets.length;
    targets.forEach((node, i) => {
      // Start at -90deg (top) and walk clockwise.
      const angle = -Math.PI / 2 + (i / Math.max(1, n)) * Math.PI * 2;
      positions.set(node.id, {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      });
    });
    return { W, H, positions };
  }, [graph]);

  const reset = () => {
    setHtmlText(SAMPLE_HTML);
    setBaseUrl("https://example.com/blog/hello-world");
    toast.info("Reset to sample HTML.");
  };

  const content: ToolContent = {
    intro:
      "Paste your page HTML and the page's base URL. The tool extracts every <a href> link, classifies it as internal, external, anchor or mailto, and renders a simple radial graph showing what this page links to.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Inputs */}
          <div className="space-y-3 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="il-html">Page HTML</Label>
              <Textarea
                id="il-html"
                value={htmlText}
                onChange={(e) => setHtmlText(e.target.value)}
                rows={14}
                spellCheck={false}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="il-base">Base URL of this page</Label>
              <Input
                id="il-base"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://example.com/blog/hello-world"
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Used to classify links as internal vs external. A
                <code className="mx-1 rounded bg-muted px-1 py-0.5">&lt;base&gt;</code>
                tag in the HTML overrides this.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          {/* Graph + stats */}
          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border bg-background p-2 text-center">
                <div className="text-xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total links</div>
              </div>
              <div className="rounded-lg border bg-background p-2 text-center">
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.internal}
                </div>
                <div className="text-xs text-muted-foreground">Internal</div>
              </div>
              <div className="rounded-lg border bg-background p-2 text-center">
                <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {stats.external}
                </div>
                <div className="text-xs text-muted-foreground">External</div>
              </div>
              <div className="rounded-lg border bg-background p-2 text-center">
                <div className="text-xl font-bold text-violet-600 dark:text-violet-400">
                  {stats.anchor}
                </div>
                <div className="text-xs text-muted-foreground">Anchor</div>
              </div>
              <div className="rounded-lg border bg-background p-2 text-center">
                <div className="text-xl font-bold">{stats.mailto}</div>
                <div className="text-xs text-muted-foreground">Mailto</div>
              </div>
              <div className="rounded-lg border bg-background p-2 text-center">
                <div className="text-xl font-bold">{stats.nofollow}</div>
                <div className="text-xs text-muted-foreground">Nofollow</div>
              </div>
            </div>

            {baseHost && (
              <p className="text-xs text-muted-foreground">
                Detected host:{" "}
                <code className="rounded bg-background px-1.5 py-0.5">{baseHost}</code>
              </p>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold">Link graph</h3>
              <div className="overflow-x-auto rounded-lg border bg-background p-2">
                {stats.total === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No links found in the HTML.
                  </p>
                ) : (
                  <svg
                    viewBox={`0 0 ${layout.W} ${layout.H}`}
                    className="h-auto w-full min-w-[400px]"
                    role="img"
                    aria-label="Link graph showing this page in the centre and target links around it"
                  >
                    {/* Edges */}
                    {graph.edges.map((e, i) => {
                      const from = layout.positions.get(e.from)!;
                      const to = layout.positions.get(e.to)!;
                      return (
                        <line
                          key={i}
                          x1={from.x}
                          y1={from.y}
                          x2={to.x}
                          y2={to.y}
                          stroke="currentColor"
                          className="text-muted-foreground/40"
                          strokeWidth={1}
                        />
                      );
                    })}
                    {/* Nodes */}
                    {graph.nodes.map((n) => {
                      const p = layout.positions.get(n.id)!;
                      const fill = NODE_FILL[n.type];
                      const labelY = n.id === "page" ? p.y + 22 : p.y + 22;
                      return (
                        <g key={n.id}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={n.id === "page" ? 10 : 7}
                            fill={fill}
                          />
                          <text
                            x={p.x}
                            y={labelY}
                            textAnchor="middle"
                            fontSize={10}
                            fill="currentColor"
                            className="text-foreground"
                          >
                            {n.label.length > 24
                              ? n.label.slice(0, 22) + "…"
                              : n.label}
                          </text>
                          <title>{n.label}</title>
                        </g>
                      );
                    })}
                    {/* Legend */}
                    <g transform={`translate(8, ${layout.H - 18})`}>
                      {(["page", "internal", "external", "anchor"] as const).map(
                        (t, i) => (
                          <g key={t} transform={`translate(${i * 90}, 0)`}>
                            <circle cx={6} cy={6} r={5} fill={NODE_FILL[t]} />
                            <text
                              x={16}
                              y={9}
                              fontSize={9}
                              className="fill-muted-foreground"
                            >
                              {t}
                            </text>
                          </g>
                        )
                      )}
                    </g>
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Links table */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">All links</h3>
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No <code>&lt;a href&gt;</code> elements found.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-lg border bg-background">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr className="text-left">
                    <th className="px-2 py-1.5 font-medium">Type</th>
                    <th className="px-2 py-1.5 font-medium">Anchor text</th>
                    <th className="px-2 py-1.5 font-medium">href</th>
                    <th className="px-2 py-1.5 font-medium">rel</th>
                    <th className="px-2 py-1.5 font-medium">target</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((l, i) => {
                    const badge = TYPE_BADGE[l.type];
                    return (
                      <tr key={i} className="border-t align-top">
                        <td className="px-2 py-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${badge.cls}`}
                          >
                            {badge.icon}
                            {badge.label}
                          </span>
                        </td>
                        <td className="max-w-[180px] px-2 py-1.5">
                          {l.text || (
                            <span className="text-muted-foreground">(empty)</span>
                          )}
                        </td>
                        <td className="break-all px-2 py-1.5 font-mono">
                          {l.href}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {l.rel || "—"}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {l.target || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Paste your HTML",
        description:
          "Copy the full page HTML (a fragment with <a> tags also works). The tool parses it with the browser's DOMParser — no layout or scripts run.",
      },
      {
        title: "Set the page's base URL",
        description:
          "Enter the absolute URL of the page the HTML came from. This is used to classify relative links as internal. A <base href> tag inside the HTML overrides it.",
      },
      {
        title: "Read the summary",
        description:
          "Counts of internal, external, anchor, mailto and nofollow links appear at the top, along with the detected host.",
      },
      {
        title: "Inspect the graph and table",
        description:
          "The SVG graph shows this page in the centre and every distinct link target around it. The table lists every <a> tag with its anchor text, href, rel and target.",
      },
    ],
    useCases: [
      "Audit a blog post for too many external links vs internal links.",
      "Spot missing rel=\"nofollow noopener\" on external links.",
      "Find empty anchor text or links pointing to unexpected destinations.",
      "Visualise the link profile of a page before an internal-linking cleanup.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Only <code>&lt;a href&gt;</code> links are extracted. Links from
          <code>&lt;link&gt;</code>, <code>&lt;img src&gt;</code> or
          JavaScript-injected buttons are not included.
        </li>
        <li>
          Internal vs external is decided by comparing the link's resolved
          host to the base URL's host. Subdomains count as external.
        </li>
        <li>
          The graph collapses duplicate hrefs into a single node but the table
          lists every <code>&lt;a&gt;</code> occurrence.
        </li>
        <li>Links injected by JavaScript after parse time are not detected.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why are my relative links showing as internal?",
        a: "Relative links are resolved against the base URL. If the resolved URL is on the same host as the base, it's classified as internal. This matches how browsers resolve and request the link.",
      },
      {
        q: "Does this follow rel=\"nofollow\"?",
        a: "Yes. The rel attribute is captured for every link and the summary shows how many carry nofollow. The classification (internal/external) is not affected by rel.",
      },
      {
        q: "Can I paste a fragment instead of a full HTML document?",
        a: "Yes. The DOMParser handles fragments too — any <a href> in the pasted text is extracted. The base URL is still used to classify relative links.",
      },
      {
        q: "What about <base href>?",
        a: "If the HTML contains a <base href> tag, its value overrides the base URL you typed. This matches how browsers resolve relative URLs.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
