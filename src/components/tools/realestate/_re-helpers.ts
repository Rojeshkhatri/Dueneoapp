/**
 * Shared helpers for Dueneo real-estate tools.
 *
 * Browser-only, framework-agnostic, tree-shakeable. No JSX in this file
 * so it can stay a `.ts` module.
 */

/** Parse a user-typed number, returning 0 for empty / invalid input. */
export function parseNumber(input: string | number | null | undefined): number {
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  if (input == null) return 0;
  const trimmed = String(input).trim().replace(/[, ]+/g, "");
  if (trimmed === "") return 0;
  const cleaned = trimmed
    .replace(/^[^0-9.\-()+]+/, "")
    .replace(/[^0-9.\-()+]+$/, "")
    .replace(/^\((.+)\)$/, "-$1");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Format a number as a currency string. */
export function formatCurrency(
  value: number,
  options: { currency?: string; locale?: string; minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
): string {
  const {
    currency = "USD",
    locale = typeof navigator !== "undefined" ? navigator.language : "en-US",
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;
  if (!Number.isFinite(value)) value = 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(maximumFractionDigits)}`;
  }
}

/** Format a number with thousands separators. */
export function formatNumber(
  value: number,
  options: { digits?: number; locale?: string } = {}
): string {
  const { digits = 2, locale } = options;
  if (!Number.isFinite(value)) value = 0;
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return value.toFixed(digits);
  }
}

/** Format a percentage value (0–100 scale) with a trailing `%` sign. */
export function formatPercent(value: number, digits = 2): string {
  if (!Number.isFinite(value)) value = 0;
  return `${value.toFixed(digits)}%`;
}

/** Standard annuity monthly payment for an amortising loan. */
export function monthlyPayment(principal: number, annualRatePct: number, years: number): number {
  const n = Math.max(1, Math.round(years * 12));
  if (principal <= 0 || years <= 0) return 0;
  if (annualRatePct === 0) return principal / n;
  const r = annualRatePct / 100 / 12;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

/** Generate a short unique id (good enough for localStorage keys). */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Trigger a download of a text/blob with the given filename. */
export function downloadText(filename: string, text: string, mime = "text/plain"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** localStorage helper that survives SSR, parse errors and quota issues. */
export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or disabled storage — silently ignore.
  }
}

/** Auto-CSV-quote a field if it contains a delimiter, quote, or newline. */
export function csvField(value: string, delimiter = ","): string {
  const v = value == null ? "" : String(value);
  if (v.includes(delimiter) || v.includes('"') || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

/** Build a CSV string from an array of rows. */
export function toCsv(rows: string[][], delimiter = ","): string {
  return rows.map((r) => r.map((c) => csvField(c, delimiter)).join(delimiter)).join("\r\n");
}

/**
 * Standard "estimate only" disclaimer used in the limitations section of
 * every real-estate tool — keeps the wording consistent.
 */
export const RE_DISCLAIMER =
  "This calculator produces an estimate only and is not professional real-estate, tax, accounting or investment advice. Stamp-duty brackets, tax rules and fees vary by jurisdiction and change frequently — always confirm current rates with your conveyancer, tax office or financial advisor before signing anything.";

/**
 * Region labels for the stamp-duty calculator. Keys are also stored in the
 * per-region bracket table below.
 */
export const STAMP_DUTY_REGIONS = [
  { value: "uk", label: "United Kingdom (England & NI)" },
  { value: "nsw", label: "Australia — New South Wales" },
  { value: "vic", label: "Australia — Victoria" },
  { value: "india", label: "India" },
  { value: "ireland", label: "Ireland" },
  { value: "us", label: "United States (average)" },
] as const;

export type StampDutyRegion = (typeof STAMP_DUTY_REGIONS)[number]["value"];

export interface StampBracket {
  upTo: number; // upper bound of this bracket (exclusive); Infinity for the top bracket
  rate: number; // marginal rate as a percentage (0–100)
}

/**
 * Marginal stamp-duty / land-tax brackets per region. The numbers are
 * simplified averages for educational estimates only — see RE_DISCLAIMER.
 *
 * Each region also declares whether a first-time-buyer relief band applies
 * (a threshold below which duty is 0, plus a reduced rate up to a second
 * threshold).
 */
export const STAMP_DUTY_TABLE: Record<
  StampDutyRegion,
  { brackets: StampBracket[]; firstTimeBuyer?: { reliefUpTo: number; reducedUpTo: number; reducedRate: number } }
> = {
  // UK SDLT (England & Northern Ireland) — residential, simplified 2024 rates.
  uk: {
    brackets: [
      { upTo: 125_000, rate: 0 },
      { upTo: 250_000, rate: 2 },
      { upTo: 925_000, rate: 5 },
      { upTo: 1_500_000, rate: 10 },
      { upTo: Infinity, rate: 12 },
    ],
    firstTimeBuyer: { reliefUpTo: 425_000, reducedUpTo: 625_000, reducedRate: 5 },
  },
  // NSW transfer duty (approximate 2024 brackets).
  nsw: {
    brackets: [
      { upTo: 16_000, rate: 1.25 },
      { upTo: 35_000, rate: 1.5 },
      { upTo: 92_000, rate: 1.75 },
      { upTo: 351_000, rate: 3.5 },
      { upTo: 1_144_000, rate: 4.5 },
      { upTo: 3_613_000, rate: 5.5 },
      { upTo: Infinity, rate: 7 },
    ],
    firstTimeBuyer: { reliefUpTo: 800_000, reducedUpTo: 1_000_000, reducedRate: 0 },
  },
  // VIC land transfer duty (approximate 2024 brackets).
  vic: {
    brackets: [
      { upTo: 25_000, rate: 1.4 },
      { upTo: 130_000, rate: 2.4 },
      { upTo: 960_000, rate: 6 },
      { upTo: 2_000_000, rate: 5.5 },
      { upTo: Infinity, rate: 6.5 },
    ],
    firstTimeBuyer: { reliefUpTo: 600_000, reducedUpTo: 750_000, reducedRate: 0 },
  },
  // India stamp duty — simplified blended rate (varies 3–8% by state).
  india: {
    brackets: [{ upTo: Infinity, rate: 5 }],
  },
  // Ireland stamp duty — residential is a flat 1% up to €1m, 2% above.
  ireland: {
    brackets: [
      { upTo: 1_000_000, rate: 1 },
      { upTo: Infinity, rate: 2 },
    ],
    firstTimeBuyer: { reliefUpTo: 0, reducedUpTo: 0, reducedRate: 0 },
  },
  // US average — no national stamp duty, blend to ~0.5% recording/transfer.
  us: {
    brackets: [{ upTo: Infinity, rate: 0.5 }],
  },
};

export interface StampBreakdownRow {
  label: string;
  amount: number;
}

/**
 * Compute stamp duty for a price using marginal brackets, with optional
 * first-time-buyer relief. Returns the total plus a bracket-by-bracket
 * breakdown for display. The optional `currency` arg controls only the
 * currency symbol shown in the breakdown labels — calculation is currency-
 * agnostic (brackets are treated as denominated in whatever currency you pass).
 */
export function computeStampDuty(
  region: StampDutyRegion,
  price: number,
  firstTimeBuyer: boolean,
  currency = "GBP"
): { total: number; breakdown: StampBreakdownRow[]; effectiveRate: number } {
  const table = STAMP_DUTY_TABLE[region];
  const breakdown: StampBreakdownRow[] = [];
  if (!table || price <= 0) return { total: 0, breakdown, effectiveRate: 0 };

  let total = 0;
  let prev = 0;

  if (firstTimeBuyer && table.firstTimeBuyer && table.firstTimeBuyer.reliefUpTo > 0) {
    const { reliefUpTo, reducedUpTo, reducedRate } = table.firstTimeBuyer;
    // 0% band
    if (price > reliefUpTo) {
      breakdown.push({ label: `0% on first ${formatCurrency(reliefUpTo, { currency })}`, amount: 0 });
    } else {
      breakdown.push({ label: `0% on first ${formatCurrency(price, { currency })}`, amount: 0 });
      total = 0;
      return { total, breakdown, effectiveRate: price > 0 ? (total / price) * 100 : 0 };
    }
    prev = reliefUpTo;
    // Reduced-rate band up to reducedUpTo
    if (price > reducedUpTo) {
      const slice = reducedUpTo - prev;
      const amount = (slice * reducedRate) / 100;
      breakdown.push({ label: `${reducedRate}% on ${formatCurrency(slice, { currency })}`, amount });
      total += amount;
      prev = reducedUpTo;
    } else {
      const slice = price - prev;
      const amount = (slice * reducedRate) / 100;
      breakdown.push({ label: `${reducedRate}% on ${formatCurrency(slice, { currency })}`, amount });
      total += amount;
      return { total, breakdown, effectiveRate: price > 0 ? (total / price) * 100 : 0 };
    }
  }

  for (const b of table.brackets) {
    if (price <= prev) break;
    const upper = Math.min(price, b.upTo);
    const slice = upper - prev;
    if (slice <= 0) {
      prev = b.upTo;
      continue;
    }
    const amount = (slice * b.rate) / 100;
    if (amount > 0 || b.rate > 0) {
      breakdown.push({
        label: `${b.rate}% on ${formatCurrency(slice, { currency })}`,
        amount,
      });
    }
    total += amount;
    prev = b.upTo;
    if (price <= b.upTo) break;
  }

  return { total, breakdown, effectiveRate: price > 0 ? (total / price) * 100 : 0 };
}
