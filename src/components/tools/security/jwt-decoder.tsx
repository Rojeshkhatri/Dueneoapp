"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { PrivacyNote } from "@/components/dueneo/privacy-note";
import { CopyButton } from "@/components/dueneo/copy-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Clock, KeyRound, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { base64UrlToString, splitJwt, tryParseJson } from "./_security-helpers";

const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkR1ZW5lbyBVc2VyIiwiaWF0IjoxNzM1NjgwMDAwLCJleHAiOjE3MzY5NzYwMDB9.s7K8b9XpQ3z1mVnLc2yF8aEo4rT5wH1iU6dJ0gB2cM";

interface Decoded {
  headerJson: unknown;
  payloadJson: unknown;
  headerText: string;
  payloadText: string;
  signature: string;
  iat: number | null;
  exp: number | null;
  nbf: number | null;
  error: string | null;
}

function decode(input: string): Decoded {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      headerJson: null,
      payloadJson: null,
      headerText: "",
      payloadText: "",
      signature: "",
      iat: null,
      exp: null,
      nbf: null,
      error: null,
    };
  }
  const parts = splitJwt(trimmed);
  if (!parts) {
    return {
      headerJson: null,
      payloadJson: null,
      headerText: "",
      payloadText: "",
      signature: "",
      iat: null,
      exp: null,
      nbf: null,
      error: "Not a JWT. A token has the form header.payload.signature (three base64url parts separated by dots).",
    };
  }
  let headerText = "";
  let payloadText = "";
  let headerJson: unknown = null;
  let payloadJson: unknown = null;
  try {
    headerText = base64UrlToString(parts.header);
    headerJson = tryParseJson(headerText);
    if (headerJson === null) throw new Error("Header is not valid JSON");
  } catch {
    return {
      headerJson: null,
      payloadJson: null,
      headerText,
      payloadText: "",
      signature: parts.signature,
      iat: null,
      exp: null,
      nbf: null,
      error: "Could not decode the header as base64url JSON.",
    };
  }
  try {
    payloadText = base64UrlToString(parts.payload);
    payloadJson = tryParseJson(payloadText);
    if (payloadJson === null) throw new Error("Payload is not valid JSON");
  } catch {
    return {
      headerJson,
      payloadJson: null,
      headerText,
      payloadText,
      signature: parts.signature,
      iat: null,
      exp: null,
      nbf: null,
      error: "Could not decode the payload as base64url JSON.",
    };
  }

  const claims = (payloadJson ?? {}) as Record<string, unknown>;
  const numClaim = (key: string): number | null => {
    const v = claims[key];
    if (typeof v === "number") return v;
    if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
    return null;
  };

  return {
    headerJson,
    payloadJson,
    headerText,
    payloadText,
    signature: parts.signature,
    iat: numClaim("iat"),
    exp: numClaim("exp"),
    nbf: numClaim("nbf"),
    error: null,
  };
}

function pretty(value: unknown): string {
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatUnix(ts: number | null): string {
  if (ts === null || !Number.isFinite(ts)) return "—";
  // JWT timestamps are in seconds; convert to ms.
  const ms = ts * 1000;
  if (ms < 0 || ms > 8.64e15) return "out of range";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toUTCString();
}

function relativeFromNow(ts: number | null): { text: string; tone: "expired" | "ok" | "pending" | "none" } {
  if (ts === null) return { text: "—", tone: "none" };
  const now = Date.now();
  const ms = ts * 1000;
  const diff = ms - now;
  const absSec = Math.abs(diff) / 1000;
  let label: string;
  if (absSec < 60) label = `${Math.round(absSec)} seconds`;
  else if (absSec < 3600) label = `${Math.round(absSec / 60)} minutes`;
  else if (absSec < 86400) label = `${Math.round(absSec / 3600)} hours`;
  else if (absSec < 2592000) label = `${Math.round(absSec / 86400)} days`;
  else if (absSec < 31536000) label = `${(absSec / 2592000).toFixed(1)} months`;
  else label = `${(absSec / 31536000).toFixed(1)} years`;
  if (diff < 0) return { text: `expired ${label} ago`, tone: "expired" };
  return { text: `in ${label}`, tone: "ok" };
}

export function JwtDecoder({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [decoded, setDecoded] = React.useState<Decoded>(() => decode(""));

  React.useEffect(() => {
    setDecoded(decode(input));
  }, [input]);

  const headerPretty = pretty(decoded.headerJson);
  const payloadPretty = pretty(decoded.payloadJson);

  const expRel = relativeFromNow(decoded.exp);
  const iatRel = relativeFromNow(decoded.iat);

  const content: ToolContent = {
    intro:
      "Paste a JSON Web Token to decode its header and payload as pretty-printed JSON. Issued-at and expiry timestamps are shown in human form. Signatures are NOT verified — this tool is for inspection only.",
    tool: (
      <div className="space-y-5">
        <PrivacyNote level="sensitive" className="mb-3">
          Sensitive tool — JWTs often carry identity claims. Your token is decoded locally and never sent anywhere.
        </PrivacyNote>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="jwt-input">JWT</Label>
            <button
              type="button"
              onClick={() => setInput(SAMPLE)}
              className="text-xs text-primary hover:underline"
            >
              Load sample
            </button>
          </div>
          <Textarea
            id="jwt-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIi…"
            className="min-h-[120px] font-mono text-xs"
            spellCheck={false}
          />
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInput("")}
              disabled={!input}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </div>

        {decoded.error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
            <div>
              <p className="font-medium">Invalid token</p>
              <p className="mt-0.5">{decoded.error}</p>
            </div>
          </div>
        ) : input ? (
          <div className="space-y-4">
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <p className="flex items-center gap-1.5 font-medium">
                <KeyRound className="h-3.5 w-3.5" /> Signature not verified
              </p>
              <p className="mt-1">
                This tool decodes the JWT for inspection only. It does not check the signature, so a tampered token will still appear valid here.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="jwt-header">Header</Label>
                  <CopyButton value={headerPretty} size="sm" label="Copy" />
                </div>
                <pre
                  id="jwt-header"
                  className="max-h-72 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs"
                >
                  {headerPretty || "(empty)"}
                </pre>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="jwt-payload">Payload</Label>
                  <CopyButton value={payloadPretty} size="sm" label="Copy" />
                </div>
                <pre
                  id="jwt-payload"
                  className="max-h-72 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs"
                >
                  {payloadPretty || "(empty)"}
                </pre>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <ClaimCard
                label="Issued at (iat)"
                value={formatUnix(decoded.iat)}
                hint={iatRel.text}
                tone={iatRel.tone}
              />
              <ClaimCard
                label="Expires (exp)"
                value={formatUnix(decoded.exp)}
                hint={expRel.text}
                tone={expRel.tone}
              />
              <ClaimCard
                label="Not before (nbf)"
                value={formatUnix(decoded.nbf)}
                hint={decoded.nbf !== null ? (Date.now() < decoded.nbf * 1000 ? "not yet valid" : "valid") : "—"}
                tone={decoded.nbf !== null ? (Date.now() < decoded.nbf * 1000 ? "pending" : "ok") : "none"}
              />
            </div>

            <div className="space-y-2">
              <Label>Signature (raw base64url)</Label>
              <div className="break-all rounded-md border bg-muted/30 p-3 font-mono text-xs">
                {decoded.signature || "(empty)"}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            <Clock className="mx-auto mb-2 h-6 w-6 opacity-50" />
            Paste a JWT above to see its decoded header and payload.
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste your JWT",
        description:
          "Drop a token of the form header.payload.signature into the textarea. Whitespace is trimmed automatically. Use “Load sample” to try one out.",
      },
      {
        title: "Read the decoded parts",
        description:
          "Header and payload are pretty-printed as JSON. Use the Copy buttons to grab either side. Invalid base64url or non-JSON parts produce a friendly error.",
      },
      {
        title: "Inspect the timestamps",
        description:
          "If the payload contains iat, exp or nbf claims, you will see their UTC time and a relative note like “in 3 days” or “expired 2 hours ago”.",
      },
      {
        title: "Remember the signature is not checked",
        description:
          "This tool only decodes. To trust a token, you must verify its signature against the issuer's public key or shared secret separately.",
      },
    ],
    useCases: [
      "Inspect the claims of an access token during OAuth/OIDC debugging.",
      "Check whether a JWT is expired before sending it in an API request.",
      "See which algorithm a token declares in its header before deciding how to verify.",
      "Audit the contents of a token issued by your own service.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Signatures are <strong>not</strong> verified. A tampered token will still decode successfully.</li>
        <li>The tool does not fetch JWKS keys or perform any cryptographic validation.</li>
        <li>Encrypted JWTs (JWE) are not supported — only signed JWS tokens can be decoded here.</li>
        <li>Inputs larger than 1 MB may slow the page; consider trimming before pasting.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my JWT sent to a server?",
        a: "No. The token is decoded entirely in your browser using base64url and JSON.parse. Nothing is transmitted or logged.",
      },
      {
        q: "Does this tool verify the signature?",
        a: "No. Verifying a signature requires the issuer's secret or public key, which the tool does not have. Use a library such as jose or jsonwebtoken in your own code for verification.",
      },
      {
        q: "Why does my token show an expired timestamp but still works?",
        a: "The exp claim is a recommendation. Some servers grant a grace period, others cache tokens, and some clients refresh transparently. Always treat exp as authoritative in your own code.",
      },
      {
        q: "What is the difference between iat, exp and nbf?",
        a: "iat (issued-at) is when the token was created; exp (expires) is when it stops being valid; nbf (not-before) is the earliest time it should be considered valid.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function ClaimCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "expired" | "ok" | "pending" | "none";
}) {
  const toneClass =
    tone === "expired"
      ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
      : tone === "ok"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "pending"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-border bg-muted/30 text-muted-foreground";
  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="mt-1 font-mono text-xs">{value}</p>
      <p className="mt-1 text-xs font-medium">{hint}</p>
    </div>
  );
}
