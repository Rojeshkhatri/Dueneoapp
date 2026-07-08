/**
 * Shared accessibility helpers for Dueneo design tools.
 *
 * Browser-only, framework-agnostic. No JSX so it stays a `.ts` module.
 * Implements colour-vision-deficiency (CVD) simulation matrices and
 * WCAG contrast helpers used by the Color Accessibility Tester.
 */

import type { RGB } from "./_color-helpers";

export type CvdType =
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "achromatopsia";

export interface CvdDef {
  id: CvdType;
  label: string;
  description: string;
  /** 3×3 transformation matrix applied in linear-ish RGB space. */
  matrix: [number, number, number, number, number, number, number, number, number];
}

/**
 * Vienot (1999) / Brettel (1997) simulation matrices.
 * These are the standard, widely-cited approximations used by most
 * web-based colour-blindness simulators. They map RGB → the reduced
 * gamut visible to a dichromat.
 */
export const CVD_DEFS: CvdDef[] = [
  {
    id: "protanopia",
    label: "Protanopia",
    description: "No red cones. Red looks dark; red/green hues collapse.",
    matrix: [
      0.567, 0.433, 0,
      0.558, 0.442, 0,
      0, 0.242, 0.758,
    ],
  },
  {
    id: "deuteranopia",
    label: "Deuteranopia",
    description: "No green cones. The most common CVD; red/green hues collapse.",
    matrix: [
      0.625, 0.375, 0,
      0.7, 0.3, 0,
      0, 0.3, 0.7,
    ],
  },
  {
    id: "tritanopia",
    label: "Tritanopia",
    description: "No blue cones. Blue/yellow hues collapse (very rare).",
    matrix: [
      0.95, 0.05, 0,
      0, 0.433, 0.567,
      0, 0.475, 0.525,
    ],
  },
  {
    id: "achromatopsia",
    label: "Achromatopsia",
    description: "No colour vision at all — everything is a shade of grey.",
    matrix: [
      0.299, 0.587, 0.114,
      0.299, 0.587, 0.114,
      0.299, 0.587, 0.114,
    ],
  },
];

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

/** Apply a 3×3 CVD matrix to an RGB colour. */
export function simulateCvd(rgb: RGB, def: CvdDef): RGB {
  const m = def.matrix;
  return {
    r: clamp255(m[0] * rgb.r + m[1] * rgb.g + m[2] * rgb.b),
    g: clamp255(m[3] * rgb.r + m[4] * rgb.g + m[5] * rgb.b),
    b: clamp255(m[6] * rgb.r + m[7] * rgb.g + m[8] * rgb.b),
  };
}

export interface WcagResult {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
  /** Short text label e.g. "AA", "AAA", "Fail". */
  bestLabel: string;
}

/** Evaluate WCAG 2.1 contrast for the four standard thresholds. */
export function evaluateWcag(ratio: number): WcagResult {
  const aaNormal = ratio >= 4.5;
  const aaLarge = ratio >= 3;
  const aaaNormal = ratio >= 7;
  const aaaLarge = ratio >= 4.5;
  let bestLabel = "Fail";
  if (aaaNormal) bestLabel = "AAA";
  else if (aaNormal) bestLabel = "AA";
  else if (aaLarge) bestLabel = "AA Large";
  return { ratio, aaNormal, aaLarge, aaaNormal, aaaLarge, bestLabel };
}
