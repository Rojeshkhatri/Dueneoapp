"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { PrivacyNote } from "@/components/dueneo/privacy-note";
import { CopyButton } from "@/components/dueneo/copy-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle, FileUp, RotateCcw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import type { ToolDefinition } from "@/data/tools";
import {
  sha256Hex,
  sha256Bytes,
  readFileAsArrayBuffer,
  byteLength,
  formatBytes,
  MAX_INPUT_BYTES,
  INPUT_TOO_LARGE_MSG,
} from "./_security-helpers";

const SAMPLE = "The quick brown fox jumps over the lazy dog";
const EXPECTED = "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592";

export function Sha256Generator({ tool }: { tool: ToolDefinition }) {
  const [text, setText] = React.useState("");
  const [hash, setHash] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fileMeta, setFileMeta] = React.useState<{ name: string; size: number } | null>(null);

  const run = React.useCallback(async () => {
    setError(null);
    if (!text) {
      setHash("");
      setError("Enter some text first.");
      return;
    }
    if (byteLength(text) > MAX_INPUT_BYTES) {
      setHash("");
      setError(INPUT_TOO_LARGE_MSG);
      return;
    }
    setBusy(true);
    try {
      const out = await sha256Hex(text);
      setHash(out);
      toast.success("SHA-256 hash computed.");
    } catch (e) {
      setHash("");
      setError(e instanceof Error ? e.message : "Hashing failed.");
    } finally {
      setBusy(false);
    }
  }, [text]);

  const onFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setHash("");
      setFileMeta({ name: file.name, size: file.size });
      return;
    }
    setError(null);
    setBusy(true);
    setFileMeta({ name: file.name, size: file.size });
    try {
      const buf = await readFileAsArrayBuffer(file);
      const out = await sha256Bytes(new Uint8Array(buf));
      setHash(out);
      toast.success(`SHA-256 of ${file.name} computed.`);
    } catch (e) {
      setHash("");
      setError(e instanceof Error ? e.message : "Could not read file.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setText("");
    setHash("");
    setError(null);
    setFileMeta(null);
  };

  const loadSample = () => {
    setText(SAMPLE);
    setError(null);
    setHash("");
  };

  const matchesSample = text === SAMPLE && hash === EXPECTED;

  const content: ToolContent = {
    intro:
      "Compute a SHA-256 hash of any text or small file using the browser's native WebCrypto implementation. Output is a lowercase 64-character hex string. Your input never leaves this tab.",
    tool: (
      <div className="space-y-5">
        <PrivacyNote level="sensitive" className="mb-3">
          Sensitive tool — your text or file is hashed locally with <code>crypto.subtle.digest</code> and never uploaded.
        </PrivacyNote>

        <Tabs defaultValue="text">
          <TabsList>
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="file">File</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sha-text">Input text</Label>
                <button
                  type="button"
                  onClick={loadSample}
                  className="text-xs text-primary hover:underline"
                >
                  Load sample
                </button>
              </div>
              <Textarea
                id="sha-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste text to hash…"
                className="min-h-[160px] font-mono text-xs"
                spellCheck={false}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={run} disabled={busy}>
                <Wand2 className="mr-1.5 h-4 w-4" />
                {busy ? "Hashing…" : "Compute SHA-256"}
              </Button>
              <Button variant="ghost" size="sm" onClick={reset} disabled={!text && !hash}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-3">
            <Label htmlFor="sha-file">Pick a file (up to 1 MB)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent">
                <FileUp className="h-4 w-4" /> Choose file
                <input
                  id="sha-file"
                  type="file"
                  className="sr-only"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <Button variant="ghost" size="sm" onClick={reset} disabled={!fileMeta && !hash}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
            {fileMeta && (
              <p className="text-xs text-muted-foreground">
                {fileMeta.name} · {formatBytes(fileMeta.size)}
              </p>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
            <div>{error}</div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="sha-out">SHA-256 (hex)</Label>
            <CopyButton value={hash} size="sm" label="Copy" />
          </div>
          <pre
            id="sha-out"
            className="min-h-[64px] break-all rounded-md border bg-muted/30 p-3 font-mono text-xs"
          >
            {hash || "Hash will appear here."}
          </pre>
          {matchesSample && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Matches the known SHA-256 of the sample sentence. ✓
            </p>
          )}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Choose text or file mode",
        description:
          "Switch to the Text tab to hash a string, or the File tab to hash a small file (up to 1 MB). Both modes use WebCrypto under the hood.",
      },
      {
        title: "Enter your input",
        description:
          "Type or paste text, or pick a file. For text, click “Compute SHA-256”. Files are hashed as soon as you select them.",
      },
      {
        title: "Copy the result",
        description:
          "The 64-character lowercase hex digest appears below the input. Use Copy to put it on your clipboard.",
      },
    ],
    useCases: [
      "Verify a file's integrity against a published SHA-256 checksum.",
      "Generate a fingerprint string for deduplicating content.",
      "Compute a key derivation input for a downstream cryptographic step.",
      "Sanity-check that two strings or files are byte-identical.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Inputs larger than 1 MB are rejected to keep the tab responsive. For larger files, use a native tool such as <code>shasum -a 256</code>.</li>
        <li>SHA-256 is a fast hash — do not use it directly to store password hashes. Use a slow KDF such as bcrypt, scrypt or Argon2.</li>
        <li>The tool does not compute HMAC-SHA256, only plain SHA-256.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my input sent to a server?",
        a: "No. Hashing happens entirely in your browser via the Web Crypto API. The text or file you hash never leaves this tab.",
      },
      {
        q: "Can I hash a 4 GB video file?",
        a: "Not here. This tool caps inputs at 1 MB so the page stays responsive. For large files, use a native command-line tool like `shasum -a 256 file.mp4`.",
      },
      {
        q: "Is SHA-256 safe for passwords?",
        a: "No. SHA-256 is too fast — an attacker with the hash can try billions of guesses per second. Use bcrypt, scrypt or Argon2 for password storage.",
      },
      {
        q: "Why is the hash lowercase hex?",
        a: "Lowercase hex is the most common convention. If you need uppercase, transform the output with your own editor — the digest is otherwise identical.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
