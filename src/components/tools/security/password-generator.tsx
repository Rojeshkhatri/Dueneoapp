"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { PrivacyNote } from "@/components/dueneo/privacy-note";
import { CopyButton } from "@/components/dueneo/copy-button";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { RefreshCw, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  randomChar,
  secureShuffle,
  estimatePasswordStrength,
  type StrengthLevel,
} from "./_security-helpers";

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?/~";
const AMBIGUOUS = /[Il1O0o]/g;

interface Options {
  length: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

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

function generatePassword(opts: Options): string {
  let pool = "";
  const required: string[] = [];
  if (opts.lower) {
    pool += LOWER;
    required.push(randomChar(LOWER));
  }
  if (opts.upper) {
    pool += UPPER;
    required.push(randomChar(UPPER));
  }
  if (opts.digits) {
    pool += DIGITS;
    required.push(randomChar(DIGITS));
  }
  if (opts.symbols) {
    pool += SYMBOLS;
    required.push(randomChar(SYMBOLS));
  }
  if (opts.excludeAmbiguous) {
    pool = pool.replace(AMBIGUOUS, "");
  }
  if (!pool) return "";

  const chars: string[] = [...required];
  while (chars.length < opts.length) {
    chars.push(randomChar(pool));
  }
  // Shuffle so the required chars are not at the start.
  return secureShuffle(chars).slice(0, opts.length).join("");
}

export function PasswordGenerator({ tool }: { tool: ToolDefinition }) {
  const [opts, setOpts] = React.useState<Options>({
    length: 16,
    upper: true,
    lower: true,
    digits: true,
    symbols: true,
    excludeAmbiguous: false,
  });
  const [password, setPassword] = React.useState("");
  const [reveal, setReveal] = React.useState(true);

  const regenerate = React.useCallback(() => {
    const next = generatePassword(opts);
    if (!next) {
      toast.error("Please select at least one character class.");
      return;
    }
    setPassword(next);
  }, [opts]);

  // Generate once on mount and whenever options change.
  React.useEffect(() => {
    const next = generatePassword(opts);
    if (next) setPassword(next);
  }, [opts]);

  const strength = React.useMemo(() => estimatePasswordStrength(password), [password]);

  const update = <K extends keyof Options>(key: K, value: Options[K]) =>
    setOpts((o) => ({ ...o, [key]: value }));

  const anySelected = opts.upper || opts.lower || opts.digits || opts.symbols;

  const reset = () => {
    const defaults: Options = {
      length: 16,
      upper: true,
      lower: true,
      digits: true,
      symbols: true,
      excludeAmbiguous: false,
    };
    setOpts(defaults);
    setPassword(generatePassword(defaults));
  };

  const content: ToolContent = {
    intro:
      "Generate strong, random passwords using your browser's cryptographically-secure random number generator. Choose length and character classes, then copy the result. Nothing is logged or transmitted — your new password never leaves this tab.",
    tool: (
      <div className="space-y-5">
        <PrivacyNote level="sensitive" className="mb-3">
          Sensitive tool — your password is generated locally with <code>crypto.getRandomValues</code> and never sent to any server.
        </PrivacyNote>

        <div className="rounded-xl border bg-card p-4 sm:p-6">
          <Label htmlFor="pg-output">Generated password</Label>
          <div className="mt-2 flex flex-wrap items-stretch gap-2">
            <div className="flex min-h-[44px] flex-1 items-center gap-2 rounded-md border bg-background px-3 font-mono text-base break-all">
              <span aria-live="polite" className="flex-1">
                {password ? (reveal ? password : "•".repeat(Math.min(password.length, 32))) : "—"}
              </span>
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground"
                aria-label={reveal ? "Hide password" : "Reveal password"}
              >
                {reveal ? "Hide" : "Show"}
              </button>
            </div>
            <CopyButton value={password} label="Copy" size="default" />
            <Button type="button" onClick={regenerate} disabled={!anySelected}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> New
            </Button>
          </div>

          {password && (
            <div className="mt-4 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Strength</span>
                <span className={`font-medium ${STRENGTH_COLOR[strength.level]}`}>
                  {STRENGTH_LABEL[strength.level]} · {strength.entropyBits.toFixed(0)} bits
                </span>
              </div>
              <Progress value={STRENGTH_BAR[strength.level]} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Estimated offline crack time: {strength.crackTime}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-5 rounded-xl border bg-muted/30 p-4 sm:p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pg-length">Length</Label>
              <span className="font-mono text-sm text-muted-foreground">{opts.length}</span>
            </div>
            <Slider
              id="pg-length"
              value={[opts.length]}
              min={4}
              max={64}
              step={1}
              onValueChange={(v) => update("length", v[0] ?? 16)}
            />
            <p className="text-xs text-muted-foreground">Between 4 and 64 characters.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleRow
              label="Uppercase (A–Z)"
              checked={opts.upper}
              onChange={(v) => update("upper", v)}
              id="pg-upper"
            />
            <ToggleRow
              label="Lowercase (a–z)"
              checked={opts.lower}
              onChange={(v) => update("lower", v)}
              id="pg-lower"
            />
            <ToggleRow
              label="Digits (0–9)"
              checked={opts.digits}
              onChange={(v) => update("digits", v)}
              id="pg-digits"
            />
            <ToggleRow
              label="Symbols (!@#$…)"
              checked={opts.symbols}
              onChange={(v) => update("symbols", v)}
              id="pg-symbols"
            />
            <ToggleRow
              label="Exclude ambiguous (I, l, 1, O, 0, o)"
              checked={opts.excludeAmbiguous}
              onChange={(v) => update("excludeAmbiguous", v)}
              id="pg-amb"
            />
          </div>

          {!anySelected && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              Pick at least one character class so we have something to draw from.
            </p>
          )}

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset defaults
            </Button>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Pick a length",
        description:
          "Use the slider to choose between 4 and 64 characters. 12–16 is a good sweet spot for most accounts.",
      },
      {
        title: "Choose character classes",
        description:
          "Toggle uppercase, lowercase, digits and symbols. At least one class must be enabled. Tick “Exclude ambiguous” to drop look-alike characters like I, l, 1, O, 0, o.",
      },
      {
        title: "Generate and review",
        description:
          "A new password is generated automatically whenever you change the options. Click “New” for another random draw using the same settings.",
      },
      {
        title: "Copy and use",
        description:
          "Click Copy to put the password on your clipboard, then paste it into your password manager or sign-up form.",
      },
    ],
    useCases: [
      "Generate a unique password for each new online account.",
      "Create a strong master password for your password manager.",
      "Produce a random API key or shared secret for development.",
      "Spin up a quick Wi-Fi or device PIN without reusing an old password.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Generated passwords are not stored anywhere — copy them before leaving the page.</li>
        <li>Strength estimates are heuristic. A “strong” rating does not guarantee resistance to every attack.</li>
        <li>Very long passwords ({">"}64 chars) are not supported; longer is rarely more practical than a 16–24 char random string.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is this password sent to a server?",
        a: "No. The password is generated in your browser using the Web Crypto API (crypto.getRandomValues) and is never transmitted, logged or stored. Closing the tab erases it.",
      },
      {
        q: "How random is the generator?",
        a: "It uses your browser's cryptographically-secure random source — the same primitive used for TLS keys — so the output is suitable for passwords and security tokens.",
      },
      {
        q: "What length should I pick?",
        a: "For most online accounts, 16 characters with all four character classes enabled is a strong default. For high-value accounts, 20–24 characters adds a meaningful margin of safety.",
      },
      {
        q: "Why does the strength meter change with the same length?",
        a: "The meter is heuristic — it factors in length, character classes, repetition and a small common-password list. Two different 16-character passwords can have slightly different scores.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function ToggleRow({
  label,
  checked,
  onChange,
  id,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <Label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between rounded-md border bg-background px-3 py-2.5 text-sm"
    >
      <span>{label}</span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
    </Label>
  );
}
