"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { CopyButton } from "@/components/dueneo/copy-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Download, RotateCcw, Sparkles } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { downloadText } from "./_security-helpers";

interface Options {
  count: number;
  hyphen: "hyphen" | "none";
  caseMode: "lower" | "upper";
  wrap: "none" | "brace";
}

function formatUuid(raw: string, opts: Options): string {
  let s = opts.hyphen === "hyphen" ? raw : raw.replace(/-/g, "");
  if (opts.caseMode === "upper") s = s.toUpperCase();
  if (opts.wrap === "brace") s = `{${s}}`;
  return s;
}

function generate(opts: Options): string[] {
  const out: string[] = [];
  // `crypto.randomUUID` is available in all modern browsers and Node 19+.
  for (let i = 0; i < opts.count; i++) {
    out.push(formatUuid(crypto.randomUUID(), opts));
  }
  return out;
}

export function UuidGenerator({ tool }: { tool: ToolDefinition }) {
  const [opts, setOpts] = React.useState<Options>({
    count: 5,
    hyphen: "hyphen",
    caseMode: "lower",
    wrap: "none",
  });
  const [uuids, setUuids] = React.useState<string[]>(() =>
    generate({ count: 5, hyphen: "hyphen", caseMode: "lower", wrap: "none" })
  );

  const regenerate = React.useCallback(() => {
    setUuids(generate(opts));
  }, [opts]);

  const update = <K extends keyof Options>(key: K, value: Options[K]) => {
    setOpts((o) => {
      const next = { ...o, [key]: value };
      setUuids(generate(next));
      return next;
    });
  };

  const copyAll = uuids.join("\n");

  const downloadList = () => {
    if (!uuids.length) {
      toast.error("Nothing to download yet.");
      return;
    }
    downloadText("uuids.txt", uuids.join("\n") + "\n", "text/plain");
    toast.success(`Saved ${uuids.length} UUID${uuids.length === 1 ? "" : "s"} as uuids.txt`);
  };

  const reset = () => {
    const defaults: Options = { count: 5, hyphen: "hyphen", caseMode: "lower", wrap: "none" };
    setOpts(defaults);
    setUuids(generate(defaults));
  };

  const content: ToolContent = {
    intro:
      "Generate RFC 4122 version-4 UUIDs in bulk using the browser's native crypto.randomUUID(). Pick how many you need (1 to 1,000), toggle hyphens, casing and braces, then copy or download the list. Generation is local and instant.",
    tool: (
      <div className="space-y-5">
        <div className="space-y-5 rounded-xl border bg-card p-4 sm:p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="uuid-count">How many UUIDs?</Label>
              <span className="font-mono text-sm text-muted-foreground">{opts.count}</span>
            </div>
            <Slider
              id="uuid-count"
              value={[opts.count]}
              min={1}
              max={1000}
              step={1}
              onValueChange={(v) => update("count", Math.min(1000, Math.max(1, v[0] ?? 5)))}
            />
            <p className="text-xs text-muted-foreground">Between 1 and 1,000. Large batches may take a moment to render.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <OptionRow
              id="uuid-hyphen"
              label="Hyphens"
              checked={opts.hyphen === "hyphen"}
              onChange={(v) => update("hyphen", v ? "hyphen" : "none")}
            />
            <OptionRow
              id="uuid-upper"
              label="Uppercase"
              checked={opts.caseMode === "upper"}
              onChange={(v) => update("caseMode", v ? "upper" : "lower")}
            />
            <OptionRow
              id="uuid-brace"
              label="Wrap in {braces}"
              checked={opts.wrap === "brace"}
              onChange={(v) => update("wrap", v ? "brace" : "none")}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={regenerate}>
              <Sparkles className="mr-1.5 h-4 w-4" /> Generate
            </Button>
            <CopyButton value={copyAll} label="Copy all" size="default" />
            <Button variant="outline" onClick={downloadList} disabled={!uuids.length}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Download .txt
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="uuid-list">Generated UUIDs</Label>
            <span className="text-xs text-muted-foreground">{uuids.length} item{uuids.length === 1 ? "" : "s"}</span>
          </div>
          <div
            id="uuid-list"
            className="max-h-96 overflow-y-auto rounded-md border bg-muted/30 p-3"
            style={{
              scrollbarWidth: "thin",
            }}
          >
            <ul className="space-y-1">
              {uuids.map((u, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1 font-mono text-xs hover:bg-background"
                >
                  <span className="break-all">{u}</span>
                  <CopyButton value={u} size="icon" variant="ghost" className="flex-none" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Pick how many UUIDs you need",
        description:
          "Use the slider to choose between 1 and 1,000. The list regenerates automatically when you change the count or formatting options.",
      },
      {
        title: "Toggle formatting",
        description:
          "Switch hyphens on or off, choose lower or upper case, and optionally wrap each UUID in curly braces for Microsoft-style GUIDs.",
      },
      {
        title: "Generate more",
        description:
          "Click “Generate” for a fresh batch using the same settings. Each click draws new random bytes from crypto.randomUUID().",
      },
      {
        title: "Copy or download",
        description:
          "Use “Copy all” to put the list on your clipboard (newline-separated) or “Download .txt” to save it as a file.",
      },
    ],
    useCases: [
      "Generate primary keys for a database seed script.",
      "Create unique request IDs for a load test or batch job.",
      "Produce a one-off correlation ID for a distributed trace.",
      "Spin up test fixtures that need many unique identifiers at once.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Capped at 1,000 UUIDs per batch to keep the page responsive. Run the tool multiple times for larger batches.</li>
        <li>Only UUID v4 (random) is supported. UUID v1, v3, v5 and v7 are not generated here.</li>
        <li>Output formatting is applied uniformly to the whole batch.</li>
      </ul>
    ),
    faq: [
      {
        q: "Are these UUIDs unique?",
        a: "Yes — UUID v4 draws 122 bits of randomness from your browser's cryptographic random source. The chance of two generated UUIDs colliding is astronomically small.",
      },
      {
        q: "Is the generation done locally?",
        a: "Yes. UUIDs are produced with `crypto.randomUUID()` in your browser. No network call is made.",
      },
      {
        q: "Can I generate UUID v7 (time-sorted)?",
        a: "Not in this tool — only v4 is supported. v7 requires combining a millisecond timestamp with random bits and is rarely needed for everyday use.",
      },
      {
        q: "Why do the UUIDs change when I toggle options?",
        a: "The tool regenerates the batch whenever options change so you always see a live preview. Click “Generate” for a fresh batch using the current settings.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function OptionRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between rounded-md border bg-background px-3 py-2.5 text-sm"
    >
      <span>{label}</span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
    </Label>
  );
}
