"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Wand2, AlertTriangle, Download, FileImage } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_INPUT_BYTES,
  INPUT_TOO_LARGE_MSG,
  byteLength,
  formatBytes,
  downloadBlob,
  decodeBase64ToText,
  decodeBase64ToBytes,
} from "./_dev-helpers";

interface DecodedResult {
  kind: "text" | "dataurl";
  text?: string;
  mime?: string;
  byteLength?: number;
}

/**
 * Try to decode a base64 string. If it looks like a data URL, split it
 * apart so the UI can offer a download button for the binary blob.
 */
function decode(input: string): DecodedResult {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Please paste a Base64 string first.");

  // Detect a data URL: data:[<mime>][;base64],<payload>
  const dataUrlMatch = trimmed.match(/^data:([^;,]+)?(?:;base64)?,(.+)$/i);
  if (dataUrlMatch) {
    const mime = dataUrlMatch[1] || "application/octet-stream";
    const payload = dataUrlMatch[2];
    const bytes = decodeBase64ToBytes(payload);
    return { kind: "dataurl", mime, byteLength: bytes.length };
  }

  // Otherwise try to decode as UTF-8 text. If that fails because the
  // bytes are not valid UTF-8, fall back to bytes + offer download.
  try {
    const text = decodeBase64ToText(trimmed);
    return { kind: "text", text, byteLength: byteLength(text) };
  } catch {
    const bytes = decodeBase64ToBytes(trimmed);
    return {
      kind: "dataurl",
      mime: "application/octet-stream",
      byteLength: bytes.length,
    };
  }
}

function guessExtension(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/bmp": "bmp",
    "application/pdf": "pdf",
    "text/plain": "txt",
    "application/json": "json",
    "application/octet-stream": "bin",
  };
  return map[mime] ?? "bin";
}

export function Base64Decoder({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [result, setResult] = React.useState<DecodedResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const run = React.useCallback(() => {
    if (!input.trim()) {
      setError("Please paste a Base64 string first.");
      setResult(null);
      return;
    }
    if (byteLength(input) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setResult(null);
      return;
    }
    try {
      const r = decode(input);
      setResult(r);
      setError(null);
      toast.success(
        r.kind === "dataurl"
          ? `Decoded ${formatBytes(r.byteLength ?? 0)} of binary data.`
          : "Decoded as UTF-8 text."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message}. Make sure the input is a valid Base64 string.`
          : "Decoding failed."
      );
      setResult(null);
      toast.error("Invalid Base64 input.");
    }
  }, [input]);

  const reset = () => {
    setInput("");
    setResult(null);
    setError(null);
  };

  const downloadDecoded = () => {
    if (!result || result.kind !== "dataurl") return;
    const bytes = decodeBase64ToBytes(
      result.mime && result.mime !== "application/octet-stream"
        ? input.trim().replace(/^data:[^,]+,/i, "")
        : input.trim()
    );
    const ext = result.mime ? guessExtension(result.mime) : "bin";
    downloadBlob(new Blob([Uint8Array.from(bytes)], { type: result.mime ?? undefined }), `decoded.${ext}`);
    toast.success("Downloaded decoded file.");
  };

  const content: ToolContent = {
    intro:
      "Decode Base64 back into text or binary, in your browser. Data URLs (data:image/png;base64,...) are recognised automatically and offered as a downloadable file. Standard and URL-safe alphabets are both supported.",
    tool: (
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="bd-input">Base64 input</Label>
          <Textarea
            id="bd-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setResult(null);
              setError(null);
            }}
            placeholder="SGVsbG8sIHdvcmxkIQ=="
            className="min-h-[160px] font-mono text-xs"
            spellCheck={false}
            aria-label="Base64 input"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={run}>
            <Wand2 className="mr-1.5 h-4 w-4" /> Decode
          </Button>
          <Button variant="ghost" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
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
                <p className="font-medium">Decoding problem</p>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="bd-output">
                Decoded output
                {result.kind === "dataurl" && result.mime && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {result.mime} · {formatBytes(result.byteLength ?? 0)}
                  </span>
                )}
              </Label>
              <div className="flex gap-1.5">
                {result.kind === "text" && (
                  <CopyButton value={result.text ?? ""} size="sm" />
                )}
                {result.kind === "dataurl" && (
                  <Button variant="outline" size="sm" onClick={downloadDecoded}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download decoded file
                  </Button>
                )}
              </div>
            </div>
            {result.kind === "text" ? (
              <Textarea
                id="bd-output"
                value={result.text ?? ""}
                readOnly
                className="min-h-[200px] font-mono text-xs"
                spellCheck={false}
                aria-label="Decoded text"
              />
            ) : (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
                <FileImage className="h-5 w-5 text-primary" />
                <div className="space-y-0.5">
                  <p className="font-medium">Binary content detected</p>
                  <p className="text-xs text-muted-foreground">
                    {result.mime ?? "application/octet-stream"} ·{" "}
                    {formatBytes(result.byteLength ?? 0)}. Click{" "}
                    <em>Download decoded file</em> to save it.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste your Base64 string",
        description:
          "Drop a standard or URL-safe Base64 string. A data: URL prefix is detected automatically.",
      },
      {
        title: "Click Decode",
        description:
          "The decoder first tries UTF-8 text. If the bytes are not valid UTF-8 it falls back to binary.",
      },
      {
        title: "Read or download",
        description:
          "Text appears in the output box with a Copy button. Binary content shows a Download button so you can save the original file.",
      },
      {
        title: "Reset to try again",
        description:
          "Click Reset to clear everything and paste a new value.",
      },
    ],
    useCases: [
      "Read the contents of a data URL embedded in HTML or CSS.",
      "Recover a binary file from a Base64-encoded API payload.",
      "Decode a JWT payload (the middle segment is Base64URL).",
      "Inspect what a Base64 string actually contains.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Inputs larger than 1 MB are rejected to keep memory usage safe.</li>
        <li>The decoder does not verify signatures on JWTs — it only reveals the plaintext payload.</li>
        <li>Whitespace inside the Base64 string is stripped before decoding.</li>
      </ul>
    ),
    faq: [
      {
        q: "How does it know whether to show text or a file?",
        a: "It first attempts a UTF-8 decode. If that fails because the bytes are not valid UTF-8, or if the input is a data: URL, it falls back to binary mode and offers a download.",
      },
      {
        q: "Does it support URL-safe Base64?",
        a: "Yes. The decoder normalises - to + and _ to / and re-pads the string before calling atob.",
      },
      {
        q: "Can it decode a JWT?",
        a: "It can decode the middle (payload) segment of a JWT because that segment is Base64URL-encoded JSON. Paste it in and you will see the JSON payload as text.",
      },
      {
        q: "Is the decoded data sent anywhere?",
        a: "No. Decoding happens in your browser tab. The decoded bytes never leave your device.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
