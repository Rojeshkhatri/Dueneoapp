"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Wand2, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_INPUT_BYTES,
  INPUT_TOO_LARGE_MSG,
  byteLength,
  formatBytes,
  describeJsonError,
} from "./_dev-helpers";

const SAMPLE = `{"user":{"id":42,"email":"ada@example.com"},"roles":["admin","editor"],"active":true}`;

interface ValidationState {
  status: "idle" | "valid" | "invalid";
  message?: string;
  line?: number;
  column?: number;
  excerpt?: string;
  bytes?: number;
  typeHint?: string;
}

function describeType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `array (${value.length} items)`;
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    return `object (${keys.length} keys)`;
  }
  return typeof value;
}

export function JsonValidator({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [state, setState] = React.useState<ValidationState>({ status: "idle" });

  const validate = React.useCallback(() => {
    if (!input.trim()) {
      setState({ status: "invalid", message: "Please paste some JSON first." });
      return;
    }
    if (byteLength(input) > MAX_INPUT_BYTES) {
      setState({ status: "invalid", message: INPUT_TOO_LARGE_MSG });
      return;
    }
    try {
      const parsed = JSON.parse(input);
      setState({
        status: "valid",
        bytes: byteLength(input),
        typeHint: describeType(parsed),
      });
      toast.success("JSON is valid.");
    } catch (e) {
      const info = describeJsonError(e, input);
      setState({
        status: "invalid",
        message: info.message,
        line: info.line,
        column: info.column,
        excerpt: info.excerpt,
      });
      toast.error("Invalid JSON.");
    }
  }, [input]);

  const reset = () => {
    setInput("");
    setState({ status: "idle" });
  };

  const content: ToolContent = {
    intro:
      "Validate JSON syntax in your browser. Paste a payload and instantly see whether it parses, plus a friendly error message with line and column if it does not. Great for catching trailing commas, unquoted keys or single quotes before deploying.",
    tool: (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="jv-input">JSON to validate</Label>
            <button
              type="button"
              onClick={() => setInput(SAMPLE)}
              className="text-xs text-primary hover:underline"
            >
              Load sample
            </button>
          </div>
          <Textarea
            id="jv-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setState({ status: "idle" });
            }}
            placeholder='{"hello":"world"}'
            className="min-h-[260px] font-mono text-xs"
            spellCheck={false}
            aria-label="JSON to validate"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={validate}>
            <Wand2 className="mr-1.5 h-4 w-4" /> Validate JSON
          </Button>
          <Button variant="ghost" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>

        {state.status !== "idle" && (
          <div
            role="status"
            className={
              "rounded-lg border p-4 text-sm " +
              (state.status === "valid"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-destructive/40 bg-destructive/10 text-destructive")
            }
          >
            {state.status === "valid" ? (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
                <div className="space-y-1">
                  <p className="font-medium">Valid JSON</p>
                  <p className="text-xs opacity-80">
                    {state.typeHint}
                    {typeof state.bytes === "number" && ` · ${formatBytes(state.bytes)}`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-4 w-4 flex-none" />
                <div className="space-y-1">
                  <p className="font-medium">Invalid JSON</p>
                  <p>{state.message}</p>
                  {typeof state.line === "number" && (
                    <p className="text-xs opacity-80">
                      Around line {state.line}
                      {typeof state.column === "number" ? `, column ${state.column}` : ""}
                      {state.excerpt ? `: ${state.excerpt.trim().slice(0, 120)}` : ""}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste your JSON",
        description:
          "Drop raw JSON from an API response, config file or test fixture into the editor.",
      },
      {
        title: "Click Validate JSON",
        description:
          "The parser runs instantly in your browser. A green banner means your JSON is syntactically valid.",
      },
      {
        title: "Read the error if invalid",
        description:
          "When validation fails you get a message, the line/column where the parser stopped, and a short excerpt of that line.",
      },
      {
        title: "Fix and re-validate",
        description:
          "Editing the input clears the result, so re-click Validate after every fix to confirm.",
      },
    ],
    useCases: [
      "Catch a trailing comma before deploying a config file.",
      "Verify a JSON payload returned by a backend endpoint during debugging.",
      "Validate hand-edited JSON-LD structured data before publishing.",
      "Quick sanity check before passing JSON into a build pipeline.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Only syntactic validity is checked — schema and semantic rules are not enforced.</li>
        <li>Inputs larger than 1 MB are rejected to keep the page responsive.</li>
        <li>JSON5 features (single quotes, comments, trailing commas) are reported as invalid because they are not standard JSON.</li>
      </ul>
    ),
    faq: [
      {
        q: "Does this tool check JSON Schema?",
        a: "No. It only checks whether the text is syntactically valid JSON. For schema validation, run a JSON Schema validator against the parsed value.",
      },
      {
        q: "Why are comments flagged as errors?",
        a: "Standard JSON (RFC 8259) does not allow comments. JSON5 and similar supersets do, but they require a different parser.",
      },
      {
        q: "Is my data uploaded anywhere?",
        a: "No. The validator uses the browser's built-in JSON.parse — your payload never leaves the tab.",
      },
      {
        q: "How do I find the line that failed?",
        a: "The error banner shows the line and column where the parser stopped, plus a short excerpt so you can spot the typo.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
