"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Download, Wand2, Binary, ArrowRightLeft } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { byteLength, MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, downloadText } from "./_text-helpers";

const SAMPLE_TEXT = "Hello, Dueneo!";
const SAMPLE_BINARY = "01001000 01101001";

/** Convert a UTF-8 string to a space-separated string of 8-bit binary bytes. */
function textToBinary(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return Array.from(bytes, (b) => b.toString(2).padStart(8, "0")).join(" ");
}

/**
 * Parse a binary string into bytes. Accepts space-separated bytes, runs of
 * bytes with no separator (must be a multiple of 8 chars), and tolerant
 * whitespace/newlines. Returns null if the input is invalid.
 */
function binaryToText(input: string): { ok: true; text: string } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, text: "" };

  // Try space-separated first.
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const cleaned = tokens.every((t) => /^[01]{1,16}$/.test(t));

  let bytes: number[] = [];

  if (cleaned && tokens.length > 0) {
    bytes = tokens.map((t) => parseInt(t, 2));
  } else {
    // Fall back: strip everything that isn't 0 or 1, then chunk by 8.
    const ones = trimmed.replace(/[^01]/g, "");
    if (ones.length === 0 || ones.length % 8 !== 0) {
      return {
        ok: false,
        error:
          "Couldn't parse binary. Use 8-bit bytes separated by spaces (e.g. 01001000 01101001) — every byte must be exactly 8 binary digits.",
      };
    }
    for (let i = 0; i < ones.length; i += 8) {
      bytes.push(parseInt(ones.slice(i, i + 8), 2));
    }
  }

  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
    return { ok: true, text: decoded };
  } catch {
    return {
      ok: false,
      error: "Bytes parsed, but they don't form valid UTF-8. Did you mean to use ASCII mode?",
    };
  }
}

export function BinaryTranslator({ tool }: { tool: ToolDefinition }) {
  const [mode, setMode] = React.useState<"encode" | "decode">("encode");

  // Encode-mode state.
  const [text, setText] = React.useState("");
  const [encodeTooLarge, setEncodeTooLarge] = React.useState(false);

  // Decode-mode state.
  const [bin, setBin] = React.useState("");
  const [decodeError, setDecodeError] = React.useState<string | null>(null);

  // Shared option.
  const [asciiOnly, setAsciiOnly] = React.useState(false);

  // Derived outputs.
  const encoded = React.useMemo(() => {
    if (!text) return "";
    if (byteLength(text) > MAX_INPUT_BYTES) return "";
    if (asciiOnly) {
      // Per-charCodeAt — only works for ASCII; non-ASCII chars are dropped.
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if (c > 127) continue;
        out += (out ? " " : "") + c.toString(2).padStart(8, "0");
      }
      return out;
    }
    return textToBinary(text);
  }, [text, asciiOnly]);

  const decodeResult = React.useMemo(() => binaryToText(bin), [bin]);

  // Side-effect: keep error/tooLarge flags in sync.
  React.useEffect(() => {
    setEncodeTooLarge(byteLength(text) > MAX_INPUT_BYTES);
  }, [text]);
  React.useEffect(() => {
    setDecodeError(decodeResult.ok ? null : decodeResult.error);
  }, [decodeResult]);

  const swap = () => {
    if (mode === "encode") {
      if (!encoded) {
        toast.error("Nothing to swap — encode some text first.");
        return;
      }
      setBin(encoded);
      setText("");
      setMode("decode");
      toast.message("Swapped to binary → text mode with your output.");
    } else {
      if (!decodeResult.ok || !decodeResult.text) {
        toast.error("Nothing to swap — decode some binary first.");
        return;
      }
      setText(decodeResult.text);
      setBin("");
      setMode("encode");
      toast.message("Swapped to text → binary mode with your output.");
    }
  };

  const loadSample = () => {
    if (mode === "encode") {
      setText(SAMPLE_TEXT);
      setBin("");
    } else {
      setBin(SAMPLE_BINARY);
      setText("");
    }
    toast.message("Sample loaded.");
  };

  const reset = () => {
    setText("");
    setBin("");
    setDecodeError(null);
  };

  const download = () => {
    if (mode === "encode") {
      if (!encoded) {
        toast.error("Nothing to download yet.");
        return;
      }
      downloadText("text-as-binary.txt", encoded);
      toast.success("Downloaded text-as-binary.txt");
    } else {
      if (!decodeResult.ok || !decodeResult.text) {
        toast.error("Nothing to download yet.");
        return;
      }
      downloadText("binary-as-text.txt", decodeResult.text);
      toast.success("Downloaded binary-as-text.txt");
    }
  };

  const content: ToolContent = {
    intro:
      "Convert text to binary and back. The encoder uses TextEncoder so it handles full UTF-8 (emoji, accents, CJK characters); an optional ASCII-only mode uses charCodeAt for byte-perfect 7-bit output. The decoder accepts space-separated bytes or runs of 0s and 1s. Copy or download either direction, and swap with one click.",
    tool: (
      <div className="space-y-5">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "encode" | "decode")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="encode">
                <Binary className="mr-1.5 h-3.5 w-3.5" /> Text → Binary
              </TabsTrigger>
              <TabsTrigger value="decode">Binary → Text</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="bt-ascii" className="text-xs text-muted-foreground">
                  ASCII only
                </Label>
                <Switch
                  id="bt-ascii"
                  checked={asciiOnly}
                  onCheckedChange={setAsciiOnly}
                  aria-label="ASCII only mode"
                />
              </div>
              <Button variant="outline" size="sm" onClick={swap}>
                <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" /> Swap
              </Button>
              <Button variant="outline" size="sm" onClick={loadSample}>
                <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Sample
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>

          <TabsContent value="encode" className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="bt-text">Input text</Label>
              <Textarea
                id="bt-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste text here…"
                className="min-h-[120px]"
                aria-label="Input text"
              />
              {encodeTooLarge && (
                <p className="text-xs text-destructive" role="status">
                  {INPUT_TOO_LARGE_MSG}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {text.length} characters · {byteLength(text)} UTF-8 bytes
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bt-bin-out">Binary output</Label>
                <div className="flex gap-1.5">
                  <CopyButton value={encoded} size="sm" />
                  <Button variant="outline" size="sm" onClick={download} disabled={!encoded}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                  </Button>
                </div>
              </div>
              <Textarea
                id="bt-bin-out"
                value={encoded}
                readOnly
                placeholder="Your text rendered as space-separated 8-bit bytes…"
                className="min-h-[120px] font-mono text-sm"
                aria-label="Binary output"
                spellCheck={false}
              />
              {encoded && (
                <p className="text-xs text-muted-foreground">
                  {encoded.split(" ").length} bytes ·{" "}
                  {encoded.replace(/\s/g, "").length} bits
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="decode" className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="bt-bin-in">Input binary</Label>
              <Textarea
                id="bt-bin-in"
                value={bin}
                onChange={(e) => setBin(e.target.value)}
                placeholder="Paste space-separated 8-bit bytes here (e.g. 01001000 01101001)…"
                className="min-h-[120px] font-mono text-sm"
                aria-label="Input binary"
                spellCheck={false}
              />
              {decodeError && (
                <p className="text-xs text-destructive" role="status">
                  {decodeError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {bin.replace(/[^01]/g, "").length} binary digits · accepts
                spaces, newlines or no separator (multiples of 8)
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bt-text-out">Decoded text</Label>
                <div className="flex gap-1.5">
                  <CopyButton
                    value={decodeResult.ok ? decodeResult.text : ""}
                    size="sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={download}
                    disabled={!decodeResult.ok || !decodeResult.text}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                  </Button>
                </div>
              </div>
              <Textarea
                id="bt-text-out"
                value={decodeResult.ok ? decodeResult.text : ""}
                readOnly
                placeholder="Your decoded text will appear here…"
                className="min-h-[120px]"
                aria-label="Decoded text"
              />
              {decodeResult.ok && decodeResult.text && (
                <p className="text-xs text-muted-foreground">
                  {decodeResult.text.length} characters ·{" "}
                  {byteLength(decodeResult.text)} UTF-8 bytes
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          <p className="text-muted-foreground">
            <strong className="text-foreground">UTF-8 vs ASCII:</strong> UTF-8
            uses 1–4 bytes per character (so "😀" becomes four bytes).
            ASCII-only mode uses <code>charCodeAt</code> and skips any
            character above code-point 127 — handy for legacy systems that
            expect pure 7-bit data.
          </p>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Pick a direction",
        description:
          "Use the Text → Binary or Binary → Text tab. The Swap button moves your output into the other mode's input.",
      },
      {
        title: "Type or paste your data",
        description:
          "For text encoding, paste any text — full UTF-8 (emoji, accents, CJK) is supported. For decoding, paste space-separated bytes or a run of 0s and 1s.",
      },
      {
        title: "Toggle ASCII-only (optional)",
        description:
          "Switch ASCII only on to drop non-ASCII characters and emit pure 7-bit output. Useful for legacy systems.",
      },
      {
        title: "Copy or download",
        description:
          "Click Copy to put the result on your clipboard, or Save to download a .txt file.",
      },
    ],
    useCases: [
      "Learn how text is encoded as bits — perfect for CS students and interview prep.",
      "Debug binary protocols or inspect the raw bytes of an emoji.",
      "Encode ASCII-only payloads for legacy systems that don't speak UTF-8.",
      "Decode binary pasted from a textbook, tutorial or CTF challenge.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          UTF-8 mode emits one byte per character for ASCII, two for Latin
          accents, three for most CJK characters, and four for emoji — so
          the byte count will be larger than the character count.
        </li>
        <li>
          The decoder is strict: invalid UTF-8 byte sequences are rejected
          with a friendly error. Turn on ASCII only if you're working with
          raw 7-bit data.
        </li>
        <li>
          Inputs larger than 1 MB are flagged but still processed on the
          main thread — very large inputs may take a moment.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why does \"😀\" become four bytes?",
        a: "UTF-8 encodes characters above U+FFFF as four bytes. \"😀\" is U+1F600, so it becomes the byte sequence F0 9F 98 80 (11110000 10011111 10011000 10000000 in binary).",
      },
      {
        q: "What does the ASCII-only toggle do?",
        a: "It switches the encoder from TextEncoder (full UTF-8) to per-character charCodeAt — useful when you want pure 7-bit output. Characters above code-point 127 are silently dropped.",
      },
      {
        q: "Why is my binary input rejected?",
        a: "The decoder needs every byte to be exactly 8 binary digits. Spaces and newlines are tolerated, but if you strip them, the total digit count must be a multiple of 8. Re-check for stray characters.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. Encoding and decoding run in your browser. Nothing is sent to a server.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
