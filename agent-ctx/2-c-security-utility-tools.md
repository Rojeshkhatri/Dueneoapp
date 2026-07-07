# Task 2-c — Security & Utility Tools

**Agent:** security-utility-tools  
**Task ID:** 2-c  
**Date:** 2026-07-07

## Scope

Implement 8 tools flagged `implemented: true` in the Dueneo registry:
- 6 security tools (IDs 50, 55–59): JWT Decoder, UUID Generator, Password Generator, Password Strength Checker, SHA-256 Generator, MD5 Generator.
- 2 utility tools (IDs 60, 100): QR Code Generator, Unit Converter.

All processing must run in the browser with no backend, no uploads. Sensitive tools must use `PrivacyNote level="sensitive"` and never log.

## Files created

- `src/components/tools/security/_security-helpers.ts` — shared utilities:
  - Cryptographic random helpers built on `crypto.getRandomValues`: `randomInt(max)` (rejection-sampled to avoid modulo bias), `randomChar(pool)`, `secureShuffle(arr)` (Fisher-Yates).
  - Password strength estimator: `estimatePasswordStrength(password)` returning `{level, score, entropyBits, crackTime, reasons, characterClasses, poolSize}`. Combines length, character-class coverage, Shannon entropy, repetition penalty and a curated 50-entry common-password list. Crack time computed at 10¹⁰ guesses/sec (offline fast-hash attack).
  - JWT helpers: `splitJwt(input)`, `base64UrlToString(input)`, `base64UrlToBytes(input)`, `tryParseJson(input)`.
  - **Hand-rolled MD5 implementation** (RFC 1321) in pure TypeScript — no external library. ~120 lines including K/S tables. Verified against all 7 RFC 1321 test vectors (empty string, "a", "abc", "message digest", full lowercase alphabet, full alnum set, 80-digit string). Output is lowercase hex.
  - SHA-256 helpers: `sha256Hex(text)` and `sha256Bytes(bytes)` built on WebCrypto `crypto.subtle.digest`.
  - File helpers: `readFileAsArrayBuffer`, `downloadText`, `downloadBlob`, `formatBytes`, `byteLength`.
- `src/components/tools/security/password-generator.tsx` — `PasswordGenerator`. Length slider 4–64, toggles for upper/lower/digits/symbols/exclude-ambiguous, secure-shuffled required-char inclusion, live strength meter with entropy bits + crack time, copy + reveal/hide. Uses `crypto.getRandomValues` via the helpers.
- `src/components/tools/security/password-strength-checker.tsx` — `PasswordStrengthChecker`. Type-to-analyse UX, reveal/hide toggle, strength bar (weak/fair/good/strong), entropy + crack-time card, four-stat panel (length / classes / pool size / entropy), "Why this rating?" reasoning list.
- `src/components/tools/security/jwt-decoder.tsx` — `JwtDecoder`. Splits `header.payload.signature`, decodes base64url → pretty JSON for header and payload, displays iat/exp/nbf in UTC + relative time ("in 3 days", "expired 2 hours ago"), raw signature shown with a prominent "Signature NOT verified" warning. Sample-token loader. Handles empty/invalid input with a friendly alert.
- `src/components/tools/security/sha256-generator.tsx` — `Sha256Generator`. Two tabs: Text (Textarea) and File (`<input type="file">` → FileReader → ArrayBuffer → WebCrypto). 1 MB cap. Sample loader that compares the result against the known SHA-256 of `"The quick brown fox jumps over the lazy dog"`. Copy + reset.
- `src/components/tools/security/md5-generator.tsx` — `Md5Generator`. Text-only (per spec), uses the hand-rolled `md5Hex`. Prominent rose-coloured "MD5 is broken" warning at the top of the tool body and in the limitations. Sample loader that verifies against `9e107d9d372bb6826bd81d3542a419d6`. Copy + reset.
- `src/components/tools/security/uuid-generator.tsx` — `UuidGenerator`. Count slider 1–1000, toggles for hyphens / uppercase / braces, generates via `crypto.randomUUID()`. List rendered in a `max-h-96 overflow-y-auto` scroll area with thin scrollbar; each item has its own icon copy button plus a "Copy all" + "Download .txt" action.
- `src/components/tools/utility/qr-code-generator.tsx` — `QrCodeGenerator`. Tabs for Text/URL/Email/Phone/SMS/Wi-Fi. Each tab builds the proper QR payload (mailto: with subject+body, tel:, SMSTO:, WIFI:T:;S:;P:;H:;; with backslash-escaped special chars). Options: size (128–1024 px slider), quiet zone (0–10), error-correction level (L/M/Q/H), foreground + background colour pickers. Live preview with 150 ms debounce, PNG download. Uses the `qrcode` npm package (browser-compatible).
- `src/components/tools/utility/unit-converter.tsx` — `UnitConverter`. 8 categories: length (8 units), weight (5), temperature (3, offset math), area (7), volume (8), speed (5), time (7), digital storage (10 incl. KB/KiB distinction). Two-pane From/To with a circular swap button. "Quick reference" panel listing the same value in every other unit of the category. 8-significant-digit precision with exponential fallback.

## Files modified

- `src/components/tools/tool-router.tsx` — imported and registered all 8 components. Keys match the registry's `component` field: `password-generator`, `password-strength-checker`, `jwt-decoder`, `sha256-generator`, `md5-generator`, `uuid-generator`, `qr-code-generator`, `unit-converter`.
- `package.json` / `bun.lock` — added `qrcode@1.5.4` and `@types/qrcode@1.5.6`.

## Verification

- All 7 RFC 1321 MD5 test vectors pass (verified via a one-off bun script; the script is in `/tmp/md5check.mjs` and is not part of the project).
- Dev server compiles cleanly: `tail /home/z/my-project/dev.log` shows only `✓ Compiled` and `GET / 200` lines after the JSX-literal-`>` fix.
- `bun run lint` exits 0 with no errors or warnings.
- All 8 routes return HTTP 200 via the Caddy proxy at port 81:
  - `curl http://127.0.0.1:81/#/password-generator` → 200
  - `curl http://127.0.0.1:81/#/password-strength-checker` → 200
  - `curl http://127.0.0.1:81/#/jwt-decoder` → 200
  - `curl http://127.0.0.1:81/#/sha256-generator` → 200
  - `curl http://127.0.0.1:81/#/md5-generator` → 200
  - `curl http://127.0.0.1:81/#/uuid-generator` → 200
  - `curl http://127.0.0.1:81/#/qr-code-generator` → 200
  - `curl http://127.0.0.1:81/#/unit-converter` → 200

## Issues caught & fixed

- **JSX literal `>`** in the password-generator limitations list (`(>64 chars)`) — the SWC parser rejected it as `Unexpected token`. Fixed by wrapping the `>` in a JSX expression `{">"}`.
- **Unused `eslint-disable` directives** — the project's ESLint config does not enable `react-hooks/exhaustive-deps` or `@next/next/no-img-element`, so the `eslint-disable-next-line` comments I had added were flagged as unused. Removed both directives.
- **MD5 padding bug** — initial implementation used `padTo56 = withPadLength + (56 - (withPadLength % 64))` which underflows when `(N+1) % 64 > 56`, breaking the 62-byte RFC vector. Fixed with the standard `r <= 56 ? withPadLength + (56 - r) : withPadLength + (64 - r) + 56` formula. Re-verified against all 7 RFC vectors.

## Notes for future agents

- The security helpers file (`_security-helpers.ts`) is reusable — if any later task needs MD5/SHA-256/JWT-base64/strength-estimation primitives, import from there rather than re-implementing.
- The QR generator uses `qrcode@1.5.4`. The library is ~50 KB gzipped and runs entirely in the browser. If SVG output is ever needed, switch `QRCode.toDataURL` → `QRCode.toString` with `{ type: "svg" }`.
- The unit-converter uses SI kilobyte (1000) and kibibyte (1024) distinctly. The "year" unit is the Julian year (365.25 days = 31,557,600 s), matching SI convention.
- All sensitive tools (`password-generator`, `password-strength-checker`, `jwt-decoder`, `sha256-generator`, `md5-generator`) include an extra `PrivacyNote level="sensitive"` inside the tool body in addition to the one rendered by `ToolLayout`.
