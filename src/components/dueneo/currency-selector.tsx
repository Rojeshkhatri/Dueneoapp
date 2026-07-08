"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Major world currencies supported by Dueneo money tools.
 * The `code` is the ISO 4217 code passed to Intl.NumberFormat.
 * The `symbol` is a fallback glyph used in compact UIs.
 */
export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "EGP", name: "Egyptian Pound", symbol: "£" },
  { code: "ARS", name: "Argentine Peso", symbol: "$" },
  { code: "CLP", name: "Chilean Peso", symbol: "$" },
  { code: "COP", name: "Colombian Peso", symbol: "$" },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
  { code: "RON", name: "Romanian Leu", symbol: "lei" },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв" },
  { code: "HRK", name: "Croatian Kuna", symbol: "kn" },
  { code: "ISK", name: "Icelandic Króna", symbol: "kr" },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك" },
  { code: "BHD", name: "Bahraini Dinar", symbol: ".د.ب" },
  { code: "OMR", name: "Omani Rial", symbol: "﷼" },
  { code: "JOD", name: "Jordanian Dinar", symbol: "د.ا" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "₨" },
  { code: "NPR", name: "Nepalese Rupee", symbol: "₨" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh" },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "د.م." },
  { code: "DZD", name: "Algerian Dinar", symbol: "دج" },
  { code: "TND", name: "Tunisian Dinar", symbol: "د.ت" },
];

const STORAGE_KEY = "dueneo:currency";

/**
 * React hook that manages the user's chosen currency, persisted to
 * localStorage so it sticks across visits and is shared across all
 * Dueneo money tools.
 */
export function useCurrency(defaultCode = "USD") {
  const [code, setCode] = React.useState<string>(defaultCode);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && CURRENCIES.some((c) => c.code === stored)) {
        setCode(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const update = React.useCallback((next: string) => {
    setCode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const option = CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

  return { code, setCode: update, symbol: option.symbol, option };
}

/**
 * Shared currency selector dropdown. Renders a label + select. The
 * selected currency is persisted via the `useCurrency` hook so it is
 * shared across every Dueneo money tool.
 */
export function CurrencySelector({
  value,
  onChange,
  label = "Currency",
  className,
  id,
}: {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id ?? "currency-select"} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id ?? "currency-select"} className="w-full">
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {CURRENCIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="font-mono text-xs">{c.code}</span>
              <span className="ml-2 text-muted-foreground">{c.symbol}</span>
              <span className="ml-2">{c.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Format a money value using the given currency code and the browser's
 * locale. Thin wrapper around Intl.NumberFormat with safe fallbacks.
 */
export function money(
  value: number,
  currencyCode = "USD",
  opts: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
): string {
  const { minimumFractionDigits, maximumFractionDigits } = opts;
  if (!Number.isFinite(value)) value = 0;
  // JPY, KRW, VND, ISK, CLP, etc. conventionally have 0 decimal digits.
  const zeroDecimalCurrencies = ["JPY", "KRW", "VND", "ISK", "CLP", "PYG", "UGX", "RWF", "BIF", "DJF", "GNF", "KMF", "XAF", "XOF", "XPF"];
  const zeroDecimal = zeroDecimalCurrencies.includes(currencyCode);
  const min = minimumFractionDigits ?? (zeroDecimal ? 0 : 2);
  const max = maximumFractionDigits ?? (zeroDecimal ? 0 : 2);
  try {
    return new Intl.NumberFormat(
      typeof navigator !== "undefined" ? navigator.language : "en-US",
      {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: min,
        maximumFractionDigits: max,
      }
    ).format(value);
  } catch {
    const sym = CURRENCIES.find((c) => c.code === currencyCode)?.symbol ?? currencyCode + " ";
    return `${sym}${value.toFixed(max)}`;
  }
}
