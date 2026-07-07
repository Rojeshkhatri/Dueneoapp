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

const SAMPLE = "https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world%26lang%3Den";

export function UrlDecoder({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("component");
  const [error, setError] = React.useState<string | null>(null);

  const decode = React.useCallback(() => {
    if (!input) {
      setError("Please paste an encoded string first.");
      setOutput("");
      return;
    }
    if (byteLength(input) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setOutput("");
      return;
    }
    try {
      const out =
        mode === "component" ? decodeURIComponent(input) : decodeURI(input);
      setOutput(out);
      setError(null);
      toast.success(
        mode === "component" ? "Decoded with decodeURIComponent." : "Decoded with decodeURI."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message}. Check for stray % characters that are not valid percent escapes.`
          : "Decoding failed."
      );
      setOutput("");
      toast.error("Decoding failed.");
    }
  }, [input, mode]);

  const reset = () => {
    setInput("");
    setOutput("");
    setError(null);
  };

  const content: ToolContent = {
    intro:
      "Decode percent-encoded URLs and query strings back into readable text. Use decodeURIComponent for individual values (it also decodes /, ?, & and =), or decodeURI when you want to keep an entire URL's structure intact.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ud-input">Encoded input</Label>
              <button
                type="button"
                onClick={() => setInput(SAMPLE)}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="ud-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https%3A%2F%2Fexample.com%2F%3Fq%3Dhello%20world"
              className="min-h-[200px] font-mono text-xs"
              spellCheck={false}
              aria-label="Encoded input"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ud-output">Decoded output</Label>
              <CopyButton value={output} size="sm" />
            </div>
            <Textarea
              id="ud-output"
              value={output}
              readOnly
              placeholder="https://example.com/?q=hello world"
              className="min-h-[200px] font-mono text-xs"
              spellCheck={false}
              aria-label="Decoded output"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-6 rounded-xl border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label>Decoder</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as Mode)}
              className="flex flex-row gap-4"
            >
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="component" id="ud-component" /> decodeURIComponent
              </Label>
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="uri" id="ud-uri" /> decodeURI
              </Label>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {mode === "component"
                ? "Decodes every %XX escape, including /, ?, & and =."
                : "Leaves URL syntax characters (?#&=/) intact — use for whole URLs."}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={decode}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Decode
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
                <p className="font-medium">Decoding problem</p>
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
        title: "Paste the encoded string",
        description:
          "Drop a percent-encoded URL, query value or token into the input box.",
      },
      {
        title: "Pick the decoder",
        description:
          "Choose decodeURIComponent to decode everything, or decodeURI to leave URL syntax characters intact.",
      },
      {
        title: "Decode",
        description:
          "Click Decode. Invalid percent escapes (like a stray %) will produce a clear error message.",
      },
      {
        title: "Copy the result",
        description:
          "Use the Copy button to put the decoded string on your clipboard.",
      },
    ],
    useCases: [
      "Inspect an encoded URL parameter from a log file.",
      "Recover the original text behind a percent-encoded query string.",
      "Verify whether an OAuth callback URL was encoded correctly.",
      "Decode a redirect_uri parameter during a debugging session.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>A single <code>%</code> not followed by two hex digits will cause a decode error.</li>
        <li>Inputs larger than 1 MB are rejected to keep the tab responsive.</li>
        <li>Plus signs (<code>+</code>) are not converted to spaces — that only happens in <code>application/x-www-form-urlencoded</code> contexts.</li>
      </ul>
    ),
    faq: [
      {
        q: "Which decoder should I use?",
        a: "Use decodeURIComponent when you want every %XX escape translated, including characters like / and ?. Use decodeURI when the input is a complete URL and you want to preserve its structure.",
      },
      {
        q: "Why does the decoder complain about a %?",
        a: "Percent characters must be followed by two hexadecimal digits to be a valid escape. A literal % in the input needs to be encoded as %25 first.",
      },
      {
        q: "Are + signs turned into spaces?",
        a: "No. The + → space conversion is specific to application/x-www-form-urlencoded payloads. URL decoders treat + as a literal plus. If you need that behaviour, replace + with %20 before decoding.",
      },
      {
        q: "Is my input uploaded anywhere?",
        a: "No. Decoding runs entirely in your browser with the built-in decoder functions.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
