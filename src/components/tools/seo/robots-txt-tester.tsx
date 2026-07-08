"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { RotateCcw, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

const SAMPLE_ROBOTS = `User-agent: *
Disallow: /admin/
Disallow: /search
Disallow: /*.pdf$
Allow: /admin/login
Crawl-delay: 5

User-agent: Googlebot
Disallow: /private/

Sitemap: https://example.com/sitemap.xml`;

const SAMPLE_URLS = `https://example.com/
https://example.com/about
https://example.com/admin/dashboard
https://example.com/admin/login
https://example.com/search?q=hello
https://example.com/report.pdf
https://example.com/private/secret`;

interface RobotsRule {
  type: "allow" | "disallow";
  pattern: string;
}

interface RobotsGroup {
  userAgents: string[];
  rules: RobotsRule[];
  crawlDelay?: number;
}

interface ParsedRobots {
  groups: RobotsGroup[];
  sitemaps: string[];
}

const ALL_AGENTS_SENTINEL = "__all__";

/**
 * Parse a robots.txt file into groups + sitemaps.
 *
 * Rules:
 * - Lines starting with `User-agent:` begin a new agent block. Consecutive
 *   User-agent lines share the same rules. A non-User-agent line ends the
 *   agent run.
 * - `Allow:` and `Disallow:` add rules to the current group.
 * - `Crawl-delay:` sets the group crawl delay.
 * - `Sitemap:` lines are collected globally.
 * - Comments (`#`) and blank lines are ignored.
 */
function parseRobots(text: string): ParsedRobots {
  const lines = text.split(/\r?\n/);
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let inAgentHeader = false;

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;

    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === "user-agent") {
      if (!current || !inAgentHeader) {
        current = { userAgents: [], rules: [] };
        groups.push(current);
      }
      current.userAgents.push(value || "*");
      inAgentHeader = true;
      continue;
    }

    // Any non-User-agent line ends the consecutive agent header run.
    inAgentHeader = false;
    if (!current) {
      current = { userAgents: ["*"], rules: [] };
      groups.push(current);
    }

    if (field === "allow") {
      if (value) current.rules.push({ type: "allow", pattern: value });
    } else if (field === "disallow") {
      // `Disallow:` with empty value means "allow everything". We model it
      // as a zero-length pattern that never matches.
      current.rules.push({ type: "disallow", pattern: value });
    } else if (field === "crawl-delay") {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) current.crawlDelay = n;
    } else if (field === "sitemap") {
      if (value) sitemaps.push(value);
    }
    // Unknown fields are silently ignored.
  }

  return { groups, sitemaps };
}

/**
 * Convert a robots.txt path pattern into a regex.
 *
 * Patterns support:
 * - `*` matches any sequence (including `/`).
 * - `$` at end of pattern matches end of URL.
 * - All other characters are escaped literally.
 */
function patternToRegex(pattern: string): RegExp {
  let re = "^";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*") {
      re += ".*";
    } else if (ch === "$" && i === pattern.length - 1) {
      re += "$";
    } else {
      re += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(re);
}

/**
 * Evaluate a URL path against a group's rules using Google's "most specific
 * match wins" rule. On a tie (same length), Allow beats Disallow.
 */
function evaluateGroup(group: RobotsGroup, path: string): boolean {
  let best: { type: "allow" | "disallow"; length: number } | null = null;

  for (const rule of group.rules) {
    if (!rule.pattern) continue; // Empty Disallow = allow all, no match.
    const re = patternToRegex(rule.pattern);
    if (!re.test(path)) continue;
    const len = rule.pattern.length;
    if (
      !best ||
      len > best.length ||
      (len === best.length && rule.type === "allow")
    ) {
      best = { type: rule.type, length: len };
    }
  }

  // No matching rule → allowed by default.
  if (!best) return true;
  return best.type === "allow";
}

function pickGroup(parsed: ParsedRobots, userAgent: string): RobotsGroup | null {
  const ua = userAgent.toLowerCase();
  // Exact UA match wins, then longest prefix match, then `*`.
  let star: RobotsGroup | null = null;
  let bestPrefix: { g: RobotsGroup; len: number } | null = null;

  for (const g of parsed.groups) {
    for (const a of g.userAgents) {
      const al = a.toLowerCase();
      if (al === ua) return g;
      if (al === "*") {
        star = g;
      } else if (ua.startsWith(al) && (!bestPrefix || al.length > bestPrefix.len)) {
        bestPrefix = { g, len: al.length };
      }
    }
  }
  if (bestPrefix) return bestPrefix.g;
  return star;
}

interface UrlResult {
  url: string;
  path: string;
  allowed: boolean;
  matchedGroup: string;
}

function evalAll(
  parsed: ParsedRobots,
  urls: string[],
  userAgent: string
): UrlResult[] {
  const group = pickGroup(parsed, userAgent);
  const groupName = group
    ? group.userAgents.join(", ") || "*"
    : "(no matching group)";
  return urls.map((url) => {
    let path = "/";
    try {
      const u = new URL(url);
      path = u.pathname + u.search;
    } catch {
      // Treat bare path strings as paths.
      path = url.startsWith("/") ? url : "/" + url;
    }
    const allowed = group ? evaluateGroup(group, path) : true;
    return { url, path, allowed, matchedGroup: groupName };
  });
}

export function RobotsTxtTester({ tool }: { tool: ToolDefinition }) {
  const [robotsText, setRobotsText] = React.useState(SAMPLE_ROBOTS);
  const [urlsText, setUrlsText] = React.useState(SAMPLE_URLS);
  const [userAgent, setUserAgent] = React.useState("*");

  const parsed = React.useMemo(() => parseRobots(robotsText), [robotsText]);

  const detectedAgents = React.useMemo(() => {
    const set = new Set<string>();
    for (const g of parsed.groups) for (const a of g.userAgents) set.add(a);
    return Array.from(set);
  }, [parsed]);

  const urls = React.useMemo(
    () =>
      urlsText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean),
    [urlsText]
  );

  const results = React.useMemo(
    () => evalAll(parsed, urls, userAgent),
    [parsed, urls, userAgent]
  );

  const allowedCount = results.filter((r) => r.allowed).length;
  const blockedCount = results.length - allowedCount;

  const reset = () => {
    setRobotsText(SAMPLE_ROBOTS);
    setUrlsText(SAMPLE_URLS);
    setUserAgent("*");
    toast.info("Reset to defaults.");
  };

  const content: ToolContent = {
    intro:
      "Paste your robots.txt and a list of URLs to test, then pick a user-agent. The tool parses Allow, Disallow, Sitemap and Crawl-delay rules and reports ALLOWED or BLOCKED for each URL using Google's most-specific-match algorithm.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Inputs */}
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="rb-robots">robots.txt content</Label>
              <Textarea
                id="rb-robots"
                value={robotsText}
                onChange={(e) => setRobotsText(e.target.value)}
                rows={12}
                spellCheck={false}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rb-urls">Test URLs (one per line)</Label>
              <Textarea
                id="rb-urls"
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                rows={6}
                spellCheck={false}
                className="font-mono text-xs"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>User-agent</Label>
                <Select value={userAgent} onValueChange={setUserAgent}>
                  <SelectTrigger id="rb-ua">
                    <SelectValue placeholder="Pick a user-agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {!detectedAgents.includes("*") && (
                      <SelectItem value="*">*</SelectItem>
                    )}
                    {detectedAgents.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Input
                  aria-label="Custom user-agent"
                  value={userAgent}
                  onChange={(e) => setUserAgent(e.target.value)}
                  placeholder="Or type a custom UA"
                />
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          {/* Results */}
          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border bg-background p-3">
                <div className="text-2xl font-bold">{results.length}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {allowedCount}
                </div>
                <div className="text-xs text-muted-foreground">Allowed</div>
              </div>
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {blockedCount}
                </div>
                <div className="text-xs text-muted-foreground">Blocked</div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">
                Results for{" "}
                <code className="rounded bg-background px-1.5 py-0.5 text-xs">
                  {userAgent}
                </code>
              </h3>
              <div className="max-h-80 overflow-y-auto rounded-lg border bg-background">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                    <tr className="text-left">
                      <th className="px-2 py-1.5 font-medium">Status</th>
                      <th className="px-2 py-1.5 font-medium">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.length === 0 && (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-2 py-4 text-center text-muted-foreground"
                        >
                          Enter URLs above to test them.
                        </td>
                      </tr>
                    )}
                    {results.map((r, i) => (
                      <tr
                        key={i}
                        className="border-t"
                      >
                        <td className="px-2 py-1.5 align-top">
                          {r.allowed ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Allowed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                              <XCircle className="h-3.5 w-3.5" /> Blocked
                            </span>
                          )}
                        </td>
                        <td className="break-all px-2 py-1.5 font-mono">
                          {r.url}
                          <span className="ml-1 text-muted-foreground">
                            ({r.path})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {parsed.sitemaps.length > 0 && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Sitemaps declared</h3>
                <ul className="space-y-1 text-xs">
                  {parsed.sitemaps.map((s) => (
                    <li key={s} className="flex items-center gap-1.5">
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      <span className="break-all font-mono">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Parsed groups reference */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Parsed rule groups</h3>
          {parsed.groups.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No groups detected. Paste a robots.txt above.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {parsed.groups.map((g, i) => (
                <div key={i} className="rounded-lg border bg-background p-3">
                  <div className="flex flex-wrap items-center gap-1">
                    {g.userAgents.map((a) => (
                      <Badge key={a} variant="secondary" className="text-xs">
                        {a}
                      </Badge>
                    ))}
                    {typeof g.crawlDelay === "number" && (
                      <Badge variant="outline" className="text-xs">
                        delay {g.crawlDelay}s
                      </Badge>
                    )}
                  </div>
                  <ul className="mt-2 space-y-0.5 font-mono text-xs">
                    {g.rules.length === 0 && (
                      <li className="text-muted-foreground">(no rules)</li>
                    )}
                    {g.rules.map((r, j) => (
                      <li
                        key={j}
                        className={
                          r.type === "allow"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }
                      >
                        {r.type === "allow" ? "Allow: " : "Disallow: "}
                        {r.pattern || "(empty)"}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Paste your robots.txt",
        description:
          "Copy the contents of your robots.txt file into the left textarea. The parser supports User-agent, Allow, Disallow, Crawl-delay and Sitemap directives, plus # comments.",
      },
      {
        title: "List URLs to test",
        description:
          "Enter one absolute URL per line (e.g. https://example.com/admin/dashboard). The tool extracts the path+query and matches it against the rules.",
      },
      {
        title: "Pick a user-agent",
        description:
          "Use the dropdown to pick from user-agents declared in the file, or type a custom one. The tool selects the most specific matching group, falling back to *.",
      },
      {
        title: "Read the results",
        description:
          "Each URL is marked ALLOWED or BLOCKED. The parsed rule groups appear at the bottom so you can verify how the file was interpreted.",
      },
    ],
    useCases: [
      "Verify that a staging /admin/ path is blocked before going live.",
      "Check that wildcard patterns like /*.pdf$ behave as expected.",
      "Audit a robots.txt inherited from a CMS for unintended blocks.",
      "Confirm a specific bot (e.g. Googlebot) is allowed on key pages.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The matcher implements Google's most-specific-match rule. Bing and
          other engines may resolve Allow/Disallow ties differently.
        </li>
        <li>
          Wildcard <code>*</code> and end-anchor <code>$</code> are supported.
          Other pattern extensions are not.
        </li>
        <li>
          Crawl-delay is parsed and displayed but has no effect on the
          allow/block verdict.
        </li>
        <li>The tool does not fetch live robots.txt files — paste the text.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why is my URL blocked when I expected it to be allowed?",
        a: "Check the parsed rule groups at the bottom. The most specific matching pattern wins, and on a tie Allow beats Disallow. A pattern like /admin/ matches /admin/dashboard but not /admin (no trailing slash).",
      },
      {
        q: "Does an empty Disallow: mean block everything?",
        a: "No. An empty Disallow: is the standard way to allow everything. The tool treats it as 'no rule' so the URL is allowed.",
      },
      {
        q: "How are wildcards handled?",
        a: "* matches any sequence of characters including /. $ at the end of a pattern anchors it to the end of the path. So /*.pdf$ blocks any path ending in .pdf.",
      },
      {
        q: "Which user-agent is used if mine isn't listed?",
        a: "The tool falls back to the * group. If there is no * group either, all URLs are allowed by default.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
