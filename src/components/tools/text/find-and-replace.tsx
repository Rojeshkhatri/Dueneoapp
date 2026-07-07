"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Wand2, Download, Search, Replace, AlertTriangle } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, byteLength, downloadText } from "./_text-helpers";

const SAMPLE_INPUT =
  "Dueneo has 100 browser-only tools and 15 classic games. " +
  "Dueneo runs in your browser. Open Dueneo and start typing.";

interface ReplaceOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMatcher(find: string, opts: ReplaceOptions): RegExp | null {
  if (!find) return null;
  let pattern: string;
  if (opts.regex) {
    pattern = find;
  } else {
    pattern = escapeRegex(find);
    if (opts.wholeWord) {
      // Word boundary on either side. Supports ASCII word chars.
      pattern = `\\b${pattern}\\b`;
    }
  }
  const flags = `g${opts.caseSensitive ? "" : "i"}${opts.wholeWord ? "" : ""}`;
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

function safeReplaceAll(input: string, re: RegExp, replacement: string): { result: string; count: number } {
  // Replace all matches, handling $ patterns in the replacement gracefully.
  // We use replace with a callback to avoid `$` interpretation when the user
  // supplies a literal replacement string.
  let count = 0;
  // Clone the regex (reset lastIndex) so we can count matches before replacing.
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  const global = new RegExp(re.source, flags);
  const result = input.replace(global, (match) => {
    count++;
    return replacement;
  });
  return { result, count };
}

export function FindAndReplace({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [find, setFind] = React.useState("");
  const [replace, setReplace] = React.useState("");
  const [caseSensitive, setCaseSensitive] = React.useState(false);
  const [wholeWord, setWholeWord] = React.useState(false);
  const [regex, setRegex] = React.useState(false);
  const [matchCount, setMatchCount] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const tooLarge = byteLength(input) > MAX_INPUT_BYTES;

  const run = React.useCallback(() => {
    setError(null);
    if (!input) {
      setOutput("");
      setMatchCount(0);
      toast.message("Paste some text first.");
      return;
    }
    if (tooLarge) {
      toast.error(INPUT_TOO_LARGE_MSG);
      return;
    }
    if (!find) {
      setError("Enter something to find.");
      setOutput("");
      setMatchCount(0);
      return;
    }
    if (regex && wholeWord) {
      // Allow both but warn — word boundaries in regex mode are user's responsibility.
    }
    const re = buildMatcher(find, { caseSensitive, wholeWord, regex });
    if (!re) {
      setError("Invalid regular expression. Check your pattern and flags.");
      setOutput("");
      setMatchCount(0);
      return;
    }
    const { result, count } = safeReplaceAll(input, re, replace);
    setOutput(result);
    setMatchCount(count);
    toast.success(`Replaced ${count} match${count === 1 ? "" : "es"}.`);
  }, [input, tooLarge, find, replace, caseSensitive, wholeWord, regex]);

  const reset = () => {
    setInput("");
    setOutput("");
    setFind("");
    setReplace("");
    setMatchCount(0);
    setError(null);
  };

  const loadSample = () => {
    setInput(SAMPLE_INPUT);
    setFind("Dueneo");
    setReplace("dueneo");
    setOutput("");
    setMatchCount(0);
    setError(null);
  };

  const content: ToolContent = {
    intro:
      "Find and replace text with optional case sensitivity, whole-word matching and full regular-expression support. See the match count before you commit, and copy or download the result.",
    tool: (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="fr-input">Input text</Label>
            <button
              type="button"
              onClick={loadSample}
              className="text-xs text-primary hover:underline"
            >
              Load sample
            </button>
          </div>
          <Textarea
            id="fr-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste the text you want to search and replace in…"
            className="min-h-[180px]"
            aria-label="Input text"
          />
          {tooLarge && (
            <p className="text-xs text-destructive" role="status">
              {INPUT_TOO_LARGE_MSG}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fr-find" className="flex items-center gap-1.5">
              <Search className="h-4 w-4" /> Find
            </Label>
            <Input
              id="fr-find"
              value={find}
              onChange={(e) => setFind(e.target.value)}
              placeholder={regex ? "Regular expression, e.g. \\bcat\\b" : "Text to find"}
              className="font-mono text-sm"
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fr-replace" className="flex items-center gap-1.5">
              <Replace className="h-4 w-4" /> Replace with
            </Label>
            <Input
              id="fr-replace"
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="Replacement text"
              className="font-mono text-sm"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="fr-case"
                checked={caseSensitive}
                onCheckedChange={setCaseSensitive}
                aria-label="Case sensitive"
              />
              <Label htmlFor="fr-case" className="text-sm font-normal">
                Case-sensitive
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="fr-word"
                checked={wholeWord}
                onCheckedChange={setWholeWord}
                disabled={regex}
                aria-label="Whole word"
              />
              <Label htmlFor="fr-word" className="text-sm font-normal">
                Whole word
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="fr-regex"
                checked={regex}
                onCheckedChange={(v) => {
                  setRegex(v);
                  if (v) setWholeWord(false);
                }}
                aria-label="Regular expression"
              />
              <Label htmlFor="fr-regex" className="text-sm font-normal">
                Regular expression
              </Label>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
              <Button onClick={run}>
                <Wand2 className="mr-1.5 h-4 w-4" /> Replace all
              </Button>
            </div>
          </div>
          {regex && (
            <p className="mt-3 text-xs text-muted-foreground">
              Regex mode is on. Use capture groups like <code>$1</code> in the replacement only if you
              mean it — this tool treats the replacement as a literal string by default, so <code>$1</code> is inserted verbatim.
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <div className="space-y-1">
                <p className="font-medium">Could not run replacement</p>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="fr-output">Result</Label>
            <div className="flex gap-1.5">
              <CopyButton value={output} size="sm" />
              <Button
                variant="outline"
                size="sm"
                disabled={!output}
                onClick={() => {
                  downloadText("replaced.txt", output);
                  toast.success("Downloaded replaced.txt");
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Save
              </Button>
            </div>
          </div>
          <Textarea
            id="fr-output"
            value={output}
            readOnly
            placeholder="Replaced text will appear here."
            className="min-h-[180px]"
            aria-label="Replaced output"
          />
        </div>

        {output && (
          <p className="text-xs text-muted-foreground">
            Replaced <span className="font-medium text-foreground">{matchCount}</span> match
            {matchCount === 1 ? "" : "es"} of <code className="font-mono">{find || "(empty)"}</code> with{" "}
            <code className="font-mono">{replace || "(empty string)"}</code>.
          </p>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste the source text",
        description:
          "Drop the document, log or list into the input box.",
      },
      {
        title: "Type what to find",
        description:
          "Enter the text or regular expression to match. Toggle case-sensitive, whole-word or regex as needed.",
      },
      {
        title: "Type the replacement",
        description:
          "Enter what each match should be replaced with. Leave empty to delete matches.",
      },
      {
        title: "Replace and copy",
        description:
          "Click Replace all. The result appears in the output box with the match count, ready to copy or save.",
      },
    ],
    useCases: [
      "Swap outdated product names across a help document before publishing.",
      "Strip HTML tags from copied text using the regex <code>&lt;[^&gt;]+&gt;</code> replaced with an empty string.",
      "Normalise capitalisation of a brand name across a press release.",
      "Bulk-replace placeholder tokens in a generated email template.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The replacement string is treated as a literal — <code>$1</code> style back-references are not interpreted. To use back-references, write a regex pattern that captures the part you want to keep and craft your replacement accordingly.</li>
        <li>Whole-word matching is disabled in regex mode because the pattern itself controls boundaries.</li>
        <li>Invalid regular expressions produce a friendly error and do not modify the text.</li>
        <li>Inputs larger than 1 MB are flagged but still processed on the main thread.</li>
      </ul>
    ),
    faq: [
      {
        q: "Can I use regular expressions?",
        a: "Yes. Toggle Regular expression and enter a JavaScript RegExp pattern (without surrounding slashes). Flags g and i are managed automatically based on the case-sensitive toggle.",
      },
      {
        q: "What does Whole word do?",
        a: "It surrounds your find string with word boundaries so that \"cat\" matches \"the cat sat\" but not \"concatenate\". It is disabled in regex mode because your pattern can express its own boundaries with \\b.",
      },
      {
        q: "How are $ characters in the replacement handled?",
        a: "They are inserted literally. The replacement is a plain string, not a substitution template, so $1 stays as the two characters $ and 1.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. Replacement runs in your browser with built-in regular expressions. Your text never leaves the tab.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
