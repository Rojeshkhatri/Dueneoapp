"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { PrivacyNote } from "@/components/dueneo/privacy-note";
import { CopyButton } from "@/components/dueneo/copy-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, RotateCcw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import type { ToolDefinition } from "@/data/tools";
import { md5Hex, byteLength, MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG } from "./_security-helpers";

const SAMPLE = "The quick brown fox jumps over the lazy dog";
const EXPECTED = "9e107d9d372bb6826bd81d3542a419d6";

export function Md5Generator({ tool }: { tool: ToolDefinition }) {
  const [text, setText] = React.useState("");
  const [hash, setHash] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const run = React.useCallback(() => {
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
      // MD5 is synchronous and CPU-bound; yield to the event loop first so the
      // button can show its busy state. (Avoids jank on large inputs.)
      setTimeout(() => {
        try {
          const out = md5Hex(text);
          setHash(out);
          toast.success("MD5 hash computed.");
        } catch (e) {
          setHash("");
          setError(e instanceof Error ? e.message : "Hashing failed.");
        } finally {
          setBusy(false);
        }
      }, 0);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Hashing failed.");
    }
  }, [text]);

  const reset = () => {
    setText("");
    setHash("");
    setError(null);
  };

  const loadSample = () => {
    setText(SAMPLE);
    setError(null);
    setHash("");
  };

  const matchesSample = text === SAMPLE && hash === EXPECTED;

  const content: ToolContent = {
    intro:
      "Compute an MD5 hash of any text using a hand-rolled in-browser implementation. The output is a 32-character lowercase hex string. MD5 is cryptographically broken — use it only for non-security checksums.",
    tool: (
      <div className="space-y-5">
        <PrivacyNote level="sensitive" className="mb-3">
          Sensitive tool — your text is hashed locally and never sent anywhere.
        </PrivacyNote>

        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
          <p className="font-medium">Security warning</p>
          <p className="mt-1">
            MD5 is broken for cryptographic purposes. Do not use it for passwords, signatures or integrity verification of untrusted data. Use the related SHA-256 tool for security-sensitive work.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="md5-input">Input text</Label>
            <button
              type="button"
              onClick={loadSample}
              className="text-xs text-primary hover:underline"
            >
              Load sample
            </button>
          </div>
          <Textarea
            id="md5-input"
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
            {busy ? "Hashing…" : "Compute MD5"}
          </Button>
          <Button variant="ghost" size="sm" onClick={reset} disabled={!text && !hash}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>

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
            <Label htmlFor="md5-out">MD5 (hex)</Label>
            <CopyButton value={hash} size="sm" label="Copy" />
          </div>
          <pre
            id="md5-out"
            className="min-h-[48px] break-all rounded-md border bg-muted/30 p-3 font-mono text-xs"
          >
            {hash || "Hash will appear here."}
          </pre>
          {matchesSample && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Matches the known MD5 of the sample sentence. ✓
            </p>
          )}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter your text",
        description:
          "Type or paste up to 1 MB of text. Use “Load sample” to try a known input whose MD5 you can verify.",
      },
      {
        title: "Compute the hash",
        description:
          "Click “Compute MD5”. The hand-rolled in-browser MD5 implementation runs entirely on your device — no external library, no network call.",
      },
      {
        title: "Copy the result",
        description:
          "The 32-character lowercase hex digest appears below the input. Use Copy to put it on your clipboard.",
      },
    ],
    useCases: [
      "Match a legacy MD5 checksum published alongside an old download.",
      "Generate a quick fingerprint for deduplicating short strings.",
      "Reproduce an MD5 value needed by an integration that has not migrated to SHA-256 yet.",
      "Teach how MD5 works without installing a library.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>MD5 is <strong>cryptographically broken</strong> — collisions can be computed in seconds. Never use it for security.</li>
        <li>Inputs larger than 1 MB are rejected to keep the page responsive.</li>
        <li>This tool only computes plain MD5, not HMAC-MD5 or salted variants.</li>
        <li>Do not store password hashes as MD5 — use bcrypt, scrypt or Argon2 instead.</li>
      </ul>
    ),
    faq: [
      {
        q: "Why is MD5 still offered if it is broken?",
        a: "Many legacy systems and download sites still publish MD5 checksums. This tool lets you reproduce those values without installing anything. For any new security-sensitive work, use SHA-256 or stronger.",
      },
      {
        q: "Is my text sent to a server?",
        a: "No. MD5 is computed entirely in your browser using a hand-rolled TypeScript implementation. The input never leaves this tab.",
      },
      {
        q: "Can I hash files with this tool?",
        a: "The MD5 tool is text-only to keep the UI simple. Use the related SHA-256 generator for file hashing, or compute MD5 of a file's contents with a native tool.",
      },
      {
        q: "How is the MD5 algorithm implemented here?",
        a: "It is a self-contained TypeScript port of RFC 1321, written by hand. The full source is in the project repository — no third-party MD5 library is bundled.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
