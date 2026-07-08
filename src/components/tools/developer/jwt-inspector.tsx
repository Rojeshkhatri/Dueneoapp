"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  AlertTriangle,
  Clock,
  Key,
  KeyRound,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { base64UrlToString, splitJwt } from "./_dev2-helpers";

const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTcxMDIzNTIwMCwibmJmIjoxNzEwMjM1MjAwLCJleHAiOjE3MTAyMzg4MDAsImlzcyI6ImR1ZW5lby1hdXRoIiwiYXVkIjoiZHVlbmVvLXdlYiIsImp0aSI6ImFiYzEyMy1kZWYtNDU2In0.s5iKh3YqVZbF7P0nQ8xYr9pT2mE1wZsA4uB6cD8eFgH";

interface ClaimInfo {
  name: string;
  value: unknown;
  description: string;
  type: string;
}

const CLAIM_DESCRIPTIONS: Record<string, string> = {
  iss: "Issuer — the principal that issued the token.",
  sub: "Subject — the principal the token is about (usually the user ID).",
  aud: "Audience — the intended recipient(s) of the token.",
  exp: "Expiration time — after this, the token MUST NOT be accepted.",
  nbf: "Not before — the token is not valid before this time.",
  iat: "Issued at — when the token was minted.",
  jti: "JWT ID — a unique identifier for the token, used to prevent replay.",
  name: "Full name of the subject (OIDC standard claim).",
  email: "Email address of the subject (OIDC standard claim).",
  preferred_username: "Preferred username (OIDC standard claim).",
  role: "Application-specific role claim.",
  scope: "Space-delimited list of scopes granted to the token.",
  typ: "Type — usually 'JWT' or 'at+jwt' for access tokens.",
  alg: "Algorithm — the signing algorithm used (HS256, RS256, ES256, …).",
  kid: "Key ID — which key was used to sign, for key rotation.",
};

export function JwtInspector({ tool }: { tool: ToolDefinition }) {
  const [raw, setRaw] = React.useState("");
  const [parts, setParts] = React.useState<{ header: unknown; payload: unknown; signature: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const inspect = React.useCallback(() => {
    if (!raw.trim()) {
      setParts(null);
      setError("Paste a JWT to inspect.");
      return;
    }
    const split = splitJwt(raw);
    if (!split) {
      setParts(null);
      setError("Not a valid compact JWT — it should have three dot-separated parts (header.payload.signature).");
      toast.error("Invalid JWT shape.");
      return;
    }
    let header: unknown = null;
    let payload: unknown = null;
    try {
      header = JSON.parse(base64UrlToString(split.header));
      payload = JSON.parse(base64UrlToString(split.payload));
    } catch (e) {
      setParts(null);
      setError(e instanceof Error ? `Could not decode base64url: ${e.message}` : "Could not decode the JWT.");
      toast.error("Decode failed.");
      return;
    }
    setParts({ header, payload, signature: split.signature });
    setError(null);
    toast.success("JWT decoded.");
  }, [raw]);

  const loadSample = () => {
    setRaw(SAMPLE);
    const split = splitJwt(SAMPLE);
    if (split) {
      try {
        setParts({
          header: JSON.parse(base64UrlToString(split.header)),
          payload: JSON.parse(base64UrlToString(split.payload)),
          signature: split.signature,
        });
        setError(null);
      } catch {
        /* ignore */
      }
    }
  };

  const reset = () => {
    setRaw("");
    setParts(null);
    setError(null);
  };

  const headerObj = parts?.header as Record<string, unknown> | null;
  const payloadObj = parts?.payload as Record<string, unknown> | null;
  const alg = typeof headerObj?.alg === "string" ? headerObj.alg : "";
  const typ = typeof headerObj?.typ === "string" ? headerObj.typ : "";
  const kid = typeof headerObj?.kid === "string" ? headerObj.kid : "";

  const now = Date.now();
  const iat = numClaim(payloadObj, "iat");
  const nbf = numClaim(payloadObj, "nbf");
  const exp = numClaim(payloadObj, "exp");

  const timeline = React.useMemo(() => {
    if (!parts) return null;
    const pts: { label: string; time: number | null }[] = [];
    if (iat !== null) pts.push({ label: "iat", time: iat * 1000 });
    if (nbf !== null) pts.push({ label: "nbf", time: nbf * 1000 });
    if (exp !== null) pts.push({ label: "exp", time: exp * 1000 });
    pts.push({ label: "now", time: now });
    pts.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));

    const times = pts.map((p) => p.time).filter((t): t is number => t !== null);
    if (times.length < 2) return null;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const span = Math.max(1, max - min);
    return { pts, min, max, span };
  }, [parts, iat, nbf, exp, now]);

  const expiryStatus = React.useMemo(() => {
    if (!exp) return null;
    const expMs = exp * 1000;
    if (now > expMs) {
      return { kind: "expired" as const, when: expMs, delta: now - expMs };
    }
    if (nbf && now < nbf * 1000) {
      return { kind: "not-yet-valid" as const, when: nbf * 1000, delta: nbf * 1000 - now };
    }
    return { kind: "valid" as const, when: expMs, delta: expMs - now };
  }, [exp, nbf, now]);

  const claims: ClaimInfo[] = React.useMemo(() => {
    if (!payloadObj) return [];
    return Object.entries(payloadObj).map(([k, v]) => ({
      name: k,
      value: v,
      description: CLAIM_DESCRIPTIONS[k] ?? "Custom claim — application-specific.",
      type: Array.isArray(v) ? "array" : v === null ? "null" : typeof v,
    }));
  }, [payloadObj]);

  const headerClaims: ClaimInfo[] = React.useMemo(() => {
    if (!headerObj) return [];
    return Object.entries(headerObj).map(([k, v]) => ({
      name: k,
      value: v,
      description: CLAIM_DESCRIPTIONS[k] ?? "Custom header parameter.",
      type: typeof v,
    }));
  }, [headerObj]);

  const sigInfo = React.useMemo(() => {
    if (!alg) return null;
    const a = alg.toUpperCase();
    if (a.startsWith("HS")) {
      const bits = Number(a.slice(2));
      return { family: "HMAC", keyLen: `${bits / 8} bytes (symmetric)`, symmetric: true, note: `HMAC-SHA${bits}. The same secret signs and verifies.` };
    }
    if (a.startsWith("RS")) {
      const bits = Number(a.slice(2));
      return { family: "RSA", keyLen: "2048–4096-bit modulus", symmetric: false, note: `RSASSA-PKCS1-v1_5 with SHA-${bits}. Private key signs, public key verifies.` };
    }
    if (a === "PS256" || a === "PS384" || a === "PS512") {
      return { family: "RSA-PSS", keyLen: "2048–4096-bit modulus", symmetric: false, note: "RSASSA-PSS with probabilistic padding." };
    }
    if (a.startsWith("ES")) {
      const bits = a === "ES256" ? 256 : a === "ES384" ? 384 : 521;
      return { family: "ECDSA", keyLen: `${bits}-bit curve (P-${bits === 521 ? 521 : bits})`, symmetric: false, note: `ECDSA with SHA-${bits === 521 ? 512 : bits}.` };
    }
    if (a === "EdDSA") {
      return { family: "EdDSA", keyLen: "Ed25519 (256-bit)", symmetric: false, note: "Edwards-curve signature (Ed25519)." };
    }
    if (a === "none") {
      return { family: "None", keyLen: "0 bytes", symmetric: false, note: "⚠ Algorithm 'none' means the token is UNSIGNED. Never accept this in production." };
    }
    return { family: a, keyLen: "unknown", symmetric: false, note: "Unrecognised algorithm." };
  }, [alg]);

  const content: ToolContent = {
    intro:
      "Paste a JWT and get a full breakdown: the JOSE header (algorithm, type, key id), every registered and custom claim with a description, an expiry check (expired / valid / not-yet-valid), a visual iat → nbf → exp timeline, and signature details. The signature is never verified — only decoded — and the tool warns you about that loudly.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="jwt-input">JWT</Label>
              <button type="button" onClick={loadSample} className="text-xs text-primary hover:underline">
                Load sample
              </button>
            </div>
            <Textarea
              id="jwt-input"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIi…"
              className="min-h-[200px] font-mono text-xs break-all"
              spellCheck={false}
              aria-label="JWT input"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={inspect}>
                <ScanSearch className="mr-1.5 h-3.5 w-3.5" /> Inspect
              </Button>
              <Button size="sm" variant="ghost" onClick={reset}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {error && (
              <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {parts && (
              <>
                {expiryStatus && (
                  <div
                    className={`rounded-lg border p-3 text-sm ${
                      expiryStatus.kind === "expired"
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : expiryStatus.kind === "not-yet-valid"
                        ? "border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {expiryStatus.kind === "expired" ? (
                        <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" />
                      ) : (
                        <ShieldCheck className="mt-0.5 h-4 w-4 flex-none" />
                      )}
                      <div>
                        <p className="font-medium">
                          {expiryStatus.kind === "expired"
                            ? "Token is EXPIRED"
                            : expiryStatus.kind === "not-yet-valid"
                            ? "Token is not yet valid"
                            : "Token is currently valid"}
                        </p>
                        <p className="text-xs">
                          {expiryStatus.kind === "expired"
                            ? `Expired ${humanizeDelta(expiryStatus.delta)} ago.`
                            : expiryStatus.kind === "not-yet-valid"
                            ? `Becomes valid in ${humanizeDelta(expiryStatus.delta)}.`
                            : `Expires in ${humanizeDelta(expiryStatus.delta)}.`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border bg-amber-400/10 border-amber-400/40 p-3 text-xs text-amber-800 dark:text-amber-200">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-none" />
                    <div>
                      <p className="font-medium">Signature NOT verified.</p>
                      <p>
                        This tool only <em>decodes</em> the JWT. It does <strong>not</strong> verify the signature
                        against a secret or public key, so it cannot prove the token is authentic or unmodified.
                        Never trust the claims for security decisions without server-side verification.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Key className="h-3.5 w-3.5" /> Signature info
                  </div>
                  {sigInfo ? (
                    <dl className="space-y-1 text-xs">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Algorithm</dt>
                        <dd className="font-mono">{alg || "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Family</dt>
                        <dd>{sigInfo.family}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Key length</dt>
                        <dd>{sigInfo.keyLen}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Type</dt>
                        <dd>{sigInfo.symmetric ? "Symmetric (shared secret)" : "Asymmetric (public/private key pair)"}</dd>
                      </div>
                      <p className="mt-2 text-muted-foreground">{sigInfo.note}</p>
                    </dl>
                  ) : (
                    <p className="text-xs text-muted-foreground">No algorithm claim present.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {parts && (
          <>
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Timeline
              </div>
              {timeline ? (
                <div className="relative h-16">
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-border" />
                  {timeline.pts.map((p, i) => {
                    if (p.time === null) return null;
                    const pct = ((p.time - timeline.min) / timeline.span) * 100;
                    const isNow = p.label === "now";
                    return (
                      <div
                        key={i}
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
                        style={{ left: `${pct}%` }}
                      >
                        <div
                          className={`mx-auto h-3 w-3 rounded-full border-2 ${
                            isNow
                              ? "border-primary bg-primary"
                              : p.label === "exp"
                              ? "border-destructive bg-destructive"
                              : p.label === "nbf"
                              ? "border-amber-500 bg-amber-500"
                              : "border-foreground bg-background"
                          }`}
                        />
                        <div className="mt-1 text-[10px] font-medium">{p.label}</div>
                        <div className="text-[9px] text-muted-foreground">{new Date(p.time).toLocaleString()}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Add iat, nbf and exp claims (Unix timestamps) to see a timeline.
                </p>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ClaimCard title="Header" claims={headerClaims} />
              <ClaimCard title="Payload" claims={claims} />
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Signature (raw base64url)</span>
                <CopyButton size="sm" value={parts.signature} />
              </div>
              <code className="block break-all font-mono text-xs text-muted-foreground">{parts.signature || "(empty)"}</code>
              <p className="mt-2 text-[11px] text-muted-foreground">
                <KeyRound className="mr-1 inline h-3 w-3" />
                Length: {parts.signature.length} chars · ~{Math.ceil((parts.signature.length * 3) / 4)} bytes after base64 decoding.
              </p>
            </div>
          </>
        )}
      </div>
    ),
    howTo: [
      { title: "Paste your JWT", description: "Drop the full compact token (header.payload.signature) into the input." },
      { title: "Inspect", description: "The tool decodes the base64url header and payload and shows every claim with a description." },
      { title: "Check expiry", description: "The status banner tells you if the token is expired, valid, or not yet valid (nbf)." },
      { title: "Read the timeline", description: "Visualise iat → nbf → exp against the current time so you can see the token's lifetime at a glance." },
    ],
    useCases: [
      "Debug why a token is being rejected by your API (expired, wrong audience, wrong issuer).",
      "Inspect third-party tokens (e.g. from OAuth providers) to see which claims they include.",
      "Confirm the signing algorithm before wiring up verification on your server.",
      "Teach yourself the JWT structure: header, payload, signature, and registered claims.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Signature is never verified.</strong> Decoding a JWT does not prove authenticity. Always verify on the server.
        </li>
        <li>The tool reads <code>alg</code> from the header, which an attacker can forge — never trust client-side claims.</li>
        <li>Encrypted JWTs (JWE, alg starting with a <code>.</code> or 5-part structure) are not supported.</li>
        <li>Tokens larger than 64 KB are truncated in the textarea.</li>
      </ul>
    ),
    faq: [
      { q: "Is this the same as the JWT Decoder tool?", a: "The Decoder shows header and payload JSON. This Inspector adds claim descriptions, expiry analysis, a visual timeline and signature details — a richer view for debugging." },
      { q: "Can I verify the signature here?", a: "No, by design. Verification requires a secret or public key and must be done where you control the key material — your backend. This tool only decodes." },
      { q: "Why does my token say 'not yet valid'?", a: "It has an nbf (not-before) claim set to a future time. Servers should reject tokens before nbf." },
      { q: "What does alg: none mean?", a: "It means the token is unsigned. Any attacker can mint such tokens. Production verifiers must reject 'none' unless explicitly allowed for a non-sensitive context." },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

/* ───────────────────────── Components ─────────────────────────────── */

function ClaimCard({ title, claims }: { title: string; claims: ClaimInfo[] }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {claims.length === 0 ? (
        <p className="text-xs text-muted-foreground">No claims.</p>
      ) : (
        <ul className="space-y-2">
          {claims.map((c) => (
            <li key={c.name} className="rounded-md border bg-muted/20 p-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <code className="font-semibold text-primary">{c.name}</code>
                <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
              </div>
              <div className="mt-1 font-mono break-words text-foreground">
                {c.name === "iat" || c.name === "nbf" || c.name === "exp"
                  ? `${String(c.value)} → ${new Date(Number(c.value) * 1000).toLocaleString()}`
                  : JSON.stringify(c.value)}
              </div>
              <div className="mt-0.5 text-muted-foreground">{c.description}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─────────────────────────── Helpers ──────────────────────────────── */

function numClaim(obj: Record<string, unknown> | null, key: string): number | null {
  if (!obj) return null;
  const v = obj[key];
  if (typeof v === "number") return v;
  if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
  return null;
}

function humanizeDelta(ms: number): string {
  const abs = Math.abs(ms);
  const sec = Math.floor(abs / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ${min % 60}m`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ${hr % 24}h`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}mo ${day % 30}d`;
  const yr = Math.floor(mon / 12);
  return `${yr}y ${mon % 12}mo`;
}
