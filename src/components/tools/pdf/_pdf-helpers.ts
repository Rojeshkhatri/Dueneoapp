/**
 * Shared helpers for PDF tools. Browser-only, no backend.
 *
 * All functions are safe to call from client components.
 * pdf-lib and jszip are bundled into each tool's own chunk by Next.js
 * automatic code-splitting — they never ship in the initial bundle.
 */

export const MAX_PDF_BYTES = 250 * 1024 * 1024; // 250 MB hard cap
export const LARGE_PDF_WARN_BYTES = 100 * 1024 * 1024; // >100 MB → friendly warning

/** Format a byte count as a friendly string (B/KB/MB/GB). */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes < 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    sizes.length - 1,
    Math.floor(Math.log(bytes) / Math.log(k))
  );
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** Trigger a browser download of a Blob with the given filename. */
export function downloadBlob(blob: Blob | null, filename: string): boolean {
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Read a File into an ArrayBuffer. */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () =>
      reject(new Error("Could not read the file. It may be corrupted or in use."));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Validate that a file looks like a PDF.
 * Accepts application/pdf MIME type OR .pdf extension.
 */
export function isPdfFile(file: File): boolean {
  if (file.type === "application/pdf") return true;
  return /\.pdf$/i.test(file.name);
}

/**
 * Read the PDF version string from the raw bytes (e.g. "1.7").
 * Returns "unknown" if the header cannot be parsed.
 */
export function readPdfVersion(buffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(buffer.slice(0, 20));
    const header = new TextDecoder("ascii").decode(bytes);
    const m = header.match(/%PDF-(\d+\.\d+)/);
    return m ? m[1] : "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Format a PDF date string (D:YYYYMMDDHHmmSSOHH'mm') into a friendly
 * locale string. Returns "—" if absent or unparseable.
 */
export function formatPdfDate(raw: Date | string | null | undefined): string {
  if (!raw) return "—";
  try {
    if (raw instanceof Date) {
      return isNaN(raw.getTime()) ? "—" : raw.toLocaleString();
    }
    if (typeof raw === "string") {
      // pdf-lib returns ISO-ish strings for some fields; try direct parse.
      const d = new Date(raw);
      return isNaN(d.getTime()) ? raw : d.toLocaleString();
    }
  } catch {
    /* fall through */
  }
  return "—";
}

/**
 * Parse a page-range spec like "1-3, 5, 7-9" into an array of 1-indexed
 * page numbers. Pages outside [1, max] are clamped. Returns null on
 * syntax error (with a friendly message via `throw`).
 */
export function parsePageRanges(spec: string, max: number): number[] {
  const cleaned = spec.replace(/\s+/g, "");
  if (!cleaned) throw new Error("Enter at least one page or range (e.g. 1-3, 5).");
  const parts = cleaned.split(",").filter(Boolean);
  const out: number[] = [];
  for (const part of parts) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`Could not parse "${part}". Use page numbers or ranges like 1-3.`);
    const start = parseInt(m[1], 10);
    const end = m[2] ? parseInt(m[2], 10) : start;
    if (isNaN(start) || isNaN(end)) throw new Error(`Could not parse "${part}".`);
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    for (let i = lo; i <= hi; i++) {
      if (i < 1) continue;
      if (i > max) continue;
      out.push(i);
    }
  }
  if (out.length === 0)
    throw new Error(`No valid pages selected. The document has ${max} page${max === 1 ? "" : "s"}.`);
  // Deduplicate, preserving first-seen order.
  return Array.from(new Set(out));
}

export type Position =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export const POSITION_OPTIONS: { value: Position; label: string }[] = [
  { value: "top-left", label: "Top left" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
  { value: "middle-left", label: "Middle left" },
  { value: "middle-center", label: "Middle center" },
  { value: "middle-right", label: "Middle right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
];

/**
 * Compute the [x, y] origin (bottom-left in PDF coords) for a text box
 * of given width/height, placed in one of 9 positions on a page of size
 * (pageW, pageH) with the given margin (in PDF points).
 */
export function positionForPdfPoint(
  position: Position,
  pageW: number,
  pageH: number,
  boxW: number,
  boxH: number,
  margin: number
): [number, number] {
  let x: number;
  let y: number;
  switch (position) {
    case "top-left":
      x = margin; y = pageH - boxH - margin; break;
    case "top-center":
      x = (pageW - boxW) / 2; y = pageH - boxH - margin; break;
    case "top-right":
      x = pageW - boxW - margin; y = pageH - boxH - margin; break;
    case "middle-left":
      x = margin; y = (pageH - boxH) / 2; break;
    case "middle-center":
      x = (pageW - boxW) / 2; y = (pageH - boxH) / 2; break;
    case "middle-right":
      x = pageW - boxW - margin; y = (pageH - boxH) / 2; break;
    case "bottom-left":
      x = margin; y = margin; break;
    case "bottom-center":
      x = (pageW - boxW) / 2; y = margin; break;
    case "bottom-right":
      x = pageW - boxW - margin; y = margin; break;
    default:
      x = margin; y = margin;
  }
  return [x, y];
}

/**
 * Load an image File and return its pixel dimensions + a PNG or JPEG
 * ArrayBuffer suitable for pdf-lib embedding. WebP and other formats
 * are converted to PNG via Canvas. Returns the embedded-ready bytes
 * plus the format and original dimensions.
 */
export async function imageFileToPdfEmbeddable(
  file: File
): Promise<{
  kind: "jpg" | "png";
  bytes: ArrayBuffer;
  width: number;
  height: number;
}> {
  // JPG and PNG can be embedded directly by pdf-lib.
  const isJpg = /^image\/jpe?g$/i.test(file.type) || /\.jpe?g$/i.test(file.name);
  const isPng = file.type === "image/png" || /\.png$/i.test(file.name);
  if (isJpg) {
    const buf = await readFileAsArrayBuffer(file);
    const dims = await imageDimensions(file);
    return { kind: "jpg", bytes: buf, width: dims.w, height: dims.h };
  }
  if (isPng) {
    const buf = await readFileAsArrayBuffer(file);
    const dims = await imageDimensions(file);
    return { kind: "png", bytes: buf, width: dims.w, height: dims.h };
  }
  // Anything else (WebP, GIF, BMP, AVIF…) → rasterise via canvas to PNG.
  const pngBytes = await rasteriseToPng(file);
  const dims = await imageDimensions(file);
  return { kind: "png", bytes: pngBytes, width: dims.w, height: dims.h };
}

function imageDimensions(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const out = { w: img.naturalWidth, h: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(out);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read image "${file.name}".`));
    };
    img.src = url;
  });
}

async function rasteriseToPng(file: File): Promise<ArrayBuffer> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error(`Could not load image "${file.name}".`));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context is not available in this browser.");
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) throw new Error("Could not convert the image to PNG.");
    return await blob.arrayBuffer();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Friendly wrapper around pdf-lib's load that catches encryption errors.
 * `ignoreEncryption: true` lets us open PDFs that have the encryption flag
 * set but no actual user password.
 */
export async function loadPdfDocument(
  buffer: ArrayBuffer,
  library: { PDFDocument: typeof import("pdf-lib").PDFDocument }
) {
  try {
    return await library.PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/encrypt|password/i.test(msg)) {
      throw new Error(
        "This PDF is encrypted. Please decrypt it first (remove the password) and try again."
      );
    }
    throw new Error(`Could not read this PDF. ${msg}`);
  }
}

/**
 * Parse a hex colour string (#RGB / #RRGGBB / without #) into a 0-1
 * triple suitable for `pdf-lib`'s `rgb(r, g, b)` helper. Returns black
 * on parse failure and is case-insensitive.
 */
export function hexToRgb01(hex: string): [number, number, number] {
  const cleaned = (hex ?? "").trim().replace(/^#/, "");
  let r = 0;
  let g = 0;
  let b = 0;
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
  } else {
    return [0, 0, 0];
  }
  return [r / 255, g / 255, b / 255];
}

/**
 * Build a default output filename for a PDF tool. Strips the .pdf
 * extension from the source, appends a suffix, and ensures the result
 * ends with `.pdf`.
 */
export function derivedPdfName(sourceName: string | undefined, suffix: string): string {
  const base = (sourceName ?? "document.pdf").replace(/\.pdf$/i, "");
  return `${base}-${suffix}.pdf`;
}

/**
 * Revoke any previous object URL and store a fresh one. Returns the new
 * URL. Useful in `setState`-driven download flows to avoid leaking URLs
 * when an output is regenerated.
 */
export function replaceObjectUrl(prev: string | null, blob: Blob): string {
  if (prev) URL.revokeObjectURL(prev);
  return URL.createObjectURL(blob);
}

/**
 * Trigger a download of an existing object URL. Does NOT revoke the URL
 * (the caller manages its lifecycle, typically via useEffect cleanup).
 */
export function downloadObjectUrl(url: string, filename: string): boolean {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return true;
}
