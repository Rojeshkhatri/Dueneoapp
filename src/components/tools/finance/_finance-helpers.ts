/**
 * Shared helpers for Dueneo finance tools.
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
  // Allow leading currency symbols, percent signs and parentheses for negatives.
  const cleaned = trimmed
    .replace(/^[^0-9.\-()+]+/, "")
    .replace(/[^0-9.\-()+]+$/, "")
    .replace(/^\((.+)\)$/, "-$1");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Format a number as a currency string. Defaults to USD-style but supports
 * any ISO currency code via `currency` and any locale via `locale`. Falls
 * back to manual formatting when `Intl.NumberFormat` is unavailable.
 */
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
  options: { locale?: string; minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
): string {
  const {
    locale = typeof navigator !== "undefined" ? navigator.language : "en-US",
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
  } = options;
  if (!Number.isFinite(value)) value = 0;
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  } catch {
    return value.toFixed(maximumFractionDigits);
  }
}

/** Format a percentage value (0–100 scale) with a trailing `%` sign. */
export function formatPercent(value: number, digits = 2): string {
  if (!Number.isFinite(value)) value = 0;
  return `${value.toFixed(digits)}%`;
}

/**
 * Convert a string like "12.345" into a plain numeric string suitable
 * for an `<input type="number">` alternative we render as text. Useful
 * for echoing the user's raw input back without scientific notation.
 */
export function toRawNumberString(value: number, maxDigits = 6): string {
  if (!Number.isFinite(value)) return "0";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(Math.min(maxDigits, 20)).replace(/\.?0+$/, "");
}

/**
 * Standard "estimate only" disclaimer used in the limitations section of
 * every finance tool — keeps the wording consistent.
 */
export const FINANCE_DISCLAIMER =
  "This calculator produces an estimate only and is not professional financial, tax or investment advice. Always confirm the underlying formulae with your accountant, bank or financial advisor before making decisions.";

/** Build a flat list of compound-interest data points for the chart. */
export function compoundInterestSeries(
  principal: number,
  annualRatePct: number,
  compoundsPerYear: number,
  years: number,
  annualContribution = 0
): { year: number; balance: number; principal: number; contributions: number; interest: number }[] {
  const r = annualRatePct / 100;
  const n = Math.max(1, Math.floor(compoundsPerYear));
  const perPeriodRate = r / n;
  const points: { year: number; balance: number; principal: number; contributions: number; interest: number }[] = [];
  let balance = principal;
  let totalContrib = 0;
  let totalInterest = 0;
  points.push({ year: 0, balance, principal, contributions: totalContrib, interest: totalInterest });
  const totalPeriods = Math.max(1, Math.floor(years * n));
  for (let p = 1; p <= totalPeriods; p++) {
    const interestThisPeriod = balance * perPeriodRate;
    balance += interestThisPeriod;
    totalInterest += interestThisPeriod;
    // Annual contribution split evenly across the periods of each year.
    const contributionThisPeriod = annualContribution / n;
    balance += contributionThisPeriod;
    totalContrib += contributionThisPeriod;
    if (p % n === 0) {
      points.push({
        year: p / n,
        balance,
        principal,
        contributions: totalContrib,
        interest: totalInterest,
      });
    }
  }
  // Always include the final year point even if years * n isn't a whole number.
  const last = points[points.length - 1];
  if (last.year !== years && years > 0) {
    points.push({ year: years, balance, principal, contributions: totalContrib, interest: totalInterest });
  }
  return points;
}

/**
 * Compute the monthly payment of an amortising loan using the standard
 * annuity formula. Returns 0 when the rate is 0 (interest-free) or when
 * principal / term are invalid.
 */
export function monthlyPayment(principal: number, annualRatePct: number, years: number): number {
  const n = Math.max(1, Math.round(years * 12));
  if (principal <= 0 || years <= 0) return 0;
  if (annualRatePct === 0) return principal / n;
  const r = annualRatePct / 100 / 12;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

/** Amortisation schedule row. */
export interface AmortisationRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

/**
 * Produce an amortisation schedule for the first `maxRows` months of a
 * loan. The balance of the final row is clamped to ≥ 0 to avoid floating
 * point noise showing a tiny negative balance.
 */
export function amortisationSchedule(
  principal: number,
  annualRatePct: number,
  years: number,
  maxRows = 12
): AmortisationRow[] {
  const rows: AmortisationRow[] = [];
  const pmt = monthlyPayment(principal, annualRatePct, years);
  const r = annualRatePct / 100 / 12;
  const n = Math.max(1, Math.round(years * 12));
  let balance = principal;
  for (let m = 1; m <= Math.min(maxRows, n); m++) {
    const interest = balance * r;
    let principalPaid = pmt - interest;
    if (principalPaid > balance) principalPaid = balance;
    balance = Math.max(0, balance - principalPaid);
    rows.push({ month: m, payment: pmt, interest, principal: principalPaid, balance });
  }
  return rows;
}
