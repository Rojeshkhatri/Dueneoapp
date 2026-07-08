/**
 * Shared helpers for Dueneo HR & recruiting tools (Task 3-hr, IDs 199-208).
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
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
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

/** Format a percentage value (0–100 scale). */
export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) value = 0;
  return `${value.toFixed(digits)}%`;
}

/** Format an integer with thousands separators. */
export function formatInt(value: number, locale?: string): string {
  if (!Number.isFinite(value)) return "0";
  const loc = locale ?? (typeof navigator !== "undefined" ? navigator.language : "en-US");
  try {
    return new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(Math.trunc(value));
  } catch {
    return String(Math.trunc(value));
  }
}

/** Format a Date as a yyyy-mm-dd string for `<input type="date">`. */
export function toDateInputValue(d: Date): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a yyyy-mm-dd string into a local Date at midnight. Returns null on invalid. */
export function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const iso = value.length > 10 ? value : `${value}T00:00:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format a Date for display using the user's locale. */
export function formatPrettyDate(d: Date, locale?: string): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—";
  const loc = locale ?? (typeof navigator !== "undefined" ? navigator.language : "en-US");
  try {
    return new Intl.DateTimeFormat(loc, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toDateString();
  }
}

/** Add a number of days to a Date (returns a copy). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Whole-day difference between two dates (ignores DST by using UTC midnights). */
export function totalDaysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 86_400_000;
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.trunc((b - a) / MS_PER_DAY);
}

/** Day-of-week index constants matching JavaScript Date#getDay(). */
export const DOW = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
} as const;

export const DOW_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Is the given date a weekend (Saturday or Sunday)? */
export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === DOW.SUN || day === DOW.SAT;
}

/**
 * Cost-of-living index table for ~70 major world cities.
 * Index is relative to a baseline of 100 (New York City = 100 in the
 * classic Numbeo-style convention). Higher = more expensive. The values
 * are reasonable approximations compiled from public cost-of-living data
 * (Numbeo, Expatistan) for general guidance — not official figures.
 */
export interface CityCol {
  label: string;
  country: string;
  index: number;
  rentIndex: number;
  currency: string;
}

export const CITY_COL_TABLE: CityCol[] = [
  // North America
  { label: "New York, USA", country: "United States", index: 100, rentIndex: 100, currency: "USD" },
  { label: "San Francisco, USA", country: "United States", index: 96.5, rentIndex: 107, currency: "USD" },
  { label: "Los Angeles, USA", country: "United States", index: 78.4, rentIndex: 70, currency: "USD" },
  { label: "Chicago, USA", country: "United States", index: 73.2, rentIndex: 60, currency: "USD" },
  { label: "Boston, USA", country: "United States", index: 81.0, rentIndex: 73, currency: "USD" },
  { label: "Seattle, USA", country: "United States", index: 78.9, rentIndex: 70, currency: "USD" },
  { label: "Austin, USA", country: "United States", index: 67.4, rentIndex: 58, currency: "USD" },
  { label: "Miami, USA", country: "United States", index: 73.6, rentIndex: 65, currency: "USD" },
  { label: "Toronto, Canada", country: "Canada", index: 67.8, rentIndex: 55, currency: "CAD" },
  { label: "Vancouver, Canada", country: "Canada", index: 71.5, rentIndex: 62, currency: "CAD" },
  { label: "Mexico City, Mexico", country: "Mexico", index: 36.4, rentIndex: 22, currency: "MXN" },

  // South America
  { label: "São Paulo, Brazil", country: "Brazil", index: 33.2, rentIndex: 18, currency: "BRL" },
  { label: "Buenos Aires, Argentina", country: "Argentina", index: 28.6, rentIndex: 14, currency: "ARS" },
  { label: "Santiago, Chile", country: "Chile", index: 38.1, rentIndex: 22, currency: "CLP" },
  { label: "Bogotá, Colombia", country: "Colombia", index: 30.5, rentIndex: 16, currency: "COP" },
  { label: "Lima, Peru", country: "Peru", index: 31.8, rentIndex: 17, currency: "PEN" },

  // Europe
  { label: "London, UK", country: "United Kingdom", index: 84.6, rentIndex: 78, currency: "GBP" },
  { label: "Manchester, UK", country: "United Kingdom", index: 62.3, rentIndex: 45, currency: "GBP" },
  { label: "Dublin, Ireland", country: "Ireland", index: 76.8, rentIndex: 70, currency: "EUR" },
  { label: "Paris, France", country: "France", index: 79.5, rentIndex: 65, currency: "EUR" },
  { label: "Berlin, Germany", country: "Germany", index: 64.2, rentIndex: 45, currency: "EUR" },
  { label: "Munich, Germany", country: "Germany", index: 70.8, rentIndex: 55, currency: "EUR" },
  { label: "Frankfurt, Germany", country: "Germany", index: 71.0, rentIndex: 55, currency: "EUR" },
  { label: "Amsterdam, Netherlands", country: "Netherlands", index: 73.4, rentIndex: 60, currency: "EUR" },
  { label: "Brussels, Belgium", country: "Belgium", index: 68.1, rentIndex: 50, currency: "EUR" },
  { label: "Madrid, Spain", country: "Spain", index: 51.0, rentIndex: 32, currency: "EUR" },
  { label: "Barcelona, Spain", country: "Spain", index: 55.2, rentIndex: 38, currency: "EUR" },
  { label: "Lisbon, Portugal", country: "Portugal", index: 41.6, rentIndex: 26, currency: "EUR" },
  { label: "Rome, Italy", country: "Italy", index: 56.4, rentIndex: 35, currency: "EUR" },
  { label: "Milan, Italy", country: "Italy", index: 63.5, rentIndex: 45, currency: "EUR" },
  { label: "Zurich, Switzerland", country: "Switzerland", index: 121.3, rentIndex: 65, currency: "CHF" },
  { label: "Geneva, Switzerland", country: "Switzerland", index: 110.5, rentIndex: 70, currency: "CHF" },
  { label: "Vienna, Austria", country: "Austria", index: 60.8, rentIndex: 40, currency: "EUR" },
  { label: "Stockholm, Sweden", country: "Sweden", index: 69.2, rentIndex: 48, currency: "SEK" },
  { label: "Copenhagen, Denmark", country: "Denmark", index: 78.6, rentIndex: 50, currency: "DKK" },
  { label: "Oslo, Norway", country: "Norway", index: 82.4, rentIndex: 48, currency: "NOK" },
  { label: "Helsinki, Finland", country: "Finland", index: 68.0, rentIndex: 45, currency: "EUR" },
  { label: "Warsaw, Poland", country: "Poland", index: 36.7, rentIndex: 24, currency: "PLN" },
  { label: "Prague, Czech Republic", country: "Czech Republic", index: 41.0, rentIndex: 28, currency: "CZK" },
  { label: "Moscow, Russia", country: "Russia", index: 38.5, rentIndex: 22, currency: "RUB" },
  { label: "Istanbul, Turkey", country: "Turkey", index: 30.2, rentIndex: 16, currency: "TRY" },

  // Middle East & Africa
  { label: "Dubai, UAE", country: "United Arab Emirates", index: 65.4, rentIndex: 60, currency: "AED" },
  { label: "Abu Dhabi, UAE", country: "United Arab Emirates", index: 61.0, rentIndex: 55, currency: "AED" },
  { label: "Tel Aviv, Israel", country: "Israel", index: 86.8, rentIndex: 65, currency: "ILS" },
  { label: "Riyadh, Saudi Arabia", country: "Saudi Arabia", index: 50.5, rentIndex: 30, currency: "SAR" },
  { label: "Doha, Qatar", country: "Qatar", index: 58.6, rentIndex: 50, currency: "QAR" },
  { label: "Cairo, Egypt", country: "Egypt", index: 21.4, rentIndex: 8, currency: "EGP" },
  { label: "Cape Town, South Africa", country: "South Africa", index: 33.6, rentIndex: 18, currency: "ZAR" },
  { label: "Johannesburg, South Africa", country: "South Africa", index: 35.8, rentIndex: 20, currency: "ZAR" },
  { label: "Nairobi, Kenya", country: "Kenya", index: 31.0, rentIndex: 14, currency: "KES" },
  { label: "Lagos, Nigeria", country: "Nigeria", index: 32.4, rentIndex: 22, currency: "NGN" },

  // Asia
  { label: "Tokyo, Japan", country: "Japan", index: 71.6, rentIndex: 45, currency: "JPY" },
  { label: "Osaka, Japan", country: "Japan", index: 60.4, rentIndex: 35, currency: "JPY" },
  { label: "Seoul, South Korea", country: "South Korea", index: 64.8, rentIndex: 42, currency: "KRW" },
  { label: "Beijing, China", country: "China", index: 49.2, rentIndex: 35, currency: "CNY" },
  { label: "Shanghai, China", country: "China", index: 54.0, rentIndex: 42, currency: "CNY" },
  { label: "Shenzhen, China", country: "China", index: 50.8, rentIndex: 38, currency: "CNY" },
  { label: "Hong Kong", country: "Hong Kong SAR", index: 89.5, rentIndex: 95, currency: "HKD" },
  { label: "Singapore", country: "Singapore", index: 81.4, rentIndex: 88, currency: "SGD" },
  { label: "Kuala Lumpur, Malaysia", country: "Malaysia", index: 33.2, rentIndex: 20, currency: "MYR" },
  { label: "Bangkok, Thailand", country: "Thailand", index: 38.4, rentIndex: 22, currency: "THB" },
  { label: "Jakarta, Indonesia", country: "Indonesia", index: 32.0, rentIndex: 18, currency: "IDR" },
  { label: "Manila, Philippines", country: "Philippines", index: 30.6, rentIndex: 15, currency: "PHP" },
  { label: "Ho Chi Minh City, Vietnam", country: "Vietnam", index: 31.4, rentIndex: 17, currency: "VND" },
  { label: "New Delhi, India", country: "India", index: 27.8, rentIndex: 12, currency: "INR" },
  { label: "Mumbai, India", country: "India", index: 32.6, rentIndex: 22, currency: "INR" },
  { label: "Bengaluru, India", country: "India", index: 28.5, rentIndex: 15, currency: "INR" },
  { label: "Hyderabad, India", country: "India", index: 26.2, rentIndex: 13, currency: "INR" },

  // Oceania
  { label: "Sydney, Australia", country: "Australia", index: 82.2, rentIndex: 75, currency: "AUD" },
  { label: "Melbourne, Australia", country: "Australia", index: 75.0, rentIndex: 65, currency: "AUD" },
  { label: "Brisbane, Australia", country: "Australia", index: 70.6, rentIndex: 58, currency: "AUD" },
  { label: "Perth, Australia", country: "Australia", index: 68.4, rentIndex: 52, currency: "AUD" },
  { label: "Auckland, New Zealand", country: "New Zealand", index: 76.5, rentIndex: 60, currency: "NZD" },
];

/** Find a city in the COL table by label (case-insensitive exact match). */
export function findCity(label: string): CityCol | undefined {
  const target = label.trim().toLowerCase();
  return CITY_COL_TABLE.find((c) => c.label.toLowerCase() === target);
}

/**
 * Group the city list by country for `<Select>` optgroup rendering.
 * Returns an array of `{ country, cities }` in the order cities first
 * appear in the table.
 */
export function citiesByCountry(): { country: string; cities: CityCol[] }[] {
  const groups: { country: string; cities: CityCol[] }[] = [];
  for (const city of CITY_COL_TABLE) {
    let g = groups.find((grp) => grp.country === city.country);
    if (!g) {
      g = { country: city.country, cities: [] };
      groups.push(g);
    }
    g.cities.push(city);
  }
  return groups;
}

/** Download text content as a file in the browser. */
export function downloadText(filename: string, text: string, mime = "text/plain") {
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

/** CSV field-escape (RFC 4180): quote when contains comma, quote, newline. */
export function csvField(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Compute the next occurrence of a month/day anniversary strictly after
 * `today`. If the month/day this year has already passed (or is today),
 * rolls to next year.
 */
export function nextAnniversary(startDate: Date, today: Date): Date {
  const month = startDate.getMonth();
  const day = startDate.getDate();
  const year = today.getFullYear();
  let next = new Date(year, month, day);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (next.getTime() <= todayMidnight.getTime()) {
    next = new Date(year + 1, month, day);
  }
  return next;
}

/** Calendar years of service (floor — anniversary must have passed). */
export function yearsOfService(startDate: Date, today: Date): number {
  let years = today.getFullYear() - startDate.getFullYear();
  const monthDiff = today.getMonth() - startDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < startDate.getDate())) {
    years -= 1;
  }
  return Math.max(0, years);
}
