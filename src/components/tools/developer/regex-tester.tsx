"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertTriangle, RotateCcw, Play } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

interface FlagDef {
  key: string;
  label: string;
  description: string;
}

const FLAGS: FlagDef[] = [
  { key: "g", label: "g", description: "global — find all matches" },
  { key: "i", label: "i", description: "ignore case" },
  { key: "m", label: "m", description: "multiline — ^ and $ match line starts/ends" },
  { key: "s", label: "s", description: "dotAll — . matches newlines" },
  { key: "u", label: "u", description: "unicode — full Unicode support" },
  { key: "y", label: "y", description: "sticky — match at lastIndex only" },
];

const DEFAULT_PATTERN = "\\b(\\w+)@(\\w+\\.\\w+)\\b";
const DEFAULT_TEXT =
  "Contact ada@example.com or linus@kernel.org for details.\nNo email here: hello@world.";

interface MatchInfo {
  index: number;
  match: string;
  groups: (string | undefined)[];
}

export function RegexTester({ tool }: { tool: ToolDefinition }) {
  const [pattern, setPattern] = React.useState(DEFAULT_PATTERN);
  const [text, setText] = React.useState(DEFAULT_TEXT);
  const [flags, setFlags] = React.useState<Set<string>>(new Set(["g"]));
  const [matches, setMatches] = React.useState<MatchInfo[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const toggleFlag = (key: string) => {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Re-run on every keystroke / flag change — cheap for the inputs we accept.
  React.useEffect(() => {
    if (!pattern) {
      setMatches([]);
      setError(null);
      return;
    }
    try {
      const flagStr = Array.from(flags).join("");
      const re = new RegExp(pattern, flagStr);
      const found: MatchInfo[] = [];
      if (flags.has("g")) {
        for (const m of text.matchAll(re)) {
          found.push({
            index: m.index ?? 0,
            match: m[0],
            groups: m.slice(1),
          });
        }
      } else {
        const m = re.exec(text);
        if (m) {
          found.push({
            index: m.index ?? 0,
            match: m[0],
            groups: m.slice(1),
          });
        }
      }
      setMatches(found);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid regular expression.");
      setMatches([]);
    }
  }, [pattern, text, flags]);

  const reset = () => {
    setPattern(DEFAULT_PATTERN);
    setText(DEFAULT_TEXT);
    setFlags(new Set(["g"]));
    setMatches([]);
    setError(null);
  };

  const highlighted = React.useMemo(() => {
    if (matches.length === 0) return [{ text, kind: "ctx" as const }];
    // Sort by index, then split the text.
    const sorted = [...matches].sort((a, b) => a.index - b.index);
    const parts: { text: string; kind: "ctx" | "match" }[] = [];
    let cursor = 0;
    for (const m of sorted) {
      if (m.index > cursor) {
        parts.push({ text: text.slice(cursor, m.index), kind: "ctx" });
      }
      parts.push({ text: m.match, kind: "match" });
      cursor = m.index + m.match.length;
      if (cursor <= m.index) cursor = m.index + 1; // guard against empty matches
    }
    if (cursor < text.length) {
      parts.push({ text: text.slice(cursor), kind: "ctx" });
    }
    return parts;
  }, [matches, text]);

  const content: ToolContent = {
    intro:
      "Test JavaScript regular expressions against sample text in real time. Toggle the g, i, m, s, u and y flags, see every match highlighted, and inspect capture groups and the total match count — all in your browser, no libraries.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-2">
            <Label htmlFor="rt-pattern">Pattern</Label>
            <div className="flex items-stretch gap-2">
              <span className="flex items-center rounded-md border bg-muted px-3 font-mono text-sm text-muted-foreground">
                /
              </span>
              <Input
                id="rt-pattern"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="\\b\\w+@\\w+\\.\\w+\\b"
                className="font-mono"
                spellCheck={false}
                aria-label="Regular expression pattern"
              />
              <span className="flex items-center rounded-md border bg-muted px-3 font-mono text-sm text-muted-foreground">
                /{Array.from(flags).join("")}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Flags</Label>
            <div className="flex flex-wrap gap-2">
              {FLAGS.map((f) => (
                <Button
                  key={f.key}
                  type="button"
                  size="sm"
                  variant={flags.has(f.key) ? "default" : "outline"}
                  onClick={() => toggleFlag(f.key)}
                  title={f.description}
                  className="font-mono"
                  aria-pressed={flags.has(f.key)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {FLAGS.filter((f) => flags.has(f.key))
                .map((f) => `${f.label}: ${f.description}`)
                .join(" · ") || "No flags set"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rt-text">Test text</Label>
            <Textarea
              id="rt-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type the text to test against..."
              className="min-h-[220px] font-mono text-xs"
              spellCheck={false}
              aria-label="Test text"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rt-highlight">Highlighted matches</Label>
            <div
              id="rt-highlight"
              className="min-h-[220px] whitespace-pre-wrap rounded-md border bg-muted/30 p-3 font-mono text-xs"
              aria-label="Highlighted matches"
            >
              {highlighted.map((p, i) =>
                p.kind === "match" ? (
                  <mark
                    key={i}
                    className="rounded bg-amber-300 px-0.5 text-amber-950 dark:bg-amber-500/60 dark:text-amber-50"
                  >
                    {p.text}
                  </mark>
                ) : (
                  <span key={i}>{p.text}</span>
                )
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 p-4">
          <div className="text-sm">
            <strong>{matches.length}</strong> match{matches.length === 1 ? "" : "es"}
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (matches.length === 0) {
                toast.error("No matches to copy.");
                return;
              }
              navigator.clipboard.writeText(matches.map((m) => m.match).join("\n"));
              toast.success("Copied matches to clipboard.");
            }}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" /> Copy matches
          </Button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <div className="space-y-1">
                <p className="font-medium">Invalid regex</p>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        {matches.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Matches &amp; capture groups</h3>
            <div className="max-h-72 overflow-y-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Index</th>
                    <th className="px-3 py-2 font-medium">Match</th>
                    <th className="px-3 py-2 font-medium">Groups</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {matches.map((m, i) => (
                    <tr key={i} className="align-top">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.index}</td>
                      <td className="px-3 py-2 font-mono">{m.match || "(empty)"}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">
                        {m.groups.length === 0
                          ? "—"
                          : m.groups.map((g, gi) => (
                              <span key={gi} className="block">
                                <span className="text-muted-foreground">${gi + 1}:</span>{" "}
                                {g ?? "(undefined)"}
                              </span>
                            ))}
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
        title: "Enter your pattern",
        description:
          "Type a regular expression without the surrounding slashes. The flags are managed separately via the toggle buttons.",
      },
      {
        title: "Toggle flags",
        description:
          "Click any of g, i, m, s, u, y to add or remove that flag. The pattern is re-run instantly every time you change a flag.",
      },
      {
        title: "Type your sample text",
        description:
          "Any text you paste into the test area is matched against the pattern in real time. Matches are highlighted in amber.",
      },
      {
        title: "Inspect matches and groups",
        description:
          "The matches table lists each match, its character index and capture groups. Use Copy matches to grab every matched string.",
      },
    ],
    useCases: [
      "Validate an email, phone or URL pattern before deploying it.",
      "Extract every match from a log file for further analysis.",
      "Debug a regex that unexpectedly fails or matches too much.",
      "Learn the effect of each regex flag (g, i, m, s, u, y) interactively.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Uses JavaScript's <code>RegExp</code> engine — PCRE-only features like lookbehind on older engines may not be available.</li>
        <li>Empty matches with the global flag can produce surprising indices; the tool guards against infinite loops but the table may show contiguous positions.</li>
        <li>Sample text larger than ~500 KB will feel sluggish because highlighting runs on every keystroke.</li>
      </ul>
    ),
    faq: [
      {
        q: "Do I need to wrap the pattern in slashes?",
        a: "No. Type the pattern body only. The slashes and the flag letters are added for you when the RegExp is constructed.",
      },
      {
        q: "What does the 'y' flag do?",
        a: "The sticky flag forces the regex to match starting exactly at re.lastIndex. It is useful for tokenizers that need to consume input position by position.",
      },
      {
        q: "Why is my lookbehind not working?",
        a: "Lookbehind assertions are supported in modern V8-based browsers but not in older Safari versions. The tool reports whatever error the browser throws.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. The pattern and text never leave your browser tab — all evaluation happens with the built-in RegExp object.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
