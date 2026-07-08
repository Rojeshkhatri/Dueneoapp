"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Copy, Hash, Lightbulb, RotateCcw, Search } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

interface HashtagStat {
  tag: string;
  count: number;
}

interface SuggestionGroup {
  category: string;
  tags: string[];
}

/** Extract #hashtags (letters, digits, underscores). */
function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\p{L}\p{N}_]+/gu);
  return matches ?? [];
}

/** Strip the leading # and lowercase for comparison. */
function normalise(tag: string): string {
  return tag.replace(/^#/, "").toLowerCase();
}

const SUGGESTIONS: SuggestionGroup[] = [
  {
    category: "General",
    tags: [
      "#love", "#instagood", "#photooftheday", "#fashion", "#beautiful",
      "#happy", "#cute", "#tbt", "#like4like", "#followme",
      "#picoftheday", "#follow", "#me", "#art", "#instadaily",
    ],
  },
  {
    category: "Business",
    tags: [
      "#business", "#entrepreneur", "#marketing", "#smallbusiness", "#startup",
      "#success", "#networking", "#leadership", "#hustle", "#branding",
      "#digitalmarketing", "#socialmedia", "#growth", "#mindset", "#b2b",
    ],
  },
  {
    category: "Tech",
    tags: [
      "#tech", "#technology", "#coding", "#programming", "#developer",
      "#javascript", "#python", "#ai", "#machinelearning", "#webdev",
      "#softwareengineer", "#100daysofcode", "#devops", "#react", "#cybersecurity",
    ],
  },
  {
    category: "Lifestyle",
    tags: [
      "#lifestyle", "#motivation", "#inspiration", "#selfcare", "#mindfulness",
      "#wellness", "#fitnessmotivation", "#morningroutine", "#productivity", "#goals",
      "#minimalism", "#slowliving", "#selflove", "#balance", "#gratitude",
    ],
  },
  {
    category: "Food",
    tags: [
      "#food", "#foodie", "#foodporn", "#instafood", "#foodphotography",
      "#foodblogger", "#homecooking", "#recipe", "#baking", "#dessert",
      "#vegan", "#healthyfood", "#breakfast", "#coffee", "#yummy",
    ],
  },
  {
    category: "Travel",
    tags: [
      "#travel", "#travelphotography", "#wanderlust", "#travelgram", "#instatravel",
      "#vacation", "#adventure", "#explore", "#nature", "#mountains",
      "#beach", "#citybreak", "#roadtrip", "#solotravel", "#hiddengems",
    ],
  },
  {
    category: "Fitness",
    tags: [
      "#fitness", "#workout", "#gym", "#fit", "#training",
      "#gymlife", "#fitfam", "#bodybuilding", "#crossfit", "#yoga",
      "#running", "#cardio", "#healthylifestyle", "#strong", "#nopainnogain",
    ],
  },
];

export function HashtagAnalyzer({ tool }: { tool: ToolDefinition }) {
  const [text, setText] = React.useState<string>(
    "Excited to share my new #photography project! Shot on the #canon R6 with the #sigma 35mm lens.\n\n#nature #landscape #sunset #goldenhour #outdoor #wildlife #travel #wanderlust #photography #canon #sigma #goldenhour"
  );
  const [filter, setFilter] = React.useState<string>("");

  const stats = React.useMemo(() => {
    const all = extractHashtags(text);
    const counts = new Map<string, { tag: string; count: number }>();
    for (const raw of all) {
      const key = normalise(raw);
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { tag: raw, count: 1 });
      }
    }
    const uniqueTags = Array.from(counts.values());
    const duplicates = uniqueTags.filter((t) => t.count > 1);
    const totalChars = all.reduce((sum, t) => sum + t.length, 0);
    const textChars = text.length;
    const density = textChars > 0 ? (totalChars / textChars) * 100 : 0;
    return {
      total: all.length,
      unique: uniqueTags.length,
      duplicates,
      duplicateCount: all.length - uniqueTags.length,
      charCount: totalChars,
      density,
      uniqueTags: uniqueTags.sort((a, b) => b.count - a.count),
      all,
    };
  }, [text]);

  const suggestionFilter = filter.trim().toLowerCase();
  const filteredSuggestions = React.useMemo(() => {
    if (!suggestionFilter) return SUGGESTIONS;
    return SUGGESTIONS.map((g) => ({
      ...g,
      tags: g.tags.filter((t) => t.toLowerCase().includes(suggestionFilter)),
    })).filter((g) => g.tags.length > 0);
  }, [suggestionFilter]);

  const usedSet = React.useMemo(
    () => new Set(stats.uniqueTags.map((t) => normalise(t.tag))),
    [stats.uniqueTags]
  );

  const addSuggestion = (tag: string) => {
    const sep = text && !text.endsWith("\n") && !text.endsWith(" ") ? " " : "";
    setText((prev) => `${prev}${sep}${tag}`);
    toast.success(`Added ${tag}`);
  };

  const copyAllTags = () => {
    if (stats.uniqueTags.length === 0) {
      toast.error("No hashtags to copy.");
      return;
    }
    const text = stats.uniqueTags.map((t) => t.tag).join(" ");
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`Copied ${stats.uniqueTags.length} unique hashtag${stats.uniqueTags.length === 1 ? "" : "s"}.`))
      .catch(() => toast.error("Could not copy."));
  };

  const reset = () => {
    setText("");
    setFilter("");
    toast.info("Text cleared.");
  };

  const toolBody = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Input */}
        <div className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <Label htmlFor="ha-input">Paste your caption with hashtags</Label>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear
            </Button>
          </div>
          <Textarea
            id="ha-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a caption, comment, or any text containing #hashtags…"
            className="min-h-[220px] resize-y"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Hashtags" value={stats.total} />
            <Stat label="Unique" value={stats.unique} accent="emerald" />
            <Stat label="Duplicates" value={stats.duplicateCount} accent={stats.duplicateCount > 0 ? "rose" : "muted"} />
            <Stat label="Chars used" value={stats.charCount} accent="muted" />
          </div>
          <div className="rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground">
            Hashtag density: <span className="font-mono font-semibold text-foreground">{stats.density.toFixed(1)}%</span> of your caption is hashtags.
            {" "}
            {stats.density > 25
              ? "That’s high — platforms may flag it as spam."
              : stats.density > 10
              ? "A reasonable ratio for most posts."
              : "Conservative — most platforms prefer under 10%."}
          </div>
        </div>

        {/* Output: unique + duplicates */}
        <div className="space-y-3 rounded-xl border bg-background p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Hashtag breakdown</h3>
            <Button size="sm" variant="outline" onClick={copyAllTags}>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy unique
            </Button>
          </div>
          {stats.uniqueTags.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No hashtags detected. Add some with a leading # character.
            </p>
          ) : (
            <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
              {stats.uniqueTags.map((t) => (
                <div
                  key={t.tag.toLowerCase()}
                  className="flex items-center justify-between gap-2 rounded-md border bg-card p-2"
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Hash className="h-3.5 w-3.5 text-primary" />
                    {t.tag}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={t.count > 1 ? "destructive" : "secondary"}>
                      ×{t.count}
                    </Badge>
                    {t.count > 1 && (
                      <span className="text-[10px] text-muted-foreground">duplicate</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {stats.duplicates.length > 0 && (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <strong>{stats.duplicates.length}</strong> duplicate hashtag{stats.duplicates.length === 1 ? "" : "s"} detected.
              Remove the copies — duplicates do not improve reach and can hurt it.
            </div>
          )}
        </div>
      </div>

      {/* Suggestions */}
      <div className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Related hashtag suggestions</h3>
            <Badge variant="secondary">{SUGGESTIONS.reduce((n, g) => n + g.tags.length, 0)} tags</Badge>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter suggestions…"
              className="h-8 w-48 rounded-md border border-input bg-background pl-7 pr-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSuggestions.map((group) => (
            <div key={group.category} className="space-y-2 rounded-lg border bg-background p-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.category}
                </h4>
                <span className="text-[10px] text-muted-foreground">{group.tags.length}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {group.tags.map((tag) => {
                  const used = usedSet.has(normalise(tag));
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addSuggestion(tag)}
                      disabled={used}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        used
                          ? "cursor-not-allowed bg-muted text-muted-foreground line-through"
                          : "bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/60"
                      }`}
                      title={used ? "Already in your caption" : `Add ${tag} to your caption`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredSuggestions.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground">
              No suggestions match “{filter}”.
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Click any tag to add it to your caption. Already-used tags are crossed out.
        </p>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Paste a caption, comment, or any text containing hashtags and get an instant breakdown: total count, unique count, duplicates, total characters used by hashtags, and hashtag density versus your overall text. Browse popular hashtag suggestions across seven categories — General, Business, Tech, Lifestyle, Food, Travel and Fitness — and click to add the ones that fit your post.",
    tool: toolBody,
    howTo: [
      {
        title: "Paste your caption",
        description:
          "Drop in any text that contains #hashtags. The tool scans it the moment you type or paste.",
      },
      {
        title: "Read the breakdown",
        description:
          "See total hashtags, unique tags, duplicates, characters used and density. Duplicates are flagged so you can remove them.",
      },
      {
        title: "Browse suggestions",
        description:
          "Scroll through seven categories of popular hashtags. Use the filter box to narrow them down, then click to add any that fit your post.",
      },
      {
        title: "Copy your unique hashtags",
        description:
          "Use Copy unique to grab the de-duplicated list ready to paste into your scheduler.",
      },
    ],
    useCases: [
      "Audit an Instagram caption for duplicate hashtags before publishing.",
      "Spot hashtag stuffing before a platform flags it as spam.",
      "Discover related hashtags in your niche to broaden reach.",
      "Pull a clean de-duplicated list of hashtags for a scheduling tool.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Hashtag detection requires a leading # character. Plain words are not treated as hashtags.</li>
        <li>The suggestion library is a static curated list — it is not live-trending data. Always verify a tag is relevant and not banned before using it.</li>
        <li>Density is computed as characters, not tokens. A long caption with three long hashtags and a short body can look denser than it feels.</li>
        <li>Some platforms shadow-ban or limit reach for certain hashtags. This tool does not check ban status.</li>
      </ul>
    ),
    faq: [
      {
        q: "How does the analyser count hashtags?",
        a: "It looks for any token starting with # followed by one or more letters, digits or underscores (Unicode-aware). Each occurrence counts toward the total; the unique count collapses case-insensitive duplicates.",
      },
      {
        q: "Why are duplicates bad?",
        a: "Most platforms ignore repeated hashtags — they do not double your reach — and several algorithms treat duplicate tags as a spam signal that can hurt discoverability. Always use each hashtag once.",
      },
      {
        q: "What is a good hashtag density?",
        a: "There is no universal rule, but most platforms seem to reward 3–10% density (3–10% of your caption characters being hashtags). Above 25% starts to look spammy and may be flagged.",
      },
      {
        q: "Are the suggestions trending right now?",
        a: "No — the suggestions are a curated static library of broadly popular hashtags across seven categories. For live trending data, check the platform’s own Explore tab. Use these suggestions as a starting point, not a final list.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Stat({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: number;
  accent?: "default" | "emerald" | "rose" | "muted";
}) {
  const valueClass =
    accent === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "rose"
      ? "text-rose-600 dark:text-rose-400"
      : accent === "muted"
      ? "text-muted-foreground"
      : "text-foreground";
  return (
    <div className="rounded-md border bg-background p-2.5 text-center">
      <div className={`font-mono text-lg font-bold ${valueClass}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
