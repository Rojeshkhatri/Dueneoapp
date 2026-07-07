/**
 * Shared helpers for Dueneo business-document tools.
 *
 * Browser-only, framework-agnostic. No JSX so it can stay a `.ts` module.
 */

/** Parse a user-typed number, returning 0 for empty / invalid input. */
export function parseNumber(input: string | number | null | undefined): number {
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  if (input == null) return 0;
  const trimmed = String(input).trim().replace(/[, ]+/g, "");
  if (trimmed === "") return 0;
  const cleaned = trimmed.replace(/^[^0-9.\-()+]+/, "").replace(/[^0-9.\-()+]+$/, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Format a number as currency. Falls back gracefully when Intl is unavailable. */
export function formatCurrency(
  value: number,
  options: { currency?: string; locale?: string } = {}
): string {
  const {
    currency = "USD",
    locale = typeof navigator !== "undefined" ? navigator.language : "en-US",
  } = options;
  if (!Number.isFinite(value)) value = 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** Format a date string (YYYY-MM-DD) into a friendly localised date. */
export function formatDate(
  value: string,
  locale = typeof navigator !== "undefined" ? navigator.language : "en-US"
): string {
  if (!value) return "—";
  const d = new Date(value + "T00:00:00");
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

/** Today's date as YYYY-MM-DD for the default form values. */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today's date + N days, returned as YYYY-MM-DD. */
export function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Generate a sequential-looking document number based on the current date. */
export function defaultDocumentNumber(prefix: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${y}${m}-${rand}`;
}

/** Standard invoice line item. */
export interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

/** Make a stable random id for a line item. */
export function makeLineItemId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Compute the extended amount for a line item. */
export function lineTotal(item: LineItem): number {
  return parseNumber(item.quantity) * parseNumber(item.unitPrice);
}

/** Sum the extended amounts of all line items. */
export function subtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}
