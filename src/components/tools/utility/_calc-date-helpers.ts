/**
 * Shared date / time helpers for Dueneo calculator tools (Batch D).
 *
 * Browser-only, framework-agnostic, tree-shakeable. No JSX in this file
 * so it can stay a `.ts` module.
 */

/** Format a Date as a yyyy-mm-dd string for `<input type="date">`. */
export function toDateInputValue(d: Date): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Format a Date as a yyyy-mm-ddTHH:mm string for `<input type="datetime-local">`. */
export function toDateTimeInputValue(d: Date): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const date = toDateInputValue(d);
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${date}T${h}:${min}`;
}

/** Parse a yyyy-mm-dd string into a local Date at midnight. Returns null on invalid. */
export function parseDateInput(value: string): Date | null {
  if (!value) return null;
  // Accept both date and datetime-local strings.
  const iso = value.length > 10 ? value : `${value}T00:00:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Calculate the calendar difference between two dates in
 * years / months / days — analogous to the human "age" definition.
 *
 * If `to` is before `from`, the difference is returned in negative terms
 * (callers can show an error message instead).
 */
export function calendarAge(from: Date, to: Date): {
  years: number;
  months: number;
  days: number;
  sign: 1 | -1;
} {
  let sign: 1 | -1 = 1;
  let start = from;
  let end = to;
  if (to < from) {
    sign = -1;
    start = to;
    end = from;
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    // Days in the month before `end`.
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years: sign * years, months: sign * months, days: sign * days, sign };
}

/** Whole-day difference between two dates (ignores DST by using UTC midnights). */
export function totalDaysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 86_400_000;
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.trunc((b - a) / MS_PER_DAY);
}

/**
 * Approximate breakdown of an integer day count into years / months / weeks / days.
 * Uses 1 year = 365.25 days, 1 month = 30.4375 days for conversions.
 */
export function breakdownDays(totalDays: number) {
  const abs = Math.abs(totalDays);
  const weeks = abs / 7;
  const hours = abs * 24;
  const minutes = hours * 60;
  const seconds = minutes * 60;
  const monthsApprox = abs / 30.4375;
  const yearsApprox = abs / 365.25;
  return {
    totalDays: abs,
    weeks,
    hours,
    minutes,
    seconds,
    monthsApprox,
    yearsApprox,
  };
}

/** Whole months between two dates using calendar arithmetic (year, month diff). */
export function wholeMonthsBetween(from: Date, to: Date): number {
  const sign = to < from ? -1 : 1;
  const start = sign === 1 ? from : to;
  const end = sign === 1 ? to : from;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  // If end day < start day, the final month is incomplete.
  if (end.getDate() < start.getDate()) {
    return sign * Math.max(0, months - 1);
  }
  return sign * months;
}

/** Whole years between two dates (floor of months / 12). */
export function wholeYearsBetween(from: Date, to: Date): number {
  const { years, months, days, sign } = calendarAge(from, to);
  if (sign < 0) return -Math.abs(years);
  if (months < 0 || days < 0) return Math.max(0, years - 1);
  return years;
}

/** Add a number of days to a Date (mutates a copy). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Format a Date for display: "Mon, 5 Feb 2024" style using the user's locale. */
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

/** Format a Date with both date and time portion. */
export function formatPrettyDateTime(d: Date, locale?: string): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—";
  const loc = locale ?? (typeof navigator !== "undefined" ? navigator.language : "en-US");
  try {
    return new Intl.DateTimeFormat(loc, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toString();
  }
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

/** Format a number with thousands separators and configurable decimals. */
export function formatNum(value: number, decimals = 2, locale?: string): string {
  if (!Number.isFinite(value)) return "0";
  const loc = locale ?? (typeof navigator !== "undefined" ? navigator.language : "en-US");
  try {
    return new Intl.NumberFormat(loc, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return value.toFixed(decimals);
  }
}

/**
 * Common IANA time zones for the Time Zone Converter. Provides both a
 * user-friendly label and the canonical IANA name. `Intl.DateTimeFormat`
 * accepts these directly via the `timeZone` option.
 */
export const COMMON_TIMEZONES: { value: string; label: string; group: string }[] = [
  // UTC reference
  { value: "UTC", label: "UTC (Coordinated Universal Time)", group: "Universal" },

  // North America
  { value: "America/Los_Angeles", label: "Los Angeles · Pacific Time", group: "North America" },
  { value: "America/Denver", label: "Denver · Mountain Time", group: "North America" },
  { value: "America/Chicago", label: "Chicago · Central Time", group: "North America" },
  { value: "America/New_York", label: "New York · Eastern Time", group: "North America" },
  { value: "America/Toronto", label: "Toronto · Eastern Time", group: "North America" },
  { value: "America/Mexico_City", label: "Mexico City", group: "North America" },
  { value: "America/Vancouver", label: "Vancouver · Pacific Time", group: "North America" },

  // South America
  { value: "America/Sao_Paulo", label: "São Paulo", group: "South America" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires", group: "South America" },
  { value: "America/Bogota", label: "Bogotá", group: "South America" },
  { value: "America/Lima", label: "Lima", group: "South America" },
  { value: "America/Santiago", label: "Santiago", group: "South America" },

  // Europe
  { value: "Europe/London", label: "London · GMT/BST", group: "Europe" },
  { value: "Europe/Dublin", label: "Dublin", group: "Europe" },
  { value: "Europe/Lisbon", label: "Lisbon · WET", group: "Europe" },
  { value: "Europe/Paris", label: "Paris · CET", group: "Europe" },
  { value: "Europe/Berlin", label: "Berlin · CET", group: "Europe" },
  { value: "Europe/Madrid", label: "Madrid · CET", group: "Europe" },
  { value: "Europe/Rome", label: "Rome · CET", group: "Europe" },
  { value: "Europe/Amsterdam", label: "Amsterdam · CET", group: "Europe" },
  { value: "Europe/Brussels", label: "Brussels · CET", group: "Europe" },
  { value: "Europe/Zurich", label: "Zürich · CET", group: "Europe" },
  { value: "Europe/Stockholm", label: "Stockholm · CET", group: "Europe" },
  { value: "Europe/Warsaw", label: "Warsaw · CET", group: "Europe" },
  { value: "Europe/Athens", label: "Athens · EET", group: "Europe" },
  { value: "Europe/Istanbul", label: "Istanbul · TRT", group: "Europe" },
  { value: "Europe/Moscow", label: "Moscow · MSK", group: "Europe" },

  // Africa & Middle East
  { value: "Africa/Cairo", label: "Cairo", group: "Africa & Middle East" },
  { value: "Africa/Johannesburg", label: "Johannesburg", group: "Africa & Middle East" },
  { value: "Africa/Lagos", label: "Lagos", group: "Africa & Middle East" },
  { value: "Africa/Nairobi", label: "Nairobi", group: "Africa & Middle East" },
  { value: "Asia/Dubai", label: "Dubai · GST", group: "Africa & Middle East" },
  { value: "Asia/Riyadh", label: "Riyadh", group: "Africa & Middle East" },
  { value: "Asia/Tehran", label: "Tehran", group: "Africa & Middle East" },
  { value: "Asia/Jerusalem", label: "Jerusalem", group: "Africa & Middle East" },

  // Asia
  { value: "Asia/Karachi", label: "Karachi · PKT", group: "Asia" },
  { value: "Asia/Kolkata", label: "New Delhi · IST", group: "Asia" },
  { value: "Asia/Kathmandu", label: "Kathmandu", group: "Asia" },
  { value: "Asia/Dhaka", label: "Dhaka · BST", group: "Asia" },
  { value: "Asia/Bangkok", label: "Bangkok · ICT", group: "Asia" },
  { value: "Asia/Jakarta", label: "Jakarta · WIB", group: "Asia" },
  { value: "Asia/Hong_Kong", label: "Hong Kong · HKT", group: "Asia" },
  { value: "Asia/Shanghai", label: "Shanghai · CST", group: "Asia" },
  { value: "Asia/Singapore", label: "Singapore · SGT", group: "Asia" },
  { value: "Asia/Seoul", label: "Seoul · KST", group: "Asia" },
  { value: "Asia/Tokyo", label: "Tokyo · JST", group: "Asia" },
  { value: "Asia/Manila", label: "Manila · PHT", group: "Asia" },

  // Oceania
  { value: "Australia/Perth", label: "Perth · AWST", group: "Oceania" },
  { value: "Australia/Adelaide", label: "Adelaide · ACST", group: "Oceania" },
  { value: "Australia/Sydney", label: "Sydney · AEST/AEDT", group: "Oceania" },
  { value: "Australia/Melbourne", label: "Melbourne · AEST/AEDT", group: "Oceania" },
  { value: "Pacific/Auckland", label: "Auckland · NZST/NZDT", group: "Oceania" },
  { value: "Pacific/Fiji", label: "Fiji", group: "Oceania" },
  { value: "Pacific/Honolulu", label: "Honolulu · HST", group: "Oceania" },
];

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
