"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Download, Plus, Minus } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { downloadText } from "../developer/_dev-helpers";

const SAMPLE_KEYWORDS = `best running shoes
best running shoes for women
running shoes for men
trail running shoes
cheap running shoes
best trail running shoes
how to tie running shoes
running shoes for flat feet
best shoes for flat feet
shoes for flat feet men
barefoot running shoes
minimalist running shoes
best minimalist running shoes
marathon training plan
marathon training plan for beginners
half marathon training
marathon nutrition guide`;

// Stop-words excluded from token comparison.
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "for", "to", "of", "in", "on", "at",
  "by", "with", "from", "is", "are", "be", "as", "it", "this", "that",
  "how", "what", "when", "where", "why", "which", "who",
]);

function tokenize(keyword: string): Set<string> {
  return new Set(
    keyword
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

interface Cluster {
  id: number;
  keywords: string[];
  sharedWords: string[];
}

/**
 * Greedy single-link clustering: build an adjacency graph where two keywords
 * are linked if their Jaccard similarity ≥ threshold, then find connected
 * components via union-find.
 */
function clusterKeywords(keywords: string[], threshold: number): Cluster[] {
  const tokens = keywords.map(tokenize);
  const parent = keywords.map((_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  for (let i = 0; i < keywords.length; i++) {
    for (let j = i + 1; j < keywords.length; j++) {
      if (jaccard(tokens[i], tokens[j]) >= threshold) {
        union(i, j);
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < keywords.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }

  return Array.from(groups.values())
    .map((indices, id) => {
      const words = indices.map((i) => keywords[i]);
      // Shared words = intersection of all token sets in the cluster.
      let shared: Set<string> | null = null;
      for (const i of indices) {
        if (shared === null) shared = new Set(tokens[i]);
        else {
          const next = new Set<string>();
          for (const w of shared) if (tokens[i].has(w)) next.add(w);
          shared = next;
        }
      }
      return {
        id,
        keywords: words,
        sharedWords: shared ? Array.from(shared).sort() : [],
      };
    })
    .sort((a, b) => b.keywords.length - a.keywords.length);
}

const CLUSTER_COLORS = [
  "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30",
  "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30",
  "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
  "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
];

export function KeywordClusteringTool({ tool }: { tool: ToolDefinition }) {
  const [text, setText] = React.useState(SAMPLE_KEYWORDS);
  const [threshold, setThreshold] = React.useState(0.4);

  const keywords = React.useMemo(
    () =>
      text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean),
    [text]
  );

  const clusters = React.useMemo(
    () => clusterKeywords(keywords, threshold),
    [keywords, threshold]
  );

  const exportJson = React.useMemo(
    () =>
      JSON.stringify(
        clusters.map((c) => ({
          cluster: c.id + 1,
          keywordCount: c.keywords.length,
          sharedWords: c.sharedWords,
          keywords: c.keywords,
        })),
        null,
        2
      ),
    [clusters]
  );

  const reset = () => {
    setText(SAMPLE_KEYWORDS);
    setThreshold(0.4);
    toast.info("Reset to defaults.");
  };

  const content: ToolContent = {
    intro:
      "Paste a list of keywords (one per line) and the tool groups them into topic clusters using Jaccard word-overlap similarity. Adjust the threshold to control how aggressive the clustering is, then export the clusters as JSON for your content plan.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Input */}
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="kc-keywords">Keywords (one per line)</Label>
                <span className="text-xs text-muted-foreground">
                  {keywords.length} keyword{keywords.length === 1 ? "" : "s"}
                </span>
              </div>
              <Textarea
                id="kc-keywords"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={14}
                spellCheck={false}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="kc-threshold">Similarity threshold</Label>
                <Badge variant="outline" className="font-mono text-xs">
                  {threshold.toFixed(2)}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 flex-none"
                  onClick={() =>
                    setThreshold((t) => Math.max(0.3, +(t - 0.05).toFixed(2)))
                  }
                  aria-label="Decrease threshold"
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <Slider
                  id="kc-threshold"
                  min={30}
                  max={80}
                  step={1}
                  value={[Math.round(threshold * 100)]}
                  onValueChange={(v) => setThreshold(v[0] / 100)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 flex-none"
                  onClick={() =>
                    setThreshold((t) => Math.min(0.8, +(t + 0.05).toFixed(2)))
                  }
                  aria-label="Increase threshold"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Lower = more clusters with fewer keywords. Higher = fewer
                clusters with more keywords. Range 0.30–0.80.
              </p>
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          {/* Output */}
          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border bg-background p-3">
                <div className="text-2xl font-bold">{keywords.length}</div>
                <div className="text-xs text-muted-foreground">Keywords</div>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <div className="text-2xl font-bold">{clusters.length}</div>
                <div className="text-xs text-muted-foreground">Clusters</div>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <div className="text-2xl font-bold">
                  {clusters.length > 0
                    ? Math.round(
                        clusters.reduce((a, c) => a + c.keywords.length, 0) /
                          clusters.length
                      )
                    : 0}
                </div>
                <div className="text-xs text-muted-foreground">Avg size</div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Clusters</h3>
              {clusters.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Paste keywords above to see clusters.
                </p>
              ) : (
                <div className="max-h-[28rem] space-y-2 overflow-y-auto">
                  {clusters.map((c, i) => {
                    const color =
                      CLUSTER_COLORS[i % CLUSTER_COLORS.length];
                    return (
                      <div
                        key={c.id}
                        className="rounded-lg border bg-background p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${color}`}
                          >
                            Cluster {c.id + 1}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {c.keywords.length} keyword
                            {c.keywords.length === 1 ? "" : "s"}
                          </span>
                          {c.sharedWords.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              · shared:{" "}
                              <code className="font-mono">
                                {c.sharedWords.join(", ")}
                              </code>
                            </span>
                          )}
                        </div>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {c.keywords.map((k, j) => (
                            <li
                              key={j}
                              className="rounded-md bg-muted px-2 py-0.5 text-xs"
                            >
                              {k}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Export (JSON)</h3>
                <div className="flex gap-1.5">
                  <CopyButton value={exportJson} size="sm" />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={clusters.length === 0}
                    onClick={() => {
                      downloadText(
                        "keyword-clusters.json",
                        exportJson,
                        "application/json"
                      );
                      toast.success("Downloaded keyword-clusters.json");
                    }}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                  </Button>
                </div>
              </div>
              <pre className="max-h-48 overflow-auto rounded-lg border bg-background p-3 font-mono text-xs">
                <code>{exportJson}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Paste your keywords",
        description:
          "Enter one keyword or keyphrase per line. Stop-words like 'the', 'for', 'how' are removed before comparison.",
      },
      {
        title: "Adjust the similarity threshold",
        description:
          "The slider controls how aggressively keywords are grouped. 0.30 = loose clustering (more clusters); 0.80 = strict (fewer, tighter clusters).",
      },
      {
        title: "Review the clusters",
        description:
          "Each cluster lists its member keywords and the shared words that define it. The largest clusters usually indicate core topics.",
      },
      {
        title: "Export as JSON",
        description:
          "Copy or download the cluster structure as JSON. Drop it into your content-planning spreadsheet or use it to build topic silos.",
      },
    ],
    useCases: [
      "Group 200+ keyword-research exports into 10–20 content pillars.",
      "Identify cannibalisation risk: keywords that are too similar and may compete.",
      "Plan topic clusters for a new blog — one pillar page per cluster.",
      "Spot outlier keywords that don't fit any cluster (often new content opportunities).",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Similarity is based on word overlap only (Jaccard), not semantic
          meaning. "Running shoes" and "sneakers for jogging" will not cluster
          despite meaning the same thing.
        </li>
        <li>
          Stop-words are removed before comparison. The shared-words list shows
          only meaningful tokens.
        </li>
        <li>
          Clustering uses single-link union-find. At low thresholds, chains of
          weakly-similar keywords can merge into large clusters.
        </li>
        <li>
          For very large lists (10,000+ keywords) the O(n²) comparison can be
          slow — paste in batches.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What threshold should I use?",
        a: "0.40 is a sensible default for English keyword lists. Lower to 0.30 if you see too many tiny clusters; raise to 0.60 if clusters are merging unrelated keywords.",
      },
      {
        q: "Why do two very similar keywords end up in different clusters?",
        a: "Jaccard only looks at exact word overlap. Plurals ('shoe' vs 'shoes'), synonyms and word order all reduce similarity. Lemmatise your list first if this is a problem.",
      },
      {
        q: "How are shared words calculated?",
        a: "Shared words are the intersection of token sets across all keywords in the cluster — every keyword in the cluster contains them (after stop-word removal).",
      },
      {
        q: "Can I export to CSV instead of JSON?",
        a: "Not directly. The JSON export is structured for pipelines. Paste it into a JSON-to-CSV converter (Dueneo has one) if you need a flat spreadsheet.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
