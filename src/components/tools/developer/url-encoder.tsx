"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Wand2, AlertTriangle } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_INPUT_BYTES,
  INPUT_TOO_LARGE_MSG,
  byteLength,
  formatBytes,
} from "./_dev-helpers";

type Mode = "component" | "uri";

const SAMPLE = "https://example.com/search?q=hello world&lang=en&sort=desc";

export function UrlEncoder({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("component");
  const [error, setError] = React.useState<string | null>(null);

  const encode = React.useCallback(() => {
    if (!input) {
      setError("Please type or paste a URL or string first.");
      setOutput("");
      return;
    }
    if (byteLength(input) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setOutput("");
      return;
    }
    try {
      const out = mode === "component" ? encodeURIComponent(input) : encodeURI(input);
      setOutput(out);
      setError(null);
      toast.success(
        mode === "component" ? "Encoded with encodeURIComponent." : "Encoded with encodeURI."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Encoding failed.");
      setOutput("");
    }
  }, [input, mode]);

  const reset = () => {
    setInput("");
    setOutput("");
    setError(null);
  };

  const content: ToolContent = {
    intro:
      "Percent-encode URLs and query parameters in your browser. Use encodeURIComponent for individual query values (it escapes /, ?, &, = and # too), or encodeURI when you want to keep an entire URL intact.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ue-input">Input</Label>
              <button
                type="button"
                onClick={() => setInput(SAMPLE)}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="ue-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://example.com/?q=hello world"
              className="min-h-[200px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ue-output">Encoded output</Label>
              <CopyButton value={output} size="sm" />
            </div>
            <Textarea
              id="ue-output"
              value={output}
              readOnly
              placeholder="https%3A%2F%2Fexample.com%2F%3Fq%3Dhello%20world"
              className="min-h-[200px] font-mono text-xs"
              spellCheck={false}
              aria-label="Encoded output"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-6 rounded-xl border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label>Encoder</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as Mode)}
              className="flex flex-row gap-4"
            >
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="component" id="ue-component" /> encodeURIComponent
              </Label>
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="uri" id="ue-uri" /> encodeURI
              </Label>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {mode === "component"
                ? "Escapes /, ?, &, =, # and spaces — ideal for individual query values."
                : "Keeps URL syntax characters intact — ideal for whole URLs."}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={encode}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Encode
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <div className="space-y-1">
                <p className="font-medium">Encoding problem</p>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        {output && (
          <p className="text-xs text-muted-foreground">
            Output size: {formatBytes(byteLength(output))} · {output.length} characters
          </p>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste your string or URL",
        description:
          "Drop a URL, a query value, or any text that needs percent-encoding into the input box.",
      },
      {
        title: "Pick the encoder",
        description:
          "Choose encodeURIComponent for individual query values, or encodeURI for a whole URL you want to keep intact.",
      },
      {
        title: "Encode",
        description:
          "Click Encode. The browser's built-in encoder runs instantly and produces the percent-encoded output.",
      },
      {
        title: "Copy",
        description:
          "Use the Copy button to put the encoded result on your clipboard.",
      },
    ],
    useCases: [
      "Encode a search query before adding it to a URL.",
      "Build a deep link that contains special characters or emoji.",
      "Prepare an OAuth redirect_uri parameter for a request.",
      "Inspect what encodeURIComponent and encodeURI actually escape.",
      ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Inputs larger than 1 MB are rejected to keep the tab responsive.</li>
        <li>The encoder operates on UTF-8 strings; binary data is not supported here.</li>
        <li>encodeURI does not escape reserved characters like ?, # and & — use it only when you actually want them preserved.</li>
      </ul>
    ),
    faq: [
      {
        q: "Which encoder should I use?",
        a: "Use encodeURIComponent for individual query values because it escapes characters like ?, & and =. Use encodeURI for a whole URL that already has correct structure and you only want to escape unsafe characters such as spaces.",
      },
      {
        q: "Why are spaces encoded as %20?",
        a: "%20 is the percent-encoded form of a space character. encodeURIComponent and encodeURI both use this form; application/x-www-form-urlencoded would turn spaces into + instead.",
      },
      {
        q: "Does this work for Unicode characters?",
        a: "Yes. Both encoders operate on UTF-8 strings, so characters like é, 漢 or 😎 are correctly percent-encoded into their multi-byte representations.",
      },
      {
        q: "Is my input uploaded anywhere?",
        a: "No. Encoding happens with the browser's built-in functions and the string never leaves your tab.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
