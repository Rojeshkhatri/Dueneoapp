/**
 * Shared Unicode character-mapping tables for Dueneo's text generators.
 *
 * This module is browser-only, framework-agnostic, and tree-shakeable.
 * It contains NO JSX so it can stay a plain `.ts` module.
 *
 * Coverage:
 *   • Mathematical alphanumeric symbols (U+1D400–U+1D7FF) — bold, italic,
 *     bold-italic, script, bold-script, fraktur, bold-fraktur, double-struck,
 *     sans-serif (all four weights), monospace. Hole-tables map the reserved
 *     code-points to the existing Letterlike Symbols equivalents.
 *   • Enclosed alphanumerics — circled, negative-circled (filled), squashed,
 *     parenthesized, squared, negative-squared, fullwidth.
 *   • Latin-Phonetic Extensions (U+1D00–U+1D2B) small caps.
 *   • Superscripts / subscripts (where Unicode defines them — missing slots
 *     fall back to the source character).
 *   • Combining diacritical marks (U+0300–U+036F) for Zalgo, strikethrough
 *     and underline generators.
 *   • Regional indicator symbols (🇦–🇿) and an upside-down / mirror map.
 */

/** A text-transform function: takes a string, returns a transformed string. */
export type TextTransform = (input: string) => string;

/** Code-point of "A". */
const UPPER_A = 0x41;
/** Code-point of "a". */
const LOWER_A = 0x61;
/** Code-point of "0". */
const DIGIT_0 = 0x30;

/**
 * Build a transform for one of the "mathematical alphanumeric" Unicode
 * blocks. These blocks are nearly contiguous for A–Z, a–z and 0–9, but
 * contain a handful of "holes" — reserved code-points that overlap with
 * pre-existing characters in the Letterlike Symbols block (U+2100–U+214F).
 *
 * @param upperOffset  Code-point of the "A" slot for this style.
 * @param lowerOffset  Code-point of the "a" slot for this style (or `null`
 *                     to leave lowercase untouched).
 * @param digitOffset  Code-point of the "0" slot for this style (or `null`
 *                     to leave digits untouched).
 * @param upperHoles   Map of uppercase letter → replacement string for the
 *                     reserved (hole) code-points.
 * @param lowerHoles   Map of lowercase letter → replacement string.
 */
function mathStyle(
  upperOffset: number,
  lowerOffset: number | null,
  digitOffset: number | null,
  upperHoles: Record<string, string> = {},
  lowerHoles: Record<string, string> = {},
): TextTransform {
  return (text: string): string => {
    let out = "";
    for (const ch of text) {
      const code = ch.codePointAt(0)!;
      if (ch >= "A" && ch <= "Z") {
        out += upperHoles[ch] ?? String.fromCodePoint(code - UPPER_A + upperOffset);
      } else if (ch >= "a" && ch <= "z" && lowerOffset !== null) {
        out += lowerHoles[ch] ?? String.fromCodePoint(code - LOWER_A + lowerOffset);
      } else if (ch >= "0" && ch <= "9" && digitOffset !== null) {
        out += String.fromCodePoint(code - DIGIT_0 + digitOffset);
      } else {
        out += ch;
      }
    }
    return out;
  };
}

/**
 * Build a transform from three explicit 26/10-char lookup strings. Use a
 * space character to mark "missing" — the original character is preserved
 * for that slot.
 */
function mapByString(
  upperMap: string,
  lowerMap: string,
  digitMap: string | null = null,
): TextTransform {
  return (text: string): string => {
    let out = "";
    for (const ch of text) {
      const code = ch.codePointAt(0)!;
      if (ch >= "A" && ch <= "Z") {
        const c = upperMap[code - UPPER_A];
        out += c && c !== " " ? c : ch;
      } else if (ch >= "a" && ch <= "z") {
        const c = lowerMap[code - LOWER_A];
        out += c && c !== " " ? c : ch;
      } else if (digitMap && ch >= "0" && ch <= "9") {
        const c = digitMap[code - DIGIT_0];
        out += c && c !== " " ? c : ch;
      } else {
        out += ch;
      }
    }
    return out;
  };
}

/**
 * Build a transform that appends a combining diacritical mark after every
 * alphabetic character (used for sliced / bubble / underline variants).
 */
function combineWith(mark: string, lettersOnly = true): TextTransform {
  return (text: string): string => {
    let out = "";
    for (const ch of text) {
      out += ch;
      if (!lettersOnly || /[A-Za-z]/.test(ch)) out += mark;
    }
    return out;
  };
}

/* ───────────────────────── Mathematical styles ──────────────────────── */

// Hole tables — Letterlike Symbols (U+2100–U+214F) replacements.
const SCRIPT_UPPER_HOLES: Record<string, string> = {
  B: "\u212C", E: "\u2130", F: "\u2131", H: "\u210B", I: "\u2110",
  L: "\u2112", M: "\u2133", R: "\u211B",
};
const SCRIPT_LOWER_HOLES: Record<string, string> = {
  e: "\u212F", g: "\u210A", o: "\u2134",
};
const FRAKTUR_UPPER_HOLES: Record<string, string> = {
  C: "\u212D", H: "\u210C", I: "\u2111", R: "\u211C", Z: "\u2128",
};
const DOUBLE_STRUCK_UPPER_HOLES: Record<string, string> = {
  C: "\u2102", H: "\u210D", N: "\u2115", P: "\u2119", Q: "\u211A",
  R: "\u211D", Z: "\u2124",
};
const ITALIC_LOWER_HOLES: Record<string, string> = {
  h: "\u210E", // Planck constant (italic-h hole).
};

export const T_BOLD = mathStyle(0x1d400, 0x1d41a, 0x1d7ce);
export const T_ITALIC = mathStyle(0x1d434, 0x1d44e, null, {}, ITALIC_LOWER_HOLES);
export const T_BOLD_ITALIC = mathStyle(0x1d468, 0x1d482, null);
export const T_SANS = mathStyle(0x1d5a0, 0x1d5ba, 0x1d7e2);
export const T_SANS_BOLD = mathStyle(0x1d5d4, 0x1d5ee, 0x1d7ec);
export const T_SANS_ITALIC = mathStyle(0x1d608, 0x1d622, null);
export const T_SANS_BOLD_ITALIC = mathStyle(0x1d63c, 0x1d656, null);
export const T_MONOSPACE = mathStyle(0x1d670, 0x1d68a, 0x1d7f6);
export const T_DOUBLE_STRUCK = mathStyle(
  0x1d538, 0x1d552, 0x1d7d8, DOUBLE_STRUCK_UPPER_HOLES,
);
export const T_SCRIPT = mathStyle(
  0x1d49c, 0x1d4b6, null, SCRIPT_UPPER_HOLES, SCRIPT_LOWER_HOLES,
);
export const T_BOLD_SCRIPT = mathStyle(0x1d4d0, 0x1d4ea, null);
export const T_FRAKTUR = mathStyle(
  0x1d504, 0x1d51e, null, FRAKTUR_UPPER_HOLES,
);
export const T_BOLD_FRAKTUR = mathStyle(0x1d56c, 0x1d586, null);

/* ───────────────────────── Enclosed styles ─────────────────────────── */

// U+24B6–U+24CF (circled A–Z) and U+24D0–U+24E9 (circled a–z).
const CIRCLED_UPPER = "ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ";
const CIRCLED_LOWER = "ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ";

// U+1F150–U+1F169 (negative-circled / filled A–Z). No lowercase range —
// reuse uppercase glyphs for both cases.
const NEG_CIRCLED_UPPER = "🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩";

// Parenthesized upper (U+1F110–U+1F129) and lower (U+249C–U+24B5).
const PAREN_UPPER = "🄐🄑🄒🄓🄔🄕🄖🄗🄘🄙🄚🄛🄜🄝🄞🄟🄠🄡🄢🄣🄤🄥🄦🄧🄨🄩";
const PAREN_LOWER = "⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵";

// Squared (U+1F130–U+1F149) and negative-squared (U+1F170–U+1F189). Upper only.
const SQUARED_UPPER = "🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉";
const NEG_SQUARED_UPPER = "🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉";

// Fullwidth Latin (U+FF21–U+FF3A, U+FF41–U+FF5A, U+FF10–U+FF19).
const FULLWIDTH_UPPER = "ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ";
const FULLWIDTH_LOWER = "ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ";
const FULLWIDTH_DIGIT = "０１２３４５６７８９";

export const T_CIRCLED = mapByString(CIRCLED_UPPER, CIRCLED_LOWER);
export const T_NEG_CIRCLED = mapByString(NEG_CIRCLED_UPPER, NEG_CIRCLED_UPPER);
export const T_PAREN = mapByString(PAREN_UPPER, PAREN_LOWER);
export const T_SQUARED = mapByString(SQUARED_UPPER, SQUARED_UPPER);
export const T_NEG_SQUARED = mapByString(NEG_SQUARED_UPPER, NEG_SQUARED_UPPER);
export const T_FULLWIDTH = mapByString(FULLWIDTH_UPPER, FULLWIDTH_LOWER, FULLWIDTH_DIGIT);

/* ───────────────────────── Small / super / subscript ───────────────── */

// Small caps — uses Phonetic Extensions (U+1D00–U+1D2B) plus a couple of
// Spacing Modifier Letters / Latin Extended-B / Latin Extended-D. Q and X
// have no small-cap glyph in Unicode — fall back to the source letter.
const SMALL_CAPS_MAP =
  "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡXʏᴢ";

export const T_SMALL_CAPS = mapByString(SMALL_CAPS_MAP, SMALL_CAPS_MAP);

// Superscripts — Unicode has uppercase A, B, D, E, G, H, I, J, K, L, M, N,
// O, P, R, T, U, V, W. Lowercase has every letter except q.
const SUPER_UPPER = "ᴬᴮ Cᴰᴱ Fᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾ Qᴿ Sᵀᵁⱽᵂ X Y Z";
const SUPER_LOWER = "ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖqʳˢᵗᵘᵛʷˣʸᶻ";
const SUPER_DIGIT = "⁰¹²³⁴⁵⁶⁷⁸⁹";

export const T_SUPERSCRIPT = mapByString(SUPER_UPPER, SUPER_LOWER, SUPER_DIGIT);

// Subscripts — Unicode has lowercase a, e, h, i, j, k, l, m, n, o, p, r, s,
// t, u, v, x; uppercase has none. Digits 0–9 all exist.
const SUB_LOWER = "ₐ b c d ₑ f g ₕ ᵢ ⱼ ₖ ₗ ₘ ₙ ₒ ₚ q ᵣ ₛ ₜ ᵤ ᵥ w ₓ y z";
const SUB_DIGIT = "₀₁₂₃₄₅₆₇₈₉";

export const T_SUBSCRIPT = mapByString("ABCDEFGHIJKLMNOPQRSTUVWXYZ", SUB_LOWER, SUB_DIGIT);

/* ───────────────────────── Combining-mark styles ───────────────────── */

// Combining short solidus overlay (slash) — U+0337.
export const T_SLICED = combineWith("\u0337");
// Combining breve — U+0306.
export const T_BUBBLE = combineWith("\u0306");
// Combining low line — U+0332 (underline).
export const T_UNDERLINED = combineWith("\u0332");
// Combining long stroke overlay — U+0336 (strikethrough).
export const T_STRIKETHROUGH = combineWith("\u0336");
// Combining double low line — U+0333 (double underline).
export const T_DOUBLE_UNDERLINED = combineWith("\u0333");
// Combining tilde below — U+0330 (squiggly).
export const T_SQUIGGLY = combineWith("\u0330");
// Combining asterisk below — U+0352 (decorative "sparkle").
export const T_SPARKLE = combineWith("\u0352");

/* ───────────────────────── Other fun styles ────────────────────────── */

// Regional indicator symbols (🇦–🇿). For "ADEN" they render as
// 🇦🇩🇪🇳 which is the spelling in regional-indicator form.
export const T_REGIONAL: TextTransform = (text: string): string => {
  let out = "";
  for (const ch of text) {
    if (ch >= "A" && ch <= "Z") {
      out += String.fromCodePoint(0x1f1e6 + (ch.codePointAt(0)! - UPPER_A));
    } else if (ch >= "a" && ch <= "z") {
      out += String.fromCodePoint(0x1f1e6 + (ch.codePointAt(0)! - LOWER_A));
    } else {
      out += ch;
    }
  }
  return out;
};

// Upside-down map — flip the text both per-character and overall.
const UPSIDE_DOWN_MAP: Record<string, string> = {
  a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ",
  i: "ᴉ", j: "ɾ", k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "d",
  q: "b", r: "ɹ", s: "s", t: "ʇ", u: "n", v: "ʌ", w: "ʍ", x: "x",
  y: "ʎ", z: "z",
  A: "∀", B: "𐐒", C: "Ɔ", D: "◖", E: "Ǝ", F: "Ⅎ", G: "⅁", H: "H",
  I: "I", J: "ſ", K: "K", L: "˥", M: "W", N: "N", O: "O", P: "Ԁ",
  Q: "Q", R: "ɹ", S: "S", T: "┴", U: "∩", V: "Λ", W: "M", X: "X",
  Y: "⅄", Z: "Z",
  "0": "0", "1": "Ɩ", "2": "ᄅ", "3": "Ɛ", "4": "ㄣ", "5": "ϛ",
  "6": "9", "7": "ㄥ", "8": "8", "9": "6",
  ".": "˙", ",": "'", "'": ",", "\"": ",,", "?": "¿", "!": "¡",
  "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{",
  "<": ">", ">": "<", "&": "⅋", "_": "‾",
};

export const T_UPSIDE_DOWN: TextTransform = (text: string): string => {
  const flipped: string[] = [];
  for (const ch of text) {
    flipped.push(UPSIDE_DOWN_MAP[ch] ?? ch);
  }
  return flipped.reverse().join("");
};

/* ───────────────────────── Zalgo mark tables ───────────────────────── */

/**
 * Combining diacritical marks that render above the base character.
 * Curated from U+0300–U+036F — excludes marks that draw below or on the
 * baseline.
 */
export const ZALGO_ABOVE: number[] = [
  0x0300, 0x0301, 0x0302, 0x0303, 0x0304, 0x0305, 0x0306, 0x0307,
  0x0308, 0x0309, 0x030a, 0x030b, 0x030c, 0x030d, 0x030e, 0x030f,
  0x0310, 0x0311, 0x0312, 0x0313, 0x0314, 0x031a, 0x031b, 0x033d,
  0x033e, 0x033f, 0x0340, 0x0341, 0x0342, 0x0343, 0x0344, 0x0346,
  0x034a, 0x034b, 0x034c, 0x0350, 0x0351, 0x0352, 0x0353, 0x0354,
  0x0355, 0x0356, 0x0357, 0x0358, 0x0359, 0x035a, 0x0363, 0x0364,
  0x0365, 0x0366, 0x0367, 0x0368, 0x0369, 0x036a, 0x036b, 0x036c,
  0x036d, 0x036e, 0x036f,
];

/**
 * Combining marks that render below the base character.
 */
export const ZALGO_BELOW: number[] = [
  0x0316, 0x0317, 0x0318, 0x0319, 0x031c, 0x031d, 0x031e, 0x031f,
  0x0320, 0x0321, 0x0322, 0x0323, 0x0324, 0x0325, 0x0326, 0x0327,
  0x0328, 0x0329, 0x032a, 0x032b, 0x032c, 0x032d, 0x032e, 0x032f,
  0x0330, 0x0331, 0x0332, 0x0333, 0x0339, 0x033a, 0x033b, 0x033c,
  0x0345, 0x0347, 0x0348, 0x0349, 0x034d, 0x034e, 0x035c, 0x035d,
  0x035e, 0x035f, 0x0360, 0x0362,
];

/**
 * Combining marks that draw through the middle of the character
 * (overlays — used for the "zalgo strike" effect).
 */
export const ZALGO_MIDDLE: number[] = [
  0x0315, 0x0334, 0x0335, 0x0336, 0x0337, 0x0338, 0x0339, 0x0345,
  0x034a, 0x035b,
];

/**
 * Generate Zalgo / "glitch" text by stacking combining diacritical marks
 * around each character.
 *
 * @param text     Source string.
 * @param intensity Number of marks to add per character (1–20).
 * @param opts     Toggles for above / below / middle marks.
 */
export function generateZalgo(
  text: string,
  intensity: number,
  opts: { up: boolean; down: boolean; middle: boolean },
): string {
  const count = Math.max(1, Math.min(20, Math.trunc(intensity) || 1));
  const pools: number[][] = [];
  if (opts.up) pools.push(ZALGO_ABOVE);
  if (opts.down) pools.push(ZALGO_BELOW);
  if (opts.middle) pools.push(ZALGO_MIDDLE);
  if (pools.length === 0) pools.push(ZALGO_ABOVE);

  let out = "";
  for (const ch of text) {
    out += ch;
    if (ch === "\n" || ch === " " || ch === "\t") continue;
    for (let i = 0; i < count; i++) {
      const pool = pools[Math.floor(Math.random() * pools.length)];
      out += String.fromCodePoint(pool[Math.floor(Math.random() * pool.length)]);
    }
  }
  return out;
}

/* ───────────────────────── Style registry ──────────────────────────── */

/**
 * Catalogue entry — a fancy-text style plus a human label and sample.
 * Used by `fancy-text-generator.tsx` and `cursive-text-generator.tsx`.
 */
export interface StyleEntry {
  key: string;
  label: string;
  sample: string;
  transform: TextTransform;
}

/** All 30+ fancy-text styles in display order. */
export const FANCY_STYLES: StyleEntry[] = [
  { key: "bold", label: "Bold", sample: "𝐁𝐨𝐥𝐝", transform: T_BOLD },
  { key: "italic", label: "Italic", sample: "𝑰𝒕𝒂𝒍𝒊𝒄", transform: T_ITALIC },
  { key: "bold-italic", label: "Bold Italic", sample: "𝙗𝙤𝙡𝙙 𝙞𝙩𝙖𝙡𝙞𝙘", transform: T_BOLD_ITALIC },
  { key: "monospace", label: "Monospace", sample: "𝗺𝗼𝗻𝗼𝘀𝗽𝗮𝗰𝗲", transform: T_MONOSPACE },
  { key: "sans", label: "Sans-Serif", sample: "𝖲𝖺𝗇𝗌", transform: T_SANS },
  { key: "sans-bold", label: "Sans Bold", sample: "𝗦𝗮𝗻𝘀 𝗕𝗼𝗹𝗱", transform: T_SANS_BOLD },
  { key: "sans-italic", label: "Sans Italic", sample: "𝘚𝘢𝘯𝘴 𝘪𝘵𝘢𝘭𝘪𝘤", transform: T_SANS_ITALIC },
  { key: "sans-bold-italic", label: "Sans Bold Italic", sample: "𝙎𝙖𝙣𝙨 𝘽𝙤𝙡𝙙", transform: T_SANS_BOLD_ITALIC },
  { key: "double-struck", label: "Double-Struck", sample: "𝕕𝕠𝕦𝕓𝕝𝕖-𝕤𝕥𝕣𝕦𝕔𝕜", transform: T_DOUBLE_STRUCK },
  { key: "script", label: "Script", sample: "𝒮𝒸𝓇𝒾𝓅𝓉", transform: T_SCRIPT },
  { key: "bold-script", label: "Bold Script", sample: "𝓢𝓬𝓻𝓲𝓹𝓽", transform: T_BOLD_SCRIPT },
  { key: "fraktur", label: "Fraktur", sample: "𝔉𝔯𝔞𝔨𝔱𝔲𝔯", transform: T_FRAKTUR },
  { key: "bold-fraktur", label: "Bold Fraktur", sample: "𝕱𝖗𝖆𝖐𝖙𝖚𝖗", transform: T_BOLD_FRAKTUR },
  { key: "small-caps", label: "Small Caps", sample: "Sᴍᴀʟʟ Cᴀᴘs", transform: T_SMALL_CAPS },
  { key: "superscript", label: "Superscript", sample: "ˢᵘᵖᵉʳ", transform: T_SUPERSCRIPT },
  { key: "subscript", label: "Subscript", sample: "ₛᵤᵦ", transform: T_SUBSCRIPT },
  { key: "circled", label: "Circles", sample: "ⓒⓘⓡⓒⓛⓔⓢ", transform: T_CIRCLED },
  { key: "neg-circled", label: "Block Circles", sample: "🅑🅛🅞🅒🅚🅢", transform: T_NEG_CIRCLED },
  { key: "paren", label: "Parentheses", sample: "⒫⒜⒭⒠⒩", transform: T_PAREN },
  { key: "squared", label: "Squared", sample: "🅂🅀🅄🄰🅁🄴", transform: T_SQUARED },
  { key: "neg-squared", label: "Negative Squared", sample: "🅽🅴🅶", transform: T_NEG_SQUARED },
  { key: "fullwidth", label: "Fullwidth", sample: "Ｆｕｌｌｗｉｄｔｈ", transform: T_FULLWIDTH },
  { key: "regional", label: "Regional Flags", sample: "🇦🇩🇪🇳🇨🇪", transform: T_REGIONAL },
  { key: "sliced", label: "Sliced", sample: "h̷e̷l̷l̷o̷", transform: T_SLICED },
  { key: "bubble", label: "Bubble", sample: "H̆ĕl̆l̆ŏ", transform: T_BUBBLE },
  { key: "underlined", label: "Underlined", sample: "h̲e̲l̲l̲o̲", transform: T_UNDERLINED },
  { key: "strike", label: "Strikethrough", sample: "h̶e̶l̶l̶o̶", transform: T_STRIKETHROUGH },
  { key: "double-under", label: "Double Underline", sample: "h̳e̳l̳l̳o̳", transform: T_DOUBLE_UNDERLINED },
  { key: "squiggly", label: "Squiggly", sample: "h̰ḛl̰l̰o̰", transform: T_SQUIGGLY },
  { key: "sparkle", label: "Sparkle", sample: "h͒e͒l͒l͒o͒", transform: T_SPARKLE },
  { key: "upside-down", label: "Upside Down", sample: "ɥǝllo", transform: T_UPSIDE_DOWN },
];

/** The three cursive-style entries shared by the cursive generator. */
export const CURSIVE_STYLES: StyleEntry[] = [
  { key: "script", label: "Regular Cursive", sample: "𝒮𝒸𝓇𝒾𝓅𝓉", transform: T_SCRIPT },
  { key: "bold-script", label: "Bold Cursive", sample: "𝓢𝓬𝓻𝓲𝓹𝓽", transform: T_BOLD_SCRIPT },
  { key: "fraktur", label: "Blackletter (Fraktur)", sample: "𝔉𝔯𝔞𝔨𝔱𝔲𝔯", transform: T_FRAKTUR },
];

/** The three small-caps-style entries shared by the small-caps generator. */
export const SMALL_CAPS_STYLES: StyleEntry[] = [
  { key: "small-caps", label: "Small Caps", sample: "Sᴍᴀʟʟ Cᴀᴘs", transform: T_SMALL_CAPS },
  { key: "superscript", label: "Superscript", sample: "ˢᵘᵖᵉʳ", transform: T_SUPERSCRIPT },
  { key: "subscript", label: "Subscript", sample: "ₛᵤᵦ", transform: T_SUBSCRIPT },
];
