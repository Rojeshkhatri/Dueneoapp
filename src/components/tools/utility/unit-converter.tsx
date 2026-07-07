"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { CopyButton } from "@/components/dueneo/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, ArrowLeftRight, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

type CategoryId =
  | "length"
  | "weight"
  | "temperature"
  | "area"
  | "volume"
  | "speed"
  | "time"
  | "digital";

interface UnitDef {
  id: string;
  label: string;
  /** Factor to the category's base unit, OR a special transform name. */
  toBase: number | string;
  fromBase?: number | string;
}

interface CategoryDef {
  id: CategoryId;
  label: string;
  base: string;
  units: UnitDef[];
  /** Temperature needs offset math; everything else is linear. */
  special?: "temperature";
}

/**
 * Conversion tables. Each unit stores a multiplier to the category's base
 * unit. For temperature we use a `special: "temperature"` flag and apply
 * the offset formulas explicitly.
 */
const CATEGORIES: CategoryDef[] = [
  {
    id: "length",
    label: "Length",
    base: "m",
    units: [
      { id: "mm", label: "Millimetre (mm)", toBase: 0.001 },
      { id: "cm", label: "Centimetre (cm)", toBase: 0.01 },
      { id: "m", label: "Metre (m)", toBase: 1 },
      { id: "km", label: "Kilometre (km)", toBase: 1000 },
      { id: "in", label: "Inch (in)", toBase: 0.0254 },
      { id: "ft", label: "Foot (ft)", toBase: 0.3048 },
      { id: "yd", label: "Yard (yd)", toBase: 0.9144 },
      { id: "mi", label: "Mile (mi)", toBase: 1609.344 },
    ],
  },
  {
    id: "weight",
    label: "Weight",
    base: "kg",
    units: [
      { id: "g", label: "Gram (g)", toBase: 0.001 },
      { id: "kg", label: "Kilogram (kg)", toBase: 1 },
      { id: "t", label: "Tonne (t)", toBase: 1000 },
      { id: "lb", label: "Pound (lb)", toBase: 0.45359237 },
      { id: "oz", label: "Ounce (oz)", toBase: 0.028349523125 },
    ],
  },
  {
    id: "temperature",
    label: "Temperature",
    base: "C",
    special: "temperature",
    units: [
      { id: "C", label: "Celsius (°C)", toBase: "identity" },
      { id: "F", label: "Fahrenheit (°F)", toBase: "F" },
      { id: "K", label: "Kelvin (K)", toBase: "K" },
    ],
  },
  {
    id: "area",
    label: "Area",
    base: "m²",
    units: [
      { id: "mm2", label: "Square millimetre (mm²)", toBase: 0.000001 },
      { id: "cm2", label: "Square centimetre (cm²)", toBase: 0.0001 },
      { id: "m2", label: "Square metre (m²)", toBase: 1 },
      { id: "km2", label: "Square kilometre (km²)", toBase: 1_000_000 },
      { id: "ha", label: "Hectare (ha)", toBase: 10_000 },
      { id: "ft2", label: "Square foot (ft²)", toBase: 0.09290304 },
      { id: "ac", label: "Acre (ac)", toBase: 4046.8564224 },
    ],
  },
  {
    id: "volume",
    label: "Volume",
    base: "L",
    units: [
      { id: "mL", label: "Millilitre (mL)", toBase: 0.001 },
      { id: "L", label: "Litre (L)", toBase: 1 },
      { id: "m3", label: "Cubic metre (m³)", toBase: 1000 },
      { id: "gal", label: "US gallon (gal)", toBase: 3.785411784 },
      { id: "qt", label: "US quart (qt)", toBase: 0.946352946 },
      { id: "pt", label: "US pint (pt)", toBase: 0.473176473 },
      { id: "cup", label: "US cup (cup)", toBase: 0.2365882365 },
      { id: "floz", label: "US fl oz (fl oz)", toBase: 0.0295735295625 },
    ],
  },
  {
    id: "speed",
    label: "Speed",
    base: "m/s",
    units: [
      { id: "mps", label: "Metre / second (m/s)", toBase: 1 },
      { id: "kmh", label: "Kilometre / hour (km/h)", toBase: 1 / 3.6 },
      { id: "mph", label: "Mile / hour (mph)", toBase: 0.44704 },
      { id: "fts", label: "Foot / second (ft/s)", toBase: 0.3048 },
      { id: "knot", label: "Knot (kn)", toBase: 0.5144444444444445 },
    ],
  },
  {
    id: "time",
    label: "Time",
    base: "s",
    units: [
      { id: "ms", label: "Millisecond (ms)", toBase: 0.001 },
      { id: "s", label: "Second (s)", toBase: 1 },
      { id: "min", label: "Minute (min)", toBase: 60 },
      { id: "h", label: "Hour (h)", toBase: 3600 },
      { id: "day", label: "Day (d)", toBase: 86400 },
      { id: "week", label: "Week (wk)", toBase: 604800 },
      { id: "year", label: "Year (yr, 365d)", toBase: 31557600 },
    ],
  },
  {
    id: "digital",
    label: "Digital storage",
    base: "B",
    units: [
      { id: "b", label: "Bit (b)", toBase: 0.125 },
      { id: "B", label: "Byte (B)", toBase: 1 },
      { id: "KB", label: "Kilobyte (KB)", toBase: 1000 },
      { id: "KiB", label: "Kibibyte (KiB)", toBase: 1024 },
      { id: "MB", label: "Megabyte (MB)", toBase: 1_000_000 },
      { id: "MiB", label: "Mebibyte (MiB)", toBase: 1024 * 1024 },
      { id: "GB", label: "Gigabyte (GB)", toBase: 1_000_000_000 },
      { id: "GiB", label: "Gibibyte (GiB)", toBase: 1024 * 1024 * 1024 },
      { id: "TB", label: "Terabyte (TB)", toBase: 1_000_000_000_000 },
      { id: "TiB", label: "Tebibyte (TiB)", toBase: 1024 ** 4 },
    ],
  },
];

const CATEGORY_MAP: Record<CategoryId, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<CategoryId, CategoryDef>;

function findUnit(cat: CategoryDef, id: string): UnitDef {
  return cat.units.find((u) => u.id === id) ?? cat.units[0];
}

function toBaseValue(cat: CategoryDef, unit: UnitDef, value: number): number {
  if (cat.special === "temperature") {
    // Convert input → Celsius.
    if (unit.id === "C") return value;
    if (unit.id === "F") return (value - 32) * (5 / 9);
    if (unit.id === "K") return value - 273.15;
    return value;
  }
  const factor = typeof unit.toBase === "number" ? unit.toBase : 1;
  return value * factor;
}

function fromBaseValue(cat: CategoryDef, unit: UnitDef, base: number): number {
  if (cat.special === "temperature") {
    if (unit.id === "C") return base;
    if (unit.id === "F") return base * (9 / 5) + 32;
    if (unit.id === "K") return base + 273.15;
    return base;
  }
  const factor = typeof unit.toBase === "number" ? unit.toBase : 1;
  return base / factor;
}

function convert(
  cat: CategoryDef,
  fromId: string,
  toId: string,
  value: number
): number {
  const from = findUnit(cat, fromId);
  const to = findUnit(cat, toId);
  const base = toBaseValue(cat, from, value);
  return fromBaseValue(cat, to, base);
}

function formatResult(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs < 1e-6 || abs >= 1e15) return n.toExponential(6);
  // Trim trailing zeros while keeping at most 8 significant digits.
  const fixed = n.toPrecision(8);
  return parseFloat(fixed).toString();
}

export function UnitConverter({ tool }: { tool: ToolDefinition }) {
  const [categoryId, setCategoryId] = React.useState<CategoryId>("length");
  const category = CATEGORY_MAP[categoryId];

  const [fromUnit, setFromUnit] = React.useState<string>(category.units[0].id);
  const [toUnit, setToUnit] = React.useState<string>(category.units[1]?.id ?? category.units[0].id);
  const [value, setValue] = React.useState<string>("1");

  // When the category changes, reset unit picks to that category's first two.
  React.useEffect(() => {
    setFromUnit(category.units[0].id);
    setToUnit(category.units[1]?.id ?? category.units[0].id);
  }, [categoryId, category.units]);

  const parsed = parseFloat(value);
  const numeric = Number.isFinite(parsed) ? parsed : NaN;
  const result = Number.isNaN(numeric)
    ? NaN
    : convert(category, fromUnit, toUnit, numeric);

  const swap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    if (Number.isFinite(result)) setValue(formatResult(result));
  };

  const reset = () => {
    setCategoryId("length");
    setValue("1");
  };

  const resultLabel = findUnit(category, toUnit).label;

  const toolBody = (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="uc-cat">Category</Label>
        <Select value={categoryId} onValueChange={(v) => setCategoryId(v as CategoryId)}>
          <SelectTrigger id="uc-cat" className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="uc-from-val">From</Label>
          <Input
            id="uc-from-val"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            placeholder="Enter a value"
          />
          <Select value={fromUnit} onValueChange={setFromUnit}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {category.units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-center sm:pb-1">
          <Button
            variant="outline"
            size="icon"
            onClick={swap}
            aria-label="Swap units"
            title="Swap units"
            className="rounded-full"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="uc-to-val">To</Label>
          <div className="flex items-center gap-2">
            <Input
              id="uc-to-val"
              readOnly
              value={Number.isFinite(result) ? formatResult(result) : "—"}
              className="font-mono"
            />
            <CopyButton
              value={Number.isFinite(result) ? formatResult(result) : ""}
              size="icon"
              variant="outline"
              className="flex-none"
            />
          </div>
          <Select value={toUnit} onValueChange={setToUnit}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {category.units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {Number.isFinite(numeric) && Number.isFinite(result) ? (
            <>
              <span className="font-mono">{formatResult(numeric)}</span>{" "}
              {findUnit(category, fromUnit).label.split(" (")[0]} ={" "}
              <span className="font-mono font-medium">{formatResult(result)}</span>{" "}
              {resultLabel.split(" (")[0]}
            </>
          ) : (
            "Enter a numeric value to see the conversion."
          )}
        </p>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      <div className="rounded-xl border bg-muted/30 p-4 sm:p-6">
        <h3 className="text-sm font-semibold">Quick reference</h3>
        <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-xs text-muted-foreground" style={{ scrollbarWidth: "thin" }}>
          {category.units
            .filter((u) => u.id !== fromUnit)
            .map((u) => {
              const r = Number.isFinite(numeric)
                ? convert(category, fromUnit, u.id, numeric)
                : NaN;
              return (
                <li key={u.id} className="flex items-center justify-between gap-3 rounded px-2 py-1 hover:bg-background">
                  <span className="truncate">{u.label}</span>
                  <span className="flex items-center gap-1 font-mono">
                    <ArrowRight className="h-3 w-3 opacity-60" />
                    {Number.isFinite(r) ? formatResult(r) : "—"}
                  </span>
                </li>
              );
            })}
        </ul>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Convert between common units across eight categories: length, weight, temperature, area, volume, speed, time and digital storage. Type a value, pick your units and see the result instantly. Everything runs locally in your browser.",
    tool: toolBody,
    howTo: [
      {
        title: "Pick a category",
        description:
          "Choose from length, weight, temperature, area, volume, speed, time or digital storage using the dropdown at the top.",
      },
      {
        title: "Enter your value and units",
        description:
          "Type the value to convert on the left and choose the source unit. Pick the target unit on the right — the result updates as you type.",
      },
      {
        title: "Swap or copy",
        description:
          "Click the circular swap button to reverse the direction of the conversion. Click the copy icon next to the result to put it on your clipboard.",
      },
      {
        title: "Use the quick reference",
        description:
          "The reference panel below the converter shows the same value translated into every other unit in the category for at-a-glance comparison.",
      },
    ],
    useCases: [
      "Convert recipe measurements between metric and US units.",
      "Translate running pace between min/km and min/mile.",
      "Compute square footage from square metres for a real-estate listing.",
      "Quickly check how many bytes are in 12 MiB without doing the math.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Conversion factors use internationally agreed definitions (e.g. 1 in = 25.4 mm). Some imperial units have US vs. UK variants — only US units are provided here.</li>
        <li>Temperature conversion handles Celsius, Fahrenheit and Kelvin only (no Rankine or Réaumur).</li>
        <li>Results use 8 significant digits; very large or very small numbers are shown in exponential notation.</li>
        <li>The year unit is defined as exactly 365.25 days (Julian year) for consistency with SI conventions.</li>
      </ul>
    ),
    faq: [
      {
        q: "Are conversions rounded?",
        a: "Results are displayed with up to 8 significant digits and trailing zeros are trimmed. Very large or very small numbers switch to exponential notation. The underlying math uses full double-precision floating point.",
      },
      {
        q: "Why are there both KB and KiB?",
        a: "KB is the SI kilobyte (1000 bytes), used by storage manufacturers. KiB is the kibibyte (1024 bytes), used by operating systems for file sizes. Both are included so you can convert either way.",
      },
      {
        q: "Can I convert temperatures below absolute zero?",
        a: "You can enter any number, but the result may be physically meaningless (e.g. a negative Kelvin value). The converter does not enforce physical limits.",
      },
      {
        q: "Is there an offline mode?",
        a: "Once the page has loaded, the converter works offline — there is no network call during conversion. Bookmark it for use on the go.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
