/**
 * Shared colour helpers for Dueneo design tools.
 *
 * Browser-only, framework-agnostic. No JSX so it can stay a `.ts` module.
 * Implements HEX ↔ RGB ↔ HSL conversions plus WCAG contrast math.
 */

export interface RGB {
  r: number; // 0..255
  g: number;
  b: number;
}

export interface HSL {
  h: number; // 0..360
  s: number; // 0..100
  l: number; // 0..100
}

/* ─────────────────────────── Validation ──────────────────────────── */

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** True when `value` looks like a valid CSS hex colour (with or without #). */
export function isValidHex(value: string): boolean {
  return HEX_RE.test(value.trim());
}

/** Normalise to a 6-digit `#rrggbb` string. Returns `#000000` on bad input. */
export function normaliseHex(value: string): string {
  const m = value.trim().match(HEX_RE);
  if (!m) return "#000000";
  let hex = m[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return `#${hex.toLowerCase()}`;
}

/* ─────────────────────────── HEX ↔ RGB ───────────────────────────── */

export function hexToRgb(hex: string): RGB {
  const n = normaliseHex(hex);
  const num = parseInt(n.slice(1), 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (v: number) => {
    const c = Math.max(0, Math.min(255, Math.round(v)));
    return c.toString(16).padStart(2, "0");
  };
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Parse "r, g, b" or "rgb(r, g, b)" → RGB. Returns null on failure. */
export function parseRgbString(value: string): RGB | null {
  const m = value.trim().match(/^rgba?\(\s*([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)/i);
  if (m) {
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    if ([r, g, b].every((v) => Number.isFinite(v))) return { r, g, b };
  }
  const parts = value.split(/[,\s]+/).filter(Boolean);
  if (parts.length >= 3) {
    const r = Number(parts[0]);
    const g = Number(parts[1]);
    const b = Number(parts[2]);
    if ([r, g, b].every((v) => Number.isFinite(v))) return { r, g, b };
  }
  return null;
}

export function rgbToCss({ r, g, b }: RGB, alpha?: number): string {
  const ri = Math.round(r);
  const gi = Math.round(g);
  const bi = Math.round(b);
  if (typeof alpha === "number" && Number.isFinite(alpha)) {
    return `rgba(${ri}, ${gi}, ${bi}, ${alpha})`;
  }
  return `rgb(${ri}, ${gi}, ${bi})`;
}

/* ─────────────────────────── RGB ↔ HSL ───────────────────────────── */

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * 60;
        break;
      case gn:
        h = ((bn - rn) / delta + 2) * 60;
        break;
      default:
        h = ((rn - gn) / delta + 4) * 60;
        break;
    }
  }
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  if (sn === 0) {
    const v = ln * 255;
    return { r: v, g: v, b: v };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return {
    r: hue2rgb(hn + 1 / 3) * 255,
    g: hue2rgb(hn) * 255,
    b: hue2rgb(hn - 1 / 3) * 255,
  };
}

/** Parse "h, s%, l%" or "hsl(h, s%, l%)" → HSL. Returns null on failure. */
export function parseHslString(value: string): HSL | null {
  const m = value
    .trim()
    .match(/^hsla?\(\s*([0-9.]+)[\s,]+([0-9.]+)%?[\s,]+([0-9.]+)%?/i);
  if (m) {
    const h = Number(m[1]);
    const s = Number(m[2]);
    const l = Number(m[3]);
    if ([h, s, l].every((v) => Number.isFinite(v))) return { h, s, l };
  }
  const parts = value.split(/[,\s]+/).filter(Boolean);
  if (parts.length >= 3) {
    const h = Number(parts[0]);
    const s = Number(String(parts[1]).replace(/%$/, ""));
    const l = Number(String(parts[2]).replace(/%$/, ""));
    if ([h, s, l].every((v) => Number.isFinite(v))) return { h, s, l };
  }
  return null;
}

export function hslToCss({ h, s, l }: HSL, alpha?: number): string {
  const hh = Math.round(h);
  const ss = Math.round(s);
  const ll = Math.round(l);
  if (typeof alpha === "number" && Number.isFinite(alpha)) {
    return `hsla(${hh}, ${ss}%, ${ll}%, ${alpha})`;
  }
  return `hsl(${hh}, ${ss}%, ${ll}%)`;
}

/* ────────────────────────── WCAG contrast ────────────────────────── */

/** Relative luminance per WCAG 2.1. */
export function relativeLuminance({ r, g, b }: RGB): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio between two colours, range 1..21. */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/** Format a contrast ratio as a "x.x:1" string. */
export function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return "1:1";
  return `${ratio.toFixed(2)}:1`;
}

/* ────────────────────── Palette generation ───────────────────────── */

/** Rotate a hue, wrapping at 360°. */
export function rotateHue(h: number, deg: number): number {
  return (((h + deg) % 360) + 360) % 360;
}

export interface PaletteSwatch {
  hex: string;
  rgb: RGB;
  hsl: HSL;
  name: string;
}

const swatchFromHsl = (h: number, s: number, l: number, name: string): PaletteSwatch => {
  const rgb = hslToRgb({ h, s, l });
  return { hex: rgbToHex(rgb), rgb, hsl: { h, s, l }, name };
};

/** Complementary: base + 180° rotation. */
export function complementaryPalette(hex: string): PaletteSwatch[] {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  return [
    swatchFromHsl(h, s, l, "Base"),
    swatchFromHsl(rotateHue(h, 180), s, l, "Complement"),
  ];
}

/** Analogous: base + ±30° rotations. */
export function analogousPalette(hex: string): PaletteSwatch[] {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  return [
    swatchFromHsl(rotateHue(h, -30), s, l, "Analog −30°"),
    swatchFromHsl(h, s, l, "Base"),
    swatchFromHsl(rotateHue(h, 30), s, l, "Analog +30°"),
  ];
}

/** Triadic: base + 120° / 240° rotations. */
export function triadicPalette(hex: string): PaletteSwatch[] {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  return [
    swatchFromHsl(h, s, l, "Base"),
    swatchFromHsl(rotateHue(h, 120), s, l, "Triad 120°"),
    swatchFromHsl(rotateHue(h, 240), s, l, "Triad 240°"),
  ];
}

/** Tetradic: rectangle (base + 60°, 180°, 240°). */
export function tetradicPalette(hex: string): PaletteSwatch[] {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  return [
    swatchFromHsl(h, s, l, "Base"),
    swatchFromHsl(rotateHue(h, 60), s, l, "Tetra 60°"),
    swatchFromHsl(rotateHue(h, 180), s, l, "Tetra 180°"),
    swatchFromHsl(rotateHue(h, 240), s, l, "Tetra 240°"),
  ];
}

/** Monochromatic: 5 shades of the same hue, light → dark. */
export function monochromaticPalette(hex: string): PaletteSwatch[] {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  const lightnesses = [80, 65, 50, 35, 20];
  return lightnesses.map((ll, i) =>
    swatchFromHsl(h, s, ll, `Shade ${i + 1}`)
  );
}

/** Generic shades generator: 9 steps from black to white through the colour. */
export function shadeScale(hex: string, steps = 9): PaletteSwatch[] {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  const out: PaletteSwatch[] = [];
  for (let i = 0; i < steps; i++) {
    const ll = Math.round((i / (steps - 1)) * 100);
    out.push(swatchFromHsl(h, s, ll, `${ll}%`));
  }
  return out;
}

/* ─────────────────────────── Misc ────────────────────────────────── */

/** Choose black or white as the best-contrast text colour on `bg`. */
export function readableTextOn(bg: RGB): string {
  return contrastRatio(bg, { r: 0, g: 0, b: 0 }) >=
    contrastRatio(bg, { r: 255, g: 255, b: 255 })
    ? "#000000"
    : "#ffffff";
}
