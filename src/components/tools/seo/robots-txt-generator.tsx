"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Plus, Trash2, Download } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { downloadText } from "../developer/_dev-helpers";

type AccessMode = "allow-all" | "disallow-all" | "custom";

interface Rule {
  id: string;
  userAgent: string;
  // Each line is a path; conventionally we'll output one rule per line as `Disallow:` / `Allow:`.
  disallow: string;
  allow: string;
}

const newRuleId = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_RULES: Rule[] = [
  {
    id: newRuleId(),
    userAgent: "*",
    disallow: "/admin/\n/search",
    allow: "",
  },
];

export function RobotsTxtGenerator({ tool }: { tool: ToolDefinition }) {
  const [mode, setMode] = React.useState<AccessMode>("custom");
  const [rules, setRules] = React.useState<Rule[]>(DEFAULT_RULES);
  const [sitemap, setSitemap] = React.useState("https://example.com/sitemap.xml");
  const [crawlDelay, setCrawlDelay] = React.useState("");

  const updateRule = (id: string, patch: Partial<Rule>) =>
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRule = () =>
    setRules((prev) => [
      ...prev,
      { id: newRuleId(), userAgent: "*", disallow: "", allow: "" },
    ]);

  const removeRule = (id: string) =>
    setRules((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));

  const reset = () => {
    setMode("custom");
    setRules(DEFAULT_RULES);
    setSitemap("https://example.com/sitemap.xml");
    setCrawlDelay("");
    toast.info("Reset to defaults.");
  };

  const generated = React.useMemo(() => {
    if (mode === "allow-all") {
      const lines = ["User-agent: *", "Disallow:", ""];
      if (sitemap.trim()) lines.push(`Sitemap: ${sitemap.trim()}`);
      return lines.join("\n");
    }
    if (mode === "disallow-all") {
      const lines = ["User-agent: *", "Disallow: /", ""];
      if (sitemap.trim()) lines.push(`Sitemap: ${sitemap.trim()}`);
      return lines.join("\n");
    }

    // Custom rules.
    const blocks: string[] = [];
    for (const rule of rules) {
      const ua = rule.userAgent.trim() || "*";
      const lines = [`User-agent: ${ua}`];
      const allowLines = rule.allow
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const disallowLines = rule.disallow
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      for (const p of allowLines) lines.push(`Allow: ${p}`);
      for (const p of disallowLines) lines.push(`Disallow: ${p}`);
      if (crawlDelay.trim()) {
        const cd = Number(crawlDelay);
        if (Number.isFinite(cd) && cd > 0) lines.push(`Crawl-delay: ${cd}`);
      }
      // If neither allow nor disallow, emit an empty Disallow to allow all for this UA.
      if (allowLines.length === 0 && disallowLines.length === 0) {
        lines.push("Disallow:");
      }
      blocks.push(lines.join("\n"));
    }
    const out = blocks.join("\n\n");
    if (sitemap.trim()) {
      return `${out}\n\nSitemap: ${sitemap.trim()}`;
    }
    return out;
  }, [mode, rules, sitemap, crawlDelay]);

  const content: ToolContent = {
    intro:
      "Choose allow-all, disallow-all or a custom rule set, then add per-user-agent Allow and Disallow directives line by line. Append a sitemap URL and (optionally) a crawl-delay. Copy or download the resulting robots.txt file.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Form */}
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label>Access mode</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  { id: "allow-all", label: "Allow all" },
                  { id: "disallow-all", label: "Disallow all" },
                  { id: "custom", label: "Custom rules" },
                ] as { id: AccessMode; label: string }[]).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={
                      "rounded-md border px-3 py-2 text-sm transition-colors " +
                      (mode === m.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background hover:bg-muted")
                    }
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {mode === "custom" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>User-agent rules ({rules.length})</Label>
                  <Button variant="outline" size="sm" onClick={addRule}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add rule
                  </Button>
                </div>
                <div className="space-y-3">
                  {rules.map((r, i) => (
                    <div key={r.id} className="space-y-2 rounded-lg border bg-background p-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Rule {i + 1}
                        </span>
                        <Input
                          value={r.userAgent}
                          onChange={(e) => updateRule(r.id, { userAgent: e.target.value })}
                          placeholder="User-agent (e.g. * or Googlebot)"
                          className="h-8 flex-1 text-xs"
                          aria-label="User-agent"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-none"
                          onClick={() => removeRule(r.id)}
                          disabled={rules.length === 1}
                          aria-label="Remove rule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs" htmlFor={`ru-allow-${r.id}`}>
                            Allow (one path per line)
                          </Label>
                          <Textarea
                            id={`ru-allow-${r.id}`}
                            value={r.allow}
                            onChange={(e) => updateRule(r.id, { allow: e.target.value })}
                            placeholder="/public/"
                            rows={3}
                            className="text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs" htmlFor={`ru-disallow-${r.id}`}>
                            Disallow (one path per line)
                          </Label>
                          <Textarea
                            id={`ru-disallow-${r.id}`}
                            value={r.disallow}
                            onChange={(e) => updateRule(r.id, { disallow: e.target.value })}
                            placeholder="/admin/"
                            rows={3}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ru-delay">Crawl-delay (seconds, optional)</Label>
                  <Input
                    id="ru-delay"
                    value={crawlDelay}
                    onChange={(e) => setCrawlDelay(e.target.value)}
                    inputMode="numeric"
                    placeholder="e.g. 10"
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Note: Google ignores Crawl-delay. Bing and Yandex honour it.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ru-sitemap">Sitemap URL</Label>
              <Input
                id="ru-sitemap"
                value={sitemap}
                onChange={(e) => setSitemap(e.target.value)}
                placeholder="https://example.com/sitemap.xml"
                type="url"
              />
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          {/* Output */}
          <div className="space-y-3 rounded-xl border bg-muted/30 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">robots.txt</h3>
              <div className="flex gap-1.5">
                <CopyButton value={generated} size="sm" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    downloadText("robots.txt", generated, "text/plain");
                    toast.success("Downloaded robots.txt");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                </Button>
              </div>
            </div>
            <pre className="overflow-auto rounded-lg border bg-background p-3 font-mono text-xs">
              <code>{generated || "Pick a mode to generate a robots.txt."}</code>
            </pre>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Pick an access mode",
        description:
          "Choose Allow all (open site), Disallow all (block everything) or Custom rules (per-user-agent directives).",
      },
      {
        title: "Add custom rules (optional)",
        description:
          "In Custom mode, add one block per user-agent. Enter Allow and Disallow paths one per line. Use * to match all bots.",
      },
      {
        title: "Add a sitemap URL",
        description:
          "The Sitemap: directive at the end of the file tells crawlers where your XML sitemap lives.",
      },
      {
        title: "Copy or download",
        description:
          "Use Copy to put the robots.txt content on your clipboard, or Download to save it as robots.txt ready to upload to your site root.",
      },
    ],
    useCases: [
      "Block crawlers from indexing your /admin/ or /search/ paths.",
      "Prevent a staging site from being indexed at all (Disallow /).",
      "Allow Googlebot but slow down Bing and Yandex with a crawl-delay.",
      "Point crawlers at your sitemap.xml to speed up discovery of new pages.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>robots.txt is a request, not a command. Malicious crawlers ignore it.</li>
        <li>Google ignores the <code>Crawl-delay</code> directive. Bing and Yandex honour it; this tool emits it only when provided.</li>
        <li>Pattern matching (<code>*</code>, <code>$</code>) is bot-dependent. The tool does not validate patterns — keep them simple to maximise compatibility.</li>
        <li>The tool does not verify that your sitemap URL is reachable. Test it in a browser after deploying.</li>
      </ul>
    ),
    faq: [
      {
        q: "Where do I put robots.txt?",
        a: "At the root of your domain: https://example.com/robots.txt. It must be served as text/plain and respond with HTTP 200.",
      },
      {
        q: "What does `Disallow:` (empty) mean?",
        a: "An empty Disallow means “disallow nothing” — i.e. allow the entire site. This is the recommended way to allow all crawling for a specific user-agent.",
      },
      {
        q: "Does Google honour crawl-delay?",
        a: "No. Google ignores Crawl-delay entirely. Use Google Search Console's crawl-rate settings if you need to throttle Googlebot.",
      },
      {
        q: "Should I block /search/ or /admin/?",
        a: "Yes — search-result pages and admin areas usually should not be indexed. Disallow /admin/ and /search/ to keep them out of the index and to prevent crawl-budget waste.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
