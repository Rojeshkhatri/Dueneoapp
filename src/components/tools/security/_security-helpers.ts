/**
 * Shared helpers for Dueneo security tools.
 *
 * Browser-only, framework-agnostic, tree-shakeable. No JSX so it stays a
 * `.ts` module. Includes:
 *   - cryptographic-random helpers (built on `crypto.getRandomValues`)
 *   - entropy + password-strength estimator with a small common-password list
 *   - base64url helpers (for JWT decode)
 *   - a hand-rolled MD5 implementation (RFC 1321) — no external library
 *   - a hand-rolled SHA-256 helper is NOT here; that one uses WebCrypto.
 */

export const MAX_INPUT_BYTES = 1 * 1024 * 1024;
export const INPUT_TOO_LARGE_MSG =
  "Input is larger than 1 MB. Please trim it down — these tools run on the main thread.";

/** UTF-8 byte length of a string. */
export function byteLength(input: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(input).length;
  }
  return new Blob([input]).size;
}

/** Human-readable byte size. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / Math.pow(1024, i);
  const rounded = i === 0 ? v : v.toFixed(v >= 100 ? 0 : 1);
  return `${rounded} ${units[i]}`;
}

/** Trigger a download of a text file in the browser. */
export function downloadText(filename: string, text: string, mime = "text/plain"): void {
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

/** Trigger a download of a Blob with a chosen filename. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ──────────────────────────── Random helpers ──────────────────────────── */

/**
 * Pick a uniformly-random integer in [0, max) using rejection sampling so
 * the modulo bias present in `random % max` is avoided.
 */
export function randomInt(max: number): number {
  if (max <= 0) return 0;
  const maxUint32 = 0xffffffff;
  const limit = maxUint32 - (maxUint32 % max);
  const buf = new Uint32Array(1);
  // Rejection sampling — expected iterations ~1.
  while (true) {
    crypto.getRandomValues(buf);
    if (buf[0] <= limit) return buf[0] % max;
  }
}

/** Pick a uniformly-random character from the given pool. */
export function randomChar(pool: string): string {
  return pool.charAt(randomInt(pool.length));
}

/**
 * Fisher-Yates shuffle using `crypto.getRandomValues`. Returns a new array
 * (the input is not mutated).
 */
export function secureShuffle<T>(input: readonly T[]): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/* ──────────────────────────── Password strength ───────────────────────── */

export type StrengthLevel = "weak" | "fair" | "good" | "strong";

export interface StrengthEstimate {
  level: StrengthLevel;
  /** 0–100 score used for the meter. */
  score: number;
  /** Estimated entropy in bits. */
  entropyBits: number;
  /** Estimated crack time at 10¹⁰ guesses/sec (a fast offline attack). */
  crackTime: string;
  reasons: string[];
  characterClasses: number;
  poolSize: number;
}

/**
 * A small curated list of the most common passwords. Real-world password
 * crackers use lists with millions of entries — this is intentionally tiny
 * so the bundle stays small. The checker still flags any short
 * dictionary-word-only password.
 */
const COMMON_PASSWORDS = new Set([
  "password",
  "123456",
  "123456789",
  "12345678",
  "12345",
  "1234567",
  "1234567890",
  "qwerty",
  "abc123",
  "111111",
  "iloveyou",
  "admin",
  "welcome",
  "letmein",
  "monkey",
  "dragon",
  "login",
  "princess",
  "football",
  "shadow",
  "sunshine",
  "master",
  "superman",
  "trustno1",
  "hello",
  "freedom",
  "whatever",
  "passw0rd",
  "p@ssw0rd",
  "baseball",
  "michael",
  "jordan",
  "harley",
  "ranger",
  "daniel",
  "thomas",
  "joshua",
  "andrew",
  "jennifer",
  "nicole",
  "jessica",
  "tony",
  "hunter",
  "ginger",
  "tigger",
  "jennifer1",
  "robert",
  "alexis",
]);

const PAD_RE = /(.)\1{3,}/;

/** Compute Shannon entropy in bits-per-char for a string. */
function shannonBits(input: string): number {
  if (!input) return 0;
  const freq = new Map<string, number>();
  for (const ch of input) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let h = 0;
  for (const count of freq.values()) {
    const p = count / input.length;
    h -= p * Math.log2(p);
  }
  return h * input.length;
}

function formatCrackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "unknown";
  if (seconds < 1) return "instantly";
  const units: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [365, "day"],
    [100, "year"],
    [Infinity, "century"],
  ];
  let value = seconds;
  let label = "second";
  for (const [factor, name] of units) {
    if (value < factor) {
      label = name;
      break;
    }
    value /= factor;
    label = name;
  }
  if (label === "century") {
    if (value > 1e9) return "millions of centuries";
    if (value > 1e6) return `${(value / 1e6).toFixed(1)} million centuries`;
    if (value > 1e3) return `${(value / 1e3).toFixed(1)} thousand centuries`;
    return `${value.toFixed(0)} centuries`;
  }
  if (value < 10) return `${value.toFixed(1)} ${label}${value >= 2 ? "s" : ""}`;
  const rounded = Math.round(value);
  return `${rounded} ${label}${rounded >= 2 ? "s" : ""}`;
}

/**
 * Estimate password strength without an external library. Combines entropy,
 * character-class coverage, length and common-password detection.
 */
export function estimatePasswordStrength(password: string): StrengthEstimate {
  const reasons: string[] = [];
  if (!password) {
    return {
      level: "weak",
      score: 0,
      entropyBits: 0,
      crackTime: "—",
      reasons: ["Enter a password to see its strength."],
      characterClasses: 0,
      poolSize: 0,
    };
  }

  const length = password.length;
  let poolSize = 0;
  let classes = 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  if (hasLower) { poolSize += 26; classes++; }
  if (hasUpper) { poolSize += 26; classes++; }
  if (hasDigit) { poolSize += 10; classes++; }
  if (hasSymbol) { poolSize += 33; classes++; }

  // Shannon entropy, capped to log2(poolSize) * length.
  const maxBits = Math.log2(Math.max(poolSize, 1)) * length;
  const entropyBits = Math.min(shannonBits(password), maxBits);

  // Heuristic scoring.
  let score = 0;
  if (length >= 8) score += 25;
  if (length >= 12) score += 20;
  if (length >= 16) score += 15;
  if (classes >= 2) score += 10;
  if (classes >= 3) score += 15;
  if (classes >= 4) score += 10;
  // Reward high entropy.
  if (entropyBits >= 40) score += 5;
  if (entropyBits >= 60) score += 10;
  // Penalise repetition.
  if (PAD_RE.test(password)) {
    score -= 15;
    reasons.push("Contains a long run of repeated characters.");
  }
  // Penalise common passwords.
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    score -= 60;
    reasons.push("This is one of the most common passwords — it would be cracked almost instantly.");
  } else if (length < 8) {
    reasons.push("Too short — aim for at least 12 characters.");
  } else if (classes < 3) {
    reasons.push(`Only ${classes} character class${classes === 1 ? "" : "es"} used. Mix uppercase, lowercase, digits and symbols.`);
  }
  if (length >= 8 && length < 12 && classes >= 3 && !COMMON_PASSWORDS.has(lower)) {
    reasons.push("Decent, but 12+ characters would be much stronger.");
  }
  if (entropyBits >= 80 && classes >= 3 && length >= 12) {
    reasons.push("Excellent — high entropy, good length and mixed character classes.");
  } else if (entropyBits >= 60 && classes >= 3 && length >= 10) {
    reasons.push("Strong — resists brute-force and dictionary attacks well.");
  }

  if (COMMON_PASSWORDS.has(lower) || length < 6 || (length < 8 && classes <= 2)) {
    reasons.push("Would be cracked in seconds by an offline attack.");
  }

  score = Math.max(0, Math.min(100, score));

  // Crack time at 10¹⁰ guesses/sec (offline fast hash).
  const guesses = Math.pow(2, Math.max(entropyBits, 1));
  const seconds = guesses / 1e10;
  const crackTime = formatCrackTime(seconds);

  let level: StrengthLevel;
  if (score < 35) level = "weak";
  else if (score < 60) level = "fair";
  else if (score < 85) level = "good";
  else level = "strong";

  if (reasons.length === 0) {
    if (level === "weak") reasons.push("Too weak for everyday use.");
    else if (level === "fair") reasons.push("Acceptable for low-value accounts.");
    else if (level === "good") reasons.push("Good — use a password manager to keep it safe.");
    else reasons.push("Strong — ideal for important accounts.");
  }

  return { level, score, entropyBits, crackTime, reasons, characterClasses: classes, poolSize };
}

/* ────────────────────────────── JWT helpers ───────────────────────────── */

/** Decode base64url → bytes, padding and converting URL-safe chars first. */
export function base64UrlToBytes(input: string): Uint8Array {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  // Pad.
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Decode base64url → UTF-8 string. */
export function base64UrlToString(input: string): string {
  return new TextDecoder().decode(base64UrlToBytes(input));
}

export interface JwtParts {
  header: string;
  payload: string;
  signature: string;
}

/** Split a JWT into its three dot-separated parts (no validation). */
export function splitJwt(input: string): JwtParts | null {
  const trimmed = input.trim();
  const parts = trimmed.split(".");
  if (parts.length !== 3) return null;
  if (!parts[0] || !parts[1] || !parts[2]) return null;
  return { header: parts[0], payload: parts[1], signature: parts[2] };
}

/** Try to parse a JSON string, returning null on failure. */
export function tryParseJson(input: string): unknown | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

/* ─────────────────────────────── MD5 (RFC 1321) ───────────────────────── */
/*
 * Hand-rolled MD5 implementation adapted from the public-domain reference
 * (RFC 1321 by Rivest). Pure TypeScript, no dependencies. Output is a
 * 32-character lowercase hex string.
 */

const S: number[] = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const K: number[] = [
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
  0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
  0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
  0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
  0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
  0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
  0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
  0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
  0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
  0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
  0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
  0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
  0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
  0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
];

function leftRotate(value: number, count: number): number {
  // Operate on 32-bit unsigned ints.
  return ((value << count) | (value >>> (32 - count))) >>> 0;
}

function toBytesUtf8(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

/** Compute the MD5 hash of a UTF-8 string and return lowercase hex. */
export function md5Hex(input: string): string {
  const bytes = toBytesUtf8(input);
  return md5Bytes(bytes);
}

/** Compute the MD5 hash of a byte array and return lowercase hex. */
export function md5Bytes(input: Uint8Array): string {
  // Pre-processing: padding the message.
  const originalLength = input.length;
  const bitLength = originalLength * 8;

  // Append the bit '1' (0x80) then pad with '0' until length ≡ 56 (mod 64).
  // If `(N+1) % 64 > 56`, we must round up to the next block.
  const withPadLength = originalLength + 1;
  const r = withPadLength % 64;
  const padTo56 = r <= 56 ? withPadLength + (56 - r) : withPadLength + (64 - r) + 56;
  const padded = new Uint8Array(padTo56 + 8);
  padded.set(input);
  padded[originalLength] = 0x80;
  // Append original length in bits as 64-bit little-endian (low 32 bits used).
  const dv = new DataView(padded.buffer);
  // Length goes at the very end of the padded message.
  dv.setUint32(padTo56, bitLength >>> 0, true); // low 32 bits, little-endian
  dv.setUint32(padTo56 + 4, Math.floor(bitLength / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const dv2 = new DataView(padded.buffer);
  for (let chunkStart = 0; chunkStart < padded.length; chunkStart += 64) {
    const M: number[] = new Array(16);
    for (let i = 0; i < 16; i++) {
      M[i] = dv2.getUint32(chunkStart + i * 4, true);
    }
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + leftRotate(F, S[i])) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  // Output is little-endian bytes of (a0, b0, c0, d0).
  const out = new Uint8Array(16);
  const odv = new DataView(out.buffer);
  odv.setUint32(0, a0, true);
  odv.setUint32(4, b0, true);
  odv.setUint32(8, c0, true);
  odv.setUint32(12, d0, true);
  return bytesToHex(out);
}

/* ─────────────────────────── SHA-256 (WebCrypto) ──────────────────────── */

/** Compute SHA-256 of a UTF-8 string and return lowercase hex. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

/** Compute SHA-256 of a byte array and return lowercase hex. */
export async function sha256Bytes(input: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(input));
  return bytesToHex(new Uint8Array(digest));
}

/** Read a File as ArrayBuffer via FileReader. */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as ArrayBuffer);
    fr.onerror = () => reject(fr.error ?? new Error("File read failed"));
    fr.readAsArrayBuffer(file);
  });
}
