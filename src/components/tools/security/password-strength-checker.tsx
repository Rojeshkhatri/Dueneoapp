"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { PrivacyNote } from "@/components/dueneo/privacy-note";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { estimatePasswordStrength, type StrengthLevel } from "./_security-helpers";

const STRENGTH_BAR: Record<StrengthLevel, number> = {
  weak: 25,
  fair: 50,
  good: 75,
  strong: 100,
};

const STRENGTH_COLOR: Record<StrengthLevel, string> = {
  weak: "text-rose-600 dark:text-rose-400",
  fair: "text-amber-600 dark:text-amber-400",
  good: "text-sky-600 dark:text-sky-400",
  strong: "text-emerald-600 dark:text-emerald-400",
};

const STRENGTH_LABEL: Record<StrengthLevel, string> = {
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
};

const STRENGTH_TONE: Record<StrengthLevel, string> = {
  weak: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  fair: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  good: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  strong: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export function PasswordStrengthChecker({ tool }: { tool: ToolDefinition }) {
  const [password, setPassword] = React.useState("");
  const [reveal, setReveal] = React.useState(false);

  const estimate = React.useMemo(() => estimatePasswordStrength(password), [password]);
  const length = password.length;

  const content: ToolContent = {
    intro:
      "Type or paste a password to see an instant strength estimate. The checker considers length, character classes, repetition and a small list of common passwords, then estimates how long an offline brute-force attack would take. Your input never leaves this tab.",
    tool: (
      <div className="space-y-5">
        <PrivacyNote level="sensitive" className="mb-3">
          Sensitive tool — your password is analysed locally. It is never sent to a server, never logged, and never stored.
        </PrivacyNote>

        <div className="rounded-xl border bg-card p-4 sm:p-6">
          <Label htmlFor="psc-input">Password to test</Label>
          <div className="relative mt-2">
            <Input
              id="psc-input"
              type={reveal ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Type a password…"
              autoComplete="off"
              spellCheck={false}
              className="pr-12 font-mono"
              aria-describedby="psc-strength"
            />
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label={reveal ? "Hide password" : "Reveal password"}
            >
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div id="psc-strength" className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Strength</span>
              <span className={`font-medium ${STRENGTH_COLOR[estimate.level]}`}>
                {STRENGTH_LABEL[estimate.level]}
              </span>
            </div>
            <Progress value={STRENGTH_BAR[estimate.level]} className="h-2" />
          </div>

          {password && (
            <div className={`mt-4 rounded-md border p-3 text-sm ${STRENGTH_TONE[estimate.level]}`}>
              <p className="font-medium">
                {STRENGTH_LABEL[estimate.level]} · {estimate.entropyBits.toFixed(0)} bits of entropy
              </p>
              <p className="mt-1 text-xs">
                Estimated offline crack time at 10¹⁰ guesses/sec: <strong>{estimate.crackTime}</strong>
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Stat label="Length" value={`${length} chars`} />
          <Stat
            label="Character classes"
            value={`${estimate.characterClasses} of 4`}
          />
          <Stat label="Pool size" value={estimate.poolSize > 0 ? `${estimate.poolSize} chars` : "—"} />
          <Stat label="Entropy" value={`${estimate.entropyBits.toFixed(1)} bits`} />
        </div>

        {password && estimate.reasons.length > 0 && (
          <div className="rounded-xl border bg-muted/30 p-4 sm:p-6">
            <h3 className="text-sm font-semibold">Why this rating?</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {estimate.reasons.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setPassword("");
              setReveal(false);
            }}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Type or paste your password",
        description:
          "Use the input field above. The checker analyses the value as you type — there is no submit button to click. Toggle the eye icon to reveal or hide the value.",
      },
      {
        title: "Read the strength meter",
        description:
          "The coloured bar and label show a quick verdict (weak, fair, good, strong). The entropy figure underneath estimates how many bits of randomness your password contains.",
      },
      {
        title: "Review the reasoning",
        description:
          "The “Why this rating?” panel lists specific issues — short length, missing character classes, repeated characters or membership in the common-password list.",
      },
      {
        title: "Use the verdict to improve",
        description:
          "Pick a longer, more varied password based on the suggestions, or use the related Password Generator to spin up a strong random one.",
      },
    ],
    useCases: [
      "Sanity-check a password you are about to reuse before signing up.",
      "Audit the strength of passwords exported from your password manager.",
      "Teach friends and family why “Password123” is risky.",
      "Compare memorable passphrase ideas against random-string alternatives.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>This is a heuristic estimator, not a full zxcvbn-style model. It may over-rate some patterns.</li>
        <li>The common-password list is intentionally small — it will not catch every leaked password.</li>
        <li>Strength does not account for where the password is reused. A “strong” reused password is still a liability.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my password sent anywhere?",
        a: "No. The password is analysed entirely in your browser. It is never logged, never sent to a server, and is forgotten as soon as you close or refresh the tab.",
      },
      {
        q: "Why is my password rated “weak” even though it is long?",
        a: "Long runs of repeated characters, dictionary words or a position in the common-password list can outweigh length. Add variety (uppercase, lowercase, digits, symbols) and avoid predictable patterns.",
      },
      {
        q: "What does “entropy” mean?",
        a: "Entropy is the estimated number of bits of randomness in your password. Higher is better — roughly 60+ bits is good, 80+ is excellent for important accounts.",
      },
      {
        q: "Can I trust this for compliance purposes?",
        a: "The checker is a quick heuristic for everyday use. For compliance or auditing scenarios, use a dedicated tool such as a full zxcvbn implementation or a leaked-password database.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm">{value}</p>
    </div>
  );
}
